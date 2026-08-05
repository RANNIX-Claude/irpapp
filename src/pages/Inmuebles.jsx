import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { Building2, Plus, Search, MapPin, Home, TrendingUp, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

const TIPOS = ['Todos']

function InmuebleCard({ item, onView }) {
  const pct = Math.round((item.unidades_ocupadas / item.total_unidades) * 100)
  const [menu, setMenu] = useState(false)

  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Header color */}
      <div style={{
        height: '6px',
        background: item.estado === 'ACTIVO'
          ? 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))'
          : 'linear-gradient(90deg, var(--color-warning), #FCD34D)',
      }} />

      <div style={{ padding: '20px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {item.tipo}
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              {item.nombre}
            </h3>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenu(!menu)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-light)', borderRadius: '4px' }}
            >
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div style={{
                position: 'absolute', right: 0, top: '28px', background: 'white',
                border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 10, minWidth: '140px',
              }}>
                {[
                  { icon: Eye, label: 'Ver detalle' },
                  { icon: Edit, label: 'Editar' },
                  { icon: Trash2, label: 'Eliminar', danger: true },
                ].map(({ icon: Icon, label, danger }) => (
                  <button key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', color: danger ? 'var(--color-danger)' : 'var(--color-text)',
                    textAlign: 'left',
                  }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ubicación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-light)', fontSize: '12px', marginBottom: '16px' }}>
          <MapPin size={12} />
          {item.colonia}, {item.ciudad}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Unidades', value: item.total_unidades },
            { label: 'm² totales', value: item.m2_totales.toLocaleString() },
            { label: '$/m²', value: `$${item.renta_promedio}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Ocupación bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--color-text-light)' }}>Ocupación</span>
            <span style={{ fontWeight: 700, color: pct >= 90 ? 'var(--color-success)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
              {pct}% ({item.unidades_ocupadas}/{item.total_unidades})
            </span>
          </div>
          <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 90 ? 'var(--color-success)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)',
              borderRadius: '3px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusBadge status={item.estado} />
          <button
            onClick={() => onView(item)}
            style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)',
              background: 'var(--color-primary-light)', border: 'none', borderRadius: '6px',
              padding: '6px 12px', cursor: 'pointer',
            }}
          >
            Ver unidades →
          </button>
        </div>
      </div>
    </div>
  )
}

function UnidadesModal({ inmueble, onClose }) {
  const { data: rawUnidades, loading } = usePRP('prp_unidades', {
    filters: [['inmueble_id', 'eq', inmueble.id]],
    order: { col: 'numero_local' },
  })
  const UNIDADES = (rawUnidades ?? []).map(u => ({
    id: u.id, numero: u.numero_local,
    tipo: u.tipo_unidad ?? '—', m2: parseInt(u.m2_totales) || 0,
    renta: parseFloat(u.renta_base) || 0, estado: u.estado_id ?? 'DISPONIBLE',
    arrendatario: null,
  }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px',
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{inmueble.nombre}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-light)' }}>
              {inmueble.total_unidades} unidades · {inmueble.unidades_ocupadas} ocupadas
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-light)' }}>✕</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner /></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Unidad', 'Tipo', 'm²', 'Renta Base', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UNIDADES.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>{u.numero}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-light)' }}>{u.tipo}</td>
                    <td style={{ padding: '10px 16px' }}>{u.m2} m²</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{u.renta > 0 ? `$${u.renta.toLocaleString()}` : '—'}</td>
                    <td style={{ padding: '10px 16px' }}><StatusBadge status={u.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Inmuebles() {
  useModuleAudit('INMUEBLES')
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const { data: rawData, loading } = usePRP('prp_inmuebles', { order: { col: 'nombre' } })
  const { data: unidadesData } = usePRP('prp_unidades', { order: { col: 'numero_local' } })

  const INMUEBLES_DATA = (rawData ?? []).map(i => ({
    id: i.id, nombre: i.nombre, tipo: i.tipo_inmueble ?? 'Inmueble',
    ciudad: i.ciudad ?? '—', colonia: i.estado ?? '', m2_totales: parseInt(i.m2_totales) || 0,
    total_unidades: parseInt(i.unidades_total) || 0,
    unidades_ocupadas: parseInt(i.unidades_ocupadas) || 0,
    estado: i.estado_id ?? 'ACTIVO',
    renta_promedio: 0, imagen: null,
  }))

  const tipos = ['Todos', ...new Set(INMUEBLES_DATA.map(i => i.tipo).filter(Boolean))]

  const filtrados = INMUEBLES_DATA.filter(i => {
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase()) ||
      i.ciudad.toLowerCase().includes(search.toLowerCase())
    const matchTipo = tipoFiltro === 'Todos' || i.tipo === tipoFiltro
    return matchSearch && matchTipo
  })

  const totalUnidades = INMUEBLES_DATA.reduce((a, b) => a + b.total_unidades, 0)
  const totalOcupadas = INMUEBLES_DATA.reduce((a, b) => a + b.unidades_ocupadas, 0)
  const ocupacionGlobal = totalUnidades > 0 ? Math.round((totalOcupadas / totalUnidades) * 100) : 0
  const rentaTotal = 0

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>
            Inmuebles y Unidades
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
            {INMUEBLES_DATA.length} inmuebles registrados · {totalUnidades} unidades totales
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--color-primary)', color: 'white',
            border: 'none', borderRadius: '8px', padding: '10px 20px',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nuevo Inmueble
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KPICard title="Inmuebles" value={INMUEBLES_DATA.length} icon={Building2} color="var(--color-primary)" />
        <KPICard title="Unidades Totales" value={totalUnidades} icon={Home} color="var(--color-secondary)" />
        <KPICard title="Ocupación Global" value={`${ocupacionGlobal}%`} icon={TrendingUp}
          color={ocupacionGlobal >= 90 ? 'var(--color-success)' : 'var(--color-warning)'}
          tendencia={ocupacionGlobal >= 90 ? 'up' : 'neutral'} />
        <KPICard title="Renta Mensual Est." value={`$${(rentaTotal / 1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-success)" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o ciudad..."
            style={{
              width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB',
              borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid',
              borderColor: tipoFiltro === t ? 'var(--color-primary)' : '#E5E7EB',
              background: tipoFiltro === t ? 'var(--color-primary)' : 'white',
              color: tipoFiltro === t ? 'white' : 'var(--color-text-light)',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
      ) : filtrados.length === 0 ? (
        <EmptyState title="Sin resultados" description="Ajusta los filtros de búsqueda o agrega un nuevo inmueble." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filtrados.map(i => <InmuebleCard key={i.id} item={i} onView={setSelected} />)}
        </div>
      )}

      {/* Modal unidades */}
      {selected && <UnidadesModal inmueble={selected} onClose={() => setSelected(null)} />}

      {/* Toast nuevo inmueble (placeholder) */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <Building2 size={40} color="var(--color-primary)" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Formulario Nuevo Inmueble</h3>
            <p style={{ color: 'var(--color-text-light)', fontSize: '14px', margin: '0 0 24px' }}>
              Sprint 2 — Conectar con Supabase `public.inmuebles`
            </p>
            <button onClick={() => setShowForm(false)} style={{
              padding: '10px 24px', background: 'var(--color-primary)', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
            }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
