import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { Users, Search, Plus, AlertTriangle, CheckCircle, Clock, TrendingUp, UserCheck, Download, X } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

function SemaforoContrato({ valor, fechaFin }) {
  const COLORES = { VENCIDO: 'var(--color-danger)', CRITICO: 'var(--color-danger)', ALERTA: 'var(--color-warning)', OK: 'var(--color-success)', INDETERMINADO: 'var(--color-text-light)' }
  const color = COLORES[valor] ?? 'var(--color-text-light)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '11px', color, fontWeight: 600 }}>
        {valor === 'INDETERMINADO' ? 'Indefinido' : fechaFin ?? valor}
      </span>
    </div>
  )
}

function Avatar({ nombre }) {
  const initials = (nombre || 'NN').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = ['#0A66C2', '#057642', '#E8A020', '#B24020', '#6B21A8', '#0F766E']
  const idx = nombre ? nombre.charCodeAt(0) % colors.length : 0
  return (
    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors[idx] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: colors[idx], flexShrink: 0 }}>
      {initials}
    </div>
  )
}

const TABS = ['Empleados', 'Asistencia', 'Reclutamiento']

function TabEmpleados() {
  const [search, setSearch] = useState('')
  const [filtroArea, setFiltroArea] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const { data, loading } = usePRP('prp_empleados', { order: { col: 'nombre_completo' } })

  const lista = data ?? []
  const areas = ['Todos', ...new Set(lista.map(e => e.area).filter(Boolean))]

  const filtrados = lista.filter(e => {
    const q = search.toLowerCase()
    const match = !q || (e.nombre_completo || '').toLowerCase().includes(q) || (e.numero_empleado || '').toLowerCase().includes(q) || (e.puesto || '').toLowerCase().includes(q)
    const area = filtroArea === 'Todos' || e.area === filtroArea
    return match && area && e.estado_id === 'ACTIVO'
  })

  const activos = lista.filter(e => e.estado_id === 'ACTIVO').length
  const nomina = lista.filter(e => e.estado_id === 'ACTIVO').reduce((a, b) => a + (parseFloat(b.salario_mensual) || 0), 0)
  const alertasContrato = lista.filter(e => ['VENCIDO','CRITICO','ALERTA'].includes(e.semaforo_contrato)).length
  const indeterminados = lista.filter(e => e.semaforo_contrato === 'INDETERMINADO').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Activos" value={activos} icon={Users} color="var(--color-primary)" />
        <KPICard title="Nómina Mensual" value={`$${(nomina/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-success)" />
        <KPICard title="Alertas Contrato" value={alertasContrato} icon={AlertTriangle} color="var(--color-warning)" />
        <KPICard title="Tiempo Indefinido" value={indeterminados} icon={UserCheck} color="var(--color-primary-dark)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, # empleado o puesto..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {areas.slice(0, 6).map(a => (
            <button key={a} onClick={() => setFiltroArea(a)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroArea === a ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroArea === a ? 'var(--color-primary)' : 'white',
              color: filtroArea === a ? 'white' : 'var(--color-text-light)',
            }}>{a}</button>
          ))}
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: '6px', background: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-light)' }}>
          <Download size={13} /> Excel
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
      ) : (
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <EmptyState title="Sin empleados" description="No hay empleados que coincidan con la búsqueda." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Empleado', '# Emp', 'Puesto / Área', 'Salario Mensual', 'Tipo Contrato', 'Vencimiento', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                      onClick={() => setSelected(e)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar nombre={e.nombre_completo} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{e.nombre_completo}</div>
                            {e.nss && <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>NSS: {e.nss}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>{e.numero_empleado}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{e.puesto}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{e.area ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>${(parseFloat(e.salario_mensual) || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>${(parseFloat(e.salario_diario) || 0).toFixed(2)}/día</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '12px', padding: '3px 8px', background: '#F3F4F6', borderRadius: '12px' }}>{e.tipo_contrato_nombre ?? e.tipo_contrato_id ?? '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <SemaforoContrato valor={e.semaforo_contrato} fechaFin={e.contrato_fin} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={e.estado_id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setSelected(null)}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Avatar nombre={selected.nombre_completo} />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{selected.nombre_completo}</h2>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{selected.puesto} · {selected.numero_empleado}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gap: '10px' }}>
              {[
                ['RFC', selected.rfc], ['CURP', selected.curp], ['NSS', selected.nss],
                ['Área', selected.area], ['Departamento', selected.departamento],
                ['Fecha ingreso', selected.fecha_ingreso],
                ['Salario mensual', `$${(parseFloat(selected.salario_mensual)||0).toLocaleString()}`],
                ['Salario diario', `$${(parseFloat(selected.salario_diario)||0).toFixed(2)}`],
                ['Email', selected.email], ['Celular', selected.celular],
                ['Tipo contrato', selected.tipo_contrato_nombre ?? selected.tipo_contrato_id],
                ['Vencimiento contrato', selected.contrato_fin ?? 'Tiempo indeterminado'],
              ].filter(([,v]) => v).map(([label, val]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '13px', fontFamily: ['RFC','CURP','NSS'].includes(label) ? 'monospace' : 'inherit' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', flexWrap: 'wrap' }}>
                {['Historial Salarial', 'Asistencias', 'Documentos', 'Incidencias', 'Renovar Contrato'].map(a => (
                  <button key={a} style={{ padding: '7px 12px', background: '#F3F4F6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-light)' }}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabAsistencia() {
  const hoy = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]
  })
  const { data, loading } = usePRP('prp_asistencia', {
    filters: [['fecha', 'eq', fecha]],
    order: { col: 'nombre_completo' },
  })

  const lista = data ?? []
  const presentes = lista.filter(a => a.estado === 'PRESENTE').length
  const retardos = lista.filter(a => a.estado === 'RETARDO').length
  const faltas = lista.filter(a => a.estado === 'FALTA').length

  const COLOR_ESTADO = { PRESENTE: 'var(--color-success)', RETARDO: 'var(--color-warning)', FALTA: 'var(--color-danger)', VACACIONES: 'var(--color-primary)', INCAPACIDAD: '#6B7280' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600 }}>Fecha:</label>
        <input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <KPICard title="Presentes" value={presentes} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Retardos" value={retardos} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Faltas" value={faltas} icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
      ) : lista.length === 0 ? (
        <EmptyState title="Sin registros" description={`No hay registros de asistencia para ${fecha}.`} />
      ) : (
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Empleado', '# Emp', 'Puesto', 'Entrada', 'Salida', 'Horas', 'Retardo', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{a.nombre_completo}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-primary)' }}>{a.numero_empleado}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-light)' }}>{a.puesto}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{a.hora_entrada ? String(a.hora_entrada).slice(0,5) : '—'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{a.hora_salida ? String(a.hora_salida).slice(0,5) : '—'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.horas_trabajadas ? parseFloat(a.horas_trabajadas).toFixed(1) + 'h' : '—'}</td>
                  <td style={{ padding: '12px 16px', color: a.minutos_retardo > 0 ? 'var(--color-warning)' : 'var(--color-text-light)', fontWeight: a.minutos_retardo > 0 ? 700 : 400 }}>
                    {a.minutos_retardo > 0 ? `+${a.minutos_retardo} min` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: (COLOR_ESTADO[a.estado] ?? '#999') + '22', color: COLOR_ESTADO[a.estado] ?? '#999' }}>
                      {a.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TabReclutamiento() {
  const { data: vacantes, loading: vLoad } = usePRP('prp_vacantes', { order: { col: 'fecha_apertura', asc: false } })
  const { data: candidatos, loading: cLoad } = usePRP('prp_candidatos', { order: { col: 'created_at', asc: false } })

  const lista_v = vacantes ?? []
  const lista_c = candidatos ?? []

  if (vLoad || cLoad) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Vacantes Abiertas</h3>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Vacante
          </button>
        </div>
        {lista_v.length === 0 ? (
          <EmptyState title="Sin vacantes" description="No hay vacantes abiertas." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lista_v.map(v => (
              <div key={v.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{v.titulo}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '8px' }}>{v.area} · {v.num_plazas} plaza{v.num_plazas > 1 ? 's' : ''}</div>
                {(v.salario_min || v.salario_max) && (
                  <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
                    ${((v.salario_min||0)/1000).toFixed(0)}K – ${((v.salario_max||0)/1000).toFixed(0)}K/mes
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Candidatos Recientes</h3>
        </div>
        {lista_c.length === 0 ? (
          <EmptyState title="Sin candidatos" description="No hay candidatos registrados." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lista_c.slice(0, 8).map(c => (
              <div key={c.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Avatar nombre={c.nombre} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.vacante_puesto ?? 'Candidato general'}</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#F3F4F6', color: 'var(--color-text-light)', flexShrink: 0 }}>
                  {c.etapa ?? 'NUEVO'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NuevoEmpleadoModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: '', apellido_pat: '', apellido_mat: '',
    sexo: 'M', rfc: '', curp: '', nss: '',
    fecha_nacimiento: '', fecha_ingreso: new Date().toISOString().split('T')[0],
    puesto: '', area: '', departamento: '',
    salario_diario: '', email: '', celular: '',
    tipo_contrato: 'INDEFINIDO', fecha_fin_contrato: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.apellido_pat || !form.salario_diario) {
      setError('Nombre, apellido paterno y salario diario son obligatorios.')
      return
    }
    setSaving(true); setError(null)
    try {
      const { data: res, error: err } = await supabase.rpc('crear_empleado', {
        p_nombre: form.nombre,
        p_apellido_pat: form.apellido_pat,
        p_apellido_mat: form.apellido_mat || '',
        p_sexo: form.sexo,
        p_rfc: form.rfc || null,
        p_curp: form.curp || null,
        p_nss: form.nss || null,
        p_fecha_nacimiento: form.fecha_nacimiento || null,
        p_fecha_ingreso: form.fecha_ingreso,
        p_puesto: form.puesto || null,
        p_area: form.area || null,
        p_departamento: form.departamento || null,
        p_salario_diario: parseFloat(form.salario_diario),
        p_email: form.email || null,
        p_celular: form.celular || null,
        p_tipo_contrato: form.tipo_contrato,
        p_fecha_fin_contrato: form.fecha_fin_contrato || null,
      })
      if (err) throw err
      setSuccess(`Empleado ${res.numero_empleado} registrado exitosamente.`)
      setTimeout(() => { onCreated?.(); onClose() }, 1800)
    } catch (err) {
      setError(err.message || 'Error al registrar el empleado.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }
  const sectionStyle = { fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 0', borderBottom: '1px solid #E5E7EB', marginBottom: '4px', gridColumn: '1 / -1' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>Nuevo Empleado</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-light)' }}>Número de empleado generado automáticamente</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={20} /></button>
        </div>

        {success ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success)' }}>{success}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {error && <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

            <div style={sectionStyle}>Datos Personales</div>
            <div>
              <label style={labelStyle}>Nombre(s) *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inputStyle} placeholder="María" required />
            </div>
            <div>
              <label style={labelStyle}>Apellido Paterno *</label>
              <input value={form.apellido_pat} onChange={e => set('apellido_pat', e.target.value)} style={inputStyle} placeholder="García" required />
            </div>
            <div>
              <label style={labelStyle}>Apellido Materno</label>
              <input value={form.apellido_mat} onChange={e => set('apellido_mat', e.target.value)} style={inputStyle} placeholder="López" />
            </div>
            <div>
              <label style={labelStyle}>Sexo</label>
              <select value={form.sexo} onChange={e => set('sexo', e.target.value)} style={inputStyle}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fecha de Nacimiento</label>
              <input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="nombre@empresa.mx" />
            </div>

            <div style={sectionStyle}>Identificaciones IMSS / SAT</div>
            <div>
              <label style={labelStyle}>RFC</label>
              <input value={form.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="GARL900101XXX" maxLength={13} />
            </div>
            <div>
              <label style={labelStyle}>CURP</label>
              <input value={form.curp} onChange={e => set('curp', e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="GARL900101HSLRXXX01" maxLength={18} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>NSS (Número de Seguridad Social)</label>
              <input value={form.nss} onChange={e => set('nss', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace', maxWidth: '280px' }} placeholder="12345678901" maxLength={11} />
            </div>

            <div style={sectionStyle}>Puesto y Área</div>
            <div>
              <label style={labelStyle}>Fecha de Ingreso</label>
              <input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Celular</label>
              <input value={form.celular} onChange={e => set('celular', e.target.value)} style={inputStyle} placeholder="667 123 4567" />
            </div>
            <div>
              <label style={labelStyle}>Puesto</label>
              <input value={form.puesto} onChange={e => set('puesto', e.target.value)} style={inputStyle} placeholder="Gerente de Operaciones" />
            </div>
            <div>
              <label style={labelStyle}>Área</label>
              <input value={form.area} onChange={e => set('area', e.target.value)} style={inputStyle} placeholder="Administración" />
            </div>
            <div>
              <label style={labelStyle}>Departamento</label>
              <input value={form.departamento} onChange={e => set('departamento', e.target.value)} style={inputStyle} placeholder="Recursos Humanos" />
            </div>
            <div>
              <label style={labelStyle}>Salario Diario (MXN) *</label>
              <input type="number" value={form.salario_diario} onChange={e => set('salario_diario', e.target.value)} style={inputStyle} placeholder="Ej. 500" min="0" step="0.01" required />
              {form.salario_diario && <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>${(parseFloat(form.salario_diario) * 30).toLocaleString()} /mes estimado</div>}
            </div>

            <div style={sectionStyle}>Tipo de Contrato Laboral</div>
            <div>
              <label style={labelStyle}>Tipo de Contrato</label>
              <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} style={inputStyle}>
                <option value="INDEFINIDO">Tiempo Indefinido</option>
                <option value="DETERMINADO">Tiempo Determinado</option>
                <option value="HONORARIOS">Honorarios / Servicios Profesionales</option>
                <option value="PRACTICAS">Prácticas Profesionales</option>
              </select>
            </div>
            {form.tipo_contrato !== 'INDEFINIDO' && (
              <div>
                <label style={labelStyle}>Fecha Fin de Contrato</label>
                <input type="date" value={form.fecha_fin_contrato} onChange={e => set('fecha_fin_contrato', e.target.value)} style={inputStyle} min={form.fecha_ingreso} />
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Registrando...' : 'Registrar Empleado'}
              </button>
              <button type="button" onClick={onClose} style={{ padding: '11px 20px', background: '#F3F4F6', color: 'var(--color-text)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function RH() {
  useModuleAudit('RH')
  const [tab, setTab] = useState(0)
  const [showNuevoEmpleado, setShowNuevoEmpleado] = useState(false)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Recursos Humanos</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Reclutamiento · Expediente · Asistencia · Nómina</p>
        </div>
        {tab === 0 && (
          <button onClick={() => setShowNuevoEmpleado(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Nuevo Empleado
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#F3F4F6', padding: '4px', borderRadius: '10px', width: 'fit-content', marginBottom: '24px' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 20px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            background: tab === i ? 'white' : 'transparent',
            color: tab === i ? 'var(--color-primary)' : 'var(--color-text-light)',
            boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && <TabEmpleados />}
      {tab === 1 && <TabAsistencia />}
      {tab === 2 && <TabReclutamiento />}

      {showNuevoEmpleado && (
        <NuevoEmpleadoModal
          onClose={() => setShowNuevoEmpleado(false)}
          onCreated={() => {}}
        />
      )}
    </div>
  )
}
