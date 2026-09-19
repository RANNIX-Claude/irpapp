import { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Send, X, Plus, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppContext } from '../context/AppContext'

// ── Utilidades ────────────────────────────────────────────────────────────────
const isoHoy    = () => new Date().toISOString().split('T')[0]
const lunesDe   = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().split('T')[0] }
const primerMes = iso => iso.slice(0, 7) + '-01'
const sum       = (arr, key = 'importe') => (arr || []).reduce((s, r) => s + (parseFloat(r[key]) || 0), 0)
const fmt$      = n => '$' + Math.abs(parseFloat(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })
const pct       = (a, b) => b > 0 ? Math.round(a / b * 100) : 0

// ── Configuración visual por tipo ─────────────────────────────────────────────
const CFG = {
  buenos_dias:          { g: ['#3D1A6B', '#7B5EA7'],  emoji: '☀️' },
  ingresos:             { g: ['#0a5c2f', '#057642'],   emoji: '💰' },
  cobranza:             { g: ['#0a3d6b', '#1a6fa8'],   emoji: '🏦' },
  cartera_vencida:      { g: ['#7a0f0f', '#b71c1c'],   emoji: '🚨' },
  gastos:               { g: ['#6b3a0a', '#c0612a'],   emoji: '💸' },
  resultado_positivo:   { g: ['#0a3d1a', '#1e6b3d'],   emoji: '📈' },
  resultado_negativo:   { g: ['#4a0a0a', '#8b1a1a'],   emoji: '📉' },
  personal:             { g: ['#2d1a5e', '#5a4080'],   emoji: '👥' },
  ocupacion:            { g: ['#0d3d3d', '#0e6b6b'],   emoji: '🏢' },
  contratos_vencer:     { g: ['#5c4a00', '#9c7c00'],   emoji: '📝' },
  estacionamiento:      { g: ['#0a2d5c', '#1a5296'],   emoji: '🚗' },
}

