import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ClipboardCheck, X, Check, AlertTriangle, MinusCircle, Search, Camera,
  Trash2, Upload, ChevronRight, ChevronDown, Filter, Bug, Clock, CheckCircle2,
} from 'lucide-react'
import { supabase, urlFirmada } from '../lib/supabase'
import { useModuleAudit, logAudit } from '../hooks/useAudit'
import toast from 'react-hot-toast'

/**
 * Validación del Sistema.
 *
 * El administrador de la plaza opera IRP en paralelo con su proceso de siempre
 * para comprobar que el sistema hace lo que debe. Esta pantalla es su guía y su
 * libreta: la lista de todo lo que hay que probar, en qué quedó cada punto, y
 * el reporte del problema cuando algo falla —con capturas, que es lo que
 * permite entender la falla sin ir a preguntar.
 */

const ESTADOS = {
  PENDIENTE:    { label: 'Sin probar',    color: '#6B7280', bg: '#F3F4F6', icono: Clock },
  CORRECTO:     { label: 'Correcto',      color: '#057642', bg: '#dcfce7', icono: Check },
  CON_PROBLEMA: { label: 'Con problema',  color: '#B24020', bg: '#fee2e2', icono: AlertTriangle },
  NO_APLICA:    { label: 'No aplica',     color: '#9CA3AF', bg: '#F9FAFB', icono: MinusCircle },
}

const SEVERIDADES = {
  BLOQUEA: { label: 'Impide trabajar', color: '#B24020', bg: '#fee2e2' },
  ALTA:    { label: 'Alta',            color: '#C2410C', bg: '#ffedd5' },
  MEDIA:   { label: 'Media',           color: '#92400E', bg: '#fef3c7' },
  BAJA:    { label: 'Baja',            color: '#6B7280', bg: '#F3F4F6' },
}

const EST_REPORTE = {
  ABIERTO:     { label: 'Abierto',     color: '#B24020', bg: '#fee2e2' },
  EN_REVISION: { label: 'En revisión', color: '#0A66C2', bg: '#dbeafe' },
  RESUELTO:    { label: 'Resuelto',    color: '#057642', bg: '#dcfce7' },
  DESCARTADO:  { label: 'Descartado',  color: '#9CA3AF', bg: '#F3F4F6' },
}

