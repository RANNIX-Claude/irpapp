import { useState } from 'react'
import { DollarSign, Search, CheckCircle, Clock, AlertTriangle, TrendingUp, Download, RefreshCw } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'

const MES_ACTUAL = 'Jun 2026'

const COBRANZA_DEMO = [
  { id: 'COB-2026-1201', contrato: 'C-2024-001', arrendatario: 'Farmacia del Ahorro S.A.', inmueble: 'Plaza Reforma Norte / A01', concepto: 'Renta Jun 2026', monto: 28500, iva: 4560, total: 33060, vencimiento: '2026-06-05', pago_fecha: '2026-06-03', estado: 'COMPLETADO', metodo: 'Transferencia', referencia: 'TRF20260603001' },
  { id: 'COB-2026-1202', contrato: 'C-2024-002', arrendatario: 'Grupo Financiero Azteca', inmueble: 'Torre Corp. Insurgentes / B03', concepto: 'Renta Jun 2026', monto: 62000, iva: 9920, total: 71920, vencimiento: '2026-06-05', pago_fecha: '2026-06-04', estado: 'COMPLETADO', metodo: 'SPEI', referencia: 'SPE20260604089' },
  { id: 'COB-2026-1203', contrato: 'C-2023-018', arrendatario: 'Dr. Ramírez Ortega Luis', inmueble: 'Clínica Satélite / C12', concepto: 'Renta Jun 2026 + Mora 5%', monto: 18000, iva: 2880, total: 21780, vencimiento: '2026-06-05', pago_fecha: null, estado: 'EN_MORA', metodo: null, referencia: null },
  { id: 'COB-2026-1204', contrato: 'C-2024-007', arrendatario: 'Óptica Devlyn S.A.', inmueble: 'Plaza Reforma Norte / A15', concepto: 'Renta Jun 2026', monto: 31200, iva: 4992, total: 36192, vencimiento: '2026-06-05', pago_fecha: null, estado: 'PENDIENTE', metodo: null, referencia: null },
  { id: 'COB-2026-1205', contrato: 'C-2024-010', arrendatario: 'Zara México S. de R.L.', inmueble: 'Plaza del Valle MTY / D22', concepto: 'Renta Jun 2026', monto: 95000, iva: 15200, total: 110200, vencimiento: '2026-06-05', pago_fecha: '2026-06-02', estado: 'COMPLETADO', metodo: 'SPEI', referencia: 'SPE20260602441' },
  { id: 'COB-2026-1206', contrato: 'C-2024-011', arrendatario: 'Logística Express Norte', inmueble: 'Nave Industrial Vallejo / I03', concepto: 'Renta Jun 2026', monto: 42000, iva: 6720, total: 48720, vencimiento: '2026-06-05', pago_fecha: null, estado: 'PENDIENTE', metodo: null, referencia: null },
]

const ESTADO_COLOR = {
  COMPLETADO: { bg: '#ECFDF5', text: '#057642', label: 'Pagado' },
  PENDIENTE: { bg: '#FFF7ED', text: '#B45309', label: 'Pendiente' },
  EN_MORA: { bg: '#FEF2F2', text: '#B24020', label: 'En Mora' },
}

export default function Cobranza() {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const filtrados = COBRANZA_DEMO.filter(c => {
    const q = search.toLowerCase()
    const match = c.arrendatario.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.contrato.toLowerCase().includes(q)
    const estado = filtroEstado === 'Todos' || c.estado === filtroEstado
    return match && estado
  })

  const totalCargado = COBRANZA_DEMO.reduce((a, b) => a + b.total, 0)
  const totalCobrado = COBRANZA_DEMO.filter(c => c.estado === 'COMPLETADO').reduce((a, b) => a + b.total, 0)
  const totalPendiente = COBRANZA_DEMO.filter(c => c.estado === 'PENDIENTE').reduce((a, b) => a + b.total, 0)
  const totalMora = COBRANZA_DEMO.filter(c => c.estado === 'EN_MORA').reduce((a, b) => a + b.total, 0)
  const pctCobrado = Math.round((totalCobrado / totalCargado) * 100)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>
            Cobranza — {MES_ACTUAL}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
            {COBRANZA_DEMO.length} cargos generados · {pctCobrado}% cobrado
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: '1.5px solid #E5E7EB', background: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)' }}>
            <RefreshCw size={14} /> Generar cargos
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: 'none', background: 'var(--color-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'white' }}>
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Total Cargado" value={`$${(totalCargado / 1000).toFixed(0)}K`} icon={DollarSign} color="var(--color-primary)" />
        <KPICard title="Cobrado" value={`$${(totalCobrado / 1000).toFixed(0)}K`} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Pendiente" value={`$${(totalPendiente / 1000).toFixed(0)}K`} icon={Clock} color="var(--color-warning)" />
        <KPICard title="En Mora" value={`$${(totalMora / 1000).toFixed(0)}K`} icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      {/* Barra progreso cobro */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
          <span style={{ fontWeight: 600 }}>Avance de cobranza {MES_ACTUAL}</span>
          <span style={{ fontWeight: 700, color: pctCobrado >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>{pctCobrado}%</span>
        </div>
        <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pctCobrado}%`, background: 'linear-gradient(90deg, var(--color-success), #34D399)', borderRadius: '5px', transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px' }}>
          {[
            { label: 'Pagado', color: 'var(--color-success)', val: `$${(totalCobrado / 1000).toFixed(0)}K` },
            { label: 'Pendiente', color: 'var(--color-warning)', val: `$${(totalPendiente / 1000).toFixed(0)}K` },
            { label: 'Mora', color: 'var(--color-danger)', val: `$${(totalMora / 1000).toFixed(0)}K` },
          ].map(({ label, color, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
              <span style={{ color: 'var(--color-text-light)' }}>{label}: </span>
              <span style={{ fontWeight: 700 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar arrendatario, contrato o folio..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Todos', 'COMPLETADO', 'PENDIENTE', 'EN_MORA'].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroEstado === e ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroEstado === e ? 'var(--color-primary)' : 'white',
              color: filtroEstado === e ? 'white' : 'var(--color-text-light)',
            }}>{e === 'COMPLETADO' ? 'Pagado' : e === 'EN_MORA' ? 'En Mora' : e}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <EmptyState title="Sin registros" description="No hay cargos que coincidan con los filtros." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Folio', 'Arrendatario / Unidad', 'Concepto', 'Total', 'Vencimiento', 'Pago', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const est = ESTADO_COLOR[c.estado] || {}
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-primary)', fontFamily: 'monospace' }}>{c.id}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.contrato}</div>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{c.arrendatario}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble}</div>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: '12px', color: 'var(--color-text-light)' }}>{c.concepto}</td>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontWeight: 700 }}>${c.total.toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>+ IVA ${c.iva.toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '13px 14px', fontSize: '12px' }}>{c.vencimiento}</td>
                    <td style={{ padding: '13px 14px', fontSize: '12px' }}>
                      {c.pago_fecha ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{c.pago_fecha}</span> : <span style={{ color: 'var(--color-text-light)' }}>—</span>}
                      {c.referencia && <div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{c.referencia}</div>}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: est.bg, color: est.text }}>{est.label}</span>
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      {c.estado !== 'COMPLETADO' && (
                        <button style={{ fontSize: '11px', fontWeight: 600, color: 'white', background: 'var(--color-success)', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
                          Registrar pago
                        </button>
                      )}
                      {c.estado === 'COMPLETADO' && (
                        <button style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>
                          Ver CFDI
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
