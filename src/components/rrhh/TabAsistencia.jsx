import { useState, useEffect, useMemo } from 'react'
import { Search, AlertTriangle, CheckCircle, Clock, TrendingUp, UserCheck, X, Upload } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase, supabaseParking } from '../../lib/supabase'
import ConsultaChecadas from '../ui/ConsultaChecadas'
import ImportChecadorModal from './ImportChecadorModal'

// ── Tab Asistencia ──────────────────────────────────────────────────────────
function TabAsistencia() {
  const hoy = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0] })
  const [showImport, setShowImport] = useState(false)
  const [showConsulta, setShowConsulta] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: asistencia, loading } = usePRP('prp_asistencia', { filters: [['fecha','eq',fecha]], order: { col: 'nombre_completo' }, refreshKey })
  const { data: empleados } = usePRP('prp_empleados', { order: { col: 'apellido_pat' } })
  const { data: guardiaDia } = usePRP('prp_turnos_guardia', { filters: [['fecha','eq',fecha]], refreshKey })

  // Respaldo de IwolPark: quién operó la caseta como cajero ese día, según el
  // sistema de estacionamiento (proyecto Supabase separado). El reloj
  // biométrico no siempre marca bien los turnos de 24h, así que esto sirve
  // para validar si la asistencia real corresponde a quien entró.
  const [casetaParking, setCasetaParking] = useState({})   // nombre en minúsculas -> { entrada, salida }
  useEffect(() => {
    if (!supabaseParking) { setCasetaParking({}); return }
    let cancelado = false
    supabaseParking.from('tickets')
      .select('cajero_entrada, cajero_salida, hora_entrada_at, hora_salida_at')
      .eq('fecha_op', fecha)
      .then(({ data }) => {
        if (cancelado) return
        const acc = {}
        for (const t of data ?? []) {
          if (t.cajero_entrada) {
            const k = t.cajero_entrada.toLowerCase()
            acc[k] = acc[k] || {}
            if (!acc[k].entrada || t.hora_entrada_at < acc[k].entrada) acc[k].entrada = t.hora_entrada_at
          }
          if (t.cajero_salida) {
            const k = t.cajero_salida.toLowerCase()
            acc[k] = acc[k] || {}
            if (t.hora_salida_at && (!acc[k].salida || t.hora_salida_at > acc[k].salida)) acc[k].salida = t.hora_salida_at
          }
        }
        setCasetaParking(acc)
      })
    return () => { cancelado = true }
  }, [fecha])

  const horaLocal = iso => iso ? new Date(iso).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:false }) : null
  const casetaDe = nombreCompleto => {
    const primerNombre = (nombreCompleto || '').toLowerCase().split(' ')[0]
    return casetaParking[primerNombre] || null
  }

  const lista = asistencia ?? []
  const presentes = lista.filter(a => a.estado === 'PRESENTE').length
  const retardos  = lista.filter(a => a.estado === 'RETARDO').length
  const faltas    = lista.filter(a => a.estado === 'FALTA').length
  const totalHoras = lista.reduce((s, a) => s + (parseFloat(a.horas_trabajadas)||0), 0)

  const COLORES_ESTADO = { PRESENTE: ['#dcfce7','#166534'], RETARDO: ['#fef3c7','#92400e'], FALTA: ['#fee2e2','#991b1b'], VACACIONES: ['#dbeafe','#1d4ed8'], INCAPACIDAD: ['#F3F4F6','#6B7280'], SIN_MARCAJE: ['#EFF6FF','#1D4ED8'] }

  const guardiaHoy = (guardiaDia ?? [])[0] || null
  // Si el guardia programado no tiene renglón de asistencia (el reloj no lo
  // marcó), se agrega uno vacío para que igual se vea junto al respaldo de
  // IwolPark — si no, desaparecería de la tabla por completo.
  const listaConGuardia = useMemo(() => {
    if (!guardiaHoy) return lista
    const primerNombre = guardiaHoy.nombre_completo.split(' ')[0].toLowerCase()
    if (lista.some(a => (a.nombre_completo || '').toLowerCase().includes(primerNombre))) return lista
    return [...lista, {
      id: `guardia-${guardiaHoy.id}`, nombre_completo: guardiaHoy.nombre_completo, numero_empleado: guardiaHoy.numero_empleado,
      puesto: 'Guardia (programado)', hora_entrada: null, hora_salida: null, horas_trabajadas: null, minutos_retardo: 0, estado: 'SIN_MARCAJE',
    }]
  }, [lista, guardiaHoy])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Fecha:</label>
          <input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} />
        </div>
        <button onClick={() => setShowConsulta(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer' }}>
          <Search size={14} /> Consultar marcajes
        </button>
        <button onClick={() => setShowImport(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #7B5EA7', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#7B5EA7', background: 'white', cursor: 'pointer' }}>
          <Upload size={14} /> Importar desde Checador
        </button>
      </div>

      {guardiaHoy && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, padding:'8px 14px', background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:8, fontSize:12.5, color:'#5A4080' }}>
          <UserCheck size={14} /> Guardia programada para el {fecha}: <strong>{guardiaHoy.nombre_completo}</strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[[presentes,'Presentes','#057642',CheckCircle],[retardos,'Retardos','#F59E0B',Clock],[faltas,'Faltas','#B24020',AlertTriangle],[totalHoras.toFixed(1)+'h','Horas Totales','#7B5EA7',TrendingUp]].map(([v,t,c,Icon]) => (
          <div key={t} style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',padding:'14px 16px' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
              <span style={{ fontSize:11,fontWeight:600,color:'var(--color-text-light)',textTransform:'uppercase' }}>{t}</span>
              <Icon size={15} color={c} />
            </div>
            <div style={{ fontSize:22,fontWeight:700,color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Cargando…</div>
      ) : listaConGuardia.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF', background: 'white', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <Upload size={36} style={{ display:'block',margin:'0 auto 12px',opacity:.3 }} />
          <p style={{ margin:0,fontWeight:600 }}>Sin registros para {fecha}</p>
          <p style={{ margin:'6px 0 0',fontSize:12 }}>Importa el reporte del checador ZKTeco o registra manualmente</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead>
                <tr style={{ background:'#F9FAFB',borderBottom:'1px solid #E5E7EB' }}>
                  {['Empleado','# Emp','Puesto','Entrada','Salida','Horas','Retardo','Estado','Caseta (IwolPark)'].map(h => (
                    <th key={h} style={{ padding:'11px 14px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--color-text-light)',whiteSpace:'nowrap',textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaConGuardia.map(a => {
                  const [bg, fg] = COLORES_ESTADO[a.estado] || ['#F3F4F6','#6B7280']
                  const caseta = casetaDe(a.nombre_completo)
                  return (
                    <tr key={a.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'11px 14px',fontWeight:500 }}>{a.nombre_completo}</td>
                      <td style={{ padding:'11px 14px',fontFamily:'monospace',fontSize:12,color:'#7B5EA7' }}>{a.numero_empleado}</td>
                      <td style={{ padding:'11px 14px',fontSize:12,color:'var(--color-text-light)' }}>{a.puesto}</td>
                      <td style={{ padding:'11px 14px',fontFamily:'monospace',fontSize:12 }}>{a.hora_entrada ? String(a.hora_entrada).slice(0,5) : '—'}</td>
                      <td style={{ padding:'11px 14px',fontFamily:'monospace',fontSize:12 }}>{a.hora_salida ? String(a.hora_salida).slice(0,5) : '—'}</td>
                      <td style={{ padding:'11px 14px',fontWeight:600 }}>{a.horas_trabajadas ? parseFloat(a.horas_trabajadas).toFixed(1)+'h' : '—'}</td>
                      <td style={{ padding:'11px 14px',color:a.minutos_retardo>0?'#F59E0B':'var(--color-text-light)',fontWeight:a.minutos_retardo>0?700:400 }}>
                        {a.minutos_retardo > 0 ? `+${a.minutos_retardo} min` : '—'}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ padding:'3px 10px',borderRadius:12,fontSize:11,fontWeight:700,background:bg,color:fg }}>{a.estado === 'SIN_MARCAJE' ? 'SIN MARCAJE' : a.estado}</span>
                      </td>
                      <td style={{ padding:'11px 14px',fontSize:11.5 }}>
                        {caseta
                          ? <span style={{ color:'#166534',fontWeight:600 }} title="Operó la caseta según IwolPark — respaldo, no reemplaza el checador">
                              {horaLocal(caseta.entrada) || '?'}–{horaLocal(caseta.salida) || '?'}
                            </span>
                          : <span style={{ color:'#D1D5DB' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <ImportChecadorModal empleados={empleados ?? []} onClose={() => setShowImport(false)} onImported={() => { setRefreshKey(k=>k+1); setShowImport(false) }} />
      )}
      {showConsulta && (
        <ConsultaChecadas empleados={empleados ?? []} onClose={() => setShowConsulta(false)} />
      )}
    </div>
  )
}

export default TabAsistencia