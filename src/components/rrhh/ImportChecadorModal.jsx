import { useState, useRef, useMemo } from 'react'
import { X, RefreshCw, Upload, AlertCircle, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ConsultaChecadas from '../ui/ConsultaChecadas'
import { parsearChecador } from '../../lib/checador'

// ── Import asistencia de checador ──────────────────────────────────────────
function ImportChecadorModal({ empleados, onClose, onImported }) {
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState([])
  const [importando, setImportando] = useState(false)
  const fileRef = useRef()

  // La lectura del archivo vive en src/lib/checador.js (la comparte el Agente Operativo).
  // Cada renglón del checador es un MARCAJE, no un día: se guardan todos en rh_checadas
  // y el día lo arma la base.
  const parsear = (texto) => parsearChecador(texto).map(ev => {
    const primerNombre = (ev.nombre || '').toLowerCase().split(' ')[0]
    const emp = empleados.find(e => e.numero_empleado === ev.numero
      || (primerNombre && (e.nombre_completo || '').toLowerCase().includes(primerNombre)))
    return {
      empleado_id: emp?.id || null,
      numero_empleado_ext: ev.numero,
      operacion: ev.operacion,
      fecha_hora: `${ev.fecha} ${ev.hora}:00`,
      origen: 'ZKTeco_CSV',
      _fecha: ev.fecha,
      _hora: ev.hora,
      _nombre: ev.nombre,
      _nombre_match: emp?.nombre_completo,
    }
  })

  // Vista previa por día: lo que verá el usuario, aunque se guarde por marcaje.
  const resumirDias = (evs) => {
    const porDia = {}
    evs.forEach(e => {
      const k = `${e.numero_empleado_ext}_${e._fecha}`
      if (!porDia[k]) porDia[k] = { ...e, entradas: [], salidas: [] }
      ;(e.operacion === 'ENTRADA' ? porDia[k].entradas : porDia[k].salidas).push(e._hora)
    })
    return Object.values(porDia).map(r => {
      const entrada = [...r.entradas].sort()[0] || null
      const salida  = [...r.salidas].sort().slice(-1)[0] || null
      const min = (entrada && salida)
        ? (() => { const [h1,m1] = entrada.split(':').map(Number), [h2,m2] = salida.split(':').map(Number)
                   return (h2*60+m2) - (h1*60+m1) })()
        : null
      return { ...r, entrada, salida, minutos: min, marcajes: r.entradas.length + r.salidas.length }
    }).sort((a, b) => (a._fecha + a.numero_empleado_ext).localeCompare(b._fecha + b.numero_empleado_ext))
  }

  const onFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result
      setCsv(text)
      setPreview(parsear(text))
    }
    reader.readAsText(file, 'utf-8')
  }

  const onTextChange = (e) => {
    setCsv(e.target.value)
    setPreview(parsear(e.target.value))
  }

  // Corrección antes de guardar. Dos cosas fallan seguido en un archivo de
  // checador: renglones que no se quieren (otra quincena, un visitante) y
  // gente que el aparato identifica con un número que no está en el catálogo.
  const [excluidos, setExcluidos] = useState({})   // clave empleado+fecha -> true
  const [asignados, setAsignados] = useState({})   // numero del checador -> empleado_id

  const claveDia = r => `${r.numero_empleado_ext}_${r._fecha}`

  // Se aplica lo asignado a mano antes de agrupar, para que el resumen del día
  // ya muestre el nombre corregido.
  const conAsignacion = useMemo(() => preview.map(e => ({
    ...e,
    empleado_id: asignados[e.numero_empleado_ext] ?? e.empleado_id,
    _nombre_match: asignados[e.numero_empleado_ext]
      ? empleados.find(x => x.id === asignados[e.numero_empleado_ext])?.nombre_completo
      : e._nombre_match,
  })), [preview, asignados, empleados])

  const dias = useMemo(() => resumirDias(conAsignacion), [conAsignacion])
  const diasIncluidos = dias.filter(d => !excluidos[claveDia(d)])
  const aImportar = conAsignacion.filter(e => !excluidos[`${e.numero_empleado_ext}_${e._fecha}`])
  const sinEmpleado = aImportar.filter(e => !e.empleado_id).length

  const importar = async () => {
    if (!aImportar.length) return toast.error('No queda ningún marcaje por importar')
    setImportando(true)
    // Se descartan los campos auxiliares del preview (los que empiezan con _).
    const rows = aImportar.map(e => ({
      empleado_id: e.empleado_id, numero_empleado_ext: e.numero_empleado_ext,
      operacion: e.operacion, fecha_hora: e.fecha_hora, origen: e.origen,
    }))
    // ignoreDuplicates: volver a cargar el mismo archivo no duplica marcajes.
    const { error } = await supabase.from('rh_checadas')
      .upsert(rows, { onConflict: 'empleado_id,fecha_hora,operacion', ignoreDuplicates: true })
    setImportando(false)
    if (error) return toast.error(error.message)
    toast.success(`${rows.length} marcajes importados · ${diasIncluidos.length} días`)
    onImported()
    onClose()
  }

  // Reimportar un archivo corregido del checador no sirve de nada si los
  // marcajes viejos (mal leídos, duplicados por un archivo repetido) se
  // quedan mezclados con los nuevos. Esto limpia los últimos 7 días para
  // volver a cargar limpio.
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const desdeUltimaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const eliminarUltimaSemana = async () => {
    setBorrando(true)
    const { error, count } = await supabase.from('rh_checadas')
      .delete({ count: 'exact' }).gte('fecha_hora', desdeUltimaSemana)
    setBorrando(false)
    setConfirmarBorrado(false)
    if (error) return toast.error(error.message)
    toast.success(`${count ?? 0} marcaje(s) eliminados desde el ${desdeUltimaSemana}`)
    onImported()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 720, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Importar desde Checador</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-light)' }}>Compatible con ZKTeco, BioTime, y formato genérico CSV/TXT</p>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer' }}><X size={18} /></button>
        </div>

        {/* Formato esperado */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
          <strong>Formatos aceptados:</strong><br />
          <code style={{ fontSize:11, display:'block', marginTop:4, color:'#374151' }}>
            No.,Nombre,Fecha,Hora,Status — (Status: 0=Entrada, 1=Salida)<br />
            EmpCode,Nombre,Fecha,HoraEntrada,HoraSalida — (formato de 2 columnas horario)<br />
            ID Nombre Depto AAAA-MM-DD HH:MM:SS IDdispositivo — (reloj, sin comas; entrada/salida se infiere por orden)
          </code>
        </div>

        {/* Limpiar antes de reimportar un archivo corregido */}
        <div style={{ marginBottom: 14 }}>
          {!confirmarBorrado ? (
            <button onClick={() => setConfirmarBorrado(true)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:'1px solid #FECACA',borderRadius:8,fontSize:12,fontWeight:600,color:'#B91C1C',background:'#FFF5F5',cursor:'pointer' }}>
              <Trash2 size={13} /> Eliminar marcajes de la última semana
            </button>
          ) : (
            <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8 }}>
              <AlertCircle size={15} color="#B91C1C" style={{ flexShrink:0 }} />
              <span style={{ fontSize:12, color:'#991B1B', flex:1 }}>
                Borra todos los marcajes desde el {desdeUltimaSemana}, de cualquier empleado. No se puede deshacer.
              </span>
              <button onClick={() => setConfirmarBorrado(false)} disabled={borrando}
                style={{ padding:'6px 12px',background:'white',border:'1px solid #FECACA',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',color:'#6B7280' }}>
                Cancelar
              </button>
              <button onClick={eliminarUltimaSemana} disabled={borrando}
                style={{ padding:'6px 12px',background:'#B91C1C',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',color:'white',opacity:borrando?0.7:1 }}>
                {borrando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button onClick={() => fileRef.current.click()} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'1.5px solid #7B5EA7',borderRadius:8,fontSize:13,fontWeight:600,color:'#7B5EA7',background:'white',cursor:'pointer' }}>
            <Upload size={14} /> Abrir archivo
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.dat" style={{ display:'none' }} onChange={onFileChange} />
          <span style={{ fontSize:12,color:'#9CA3AF',alignSelf:'center' }}>o pega el contenido aquí:</span>
        </div>

        <textarea value={csv} onChange={onTextChange} rows={6} placeholder="Pega el contenido del reporte del checador..."
          style={{ width:'100%',padding:'10px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:12,fontFamily:'monospace',boxSizing:'border-box',marginBottom:14,resize:'vertical' }} />

        {preview.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>
              Vista previa — {aImportar.length} marcajes en {diasIncluidos.length} días
              {aImportar.length !== preview.length && (
                <span style={{ fontWeight: 500, color: '#9CA3AF' }}> · {preview.length - aImportar.length} excluidos</span>
              )}
            </h4>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9CA3AF' }}>
              Quita el día que no quieras importar, o asigna el trabajador cuando el checador
              use un número que no está en el catálogo.
            </p>
            {sinEmpleado > 0 && (
              <div style={{ marginBottom: 10, padding: '8px 11px', borderRadius: 7, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 11.5, color: '#92400E' }}>
                {sinEmpleado} marcaje{sinEmpleado === 1 ? '' : 's'} sin trabajador asignado. Se guardan igual —
                para no perderlos— pero no cuentan en la asistencia hasta que se les asigne alguien.
              </div>
            )}
            <div style={{ overflowX: 'auto', maxHeight: 260, border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                <thead style={{ background:'#F9FAFB',position:'sticky',top:0 }}>
                  <tr>{['# Ext','Empleado','Fecha','Entrada','Salida','Horas','Marcajes',''].map((h,i) => <th key={i} style={{ padding:'8px 10px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--color-text-light)',whiteSpace:'nowrap' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {dias.map((r, i) => {
                    const fuera = excluidos[claveDia(r)]
                    return (
                    <tr key={i} style={{ borderTop:'1px solid #F3F4F6', opacity: fuera ? .4 : 1, textDecoration: fuera ? 'line-through' : 'none' }}>
                      <td style={{ padding:'7px 10px',fontFamily:'monospace',color:'#7B5EA7' }}>{r.numero_empleado_ext}</td>
                      <td style={{ padding:'5px 10px' }}>
                        {r._nombre_match || (
                          <select value={asignados[r.numero_empleado_ext] ?? ''}
                            onChange={e => setAsignados(a => ({ ...a, [r.numero_empleado_ext]: e.target.value || undefined }))}
                            title={`El checador reportó "${r._nombre}"`}
                            style={{ padding:'4px 6px',border:'1.5px solid #FCA5A5',borderRadius:6,fontSize:11,maxWidth:190,background:'white' }}>
                            <option value="">Sin asignar: {r._nombre || r.numero_empleado_ext}</option>
                            {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre_completo}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{ padding:'7px 10px',fontFamily:'monospace' }}>{r._fecha}</td>
                      <td style={{ padding:'7px 10px',fontFamily:'monospace' }}>{r.entrada || '—'}</td>
                      <td style={{ padding:'7px 10px',fontFamily:'monospace' }}>{r.salida || '—'}</td>
                      <td style={{ padding:'7px 10px' }}>{r.minutos ? (r.minutos/60).toFixed(1)+'h' : '—'}</td>
                      <td style={{ padding:'7px 10px',textAlign:'center',fontWeight:700,color:'#6B7280' }}>{r.marcajes}</td>
                      <td style={{ padding:'5px 8px',textAlign:'center' }}>
                        <button onClick={() => setExcluidos(x => ({ ...x, [claveDia(r)]: !fuera }))}
                          title={fuera ? 'Volver a incluir este día' : 'No importar este día'}
                          style={{ border:'none',background:'none',cursor:'pointer',color: fuera ? '#059669' : '#9CA3AF',display:'inline-flex',padding:2 }}>
                          {fuera ? <RefreshCw size={13} /> : <X size={14} />}
                        </button>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ margin:'8px 0 0',fontSize:11,color:'#9CA3AF' }}>
              Se guardan los {preview.length} marcajes individuales; el estado del día (presente, retardo, falta) lo calcula la base.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600 }}>Cancelar</button>
          <button onClick={importar} disabled={!aImportar.length || importando}
            style={{ flex:2,padding:10,border:'none',borderRadius:8,background: aImportar.length?'#7B5EA7':'#9CA3AF',color:'white',cursor:'pointer',fontWeight:700 }}>
            {importando ? 'Importando…' : `Importar ${aImportar.length} marcajes`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportChecadorModal