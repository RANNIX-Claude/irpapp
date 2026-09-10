import { useState, useEffect, useMemo } from 'react'
import { X, Search, Download, Clock, LogIn, LogOut, Calendar, Plus, Trash2, Check, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

/**
 * Consulta de marcajes del biométrico.
 *
 * El importador deja los registros en rh_checadas; esta pantalla es para
 * buscarlos después: todas las checadas de Juan Pérez en la semana del 8, o
 * solo las salidas de todos entre dos fechas. Lee la tabla de eventos, no la
 * consolidación diaria, así que sí aparecen las cuatro checadas de un día.
 */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const inp = { padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: 'white' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '.03em' }

// Lunes de la semana de una fecha, en local (no UTC: el desfase de zona
// horaria mueve la semana un día y la consulta devuelve otra cosa).
function lunesDe(fecha) {
  const d = new Date(fecha + 'T12:00:00')
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()))
  return d.toISOString().slice(0, 10)
}
function sumarDias(fecha, n) {
  const d = new Date(fecha + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function ConsultaChecadas({ empleados = [], onClose }) {
  const hoyLunes = lunesDe(new Date().toISOString().slice(0, 10))

  const [modo, setModo]         = useState('SEMANA')     // SEMANA | RANGO
  const [lunes, setLunes]       = useState(hoyLunes)
  const [desde, setDesde]       = useState(hoyLunes)
  const [hasta, setHasta]       = useState(sumarDias(hoyLunes, 6))
  const [empleadoId, setEmpleadoId] = useState('')       // '' = todos
  const [operacion, setOperacion]   = useState('TODAS')  // TODAS | ENTRADA | SALIDA
  const [filas, setFilas]   = useState(null)
  const [cargando, setCargando] = useState(false)

  // Corrección: el checador se equivoca, la gente olvida checar y a veces el
  // archivo se importa mal. Un marcaje se edita en su sitio o se borra.
  const [editando, setEditando] = useState(null)      // id del marcaje en edición
  const [edicion, setEdicion]   = useState({ hora: '', operacion: 'ENTRADA' })
  const [nuevo, setNuevo]       = useState(null)      // formulario de alta manual

  // En modo semana el rango se calcula solo: lunes a domingo.
  const rango = modo === 'SEMANA'
    ? { desde: lunes, hasta: sumarDias(lunes, 6) }
    : { desde, hasta }

  const buscar = async () => {
    if (rango.desde > rango.hasta) return toast.error('La fecha inicial es posterior a la final')
    setCargando(true)
    let q = supabase.from('prp_checadas')
      .select('id, empleado_id, nombre_completo, numero_empleado, operacion, fecha, hora, origen')
      .gte('fecha', rango.desde).lte('fecha', rango.hasta)
      .order('fecha').order('hora')
    if (empleadoId)          q = q.eq('empleado_id', empleadoId)
    if (operacion !== 'TODAS') q = q.eq('operacion', operacion)

    const { data, error } = await q
    setCargando(false)
    if (error) { setFilas([]); return toast.error(error.message) }
    setFilas(data ?? [])
  }

  // Primera búsqueda al abrir: la semana actual, todos, todas las operaciones.
  useEffect(() => { buscar() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const resumen = useMemo(() => {
    const f = filas ?? []
    return {
      total:    f.length,
      entradas: f.filter(x => x.operacion === 'ENTRADA').length,
      salidas:  f.filter(x => x.operacion === 'SALIDA').length,
      dias:     new Set(f.map(x => x.fecha)).size,
      personas: new Set(f.map(x => x.empleado_id)).size,
    }
  }, [filas])

  // ── Corrección ────────────────────────────────────────────────────────────
  // Se escribe siempre en rh_checadas (tabla base); prp_checadas es solo lectura.
  // Un trigger de la base vuelve a consolidar el día en rh_asistencia, así que
  // corregir una hora aquí arregla también el retardo y las horas trabajadas.

  const abrirEdicion = (m) => {
    setEditando(m.id)
    setEdicion({ hora: (m.hora || '').slice(0, 5), operacion: m.operacion })
  }

  const guardarEdicion = async (m) => {
    if (!/^\d{2}:\d{2}$/.test(edicion.hora)) return toast.error('Hora inválida')
    const { error } = await supabase.from('rh_checadas')
      .update({ fecha_hora: `${m.fecha} ${edicion.hora}:00`, operacion: edicion.operacion })
      .eq('id', m.id)
    if (error) return toast.error(error.message)
    setEditando(null)
    toast.success('Marcaje corregido')
    buscar()
  }

  const eliminar = async (m) => {
    if (!confirm(`¿Eliminar el marcaje de ${m.operacion.toLowerCase()} de las ${(m.hora || '').slice(0, 5)}?`)) return
    const { error } = await supabase.from('rh_checadas').delete().eq('id', m.id)
    if (error) return toast.error(error.message)
    setEditando(null)
    toast.success('Marcaje eliminado')
    buscar()
  }

  // Para deshacer una importación equivocada: borra todo lo que se está viendo.
  const eliminarFiltrados = async () => {
    const ids = (filas ?? []).map(f => f.id)
    if (!ids.length) return
    if (!confirm(
      `Se van a eliminar ${ids.length} marcajes: los del periodo ${rango.desde} al ${rango.hasta}` +
      `${empleadoId ? ' de ese trabajador' : ' de todos los trabajadores'}` +
      `${operacion !== 'TODAS' ? ` (solo ${operacion.toLowerCase()}s)` : ''}.\n\nEsta acción no se puede deshacer.`
    )) return
    const { error } = await supabase.from('rh_checadas').delete().in('id', ids)
    if (error) return toast.error(error.message)
    toast.success(`${ids.length} marcajes eliminados`)
    buscar()
  }

  const guardarNuevo = async () => {
    if (!nuevo.empleado_id) return toast.error('Elige el trabajador')
    if (!nuevo.fecha || !/^\d{2}:\d{2}$/.test(nuevo.hora)) return toast.error('Indica fecha y hora')
    const { error } = await supabase.from('rh_checadas').insert({
      empleado_id: nuevo.empleado_id,
      operacion: nuevo.operacion,
      fecha_hora: `${nuevo.fecha} ${nuevo.hora}:00`,
      origen: 'MANUAL',
    })
    if (error) {
      // El índice único impide meter dos veces el mismo marcaje.
      return toast.error(error.code === '23505' ? 'Ese marcaje ya está registrado' : error.message)
    }
    setNuevo(null)
    toast.success('Marcaje registrado')
    buscar()
  }

  const exportarCSV = () => {
    const f = filas ?? []
    if (!f.length) return toast.error('No hay registros que exportar')
    const cab = ['Fecha', 'Día', 'Hora', 'Operación', 'No. empleado', 'Empleado', 'Origen']
    const cuerpo = f.map(r => [
      r.fecha, DIAS[new Date(r.fecha + 'T12:00:00').getDay()], (r.hora || '').slice(0, 5),
      r.operacion, r.numero_empleado ?? '', r.nombre_completo ?? '', r.origen ?? '',
    ])
    const csv = [cab, ...cuerpo].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `marcajes_${rango.desde}_a_${rango.hasta}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Se agrupa por empleado y día para que se lea como una jornada, no como una
  // lista plana de horas sueltas.
  const porDia = useMemo(() => {
    const m = {}
    for (const r of filas ?? []) {
      const k = `${r.empleado_id}_${r.fecha}`
      if (!m[k]) m[k] = { fecha: r.fecha, nombre: r.nombre_completo, numero: r.numero_empleado, marcas: [] }
      m[k].marcas.push(r)
    }
    return Object.values(m).sort((a, b) =>
      (a.fecha + (a.nombre || '')).localeCompare(b.fecha + (b.nombre || '')))
  }, [filas])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ position: 'relative', background: 'white', borderRadius: 14, width: 880, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={17} color="var(--color-primary)" /> Consulta de marcajes
            </h3>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              Entradas y salidas del biométrico · corregibles a mano
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setNuevo({ empleado_id: empleadoId || '', fecha: rango.desde, hora: '08:00', operacion: 'ENTRADA' })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: '1.5px solid var(--color-primary)', borderRadius: 8, background: 'white', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
              <Plus size={13} /> Marcaje
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
          </div>
        </div>

        {/* ── Filtros ────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #F3F4F6', background: '#FAFBFC' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['SEMANA', 'Por semana'], ['RANGO', 'Por rango de fechas']].map(([v, t]) => (
              <button key={v} onClick={() => setModo(v)}
                style={{
                  padding: '6px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: '1.5px solid', borderColor: modo === v ? 'var(--color-primary)' : '#E5E7EB',
                  background: modo === v ? 'var(--color-primary)' : 'white',
                  color: modo === v ? 'white' : '#6B7280',
                }}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: modo === 'SEMANA' ? '1.2fr 1.4fr 1fr auto' : '1fr 1fr 1.4fr 1fr auto', gap: 10, alignItems: 'end' }}>
            {modo === 'SEMANA' ? (
              <div>
                <label style={lbl}>Semana (lunes)</label>
                <input type="date" value={lunes}
                  onChange={e => setLunes(e.target.value ? lunesDe(e.target.value) : e.target.value)}
                  style={{ ...inp, width: '100%' }} />
                <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 3 }}>
                  <Calendar size={9} style={{ display: 'inline', marginRight: 3 }} />
                  {rango.desde} al {rango.hasta}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label style={lbl}>Desde</label>
                  <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...inp, width: '100%' }} />
                </div>
                <div>
                  <label style={lbl}>Hasta</label>
                  <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...inp, width: '100%' }} />
                </div>
              </>
            )}

            <div>
              <label style={lbl}>Trabajador</label>
              <select value={empleadoId} onChange={e => setEmpleadoId(e.target.value)} style={{ ...inp, width: '100%' }}>
                <option value="">Todos</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={lbl}>Registros</label>
              <select value={operacion} onChange={e => setOperacion(e.target.value)} style={{ ...inp, width: '100%' }}>
                <option value="TODAS">Todos</option>
                <option value="ENTRADA">Solo entradas</option>
                <option value="SALIDA">Solo salidas</option>
              </select>
            </div>

            <button onClick={buscar} disabled={cargando}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', border: 'none', borderRadius: 8, background: 'var(--color-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: cargando ? .7 : 1 }}>
              <Search size={14} /> {cargando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* ── Resumen ───────────────────────────────────────────────────── */}
        {filas !== null && (
          <div style={{ padding: '12px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              [resumen.total, 'marcajes', '#0A66C2'],
              [resumen.entradas, 'entradas', '#057642'],
              [resumen.salidas, 'salidas', '#B24020'],
              [resumen.dias, 'días', '#6B7280'],
              [resumen.personas, 'personas', '#6B7280'],
            ].map(([v, t, c]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                <span style={{ fontSize: 11.5, color: '#9CA3AF' }}>{t}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {resumen.total > 0 && (
                <button onClick={eliminarFiltrados} title="Borrar todos los marcajes que se están viendo — para deshacer una importación equivocada"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: '1.5px solid #FECACA', borderRadius: 8, background: 'white', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  <Trash2 size={13} /> Eliminar los {resumen.total}
                </button>
              )}
              <button onClick={exportarCSV} disabled={!resumen.total}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: resumen.total ? 'pointer' : 'default', fontSize: 12, fontWeight: 600, opacity: resumen.total ? 1 : .5 }}>
                <Download size={13} /> CSV
              </button>
            </div>
          </div>
        )}

        {/* ── Resultados ────────────────────────────────────────────────── */}
        <div style={{ overflow: 'auto', flex: 1, padding: '0 22px 18px' }}>
          {filas === null ? null : filas.length === 0 ? (
            <div style={{ padding: '46px 0', textAlign: 'center', color: '#9CA3AF' }}>
              <Clock size={30} style={{ opacity: .35, marginBottom: 10 }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#6B7280' }}>Sin marcajes en ese periodo</p>
              <p style={{ margin: '6px 0 0', fontSize: 12 }}>
                Revisa el rango, o importa el archivo del checador desde el botón «Importar Checador»
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', boxShadow: '0 1px 0 #E5E7EB' }}>
                <tr>
                  {['Fecha', 'Día', 'Trabajador', 'Marcajes del día'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.03em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porDia.map((d, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '9px 8px', fontFamily: 'monospace', color: '#374151', whiteSpace: 'nowrap' }}>{d.fecha}</td>
                    <td style={{ padding: '9px 8px', color: '#9CA3AF', fontSize: 11.5 }}>
                      {DIAS[new Date(d.fecha + 'T12:00:00').getDay()]}
                    </td>
                    <td style={{ padding: '9px 8px', fontWeight: 600 }}>
                      {d.nombre}
                      {d.numero && <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11 }}> · {d.numero}</span>}
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {d.marcas.map(m => {
                          const esEnt = m.operacion === 'ENTRADA'
                          const Icono = esEnt ? LogIn : LogOut

                          if (editando === m.id) return (
                            <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 4px', borderRadius: 8, border: '1.5px solid var(--color-primary)', background: '#F8FAFF' }}>
                              <button onClick={() => setEdicion(e => ({ ...e, operacion: e.operacion === 'ENTRADA' ? 'SALIDA' : 'ENTRADA' }))}
                                title="Cambiar entre entrada y salida"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: edicion.operacion === 'ENTRADA' ? '#dcfce7' : '#fee2e2', color: edicion.operacion === 'ENTRADA' ? '#166534' : '#991b1b' }}>
                                {edicion.operacion === 'ENTRADA' ? <LogIn size={10} /> : <LogOut size={10} />}
                                {edicion.operacion === 'ENTRADA' ? 'Entrada' : 'Salida'}
                              </button>
                              <input type="time" value={edicion.hora} onChange={e => setEdicion(x => ({ ...x, hora: e.target.value }))}
                                style={{ border: '1px solid #E5E7EB', borderRadius: 5, padding: '2px 4px', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }} />
                              <button onClick={() => guardarEdicion(m)} title="Guardar"
                                style={{ border: 'none', background: 'var(--color-success)', color: 'white', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', display: 'inline-flex' }}><Check size={11} /></button>
                              <button onClick={() => eliminar(m)} title="Eliminar este marcaje"
                                style={{ border: 'none', background: 'var(--color-danger)', color: 'white', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', display: 'inline-flex' }}><Trash2 size={11} /></button>
                              <button onClick={() => setEditando(null)} title="Cancelar"
                                style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'inline-flex' }}><X size={12} /></button>
                            </span>
                          )

                          return (
                            <button key={m.id} onClick={() => abrirEdicion(m)}
                              title={`${m.origen} · clic para corregir o eliminar`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', border: 'none', cursor: 'pointer', background: esEnt ? '#dcfce7' : '#fee2e2', color: esEnt ? '#166534' : '#991b1b' }}>
                              <Icono size={10} /> {(m.hora || '').slice(0, 5)}
                              <Pencil size={9} style={{ opacity: .45 }} />
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Alta manual ───────────────────────────────────────────────── */}
        {/* Para cuando alguien olvidó checar: el día se recalcula solo al
            guardar, igual que si el marcaje hubiera venido del aparato. */}
        {nuevo && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setNuevo(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 12, padding: 20, width: 420, maxWidth: '92%', boxShadow: '0 10px 40px rgba(0,0,0,.25)' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: 14.5, fontWeight: 700 }}>Registrar marcaje a mano</h4>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={lbl}>Trabajador</label>
                  <select value={nuevo.empleado_id} onChange={e => setNuevo(n => ({ ...n, empleado_id: e.target.value }))}
                    style={{ ...inp, width: '100%' }}>
                    <option value="">— Seleccionar —</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre_completo}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Fecha</label>
                    <input type="date" value={nuevo.fecha} onChange={e => setNuevo(n => ({ ...n, fecha: e.target.value }))}
                      style={{ ...inp, width: '100%' }} />
                  </div>
                  <div>
                    <label style={lbl}>Hora</label>
                    <input type="time" value={nuevo.hora} onChange={e => setNuevo(n => ({ ...n, hora: e.target.value }))}
                      style={{ ...inp, width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>Operación</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['ENTRADA', 'SALIDA'].map(op => (
                      <button key={op} onClick={() => setNuevo(n => ({ ...n, operacion: op }))}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                          border: '1.5px solid', borderColor: nuevo.operacion === op ? 'var(--color-primary)' : '#E5E7EB',
                          background: nuevo.operacion === op ? 'var(--color-primary)' : 'white',
                          color: nuevo.operacion === op ? 'white' : '#6B7280',
                        }}>
                        {op === 'ENTRADA' ? 'Entrada' : 'Salida'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button onClick={() => setNuevo(null)}
                  style={{ flex: 1, padding: 9, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={guardarNuevo}
                  style={{ flex: 2, padding: 9, border: 'none', borderRadius: 8, background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  Registrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
