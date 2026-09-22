import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, TrendingUp, DollarSign, Building2, Users, Play } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Utilidades ────────────────────────────────────────────────────────────────
const isoHoy    = () => new Date().toISOString().split('T')[0]
const lunesDe   = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().split('T')[0] }
const primerMes = iso => iso.slice(0, 7) + '-01'
const sum       = (arr, key = 'importe') => (arr || []).reduce((s, r) => s + (parseFloat(r[key]) || 0), 0)
const fmt$      = n => '$' + Math.abs(parseFloat(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })
const pct       = (a, b) => b > 0 ? Math.round(a / b * 100) : 0

const timeAgo = iso => {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)      return 'hace un momento'
  if (diff < 3600)    return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)   return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} días`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtFecha = iso => new Date(iso).toLocaleDateString('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

async function firmar(bucket, path) {
  if (!path) return null
  let p = path
  // Acepta URL completa — extrae la ruta relativa
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

// ── Grilla adaptativa de fotos ────────────────────────────────────────────────
function GrillaFotos({ urls, ratio = '3/2' }) {
  const n = urls.length
  if (n === 0) return null

  const imgStyle = (extra = {}) => ({
    width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...extra,
  })

  if (n === 1) return (
    <div style={{ width: '100%', aspectRatio: ratio, overflow: 'hidden' }}>
      <img src={urls[0]} alt="" style={{ ...imgStyle(), height: '100%' }} />
    </div>
  )

  if (n === 2) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, aspectRatio: ratio, overflow: 'hidden' }}>
      {urls.map((u, i) => <img key={i} src={u} alt="" style={{ ...imgStyle(), aspectRatio: '1/1' }} />)}
    </div>
  )

  // 3 fotos: grande izquierda + 2 pequeñas derecha
  if (n === 3) return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 260, overflow: 'hidden' }}>
      <img src={urls[0]} alt="" style={{ gridRow: '1/3', ...imgStyle() }} />
      <img src={urls[1]} alt="" style={imgStyle()} />
      <img src={urls[2]} alt="" style={imgStyle()} />
    </div>
  )

  // 4+ fotos: 2×2 con overlay en cuarta celda
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 260, overflow: 'hidden' }}>
      {urls.slice(0, 3).map((u, i) => <img key={i} src={u} alt="" style={imgStyle()} />)}
      <div style={{ position: 'relative' }}>
        <img src={urls[3]} alt="" style={imgStyle()} />
        {n > 4 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 900 }}>
            +{n - 4}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta: resumen del día ──────────────────────────────────────────────────
function TarjetaResumen({ tiles }) {
  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(61,26,107,.28)', marginBottom: 14 }}>
      <div style={{ background: 'linear-gradient(140deg, #3D1A6B 0%, #7B5EA7 60%, #9B7EC8 100%)', padding: '22px 20px 20px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>
          {fmtFecha(isoHoy())}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'white', marginBottom: 18 }}>
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
    if (!fotos.length) return
    Promise.all(fotos.map(f => firmar('proyectos-avances', f.foto_url))).then(us => setUrls(us.filter(Boolean)))
  }, [avance.id])

  const pct = avance.porcentaje || 0
  const colorBarra = pct >= 80 ? '#0D9457' : pct >= 50 ? '#7B5EA7' : '#F5A623'

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.12)', marginBottom: 14, background: 'white' }}>
      {urls.length > 0 && <GrillaFotos urls={urls} />}
      {urls.length === 0 && (
        <div style={{ padding: '28px 0', textAlign: 'center', background: '#F1EFF8', fontSize: 48 }}>🏗️</div>
      )}
      <div style={{ padding: '14px 18px 16px' }}>
        {/* Proyecto + badge % */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9B7EC8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
              {avance.proyecto_nombre || 'Proyecto'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{avance.descripcion_corta || 'Avance de obra'}</div>
          </div>
          <div style={{ flexShrink: 0, background: '#F1EFF8', borderRadius: 12, padding: '6px 12px', textAlign: 'center', minWidth: 54 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: colorBarra }}>{pct}%</div>
            <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>AVANCE</div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 3, background: colorBarra, width: `${pct}%`, transition: 'width .6s' }} />
        </div>

        {avance.descripcion_larga && (
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 8 }}>{avance.descripcion_larga}</div>
        )}
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(avance.fecha_registro)}</div>
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
    if (!fotos.length) return
    Promise.all(fotos.map(f => firmar('eventos-fotos', f.foto_url))).then(us => setUrls(us.filter(Boolean)))
  }, [evento.id])

  const tieneMedia = urls.length > 0 || embed

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.12)', marginBottom: 14, background: 'white' }}>
      {/* Video embed */}
      {embed && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <iframe src={embed} title={evento.titulo} frameBorder="0" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
      )}

      {/* Fotos (solo si no hay video embed) */}
      {!embed && urls.length > 0 && <GrillaFotos urls={urls} />}

      {/* Placeholder si solo hay enlace externo (no YouTube/Vimeo) */}
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
function Separador({ emoji, titulo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
      <div style={{ fontSize: 18 }}>{emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color: '#7B5EA7' }}>{titulo}</div>
      <div style={{ flex: 1, height: 1, background: '#E0D8EE' }} />
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function InformePropietario() {
  const [kpis, setKpis]       = useState(null)
  const [avances, setAvances] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [actualizado, setAct] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy  = isoHoy()
    const lun  = lunesDe(hoy)
    const pmes = primerMes(hoy)

    const [ingS, gasS, cob, emps, asist, contr, avRows, avFotos, evRows, evFotos] = await Promise.all([
      supabase.from('prp_ingresos').select('importe').gte('fecha', lun).lte('fecha', hoy),
      supabase.from('prp_gastos').select('importe').gte('fecha', lun).lte('fecha', hoy),
      supabase.from('prp_cobros').select('importe,estatus').gte('fecha', pmes).lte('fecha', hoy),
      supabase.from('prp_empleados').select('id').eq('estado_id', 'ACTIVO'),
      supabase.from('prp_asistencia').select('estado').eq('fecha', hoy),
      supabase.from('prp_contratos').select('id,renta_mensual,fecha_fin').eq('estatus', 'ACTIVO'),
      // Avances: los 8 más recientes con nombre de proyecto
      supabase.from('proyecto_avances')
        .select('id, proyecto_id, porcentaje, descripcion_corta, descripcion_larga, fecha_registro, proyectos(nombre)')
        .order('fecha_registro', { ascending: false })
        .limit(8),
      // Fotos de esos avances
      supabase.from('proyecto_avance_fotos').select('avance_id, foto_url, orden').order('orden'),
      // Eventos: los 10 más recientes
      supabase.from('eventos').select('id, titulo, descripcion, fecha_evento, video_url').order('fecha_evento', { ascending: false }).limit(10),
      // Fotos de eventos
      supabase.from('evento_fotos').select('evento_id, foto_url, orden').order('orden'),
    ])

    // KPIs
    const cobradoMes   = sum((cob.data || []).filter(c => ['PAGADO', 'CONCILIADO', 'COBRADO'].includes(c.estatus)))
    const pendienteMes = sum((cob.data || []).filter(c => !['PAGADO', 'CONCILIADO', 'COBRADO'].includes(c.estatus)))
    const totalEmps    = (emps.data || []).length
    const presentes    = (asist.data || []).filter(a => ['PRESENTE', 'RETARDO'].includes(a.estado)).length
    const activos      = (contr.data || []).length
    const ingSem       = sum(ingS.data)
    const gasSem       = sum(gasS.data)
    const netoSem      = ingSem - gasSem
    const pctCob       = pct(cobradoMes, cobradoMes + pendienteMes)
    const hoyD         = new Date(hoy)
    const porVencer    = (contr.data || []).filter(c => {
      if (!c.fecha_fin) return false
      const diff = (new Date(c.fecha_fin) - hoyD) / 86400000
      return diff >= 0 && diff <= 60
    })

    setKpis({ cobradoMes, pendienteMes, pctCob, activos, totalEmps, presentes, ingSem, gasSem, netoSem, porVencer })

    // Avances: combinar con fotos
    const fotosMap = {}
    for (const f of (avFotos.data || [])) {
      if (!fotosMap[f.avance_id]) fotosMap[f.avance_id] = []
      fotosMap[f.avance_id].push(f)
    }
    const avancesCompletos = (avRows.data || []).map(a => ({
      ...a,
      proyecto_nombre: a.proyectos?.nombre || null,
      fotos: (fotosMap[a.id] || []).sort((x, y) => x.orden - y.orden),
    }))
    setAvances(avancesCompletos)

    // Eventos: combinar con fotos
    const evFotosMap = {}
    for (const f of (evFotos.data || [])) {
      if (!evFotosMap[f.evento_id]) evFotosMap[f.evento_id] = []
      evFotosMap[f.evento_id].push(f)
    }
    const eventosCompletos = (evRows.data || []).map(e => ({
      ...e,
      fotos: (evFotosMap[e.id] || []).sort((x, y) => x.orden - y.orden),
    }))
    setEventos(eventosCompletos)

    setAct(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const tiles = kpis ? [
    { label: 'Cobrado este mes', value: `${fmt$(kpis.cobradoMes)} (${kpis.pctCob}%)`, color: '#60a5fa' },
    { label: 'Locales activos',  value: `${kpis.activos}`,                              color: '#c084fc' },
    { label: 'Ingresos semana',  value: fmt$(kpis.ingSem),                               color: '#4ade80' },
    { label: 'Personal hoy',     value: `${kpis.presentes}/${kpis.totalEmps}`,           color: '#fbbf24' },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: '#F0ECF7' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #3D1A6B, #7B5EA7)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 12px rgba(61,26,107,.3)' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'white', lineHeight: 1 }}>Informe al Propietario</div>
          {actualizado && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>Actualizado {actualizado}</div>}
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontSize: 13, fontWeight: 700 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
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
            <Separador emoji="📊" titulo="Métricas del Negocio" />

            {kpis && <TarjetaResumen tiles={tiles} />}

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

                <TarjetaKPI
                  emoji="👥" label="Personal Presente Hoy"
                  valor={`${kpis.presentes}/${kpis.totalEmps}`}
                  sub="empleados en la plaza"
                  detalle={null}
                  colores={['#2d1a5e', '#5a4080']}
                  path="/rh"
                />
              </>
            )}

            {/* ── SECCIÓN 2: AVANCES DE PROYECTOS ─────────────── */}
            {avances.length > 0 && (
              <>
                <Separador emoji="🏗️" titulo="Avances de Proyectos" />
                {avances.map(a => <TarjetaAvance key={a.id} avance={a} />)}
              </>
            )}

            {/* ── SECCIÓN 3: EVENTOS ──────────────────────────── */}
            {eventos.length > 0 && (
              <>
                <Separador emoji="📸" titulo="Eventos Recientes" />
                {eventos.map(e => <TarjetaEvento key={e.id} evento={e} />)}
              </>
            )}

            {!kpis && avances.length === 0 && eventos.length === 0 && (
              <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 15, color: '#7B5EA7' }}>Sin datos para mostrar</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
