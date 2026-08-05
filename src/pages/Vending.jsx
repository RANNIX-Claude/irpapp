import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { ShoppingBag, Plus, ChevronRight, X, TrendingUp, DollarSign, Calendar, Printer } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'

function fmt(n) { return '$' + (parseFloat(n)||0).toLocaleString('es-MX', {minimumFractionDigits:2}) }
function fmtK(n) { return '$' + (parseFloat(n)/1000).toFixed(1) + 'K' }

const MAQUINAS_DEMO = [
  { id: 'v01', nombre: 'Vending Central', ubicacion: 'Pasillo principal frente a Farmacia', proveedor: 'Compañía Refresquera del Norte S.A.', comision_pct: 15, activa: true, cierres: [
    { id: 'c1', semana: '2026-06-23/2026-06-29', fecha_cierre: '2026-06-30', monto_bruto: 3840, comision: 576, monto_neto: 3264, productos: 128, registrado_por: 'Roberto A.', notas: '' },
    { id: 'c2', semana: '2026-06-30/2026-07-06', fecha_cierre: '2026-07-07', monto_bruto: 4120, comision: 618, monto_neto: 3502, productos: 138, registrado_por: 'Roberto A.', notas: 'Máquina sin cambio el miércoles' },
    { id: 'c3', semana: '2026-07-07/2026-07-13', fecha_cierre: '2026-07-14', monto_bruto: 3950, comision: 592.50, monto_neto: 3357.50, productos: 132, registrado_por: 'Roberto A.', notas: '' },
    { id: 'c4', semana: '2026-07-14/2026-07-20', fecha_cierre: null, monto_bruto: null, comision: null, monto_neto: null, productos: null, registrado_por: null, notas: '', pendiente: true },
  ]},
  { id: 'v02', nombre: 'Vending Estacionamiento', ubicacion: 'Entrada estacionamiento subterráneo', proveedor: 'Distribuidora Snacks Premium', comision_pct: 12, activa: true, cierres: [
    { id: 'c5', semana: '2026-06-23/2026-06-29', fecha_cierre: '2026-06-30', monto_bruto: 1560, comision: 187.20, monto_neto: 1372.80, productos: 52, registrado_por: 'Roberto A.', notas: '' },
    { id: 'c6', semana: '2026-06-30/2026-07-06', fecha_cierre: '2026-07-07', monto_bruto: 1720, comision: 206.40, monto_neto: 1513.60, productos: 58, registrado_por: 'Roberto A.', notas: '' },
    { id: 'c7', semana: '2026-07-07/2026-07-13', fecha_cierre: '2026-07-14', monto_bruto: 1840, comision: 220.80, monto_neto: 1619.20, productos: 62, registrado_por: 'Roberto A.', notas: '' },
    { id: 'c8', semana: '2026-07-14/2026-07-20', fecha_cierre: null, monto_bruto: null, comision: null, monto_neto: null, productos: null, registrado_por: null, notas: '', pendiente: true },
  ]},
  { id: 'v03', nombre: 'Vending Locales B', ubicacion: 'Corredor B entre locales B-05 y B-06', proveedor: 'Compañía Refresquera del Norte S.A.', comision_pct: 15, activa: false, cierres: [
    { id: 'c9', semana: '2026-06-23/2026-06-29', fecha_cierre: '2026-06-30', monto_bruto: 980, comision: 147, monto_neto: 833, productos: 32, registrado_por: 'Roberto A.', notas: 'Máquina fuera de servicio parte de la semana' },
  ]},
]

