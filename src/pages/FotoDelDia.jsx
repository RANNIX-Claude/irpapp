import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sun, TrendingUp, TrendingDown, X, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
const isoHoy  = () => new Date().toISOString().split('T')[0]
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
const lunesDe = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().split('T')[0] }
const fmt$    = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
const fmtLarga = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const COLORES_AVT = ['#7B5EA7', '#057642', '#E8A020', '#B24020', '#0F766E', '#9D174D']
const ini   = n => (n || '??').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
const colAv = n => COLORES_AVT[(n || '').charCodeAt(0) % COLORES_AVT.length]

// ── Modal historial de asistencia ────────────────────────────────────────────
function ModalHistorial({ emp, onClose }) {
  const [hist, setHist] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.from('prp_asistencia').select('*')
      .eq('numero_empleado', emp.numero_empleado)
      .order('fecha', { ascending: false }).limit(60)
      .then(({ data }) => { setHist(data ?? []); setCargando(false) })
  }, [emp.numero_empleado])

  const presentes = hist.filter(r => r.estado === 'PRESENTE').length
  const retardos  = hist.filter(r => r.estado === 'RETARDO').length
  const faltas    = hist.filter(r => ['INASISTENCIA','FALTA'].includes(r.estado)).length

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:14,width:520,maxWidth:'95vw',maxHeight:'85vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.25)' }} onClick={e=>e.stopPropagation()}>
        {/* Header morado */}
        <div style={{ background:'linear-gradient(135deg,#5A4080 0%,#7B5EA7 100%)',borderRadius:'14px 14px 0 0',padding:'18px 20px',display:'flex',alignItems:'center',gap:14 }}>
          {emp.foto_url
            ? <img src={emp.foto_url} style={{ width:52,height:52,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,255,255,.4)' }} alt={emp.nombre_completo} />
            : <div style={{ width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'white' }}>{ini(emp.nombre_completo)}</div>
          }
          <div style={{ flex:1 }}>
            <div style={{ color:'white',fontWeight:800,fontSize:17 }}>{emp.nombre_completo}</div>
            <div style={{ color:'rgba(255,255,255,.7)',fontSize:12 }}>{emp.puesto} · {emp.area || emp.departamento || '—'}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,padding:6,cursor:'pointer',color:'white',display:'flex' }}><X size={18}/></button>
        </div>

        {/* Métricas resumen */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'#E5E7EB' }}>
          {[[presentes,'Presentes','#057642'],[retardos,'Retardos','#D97706'],[faltas,'Faltas','#B24020']].map(([v,l,c]) => (
            <div key={l} style={{ background:'white',padding:'14px 16px',textAlign:'center' }}>
              <div style={{ fontSize:32,fontWeight:900,color:c,lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:10,color:'#6B7280',fontWeight:700,textTransform:'uppercase',marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Lista de registros */}
        <div style={{ padding:'14px 18px',display:'flex',flexDirection:'column',gap:6 }}>
          {cargando ? (
            <div style={{ textAlign:'center',padding:30,color:'#9CA3AF' }}>Cargando historial…</div>
          ) : hist.length === 0 ? (
            <div style={{ textAlign:'center',padding:30,color:'#9CA3AF',fontSize:13 }}>Sin registros de asistencia</div>
          ) : hist.map(r => {
            const cfg = ESTADO_CFG[r.estado] || CFG_DEFAULT
            return (
              <div key={r.id || r.fecha} style={{ display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:8,background:cfg.bg }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:cfg.color,flexShrink:0 }} />
                <div style={{ flex:1,fontSize:13,fontWeight:600,color:'#1E293B' }}>
                  {new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})}
                </div>
                <div style={{ fontSize:11,color:'#64748B',fontFamily:'monospace' }}>
                  {r.hora_entrada ? r.hora_entrada.slice(0,5) : '—'} → {r.hora_salida ? r.hora_salida.slice(0,5) : '—'}
                </div>
                <div style={{ fontSize:11,fontWeight:700,color:cfg.color,minWidth:72,textAlign:'right' }}>{cfg.emoji} {cfg.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function FotoDelDia() {
  const [fecha, setFecha]         = useState(isoHoy())
  const [empleados, setEmpleados] = useState([])
  const [asistencia, setAsist]    = useState([])
  const [ingresos, setIngresos]   = useState(0)
  const [gastos, setGastos]       = useState(0)
  const [loading, setLoading]     = useState(true)
  const [empSelec, setEmpSelec]   = useState(null)
  const navigate = useNavigate()

  const semana = Array.from({ length: 7 }, (_, i) => addDias(lunesDe(fecha), i))
  const esHoy  = fecha === isoHoy()

  const cargar = useCallback(async f => {
    setLoading(true)
    const [
      { data: emps },
      { data: asist },
      { data: ing },
      { data: gas },
    ] = await Promise.all([
      supabase.from('prp_empleados').select('id,nombre_completo,numero_empleado,puesto,area,departamento,foto_url,estado_id').eq('estado_id', 'ACTIVO').order('nombre_completo'),
      supabase.from('prp_asistencia').select('*').eq('fecha', f),
      supabase.from('prp_ingresos').select('importe').eq('fecha', f),
      supabase.from('prp_gastos').select('importe').eq('fecha', f),
    ])
    setEmpleados(emps ?? [])
    setAsist(asist ?? [])
    setIngresos((ing  ?? []).reduce((s, r) => s + (parseFloat(r.importe) || 0), 0))
    setGastos(  (gas  ?? []).reduce((s, r) => s + (parseFloat(r.importe) || 0), 0))
    setLoading(false)
  }, [])

  useEffect(() => { cargar(fecha) }, [fecha, cargar])

  const asistMap  = Object.fromEntries(asistencia.map(r => [r.numero_empleado, r]))
  const presentes = empleados.filter(e => asistMap[e.numero_empleado]?.estado === 'PRESENTE').length
  const retardos  = empleados.filter(e => asistMap[e.numero_empleado]?.estado === 'RETARDO').length
  const faltas    = empleados.filter(e => ['INASISTENCIA','FALTA'].includes(asistMap[e.numero_empleado]?.estado)).length
  const sinReg    = empleados.filter(e => !asistMap[e.numero_empleado]).length
  const neto      = ingresos - gastos

  return (
    <div style={{ padding:'24px 28px', maxWidth:1120, margin:'0 auto' }}>

      {/* ── Título ── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
          <Sun size={24} color="#E8A020" />
          <h1 style={{ margin:0,fontSize:23,fontWeight:900,color:'#1E293B' }}>Foto del Día</h1>
          {esHoy && <span style={{ fontSize:11,fontWeight:700,background:'#E8A020',color:'white',padding:'3px 10px',borderRadius:20,letterSpacing:'.3px' }}>HOY</span>}
        </div>
        <div style={{ fontSize:14,color:'#64748B',textTransform:'capitalize' }}>{fmtLarga(fecha)}</div>
      </div>

      {/* ── Navegador de semana ── */}
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:24 }}>
        <button onClick={() => setFecha(f => addDias(f,-7))}
          style={{ padding:'8px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0 }}>
          <ChevronLeft size={16}/>
        </button>

        <div style={{ display:'flex',gap:4,flex:1 }}>
          {semana.map(d => {
            const activo = d === fecha
            const esH    = d === isoHoy()
            return (
              <button key={d} onClick={() => setFecha(d)}
                style={{ flex:1,padding:'9px 4px',border:`2px solid ${activo?'#7B5EA7':esH?'#7B5EA7':'#E5E7EB'}`,
                  borderRadius:10,background:activo?'#7B5EA7':esH?'#F5F3FF':'white',cursor:'pointer',textAlign:'center',transition:'all .15s' }}>
                <div style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',
                  color:activo?'rgba(255,255,255,.75)':esH?'#7B5EA7':'#9CA3AF' }}>
                  {new Date(d+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short'})}
                </div>
                <div style={{ fontSize:17,fontWeight:900,color:activo?'white':esH?'#7B5EA7':'#374151',lineHeight:1.2 }}>
                  {new Date(d+'T12:00:00').getDate()}
                </div>
              </button>
            )
          })}
        </div>

        <button onClick={() => setFecha(f => addDias(f,7))}
          style={{ padding:'8px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0 }}>
          <ChevronRight size={16}/>
        </button>

        {!esHoy && (
          <button onClick={() => setFecha(isoHoy())}
            style={{ padding:'8px 16px',border:'none',borderRadius:8,background:'#7B5EA7',color:'white',cursor:'pointer',fontSize:12,fontWeight:700,flexShrink:0 }}>
            Hoy
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center',padding:100,color:'#9CA3AF',fontSize:14 }}>Cargando…</div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 280px',gap:22,alignItems:'start' }}>

          {/* ── Columna personal ── */}
          <div>
            {/* Métricas rápidas */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18 }}>
              {[
                [presentes, 'Puntuales', '#057642', '#dcfce7'],
                [retardos,  'Retardos',  '#D97706', '#fef3c7'],
                [faltas,    'Faltas',    '#B24020', '#fee2e2'],
                [sinReg,    'Sin reg.',  '#6B7280', '#F3F4F6'],
              ].map(([v,l,c,bg]) => (
                <div key={l} style={{ background:bg,borderRadius:12,padding:'14px 12px',textAlign:'center',border:`1px solid ${c}22` }}>
                  <div style={{ fontSize:36,fontWeight:900,color:c,lineHeight:1 }}>{v}</div>
                  <div style={{ fontSize:11,color:c,fontWeight:700,marginTop:5,textTransform:'uppercase',letterSpacing:'.4px' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Tarjetas de empleados */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10 }}>
              {empleados.map(e => {
                const reg = asistMap[e.numero_empleado]
                const cfg = reg ? (ESTADO_CFG[reg.estado] || CFG_DEFAULT) : CFG_DEFAULT
                return (
                  <div key={e.id} onClick={() => setEmpSelec(e)}
                    style={{ background:cfg.bg,border:`2px solid ${cfg.color}55`,borderRadius:12,padding:'14px 10px',
                      textAlign:'center',cursor:'pointer',transition:'transform .15s, box-shadow .15s',
                      boxShadow:`0 2px 8px ${cfg.color}18` }}
                    onMouseEnter={ev => { ev.currentTarget.style.transform='translateY(-3px)'; ev.currentTarget.style.boxShadow=`0 6px 20px ${cfg.color}30` }}
                    onMouseLeave={ev => { ev.currentTarget.style.transform='translateY(0)'; ev.currentTarget.style.boxShadow=`0 2px 8px ${cfg.color}18` }}>

                    {/* Avatar */}
                    {e.foto_url
                      ? <img src={e.foto_url} style={{ width:52,height:52,borderRadius:'50%',objectFit:'cover',border:`3px solid ${cfg.color}`,marginBottom:6 }} alt={e.nombre_completo} />
                      : <div style={{ width:52,height:52,borderRadius:'50%',background:cfg.color+'22',border:`3px solid ${cfg.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:900,color:cfg.color,margin:'0 auto 6px' }}>{ini(e.nombre_completo)}</div>
                    }

                    {/* Estado */}
                    <div style={{ fontSize:9,fontWeight:800,background:cfg.color,color:'white',padding:'2px 8px',borderRadius:10,display:'inline-block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.4px' }}>
                      {cfg.emoji} {cfg.label}
                    </div>

                    <div style={{ fontSize:12,fontWeight:700,color:'#1E293B',lineHeight:1.3 }}>
                      {e.nombre_completo.split(' ').slice(0,2).join(' ')}
                    </div>
                    <div style={{ fontSize:10,color:'#64748B',marginTop:2 }}>{e.puesto || '—'}</div>

                    {reg?.hora_entrada && (
                      <div style={{ fontSize:10,color:cfg.color,fontWeight:700,marginTop:5,fontFamily:'monospace' }}>
                        ↓ {reg.hora_entrada.slice(0,5)}
                        {reg.hora_salida ? ` ↑ ${reg.hora_salida.slice(0,5)}` : ''}
                      </div>
                    )}
                  </div>
                )
              })}
              {empleados.length === 0 && (
                <div style={{ gridColumn:'1/-1',textAlign:'center',padding:50,color:'#9CA3AF',fontSize:13 }}>
                  Sin empleados activos registrados
                </div>
              )}
            </div>
          </div>

          {/* ── Columna financiero ── */}
          <div style={{ display:'flex',flexDirection:'column',gap:14,position:'sticky',top:90 }}>

            <div style={{ background:'white',border:'1.5px solid #E5E7EB',borderRadius:14,padding:'20px 22px',boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                <TrendingUp size={17} color="#057642"/>
                <span style={{ fontSize:11,fontWeight:700,color:'#057642',textTransform:'uppercase',letterSpacing:'.5px' }}>Ingresos del día</span>
              </div>
              <div style={{ fontSize:38,fontWeight:900,color:'#057642',lineHeight:1 }}>{fmt$(ingresos)}</div>
            </div>

            <div style={{ background:'white',border:'1.5px solid #E5E7EB',borderRadius:14,padding:'20px 22px',boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                <TrendingDown size={17} color="#B24020"/>
                <span style={{ fontSize:11,fontWeight:700,color:'#B24020',textTransform:'uppercase',letterSpacing:'.5px' }}>Gastos del día</span>
              </div>
              <div style={{ fontSize:38,fontWeight:900,color:'#B24020',lineHeight:1 }}>{fmt$(gastos)}</div>
            </div>

            <div style={{ background:neto>=0?'#F0FDF4':'#FEF2F2',border:`1.5px solid ${neto>=0?'#057642':'#B24020'}33`,borderRadius:14,padding:'20px 22px' }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10 }}>Neto del día</div>
              <div style={{ fontSize:38,fontWeight:900,color:neto>=0?'#057642':'#B24020',lineHeight:1 }}>{fmt$(neto)}</div>
              <div style={{ fontSize:11,color:'#64748B',marginTop:6 }}>{neto>=0?'Positivo ✓':'Negativo — revisar'}</div>
            </div>

            <button onClick={() => navigate('/rh')}
              style={{ padding:'12px',border:'1.5px solid #7B5EA7',borderRadius:10,background:'#F5F3FF',color:'#7B5EA7',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              <Users size={14}/> Ver RH completo
            </button>
          </div>
        </div>
      )}

      {empSelec && <ModalHistorial emp={empSelec} onClose={() => setEmpSelec(null)} />}
    </div>
  )
}
