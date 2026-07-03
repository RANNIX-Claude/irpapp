import { useState } from 'react'
import { Users, Plus, Search, DollarSign, Clock, CheckCircle, AlertTriangle, Calendar, TrendingUp } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

const EMPLEADOS = [
  { id: 'EMP-001', nombre: 'Martínez López Carlos', puesto: 'Supervisor de Mantenimiento', depto: 'Mantenimiento', salario: 22000, tipo: 'Nómina', estado: 'ACTIVO', fecha_ingreso: '2021-03-15', dias_vacaciones: 12 },
  { id: 'EMP-002', nombre: 'García Hernández Ana', puesto: 'Administradora de Contratos', depto: 'Administración', salario: 28000, tipo: 'Nómina', estado: 'ACTIVO', fecha_ingreso: '2020-06-01', dias_vacaciones: 15 },
  { id: 'EMP-003', nombre: 'López Torres Roberto', puesto: 'Técnico Eléctrico', depto: 'Mantenimiento', salario: 16500, tipo: 'Nómina', estado: 'ACTIVO', fecha_ingreso: '2022-09-10', dias_vacaciones: 8 },
  { id: 'EMP-004', nombre: 'Ramírez Soto Patricia', puesto: 'Recepcionista', depto: 'Operaciones', salario: 12000, tipo: 'Nómina', estado: 'ACTIVO', fecha_ingreso: '2023-01-16', dias_vacaciones: 6 },
  { id: 'EMP-005', nombre: 'Torres Vega Miguel', puesto: 'Guardia de Seguridad', depto: 'Seguridad', salario: 10500, tipo: 'Nómina', estado: 'INACTIVO', fecha_ingreso: '2021-11-01', dias_vacaciones: 0 },
  { id: 'EMP-006', nombre: 'Sánchez Cruz Diana', puesto: 'Contadora', depto: 'Finanzas', salario: 35000, tipo: 'Honorarios', estado: 'ACTIVO', fecha_ingreso: '2019-04-20', dias_vacaciones: 18 },
]

const NOMINA_QUINCENAS = [
  { periodo: '1-15 Jun 2026', empleados: 5, total_bruto: 89500, deducciones: 18200, total_neto: 71300, estado: 'COMPLETADO' },
  { periodo: '16-30 Jun 2026', empleados: 5, total_bruto: 89500, deducciones: 18200, total_neto: 71300, estado: 'EN_PROCESO' },
  { periodo: '1-15 Jul 2026', empleados: 5, total_bruto: 89500, deducciones: 18200, total_neto: 71300, estado: 'PENDIENTE' },
]

const DEPTOS = ['Todos', 'Mantenimiento', 'Administración', 'Operaciones', 'Seguridad', 'Finanzas']

export default function RH() {
  const [tab, setTab] = useState('empleados')
  const [search, setSearch] = useState('')
  const [depto, setDepto] = useState('Todos')

  const filtrados = EMPLEADOS.filter(e => {
    const q = search.toLowerCase()
    const match = e.nombre.toLowerCase().includes(q) || e.puesto.toLowerCase().includes(q)
    const dep = depto === 'Todos' || e.depto === depto
    return match && dep
  })

  const activos = EMPLEADOS.filter(e => e.estado === 'ACTIVO').length
  const nominaTotal = EMPLEADOS.filter(e => e.estado === 'ACTIVO').reduce((a, b) => a + b.salario, 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>RH y Nómina</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{EMPLEADOS.length} empleados registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Empleado
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Empleados Activos" value={activos} icon={Users} color="var(--color-primary)" />
        <KPICard title="Nómina Mensual" value={`$${(nominaTotal / 1000).toFixed(0)}K`} icon={DollarSign} color="var(--color-success)" />
        <KPICard title="Quincenas 2026" value="12" icon={Calendar} color="var(--color-secondary)" />
        <KPICard title="Incidencias Jun" value="3" icon={AlertTriangle} color="var(--color-warning)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #E5E7EB', paddingBottom: '0' }}>
        {[['empleados', 'Empleados'], ['nomina', 'Nómina Quincenal'], ['vacaciones', 'Vacaciones e Incidencias']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 600,
            color: tab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
            borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'empleados' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado o puesto..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DEPTOS.map(d => (
                <button key={d} onClick={() => setDepto(d)} style={{
                  padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  borderColor: depto === d ? 'var(--color-primary)' : '#E5E7EB',
                  background: depto === d ? 'var(--color-primary)' : 'white',
                  color: depto === d ? 'white' : 'var(--color-text-light)',
                }}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['ID', 'Nombre', 'Puesto', 'Depto', 'Tipo', 'Salario', 'Ingreso', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-primary)' }}>{e.id}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{e.nombre}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-light)' }}>{e.puesto}</td>
                    <td style={{ padding: '12px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600 }}>{e.depto}</span></td>
                    <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-light)' }}>{e.tipo}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>${e.salario.toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-light)' }}>{e.fecha_ingreso}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={e.estado} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <button style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Ver expediente</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'nomina' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          {NOMINA_QUINCENAS.map((n, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{n.periodo}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{n.empleados} empleados</div>
              </div>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                {[['Bruto', n.total_bruto, 'var(--color-text)'], ['Deducciones', n.deducciones, 'var(--color-danger)'], ['Neto', n.total_neto, 'var(--color-success)']].map(([label, val, color]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color }}>${val.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
                <StatusBadge status={n.estado} />
                <button style={{ padding: '8px 16px', background: n.estado === 'PENDIENTE' ? 'var(--color-primary)' : '#F3F4F6', color: n.estado === 'PENDIENTE' ? 'white' : 'var(--color-text)', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {n.estado === 'COMPLETADO' ? 'Ver detalle' : n.estado === 'EN_PROCESO' ? 'Procesar' : 'Generar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'vacaciones' && (
        <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Empleado', 'Días disponibles', 'Días tomados', 'Días pendientes', 'Próximas vacaciones', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EMPLEADOS.filter(e => e.estado === 'ACTIVO').map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{e.nombre}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-primary)' }}>{e.dias_vacaciones}</td>
                  <td style={{ padding: '12px 14px' }}>{Math.floor(e.dias_vacaciones * 0.3)}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-success)' }}>{Math.ceil(e.dias_vacaciones * 0.7)}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-light)' }}>—</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Solicitar</button>
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
