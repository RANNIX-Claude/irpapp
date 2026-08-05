import { useModuleAudit } from '../hooks/useAudit'
import { useState, useMemo } from 'react'
import { CalendarRange, TrendingUp, TrendingDown, DollarSign, X, ChevronLeft, ChevronRight, CheckCircle, Clock, Printer } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

function fmt(n) { return '$' + (parseFloat(n)||0).toLocaleString('es-MX', {minimumFractionDigits:2}) }
function fmtK(n) { const v=parseFloat(n)||0; return v>=1000 ? '$' + (v/1000).toFixed(1) + 'K' : fmt(v) }

function startOfWeek(d) {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(dt.setDate(diff))
}
function endOfWeek(d) {
  const s = startOfWeek(d)
  return new Date(s.getTime() + 6 * 24 * 60 * 60 * 1000)
}
function isoDate(d) { return d.toISOString().split('T')[0] }

// ── Drawer de detalle ──────────────────────────────────────────────────────────
function DetalleDrawer({ titulo, items, tipo, onClose }) {
  const total = items.reduce((a, b) => a + (parseFloat(b.monto_pagado || b.monto || b.total) || 0), 0)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'white', width: '420px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{tipo === 'ingreso' ? 'Ingresos' : tipo === 'gasto' ? 'Gastos' : 'Detalle'}</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700 }}>{titulo}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', padding: '10px 12px', background: '#F9FAFB', borderRadius: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.arrendatario_nombre || item.proveedor_nombre || item.descripcion || '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '1px' }}>
                    {item.unidad_numero ? `${item.inmueble_nombre} · ${item.unidad_numero}` : ''}
                    {item.fecha ? ` ${item.fecha}` : ''}
                    {item.forma_pago ? ` · ${item.forma_pago}` : ''}
                    {item.grupo_nombre ? ` · ${item.grupo_nombre}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)', textAlign: 'right' }}>
                  {fmt(item.monto_pagado || 0)}
                </div>
              </div>
            ))}
            {items.length > 0 && (
              <div style={{ borderTop: '2px solid #E5E7EB', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px' }}>
                <span>Total ({items.length})</span>
                <span style={{ color: tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)' }}>{fmt(total)}</span>
              </div>
            )}
            {items.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '40px 0', fontSize: '13px' }}>Sin registros en esta semana.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bloque de sección clickeable ───────────────────────────────────────────────
function SeccionBloque({ titulo, subtitulo, monto, cantidad, color, bg, items, tipo, icon: Icon, onDrill }) {
  return (
    <div onClick={() => onDrill(titulo, items, tipo)}
      style={{ background: bg || 'white', borderRadius: '10px', border: `1.5px solid ${color}40`, padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${color}25`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '2px' }}>{titulo}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{subtitulo}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon size={16} color={color} />
          <ChevronRight size={14} color="#9CA3AF" />
        </div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: 900, color }}>{fmtK(monto)}</div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>{cantidad} registro{cantidad !== 1 ? 's' : ''}</div>
    </div>
  )
}

