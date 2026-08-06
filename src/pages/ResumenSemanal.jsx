import { useModuleAudit } from '../hooks/useAudit'
import { useState, useMemo, useEffect } from 'react'
import { CalendarRange, TrendingUp, TrendingDown, DollarSign, X, ChevronLeft, ChevronRight, CheckCircle, Clock, Printer, Car, ShoppingBag, Receipt, Wallet } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

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
  const iniStr = isoDate(inicio)
  const finStr = isoDate(fin)
  const esEstaSemana = iniStr === isoDate(startOfWeek(new Date()))

  // Fuentes de datos estáticas (toda la BD, filtradas en memo)
  const { data: cobros, loading: lc } = usePRP('prp_cobros')
  const { data: fondo, loading: lf } = usePRP('prp_fondo_semana')

  // Fuentes operativas dinámicas (se recargan al cambiar semana)
  const [estac, setEstac] = useState([])
  const [gastosOp, setGastosOp] = useState([])
  const [vending, setVending] = useState([])
  const [loadingOp, setLoadingOp] = useState(false)

  useEffect(() => {
    setLoadingOp(true)
    Promise.all([
      supabase.from('estacionamiento_diario').select('*').gte('fecha', iniStr).lte('fecha', finStr),
      supabase.from('gastos_operativos').select('*').gte('fecha', iniStr).lte('fecha', finStr),
      supabase.from('vending_semanas').select('*').gte('fecha_inicio', iniStr).lte('fecha_inicio', finStr),
    ]).then(([e, g, v]) => {
      setEstac(e.data || [])
      setGastosOp(g.data || [])
      setVending(v.data || [])
      setLoadingOp(false)
    })
  }, [iniStr, finStr])

  const loading = lc || lf || loadingOp

  const navSemana = (dir) => {
    const d = new Date(semanaBase)
    d.setDate(d.getDate() + dir * 7)
    setSemanaBase(d)
  }

  const ingresosRenta = useMemo(() => (cobros || []).filter(c => {
    if (c.estatus !== 'PAGADO' || !c.fecha_pago_real) return false
    return c.fecha_pago_real >= iniStr && c.fecha_pago_real <= finStr
  }), [cobros, iniStr, finStr])

  const fondoGastos = useMemo(() => {
    // prp_fondo_semana puede tener datos de gastos del fondo revolvente
    return (fondo || []).filter(g => {
      const f = g.fecha || g.semana_inicio
      return f && f >= iniStr && f <= finStr
    })
  }, [fondo, iniStr, finStr])

  // Totales por fuente
  const totRenta = ingresosRenta.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totEstac = estac.reduce((a, b) => a + (parseFloat(b.cantidad) || 0), 0)
  const totVending = vending.reduce((a, b) => a + (parseFloat(b.venta_pesos) || 0), 0)
  const totGastosOp = gastosOp.reduce((a, b) => a + (parseFloat(b.cantidad) || 0), 0)
  const totFondoG = fondoGastos.reduce((a, b) => a + (parseFloat(b.monto_pagado || b.monto || 0)), 0)

  const totalIngresos = totRenta + totEstac + totVending
  const totalGastos = totGastosOp + totFondoG
  const resultado = totalIngresos - totalGastos

  const drill = (titulo, items, tipo) => setDrawer({ titulo, items, tipo })

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=700,height=500')
    w.document.write(`<!DOCTYPE html><html><head><title>Resumen Semanal</title><style>
      body{font-family:Arial,sans-serif;margin:40px;font-size:13px;color:#1A1A1A}
      h1{font-size:18px;color:#0A66C2;margin:0}.sub{color:#6B7280;font-size:12px}
      .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0A66C2;padding-bottom:16px;margin-bottom:20px}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
      .card{border:1px solid #E5E7EB;border-radius:8px;padding:12px}
      .lbl{font-size:10px;font-weight:700;text-transform:uppercase;color:#6B7280;margin-bottom:4px}
      .val{font-size:20px;font-weight:800}
      .result{background:#F0FDF4;border:2px solid #86EFAC;border-radius:8px;padding:14px;text-align:center;margin:14px 0}
      .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F3F4F6}
      @media print{body{margin:20px}}
    </style></head><body>
      <div class="hdr">
        <div><h1>RESUMEN OPERATIVO SEMANAL</h1><div class="sub">Inmobiliaria Alcedines del Norte</div></div>
        <div style="text-align:right"><div style="font-weight:700">${iniStr} / ${finStr}</div><div class="sub">Generado: ${new Date().toLocaleDateString('es-MX')}</div></div>
      </div>
      <div class="grid3">
        <div class="card"><div class="lbl">Rentas cobradas</div><div class="val" style="color:#057642">${fmt(totRenta)}</div><div class="sub">${ingresosRenta.length} cobros</div></div>
        <div class="card"><div class="lbl">Estacionamiento</div><div class="val" style="color:#057642">${fmt(totEstac)}</div><div class="sub">${estac.length} días</div></div>
        <div class="card"><div class="lbl">Vending</div><div class="val" style="color:#057642">${fmt(totVending)}</div><div class="sub">${vending.length} registros</div></div>
        <div class="card"><div class="lbl">Gastos operativos</div><div class="val" style="color:#B24020">${fmt(totGastosOp)}</div><div class="sub">${gastosOp.length} gastos</div></div>
        <div class="card"><div class="lbl">Total ingresos</div><div class="val" style="color:#057642">${fmt(totalIngresos)}</div></div>
        <div class="card"><div class="lbl">Total gastos</div><div class="val" style="color:#B24020">${fmt(totalGastos)}</div></div>
      </div>
      <div class="result"><div class="lbl">Resultado neto de la semana</div><div class="val" style="color:${resultado>=0?'#057642':'#B24020'}">${resultado>=0?'+':''}${fmt(resultado)}</div></div>
      <h3 style="margin:16px 0 8px">Rentas cobradas</h3>
      ${ingresosRenta.slice(0,10).map(c => `<div class="row"><span>${c.arrendatario_nombre}</span><strong>${fmt(c.monto_pagado)}</strong></div>`).join('')}
      <h3 style="margin:16px 0 8px">Gastos operativos</h3>
      ${gastosOp.slice(0,10).map(g => `<div class="row"><span>${g.proveedor || g.descripcion || '—'} · ${g.grupo_gasto}</span><strong>${fmt(g.cantidad)}</strong></div>`).join('')}
    </body></html>`)
    w.document.close(); w.print()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarRange size={22} color="var(--color-primary)" /> Resumen Semanal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Cierre operativo — rentas, estacionamiento, vending y gastos · clic en cualquier monto para ver detalle</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navSemana(-1)} style={{ padding: '8px', background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
          <div style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, minWidth: '230px', textAlign: 'center' }}>
            {iniStr} — {finStr}
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
          {/* ── INGRESOS ── */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Ingresos de la semana</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
            <SeccionBloque
              titulo="Rentas cobradas"
              subtitulo={`${ingresosRenta.length} cobros recibidos`}
              monto={totRenta} cantidad={ingresosRenta.length}
              color="var(--color-success)" bg="#F0FDF4"
              items={ingresosRenta.map(c => ({ ...c, monto_pagado: c.monto_pagado }))} tipo="ingreso"
              icon={TrendingUp}
              onDrill={(t, i, tp) => drill(t, i, tp)}
            />
            <SeccionBloque
              titulo="Estacionamiento"
              subtitulo={`${estac.length} días registrados`}
              monto={totEstac} cantidad={estac.length}
              color="var(--color-success)" bg="#F0FDF4"
              items={estac.map(r => ({ monto_pagado: r.cantidad, descripcion: r.fecha, fecha: r.fecha, arrendatario_nombre: r.dia_semana || r.fecha }))} tipo="ingreso"
              icon={Car}
              onDrill={(t, i, tp) => drill(t, i, tp)}
            />
            <SeccionBloque
              titulo="Vending"
              subtitulo={`${vending.length} productos`}
              monto={totVending} cantidad={vending.length}
              color="var(--color-success)" bg="#F0FDF4"
              items={vending.map(v => ({ monto_pagado: v.venta_pesos, arrendatario_nombre: v.producto, descripcion: `${v.venta_unidades} uds · ${v.semana_label}`, fecha: v.fecha_inicio }))} tipo="ingreso"
              icon={ShoppingBag}
              onDrill={(t, i, tp) => drill(t, i, tp)}
            />
          </div>

          {/* ── GASTOS ── */}
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Gastos de la semana</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginBottom: '20px' }}>
            <SeccionBloque
              titulo="Gastos Operativos"
              subtitulo={`${gastosOp.length} gastos registrados`}
              monto={totGastosOp} cantidad={gastosOp.length}
              color="var(--color-danger)" bg="#FEF2F2"
              items={gastosOp.map(g => ({ monto_pagado: g.cantidad, arrendatario_nombre: g.proveedor || g.descripcion || '—', descripcion: g.grupo_gasto, fecha: g.fecha }))} tipo="gasto"
              icon={Receipt}
              onDrill={(t, i, tp) => drill(t, i, tp)}
            />
            <SeccionBloque
              titulo="Fondo Revolvente"
              subtitulo={`${fondoGastos.length} movimientos`}
              monto={totFondoG} cantidad={fondoGastos.length}
              color="var(--color-danger)" bg="#FEF2F2"
              items={fondoGastos.map(g => ({ monto_pagado: g.monto_pagado || g.monto || 0, arrendatario_nombre: g.proveedor_nombre || g.descripcion || '—', fecha: g.fecha || g.semana_inicio }))} tipo="gasto"
              icon={Wallet}
              onDrill={(t, i, tp) => drill(t, i, tp)}
            />
          </div>

          {/* ── RESULTADO ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div style={{ background: resultado >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: '12px', border: `2px solid ${resultado >= 0 ? '#86EFAC' : '#FCA5A5'}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Resultado neto de la semana</div>
                <div style={{ fontSize: '40px', fontWeight: 900, color: resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {resultado >= 0 ? '+' : ''}{fmt(resultado)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '6px' }}>
                  Ingresos {fmt(totalIngresos)} — Gastos {fmt(totalGastos)}
                  {totalIngresos > 0 && ` · Margen ${((resultado/totalIngresos)*100).toFixed(1)}%`}
                </div>
              </div>
              {resultado >= 0 ? <CheckCircle size={48} color="var(--color-success)" /> : <Clock size={48} color="var(--color-danger)" />}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1.5px solid #E5E7EB', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '12px' }}>Desglose de ingresos</div>
              {[
                ['Rentas', totRenta, 'var(--color-success)'],
                ['Estacionamiento', totEstac, 'var(--color-success)'],
                ['Vending', totVending, 'var(--color-success)'],
                ['Gastos Op.', totGastosOp, 'var(--color-danger)'],
                ['Fondo Rev.', totFondoG, 'var(--color-danger)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color }}>{fmt(val)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── LISTAS RÁPIDAS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { titulo: 'Cobros recibidos', items: ingresosRenta, color: 'var(--color-success)', getLabel: c => c.arrendatario_nombre, getMonto: c => c.monto_pagado },
              { titulo: 'Gastos registrados', items: gastosOp, color: 'var(--color-danger)', getLabel: g => g.proveedor || g.descripcion || '—', getMonto: g => g.cantidad },
            ].map(({ titulo, items, color, getLabel, getMonto }) => (
              <div key={titulo} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>{titulo}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{items.length} registros</span>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {items.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '30px', fontSize: '13px' }}>Sin registros esta semana</div>
                  ) : (
                    items.slice(0, 20).map((item, i) => (
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