// ── Modal detalle máquina ──────────────────────────────────────────────────────
function MaquinaModal({ maq, onClose }) {
  const [tab, setTab] = useState('historial')
  const [cierre, setCierre] = useState({ monto_bruto: '', productos: '', notas: '', fecha: new Date().toISOString().split('T')[0] })

  const cerradosCierres = maq.cierres.filter(c => !c.pendiente)
  const pendienteCierre = maq.cierres.find(c => c.pendiente)
  const totalNeto = cerradosCierres.reduce((a, b) => a + (b.monto_neto || 0), 0)
  const totalBruto = cerradosCierres.reduce((a, b) => a + (b.monto_bruto || 0), 0)

  const comisionCalc = cierre.monto_bruto ? (+cierre.monto_bruto * maq.comision_pct / 100) : 0
  const netoCalc = cierre.monto_bruto ? (+cierre.monto_bruto - comisionCalc) : 0

  const handlePrint = (c) => {
    const w = window.open('', '_blank', 'width=600,height=450')
    w.document.write(`<!DOCTYPE html><html><head><title>Cierre Vending</title><style>
      body{font-family:Arial,sans-serif;margin:40px;font-size:13px}
      h1{font-size:18px;color:#0A66C2;margin:0}.sub{color:#6B7280;font-size:12px}
      .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0A66C2;padding-bottom:16px;margin-bottom:20px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px}
      .lbl{color:#6B7280;font-weight:600;font-size:11px;text-transform:uppercase}.val{font-weight:600}
      .totals{background:#F9FAFB;border-radius:8px;padding:14px;margin:20px 0}
      @media print{body{margin:20px}}
    </style></head><body>
      <div class="hdr"><div><h1>CIERRE SEMANAL VENDING</h1><div class="sub">${maq.nombre} — ${maq.ubicacion}</div></div>
      <div style="text-align:right"><div style="font-weight:700;color:#0A66C2">CIE-${c.id.toUpperCase()}</div><div class="sub">${c.fecha_cierre}</div></div></div>
      <div class="grid">
        <div><div class="lbl">Semana</div><div class="val">${c.semana}</div></div>
        <div><div class="lbl">Proveedor</div><div class="val">${maq.proveedor}</div></div>
        <div><div class="lbl">Productos vendidos</div><div class="val">${c.productos}</div></div>
        <div><div class="lbl">Comisión</div><div class="val">${maq.comision_pct}%</div></div>
      </div>
      <div class="totals">
        <div class="grid">
          <div><div class="lbl">Monto bruto</div><div style="font-size:20px;font-weight:800">${fmt(c.monto_bruto)}</div></div>
          <div><div class="lbl">A plaza (neto)</div><div style="font-size:20px;font-weight:800;color:#057642">${fmt(c.monto_neto)}</div></div>
          <div><div class="lbl">Comisión proveedor</div><div style="font-weight:700;color:#B45309">${fmt(c.comision)}</div></div>
        </div>
      </div>
      ${c.notas ? `<div><div class="lbl">Notas</div><div>${c.notas}</div></div>` : ''}
    </body></html>`)
    w.document.close(); w.print()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '660px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ShoppingBag size={17} color="var(--color-primary)" />
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: maq.activa ? '#D1FAE5' : '#F3F4F6', color: maq.activa ? '#057642' : '#9CA3AF' }}>{maq.activa ? 'ACTIVA' : 'INACTIVA'}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{maq.nombre}</h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{maq.ubicacion}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>

        {/* Resumen */}
        <div style={{ padding: '14px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', flexShrink: 0 }}>
          <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Total bruto acum.</div><div style={{ fontWeight: 800, fontSize: '17px' }}>{fmt(totalBruto)}</div></div>
          <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Neto para plaza</div><div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-success)' }}>{fmt(totalNeto)}</div></div>
          <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>Comisión {maq.comision_pct}%</div><div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-warning)' }}>{fmt(totalBruto - totalNeto)}</div></div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          {[['historial','Historial cierres'],['cerrar','Registrar cierre']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', borderBottom: tab === k ? '2px solid var(--color-primary)' : '2px solid transparent', background: 'none', color: tab === k ? 'var(--color-primary)' : 'var(--color-text-light)' }}>{l}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'historial' && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {[...maq.cierres].reverse().map(c => (
                c.pendiente ? (
                  <div key={c.id} style={{ border: '2px dashed #E8A020', borderRadius: '10px', padding: '16px', background: '#FFFBEB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontWeight: 600, color: '#B45309' }}>Semana {c.semana}</div><div style={{ fontSize: '12px', color: '#9CA3AF' }}>Pendiente de cierre</div></div>
                    <button onClick={() => setTab('cerrar')} style={{ padding: '7px 14px', background: 'var(--color-secondary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Cerrar semana</button>
                  </div>
                ) : (
                  <div key={c.id} style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Semana</div><div style={{ fontWeight: 600, fontSize: '12px' }}>{c.semana.split('/')[0]}</div></div>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Bruto</div><div style={{ fontWeight: 700 }}>{fmt(c.monto_bruto)}</div></div>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Neto plaza</div><div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{fmt(c.monto_neto)}</div></div>
                    <div><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Productos</div><div style={{ fontWeight: 700 }}>{c.productos}</div></div>
                    <button onClick={() => handlePrint(c)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      <Printer size={12} /> PDF
                    </button>
                  </div>
                )
              ))}
            </div>
          )}

          {tab === 'cerrar' && (
            <div style={{ display: 'grid', gap: '14px', maxWidth: '400px' }}>
              {[
                { label: 'Fecha de cierre', type: 'date', key: 'fecha' },
                { label: 'Monto bruto recaudado ($)', type: 'number', key: 'monto_bruto', placeholder: 'Ej. 3840.00' },
                { label: 'Productos vendidos (pzas)', type: 'number', key: 'productos', placeholder: 'Ej. 128' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>{f.label}</label>
                  <input type={f.type} value={cierre[f.key]} onChange={e => setCierre(c => ({...c, [f.key]: e.target.value}))} placeholder={f.placeholder}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>Notas (opcional)</label>
                <textarea value={cierre.notas} onChange={e => setCierre(c => ({...c, notas: e.target.value}))} rows={2}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              {cierre.monto_bruto && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Comisión ({maq.comision_pct}%)</div><div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{fmt(comisionCalc)}</div></div>
                  <div><div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>Neto para plaza</div><div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--color-success)' }}>{fmt(netoCalc)}</div></div>
                </div>
              )}
              <button disabled={!cierre.monto_bruto}
                style={{ padding: '11px', background: cierre.monto_bruto ? 'var(--color-primary)' : '#E5E7EB', color: cierre.monto_bruto ? 'white' : '#9CA3AF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: cierre.monto_bruto ? 'pointer' : 'default' }}>
                Registrar cierre semanal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Vending() {
  useModuleAudit('VENDING')
  const [selected, setSelected] = useState(null)

  const totalBrutoMes = MAQUINAS_DEMO.flatMap(m => m.cierres.filter(c => !c.pendiente)).reduce((a, b) => a + (b.monto_bruto || 0), 0)
  const totalNetoMes = MAQUINAS_DEMO.flatMap(m => m.cierres.filter(c => !c.pendiente)).reduce((a, b) => a + (b.monto_neto || 0), 0)
  const pendientesCierre = MAQUINAS_DEMO.filter(m => m.activa && m.cierres.some(c => c.pendiente)).length

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="var(--color-primary)" /> Vending Machine
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{MAQUINAS_DEMO.filter(m => m.activa).length} máquinas activas · Cierre semanal (lunes)</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Cierres pendientes" value={pendientesCierre} icon={Calendar} color="var(--color-warning)" />
        <KPICard title="Total bruto acum." value={fmtK(totalBrutoMes)} icon={ShoppingBag} color="var(--color-primary)" />
        <KPICard title="Neto para plaza" value={fmtK(totalNetoMes)} icon={DollarSign} color="var(--color-success)" />
        <KPICard title="Máquinas activas" value={MAQUINAS_DEMO.filter(m => m.activa).length} icon={TrendingUp} color="var(--color-secondary)" />
      </div>

      {/* Cards de máquinas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: '14px' }}>
        {MAQUINAS_DEMO.map(m => {
          const cerrados = m.cierres.filter(c => !c.pendiente)
          const tiene_pendiente = m.cierres.some(c => c.pendiente)
          const neto = cerrados.reduce((a, b) => a + (b.monto_neto || 0), 0)
          const ultimoCierre = cerrados[cerrados.length - 1]
          return (
            <div key={m.id} onClick={() => setSelected(m)}
              style={{ background: 'white', borderRadius: '10px', border: `1.5px solid ${tiene_pendiente && m.activa ? '#FCD34D' : '#E5E7EB'}`, padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,102,194,0.10)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{m.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>{m.ubicacion}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '2px' }}>Proveedor: {m.proveedor}</div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: m.activa ? '#D1FAE5' : '#F3F4F6', color: m.activa ? '#057642' : '#9CA3AF', flexShrink: 0 }}>
                  {m.activa ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '12px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Cierres</div><div style={{ fontWeight: 700, fontSize: '16px' }}>{cerrados.length}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Neto acum.</div><div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-success)' }}>{fmtK(neto)}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>Comisión</div><div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-warning)' }}>{m.comision_pct}%</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {tiene_pendiente && m.activa ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠️ Cierre pendiente esta semana
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                    Último cierre: {ultimoCierre?.fecha_cierre || '—'}
                  </span>
                )}
                <ChevronRight size={15} color="var(--color-text-light)" />
              </div>
            </div>
          )
        })}
      </div>

      {selected && <MaquinaModal maq={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