export default function ResumenSemanal() {
  useModuleAudit('RESUMEN_SEMANAL')
  const [semanaBase, setSemanaBase] = useState(new Date())
  const [drawer, setDrawer] = useState(null)

  const inicio = startOfWeek(semanaBase)
  const fin = endOfWeek(semanaBase)
  const esEstaSemana = isoDate(inicio) === isoDate(startOfWeek(new Date()))

  const { data: cobros, loading: lc } = usePRP('prp_cobros')
  const { data: gastos, loading: lg } = usePRP('prp_gastos')
  const { data: fondo, loading: lf } = usePRP('prp_fondo_semana')

  const loading = lc || lg || lf

  const navSemana = (dir) => {
    const d = new Date(semanaBase)
    d.setDate(d.getDate() + dir * 7)
    setSemanaBase(d)
  }

  // Filtrar por semana
  const ingresosS = useMemo(() => (cobros || []).filter(c => {
    if (c.estatus !== 'PAGADO' || !c.fecha_pago_real) return false
    const f = c.fecha_pago_real
    return f >= isoDate(inicio) && f <= isoDate(fin)
  }), [cobros, inicio, fin])

  const gastosS = useMemo(() => (gastos || []).filter(g => {
    const f = g.fecha || g.semana_inicio
    if (!f) return false
    return f >= isoDate(inicio) && f <= isoDate(fin)
  }), [gastos, inicio, fin])

  const totalIngresos = ingresosS.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalGastos = gastosS.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const resultado = totalIngresos - totalGastos
  const fondoActual = (fondo || []).reduce((a, b) => a + (parseFloat(b.saldo_final || b.saldo_actual || b.monto) || 0), 0)

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=700,height=500')
    w.document.write(`<!DOCTYPE html><html><head><title>Resumen Semanal</title><style>
      body{font-family:Arial,sans-serif;margin:40px;font-size:13px;color:#1A1A1A}
      h1{font-size:18px;color:#0A66C2;margin:0}.sub{color:#6B7280;font-size:12px}
      .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0A66C2;padding-bottom:16px;margin-bottom:20px}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0}
      .card{border:1px solid #E5E7EB;border-radius:8px;padding:14px}
      .lbl{font-size:11px;font-weight:700;text-transform:uppercase;color:#6B7280;margin-bottom:4px}
      .val{font-size:22px;font-weight:800}
      .result{background:#F0FDF4;border:2px solid #86EFAC;border-radius:8px;padding:16px;text-align:center;margin:16px 0}
      @media print{body{margin:20px}}
    </style></head><body>
      <div class="hdr">
        <div><h1>RESUMEN OPERATIVO SEMANAL</h1><div class="sub">Inmobiliaria Alcedines del Norte</div></div>
        <div style="text-align:right"><div style="font-weight:700">${isoDate(inicio)} / ${isoDate(fin)}</div><div class="sub">Generado: ${new Date().toLocaleDateString('es-MX')}</div></div>
      </div>
      <div class="grid3">
        <div class="card"><div class="lbl">Ingresos semana</div><div class="val" style="color:#057642">${fmt(totalIngresos)}</div><div class="sub">${ingresosS.length} cobros</div></div>
        <div class="card"><div class="lbl">Gastos semana</div><div class="val" style="color:#B24020">${fmt(totalGastos)}</div><div class="sub">${gastosS.length} gastos</div></div>
        <div class="card"><div class="lbl">Fondo Revolvente</div><div class="val" style="color:#0A66C2">${fmt(fondoActual)}</div><div class="sub">saldo actual</div></div>
      </div>
      <div class="result"><div class="lbl">Resultado neto de la semana</div><div class="val" style="color:${resultado>=0?'#057642':'#B24020'}">${resultado>=0?'+':''}${fmt(resultado)}</div></div>
      <h3 style="margin:20px 0 8px">Ingresos (${ingresosS.length})</h3>
      ${ingresosS.slice(0,10).map(c => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F3F4F6"><span>${c.arrendatario_nombre}</span><strong>${fmt(c.monto_pagado)}</strong></div>`).join('')}
      <h3 style="margin:20px 0 8px">Gastos (${gastosS.length})</h3>
      ${gastosS.slice(0,10).map(g => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F3F4F6"><span>${g.nombre || g.descripcion || '—'}</span><strong>${fmt(g.monto || g.total)}</strong></div>`).join('')}
    </body></html>`)
    w.document.close(); w.print()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      {/* Header con navegación de semana */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarRange size={22} color="var(--color-primary)" /> Resumen Semanal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Cierre operativo — ingresos, gastos y fondo</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navSemana(-1)} style={{ padding: '8px', background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
          <div style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, minWidth: '220px', textAlign: 'center' }}>
            {isoDate(inicio)} — {isoDate(fin)}
            {esEstaSemana && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', background: '#EFF6FF', padding: '2px 6px', borderRadius: '10px' }}>ESTA SEMANA</span>}
          </div>
          <button onClick={() => navSemana(1)} style={{ padding: '8px', background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          <button onClick={() => setSemanaBase(new Date())} style={{ padding: '8px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Hoy</button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><LoadingSpinner /></div>
      ) : (
        <>
          {/* Grid de secciones clickeables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px', marginBottom: '20px' }}>
            <SeccionBloque
              titulo="Ingresos de la semana"
              subtitulo="Cobros registrados como pagados"
              monto={totalIngresos} cantidad={ingresosS.length}
              color="var(--color-success)" bg="#F0FDF4"
              items={ingresosS} tipo="ingreso"
              icon={TrendingUp}
              onDrill={(t, i, tp) => setDrawer({ titulo: t, items: i, tipo: tp })}
            />
            <SeccionBloque
              titulo="Gastos de la semana"
              subtitulo="Gastos operativos registrados"
              monto={totalGastos} cantidad={gastosS.length}
              color="var(--color-danger)" bg="#FEF2F2"
              items={gastosS} tipo="gasto"
              icon={TrendingDown}
              onDrill={(t, i, tp) => setDrawer({ titulo: t, items: i, tipo: tp })}
            />
          </div>

          {/* Resultado + Fondo */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: resultado >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: '10px', border: `2px solid ${resultado >= 0 ? '#86EFAC' : '#FCA5A5'}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Resultado neto de la semana</div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {resultado >= 0 ? '+' : ''}{fmt(resultado)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                  {totalIngresos > 0 ? `Margen: ${((resultado/totalIngresos)*100).toFixed(1)}%` : 'Sin ingresos'}
                </div>
              </div>
              {resultado >= 0 ? <CheckCircle size={44} color="var(--color-success)" /> : <Clock size={44} color="var(--color-danger)" />}
            </div>

            <div style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #E5E7EB', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '6px' }}>Fondo Revolvente</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>{fmtK(fondoActual)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>saldo actual disponible</div>
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Ingresos</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)', textAlign: 'right' }}>{fmt(totalIngresos)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Gastos</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-danger)', textAlign: 'right' }}>{fmt(totalGastos)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista rápida de ingresos y gastos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { titulo: 'Cobros recibidos', items: ingresosS, tipo: 'ingreso', color: 'var(--color-success)', getLabel: c => c.arrendatario_nombre, getMonto: c => c.monto_pagado },
              { titulo: 'Gastos registrados', items: gastosS, tipo: 'gasto', color: 'var(--color-danger)', getLabel: g => g.proveedor_nombre || g.descripcion || '—', getMonto: g => g.monto_pagado },
            ].map(({ titulo, items, tipo, color, getLabel, getMonto }) => (
              <div key={titulo} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{titulo}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{items.length} registros</span>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {items.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '30px', fontSize: '13px' }}>Sin registros esta semana</div>
                  ) : (
                    items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #F9FAFB' }}>
                        <div style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{getLabel(item)}</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color, flexShrink: 0 }}>{fmt(getMonto(item))}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {drawer && <DetalleDrawer titulo={drawer.titulo} items={drawer.items} tipo={drawer.tipo} onClose={() => setDrawer(null)} />}
    </div>
  )
}
