import { useState } from 'react'
import { Wrench, Plus, Search, AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar, User, MapPin } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

const PRIORIDAD_STYLE = {
  ALTA: { bg: '#FEF2F2', text: '#B24020', label: 'Alta' },
  MEDIA: { bg: '#FFF7ED', text: '#B45309', label: 'Media' },
  BAJA: { bg: '#F0FDF4', text: '#057642', label: 'Baja' },
  URGENTE: { bg: '#FEF2F2', text: '#7F1D1D', label: 'Urgente' },
}

const ORDENES_DEMO = [
  { id: 'OT-2026-0312', tipo: 'Correctivo', categoria: 'Eléctrico', inmueble: 'Plaza Reforma Norte', area: 'Área común P1', descripcion: 'Falla en tablero eléctrico sector B — sin luz en pasillos', prioridad: 'URGENTE', asignado: 'Ing. López Garza', estado: 'EN_PROCESO', fecha_apertura: '2026-06-28', fecha_cierre_est: '2026-07-01', costo_est: 8500 },
  { id: 'OT-2026-0313', tipo: 'Preventivo', categoria: 'Climatización', inmueble: 'Torre Corporativa Insurgentes', area: 'Piso 4 completo', descripcion: 'Mantenimiento semestral de sistemas HVAC — revisión filtros y carga de gas', prioridad: 'MEDIA', asignado: 'Tec. Hernández R.', estado: 'PENDIENTE', fecha_apertura: '2026-07-01', fecha_cierre_est: '2026-07-05', costo_est: 12000 },
  { id: 'OT-2026-0308', tipo: 'Correctivo', categoria: 'Plomería', inmueble: 'Clínica Especialidades Satélite', area: 'Baño consultorio C12', descripcion: 'Fuga en tubería de agua fría — mancha en pared', prioridad: 'ALTA', asignado: 'Plo. Martínez J.', estado: 'COMPLETADO', fecha_apertura: '2026-06-20', fecha_cierre_est: '2026-06-22', costo_est: 3200, costo_real: 2950, fecha_cierre_real: '2026-06-21' },
  { id: 'OT-2026-0310', tipo: 'Preventivo', categoria: 'Seguridad', inmueble: 'Plaza del Valle Monterrey', area: 'Estacionamiento subterráneo', descripcion: 'Revisión y calibración de cámaras CCTV y control de acceso', prioridad: 'MEDIA', asignado: 'Tec. Sánchez P.', estado: 'PENDIENTE', fecha_apertura: '2026-07-03', fecha_cierre_est: '2026-07-04', costo_est: 5500 },
  { id: 'OT-2026-0307', tipo: 'Mejora', categoria: 'Pintura', inmueble: 'Nave Industrial Vallejo', area: 'Nave principal', descripcion: 'Repintura de señalización de seguridad industrial en piso y paredes', prioridad: 'BAJA', asignado: 'Pint. Reyes A.', estado: 'COMPLETADO', fecha_apertura: '2026-06-15', fecha_cierre_est: '2026-06-18', costo_est: 7800, costo_real: 8100, fecha_cierre_real: '2026-06-19' },
  { id: 'OT-2026-0315', tipo: 'Correctivo', categoria: 'Jardinería', inmueble: 'Plaza Reforma Norte', area: 'Jardín entrada principal', descripcion: 'Poda de árboles y restitución de plantas dañadas por lluvia', prioridad: 'BAJA', asignado: 'Jard. Cruz M.', estado: 'PENDIENTE', fecha_apertura: '2026-07-01', fecha_cierre_est: '2026-07-08', costo_est: 4200 },
]

const TIPOS = ['Todos', 'Correctivo', 'Preventivo', 'Mejora']
const PRIORIDADES = ['Todas', 'URGENTE', 'ALTA', 'MEDIA', 'BAJA']

function OTCard({ ot, onClick }) {
  const p = PRIORIDAD_STYLE[ot.prioridad] || {}
  const esCompletada = ot.estado === 'COMPLETADO'

  return (
    <div
      onClick={() => onClick(ot)}
      style={{
        background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB',
        padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s',
        borderLeft: `4px solid ${esCompletada ? 'var(--color-success)' : ot.prioridad === 'URGENTE' ? 'var(--color-danger)' : ot.prioridad === 'ALTA' ? '#F59E0B' : 'var(--color-primary)'}`,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>{ot.id}</span>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#F3F4F6', color: 'var(--color-text-light)', fontWeight: 600 }}>{ot.tipo}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', color: 'var(--color-primary)', fontWeight: 600 }}>{ot.categoria}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: p.bg, color: p.text, fontWeight: 700 }}>{p.label}</span>
          </div>
        </div>
        <StatusBadge status={ot.estado} />
      </div>

      <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: '0 0 12px', lineHeight: 1.4 }}>{ot.descripcion}</p>

      <div style={{ display: 'grid', gap: '5px', marginBottom: '12px' }}>
        {[
          { icon: MapPin, val: `${ot.inmueble} · ${ot.area}` },
          { icon: User, val: ot.asignado },
          { icon: Calendar, val: `Apertura: ${ot.fecha_apertura} · Cierre est: ${ot.fecha_cierre_est}` },
        ].map(({ icon: Icon, val }) => (
          <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-light)' }}>
            <Icon size={11} /> {val}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: 'var(--color-text-light)' }}>Costo est. </span>
          <span style={{ fontWeight: 700 }}>${ot.costo_est.toLocaleString()}</span>
          {ot.costo_real && (
            <span style={{ color: ot.costo_real > ot.costo_est ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700, marginLeft: '6px' }}>
              → Real ${ot.costo_real.toLocaleString()}
            </span>
          )}
        </div>
        {!esCompletada && (
          <button style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
            Actualizar →
          </button>
        )}
      </div>
    </div>
  )
}

