import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Utilidades de fechas ──────────────────────────────────────────────────────
const DIAS_ES  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function labelCorto(ini, fin) {
  const i = new Date(ini + 'T12:00:00')
  const f = new Date(fin + 'T12:00:00')
  const dI = `${DIAS_ES[i.getDay()].slice(0, 3)} ${i.getDate()}/${MESES_ES[i.getMonth()]}`
  const dF = `${DIAS_ES[f.getDay()].slice(0, 3)} ${f.getDate()}/${MESES_ES[f.getMonth()]}/${f.getFullYear()}`
  return `${dI} — ${dF}`
}

function generarTablaSemanas() {
  const ORIGEN_INI = '2026-06-27'
  const hoy = new Date()
  const dow = hoy.getDay()
  const diasHastaSab = dow === 6 ? 0 : dow + 1
  const sabHoy = new Date(hoy)
  sabHoy.setDate(sabHoy.getDate() - diasHastaSab)
  const sabHoyLocal = `${sabHoy.getFullYear()}-${String(sabHoy.getMonth() + 1).padStart(2, '0')}-${String(sabHoy.getDate()).padStart(2, '0')}`

  const semanas = []
  let cur = ORIGEN_INI
  while (cur <= sabHoyLocal) {
    const fin = addDays(cur, 6)
    const iniEstac = addDays(cur, -1)  // Viernes anterior al Sábado (igual que ResumenSemanal)
    semanas.push({ ini: cur, fin, iniEstac, label: labelCorto(cur, fin) })
    cur = addDays(cur, 7)
  }
  semanas.reverse()
  return semanas.slice(0, 20)
}



const sum = (arr, key = 'importe') => (arr || []).reduce((s, r) => s + (parseFloat(r[key]) || 0), 0)
const fmt$ = n => '$' + Math.abs(parseFloat(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })
const pct  = (a, b) => b > 0 ? Math.round(a / b * 100) : 0

