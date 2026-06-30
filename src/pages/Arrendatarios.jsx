import { useState } from 'react'
import { Users, Search, Plus, Mail, Phone, MapPin, FileText, TrendingUp, AlertTriangle } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'

const ARRENDATARIOS_DEMO = [
  { id: 'A001', nombre: 'Farmacia del Ahorro S.A.', rfc: 'FDA920301AB2', tipo: 'Persona Moral', email: 'admin@farmaciasahorro.com', tel: '55 5000-1234', ciudad: 'CDMX', contratos_activos: 2, saldo_pendiente: 0, estado: 'ACTIVO', regimen: '601', categoria: 'Retail' },
  { id: 'A002', nombre: 'Grupo Financiero Azteca', rfc: 'GFA850601XY3', tipo: 'Persona Moral', email: 'arrendamientos@grupoazteca.com', tel: '55 5200-4500', ciudad: 'CDMX', contratos_activos: 1, saldo_pendiente: 0, estado: 'ACTIVO', regimen: '601', categoria: 'Servicios' },
  { id: 'A003', nombre: 'Ramírez Ortega Luis', rfc: 'RAOL770415MN4', tipo: 'Persona Física', email: 'dramirez@gmail.com', tel: '55 4455-6677', ciudad: 'Naucalpan', contratos_activos: 1, saldo_pendiente: 21780, estado: 'EN_MORA', regimen: '612', categoria: 'Médico' },
  { id: 'A004', nombre: 'Óptica Devlyn S.A.', rfc: 'ODE890712PQ5', tipo: 'Persona Moral', email: 'legal@devlyn.com', tel: '800 111-2222', ciudad: 'CDMX', contratos_activos: 1, saldo_pendiente: 36192, estado: 'PENDIENTE', regimen: '601', categoria: 'Retail' },
  { id: 'A005', nombre: 'Zara México S. de R.L.', rfc: 'ZME010315RS6', tipo: 'Persona Moral', email: 'contratos@zara.mx', tel: '55 5800-9900', ciudad: 'Monterrey', contratos_activos: 1, saldo_pendiente: 0, estado: 'ACTIVO', regimen: '601', categoria: 'Retail' },
  { id: 'A006', nombre: 'Logística Express Norte', rfc: 'LEN110820TU7', tipo: 'Persona Moral', email: 'operaciones@logexnorte.com', tel: '81 8900-1100', ciudad: 'Monterrey', contratos_activos: 1, saldo_pendiente: 0, estado: 'ACTIVO', regimen: '626', categoria: 'Industrial' },
]

function Avatar({ nombre, tipo }) {
  const initials = nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const color = tipo === 'Persona Moral' ? 'var(--color-primary)' : 'var(--color-secondary)'
  return (
    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function ArrendatarioCard({ a }) {
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <Avatar nombre={a.nombre} tipo={a.tipo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{a.rfc}</div>
        </div>
        <StatusBadge status={a.estado} />
      </div>

      <div style={{ display: 'grid', gap: '6px', marginBottom: '14px' }}>
        {[
          { icon: Mail, val: a.email },
          { icon: Phone, val: a.tel },
          { icon: MapPin, val: `${a.ciudad} · ${a.tipo}` },
        ].map(({ icon: Icon, val }) => (
          <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}>
            <Icon size={12} /> {val}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '14px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>{a.contratos_activos}</div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Contratos</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: a.saldo_pendiente > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {a.saldo_pendiente > 0 ? `$${a.saldo_pendiente.toLocaleString()}` : '✓ Al corriente'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Saldo</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {[
          { label: 'Expediente', color: 'var(--color-primary)' },
          { label: 'Contratos', color: '#6B7280' },
          { label: 'Cobranza', color: '#6B7280' },
        ].map(({ label, color }) => (
          <button key={label} style={{ flex: 1, padding: '7px 4px', background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Arrendatarios() {
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  const filtrados = ARRENDATARIOS_DEMO.filter(a => {
    const q = search.toLowerCase()
    const match = a.nombre.toLowerCase().includes(q) || a.rfc.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    const tipo = filtroTipo === 'Todos' || a.tipo === filtroTipo
    return match && tipo
  })

  const activos = ARRENDATARIOS_DEMO.filter(a => a.estado === 'ACTIVO').length
  const mora = ARRENDATARIOS_DEMO.filter(a => a.saldo_pendiente > 0).length
  const saldoTotal = ARRENDATARIOS_DEMO.reduce((acc, a) => acc + a.saldo_pendiente, 0)
  const morales = ARRENDATARIOS_DEMO.filter(a => a.tipo === 'Persona Moral').length

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Arrendatarios</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{ARRENDATARIOS_DEMO.length} arrendatarios registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Arrendatario
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Total" value={ARRENDATARIOS_DEMO.length} icon={Users} color="var(--color-primary)" />
        <KPICard title="Activos" value={activos} icon={TrendingUp} color="var(--color-success)" />
        <KPICard title="Con Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Saldo Vencido" value={`$${(saldoTotal / 1000).toFixed(0)}K`} icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RFC o email..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'Persona Moral', 'Persona Física'].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroTipo === t ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroTipo === t ? 'var(--color-primary)' : 'white',
              color: filtroTipo === t ? 'white' : 'var(--color-text-light)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState title="Sin resultados" description="No hay arrendatarios que coincidan con la búsqueda." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtrados.map(a => <ArrendatarioCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  )
}