// ── Generador de tarjetas ─────────────────────────────────────────────────────
function generarTarjetas(d) {
  const hoy  = isoHoy()
  const cards = []

  const ingHoyTotal  = sum(d.ingHoy)
  const gasHoyTotal  = sum(d.gasHoy)
  const ingSemTotal  = sum(d.ingSem)
  const gasSemTotal  = sum(d.gasSem)

  const cobradoMes   = sum((d.cobros || []).filter(c => ['PAGADO','CONCILIADO','COBRADO'].includes(c.estatus)))
  const pendienteMes = sum((d.cobros || []).filter(c => !['PAGADO','CONCILIADO','COBRADO'].includes(c.estatus)))
  const vencidos     = (d.cobros || []).filter(c => c.estatus === 'VENCIDO')
  const vencidoMes   = sum(vencidos)

  const totalEmps    = (d.empleados || []).length
  const puntuales    = (d.asist || []).filter(a => a.estado === 'PRESENTE').length
  const retardos     = (d.asist || []).filter(a => a.estado === 'RETARDO').length
  const faltas       = (d.asist || []).filter(a => ['INASISTENCIA','FALTA'].includes(a.estado)).length

  const activos      = (d.contratos || []).length
  const hoyD         = new Date(hoy)
  const porVencer    = (d.contratos || []).filter(c => {
    if (!c.fecha_fin) return false
    const diff = (new Date(c.fecha_fin) - hoyD) / 86400000
    return diff >= 0 && diff <= 60
  })
  const rentaRiesgo  = sum(porVencer, 'renta_mensual')
  const netoSem      = ingSemTotal - gasSemTotal
  const metaMes      = cobradoMes + pendienteMes
  const pctCob       = pct(cobradoMes, metaMes)

  // 0 — Buenos días
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  cards.push({
    id: 'buenos_dias', type: 'buenos_dias', pri: 0,
    saludo,
    tiles: [
      { label: 'Ingresó hoy',   value: fmt$(ingHoyTotal),       color: '#4ade80' },
      { label: 'Cobrado / mes', value: `${fmt$(cobradoMes)} (${pctCob}%)`, color: '#60a5fa' },
      { label: 'Locales activos', value: `${activos}`,          color: '#c084fc' },
      { label: 'Personal hoy',  value: `${puntuales + retardos}/${totalEmps}`, color: '#fbbf24' },
      ...(vencidoMes > 0 ? [{ label: '🚨 Cartera vencida', value: fmt$(vencidoMes), color: '#f87171' }] : []),
    ],
  })

  // 1 — Ingresos de la semana
  cards.push({
    id: 'ingresos', type: 'ingresos', pri: 1,
    label: 'INGRESOS DE LA SEMANA',
    value: fmt$(ingSemTotal),
    sub: 'generados esta semana',
    details: ingHoyTotal > 0 ? [`Hoy ingresaron ${fmt$(ingHoyTotal)}`] : [],
    action: { label: 'Ver ingresos', path: '/ingresos' },
  })

  // 2 — Cobranza del mes
  cards.push({
    id: 'cobranza', type: 'cobranza', pri: 2,
    label: 'COBRANZA DEL MES',
    value: fmt$(cobradoMes),
    sub: `${pctCob}% de la meta mensual`,
    details: pendienteMes > 0
      ? [`Falta cobrar ${fmt$(pendienteMes)}`]
      : ['✅ Cobranza al 100%'],
    progress: pctCob,
    action: { label: 'Ver cobranza', path: '/cobranza' },
  })

  // 3 — Cartera vencida (alert)
  if (vencidoMes > 0) {
    cards.push({
      id: 'cartera', type: 'cartera_vencida', pri: 3,
      label: 'CARTERA VENCIDA',
      value: fmt$(vencidoMes),
      sub: `${vencidos.length} contrato${vencidos.length !== 1 ? 's' : ''} sin pagar`,
      details: ['Requiere atención inmediata'],
      action: { label: 'Ver cobranza', path: '/cobranza' },
    })
  }

  // 4 — Personal hoy
  cards.push({
    id: 'personal', type: 'personal', pri: 4,
    label: 'PERSONAL DE HOY',
    value: `${puntuales + retardos}/${totalEmps}`,
    sub: 'presentes en la plaza',
    details: [
      ...(retardos > 0 ? [`⚠️ ${retardos} retardo${retardos > 1 ? 's' : ''}`] : []),
      ...(faltas > 0   ? [`❌ ${faltas} falta${faltas > 1 ? 's' : ''}`] : []),
      ...(retardos === 0 && faltas === 0 ? ['✅ Operación normal'] : []),
    ],
    action: { label: 'Ver foto del día', path: '/foto-del-dia' },
  })

  // 5 — Gastos de la semana (solo si hay)
  if (gasSemTotal > 0) {
    cards.push({
      id: 'gastos', type: 'gastos', pri: 5,
      label: 'GASTOS DE LA SEMANA',
      value: fmt$(gasSemTotal),
      sub: 'gastados esta semana',
      details: gasHoyTotal > 0 ? [`Hoy: ${fmt$(gasHoyTotal)}`] : [],
      action: { label: 'Ver gastos', path: '/gastos-operativos' },
    })
  }

  // 6 — Resultado operativo
  cards.push({
    id: 'resultado', type: netoSem >= 0 ? 'resultado_positivo' : 'resultado_negativo', pri: 6,
    label: 'RESULTADO DE LA SEMANA',
    value: fmt$(netoSem),
    sub: netoSem >= 0 ? 'resultado positivo ✓' : 'resultado negativo — revisar',
    details: [`Ingresos ${fmt$(ingSemTotal)} · Gastos ${fmt$(gasSemTotal)}`],
    action: { label: 'Ver estado de resultados', path: '/edr' },
  })

  // 7 — Ocupación
  if (activos > 0) {
    cards.push({
      id: 'ocupacion', type: 'ocupacion', pri: 7,
      label: 'LOCALES OCUPADOS',
      value: `${activos}`,
      sub: 'contratos activos en la plaza',
      details: porVencer.length > 0
        ? [`⚠️ ${porVencer.length} vencen en 60 días`]
        : ['✅ Contratos al corriente'],
      action: { label: 'Ver contratos', path: '/contratos' },
    })
  }

  // 8 — Contratos por vencer
  if (porVencer.length > 0) {
    cards.push({
      id: 'por_vencer', type: 'contratos_vencer', pri: 8,
      label: 'CONTRATOS POR VENCER',
      value: `${porVencer.length}`,
      sub: `vencen en los próximos 60 días`,
      details: rentaRiesgo > 0 ? [`Renta en riesgo: ${fmt$(rentaRiesgo)}/mes`] : [],
      action: { label: 'Ver contratos', path: '/contratos' },
    })
  }

  return cards.sort((a, b) => a.pri - b.pri)
}

