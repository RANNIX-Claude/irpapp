import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { Car, Plus, Search, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

function CajonCard({ c }) {
  const ocupado = c.estatus === 'OCUPADO'
  return (
    <div style={{
      background: ocupado ? 'var(--color-primary)08' : '#F0FDF4',
      border: `2px solid ${ocupado ? 'var(--color-primary)30' : '#86EFAC'}`,
      borderRadius: '10px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 800, fontSize: '16px', color: ocupado ? 'var(--color-primary)' : 'var(--color-success)' }}>
          #{c.numero_cajon}
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
          background: ocupado ? 'var(--color-primary)20' : '#DCF5DC',
          color: ocupado ? 'var(--color-primary)' : 'var(--color-success)',
        }}>{c.estatus}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{c.tipo || 'General'}</div>
      {ocupado && c.pension_titular && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', marginTop: '2px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.pension_titular}</div>
          {c.vehiculo_placa && <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{c.vehiculo_placa} · {c.vehiculo_marca} {c.vehiculo_color}</div>}
          {c.monto_mensual > 0 && <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700, marginTop: '4px' }}>{fmt(c.monto_mensual)}/mes</div>}
        </div>
      )}
    </div>
  )
}

export default function Estacionamiento() {
  useModuleAudit('ESTACIONAMIENTO')
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const { data, loading } = usePRP('prp_estacionamiento')

  const lista = data ?? []
  const ocupados = lista.filter(c => c.estatus === 'OCUPADO').length
  const disponibles = lista.filter(c => c.estatus === 'DISPONIBLE').length
  const ingresos = lista.filter(c => c.estatus === 'OCUPADO').reduce((a, b) => a + (parseFloat(b.monto_mensual) || 0), 0)

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.pension_titular || '').toLowerCase().includes(q)
      || (c.vehiculo_placa || '').toLowerCase().includes(q)
      || String(c.numero_cajon).includes(q)
    const matchF = filtro === 'Todos' || c.estatus === filtro
    return matchQ && matchF
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Estacionamiento</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} cajones totales</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nueva Pensión
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Ocupados" value={ocupados} icon={Car} color="var(--color-primary)" />
        <KPICard title="Disponibles" value={disponibles} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Ocupación" value={lista.length ? `${Math.round(ocupados/lista.length*100)}%` : '0%'} icon={AlertTriangle} color="var(--color-warning)" />
        <KPICard title="Ingresos/mes" value={`$${(ingresos/1000).toFixed(1)}K`} icon={DollarSign} color="var(--color-secondary)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por titular, placa o número..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        {['Todos', 'OCUPADO', 'DISPONIBLE'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtro === f ? 'var(--color-primary)' : '#E5E7EB',
            background: filtro === f ? 'var(--color-primary)' : 'white',
            color: filtro === f ? 'white' : 'var(--color-text-light)',
          }}>{f}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
        : filtrados.length === 0
        ? <EmptyState title="Sin cajones" description="No hay cajones que coincidan con los filtros." />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {filtrados.map(c => <CajonCard key={c.id} c={c} />)}
          </div>
      }
    </div>
  )
}
