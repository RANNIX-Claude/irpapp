import { useState } from 'react'
import { FileText, Plus, Search, Calendar, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'

const CONTRATOS_DEMO = [
  {
    id: 'C-2024-001', inmueble: 'Plaza Reforma Norte', unidad: 'A01',
    arrendatario: 'Farmacia del Ahorro S.A.', rfc: 'FDA920301AB2',
    renta_mensual: 28500, deposito: 57000,
    fecha_inicio: '2024-01-15', fecha_fin: '2025-01-14',
    estado: 'VIGENTE', dias_restantes: 198, tipo: 'Plaza Comercial',
  },
  {
    id: 'C-2024-002', inmueble: 'Torre Corporativa Insurgentes', unidad: 'B03',
    arrendatario: 'Grupo Financiero Azteca', rfc: 'GFA850601XY3',
    renta_mensual: 62000, deposito: 124000,
    fecha_inicio: '2023-07-01', fecha_fin: '2025-06-30',
    estado: 'VIGENTE', dias_restantes: 365, tipo: 'Edificio Oficinas',
  },
  {
    id: 'C-2023-018', inmueble: 'Clínica Especialidades Satélite', unidad: 'C12',
    arrendatario: 'Dr. Ramírez Ortega Luis', rfc: 'RAOL770415MN4',
    renta_mensual: 18000, deposito: 36000,
    fecha_inicio: '2023-03-01', fecha_fin: '2024-02-29',
    estado: 'VENCIDO', dias_restantes: -120, tipo: 'Consultorio',
  },
  {
    id: 'C-2024-007', inmueble: 'Plaza Reforma Norte', unidad: 'A15',
    arrendatario: 'Óptica Devlyn S.A.', rfc: 'ODE890712PQ5',
    renta_mensual: 31200, deposito: 62400,
    fecha_inicio: '2024-03-01', fecha_fin: '2024-12-31',
    estado: 'EN_MORA', dias_restantes: 45, tipo: 'Plaza Comercial',
  },
  {
    id: 'C-2024-010', inmueble: 'Plaza del Valle Monterrey', unidad: 'D22',
    arrendatario: 'Zara México S. de R.L.', rfc: 'ZME010315RS6',
    renta_mensual: 95000, deposito: 190000,
    fecha_inicio: '2024-06-01', fecha_fin: '2026-05-31',
    estado: 'VIGENTE', dias_restantes: 700, tipo: 'Plaza Comercial',
  },
  {
    id: 'C-2024-011', inmueble: 'Nave Industrial Vallejo', unidad: 'I03',
    arrendatario: 'Logística Express Norte', rfc: 'LEN110820TU7',
    renta_mensual: 42000, deposito: 84000,
    fecha_inicio: '2024-09-01', fecha_fin: '2025-08-31',
    estado: 'EN_PROCESO', dias_restantes: 245, tipo: 'Bodega Industrial',
  },
]

function diasLabel(dias) {
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} días`, color: 'var(--color-danger)' }
  if (dias <= 60) return { texto: `Vence en ${dias} días`, color: 'var(--color-warning)' }
  return { texto: `${dias} días restantes`, color: 'var(--color-success)' }
}

function ContratoRow({ c, onClick }) {
  const { texto, color } = diasLabel(c.dias_restantes)
  return (
    <tr
      style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onClick(c)}
    >
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>{c.id}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.tipo}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.inmueble}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Unidad {c.unidad}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.arrendatario}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{c.rfc}</div>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>${c.renta_mensual.toLocaleString()}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Depósito ${c.deposito.toLocaleString()}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '12px' }}>{c.fecha_inicio}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{c.fecha_fin}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color }}>{texto}</div>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <StatusBadge status={c.estado} />
      </td>
    </tr>
  )
}

function DetalleModal({ contrato: c, onClose }) {
  if (!c) return null
  const { texto, color } = diasLabel(c.dias_restantes)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px',
        maxHeight: '85vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Contrato</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{c.id}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-light)' }}>✕</button>
        </div>
        <div style={{ padding: '24px', display: 'grid', gap: '20px' }}>
          {/* Estado banner */}
          <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge status={c.estado} />
            <span style={{ fontSize: '13px', fontWeight: 600, color }}>{texto}</span>
          </div>

          {/* Datos */}
          {[
            ['Inmueble', c.inmueble], ['Unidad', c.unidad], ['Tipo', c.tipo],
            ['Arrendatario', c.arrendatario], ['RFC', c.rfc],
            ['Renta mensual', `$${c.renta_mensual.toLocaleString()}`],
            ['Depósito en garantía', `$${c.deposito.toLocaleString()} (2 meses)`],
            ['Inicio', c.fecha_inicio], ['Vencimiento', c.fecha_fin],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{val}</span>
            </div>
          ))}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '8px' }}>
            {[
              { label: 'Renovar contrato', color: 'var(--color-primary)' },
              { label: 'Generar addenda', color: 'var(--color-secondary)' },
              { label: 'Ver cobranza', color: 'var(--color-success)' },
              { label: 'Cancelar contrato', color: 'var(--color-danger)' },
            ].map(({ label, color: bg }) => (
              <button key={label} style={{
                padding: '8px 16px', background: bg, color: 'white',
                border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Contratos() {
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [selected, setSelected] = useState(null)

  const ESTADOS = ['Todos', 'VIGENTE', 'VENCIDO', 'EN_MORA', 'EN_PROCESO']

  const filtrados = CONTRATOS_DEMO.filter(c => {
    const q = search.toLowerCase()
    const match = c.id.toLowerCase().includes(q) || c.arrendatario.toLowerCase().includes(q) || c.inmueble.toLowerCase().includes(q)
    const estado = estadoFiltro === 'Todos' || c.estado === estadoFiltro
    return match && estado
  })

  const vigentes = CONTRATOS_DEMO.filter(c => c.estado === 'VIGENTE').length
  const vencidos = CONTRATOS_DEMO.filter(c => c.estado === 'VENCIDO').length
  const mora = CONTRATOS_DEMO.filter(c => c.estado === 'EN_MORA').length
  const porVencer = CONTRATOS_DEMO.filter(c => c.dias_restantes > 0 && c.dias_restantes <= 60).length
  const rentaTotal = CONTRATOS_DEMO.filter(c => c.estado === 'VIGENTE').reduce((a, b) => a + b.renta_mensual, 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>
            Contratos de Arrendamiento
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
            {CONTRATOS_DEMO.length} contratos registrados
          </p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-primary)', color: 'white',
          border: 'none', borderRadius: '8px', padding: '10px 20px',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Vigentes" value={vigentes} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Vencidos" value={vencidos} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="En Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Por Vencer (60d)" value={porVencer} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Renta Mensual" value={`$${(rentaTotal / 1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por ID, arrendatario o inmueble..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setEstadoFiltro(e)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: estadoFiltro === e ? 'var(--color-primary)' : '#E5E7EB',
              background: estadoFiltro === e ? 'var(--color-primary)' : 'white',
              color: estadoFiltro === e ? 'white' : 'var(--color-text-light)',
            }}>{e}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <EmptyState title="Sin contratos" description="No hay contratos que coincidan con los filtros aplicados." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Contrato', 'Inmueble', 'Arrendatario', 'Renta', 'Vigencia', 'Plazo', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Renta' ? 'right' : 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => <ContratoRow key={c.id} c={c} onClick={setSelected} />)}
            </tbody>
          </table>
        )}
      </div>

      <DetalleModal contrato={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