// ── Categorías de actividad ───────────────────────────────────────────────────
const CATS = {
  MANTENIMIENTO: { emoji: '🔧', color: '#D97706', bg: '#FEF3C7', label: 'Mantenimiento' },
  MEJORA:        { emoji: '✨', color: '#7B5EA7', bg: '#F5F3FF', label: 'Mejora'        },
  OPERACION:     { emoji: '⚙️', color: '#2563EB', bg: '#EFF6FF', label: 'Operación'     },
  PROYECTO:      { emoji: '🏗️', color: '#059669', bg: '#ECFDF5', label: 'Proyecto'      },
  INCIDENCIA:    { emoji: '🚨', color: '#DC2626', bg: '#FEF2F2', label: 'Incidencia'    },
}

const timeAgo = iso => {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)      return 'hace un momento'
  if (diff < 3600)    return `hace ${Math.floor(diff/60)} min`
  if (diff < 86400)   return `hace ${Math.floor(diff/3600)} h`
  return new Date(iso).toLocaleDateString('es-MX', { day:'numeric', month:'short' })
}

// ── Tarjeta de actividad operativa (con fotos + autor) ───────────────────────
function TarjetaActividad({ act }) {
  const cat = CATS[act.categoria] || CATS.MANTENIMIENTO
  const fotos = act.fotos || (act.foto_url ? [act.foto_url] : [])
  const [fotoUrls, setFotoUrls] = useState([])

  useEffect(() => {
    if (!fotos.length) return
    Promise.all(
      fotos.map(p => supabase.storage.from('ot-evidencias').createSignedUrl(p, 3600)
        .then(({ data }) => data?.signedUrl || null))
    ).then(urls => setFotoUrls(urls.filter(Boolean)))
  }, [fotos.join(',')])

  const grid = fotoUrls.length
  return (
    <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.14)', marginBottom: 16, background: 'white' }}>
      {/* Fotos */}
      {grid === 1 && (
        <img src={fotoUrls[0]} alt={act.titulo}
          style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
      )}
      {grid === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {fotoUrls.map((u, i) => <img key={i} src={u} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />)}
        </div>
      )}
      {grid >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '150px 150px', gap: 2 }}>
          <img src={fotoUrls[0]} style={{ gridRow: '1 / 3', width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {fotoUrls.slice(1, 3).map((u, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={u} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {i === 1 && grid > 3 && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 900 }}>
                  +{grid - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {grid === 0 && (
        <div style={{ background: cat.bg, padding: '32px 24px', textAlign: 'center', fontSize: 52 }}>{cat.emoji}</div>
      )}

      {/* Contenido */}
      <div style={{ padding: '14px 18px 16px' }}>
        {/* Autor */}
        {(act.autor_nombre || act.autor_foto_url) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {act.autor_foto_url
              ? <img src={act.autor_foto_url} alt={act.autor_nombre}
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #7B5EA7' }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3D1A6B,#7B5EA7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 800 }}>
                  {(act.autor_nombre || '?')[0].toUpperCase()}
                </div>
            }
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{act.autor_nombre || 'Staff'}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(act.fecha)}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, background: cat.bg, color: cat.color,
              padding: '3px 9px', borderRadius: 20, letterSpacing: .4 }}>
              {cat.emoji} {cat.label.toUpperCase()}
            </span>
          </div>
        )}

        {!(act.autor_nombre || act.autor_foto_url) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, background: cat.bg, color: cat.color,
              padding: '3px 10px', borderRadius: 20, letterSpacing: .5 }}>
              {cat.emoji} {cat.label.toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(act.fecha)}</span>
          </div>
        )}

        <div style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', marginBottom: act.descripcion ? 6 : 0 }}>
          {act.titulo}
        </div>
        {act.descripcion && (
          <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>{act.descripcion}</div>
        )}
      </div>
    </div>
  )
}

