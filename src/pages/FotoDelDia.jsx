import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sun, TrendingUp, TrendingDown, X, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Hook ancho de pantalla ───────────────────────────────────────────────────
function useAncho() {
  const [ancho, setAncho] = useState(() => window.innerWidth)
  useEffect(() => {
    const fn = () => setAncho(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return ancho
}

// ── Estado → color/label ─────────────────────────────────────────────────────
const ESTADO_CFG = {
  PRESENTE:     { color: '#057642', bg: '#dcfce7', label: 'Puntual',    emoji: '✓' },
  RETARDO:      { color: '#D97706', bg: '#fef3c7', label: 'Retardo',    emoji: '⚠' },
  INASISTENCIA: { color: '#B24020', bg: '#fee2e2', label: 'Falta',      emoji: '✗' },
  FALTA:        { color: '#B24020', bg: '#fee2e2', label: 'Falta',      emoji: '✗' },
  VACACIONES:   { color: '#7B5EA7', bg: '#F5F3FF', label: 'Vacaciones', emoji: '✈' },
  INCAPACIDAD:  { color: '#0F766E', bg: '#CCFBF1', label: 'Incapac.',   emoji: '🏥' },
  SIN_MARCAJE:  { color: '#6B7280', bg: '#F3F4F6', label: 'Sin marcaje',emoji: '?' },
}
const CFG_DEFAULT = { color: '#6B7280', bg: '#F3F4F6', label: 'Sin registro', emoji: '?' }

// ── Utilidades ───────────────────────────────────────────────────────────────
const isoHoy   = () => new Date().toISOString().split('T')[0]
const addDias  = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const lunesDe  = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().split('T')[0] }
const fmt$     = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtLarga = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const ini      = n => (n || '??').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()

// ── Modal historial ──────────────────────────────────────────────────────────
function ModalHistorial({ emp, onClose, isMobile }) {
  const [hist, setHist]       = useState([])
  const [cargando, setCarg]   = useState(true)

  useEffect(() => {
    supabase.from('prp_asistencia').select('*')
      .eq('numero_empleado', emp.numero_empleado)
      .order('fecha', { ascending: false }).limit(60)
      .then(({ data }) => { setHist(data ?? []); setCarg(false) })
  }, [emp.numero_empleado])

  const presentes = hist.filter(r => r.estado === 'PRESENTE').length
  const retardos  = hist.filter(r => r.estado === 'RETARDO').length
  const faltas    = hist.filter(r => ['INASISTENCIA','FALTA'].includes(r.estado)).length

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:400,display:'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent:'center',padding: isMobile ? 0 : 20 }}
      onClick={onClose}>
      <div style={{ background:'white',
        borderRadius: isMobile ? '18px 18px 0 0' : 14,
        width: isMobile ? '100%' : 520,
        maxWidth:'100%',
        maxHeight: isMobile ? '90vh' : '85vh',
        overflow:'auto',boxShadow:'0 -8px 40px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle de arrastre en móvil */}
        {isMobile && (
          <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 4px' }}>
            <div style={{ width:40,height:4,borderRadius:2,background:'#D1D5DB' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#5A4080 0%,#7B5EA7 100%)',
          borderRadius: isMobile ? 0 : '14px 14px 0 0',
          padding:'16px 18px',display:'flex',alignItems:'center',gap:12 }}>
          {emp.foto_url
            ? <img src={emp.foto_url} style={{ width:48,height:48,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,255,255,.4)',flexShrink:0 }} alt={emp.nombre_completo} />
            : <div style={{ width:48,height:48,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color:'white',flexShrink:0 }}>{ini(emp.nombre_completo)}</div>
          }
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ color:'white',fontWeight:800,fontSize:16,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{emp.nombre_completo}</div>
            <div style={{ color:'rgba(255,255,255,.7)',fontSize:12 }}>{emp.puesto} · {emp.area || emp.departamento || '—'}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,padding:6,cursor:'pointer',color:'white',display:'flex',flexShrink:0 }}><X size={18}/></button>
        </div>

        {/* Métricas */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'#E5E7EB' }}>
          {[[presentes,'Presentes','#057642'],[retardos,'Retardos','#D97706'],[faltas,'Faltas','#B24020']].map(([v,l,c]) => (
            <div key={l} style={{ background:'white',padding:'14px 10px',textAlign:'center' }}>
              <div style={{ fontSize:30,fontWeight:900,color:c,lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:10,color:'#6B7280',fontWeight:700,textTransform:'uppercase',marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Historial */}
        <div style={{ padding:'12px 16px',display:'flex',flexDirection:'column',gap:6 }}>
          {cargando ? (
            <div style={{ textAlign:'center',padding:30,color:'#9CA3AF' }}>Cargando historial…</div>
          ) : hist.length === 0 ? (
            <div style={{ textAlign:'center',padding:30,color:'#9CA3AF',fontSize:13 }}>Sin registros de asistencia</div>
          ) : hist.map(r => {
            const cfg = ESTADO_CFG[r.estado] || CFG_DEFAULT
            return (
              <div key={r.id || r.fecha} style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,background:cfg.bg }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:cfg.color,flexShrink:0 }} />
                <div style={{ flex:1,fontSize:13,fontWeight:600,color:'#1E293B' }}>
                  {new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})}
                </div>
                {!isMobile && (
                  <div style={{ fontSize:11,color:'#64748B',fontFamily:'monospace' }}>
                    {r.hora_entrada ? r.hora_entrada.slice(0,5) : '—'} → {r.hora_salida ? r.hora_salida.slice(0,5) : '—'}
                  </div>
                )}
                <div style={{ fontSize:11,fontWeight:700,color:cfg.color,whiteSpace:'nowrap' }}>{cfg.emoji} {cfg.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta financiera ───────────────────────────────────────────────────────
function TarjetaFinanciera({ icono: Icono, color, label, valor, bg, extra }) {
  return (
    <div style={{ background: bg || 'white', border:`1.5px solid ${color}33`, borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 8px rgba(0,0,0,.06)', flex:1 }}>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
        <Icono size={16} color={color}/>
        <span style={{ fontSize:11,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize:34,fontWeight:900,color,lineHeight:1 }}>{valor}</div>
      {extra && <div style={{ fontSize:11,color:'#64748B',marginTop:5 }}>{extra}</div>}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function FotoDelDia() {
  const ancho    = useAncho()
  const isMobile = ancho < 768
  const isSmall  = ancho < 480

  const [fecha, setFecha]       = useState(isoHoy())
  const [empleados, setEmps]    = useState([])
  const [asistencia, setAsist]  = useState([])
  const [ingresos, setIngresos] = useState(0)
  const [gastos, setGastos]     = useState(0)
  const [loading, setLoading]   = useState(true)
  const [empSelec, setEmpSelec] = useState(null)
  const navigate = useNavigate()

  const semana = Array.from({ length: 7 }, (_, i) => addDias(lunesDe(fecha), i))
  const esHoy  = fecha === isoHoy()

  const cargar = useCallback(async f => {
    setLoading(true)
    const [{ data: emps }, { data: asist }, { data: ing }, { data: gas }] = await Promise.all([
      supabase.from('prp_empleados').select('id,nombre_completo,numero_empleado,puesto,area,departamento,foto_url,estado_id').eq('estado_id','ACTIVO').order('nombre_completo'),
      supabase.from('prp_asistencia').select('*').eq('fecha', f),
      supabase.from('prp_ingresos').select('importe').eq('fecha', f),
      supabase.from('prp_gastos').select('importe').eq('fecha', f),
    ])
    setEmps(emps ?? [])
    setAsist(asist ?? [])
    setIngresos((ing ?? []).reduce((s, r) => s + (parseFloat(r.importe) || 0), 0))
    setGastos(  (gas ?? []).reduce((s, r) => s + (parseFloat(r.importe) || 0), 0))
    setLoading(false)
  }, [])

  useEffect(() => { cargar(fecha) }, [fecha, cargar])

  const asistMap  = Object.fromEntries(asistencia.map(r => [r.numero_empleado, r]))
  const presentes = empleados.filter(e => asistMap[e.numero_empleado]?.estado === 'PRESENTE').length
  const retardos  = empleados.filter(e => asistMap[e.numero_empleado]?.estado === 'RETARDO').length
  const faltas    = empleados.filter(e => ['INASISTENCIA','FALTA'].includes(asistMap[e.numero_empleado]?.estado)).length
  const sinReg    = empleados.filter(e => !asistMap[e.numero_empleado]).length
  const neto      = ingresos - gastos

  const pad = isMobile ? '16px' : '24px 28px'

  return (
    <div style={{ padding: pad, maxWidth:1120, margin:'0 auto' }}>

      {/* ── Título ── */}
      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:3 }}>
          <Sun size={isMobile ? 20 : 24} color="#E8A020"/>
          <h1 style={{ margin:0, fontSize: isMobile ? 20 : 23, fontWeight:900, color:'#1E293B' }}>Foto del Día</h1>
          {esHoy && <span style={{ fontSize:10,fontWeight:700,background:'#E8A020',color:'white',padding:'2px 9px',borderRadius:20 }}>HOY</span>}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 14, color:'#64748B', textTransform:'capitalize' }}>{fmtLarga(fecha)}</div>
      </div>

      {/* ── Navegador de semana ── */}
      <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 4 : 8, marginBottom: isMobile ? 16 : 24 }}>
        <button onClick={() => setFecha(f => addDias(f,-7))}
          style={{ padding: isMobile ? '6px 8px' : '8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, background:'white', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0 }}>
          <ChevronLeft size={isMobile ? 14 : 16}/>
        </button>

        <div style={{ display:'flex', gap: isMobile ? 3 : 4, flex:1, overflow:'hidden' }}>
          {semana.map(d => {
            const activo = d === fecha
            const esH    = d === isoHoy()
            return (
              <button key={d} onClick={() => setFecha(d)}
                style={{ flex:1, padding: isMobile ? '6px 2px' : '9px 4px',
                  border:`2px solid ${activo?'#7B5EA7':esH?'#7B5EA7':'#E5E7EB'}`,
                  borderRadius: isMobile ? 8 : 10,
                  background: activo?'#7B5EA7':esH?'#F5F3FF':'white',
                  cursor:'pointer', textAlign:'center', transition:'all .15s', minWidth:0 }}>
                <div style={{ fontSize: isMobile ? 8 : 9, fontWeight:700, textTransform:'uppercase',
                  color:activo?'rgba(255,255,255,.75)':esH?'#7B5EA7':'#9CA3AF' }}>
                  {new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short'}).replace('.','').slice(0, isSmall ? 1 : 3)}
                </div>
                <div style={{ fontSize: isMobile ? 14 : 17, fontWeight:900,
                  color:activo?'white':esH?'#7B5EA7':'#374151', lineHeight:1.2 }}>
                  {new Date(d+'T12:00:00').getDate()}
                </div>
              </button>
            )
          })}
        </div>

        <button onClick={() => setFecha(f => addDias(f,7))}
          style={{ padding: isMobile ? '6px 8px' : '8px 12px', border:'1.5px solid #E5E7EB', borderRadius:8, background:'white', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0 }}>
          <ChevronRight size={isMobile ? 14 : 16}/>
        </button>

        {!esHoy && (
          <button onClick={() => setFecha(isoHoy())}
            style={{ padding: isMobile ? '6px 10px' : '8px 16px', border:'none', borderRadius:8, background:'#7B5EA7', color:'white', cursor:'pointer', fontSize:11, fontWeight:700, flexShrink:0 }}>
            Hoy
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:80, color:'#9CA3AF', fontSize:14 }}>Cargando…</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 272px', gap: isMobile ? 16 : 22, alignItems:'start' }}>

          {/* ── Financiero arriba en móvil ── */}
          {isMobile && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              <TarjetaFinanciera icono={TrendingUp}   color="#057642" label="Ingresos" valor={fmt$(ingresos)} bg="white" />
              <TarjetaFinanciera icono={TrendingDown}  color="#B24020" label="Gastos"   valor={fmt$(gastos)}   bg="white" />
              <TarjetaFinanciera icono={neto>=0?TrendingUp:TrendingDown}
                color={neto>=0?'#057642':'#B24020'}
                label="Neto" valor={fmt$(neto)}
                bg={neto>=0?'#F0FDF4':'#FEF2F2'}
                extra={neto>=0?'✓ Positivo':'⚠ Revisar'} />
            </div>
          )}

          {/* ── Columna personal ── */}
          <div>
            {/* Semáforo de 4 contadores */}
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 18 }}>
              {[
                [presentes,'Puntuales','#057642','#dcfce7'],
                [retardos, 'Retardos', '#D97706','#fef3c7'],
                [faltas,   'Faltas',   '#B24020','#fee2e2'],
                [sinReg,   'Sin reg.', '#6B7280','#F3F4F6'],
              ].map(([v,l,c,bg]) => (
                <div key={l} style={{ background:bg, borderRadius:10, padding: isMobile ? '12px 10px' : '14px 12px', textAlign:'center', border:`1px solid ${c}22` }}>
                  <div style={{ fontSize: isMobile ? 32 : 36, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
                  <div style={{ fontSize:10, color:c, fontWeight:700, marginTop:4, textTransform:'uppercase', letterSpacing:'.4px' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Grid de empleados */}
            <div style={{ display:'grid',
              gridTemplateColumns: isSmall
                ? 'repeat(2,1fr)'
                : isMobile
                  ? 'repeat(3,1fr)'
                  : 'repeat(auto-fill,minmax(130px,1fr))',
              gap: isMobile ? 8 : 10 }}>
              {empleados.map(e => {
                const reg = asistMap[e.numero_empleado]
                const cfg = reg ? (ESTADO_CFG[reg.estado] || CFG_DEFAULT) : CFG_DEFAULT
                return (
                  <div key={e.id} onClick={() => setEmpSelec(e)}
                    style={{ background:cfg.bg, border:`2px solid ${cfg.color}55`, borderRadius:12,
                      padding: isMobile ? '12px 8px' : '14px 10px',
                      textAlign:'center', cursor:'pointer',
                      transition:'transform .15s, box-shadow .15s',
                      boxShadow:`0 2px 8px ${cfg.color}18` }}
                    onMouseEnter={ev => { ev.currentTarget.style.transform='translateY(-2px)'; ev.currentTarget.style.boxShadow=`0 6px 18px ${cfg.color}30` }}
                    onMouseLeave={ev => { ev.currentTarget.style.transform='translateY(0)';  ev.currentTarget.style.boxShadow=`0 2px 8px ${cfg.color}18` }}>

                    {/* Avatar */}
                    {e.foto_url
                      ? <img src={e.foto_url}
                          style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
                            borderRadius:'50%', objectFit:'cover',
                            border:`3px solid ${cfg.color}`, marginBottom:6, display:'block', margin:'0 auto 6px' }}
                          alt={e.nombre_completo} />
                      : <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
                            borderRadius:'50%', background:cfg.color+'22',
                            border:`3px solid ${cfg.color}`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize: isMobile ? 15 : 17, fontWeight:900, color:cfg.color,
                            margin:'0 auto 6px' }}>{ini(e.nombre_completo)}</div>
                    }

                    {/* Badge estado */}
                    <div style={{ fontSize:8, fontWeight:800, background:cfg.color, color:'white',
                      padding:'2px 6px', borderRadius:10, display:'inline-block',
                      marginBottom:5, textTransform:'uppercase', letterSpacing:'.4px' }}>
                      {cfg.emoji} {cfg.label}
                    </div>

                    <div style={{ fontSize: isMobile ? 11 : 12, fontWeight:700, color:'#1E293B', lineHeight:1.3 }}>
                      {e.nombre_completo.split(' ').slice(0, isSmall ? 1 : 2).join(' ')}
                    </div>

                    {!isSmall && (
                      <div style={{ fontSize:9, color:'#64748B', marginTop:2 }}>{e.puesto || '—'}</div>
                    )}

                    {reg?.hora_entrada && (
                      <div style={{ fontSize:9, color:cfg.color, fontWeight:700, marginTop:4, fontFamily:'monospace' }}>
                        ↓{reg.hora_entrada.slice(0,5)}
                        {reg.hora_salida ? ` ↑${reg.hora_salida.slice(0,5)}` : ''}
                      </div>
                    )}
                  </div>
                )
              })}
              {empleados.length === 0 && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:50, color:'#9CA3AF', fontSize:13 }}>
                  Sin empleados activos registrados
                </div>
              )}
            </div>
          </div>

          {/* ── Columna financiero (desktop) ── */}
          {!isMobile && (
            <div style={{ display:'flex', flexDirection:'column', gap:14, position:'sticky', top:90 }}>
              <TarjetaFinanciera icono={TrendingUp}  color="#057642" label="Ingresos del día" valor={fmt$(ingresos)} bg="white" />
              <TarjetaFinanciera icono={TrendingDown} color="#B24020" label="Gastos del día"   valor={fmt$(gastos)}   bg="white" />
              <TarjetaFinanciera
                icono={neto>=0?TrendingUp:TrendingDown}
                color={neto>=0?'#057642':'#B24020'}
                label="Neto del día"
                valor={fmt$(neto)}
                bg={neto>=0?'#F0FDF4':'#FEF2F2'}
                extra={neto>=0?'Positivo ✓':'Negativo — revisar'} />
              <button onClick={() => navigate('/rh')}
                style={{ padding:'12px', border:'1.5px solid #7B5EA7', borderRadius:10, background:'#F5F3FF', color:'#7B5EA7', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Users size={14}/> Ver RH completo
              </button>
            </div>
          )}

          {/* ── Botón RH en móvil ── */}
          {isMobile && (
            <button onClick={() => navigate('/rh')}
              style={{ padding:'13px', border:'1.5px solid #7B5EA7', borderRadius:10, background:'#F5F3FF', color:'#7B5EA7', cursor:'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Users size={15}/> Ver RH completo
            </button>
          )}
        </div>
      )}

      {empSelec && <ModalHistorial emp={empSelec} isMobile={isMobile} onClose={() => setEmpSelec(null)} />}
    </div>
  )
}
