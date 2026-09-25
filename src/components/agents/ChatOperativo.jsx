import { useState, useRef, useEffect } from 'react'
import { Send, Check, Loader2, Paperclip, Camera, Mic } from 'lucide-react'
import { chatOperativo } from '../../lib/claude'
import { ejecutarAccion, leerFicha, datosFichas } from '../../lib/agentActions'

// Dictado por voz del navegador (Chrome/Android y Safari lo traen; si no, no se muestra el micrófono).
const Dictado = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

// Tarjeta de una acción propuesta por el agente. Nada se ejecuta hasta el clic.
function TarjetaAccion({ p, movil, onConfirmar, onCancelar, onAbrir }) {
  const btn = {
    padding: movil ? '12px 16px' : '7px 12px', borderRadius: movil ? '10px' : '7px',
    fontSize: movil ? '14px' : '12px', fontWeight: 700, cursor: 'pointer', border: 'none',
    flex: movil ? 1 : 'none', minHeight: movil ? 44 : 0,
  }
  const fs = movil ? '13px' : '12px'
  return (
    <div style={{ border: '1.5px solid var(--color-primary)', borderRadius: '12px', background: 'white', overflow: 'hidden', maxWidth: movil ? '100%' : '92%', width: movil ? '100%' : 'auto' }}>
      <div style={{ padding: '10px 12px', background: 'rgba(10,102,194,0.08)', fontSize: movil ? '14px' : '12px', fontWeight: 800, color: 'var(--color-primary)' }}>{p.titulo}</div>
      <div style={{ padding: '10px 12px', display: 'grid', gap: '5px' }}>
        {p.resumen.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: movil ? '96px 1fr' : '92px 1fr', gap: '8px', fontSize: fs }}>
            <span style={{ color: 'var(--color-text-light)' }}>{k}</span><span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{v}</span>
          </div>
        ))}
        {p.aviso && <div style={{ marginTop: '4px', fontSize: '12px', color: '#92400E', background: '#FEF3C7', borderRadius: '8px', padding: '7px 9px' }}>{p.aviso}</div>}
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {p.estado === 'pendiente' && <>
          <button onClick={onConfirmar} style={{ ...btn, background: 'var(--color-success)', color: 'white' }}>{p.confirmar || 'Confirmar'}</button>
          <button onClick={onCancelar} style={{ ...btn, background: '#F3F4F6', color: 'var(--color-text)' }}>Cancelar</button>
        </>}
        {p.estado === 'ejecutando' && <span style={{ fontSize: fs, display: 'flex', gap: '6px', alignItems: 'center' }}><Loader2 size={14} className="spin" /> Ejecutando…</span>}
        {p.estado === 'hecha' && <span style={{ fontSize: fs, color: 'var(--color-success)', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Check size={14} /> {p.resultado}
          {p.ruta && onAbrir && <button onClick={onAbrir} style={{ ...btn, flex: 'none', minHeight: 0, padding: '3px 8px', background: 'none', color: 'var(--color-primary)', textDecoration: 'underline' }}>Abrir</button>}
        </span>}
        {p.estado === 'cancelada' && <span style={{ fontSize: fs, color: 'var(--color-text-light)' }}>Cancelada</span>}
        {p.estado === 'error' && <span style={{ fontSize: fs, color: 'var(--color-danger)' }}>No se pudo: {p.resultado}</span>}
      </div>
    </div>
  )
}

/**
 * Núcleo del chat del Agente Operativo. Ocupa todo el alto de su contenedor: el
 * llamador decide si es un panel flotante (escritorio) o la pantalla completa del
 * rol asistente (celular, `movil`).
 *
 * @param {boolean} movil   letra y botones más grandes, cámara y dictado por voz
 * @param {string}  saludo  primer mensaje del asistente
 * @param {(ruta:string)=>void} onAbrirRuta  qué hacer con el enlace "Abrir" de una tarjeta
 */
