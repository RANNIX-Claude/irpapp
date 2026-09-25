import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Send, Bot, Check, Loader2, Paperclip } from 'lucide-react'
import { chatOperativo } from '../../lib/claude'
import { ejecutarAccion, leerFicha, datosFichas } from '../../lib/agentActions'

// Tarjeta de una acción propuesta por el agente. Nada se ejecuta hasta el clic.
function TarjetaAccion({ p, onConfirmar, onCancelar, onAbrir }) {
  const btn = { padding: '7px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }
  return (
    <div style={{ border: '1.5px solid var(--color-primary)', borderRadius: '10px', background: 'white', overflow: 'hidden', maxWidth: '92%' }}>
      <div style={{ padding: '8px 12px', background: 'rgba(10,102,194,0.08)', fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)' }}>{p.titulo}</div>
      <div style={{ padding: '8px 12px', display: 'grid', gap: '3px' }}>
        {p.resumen.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '6px', fontSize: '12px' }}>
            <span style={{ color: 'var(--color-text-light)' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        {p.aviso && <div style={{ marginTop: '4px', fontSize: '11px', color: '#92400E', background: '#FEF3C7', borderRadius: '6px', padding: '5px 8px' }}>{p.aviso}</div>}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {p.estado === 'pendiente' && <>
          <button onClick={onConfirmar} style={{ ...btn, background: 'var(--color-success)', color: 'white' }}>{p.confirmar || 'Confirmar'}</button>
          <button onClick={onCancelar} style={{ ...btn, background: '#F3F4F6', color: 'var(--color-text)' }}>Cancelar</button>
        </>}
        {p.estado === 'ejecutando' && <span style={{ fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}><Loader2 size={14} className="spin" /> Ejecutando…</span>}
        {p.estado === 'hecha' && <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Check size={14} /> {p.resultado}
          {p.ruta && <button onClick={onAbrir} style={{ ...btn, padding: '3px 8px', background: 'none', color: 'var(--color-primary)', textDecoration: 'underline' }}>Abrir</button>}
        </span>}
        {p.estado === 'cancelada' && <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Cancelada</span>}
        {p.estado === 'error' && <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>No se pudo: {p.resultado}</span>}
      </div>
    </div>
  )
}

export default function AgenteOperativo() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy el Agente Operativo de IRP. ¿En qué puedo ayudarte con la administración de tus inmuebles?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const navigate = useNavigate()

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
      console.error('[AgenteOperativo] acción', e)
      const msg = e.message || String(e)
      parche(propId, { estado: 'error', resultado: msg }, { role: 'user', sistema: true, content: `[Sistema] La acción FALLÓ y no se aplicó: ${prop.titulo}. Motivo: ${msg}` })
    }
  }

  const [adjuntos, setAdjuntos] = useState([])   // fichas ya leídas, pendientes de enviar
  const [leyendo, setLeyendo] = useState(0)
  const fileRef = useRef(null)

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

  const send = async () => {
    const escrito = input.trim()
    if ((!escrito && !adjuntos.length) || loading || leyendo) return
    const text = [escrito || 'Aplica estos depósitos.', ...adjuntos.map(a => a.texto)].join('\n')
    const miniaturas = adjuntos.map(a => a.miniatura)
    setInput(''); setAdjuntos([])
    const next = [...messages, { role: 'user', content: text, miniaturas }]
    setMessages(next)
    setLoading(true)
    try {
      const { content, propuestas } = await chatOperativo(historial(next), '', datosFichas())
      setMessages([...next, { role: 'assistant', content, propuestas: propuestas.map(p => ({ ...p, estado: 'pendiente' })) }])
    } catch (e) {
      console.error('[AgenteOperativo]', e)
      setMessages([...next, { role: 'assistant', content: 'Error al conectar. Verifica la configuración de la función.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--color-primary)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(10,102,194,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(10,102,194,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(10,102,194,0.4)' }}
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '92px', right: '24px', zIndex: 199,
          width: '380px', height: '520px', background: 'white',
          borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid #E5E7EB',
        }}>
          {/* Header */}
          <div style={{ background: 'var(--color-primary)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={20} color="white" />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Agente Operativo</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>IRP — RANNIX Consulting</div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => m.sistema ? (
              <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-light)' }}>
                {m.content.replace(/^\[Sistema\]\s*/, '')}
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.content && <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: '12px',
                  fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'var(--color-primary)' : '#F3F4F6',
                  color: m.role === 'user' ? 'white' : 'var(--color-text)',
                  borderBottomRightRadius: m.role === 'user' ? '4px' : '12px',
                  borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '12px',
                }}>
                  {m.miniaturas?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {m.miniaturas.map((src, k) => <img key={k} src={src} alt="Ficha" style={{ height: '56px', borderRadius: '4px' }} />)}
                    </div>
                  )}
                  {m.content}
                </div>}
                {(m.propuestas || []).map(p => (
                  <TarjetaAccion key={p.id} p={p}
                    onConfirmar={() => resolver(p.id, 'confirmar')}
                    onCancelar={() => resolver(p.id, 'cancelar')}
                    onAbrir={() => { setOpen(false); navigate(p.ruta) }} />
                ))}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: '#F3F4F6', borderRadius: '12px', width: 'fit-content' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-light)',
                    animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {(adjuntos.length > 0 || leyendo > 0) && (
            <div style={{ padding: '8px 16px 0', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #E5E7EB' }}>
              {adjuntos.map(a => (
                <div key={a.id} style={{ position: 'relative' }}>
                  <img src={a.miniatura} alt={a.id} style={{ height: '44px', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
                  <button onClick={() => setAdjuntos(x => x.filter(y => y.id !== a.id))} title="Quitar"
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderRadius: '50%', border: 'none', background: '#374151', color: 'white', fontSize: '10px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              ))}
              {leyendo > 0 && <span style={{ fontSize: '11px', color: 'var(--color-text-light)', display: 'flex', gap: '4px', alignItems: 'center' }}><Loader2 size={12} className="spin" /> Leyendo ficha…</span>}
            </div>
          )}
          <div style={{ padding: '12px 16px', borderTop: adjuntos.length || leyendo ? 'none' : '1px solid #E5E7EB', display: 'flex', gap: '8px' }}>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { adjuntar(e.target.files); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} title="Adjuntar ficha de depósito"
              style={{ padding: '9px 10px', background: 'none', border: '1.5px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer' }}>
              <Paperclip size={15} color="var(--color-text-light)" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={adjuntos.length ? 'Aplica estos depósitos…' : 'Escribe tu consulta...'}
              style={{
                flex: 1, minWidth: 0, padding: '9px 12px', border: '1.5px solid #E5E7EB',
                borderRadius: '8px', fontSize: '13px', outline: 'none',
              }}
            />
            {(() => {
              const listo = (input.trim() || adjuntos.length) && !loading && !leyendo
              return (
                <button onClick={send} disabled={!listo}
                  style={{ padding: '9px 14px', background: listo ? 'var(--color-primary)' : '#E5E7EB', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <Send size={15} color={listo ? 'white' : '#9CA3AF'} />
                </button>
              )
            })()}
          </div>
        </div>
      )}

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
      @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </>
  )
}
