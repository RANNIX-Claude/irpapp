import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// ── Tab Horarios de Guardia (rol semanal Humberto/Demetrio) ─────────────────
// El gerente de la plaza captura aquí quién cubre cada día de guardia de
// 24h — sabe con anticipación los turnos de la semana, así que esto NO se
// deriva del cruce con IwolPark (ese cruce solo sirve como apoyo visual en
// Asistencia): esta pantalla es la fuente que el gerente alimenta a mano.
const DIAS_ES_GUARDIA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

function TabHorariosGuardia() {
  const lunesDe = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10) }
  const [inicio, setInicio] = useState(() => lunesDe(new Date().toISOString().slice(0, 10)))
  const [guardias, setGuardias] = useState([])
  const [asignaciones, setAsignaciones] = useState({})   // fecha -> empleado_id ('' = sin asignar)
  const [loading, setLoading] = useState(true)
  const [guardandoFecha, setGuardandoFecha] = useState(null)

  const dias = useMemo(() => {
    const d0 = new Date(inicio + 'T12:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(d0); d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [inicio])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: emps }, { data: turnos }] = await Promise.all([
      supabase.from('rh_empleados').select('id, nombre, apellido_pat').eq('cruza_medianoche', true).eq('estado_id', 'ACTIVO').order('nombre'),
      supabase.from('rh_turnos_guardia').select('fecha, empleado_id').gte('fecha', dias[0]).lte('fecha', dias[6]),
    ])
    setGuardias(emps ?? [])
    setAsignaciones(Object.fromEntries((turnos ?? []).map(t => [t.fecha, t.empleado_id])))
    setLoading(false)
  }, [dias])

  useEffect(() => { cargar() }, [cargar])

  // Se guarda al momento de elegir, renglón por renglón — el gerente va
  // llenando la semana y cada cambio queda capturado de una vez.
  const asignar = async (fecha, empleadoId) => {
    setAsignaciones(a => ({ ...a, [fecha]: empleadoId }))
    setGuardandoFecha(fecha)
    const { error } = empleadoId
      ? await supabase.from('rh_turnos_guardia').upsert({ fecha, empleado_id: empleadoId }, { onConflict: 'fecha' })
      : await supabase.from('rh_turnos_guardia').delete().eq('fecha', fecha)
    setGuardandoFecha(null)
    if (error) return toast.error(error.message)
  }

  const cambiarSemana = delta => {
    const d = new Date(inicio + 'T12:00:00'); d.setDate(d.getDate() + delta * 7)
    setInicio(d.toISOString().slice(0, 10))
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Rol de guardia — turnos de 24h</h3>
          <p style={{ margin:'4px 0 0', fontSize:12.5, color:'var(--color-text-light)' }}>
            Quién cubre cada día. Esto lo captura el gerente de la plaza con anticipación; el cruce con IwolPark en Asistencia es solo un apoyo para validar, no reemplaza esto.
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => cambiarSemana(-1)} style={{ padding:'7px 10px', border:'1.5px solid #E5E7EB', borderRadius:7, background:'white', cursor:'pointer' }}>‹</button>
          <input type="date" value={inicio} onChange={e => setInicio(lunesDe(e.target.value))}
            style={{ padding:'7px 10px', border:'1.5px solid #E5E7EB', borderRadius:7, fontSize:13 }} />
          <button onClick={() => cambiarSemana(1)} style={{ padding:'7px 10px', border:'1.5px solid #E5E7EB', borderRadius:7, background:'white', cursor:'pointer' }}>›</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>Cargando…</div>
      ) : guardias.length === 0 ? (
        <div style={{ padding:'14px 16px', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, fontSize:12.5, color:'#92400E' }}>
          No hay empleados marcados con "Turno cruza medianoche" — actívalo en su expediente (RH → Empleados → Editar → Datos laborales) para que aparezcan aquí.
        </div>
      ) : (
        <div style={{ background:'white', borderRadius:10, border:'1px solid #E5E7EB', overflow:'hidden' }}>
          {dias.map((f, i) => {
            const d = new Date(f + 'T12:00:00')
            return (
              <div key={f} style={{ display:'grid', gridTemplateColumns:'160px 1fr 24px', gap:14, alignItems:'center', padding:'12px 16px', borderTop: i>0 ? '1px solid #F3F4F6' : 'none' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13.5 }}>{DIAS_ES_GUARDIA[d.getDay()]}</div>
                  <div style={{ color:'#9CA3AF', fontFamily:'monospace', fontSize:11 }}>{f}</div>
                </div>
                <select value={asignaciones[f] || ''} onChange={e => asignar(f, e.target.value)}
                  style={{ padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:7, fontSize:13, background:'white', maxWidth:320 }}>
                  <option value="">— Sin asignar —</option>
                  {guardias.map(g => <option key={g.id} value={g.id}>{g.nombre} {g.apellido_pat}</option>)}
                </select>
                <div style={{ width:16, fontSize:10, color:'#9CA3AF' }}>{guardandoFecha === f && '…'}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TabHorariosGuardia