function OTModal({ ot, onClose }) {
  if (!ot) return null
  const p = PRIORIDAD_STYLE[ot.prioridad] || {}

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Orden de Trabajo</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>{ot.id}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-light)' }}>✕</button>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <StatusBadge status={ot.estado} />
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: p.bg, color: p.text }}>Prioridad {p.label}</span>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: '#F3F4F6', color: 'var(--color-text)' }}>{ot.tipo}</span>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: 1.6 }}>{ot.descripcion}</div>
          {[
            ['Inmueble', ot.inmueble], ['Área', ot.area], ['Categoría', ot.categoria],
            ['Técnico asignado', ot.asignado],
            ['Fecha apertura', ot.fecha_apertura],
            ['Fecha cierre estimada', ot.fecha_cierre_est],
            ...(ot.fecha_cierre_real ? [['Fecha cierre real', ot.fecha_cierre_real]] : []),
            ['Costo estimado', `$${ot.costo_est.toLocaleString()}`],
            ...(ot.costo_real ? [['Costo real', `$${ot.costo_real.toLocaleString()}`]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '13px' }}>{val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px' }}>
            {['Marcar completada', 'Reasignar técnico', 'Adjuntar evidencia', 'Generar OC'].map(a => (
              <button key={a} style={{ padding: '8px 14px', background: a === 'Marcar completada' ? 'var(--color-success)' : '#F3F4F6', color: a === 'Marcar completada' ? 'white' : 'var(--color-text)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Mantenimiento() {
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [prioFiltro, setPrioFiltro] = useState('Todas')
  const [selected, setSelected] = useState(null)

  const filtradas = ORDENES_DEMO.filter(ot => {
    const q = search.toLowerCase()
    const match = ot.id.toLowerCase().includes(q) || ot.descripcion.toLowerCase().includes(q) || ot.inmueble.toLowerCase().includes(q) || ot.asignado.toLowerCase().includes(q)
    const tipo = tipoFiltro === 'Todos' || ot.tipo === tipoFiltro
    const prio = prioFiltro === 'Todas' || ot.prioridad === prioFiltro
    return match && tipo && prio
  })

  const abiertas = ORDENES_DEMO.filter(o => o.estado !== 'COMPLETADO').length
  const urgentes = ORDENES_DEMO.filter(o => o.prioridad === 'URGENTE' && o.estado !== 'COMPLETADO').length
  const completadas = ORDENES_DEMO.filter(o => o.estado === 'COMPLETADO').length
  const costoTotal = ORDENES_DEMO.reduce((a, b) => a + (b.costo_real || b.costo_est), 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Mantenimiento y Órdenes de Trabajo</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{ORDENES_DEMO.length} órdenes registradas</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nueva OT
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="OT Abiertas" value={abiertas} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Urgentes" value={urgentes} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Completadas" value={completadas} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Costo Total" value={`$${(costoTotal / 1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OT, descripción o inmueble..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: tipoFiltro === t ? 'var(--color-primary)' : '#E5E7EB',
              background: tipoFiltro === t ? 'var(--color-primary)' : 'white',
              color: tipoFiltro === t ? 'white' : 'var(--color-text-light)',
            }}>{t}</button>
          ))}
          <div style={{ width: '1px', background: '#E5E7EB', margin: '0 4px' }} />
          {PRIORIDADES.map(p => (
            <button key={p} onClick={() => setPrioFiltro(p)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: prioFiltro === p ? (PRIORIDAD_STYLE[p]?.text || 'var(--color-primary)') : '#E5E7EB',
              background: prioFiltro === p ? (PRIORIDAD_STYLE[p]?.bg || 'var(--color-primary-light)') : 'white',
              color: prioFiltro === p ? (PRIORIDAD_STYLE[p]?.text || 'var(--color-primary)') : 'var(--color-text-light)',
            }}>{p === 'Todas' ? 'Todas' : PRIORIDAD_STYLE[p]?.label}</button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState title="Sin órdenes" description="No hay órdenes de trabajo que coincidan con los filtros." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filtradas.map(ot => <OTCard key={ot.id} ot={ot} onClick={setSelected} />)}
        </div>
      )}

      <OTModal ot={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
