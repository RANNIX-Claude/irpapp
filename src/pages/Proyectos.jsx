import { useState } from 'react'
import { HardHat, Plus, Search, Calendar, TrendingUp, AlertTriangle, CheckCircle, DollarSign, BarChart3 } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

const PROYECTOS_DEMO = [
  {
    id: 'PRY-2026-001', nombre: 'Remodelación Área Foodcourt', inmueble: 'Plaza Reforma Norte',
    tipo: 'Remodelación', contratista: 'Constructora Integral S.A.',
    presupuesto: 2850000, gasto_actual: 1240000,
    fecha_inicio: '2026-04-01', fecha_fin_est: '2026-08-30',
    avance: 43, estado: 'EN_PROCESO',
    descripcion: 'Remodelación completa del área de food court: 1,200 m², instalaciones hidráulicas, eléctricas, acabados y mobiliario.',
    etapas: [
      { nombre: 'Demolición y limpieza', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Instalaciones hidrosanitarias', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Instalaciones eléctricas', avance: 75, estado: 'EN_PROCESO' },
      { nombre: 'Acabados y pintura', avance: 10, estado: 'EN_PROCESO' },
      { nombre: 'Mobiliario y equipamiento', avance: 0, estado: 'PENDIENTE' },
    ],
  },
  {
    id: 'PRY-2026-002', nombre: 'Ampliación Estacionamiento Nivel -3',
    inmueble: 'Torre Corporativa Insurgentes', tipo: 'Ampliación',
    contratista: 'Obras Civiles del Centro S.C.',
    presupuesto: 1650000, gasto_actual: 1650000,
    fecha_inicio: '2026-01-15', fecha_fin_est: '2026-06-15',
    avance: 100, estado: 'COMPLETADO',
    descripcion: 'Excavación y habilitación de nivel -3 en estacionamiento: 80 cajones adicionales, sistema de ventilación y alumbrado.',
    etapas: [
      { nombre: 'Excavación', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Estructura', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Instalaciones', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Acabados y señalización', avance: 100, estado: 'COMPLETADO' },
    ],
  },
  {
    id: 'PRY-2026-003', nombre: 'Instalación Paneles Solares Techo',
    inmueble: 'Plaza del Valle Monterrey', tipo: 'Sustentabilidad',
    contratista: 'SolarTech México S.A.',
    presupuesto: 980000, gasto_actual: 0,
    fecha_inicio: '2026-08-01', fecha_fin_est: '2026-10-15',
    avance: 0, estado: 'PENDIENTE',
    descripcion: 'Instalación de 240 paneles fotovoltaicos en azotea. Capacidad 120 kWp. Reducción estimada de 60% en consumo eléctrico de áreas comunes.',
    etapas: [
      { nombre: 'Ingeniería y permisos', avance: 0, estado: 'PENDIENTE' },
      { nombre: 'Instalación estructura soporte', avance: 0, estado: 'PENDIENTE' },
      { nombre: 'Instalación paneles', avance: 0, estado: 'PENDIENTE' },
      { nombre: 'Conexión eléctrica y pruebas', avance: 0, estado: 'PENDIENTE' },
    ],
  },
  {
    id: 'PRY-2025-009', nombre: 'Rehabilitación Fachada Principal',
    inmueble: 'Nave Industrial Vallejo', tipo: 'Mantenimiento Mayor',
    contratista: 'Fachadas y Estructuras Norte',
    presupuesto: 620000, gasto_actual: 710000,
    fecha_inicio: '2026-05-01', fecha_fin_est: '2026-06-30',
    avance: 95, estado: 'EN_PROCESO',
    descripcion: 'Rehabilitación de fachada principal: limpieza, impermeabilización, pintura industrial y restitución de paneles dañados.',
    etapas: [
      { nombre: 'Limpieza y preparación', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Impermeabilización', avance: 100, estado: 'COMPLETADO' },
      { nombre: 'Pintura industrial', avance: 90, estado: 'EN_PROCESO' },
      { nombre: 'Entrega y fianza', avance: 0, estado: 'PENDIENTE' },
    ],
  },
]

function AvanceBar({ pct, color = 'var(--color-primary)' }) {
  return (
    <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
    </div>
  )
}

function ProyectoCard({ p, onClick }) {
  const pctGasto = Math.round((p.gasto_actual / p.presupuesto) * 100)
  const sobrePresupuesto = p.gasto_actual > p.presupuesto

  return (
    <div
      onClick={() => onClick(p)}
      style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Barra top */}
      <div style={{ height: '5px', background: p.estado === 'COMPLETADO' ? 'var(--color-success)' : p.estado === 'PENDIENTE' ? '#D1D5DB' : 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }} />

      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.tipo} · {p.id}</div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '4px 0 0' }}>{p.nombre}</h3>
          </div>
          <StatusBadge status={p.estado} />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '14px' }}>📍 {p.inmueble}</div>

        {/* Avance físico */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <span style={{ color: 'var(--color-text-light)' }}>Avance físico</span>
            <span style={{ fontWeight: 700, color: p.avance >= 80 ? 'var(--color-success)' : p.avance >= 40 ? 'var(--color-primary)' : 'var(--color-warning)' }}>{p.avance}%</span>
          </div>
          <AvanceBar pct={p.avance} color={p.avance >= 80 ? 'var(--color-success)' : p.avance >= 40 ? 'var(--color-primary)' : 'var(--color-warning)'} />
        </div>

        {/* Presupuesto */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
            <span style={{ color: 'var(--color-text-light)' }}>Ejercido vs presupuesto</span>
            <span style={{ fontWeight: 700, color: sobrePresupuesto ? 'var(--color-danger)' : 'var(--color-text)' }}>
              ${(p.gasto_actual / 1000).toFixed(0)}K / ${(p.presupuesto / 1000).toFixed(0)}K
              {sobrePresupuesto && <span style={{ color: 'var(--color-danger)' }}> ⚠️ +{pctGasto - 100}%</span>}
            </span>
          </div>
          <AvanceBar pct={Math.min(pctGasto, 100)} color={sobrePresupuesto ? 'var(--color-danger)' : 'var(--color-success)'} />
        </div>

        {/* Etapas mini */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {p.etapas.map((e, i) => (
            <div key={i} title={`${e.nombre}: ${e.avance}%`} style={{
              flex: 1, height: '6px', borderRadius: '3px',
              background: e.estado === 'COMPLETADO' ? 'var(--color-success)' : e.estado === 'EN_PROCESO' ? 'var(--color-secondary)' : '#E5E7EB',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-light)' }}>
          <span>📅 {p.fecha_inicio} → {p.fecha_fin_est}</span>
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Ver detalle →</span>
        </div>
      </div>
    </div>
  )
}

function ProyectoModal({ proyecto: p, onClose }) {
  if (!p) return null
  const sobrePresupuesto = p.gasto_actual > p.presupuesto

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{p.tipo} · {p.id}</div>
            <h2 style={{ margin: '6px 0 4px', fontSize: '19px', fontWeight: 700 }}>{p.nombre}</h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-light)' }}>📍 {p.inmueble} · 🏗 {p.contratista}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-light)' }}>✕</button>
        </div>

        <div style={{ padding: '24px', display: 'grid', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StatusBadge status={p.estado} />
            <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#EFF6FF', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700 }}>Avance {p.avance}%</span>
            {sobrePresupuesto && <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#FEF2F2', color: 'var(--color-danger)', fontSize: '12px', fontWeight: 700 }}>⚠️ Sobre presupuesto</span>}
          </div>

          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, color: 'var(--color-text)', background: '#F9FAFB', padding: '14px', borderRadius: '8px' }}>{p.descripcion}</p>

          {/* Financiero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Presupuesto', val: `$${p.presupuesto.toLocaleString()}`, color: 'var(--color-primary)' },
              { label: 'Ejercido', val: `$${p.gasto_actual.toLocaleString()}`, color: sobrePresupuesto ? 'var(--color-danger)' : 'var(--color-success)' },
              { label: 'Saldo', val: `$${(p.presupuesto - p.gasto_actual).toLocaleString()}`, color: p.presupuesto - p.gasto_actual < 0 ? 'var(--color-danger)' : 'var(--color-success)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: '#F9FAFB', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Etapas */}
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Etapas del proyecto</div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {p.etapas.map((e, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: e.estado === 'COMPLETADO' ? 'var(--color-success)' : e.estado === 'EN_PROCESO' ? 'var(--color-secondary)' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    {e.nombre}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right', color: e.avance === 100 ? 'var(--color-success)' : 'var(--color-text)' }}>{e.avance}%</div>
                  <AvanceBar pct={e.avance} color={e.estado === 'COMPLETADO' ? 'var(--color-success)' : 'var(--color-secondary)'} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Actualizar avance', 'Registrar gasto', 'Ver documentos', 'Generar reporte'].map(a => (
              <button key={a} style={{ padding: '8px 14px', background: a === 'Actualizar avance' ? 'var(--color-primary)' : '#F3F4F6', color: a === 'Actualizar avance' ? 'white' : 'var(--color-text)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Proyectos() {
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [selected, setSelected] = useState(null)

  const filtrados = PROYECTOS_DEMO.filter(p => {
    const q = search.toLowerCase()
    const match = p.nombre.toLowerCase().includes(q) || p.inmueble.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    const estado = estadoFiltro === 'Todos' || p.estado === estadoFiltro
    return match && estado
  })

  const activos = PROYECTOS_DEMO.filter(p => p.estado === 'EN_PROCESO').length
  const completados = PROYECTOS_DEMO.filter(p => p.estado === 'COMPLETADO').length
  const presupuestoTotal = PROYECTOS_DEMO.reduce((a, b) => a + b.presupuesto, 0)
  const gastoTotal = PROYECTOS_DEMO.reduce((a, b) => a + b.gasto_actual, 0)
  const sobrePresupuesto = PROYECTOS_DEMO.filter(p => p.gasto_actual > p.presupuesto).length

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Proyectos y Obras</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{PROYECTOS_DEMO.length} proyectos registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Proyecto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="En Ejecución" value={activos} icon={HardHat} color="var(--color-secondary)" />
        <KPICard title="Completados" value={completados} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Presupuesto Total" value={`$${(presupuestoTotal / 1000000).toFixed(1)}M`} icon={DollarSign} color="var(--color-primary)" />
        <KPICard title="Sobre Presupuesto" value={sobrePresupuesto} icon={AlertTriangle} color={sobrePresupuesto > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />
      </div>

      {/* Resumen financiero */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
          <span style={{ fontWeight: 600 }}>Gasto total vs presupuesto consolidado</span>
          <span style={{ fontWeight: 700 }}>${(gastoTotal / 1000000).toFixed(2)}M / ${(presupuestoTotal / 1000000).toFixed(2)}M</span>
        </div>
        <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(Math.round(gastoTotal / presupuestoTotal * 100), 100)}%`, background: gastoTotal > presupuestoTotal ? 'var(--color-danger)' : 'var(--color-primary)', borderRadius: '5px' }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '6px' }}>
          {Math.round(gastoTotal / presupuestoTotal * 100)}% ejercido · Saldo disponible ${((presupuestoTotal - gastoTotal) / 1000).toFixed(0)}K
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proyecto o inmueble..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'EN_PROCESO', 'COMPLETADO', 'PENDIENTE'].map(e => (
            <button key={e} onClick={() => setEstadoFiltro(e)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: estadoFiltro === e ? 'var(--color-primary)' : '#E5E7EB',
              background: estadoFiltro === e ? 'var(--color-primary)' : 'white',
              color: estadoFiltro === e ? 'white' : 'var(--color-text-light)',
            }}>{e === 'Todos' ? 'Todos' : e.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState title="Sin proyectos" description="No hay proyectos que coincidan con los filtros." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtrados.map(p => <ProyectoCard key={p.id} p={p} onClick={setSelected} />)}
        </div>
      )}

      <ProyectoModal proyecto={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