const timeAgo = iso => {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 3600)      return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)     return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} días`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── URL firmada ───────────────────────────────────────────────────────────────
async function firmar(bucket, path) {
  if (!path) return null
  let p = path
  if (p.startsWith('http')) {
    const m = p.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/)
    if (m) p = decodeURIComponent(m[1])
    else return path
  }
  const { data } = await supabase.storage.from(bucket).createSignedUrl(p, 600)
  return data?.signedUrl || null
}

function videoEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

// ── Selector de semana ────────────────────────────────────────────────────────
function SelectorSemana({ semanas, idx, onChange }) {
  const [open, setOpen] = useState(false)
  const sem = semanas[idx]
  const puedeAtras    = idx < semanas.length - 1
  const puedeAdelante = idx > 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
      <button onClick={() => puedeAtras && onChange(idx + 1)} disabled={!puedeAtras}
        style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: puedeAtras ? 'pointer' : 'not-allowed', color: puedeAtras ? 'white' : 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center' }}>
        <ChevronLeft size={16} />
      </button>

      <button onClick={() => setOpen(!open)}
        style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
        {sem?.label}
        {idx === 0 && (
          <span style={{ fontSize: 9, background: '#E8A020', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 800, letterSpacing: '.05em' }}>HOY</span>
        )}
      </button>

      <button onClick={() => puedeAdelante && onChange(idx - 1)} disabled={!puedeAdelante}
        style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 8, padding: '7px 9px', cursor: puedeAdelante ? 'pointer' : 'not-allowed', color: puedeAdelante ? 'white' : 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center' }}>
        <ChevronRight size={16} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.2)', minWidth: 240, overflow: 'hidden' }}>
            {semanas.map((s, i) => (
              <button key={s.ini} onClick={() => { onChange(i); setOpen(false) }}
                style={{ width: '100%', padding: '10px 16px', background: i === idx ? '#F1EFF8' : 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: i === idx ? 800 : 400, color: i === idx ? '#5A4080' : '#374151', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {s.label}
                {i === 0 && <span style={{ fontSize: 9, background: '#E8A020', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 800 }}>HOY</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Grilla adaptativa de fotos ────────────────────────────────────────────────
function GrillaFotos({ urls }) {
  const n = urls.length
  if (n === 0) return null
  const img = (src, extra = {}) => <img key={src} src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...extra }} />

  if (n === 1) return (
    <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
      <img src={urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
  if (n === 2) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: 200, overflow: 'hidden' }}>
      {urls.map(u => img(u))}
    </div>
  )
  if (n === 3) return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 240, overflow: 'hidden' }}>
      <img src={urls[0]} alt="" style={{ gridRow: '1/3', width: '100%', height: '100%', objectFit: 'cover' }} />
      <img src={urls[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <img src={urls[2]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 260, overflow: 'hidden' }}>
      {urls.slice(0, 3).map(u => img(u))}
      <div style={{ position: 'relative' }}>
        <img src={urls[3]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {n > 4 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 900 }}>
            +{n - 4}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta: resumen de la semana ─────────────────────────────────────────────
function TarjetaResumen({ tiles, semLabel }) {
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(61,26,107,.28)', marginBottom: 14 }}>
      <div style={{ background: 'linear-gradient(140deg, #3D1A6B 0%, #7B5EA7 60%, #9B7EC8 100%)', padding: '22px 20px 20px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>
          Semana {semLabel}
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 18 }}>
          ☀️ Resumen de la Plaza
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {tiles.map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.13)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: t.color, lineHeight: 1 }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta: KPI ──────────────────────────────────────────────────────────────
function TarjetaKPI({ emoji, label, valor, sub, progreso, detalle, colores, path }) {
  const navigate = useNavigate()
  const [g0, g1] = colores
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.14)', marginBottom: 14, background: 'white' }}>
      <div style={{ background: `linear-gradient(135deg, ${g0}, ${g1})`, padding: '22px 20px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          {emoji}&nbsp; {label}
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: 6 }}>{valor}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{sub}</div>
        {progreso !== undefined && (
          <div style={{ marginTop: 12, height: 5, background: 'rgba(255,255,255,.2)', borderRadius: 3 }}>
            <div style={{ height: '100%', borderRadius: 3, background: 'rgba(255,255,255,.9)', width: `${Math.min(progreso, 100)}%`, transition: 'width .6s ease' }} />
          </div>
        )}
      </div>
      <div style={{ padding: '12px 20px 14px' }}>
        {detalle && <div style={{ fontSize: 13, color: '#64748B', marginBottom: path ? 10 : 0 }}>{detalle}</div>}
        {path && (
          <button onClick={() => navigate(path)}
            style={{ width: '100%', padding: '10px 0', background: 'none', border: `2px solid ${g1}`, borderRadius: 10, color: g1, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            Ver más →
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta: avance de proyecto ───────────────────────────────────────────────
function TarjetaAvance({ avance }) {
  const [urls, setUrls] = useState([])

  useEffect(() => {
    const fotos = avance.fotos || []
    if (!fotos.length) { setUrls([]); return }
    Promise.all(fotos.map(f => firmar('proyectos-avances', f.foto_url))).then(us => setUrls(us.filter(Boolean)))
  }, [avance.id])

  const p = avance.porcentaje_avance || 0
  const colorBarra = p >= 80 ? '#0D9457' : p >= 50 ? '#7B5EA7' : '#F5A623'

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.12)', marginBottom: 14, background: 'white' }}>
      {urls.length > 0 ? <GrillaFotos urls={urls} /> : (
        <div style={{ padding: '28px 0', textAlign: 'center', background: '#F1EFF8', fontSize: 48 }}>🏗️</div>
      )}
      <div style={{ padding: '14px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9B7EC8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
              {avance.proyecto_nombre || 'Proyecto'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{avance.descripcion_corta || 'Avance de obra'}</div>
          </div>
          <div style={{ flexShrink: 0, background: '#F1EFF8', borderRadius: 12, padding: '6px 12px', textAlign: 'center', minWidth: 54 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: colorBarra }}>{p}%</div>
            <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>AVANCE</div>
          </div>
        </div>
        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 3, background: colorBarra, width: `${p}%`, transition: 'width .6s' }} />
        </div>
        {avance.descripcion_larga && (
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 8 }}>{avance.descripcion_larga}</div>
        )}
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>
          {avance.fecha ? new Date(avance.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta: evento ───────────────────────────────────────────────────────────
function TarjetaEvento({ evento }) {
  const [urls, setUrls] = useState([])
  const embed = videoEmbedUrl(evento.video_url)

  useEffect(() => {
    const fotos = evento.fotos || []
    if (!fotos.length) { setUrls([]); return }
    Promise.all(fotos.map(f => firmar('eventos-fotos', f.foto_url))).then(us => setUrls(us.filter(Boolean)))
  }, [evento.id])

  const tieneMedia = urls.length > 0 || embed

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.12)', marginBottom: 14, background: 'white' }}>
      {embed && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <iframe src={embed} title={evento.titulo} frameBorder="0" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
      )}
      {!embed && urls.length > 0 && <GrillaFotos urls={urls} />}
      {!tieneMedia && evento.video_url && (
        <div style={{ padding: '20px', background: '#1E293B', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={20} color="white" fill="white" />
          </div>
          <a href={evento.video_url} target="_blank" rel="noopener noreferrer"
            style={{ color: '#93C5FD', fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>
            Ver video del evento
          </a>
        </div>
      )}
      {!tieneMedia && !evento.video_url && (
        <div style={{ padding: '28px 0', textAlign: 'center', background: '#F1EFF8', fontSize: 48 }}>📅</div>
      )}
      <div style={{ padding: '14px 18px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#9B7EC8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
          {new Date(evento.fecha_evento).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', marginBottom: evento.descripcion ? 6 : 0 }}>
          {evento.titulo}
        </div>
        {evento.descripcion && (
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{evento.descripcion}</div>
        )}
      </div>
    </div>
  )
}

// ── Separador de sección ──────────────────────────────────────────────────────
function Separador({ emoji, titulo, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
      <div style={{ fontSize: 18 }}>{emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#7B5EA7' }}>{titulo}</div>
      {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#EDE9FF', color: '#7B5EA7', borderRadius: 20, padding: '1px 8px' }}>{count}</span>}
      <div style={{ flex: 1, height: 1, background: '#E0D8EE' }} />
    </div>
  )
}

// ── Tarjeta: estado de resultados mensual (desde er_mensual / EDR) ────────────
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function TarjetaOperativo({ op }) {
  const { edrRentas, edrEstac, edrPensiones, edrMaquinita, edrAgua,
          edrSueldos, edrFondo, edrGastos, edrTotalIng, edrUtilNeta, edrStatus, mesNum, anioNum } = op

  const ingresos = [
    { emoji: '🏪', label: 'Rentas',         valor: edrRentas },
    { emoji: '🅿️', label: 'Estacionamiento', valor: edrEstac },
    { emoji: '🚗', label: 'Pensiones',       valor: edrPensiones },
    { emoji: '🎰', label: 'Vending',         valor: edrMaquinita },
    { emoji: '🚰', label: 'Agua',            valor: edrAgua },
  ].filter(l => l.valor > 0)

  const egresos = [
    { emoji: '👷', label: 'Sueldos',         valor: edrSueldos },
    { emoji: '💼', label: 'Fondo revolvente', valor: edrFondo },
  ].filter(l => l.valor > 0)

  const utilPositiva = edrUtilNeta >= 0
  const mesTitulo = mesNum ? `${MESES_LARGO[mesNum - 1]} ${anioNum}` : ''

  const Fila = ({ emoji, label, valor, colorValor }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ fontSize: 13, color: '#374151' }}>{emoji} {label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: colorValor || '#111827' }}>{fmt$(valor)}</div>
    </div>
  )

  const sinDatos = edrTotalIng === 0 && edrGastos === 0

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.14)', marginBottom: 14 }}>
      {/* INGRESOS */}
      <div style={{ background: 'linear-gradient(135deg, #064E3B, #059669)', padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            💰 Ingresos — {mesTitulo}
          </div>
          {edrStatus && (
            <span style={{ fontSize: 9, fontWeight: 800, background: edrStatus === 'cerrado' ? 'rgba(255,255,255,.25)' : 'rgba(232,160,32,.85)', color: 'white', borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase' }}>
              {edrStatus === 'cerrado' ? 'Cerrado' : 'Borrador'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, color: 'white', lineHeight: 1 }}>{fmt$(edrTotalIng)}</div>
      </div>
      <div style={{ background: 'white', padding: '10px 18px 4px' }}>
        {sinDatos
          ? <div style={{ padding: '10px 0', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>EDR de {mesTitulo} aún no capturado</div>
          : ingresos.map((l, i) => <Fila key={i} {...l} colorValor="#059669" />)
        }
      </div>

      {/* EGRESOS */}
      <div style={{ background: 'linear-gradient(135deg, #7F1D1D, #DC2626)', padding: '14px 20px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          📤 Egresos — {mesTitulo}
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'white', lineHeight: 1 }}>{fmt$(edrGastos)}</div>
      </div>
      {!sinDatos && egresos.length > 0 && (
        <div style={{ background: 'white', padding: '10px 18px 4px' }}>
          {egresos.map((l, i) => <Fila key={i} {...l} colorValor="#DC2626" />)}
        </div>
      )}

      {/* UTILIDAD NETA */}
      {!sinDatos && (
        <div style={{ background: utilPositiva ? '#F0FDF4' : '#FEF2F2', padding: '14px 20px', borderTop: `2px solid ${utilPositiva ? '#BBF7D0' : '#FECACA'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: utilPositiva ? '#065F46' : '#991B1B' }}>
            {utilPositiva ? '✅ Utilidad Neta' : '⚠️ Pérdida Neta'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: utilPositiva ? '#059669' : '#DC2626' }}>
            {utilPositiva ? '' : '−'}{fmt$(Math.abs(edrUtilNeta))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function InformePropietario() {
  const semanas    = generarTablaSemanas()
  const [semIdx, setSemIdx] = useState(0)   // 0 = semana actual
  const sem = semanas[semIdx]

  const [kpis,      setKpis]      = useState(null)
  const [operativo, setOperativo] = useState(null)
  const [avances,   setAvances]   = useState([])
  const [eventos,   setEventos]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [actualizado, setAct]     = useState(null)

  const cargar = useCallback(async () => {
    if (!sem) return
    setLoading(true)
    const { ini, fin } = sem
    // Mes y año del viernes de cierre (para filtrar prp_cobros por anio/mes)
    const dFin = new Date(fin + 'T12:00:00')
    const mesNum  = dFin.getMonth() + 1
    const anioNum = dFin.getFullYear()

    const [ingS, gasS, cob, emps, asist, contr, avRows, avFotos, proyRows, evRows, evFotos, edrMes] = await Promise.all([
      supabase.from('prp_ingresos').select('importe').gte('fecha', ini).lte('fecha', fin),
      supabase.from('prp_gastos').select('importe').gte('fecha', ini).lte('fecha', fin),
      supabase.from('prp_cobros').select('monto_total,monto_pagado,estatus').eq('anio', anioNum).eq('mes', mesNum),
      supabase.from('prp_empleados').select('id').eq('estado_id', 'ACTIVO'),
      supabase.from('prp_asistencia').select('estado').eq('fecha', fin),
      supabase.from('prp_contratos').select('id,estatus,renta_mensual,fecha_fin')
        .in('estatus', ['ACTIVO', 'VIGENTE']),
      supabase.from('proyecto_avances')
        .select('id, proyecto_id, porcentaje_avance, descripcion_corta, descripcion_larga, fecha')
        .gte('fecha', ini).lte('fecha', fin)
        .order('fecha', { ascending: false }),
      supabase.from('proyecto_avance_fotos').select('avance_id, foto_url').order('created_at'),
      supabase.from('proyectos').select('id, nombre'),
      supabase.from('eventos')
        .select('id, titulo, descripcion, fecha_evento, video_url')
        .gte('fecha_evento', ini).lte('fecha_evento', fin + 'T23:59:59')
        .order('fecha_evento', { ascending: false }),
      supabase.from('evento_fotos').select('evento_id, foto_url, orden').order('orden'),
      // EDR del mes — ya tiene todo calculado, sin queries adicionales
      supabase.from('er_mensual')
        .select('calc_real_total_rentas,calc_real_total_estac,calc_real_total_pension,calc_real_total_maq,calc_real_total_agua_i,calc_real_total_ing,real_sueldos,real_fondo_revolvente,real_gasto_excedente,real_luz,real_agua_gastos,real_otros_gastos,calc_real_total_gastos,calc_real_util_neta,status')
        .eq('anio', anioNum).eq('mes', mesNum)
        .maybeSingle(),
    ])

    // KPIs — prp_cobros usa monto_pagado (cobrado) y monto_total (cargo original)
    const PAGADOS      = ['PAGADO', 'CONCILIADO', 'COBRADO']
    const cobPag       = (cob.data || []).filter(c => PAGADOS.includes(c.estatus))
    const cobPend      = (cob.data || []).filter(c => !PAGADOS.includes(c.estatus))
    const cobradoMes   = cobPag.reduce((s, c) => s + (parseFloat(c.monto_pagado) || 0), 0)
    const pendienteMes = cobPend.reduce((s, c) => s + (parseFloat(c.monto_total)  || 0), 0)
    const activos      = (contr.data || []).length
    const totalEmps    = (emps.data || []).length
    const presentes    = (asist.data || []).filter(a => ['PRESENTE', 'RETARDO'].includes(a.estado)).length
    const ingSem       = sum(ingS.data)
    const gasSem       = sum(gasS.data)
    const netoSem      = ingSem - gasSem
    const pctCob       = pct(cobradoMes, cobradoMes + pendienteMes)
    const hoyD         = new Date()
    const porVencer    = (contr.data || []).filter(c => {
      if (!c.fecha_fin) return false
      const diff = (new Date(c.fecha_fin) - hoyD) / 86400000
      return diff >= 0 && diff <= 60
    })

    setKpis({ cobradoMes, pendienteMes, pctCob, activos, totalEmps, presentes, ingSem, gasSem, netoSem, porVencer })

    // ── Operativo mensual — desde er_mensual (ya calculado en EDR) ───────────
    const edr = edrMes.data || {}
    const edrRentas    = parseFloat(edr.calc_real_total_rentas)  || 0
    const edrEstac     = parseFloat(edr.calc_real_total_estac)   || 0
    const edrPensiones = parseFloat(edr.calc_real_total_pension) || 0
    const edrMaquinita = parseFloat(edr.calc_real_total_maq)     || 0
    const edrAgua      = parseFloat(edr.calc_real_total_agua_i)  || 0
    const edrSueldos   = parseFloat(edr.real_sueldos)            || 0
    const edrFondo     = parseFloat(edr.real_fondo_revolvente)   || 0
    const edrGastos    = parseFloat(edr.calc_real_total_gastos)  || (edrSueldos + edrFondo + (parseFloat(edr.real_gasto_excedente) || 0) + (parseFloat(edr.real_luz) || 0))
    const edrTotalIng  = parseFloat(edr.calc_real_total_ing)     || (edrRentas + edrEstac + edrPensiones + edrMaquinita + edrAgua)
    const edrUtilNeta  = parseFloat(edr.calc_real_util_neta)     || (edrTotalIng - edrGastos)
    const edrStatus    = edr.status || null
    setOperativo({ edrRentas, edrEstac, edrPensiones, edrMaquinita, edrAgua,
                   edrSueldos, edrFondo, edrGastos, edrTotalIng, edrUtilNeta, edrStatus, mesNum, anioNum })

    // Avances con fotos (join cliente)
    const fotosMap = {}
    for (const f of (avFotos.data || [])) {
      if (!fotosMap[f.avance_id]) fotosMap[f.avance_id] = []
      fotosMap[f.avance_id].push(f)
    }
    const proyNombres = {}
    for (const p of (proyRows.data || [])) proyNombres[p.id] = p.nombre
    setAvances((avRows.data || []).map(a => ({
      ...a,
      proyecto_nombre: proyNombres[a.proyecto_id] || null,
      fotos: fotosMap[a.id] || [],
    })))

    // Eventos con fotos
    const evFotosMap = {}
    for (const f of (evFotos.data || [])) {
      if (!evFotosMap[f.evento_id]) evFotosMap[f.evento_id] = []
      evFotosMap[f.evento_id].push(f)
    }
    setEventos((evRows.data || []).map(e => ({
      ...e,
      fotos: (evFotosMap[e.id] || []).sort((x, y) => x.orden - y.orden),
    })))

    setAct(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [sem?.ini])

  useEffect(() => { cargar() }, [cargar])

  const tiles = kpis ? [
    { label: 'Cobrado este mes',  value: `${fmt$(kpis.cobradoMes)} (${kpis.pctCob}%)`, color: '#60a5fa' },
    { label: 'Locales activos',   value: `${kpis.activos}`,                             color: '#c084fc' },
    { label: 'Ingresos semana',   value: fmt$(kpis.ingSem),                              color: '#4ade80' },
    { label: 'Neto operativo',    value: fmt$(kpis.netoSem),                             color: kpis.netoSem >= 0 ? '#4ade80' : '#f87171' },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: '#F0ECF7' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3D1A6B, #7B5EA7)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 12px rgba(61,26,107,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1 }}>Informe al Propietario</div>
            {actualizado && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>Act. {actualizado}</div>}
          </div>
          <button onClick={cargar} disabled={loading}
            style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'white', fontSize: 12, fontWeight: 700 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {/* Selector de semana */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SelectorSemana semanas={semanas} idx={semIdx} onChange={i => { setSemIdx(i); }} />
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '18px 14px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 15, color: '#7B5EA7', fontWeight: 600 }}>Preparando el informe…</div>
          </div>
        ) : (
          <>
            {/* ── SECCIÓN 1: MÉTRICAS ─────────────────────────── */}
            {kpis && <TarjetaResumen tiles={tiles} semLabel={sem?.label} />}

            {kpis && (
              <>
                <TarjetaKPI
                  emoji="🏦" label="Cobranza del Mes"
                  valor={fmt$(kpis.cobradoMes)}
                  sub={`${kpis.pctCob}% de la meta mensual`}
                  progreso={kpis.pctCob}
                  detalle={kpis.pendienteMes > 0 ? `Falta cobrar ${fmt$(kpis.pendienteMes)}` : '✅ Cobranza al 100%'}
                  colores={['#0a3d6b', '#1a6fa8']}
                  path="/cobranza"
                />

                <TarjetaKPI
                  emoji="💰" label="Ingresos de la Semana"
                  valor={fmt$(kpis.ingSem)}
                  sub="generados esta semana"
                  detalle={kpis.gasSem > 0 ? `Gastos ${fmt$(kpis.gasSem)} · Neto ${fmt$(kpis.netoSem)}` : null}
                  colores={kpis.netoSem >= 0 ? ['#0a5c2f', '#057642'] : ['#4a0a0a', '#8b1a1a']}
                  path="/ingresos"
                />

                <TarjetaKPI
                  emoji="🏢" label="Locales Activos"
                  valor={`${kpis.activos}`}
                  sub="contratos activos en la plaza"
                  detalle={kpis.porVencer.length > 0 ? `⚠️ ${kpis.porVencer.length} contratos vencen en 60 días` : '✅ Contratos al corriente'}
                  colores={['#0d3d3d', '#0e6b6b']}
                  path="/contratos"
                />
              </>
            )}

            {/* ── SECCIÓN 1b: OPERATIVO SEMANAL ───────────────── */}
            {operativo && <TarjetaOperativo op={operativo} />}

            {/* ── SECCIÓN 2: AVANCES DE PROYECTOS ─────────────── */}
            {avances.length > 0 && (
              <>
                <Separador emoji="🏗️" titulo="Avances de Proyectos" count={avances.length} />
                {avances.map(a => <TarjetaAvance key={a.id} avance={a} />)}
              </>
            )}
            {/* ── SECCIÓN 3: EVENTOS ──────────────────────────── */}
            {eventos.length > 0 && (
              <>
                <Separador emoji="📸" titulo="Eventos de la Semana" count={eventos.length} />
                {eventos.map(e => <TarjetaEvento key={e.id} evento={e} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
