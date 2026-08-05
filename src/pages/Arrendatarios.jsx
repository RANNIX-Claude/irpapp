import { useState } from 'react'
import { Users, Search, Plus, AlertTriangle, CheckCircle, Clock, FileText, CreditCard, Paperclip, Building2 } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ExpedienteModal from '../components/ui/ExpedienteModal'
import { usePRP } from '../hooks/usePRP'
import { useModuleAudit, logAudit } from '../hooks/useAudit'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

function Avatar({ nombre }) {
  const ini = (nombre || 'NN').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
      {ini}
    </div>
  )
}

function SaldoBadge({ mora, pendiente }) {
  const m = parseFloat(mora) || 0
  const p = parseFloat(pendiente) || 0
  if (m > 0) return <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-danger)', background: '#FEE2E220', padding: '2px 8px', borderRadius: '10px' }}>En mora {fmt(m)}</span>
  if (p > 0) return <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-warning)', background: '#FEF3C720', padding: '2px 8px', borderRadius: '10px' }}>Pendiente {fmt(p)}</span>
  return <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)' }}>✓ Al corriente</span>
}

function ArrendatarioCard({ a, onExpediente }) {
  const mora = parseFloat(a.total_mora) || 0
  const pendiente = parseFloat(a.total_pendiente) || 0
  const tieneContrato = !!a.contrato_id
  const tienePDF = !!a.archivo_contrato_url

  return (
    <div style={{ background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'default', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,102,194,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Cabecera */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Avatar nombre={a.nombre_completo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre_completo}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace', marginTop: '1px' }}>{a.rfc}</div>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: a.activo !== false ? '#D1FAE5' : '#F3F4F6', color: a.activo !== false ? '#057642' : '#9CA3AF', flexShrink: 0 }}>
          {a.activo !== false ? 'ACTIVO' : 'INACTIVO'}
        </span>
      </div>

      {/* Local */}
      {tieneContrato && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#F0F9FF', borderRadius: '8px' }}>
          <Building2 size={13} color="var(--color-primary)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
            {a.inmueble_nombre} — {a.numero_local}
          </span>
          {tienePDF && <Paperclip size={11} color="#9CA3AF" title="Contrato adjunto" />}
        </div>
      )}

      {/* Renta + Saldo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Contratos</div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>{tieneContrato ? fmt(a.renta_mensual) + '/mes' : '—'}</div>
        </div>
        <SaldoBadge mora={mora} pendiente={pendiente} />
      </div>

      {/* Acciones rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
        {[
          { label: 'Expediente', icon: FileText,   tab: 'resumen' },
          { label: 'Contratos',  icon: FileText,   tab: 'contrato' },
          { label: 'Cobranza',   icon: CreditCard, tab: 'cobranza' },
        ].map(({ label, icon: Icon, tab }) => (
          <button key={label} onClick={() => { logAudit({ modulo: 'ARRENDATARIOS', accion: `VER_${tab.toUpperCase()}`, entidad: 'ARRENDATARIO', entidad_id: a.arrendatario_id, descripcion: `${label}: ${a.nombre_completo}` }); onExpediente(a, tab) }} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '8px 4px', background: '#F9FAFB', border: '1px solid #E5E7EB',
            borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-light)',
          }}>
            <Icon size={14} color="var(--color-primary)" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Arrendatarios() {
  useModuleAudit('ARRENDATARIOS')

  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [expediente, setExpediente] = useState(null) // { data, tab }

  const { data, loading } = usePRP('prp_expediente_arrendatario', { order: { col: 'nombre_completo', asc: true } })
  const lista = data ?? []

  const filtrados = lista.filter(a => {
    const q = search.toLowerCase()
    const matchQ = !q || (a.nombre_completo || '').toLowerCase().includes(q)
      || (a.rfc || '').toLowerCase().includes(q)
      || (a.email || '').toLowerCase().includes(q)
      || (a.numero_local || '').toLowerCase().includes(q)
    const matchF = filtro === 'Todos'
      || (filtro === 'Activos' && a.activo !== false)
      || (filtro === 'Mora' && parseFloat(a.total_mora) > 0)
      || (filtro === 'Pendiente' && parseFloat(a.total_pendiente) > 0)
    return matchQ && matchF
  })

  const total = lista.length
  const activos = lista.filter(a => a.activo !== false).length
  const mora = lista.filter(a => parseFloat(a.total_mora) > 0).length
  const alCorriente = lista.filter(a => parseFloat(a.total_mora) === 0 && parseFloat(a.total_pendiente) === 0 && a.activo !== false).length

  return (
    <div style={{ padding: '24px', maxWidth: '1300px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Arrendatarios</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{total} registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo arrendatario
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Total"       value={total}       icon={Users}          color="var(--color-primary)" />
        <KPICard title="Activos"     value={activos}     icon={CheckCircle}    color="var(--color-success)" />
        <KPICard title="Al corriente" value={alCorriente} icon={CheckCircle}   color="var(--color-success)" />
        <KPICard title="Con mora"    value={mora}        icon={AlertTriangle}  color="var(--color-danger)" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RFC, email, local..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['Todos', 'Activos', 'Mora', 'Pendiente'].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtro === f ? 'var(--color-primary)' : '#E5E7EB',
            background: filtro === f ? 'var(--color-primary)' : 'white',
            color: filtro === f ? 'white' : 'var(--color-text-light)',
          }}>{f}</button>
        ))}
      </div>

      {/* Grid de tarjetas */}
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><LoadingSpinner /></div>
        : filtrados.length === 0
          ? <EmptyState title="Sin arrendatarios" description="No hay arrendatarios que coincidan con la búsqueda." />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {filtrados.map(a => (
                <ArrendatarioCard
                  key={a.arrendatario_id}
                  a={a}
                  onExpediente={(data, tab) => setExpediente({ data, tab })}
                />
              ))}
            </div>
      }

      {/* Expediente modal */}
      {expediente && (
        <ExpedienteModal
          entidad={expediente.data}
          entidadTipo="ARRENDATARIO"
          onClose={() => setExpediente(null)}
        />
      )}
    </div>
  )
}
