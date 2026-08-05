import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { Droplets, Plus, Search, CheckCircle, Clock, AlertTriangle, X, ChevronRight, FileText, Printer } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

const PRECIO_M3 = 38.50

const MEDIDORES_DEMO = [
  { id: 'm01', local: 'Local A-01', arrendatario: 'Farmacia del Ahorro S.A.', medidor: 'M-2024-001', lecturas: [
    { id: 'l1', fecha: '2026-06-01', anterior: 1245, actual: 1312, consumo: 67, total: 2579.50, estado: 'PAGADO', fecha_pago: '2026-06-08' },
    { id: 'l2', fecha: '2026-07-01', anterior: 1312, actual: 1389, consumo: 77, total: 2964.50, estado: 'PENDIENTE', fecha_pago: null },
  ]},
  { id: 'm02', local: 'Local A-04', arrendatario: 'Óptica Devlyn S.A.', medidor: 'M-2024-002', lecturas: [
    { id: 'l3', fecha: '2026-06-01', anterior: 874, actual: 921, consumo: 47, total: 1809.50, estado: 'PAGADO', fecha_pago: '2026-06-10' },
    { id: 'l4', fecha: '2026-07-01', anterior: 921, actual: 968, consumo: 47, total: 1809.50, estado: 'PENDIENTE', fecha_pago: null },
  ]},
  { id: 'm03', local: 'Local B-02', arrendatario: 'Nutrisa', medidor: 'M-2024-003', lecturas: [
    { id: 'l5', fecha: '2026-06-01', anterior: 2103, actual: 2198, consumo: 95, total: 3657.50, estado: 'PAGADO', fecha_pago: '2026-06-07' },
    { id: 'l6', fecha: '2026-07-01', anterior: 2198, actual: 2301, consumo: 103, total: 3965.50, estado: 'EN_MORA', fecha_pago: null },
  ]},
  { id: 'm04', local: 'Local B-05', arrendatario: 'Dr. Ramírez Ortega Luis', medidor: 'M-2024-004', lecturas: [
    { id: 'l7', fecha: '2026-06-01', anterior: 445, actual: 483, consumo: 38, total: 1463.00, estado: 'PAGADO', fecha_pago: '2026-06-09' },
    { id: 'l8', fecha: '2026-07-01', anterior: 483, actual: 521, consumo: 38, total: 1463.00, estado: 'PENDIENTE', fecha_pago: null },
  ]},
  { id: 'm05', local: 'Local C-01', arrendatario: 'Zara México S. de R.L.', medidor: 'M-2024-005', lecturas: [
    { id: 'l9', fecha: '2026-06-01', anterior: 3821, actual: 3964, consumo: 143, total: 5505.50, estado: 'PAGADO', fecha_pago: '2026-06-06' },
    { id: 'l10', fecha: '2026-07-01', anterior: 3964, actual: 4121, consumo: 157, total: 6044.50, estado: 'PENDIENTE', fecha_pago: null },
  ]},
  { id: 'm06', local: 'Área Común Norte', arrendatario: '(Plaza IWOL)', medidor: 'M-2024-AC1', lecturas: [
    { id: 'l11', fecha: '2026-06-01', anterior: 8920, actual: 9214, consumo: 294, total: 11319.00, estado: 'PAGADO', fecha_pago: '2026-06-05' },
    { id: 'l12', fecha: '2026-07-01', anterior: 9214, actual: 9531, consumo: 317, total: 12204.50, estado: 'PENDIENTE', fecha_pago: null },
  ]},
]

function fmt(n) { return '$' + (parseFloat(n)||0).toLocaleString('es-MX', {minimumFractionDigits:2}) }

