import { useState } from 'react'
import { Users, Search, Plus, Mail, Phone, MapPin, TrendingUp, AlertTriangle, Star } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

function Avatar({ nombre }) {
  const initials = (nombre || 'NN').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-primary)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function Estrellas({ val }) {
  const v = Math.round(parseFloat(val) || 0)
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} fill={i <= v ? 'var(--color-secondary)' : 'none'} color={i <= v ? 'var(--color-secondary)' : '#D1D5DB'} />
      ))}
    </div>
  )
}

function ArrendatarioCard({ a }) {
  const saldo = parseFloat(a.saldo_pendiente) || 0
  return (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px', transition: 'box-shadow 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
        <Avatar nombre={a.nombre_razon_social} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre_razon_social}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{a.rfc}</div>
        </div>
        <StatusBadge status={a.estado_id} />
      </div>

      <div style={{ display: 'grid', gap: '5px', marginBottom: '14px' }}>
        {a.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><Mail size={11} /> {a.email}</div>}
        {a.telefono && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><Phone size={11} /> {a.telefono}</div>}
        {a.ciudad && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}><MapPin size={11} /> {a.ciudad} · {a.tipo_persona === 'MORAL' ? 'Persona Moral' : 'Persona Física'}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>{a.contratos_activos}</div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Contratos</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: saldo > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {saldo > 0 ? `$${saldo.toLocaleString()}` : '✓ Al corriente'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Saldo</div>
        </div>
      </div>

      {a.calificacion && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><Estrellas val={a.calificacion} /></div>}

      <div style={{ display: 'flex', gap: '6px' }}>
        {['Expediente', 'Contratos', 'Cobranza'].map(label => (
          <button key={label} style={{ flex: 1, padding: '7px 4px', background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: label === 'Expediente' ? 'var(--color-primary)' : 'var(--color-text-light)' }}>
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
  const { data, loading } = usePRP('prp_arrendatarios', { order: { col: 'nombre_razon_social' } })

  const lista = data ?? []

  const filtrados = lista.filter(a => {
    const q = search.toLowerCase()
    const match = !q || (a.nombre_razon_social || '').toLowerCase().includes(q) || (a.rfc || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q)
    const tipo = filtroTipo === 'Todos' || (filtroTipo === 'Persona Moral' ? a.tipo_persona === 'MORAL' : a.tipo_persona === 'FISICA')
    return match && tipo
  })

  const activos = lista.filter(a => a.estado_id === 'ACTIVO').length
  const mora = lista.filter(a => parseFloat(a.saldo_pendiente) > 0).length
  const saldoTotal = lista.reduce((acc, a) => acc + (parseFloat(a.saldo_pendiente) || 0), 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>Arrendatarios</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Arrendatario
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Total" value={lista.length} icon={Users} color="var(--color-primary)" />
        <KPICard title="Activos" value={activos} icon={TrendingUp} color="var(--color-success)" />
        <KPICard title="Con Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Saldo Vencido" value={saldoTotal > 0 ? `$${(saldoTotal/1000).toFixed(0)}K` : '$0'} icon={AlertTriangle} color={saldoTotal > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
      ) : filtrados.length === 0 ? (
        <EmptyState title="Sin arrendatarios" description="No hay arrendatarios que coincidan con la búsqueda." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtrados.map(a => <ArrendatarioCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  )
}