const inp = { width: '100%', padding: '9px 11px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: 'white', fontFamily: 'inherit' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '.03em' }

function Insignia({ meta, chico }) {
  return (
    <span style={{ padding: chico ? '2px 7px' : '3px 9px', borderRadius: 12, fontSize: chico ? 10 : 11, fontWeight: 700, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  )
}

// ── Capturas de pantalla ────────────────────────────────────────────────────
/**
 * Acepta imágenes pegadas del portapapeles, arrastradas o elegidas del disco.
 * Pegar es el camino natural: se toma la captura con la tecla de siempre y se
 * pega aquí, sin pasar por guardar el archivo y buscarlo.
 */
function CampoCapturas({ archivos, setArchivos }) {
  const fileRef = useRef()
  const [sobre, setSobre] = useState(false)

  const agregar = useCallback((lista) => {
    const imgs = [...lista].filter(f => f && f.type?.startsWith('image/'))
    if (!imgs.length) return
    setArchivos(prev => [...prev, ...imgs.map(f => ({
      file: f,
      nombre: f.name || `captura-${Date.now()}.png`,
      preview: URL.createObjectURL(f),
    }))])
  }, [setArchivos])

  // El pegado se escucha en toda la ventana mientras el formulario está
  // abierto: obligar a hacer clic en un recuadro antes de pegar es un paso que
  // nadie descubre.
  useEffect(() => {
    const onPaste = e => {
      const items = [...(e.clipboardData?.items || [])]
      const imgs = items.filter(i => i.type.startsWith('image/')).map(i => i.getAsFile())
      if (imgs.length) { e.preventDefault(); agregar(imgs) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [agregar])

  const quitar = i => setArchivos(prev => {
    URL.revokeObjectURL(prev[i]?.preview)
    return prev.filter((_, x) => x !== i)
  })

  return (
    <div>
      <label style={lbl}>Capturas de pantalla</label>
      <div
        onDragOver={e => { e.preventDefault(); setSobre(true) }}
        onDragLeave={() => setSobre(false)}
        onDrop={e => { e.preventDefault(); setSobre(false); agregar(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${sobre ? 'var(--color-primary)' : '#D1D5DB'}`,
          background: sobre ? '#EFF6FF' : '#FAFBFC',
          borderRadius: 9, padding: '18px 14px', textAlign: 'center', cursor: 'pointer',
        }}>
        <Camera size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Pega la captura con Ctrl + V
        </div>
        <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 3 }}>
          Toma la pantalla como siempre y pégala aquí · también puedes arrastrarla o hacer clic para buscarla
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { agregar(e.target.files); e.target.value = '' }} />

      {archivos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, marginTop: 10 }}>
          {archivos.map((a, i) => (
            <div key={i} style={{ position: 'relative', border: '1px solid #E5E7EB', borderRadius: 7, overflow: 'hidden', background: '#F9FAFB' }}>
              <img src={a.preview} alt="" style={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={e => { e.stopPropagation(); quitar(i) }} title="Quitar"
                style={{ position: 'absolute', top: 4, right: 4, border: 'none', background: 'rgba(0,0,0,.6)', color: 'white', borderRadius: 5, padding: 3, cursor: 'pointer', display: 'flex' }}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal: reportar un problema ─────────────────────────────────────────────
function ReporteModal({ punto, modulos, usuario, onClose, onSaved }) {
  const [form, setForm] = useState({
    punto_id: punto?.id || '',
    modulo:   punto?.modulo || '',
    titulo:   '',
    pasos:    '',
    esperado: '',
    obtenido: '',
    severidad: 'MEDIA',
  })
  const [archivos, setArchivos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.titulo.trim()) return toast.error('Escribe en una línea qué falló')
    if (!form.modulo) return toast.error('Indica en qué módulo pasó')
    setGuardando(true)

    const { data: reporte, error } = await supabase.from('validacion_reportes').insert({
      punto_id: form.punto_id || null,
      modulo: form.modulo,
      titulo: form.titulo.trim(),
      pasos: form.pasos.trim() || null,
      esperado: form.esperado.trim() || null,
      obtenido: form.obtenido.trim() || null,
      severidad: form.severidad,
      reportado_por: usuario,
    }).select('id, folio').single()

    if (error) { setGuardando(false); return toast.error(error.message) }

    // Las capturas se suben después del reporte porque su ruta lo incluye:
    // así el bucket queda ordenado por reporte y no en un montón plano.
    let subidas = 0
    for (const [i, a] of archivos.entries()) {
      const ext = (a.file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
      const path = `${reporte.folio}/${Date.now()}-${i}.${ext}`
      const { error: eUp } = await supabase.storage.from('validacion-capturas')
        .upload(path, a.file, { contentType: a.file.type, upsert: false })
      if (eUp) { toast.error(`No se pudo subir una captura: ${eUp.message}`); continue }
      const { error: eIns } = await supabase.from('validacion_adjuntos').insert({
        reporte_id: reporte.id, archivo_path: path, nombre: a.nombre,
        mime: a.file.type, tamano_kb: Math.round(a.file.size / 1024), orden: i,
      })
      if (!eIns) subidas++
    }

    // Marcar el punto como con problema es la consecuencia natural de reportarlo.
    if (form.punto_id) {
      await supabase.from('validacion_revisiones').upsert({
        punto_id: form.punto_id, estado: 'CON_PROBLEMA',
        revisado_por: usuario, revisado_en: new Date().toISOString(),
      }, { onConflict: 'punto_id' })
    }

    setGuardando(false)
    logAudit({ modulo: 'Validación', accion: 'REPORTE', descripcion: `${reporte.folio} — ${form.titulo}` })
    toast.success(`${reporte.folio} registrado${subidas ? ` con ${subidas} captura${subidas === 1 ? '' : 's'}` : ''}`)
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 14, width: 660, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Bug size={17} color="var(--color-danger)" /> Reportar un problema
            </h3>
            {punto && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                <b>{punto.clave}</b> · {punto.titulo}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'grid', gap: 14, overflowY: 'auto' }}>
          <div>
            <label style={lbl}>Qué falló *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
              placeholder="En una línea. Ej: el recibo sale con el sueldo del mes anterior"
              style={inp} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Módulo *</label>
              <select value={form.modulo} onChange={e => set('modulo', e.target.value)} style={inp}>
                <option value="">— Seleccionar —</option>
                {modulos.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Qué tan grave</label>
              <select value={form.severidad} onChange={e => set('severidad', e.target.value)} style={inp}>
                {Object.entries(SEVERIDADES).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Qué hiciste</label>
            <textarea value={form.pasos} onChange={e => set('pasos', e.target.value)} rows={3}
              placeholder="Los pasos, para poder repetirlo. Ej: entré a Nómina IWOL, elegí la semana del 7, di clic en Recibo de Juan."
              style={{ ...inp, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Qué esperabas</label>
              <textarea value={form.esperado} onChange={e => set('esperado', e.target.value)} rows={2}
                placeholder="Lo que debía pasar" style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div>
              <label style={lbl}>Qué pasó</label>
              <textarea value={form.obtenido} onChange={e => set('obtenido', e.target.value)} rows={2}
                placeholder="Lo que salió en su lugar" style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>

          <CampoCapturas archivos={archivos} setArchivos={setArchivos} />
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 10, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: 'var(--color-danger)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: guardando ? .7 : 1 }}>
            {guardando ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detalle de un reporte ───────────────────────────────────────────────────
function DetalleReporte({ reporte, onClose, onCambio }) {
  const [adjuntos, setAdjuntos] = useState([])
  const [ampliada, setAmpliada] = useState(null)

  useEffect(() => {
    let vivo = true
    supabase.from('validacion_adjuntos')
      .select('id, archivo_path, nombre').eq('reporte_id', reporte.id).order('orden')
      .then(async ({ data }) => {
        const con = await Promise.all((data ?? []).map(async a => ({
          ...a, url: await urlFirmada('validacion-capturas', a.archivo_path),
        })))
        if (vivo) setAdjuntos(con)
      })
    return () => { vivo = false }
  }, [reporte.id])

  const cambiarEstado = async (estado) => {
    const parche = { estado, updated_at: new Date().toISOString() }
    if (estado === 'RESUELTO' || estado === 'DESCARTADO') parche.resuelto_en = new Date().toISOString()
    const { error } = await supabase.from('validacion_reportes').update(parche).eq('id', reporte.id)
    if (error) return toast.error(error.message)
    toast.success('Estado actualizado')
    onCambio()
  }

  const campo = (t, v) => v ? (
    <div style={{ marginBottom: 12 }}>
      <div style={lbl}>{t}</div>
      <div style={{ fontSize: 13.5, color: '#374151', whiteSpace: 'pre-wrap' }}>{v}</div>
    </div>
  ) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 14, width: 760, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--color-primary)' }}>{reporte.folio}</span>
              <Insignia meta={SEVERIDADES[reporte.severidad] || SEVERIDADES.MEDIA} chico />
              <Insignia meta={EST_REPORTE[reporte.estado] || EST_REPORTE.ABIERTO} chico />
            </div>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{reporte.titulo}</h3>
            <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 3 }}>
              {reporte.modulo}
              {reporte.punto_clave && <> · {reporte.punto_clave}</>}
              {reporte.reportado_por && <> · {reporte.reportado_por}</>}
              {reporte.created_at && <> · {String(reporte.created_at).slice(0, 10)}</>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
          {campo('Qué hizo', reporte.pasos)}
          {campo('Qué esperaba', reporte.esperado)}
          {campo('Qué pasó', reporte.obtenido)}
          {campo('Resolución', reporte.resolucion)}

          {adjuntos.length > 0 && (
            <div>
              <div style={lbl}>Capturas ({adjuntos.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 9 }}>
                {adjuntos.map(a => (
                  <button key={a.id} onClick={() => a.url && setAmpliada(a.url)}
                    style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', padding: 0, background: '#F9FAFB', cursor: a.url ? 'zoom-in' : 'default' }}>
                    {a.url
                      ? <img src={a.url} alt={a.nombre} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                      : <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: '#B24020', padding: 8 }}>No se pudo abrir</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '13px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#6B7280', alignSelf: 'center', marginRight: 4 }}>Marcar como:</span>
          {Object.entries(EST_REPORTE).map(([v, m]) => (
            <button key={v} onClick={() => cambiarEstado(v)} disabled={reporte.estado === v}
              style={{
                padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: reporte.estado === v ? 'default' : 'pointer',
                border: '1.5px solid', borderColor: reporte.estado === v ? m.color : '#E5E7EB',
                background: reporte.estado === v ? m.bg : 'white', color: reporte.estado === v ? m.color : '#6B7280',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {ampliada && (
        <div onClick={e => { e.stopPropagation(); setAmpliada(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}>
          <img src={ampliada} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function Validacion() {
  useModuleAudit('VALIDACION')
  const [tab, setTab] = useState('guia')
  const [puntos, setPuntos] = useState([])
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState('')

  const [busca, setBusca] = useState('')
  const [fModulo, setFModulo] = useState('Todos')
  const [fEstado, setFEstado] = useState('Todos')
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [abiertos, setAbiertos] = useState({})
  const [modalReporte, setModalReporte] = useState(null)   // { punto } | {}
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUsuario(data?.user?.email || 'usuario'))
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    const [p, r] = await Promise.all([
      supabase.from('prp_validacion_puntos').select('*').order('modulo').order('orden'),
      supabase.from('prp_validacion_reportes').select('*').order('created_at', { ascending: false }),
    ])
    if (p.error) toast.error(p.error.message); else setPuntos(p.data ?? [])
    if (r.error) toast.error(r.error.message); else setReportes(r.data ?? [])
    setCargando(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const modulos = useMemo(() => [...new Set(puntos.map(p => p.modulo))].sort(), [puntos])

  const marcar = async (punto, estado) => {
    // Volver a tocar el mismo estado lo regresa a pendiente: marcar por error no
    // debe dejar el punto atrapado.
    const nuevo = punto.estado === estado ? 'PENDIENTE' : estado
    const { error } = await supabase.from('validacion_revisiones').upsert({
      punto_id: punto.id, estado: nuevo,
      revisado_por: usuario, revisado_en: new Date().toISOString(),
    }, { onConflict: 'punto_id' })
    if (error) return toast.error(error.message)
    setPuntos(ps => ps.map(x => x.id === punto.id ? { ...x, estado: nuevo, revisado_por: usuario } : x))
    if (nuevo === 'CON_PROBLEMA') setModalReporte({ punto })
  }

  const filtrados = puntos.filter(p => {
    const q = busca.toLowerCase()
    const mQ = !q || p.titulo.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q)
      || p.clave.toLowerCase().includes(q) || p.modulo.toLowerCase().includes(q)
    const mM = fModulo === 'Todos' || p.modulo === fModulo
    const mE = fEstado === 'Todos' || p.estado === fEstado
    const mC = !soloCriticos || p.critico
    return mQ && mM && mE && mC
  })

  const porModulo = useMemo(() => {
    const m = {}
    filtrados.forEach(p => { (m[p.modulo] ||= []).push(p) })
    return Object.entries(m)
  }, [filtrados])

  const cuenta = e => puntos.filter(p => p.estado === e).length
  const avance = puntos.length ? Math.round((cuenta('CORRECTO') + cuenta('NO_APLICA')) / puntos.length * 100) : 0

  const reportesAbiertos = reportes.filter(r => r.estado === 'ABIERTO' || r.estado === 'EN_REVISION').length

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardCheck size={27} color="var(--color-primary)" /> Validación del Sistema
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-light)' }}>
            La guía de lo que hay que probar y el registro de lo que falla
          </p>
        </div>
        <button onClick={() => setModalReporte({})}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <Bug size={16} /> Reportar problema
        </button>
      </div>

      {/* Avance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
        {[
          [puntos.length, 'Puntos por validar', '#0A66C2'],
          [cuenta('CORRECTO'), 'Correctos', '#057642'],
          [cuenta('CON_PROBLEMA'), 'Con problema', '#B24020'],
          [cuenta('PENDIENTE'), 'Sin probar', '#6B7280'],
          [reportesAbiertos, 'Reportes abiertos', '#C2410C'],
        ].map(([v, t, c]) => (
          <div key={t} style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '13px 15px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 3 }}>{t}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 7, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${avance}%`, background: 'var(--color-success)', transition: 'width .3s' }} />
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E5E7EB', marginBottom: 18 }}>
        {[['guia', `Guía de validación (${puntos.length})`], ['reportes', `Problemas reportados (${reportes.length})`]].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, borderBottom: `2.5px solid ${tab === k ? 'var(--color-primary)' : 'transparent'}`, color: tab === k ? 'var(--color-primary)' : 'var(--color-text-light)' }}>
            {t}
          </button>
        ))}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Cargando…</div>
      ) : tab === 'guia' ? (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 210 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar un punto…"
                style={{ ...inp, paddingLeft: 36 }} />
            </div>
            <select value={fModulo} onChange={e => setFModulo(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 190 }}>
              <option value="Todos">Todos los módulos</option>
              {modulos.map(m => (
                <option key={m} value={m}>{m} ({puntos.filter(p => p.modulo === m).length})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 5 }}>
              {['Todos', ...Object.keys(ESTADOS)].map(k => (
                <button key={k} onClick={() => setFEstado(k)}
                  style={{
                    padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                    borderColor: fEstado === k ? 'var(--color-primary)' : '#E5E7EB',
                    background: fEstado === k ? 'var(--color-primary)' : 'white',
                    color: fEstado === k ? 'white' : 'var(--color-text-light)',
                  }}>
                  {k === 'Todos' ? 'Todos' : ESTADOS[k].label}
                </button>
              ))}
            </div>
            <button onClick={() => setSoloCriticos(v => !v)} title="Los puntos que tocan dinero"
              style={{
                padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                borderColor: soloCriticos ? 'var(--color-danger)' : '#E5E7EB',
                background: soloCriticos ? 'var(--color-danger)' : 'white',
                color: soloCriticos ? 'white' : 'var(--color-text-light)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Filter size={12} /> Solo los de dinero
            </button>
          </div>

          {porModulo.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
              Sin puntos que coincidan con los filtros
            </div>
          ) : porModulo.map(([modulo, items]) => {
            const cerrado = abiertos[modulo] === false
            const ok = items.filter(i => i.estado === 'CORRECTO').length
            return (
              <div key={modulo} style={{ marginBottom: 16 }}>
                <button onClick={() => setAbiertos(a => ({ ...a, [modulo]: cerrado }))}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 15px', background: '#1A3C5E', color: 'white', border: 'none', borderRadius: cerrado ? 9 : '9px 9px 0 0', cursor: 'pointer', textAlign: 'left' }}>
                  {cerrado ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{modulo}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, opacity: .8, fontVariantNumeric: 'tabular-nums' }}>
                    {ok} de {items.length} correctos
                  </span>
                </button>

                {!cerrado && (
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 9px 9px', overflow: 'hidden' }}>
                    {items.map((p, i) => {
                      const meta = ESTADOS[p.estado] || ESTADOS.PENDIENTE
                      return (
                        <div key={p.id} style={{ padding: '13px 15px', borderTop: i ? '1px solid #F3F4F6' : 'none', display: 'grid', gridTemplateColumns: '62px 1fr auto', gap: 12, alignItems: 'start' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#9CA3AF', paddingTop: 2 }}>
                            {p.clave}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.titulo}</span>
                              {p.critico && (
                                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#B24020', background: '#fee2e2', padding: '2px 6px', borderRadius: 5, letterSpacing: '.04em' }}>DINERO</span>
                              )}
                              {p.reportes_abiertos > 0 && (
                                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#C2410C', background: '#ffedd5', padding: '2px 6px', borderRadius: 5 }}>
                                  {p.reportes_abiertos} reporte{p.reportes_abiertos === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            {p.descripcion && (
                              <div style={{ fontSize: 12.5, color: 'var(--color-text-light)', marginTop: 3, lineHeight: 1.45 }}>{p.descripcion}</div>
                            )}
                            {p.donde && (
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5, fontFamily: 'monospace' }}>{p.donde}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                            {['CORRECTO', 'CON_PROBLEMA', 'NO_APLICA'].map((v, k) => {
                              const m = ESTADOS[v]; const activo = p.estado === v
                              return (
                                <button key={v} onClick={() => marcar(p, v)} title={m.label}
                                  style={{
                                    padding: '7px 10px', border: 'none', borderLeft: k ? '1px solid #E5E7EB' : 'none',
                                    background: activo ? m.color : 'white', color: activo ? 'white' : '#9CA3AF',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
                                  }}>
                                  <m.icono size={12} /> {v === 'CORRECTO' ? 'Correcto' : v === 'CON_PROBLEMA' ? 'Problema' : 'N/A'}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        /* ── Reportes ── */
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {reportes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
              <CheckCircle2 size={32} style={{ opacity: .3, marginBottom: 10 }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#6B7280' }}>Todavía no hay problemas reportados</p>
              <p style={{ margin: '6px 0 0', fontSize: 12 }}>Se registran desde la guía, marcando un punto con problema</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Folio', 'Qué falló', 'Módulo', 'Gravedad', 'Estado', 'Capturas', 'Reportó', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '11px 13px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--color-text-light)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportes.map(r => (
                    <tr key={r.id} onClick={() => setDetalle(r)}
                      style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}>
                      <td style={{ padding: '11px 13px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>{r.folio}</td>
                      <td style={{ padding: '11px 13px', fontWeight: 600, maxWidth: 320 }}>
                        {r.titulo}
                        {r.punto_clave && <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11, fontFamily: 'monospace' }}> · {r.punto_clave}</span>}
                      </td>
                      <td style={{ padding: '11px 13px', fontSize: 12, color: 'var(--color-text-light)' }}>{r.modulo}</td>
                      <td style={{ padding: '11px 13px' }}><Insignia meta={SEVERIDADES[r.severidad] || SEVERIDADES.MEDIA} chico /></td>
                      <td style={{ padding: '11px 13px' }}><Insignia meta={EST_REPORTE[r.estado] || EST_REPORTE.ABIERTO} chico /></td>
                      <td style={{ padding: '11px 13px', textAlign: 'center', color: r.n_adjuntos > 0 ? '#374151' : '#D1D5DB', fontWeight: 600 }}>
                        {r.n_adjuntos > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Camera size={12} />{r.n_adjuntos}</span> : '—'}
                      </td>
                      <td style={{ padding: '11px 13px', fontSize: 11.5, color: '#9CA3AF' }}>{r.reportado_por}</td>
                      <td style={{ padding: '11px 13px', fontSize: 11.5, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{String(r.created_at).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalReporte && (
        <ReporteModal punto={modalReporte.punto} modulos={modulos} usuario={usuario}
          onClose={() => setModalReporte(null)} onSaved={cargar} />
      )}
      {detalle && (
        <DetalleReporte reporte={detalle} onClose={() => setDetalle(null)}
          onCambio={() => { setDetalle(null); cargar() }} />
      )}
    </div>
  )
}