// ── Modal lectura y recibo ─────────────────────────────────────────────────────
function MedidorModal({ med, onClose }) {
  const [tab, setTab] = useState('lecturas')
  const [nueva, setNueva] = useState({ fecha: new Date().toISOString().split('T')[0], actual: '' })
  const ultimaLectura = med.lecturas[med.lecturas.length - 1]
  const pendientes = med.lecturas.filter(l => l.estado !== 'PAGADO')

  const calcTotal = (anterior, actual) => ((actual - anterior) * PRECIO_M3).toFixed(2)

  const handlePrintRecibo = (l) => {
    const w = window.open('', '_blank', 'width=700,height=500')
    w.document.write(`<!DOCTYPE html><html><head><title>Recibo Agua</title><style>
      body{font-family:Arial,sans-serif;margin:40px;font-size:13px;color:#1A1A1A}
      h1{font-size:18px;color:#0A66C2;margin:0} .sub{color:#6B7280;font-size:12px}
      .header{display:flex;justify-content:space-between;padding-bottom:16px;border-bottom:2px solid #0A66C2;margin-bottom:20px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:20px}
      .lbl{color:#6B7280;font-weight:600;font-size:11px;text-transform:uppercase}
      .val{font-size:13px;font-weight:600}
      .total-box{background:#EFF6FF;border:2px solid #0A66C2;border-radius:8px;padding:16px;text-align:center;margin:20px 0}
      .total-box .amount{font-size:28px;font-weight:800;color:#0A66C2}
      @media print{body{margin:20px}}
    </style></head><body>
      <div class="header">
        <div><h1>INMOBILIARIA ALCEDINES DEL NORTE</h1><div class="sub">Recibo de Agua Potable</div></div>
        <div style="text-align:right"><div style="font-family:monospace;font-size:14px;font-weight:700;color:#0A66C2">REC-AGU-${l.id.toUpperCase()}</div><div class="sub">${l.fecha}</div></div>
      </div>
      <div class="grid">
        <div><div class="lbl">Local</div><div class="val">${med.local}</div></div>
        <div><div class="lbl">Arrendatario</div><div class="val">${med.arrendatario}</div></div>
        <div><div class="lbl">No. Medidor</div><div class="val">${med.medidor}</div></div>
        <div><div class="lbl">Período</div><div class="val">${l.fecha}</div></div>
        <div><div class="lbl">Lectura anterior</div><div class="val">${l.anterior.toLocaleString()} m³</div></div>
        <div><div class="lbl">Lectura actual</div><div class="val">${l.actual.toLocaleString()} m³</div></div>
        <div><div class="lbl">Consumo</div><div class="val">${l.consumo} m³</div></div>
        <div><div class="lbl">Tarifa</div><div class="val">$${PRECIO_M3}/m³</div></div>
      </div>
      <div class="total-box">
        <div class="lbl" style="margin-bottom:6px">Total a pagar</div>
        <div class="amount">${fmt(l.total)}</div>
      </div>
    </body></html>`)
    w.document.close(); w.print()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '640px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Droplets size={18} color="var(--color-primary)" />
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>{med.medidor}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{med.local}</h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{med.arrendatario}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          {[['lecturas','Historial lecturas'],['nueva','Nueva lectura']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '12px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: 'none', borderBottom: tab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: 'none', color: tab === key ? 'var(--color-primary)' : 'var(--color-text-light)',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'lecturas' && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {[...med.lecturas].reverse().map(l => {
                const colorEst = l.estado === 'PAGADO' ? 'var(--color-success)' : l.estado === 'EN_MORA' ? 'var(--color-danger)' : 'var(--color-warning)'
                return (
                  <div key={l.id} style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr) auto', gap: '8px 16px', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Período</div><div style={{ fontWeight: 700 }}>{l.fecha}</div></div>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Consumo</div><div style={{ fontWeight: 700 }}>{l.consumo} m³</div></div>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div><div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(l.total)}</div></div>
                    <div>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: colorEst + '20', color: colorEst }}>{l.estado}</span>
                      {l.fecha_pago && <div style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '2px' }}>{l.fecha_pago}</div>}
                    </div>
                    <button onClick={() => handlePrintRecibo(l)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      <Printer size={12} /> Recibo
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'nueva' && (
            <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
              <div style={{ background: '#F0F9FF', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Lectura anterior</div><div style={{ fontWeight: 700, fontSize: '16px' }}>{ultimaLectura.actual.toLocaleString()} m³</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Tarifa actual</div><div style={{ fontWeight: 700, fontSize: '16px' }}>${PRECIO_M3}/m³</div></div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>Fecha de lectura</label>
                <input type="date" value={nueva.fecha} onChange={e => setNueva(n => ({...n, fecha: e.target.value}))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>Lectura actual (m³)</label>
                <input type="number" value={nueva.actual} onChange={e => setNueva(n => ({...n, actual: e.target.value}))} placeholder="Ej. 1390"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              {nueva.actual && +nueva.actual > ultimaLectura.actual && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Consumo</div><div style={{ fontWeight: 700, fontSize: '17px' }}>{+nueva.actual - ultimaLectura.actual} m³</div></div>
                    <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Total</div><div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-success)' }}>{fmt(calcTotal(ultimaLectura.actual, +nueva.actual))}</div></div>
                    <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Estado</div><div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-warning)' }}>PENDIENTE</div></div>
                  </div>
                </div>
              )}
              <button disabled={!nueva.actual || +nueva.actual <= ultimaLectura.actual}
                style={{ padding: '11px', background: nueva.actual && +nueva.actual > ultimaLectura.actual ? 'var(--color-primary)' : '#E5E7EB', color: nueva.actual && +nueva.actual > ultimaLectura.actual ? 'white' : '#9CA3AF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: nueva.actual && +nueva.actual > ultimaLectura.actual ? 'pointer' : 'default' }}>
                Registrar lectura y generar recibo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Agua() {
  useModuleAudit('AGUA')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [selected, setSelected] = useState(null)

  const todasLecturas = MEDIDORES_DEMO.flatMap(m => m.lecturas)
  const pendientes = todasLecturas.filter(l => l.estado === 'PENDIENTE').length
  const enMora = todasLecturas.filter(l => l.estado === 'EN_MORA').length
  const totalRecaudado = todasLecturas.filter(l => l.estado === 'PAGADO').reduce((a, b) => a + b.total, 0)
  const consumoTotal = todasLecturas.reduce((a, b) => a + (b.consumo || 0), 0)

  const filtrados = MEDIDORES_DEMO.filter(m => {
    const q = search.toLowerCase()
    const matchQ = !q || m.local.toLowerCase().includes(q) || m.arrendatario.toLowerCase().includes(q) || m.medidor.toLowerCase().includes(q)
    if (!matchQ) return false
    if (filtroEstado === 'Todos') return true
    const ultima = m.lecturas[m.lecturas.length - 1]
    return ultima.estado === filtroEstado
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Droplets size={22} color="var(--color-primary)" /> Agua Potable
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{MEDIDORES_DEMO.length} medidores registrados · Tarifa ${PRECIO_M3}/m³</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} /> Nueva lectura masiva
        </button>
      </div>

      {/* KPIs clickeables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { title: 'Pendientes de pago', value: pendientes, icon: Clock, color: 'var(--color-warning)', filtro: 'PENDIENTE' },
          { title: 'En Mora', value: enMora, icon: AlertTriangle, color: 'var(--color-danger)', filtro: 'EN_MORA' },
          { title: 'Recaudado mes', value: `$${(totalRecaudado/1000).toFixed(0)}K`, icon: CheckCircle, color: 'var(--color-success)', filtro: 'PAGADO' },
          { title: 'Consumo total m³', value: consumoTotal.toLocaleString(), icon: Droplets, color: 'var(--color-primary)', filtro: 'Todos' },
        ].map(({ title, value, icon: Icon, color, filtro }) => (
          <div key={title} onClick={() => setFiltroEstado(filtro === filtroEstado ? 'Todos' : filtro)}
            style={{ background: 'white', borderRadius: '10px', border: `2px solid ${filtroEstado === filtro && filtro !== 'Todos' ? color : '#E5E7EB'}`, padding: '16px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>{title}</div>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
            {filtro !== 'Todos' && <div style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '4px' }}>clic para filtrar</div>}
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar local, arrendatario o medidor..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        {['Todos','PENDIENTE','EN_MORA','PAGADO'].map(f => (
          <button key={f} onClick={() => setFiltroEstado(f)} style={{
            padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtroEstado === f ? 'var(--color-primary)' : '#E5E7EB',
            background: filtroEstado === f ? 'var(--color-primary)' : 'white',
            color: filtroEstado === f ? 'white' : 'var(--color-text-light)',
          }}>{f}</button>
        ))}
      </div>

      {/* Grid de medidores */}
      {filtrados.length === 0 ? (
        <EmptyState title="Sin medidores" description="No hay medidores que coincidan con el filtro." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '14px' }}>
          {filtrados.map(m => {
            const ultima = m.lecturas[m.lecturas.length - 1]
            const colorEst = ultima.estado === 'PAGADO' ? 'var(--color-success)' : ultima.estado === 'EN_MORA' ? 'var(--color-danger)' : 'var(--color-warning)'
            return (
              <div key={m.id} onClick={() => setSelected(m)}
                style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,102,194,0.10)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{m.local}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>{m.arrendatario}</div>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700 }}>{m.medidor}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', padding: '10px 0', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', margin: '8px 0' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Último consumo</div><div style={{ fontWeight: 700, fontSize: '15px' }}>{ultima.consumo} m³</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div><div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-primary)' }}>{fmt(ultima.total)}</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Lecturas</div><div style={{ fontWeight: 700, fontSize: '15px' }}>{m.lecturas.length}</div></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: colorEst + '20', color: colorEst }}>{ultima.estado}</span>
                  <ChevronRight size={15} color="var(--color-text-light)" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && <MedidorModal med={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
