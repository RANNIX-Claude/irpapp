import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { UserPlus, Plus, Search, Phone, Mail, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

const ESTATUS_COLOR = {
  NUEVO: '#3B82F6',
  CONTACTADO: '#F59E0B',
  VISITA_AGENDADA: '#8B5CF6',
  PROPUESTA: '#0A66C2',
  APROBADO: '#057642',
  RECHAZADO: '#B24020',
  CONVERTIDO: '#057642',
}

function EstatusBadge({ estatus }) {
  const color = ESTATUS_COLOR[estatus] || '#6B7280'
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: color + '20', color }}>
      {estatus?.replace(/_/g, ' ') || 'NUEVO'}
    </span>
  )
}

function ProspectoCard({ p }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.nombre_completo}</div>
          {p.giro_solicitado && <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{p.giro_solicitado}</div>}
        </div>
        <EstatusBadge estatus={p.estatus} />
      </div>
      {(p.inmueble_nombre || p.unidad_interes) && (
        <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
          {p.inmueble_nombre} {p.unidad_interes ? `· ${p.unidad_interes}` : ''}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {p.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><Phone size={12} />{p.telefono}</div>}
        {p.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><Mail size={12} />{p.email}</div>}
      </div>
      {p.monto_ofertado > 0 && (
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Renta ofertada</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-success)' }}>${parseFloat(p.monto_ofertado).toLocaleString()}</span>
        </div>
      )}
      {p.fecha_visita && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={11} /> Visita: {p.fecha_visita}
        </div>
      )}
    </div>
  )
}

export default function Prospectos() {
  useModuleAudit('PROSPECTOS')
  const [search, setSearch] = useState('')
  const [filtroEst, setFiltroEst] = useState('Todos')
  const { data, loading } = usePRP('prp_prospectos', { order: { col: 'created_at', asc: false } })

  const lista = data ?? []
  const activos = lista.filter(p => !['RECHAZADO','CONVERTIDO'].includes(p.estatus)).length
  const convertidos = lista.filter(p => p.estatus === 'CONVERTIDO').length
  const rechazados = lista.filter(p => p.estatus === 'RECHAZADO').length

  const filtrados = lista.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || (p.nombre_completo || '').toLowerCase().includes(q)
      || (p.giro_solicitado || '').toLowerCase().includes(q)
      || (p.unidad_interes || '').toLowerCase().includes(q)
    const matchE = filtroEst === 'Todos' || p.estatus === filtroEst
    return matchQ && matchE
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Prospectos y CRM</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} prospectos registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo Prospecto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Total" value={lista.length} icon={UserPlus} color="var(--color-primary)" />
        <KPICard title="En Proceso" value={activos} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Convertidos" value={convertidos} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Rechazados" value={rechazados} icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, giro, unidad..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        {['Todos','NUEVO','CONTACTADO','PROPUESTA','APROBADO','RECHAZADO'].map(e => (
          <button key={e} onClick={() => setFiltroEst(e)} style={{
            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtroEst === e ? 'var(--color-primary)' : '#E5E7EB',
            background: filtroEst === e ? 'var(--color-primary)' : 'white',
            color: filtroEst === e ? 'white' : 'var(--color-text-light)',
          }}>{e.replace(/_/g,' ')}</button>
        ))}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
        : filtrados.length === 0
        ? <EmptyState title="Sin prospectos" description="No hay prospectos registrados aún." />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {filtrados.map(p => <ProspectoCard key={p.id} p={p} />)}
          </div>
      }
    </div>
  )
}