export default function ChatOperativo({ movil = false, saludo, onAbrirRuta }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: saludo || '¡Hola! Soy el Agente Operativo de IRP. ¿En qué puedo ayudarte con la administración de tus inmuebles?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [adjuntos, setAdjuntos] = useState([])   // fichas ya leídas, pendientes de enviar
  const [leyendo, setLeyendo] = useState(0)
  const [escuchando, setEscuchando] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const camRef = useRef(null)
  const vozRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Al servidor solo viaja role/content; las tarjetas son estado de la interfaz.
  const historial = msgs => msgs.slice(1).map(({ role, content }) => ({ role, content }))

  // Cambia el estado de una tarjeta y, al resolverse, deja un mensaje [Sistema]
  // en el historial para que el agente sepa qué pasó de verdad.
  const resolver = async (propId, accion) => {
    const parche = (id, cambios, extra) => setMessages(ms => {
      const out = ms.map(m => m.propuestas ? { ...m, propuestas: m.propuestas.map(p => p.id === id ? { ...p, ...cambios } : p) } : m)
      return extra ? [...out, extra] : out
    })
    const prop = messages.flatMap(m => m.propuestas || []).find(p => p.id === propId)
    if (!prop || prop.estado !== 'pendiente') return
    if (accion === 'cancelar') {
      parche(propId, { estado: 'cancelada' }, { role: 'user', sistema: true, content: `[Sistema] El usuario CANCELÓ la acción: ${prop.titulo}. No se modificó nada.` })
      return
    }
    parche(propId, { estado: 'ejecutando' })
    try {
      const r = await ejecutarAccion(prop)
      parche(propId, { estado: 'hecha', resultado: r.texto, ruta: r.ruta }, { role: 'user', sistema: true, content: `[Sistema] Acción EJECUTADA con éxito: ${prop.titulo}. ${r.texto}` })
    } catch (e) {
      console.error('[ChatOperativo] acción', e)
      const msg = e.message || String(e)
      parche(propId, { estado: 'error', resultado: msg }, { role: 'user', sistema: true, content: `[Sistema] La acción FALLÓ y no se aplicó: ${prop.titulo}. Motivo: ${msg}` })
    }
  }

  const adjuntar = async (files) => {
    const imgs = [...files].filter(f => f.type.startsWith('image/'))
    if (imgs.length < files.length) setMessages(ms => [...ms, { role: 'assistant', content: 'Por ahora solo puedo leer fichas en imagen (JPG, PNG, WebP). Si es PDF, tómale captura.' }])
    setLeyendo(n => n + imgs.length)
    for (const f of imgs) {
      try { const r = await leerFicha(f); setAdjuntos(a => [...a, r]) }
      catch (e) { setMessages(ms => [...ms, { role: 'assistant', content: `No pude abrir ${f.name}: ${e.message}` }]) }
      finally { setLeyendo(n => n - 1) }
    }
  }

  const dictar = () => {
    if (!Dictado) return
    if (escuchando) { vozRef.current?.stop(); return }
    const r = new Dictado()
    r.lang = 'es-MX'; r.interimResults = false; r.continuous = false
    r.onresult = e => setInput(v => (v ? v + ' ' : '') + e.results[0][0].transcript)
    r.onend = () => setEscuchando(false)
    r.onerror = () => setEscuchando(false)
    vozRef.current = r
    setEscuchando(true)
    r.start()
  }

  const send = async () => {
    const escrito = input.trim()
    if ((!escrito && !adjuntos.length) || loading || leyendo) return
    const text = [escrito || 'Procesa estos documentos.', ...adjuntos.map(a => a.texto)].join('\n')
    const miniaturas = adjuntos.map(a => a.miniatura)
    setInput(''); setAdjuntos([])
    const next = [...messages, { role: 'user', content: text, miniaturas }]
    setMessages(next)
    setLoading(true)
    try {
      const { content, propuestas } = await chatOperativo(historial(next), '', datosFichas())
      setMessages([...next, { role: 'assistant', content, propuestas: propuestas.map(p => ({ ...p, estado: 'pendiente' })) }])
    } catch (e) {
      console.error('[ChatOperativo]', e)
      setMessages([...next, { role: 'assistant', content: 'Error al conectar. Verifica la configuración de la función.' }])
    }
    setLoading(false)
  }

  const listo = (input.trim() || adjuntos.length) && !loading && !leyendo
  const icono = movil ? 20 : 15
  const btnIcono = { padding: movil ? '0' : '9px 10px', width: movil ? 44 : 'auto', height: movil ? 44 : 'auto', background: 'none', border: '1.5px solid #E5E7EB', borderRadius: movil ? '12px' : '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'white' }}>
      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: movil ? '14px 12px' : '16px', display: 'flex', flexDirection: 'column', gap: '12px', WebkitOverflowScrolling: 'touch' }}>
        {messages.map((m, i) => m.sistema ? (
          <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-light)' }}>
            {m.content.replace(/^\[Sistema\]\s*/, '')}
          </div>
        ) : (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.content && <div style={{
              maxWidth: movil ? '88%' : '80%', padding: movil ? '11px 14px' : '10px 14px', borderRadius: '14px',
              fontSize: movil ? '15px' : '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: m.role === 'user' ? 'var(--color-primary)' : '#F3F4F6',
              color: m.role === 'user' ? 'white' : 'var(--color-text)',
              borderBottomRightRadius: m.role === 'user' ? '4px' : '14px',
              borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '14px',
            }}>
              {m.miniaturas?.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {m.miniaturas.map((src, k) => <img key={k} src={src} alt="Ficha" style={{ height: movil ? '72px' : '56px', borderRadius: '6px' }} />)}
                </div>
              )}
              {m.content}
            </div>}
            {(m.propuestas || []).map(p => (
              <TarjetaAccion key={p.id} p={p} movil={movil}
                onConfirmar={() => resolver(p.id, 'confirmar')}
                onCancelar={() => resolver(p.id, 'cancelar')}
                onAbrir={onAbrirRuta ? () => onAbrirRuta(p.ruta) : undefined} />
            ))}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: '#F3F4F6', borderRadius: '12px', width: 'fit-content' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-light)', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Fichas adjuntas */}
      {(adjuntos.length > 0 || leyendo > 0) && (
        <div style={{ padding: '8px 12px 0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #E5E7EB' }}>
          {adjuntos.map(a => (
            <div key={a.id} style={{ position: 'relative' }}>
              <img src={a.miniatura} alt={a.id} style={{ height: movil ? '56px' : '44px', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
              <button onClick={() => setAdjuntos(x => x.filter(y => y.id !== a.id))} title="Quitar"
                style={{ position: 'absolute', top: '-7px', right: '-7px', width: movil ? 22 : 16, height: movil ? 22 : 16, borderRadius: '50%', border: 'none', background: '#374151', color: 'white', fontSize: '12px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
          {leyendo > 0 && <span style={{ fontSize: '12px', color: 'var(--color-text-light)', display: 'flex', gap: '4px', alignItems: 'center' }}><Loader2 size={13} className="spin" /> Leyendo ficha…</span>}
        </div>
      )}

      {/* Entrada. font-size 16px en móvil: con menos, iOS hace zoom al enfocar. */}
      <div style={{
        padding: movil ? '10px 10px calc(10px + env(safe-area-inset-bottom))' : '12px 16px',
        borderTop: adjuntos.length || leyendo ? 'none' : '1px solid #E5E7EB', display: 'flex', gap: '8px', alignItems: 'center',
      }}>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { adjuntar(e.target.files); e.target.value = '' }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { adjuntar(e.target.files); e.target.value = '' }} />
        {movil && <button onClick={() => camRef.current?.click()} title="Tomar foto" style={btnIcono}><Camera size={icono} color="var(--color-primary)" /></button>}
        <button onClick={() => fileRef.current?.click()} title="Adjuntar imagen" style={btnIcono}><Paperclip size={icono} color="var(--color-text-light)" /></button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={adjuntos.length ? 'Indica qué hacer, o envía…' : (movil ? 'Escribe o dicta…' : 'Escribe tu consulta...')}
          style={{ flex: 1, minWidth: 0, padding: movil ? '0 14px' : '9px 12px', height: movil ? 44 : 'auto', border: '1.5px solid #E5E7EB', borderRadius: movil ? '12px' : '8px', fontSize: movil ? '16px' : '13px', outline: 'none' }}
        />
        {movil && Dictado && (
          <button onClick={dictar} title="Dictar" style={{ ...btnIcono, background: escuchando ? '#FEE2E2' : 'none', borderColor: escuchando ? '#FCA5A5' : '#E5E7EB' }}>
            <Mic size={icono} color={escuchando ? '#B24020' : 'var(--color-primary)'} />
          </button>
        )}
        <button onClick={send} disabled={!listo}
          style={{ ...btnIcono, padding: movil ? 0 : '9px 14px', border: 'none', background: listo ? 'var(--color-primary)' : '#E5E7EB', transition: 'background 0.15s' }}>
          <Send size={icono} color={listo ? 'white' : '#9CA3AF'} />
        </button>
      </div>

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
      @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  )
}