// ── Modal: nueva publicación (multi-foto) ────────────────────────────────────
function ModalNuevaActividad({ onClose, onCreada }) {
  const { perfil } = useContext(AppContext)
  const fileRef = useRef()
  const [titulo, setTitulo]       = useState('')
  const [desc, setDesc]           = useState('')
  const [cat, setCat]             = useState('MANTENIMIENTO')
  const [fotos, setFotos]         = useState([])   // [{ file, preview }]
  const [enviando, setEnviando]   = useState(false)
  const [error, setError]         = useState('')

  const agregarFotos = e => {
    const files = Array.from(e.target.files || [])
    const nuevas = files.slice(0, 10 - fotos.length).map(f => {
      const preview = URL.createObjectURL(f)
      return { file: f, preview }
    })
    setFotos(prev => [...prev, ...nuevas])
    e.target.value = ''
  }

  const quitarFoto = i => setFotos(prev => prev.filter((_, idx) => idx !== i))

  const publicar = async () => {
    if (!titulo.trim()) { setError('Escribe un título'); return }
    setEnviando(true); setError('')
    try {
      const paths = await Promise.all(fotos.map(async ({ file }) => {
        const ext  = file.name.split('.').pop()
        const path = `feed/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('ot-evidencias').upload(path, file, { upsert: false })
        if (upErr) throw upErr
        return path
      }))

      const autorNombre = perfil ? `${perfil.nombre || ''}${perfil.apellido ? ' ' + perfil.apellido : ''}`.trim() : null
      const autorFoto   = perfil?.foto_url || null

      const { error: dbErr } = await supabase.from('publicaciones').insert({
        titulo: titulo.trim(),
        descripcion: desc.trim() || null,
        categoria: cat,
        fotos: paths,
        autor_nombre: autorNombre || undefined,
        autor_foto_url: autorFoto || undefined,
      })
      if (dbErr) throw dbErr
      onCreada()
      onClose()
    } catch (e) {
      setError(e.message || 'Error al publicar')
      setEnviando(false)
    }
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'white',borderRadius:'22px 22px 0 0',width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 6px' }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'#D1D5DB' }}/>
        </div>

        <div style={{ padding:'4px 20px 32px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <div style={{ fontSize:17,fontWeight:900,color:'#1E293B' }}>📸 Nueva publicación</div>
            <button onClick={onClose} style={{ background:'#F3F4F6',border:'none',borderRadius:8,padding:'6px 8px',cursor:'pointer' }}><X size={16}/></button>
          </div>

          {/* Fotos */}
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={agregarFotos} style={{ display:'none' }}/>
          {fotos.length > 0 ? (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:8 }}>
                {fotos.map((f, i) => (
                  <div key={i} style={{ position:'relative',borderRadius:10,overflow:'hidden' }}>
                    <img src={f.preview} style={{ width:'100%',height:90,objectFit:'cover',display:'block' }}/>
                    <button onClick={() => quitarFoto(i)}
                      style={{ position:'absolute',top:4,right:4,background:'rgba(0,0,0,.6)',border:'none',borderRadius:6,
                        padding:'2px 5px',cursor:'pointer',color:'white',fontSize:10,display:'flex',alignItems:'center' }}>
                      <X size={10}/>
                    </button>
                  </div>
                ))}
                {fotos.length < 10 && (
                  <button onClick={() => fileRef.current.click()}
                    style={{ height:90,background:'#F8FAFC',border:'2px dashed #CBD5E1',borderRadius:10,cursor:'pointer',
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,color:'#94A3B8' }}>
                    <Plus size={18}/>
                    <span style={{ fontSize:9,fontWeight:600 }}>MÁS</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current.click()}
              style={{ width:'100%',padding:'18px',background:'#F8FAFC',border:'2px dashed #CBD5E1',borderRadius:14,cursor:'pointer',
                display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:14,color:'#64748B' }}>
              <Camera size={28} color="#94A3B8"/>
              <span style={{ fontSize:14,fontWeight:600 }}>Agregar fotos (hasta 10)</span>
              <span style={{ fontSize:12 }}>Toca para abrir cámara o galería</span>
            </button>
          )}

          {/* Categoría */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:14 }}>
            {Object.entries(CATS).map(([k, v]) => (
              <button key={k} onClick={() => setCat(k)}
                style={{ padding:'8px 4px',border:`2px solid ${cat===k?v.color:'#E5E7EB'}`,borderRadius:10,
                  background:cat===k?v.bg:'white',cursor:'pointer',textAlign:'center' }}>
                <div style={{ fontSize:18 }}>{v.emoji}</div>
                <div style={{ fontSize:9,fontWeight:700,color:cat===k?v.color:'#9CA3AF',marginTop:2 }}>{v.label.toUpperCase()}</div>
              </button>
            ))}
          </div>

          {/* Título */}
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="¿Qué se hizo? ej: Cambio de jaboneras"
            style={{ width:'100%',border:'1.5px solid #E5E7EB',borderRadius:12,padding:'12px 14px',fontSize:15,outline:'none',marginBottom:10,boxSizing:'border-box',fontFamily:'inherit' }}/>

          {/* Descripción */}
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Detalles adicionales (opcional)…"
            style={{ width:'100%',minHeight:70,border:'1.5px solid #E5E7EB',borderRadius:12,padding:'12px 14px',fontSize:14,resize:'none',outline:'none',marginBottom:14,boxSizing:'border-box',fontFamily:'inherit' }}/>

          {error && <div style={{ color:'#DC2626',fontSize:13,marginBottom:10 }}>⚠️ {error}</div>}

          <button onClick={publicar} disabled={enviando || !titulo.trim()}
            style={{ width:'100%',padding:'14px',background:titulo.trim()&&!enviando?'#7B5EA7':'#E5E7EB',border:'none',borderRadius:14,
              color:titulo.trim()&&!enviando?'white':'#9CA3AF',fontSize:16,fontWeight:900,cursor:titulo.trim()&&!enviando?'pointer':'default',
              display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            {enviando ? 'Publicando…' : <><Send size={16}/> Publicar en el feed</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Mini modal de comentario ──────────────────────────────────────────────────
function ModalComentario({ cardLabel, onClose }) {
  const [texto, setTexto] = useState('')
  const [enviado, setEnviado] = useState(false)

  const enviar = () => {
    if (!texto.trim()) return
    // Guarda en localStorage como nota rápida (simple, sin backend)
    try {
      const notas = JSON.parse(localStorage.getItem('feed_notas') || '[]')
      notas.unshift({ tarjeta: cardLabel, nota: texto.trim(), fecha: new Date().toISOString() })
      localStorage.setItem('feed_notas', JSON.stringify(notas.slice(0, 50)))
    } catch {}
    setEnviado(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'white',borderRadius:'20px 20px 0 0',padding:'20px 20px 36px',width:'100%',maxWidth:520 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <div style={{ fontSize:13,fontWeight:700,color:'#374151' }}>💬 Nota sobre: <span style={{ color:'#7B5EA7' }}>{cardLabel}</span></div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF' }}><X size={18}/></button>
        </div>
        {enviado ? (
          <div style={{ textAlign:'center',padding:'16px 0',fontSize:22 }}>✅ Nota guardada</div>
        ) : (
          <>
            <textarea value={texto} onChange={e => setTexto(e.target.value)}
              placeholder="Escribe tu comentario aquí…"
              style={{ width:'100%',minHeight:90,border:'1.5px solid #E5E7EB',borderRadius:12,padding:'12px 14px',fontSize:15,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box' }}
              autoFocus />
            <button onClick={enviar} disabled={!texto.trim()}
              style={{ marginTop:12,width:'100%',padding:'13px',background:texto.trim()?'#7B5EA7':'#E5E7EB',border:'none',borderRadius:12,color:texto.trim()?'white':'#9CA3AF',fontSize:15,fontWeight:800,cursor:texto.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              <Send size={15}/> Guardar nota
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta: Buenos días ──────────────────────────────────────────────────────
function TarjetaBuenosDias({ card }) {
  const cfg = CFG.buenos_dias
  return (
    <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 12px 40px rgba(61,26,107,.35)', marginBottom: 16 }}>
      <div style={{ background: `linear-gradient(145deg, ${cfg.g[0]}, ${cfg.g[1]})`, padding: '28px 24px 24px' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'white', marginBottom: 22 }}>
          {card.saludo} {cfg.emoji}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {card.tiles.map((t, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.13)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginBottom: 5, fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: t.color, lineHeight: 1 }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta genérica ──────────────────────────────────────────────────────────
function TarjetaFeed({ card }) {
  const navigate = useNavigate()
  const cfg = CFG[card.type] || CFG.ingresos
  const [comentando, setComentando] = useState(false)

  return (
    <>
      <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.18)', marginBottom: 16 }}>
        {/* Hero: número grande */}
        <div style={{ background: `linear-gradient(145deg, ${cfg.g[0]}, ${cfg.g[1]})`, padding: '28px 24px 36px', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.55)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            {cfg.emoji}&nbsp;&nbsp;{card.label}
          </div>
          <div style={{ fontSize: 68, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -2 }}>
            {card.value}
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.7)', marginTop: 10, fontWeight: 500 }}>
            {card.sub}
          </div>

          {/* Barra de progreso (cobranza) */}
          {card.progress !== undefined && (
            <div style={{ marginTop: 18, height: 6, background: 'rgba(255,255,255,.2)', borderRadius: 3 }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'white', width: `${Math.min(card.progress, 100)}%`, transition: 'width .6s ease' }} />
            </div>
          )}

          {/* Botón comentario arriba derecha */}
          <button onClick={() => setComentando(true)}
            style={{ position:'absolute',top:16,right:16,background:'rgba(255,255,255,.18)',border:'none',borderRadius:10,padding:'7px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:5,color:'white',fontSize:12,fontWeight:700 }}>
            <MessageCircle size={14}/> Nota
          </button>
        </div>

        {/* Footer blanco */}
        <div style={{ background: 'white', padding: '16px 22px 18px' }}>
          {(card.details || []).map((d, i) => (
            <div key={i} style={{ fontSize: 14, color: '#475569', marginBottom: 5, fontWeight: 500 }}>{d}</div>
          ))}
          {card.action && (
            <button onClick={() => navigate(card.action.path)}
              style={{ marginTop: 12, width: '100%', padding: '12px 0', background: 'none',
                border: `2px solid ${cfg.g[1]}`, borderRadius: 12,
                color: cfg.g[1], fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: .3 }}>
              {card.action.label} →
            </button>
          )}
        </div>
      </div>

      {comentando && <ModalComentario cardLabel={card.label} onClose={() => setComentando(false)} />}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function FeedEjecutivo() {
  const [tarjetas, setTarjetas]     = useState([])
  const [actividades, setActivs]    = useState([])
  const [loading, setLoading]       = useState(true)
  const [actualizado, setAct]       = useState(null)
  const [nuevaAct, setNuevaAct]     = useState(false)
  const navigate = useNavigate()

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy  = isoHoy()
    const lun  = lunesDe(hoy)
    const pmes = primerMes(hoy)

    const [ingH, gasH, ingS, gasS, cob, emps, asist, contr, acts] = await Promise.all([
      supabase.from('prp_ingresos').select('importe').eq('fecha', hoy),
      supabase.from('prp_gastos').select('importe').eq('fecha', hoy),
      supabase.from('prp_ingresos').select('importe').gte('fecha', lun).lte('fecha', hoy),
      supabase.from('prp_gastos').select('importe').gte('fecha', lun).lte('fecha', hoy),
      supabase.from('prp_cobros').select('importe,estatus').gte('fecha', pmes).lte('fecha', hoy),
      supabase.from('prp_empleados').select('id,nombre_completo,estado_id').eq('estado_id', 'ACTIVO'),
      supabase.from('prp_asistencia').select('numero_empleado,estado').eq('fecha', hoy),
      supabase.from('prp_contratos').select('id,estatus,renta_mensual,fecha_fin').eq('estatus', 'ACTIVO'),
      supabase.from('prp_publicaciones').select('*').order('fecha', { ascending: false }).limit(20),
    ])

    const data = {
      ingHoy: ingH.data, gasHoy: gasH.data,
      ingSem: ingS.data,  gasSem: gasS.data,
      cobros: cob.data,   empleados: emps.data,
      asist: asist.data,  contratos: contr.data,
    }

    setTarjetas(generarTarjetas(data))
    setActivs(acts.data || [])
    setAct(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div style={{ minHeight: '100vh', background: '#F1F0F5' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B' }}>Feed</div>
          {actualizado && <div style={{ fontSize: 11, color: '#9CA3AF' }}>Actualizado {actualizado}</div>}
        </div>
        <button onClick={cargar} disabled={loading}
          style={{ background: loading ? '#F3F4F6' : '#5A4080', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: loading ? '#9CA3AF' : 'white', fontSize: 13, fontWeight: 700 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Feed */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontSize: 16, color: '#64748B', fontWeight: 600 }}>Preparando tu feed…</div>
          </div>
        ) : (
          <>
            {/* Tarjetas financieras / KPI */}
            {tarjetas.map(card =>
              card.type === 'buenos_dias'
                ? <TarjetaBuenosDias key={card.id} card={card} />
                : <TarjetaFeed key={card.id} card={card} />
            )}

            {/* Actividades operativas */}
            {actividades.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', letterSpacing: 1.5, textTransform: 'uppercase', margin: '20px 4px 12px' }}>
                  🔧 Actividades de la plaza
                </div>
                {actividades.map(a => <TarjetaActividad key={a.id} act={a} />)}
              </>
            )}

            {tarjetas.length === 0 && actividades.length === 0 && (
              <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 16, color: '#64748B' }}>Sin datos por el momento</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB — publicar actividad */}
      <button onClick={() => setNuevaAct(true)}
        style={{ position:'fixed', bottom:24, right:20, width:60, height:60,
          background:'linear-gradient(135deg,#5A4080,#7B5EA7)',
          border:'none', borderRadius:'50%', cursor:'pointer',
          boxShadow:'0 6px 24px rgba(91,64,128,.5)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
        <Plus size={28} color="white" strokeWidth={2.5}/>
      </button>

      {nuevaAct && (
        <ModalNuevaActividad
          onClose={() => setNuevaAct(false)}
          onCreada={() => { setNuevaAct(false); cargar() }}
        />
      )}
    </div>
  )
}
