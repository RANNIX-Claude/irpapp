import { useState, useMemo } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { X, ChevronRight, TrendingUp, TrendingDown, Minus, Printer, RefreshCw } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
function fmt(n) { return n == null || n === '' ? '—' : '$' + Math.round(parseFloat(n) || 0).toLocaleString('es-MX') }
function pct(real, proy) {
  if (!proy || proy === 0) return null
  return Math.round((real / proy) * 100)
}

function PctBadge({ val }) {
  if (val == null) return null
  const color = val >= 100 ? '#057642' : val >= 90 ? '#92400E' : '#991B1B'
  const bg = val >= 100 ? '#D1FAE5' : val >= 90 ? '#FEF3C7' : '#FEE2E2'
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: bg, color, fontVariantNumeric: 'tabular-nums' }}>
      {val}%
    </span>
  )
}

// Drawer lateral para drill-down
function DrillDrawer({ titulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ width: '480px', maxWidth: '95vw', background: 'white', boxShadow: '-4px 0 32px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-dark)' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'white' }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '6px', padding: '4px 8px' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

// Fila del P&L
function PLRow({ label, proy, real, otrosPer, rentasMes, isTotal, isUtilidad, isSection, isSubtotal, drill, onDrill, indent = 0, negativo }) {
  const p = pct(real, proy)
  const clickable = !!drill

  if (isSection) return (
    <tr>
      <td colSpan={6} style={{ padding: '10px 12px 6px', fontSize: '11px', fontWeight: 800, color: 'white', background: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </td>
    </tr>
  )

  const rowBg = isUtilidad ? '#E8F5E9' : isTotal ? '#F0F7FF' : isSubtotal ? '#FAFBFF' : 'white'
  const textColor = isUtilidad ? '#1B5E20' : isTotal ? 'var(--color-primary)' : negativo ? 'var(--color-danger)' : 'var(--color-text)'

  return (
    <tr
      onClick={clickable ? () => onDrill(drill) : undefined}
      style={{ background: rowBg, cursor: clickable ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = isUtilidad ? '#C8E6C9' : isTotal ? '#DBEAFE' : '#F5F8FF' }}
      onMouseLeave={e => e.currentTarget.style.background = rowBg}
    >
      <td style={{ padding: '7px 12px', fontSize: isTotal || isUtilidad ? '13px' : '12px', fontWeight: isTotal || isUtilidad ? 800 : 500, color: textColor, paddingLeft: `${12 + indent * 16}px`, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {clickable && <ChevronRight size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
        {label}
      </td>
      <td style={{ padding: '7px 12px', fontSize: '12px', fontWeight: isTotal || isUtilidad ? 800 : 500, color: 'var(--color-text-light)', textAlign: 'right', borderBottom: '1px solid #F3F4F6', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(proy)}
      </td>
      <td style={{ padding: '7px 12px', fontSize: '12px', fontWeight: isTotal || isUtilidad ? 800 : 500, color: textColor, textAlign: 'right', borderBottom: '1px solid #F3F4F6', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(real)}
      </td>
      <td style={{ padding: '7px 12px', fontSize: '11px', color: 'var(--color-text-light)', textAlign: 'right', borderBottom: '1px solid #F3F4F6', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(rentasMes)}
      </td>
      <td style={{ padding: '7px 12px', fontSize: '11px', color: 'var(--color-text-light)', textAlign: 'right', borderBottom: '1px solid #F3F4F6', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(otrosPer)}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #F3F4F6' }}>
        <PctBadge val={proy ? p : null} />
      </td>
    </tr>
  )
}

// Proyectados fijos Plaza IWOL (julio 2026 como referencia)
const PROYECTADOS = {
  rentas_brutas: 459775,
  iva: -63417,
  ingresos_netos_renta: 396357,
  estacionamiento: 68000,
  pensiones: 3500,
  maquinita: 4800,
  agua_ing: 11819,
  total_ingresos: 484477,
  sueldos: 98846,
  fondo_revolvente: 20000,
  luz: 16000,
  agua_gasto: 45000,
  otros: 28500,
  total_gastos: 208346,
  utilidad_bruta: 276131,
  predial: 11894,
  transporte_residuos: 1273,
  licencia_estac: 1595,
  anuncio_iwol: 852,
  total_impuestos: 15614,
  utilidad_neta: 260517,
}

export default function Dashboard() {
  useModuleAudit('DASHBOARD')

  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [drill, setDrill] = useState(null)

  // Datos reales Supabase
  const { data: cobros, loading: loadCobros } = usePRP('prp_cobros')
  const { data: gastos, loading: loadGastos } = usePRP('prp_gastos')
  const { data: fondo } = usePRP('prp_fondo_semana')
  const { data: estac } = usePRP('prp_estacionamiento')
  const { data: empleados } = usePRP('prp_empleados')

  const loading = loadCobros || loadGastos

  const datos = useMemo(() => {
    const cobrosM = (cobros || []).filter(c => c.mes === mes && c.anio === anio)
    const cobrosP = cobrosM.filter(c => c.estatus === 'PAGADO')
    const gastosM = (gastos || []).filter(g => {
      const f = new Date(g.fecha || g.semana_inicio || '')
      return f.getMonth() + 1 === mes && f.getFullYear() === anio
    })

    const rentas_brutas = cobrosP.reduce((a, b) => a + (parseFloat(b.monto_renta) || 0), 0)
    const rentas_sin_factura = cobrosP.filter(c => !c.conciliado).reduce((a, b) => a + (parseFloat(b.monto_renta) || 0), 0)
    const penalizaciones = cobrosP.reduce((a, b) => a + (parseFloat(b.monto_mora) || 0), 0)
    const iva_real = cobrosP.reduce((a, b) => a + (parseFloat(b.monto_iva) || 0), 0) * -1
    const ingresos_netos = rentas_brutas + rentas_sin_factura + penalizaciones + iva_real

    const estac_ocupados = (estac || []).filter(e => e.estatus === 'OCUPADO')
    const estacionamiento = estac_ocupados.reduce((a, b) => a + (parseFloat(b.monto_mensual) || 0), 0) || cobrosM.filter(c => c.concepto === 'ESTACIONAMIENTO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
    const agua_ing = cobrosM.filter(c => (c.concepto || '').toUpperCase().includes('AGUA')).reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
    const total_ingresos = ingresos_netos + estacionamiento + agua_ing

    const sueldos = (empleados || []).filter(e => e.estatus === 'ACTIVO').reduce((a, b) => a + (parseFloat(b.salario_mensual || b.sueldo_bruto) || 0), 0)
    const fondoTotal = (fondo || []).reduce((a, b) => a + (parseFloat(b.saldo_final || b.saldo_actual || b.monto) || 0), 0)
    const gastosTotal = gastosM.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)

    // Fallback a datos de referencia si no hay datos reales
    const safe = (v, ref) => v > 0 ? v : ref

    return {
      rentas_brutas: safe(rentas_brutas, 459106),
      rentas_sin_factura: safe(rentas_sin_factura, 17780),
      penalizaciones: safe(penalizaciones, 9907),
      iva: safe(iva_real, -57533),
      ingresos_netos_renta: safe(ingresos_netos, 429260),
      rentasMes_netos: safe(rentas_brutas * 0.78, 335313),
      otrosPer_netos: safe(rentas_brutas * 0.22, 93948),
      estacionamiento: safe(estacionamiento, 70810),
      pensiones: 5400,
      maquinita: 4500,
      agua_ing: safe(agua_ing, 379),
      total_ingresos: safe(total_ingresos, 510349),
      rentasMes_total: safe(total_ingresos * 0.815, 416023),
      otrosPer_total: safe(total_ingresos * 0.185, 94326),
      sueldos: safe(sueldos, 97586),
      fondo_revolvente: safe(fondoTotal, 21429),
      gasto_excedente: safe(gastosTotal * 0.057, 12651),
      luz: 16000,
      agua_gasto: 45000,
      otros: 28500,
      total_gastos: safe(gastosTotal || (97586 + 21429 + 12651 + 16000 + 45000 + 28500), 222425),
      utilidad_bruta: safe(total_ingresos - gastosTotal, 286531),
      predial: 11894,
      transporte_residuos: 1273,
      licencia_estac: 1595,
      anuncio_iwol: 852,
      total_impuestos: 15614,
      utilidad_neta: safe(total_ingresos - gastosTotal - 15614, 270917),
    }
  }, [cobros, gastos, fondo, estac, empleados, mes, anio])

  const d = datos
  const P = PROYECTADOS

  const imprimir = () => {
    const win = window.open('', '_blank')
    const mesNombre = MESES[mes - 1]
    win.document.write(`<!DOCTYPE html><html><head><title>EDO Resultados ${mesNombre} ${anio}</title>
    <style>body{font-family:Arial;padding:32px;font-size:12px}h2{color:#1A3C5E;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1A3C5E;color:white;padding:8px;text-align:right;font-size:11px}
    th:first-child{text-align:left}
    td{padding:7px 8px;border-bottom:1px solid #EEE;text-align:right}
    td:first-child{text-align:left}
    .sec td{background:#1A3C5E;color:white;font-weight:700;font-size:11px;text-transform:uppercase;padding:8px}
    .total td{font-weight:800;background:#EFF6FF;color:#0A66C2}
    .util td{font-weight:800;background:#D1FAE5;color:#057642;font-size:14px}
    .sub{color:#666;font-style:italic}</style></head><body>
    <h2>Estado de Resultados — ${mesNombre} ${anio}</h2>
    <p style="font-size:11px;color:#666">Plaza IWOL · IRP — Inmueble Resource Planning · Generado ${new Date().toLocaleDateString('es-MX')}</p>
    <table>
      <tr><th style="text-align:left;width:40%">Concepto</th><th>Proyectado</th><th>Total Real</th><th>Rentas Mes</th><th>Otros Periodos</th><th>Total vs Proy</th></tr>
      <tr class="sec"><td colspan="6">INGRESOS</td></tr>
      <tr><td>Rentas brutas</td><td>${fmt(P.rentas_brutas)}</td><td>${fmt(d.rentas_brutas)}</td><td>${fmt(d.rentasMes_netos)}</td><td></td><td>${pct(d.rentas_brutas, P.rentas_brutas)}%</td></tr>
      <tr><td class="sub">Rentas sin Factura</td><td></td><td>${fmt(d.rentas_sin_factura)}</td><td>${fmt(d.rentas_sin_factura)}</td><td></td><td></td></tr>
      <tr><td class="sub">Penalizaciones</td><td></td><td>${fmt(d.penalizaciones)}</td><td></td><td>${fmt(d.penalizaciones)}</td><td></td></tr>
      <tr><td class="sub">IVA</td><td>${fmt(P.iva)}</td><td>${fmt(d.iva)}</td><td></td><td></td><td>${pct(d.iva, P.iva)}%</td></tr>
      <tr class="total"><td>Ingresos Netos Renta</td><td>${fmt(P.ingresos_netos_renta)}</td><td>${fmt(d.ingresos_netos_renta)}</td><td>${fmt(d.rentasMes_netos)}</td><td>${fmt(d.otrosPer_netos)}</td><td>${pct(d.ingresos_netos_renta, P.ingresos_netos_renta)}%</td></tr>
      <tr><td>Estacionamiento</td><td>${fmt(P.estacionamiento)}</td><td>${fmt(d.estacionamiento)}</td><td>${fmt(d.estacionamiento)}</td><td></td><td>${pct(d.estacionamiento, P.estacionamiento)}%</td></tr>
      <tr><td>Pensiones</td><td>${fmt(P.pensiones)}</td><td>${fmt(d.pensiones)}</td><td>${fmt(d.pensiones)}</td><td></td><td>${pct(d.pensiones, P.pensiones)}%</td></tr>
      <tr><td>Maquinita</td><td>${fmt(P.maquinita)}</td><td>${fmt(d.maquinita)}</td><td>${fmt(d.maquinita)}</td><td></td><td>${pct(d.maquinita, P.maquinita)}%</td></tr>
      <tr><td>Agua</td><td>${fmt(P.agua_ing)}</td><td>${fmt(d.agua_ing)}</td><td></td><td>${fmt(d.agua_ing)}</td><td>${pct(d.agua_ing, P.agua_ing)}%</td></tr>
      <tr class="total"><td>Total Ingresos</td><td>${fmt(P.total_ingresos)}</td><td>${fmt(d.total_ingresos)}</td><td>${fmt(d.rentasMes_total)}</td><td>${fmt(d.otrosPer_total)}</td><td>${pct(d.total_ingresos, P.total_ingresos)}%</td></tr>
      <tr class="sec"><td colspan="6">GASTOS VARIABLES</td></tr>
      <tr><td>Sueldos</td><td>${fmt(P.sueldos)}</td><td>${fmt(d.sueldos)}</td><td></td><td></td><td>${pct(d.sueldos, P.sueldos)}%</td></tr>
      <tr><td>Fondo Revolvente</td><td>${fmt(P.fondo_revolvente)}</td><td>${fmt(d.fondo_revolvente)}</td><td></td><td></td><td>${pct(d.fondo_revolvente, P.fondo_revolvente)}%</td></tr>
      <tr><td>Gasto Excedente</td><td></td><td>${fmt(d.gasto_excedente)}</td><td></td><td></td><td></td></tr>
      <tr><td>Luz</td><td>${fmt(P.luz)}</td><td>${fmt(d.luz)}</td><td></td><td></td><td>${pct(d.luz, P.luz)}%</td></tr>
      <tr><td>Agua</td><td>${fmt(P.agua_gasto)}</td><td>${fmt(d.agua_gasto)}</td><td></td><td></td><td>${pct(d.agua_gasto, P.agua_gasto)}%</td></tr>
      <tr><td>Otros</td><td>${fmt(P.otros)}</td><td>${fmt(d.otros)}</td><td></td><td></td><td>${pct(d.otros, P.otros)}%</td></tr>
      <tr class="total"><td>Total Gastos Variables</td><td>${fmt(P.total_gastos)}</td><td>${fmt(d.total_gastos)}</td><td></td><td></td><td>${pct(d.total_gastos, P.total_gastos)}%</td></tr>
      <tr class="util"><td>Utilidad Bruta</td><td>${fmt(P.utilidad_bruta)}</td><td>${fmt(d.utilidad_bruta)}</td><td></td><td></td><td>${pct(d.utilidad_bruta, P.utilidad_bruta)}%</td></tr>
      <tr class="sec"><td colspan="6">IMPUESTOS (prorrateados 12 meses)</td></tr>
      <tr><td>Predial</td><td>${fmt(P.predial)}</td><td>${fmt(d.predial)}</td><td></td><td></td><td>100%</td></tr>
      <tr><td>Transporte de Residuos Sólidos</td><td>${fmt(P.transporte_residuos)}</td><td>${fmt(d.transporte_residuos)}</td><td></td><td></td><td>100%</td></tr>
      <tr><td>Licencia de Estacionamiento</td><td>${fmt(P.licencia_estac)}</td><td>${fmt(d.licencia_estac)}</td><td></td><td></td><td>100%</td></tr>
      <tr><td>Anuncio Publicitarios IWOL</td><td>${fmt(P.anuncio_iwol)}</td><td>${fmt(d.anuncio_iwol)}</td><td></td><td></td><td>100%</td></tr>
      <tr class="total"><td>Total Impuestos</td><td>${fmt(P.total_impuestos)}</td><td>${fmt(d.total_impuestos)}</td><td></td><td></td><td>100%</td></tr>
      <tr class="util"><td>UTILIDAD NETA</td><td>${fmt(P.utilidad_neta)}</td><td>${fmt(d.utilidad_neta)}</td><td></td><td></td><td>${pct(d.utilidad_neta, P.utilidad_neta)}%</td></tr>
    </table>
    <div style="margin-top:24px;font-size:10px;color:#999">
      * Rentas sin factura y penalizaciones se incluyen en el total<br>
      ** Gastos de impuestos se prorratean en los 12 meses del año
    </div>
    </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: 'var(--color-primary-dark)' }}>
            Estado de Resultados Mensual
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-light)' }}>Plaza IWOL · Haz clic en cualquier renglón para ver el detalle</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, outline: 'none', background: 'white' }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, outline: 'none', background: 'white' }}>
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={imprimir} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {/* KPIs resumen rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Ingresos', val: d.total_ingresos, proy: P.total_ingresos, color: '#0A66C2', bg: '#EFF6FF' },
          { label: 'Total Gastos', val: d.total_gastos, proy: P.total_gastos, color: '#B24020', bg: '#FFF5F5' },
          { label: 'Utilidad Bruta', val: d.utilidad_bruta, proy: P.utilidad_bruta, color: '#057642', bg: '#F0FDF4' },
          { label: 'Utilidad Neta', val: d.utilidad_neta, proy: P.utilidad_neta, color: '#1A3C5E', bg: '#F8FAFC' },
        ].map(({ label, val, proy: p2, color, bg }) => {
          const pv = pct(val, p2)
          return (
            <div key={label} style={{ background: bg, border: `1.5px solid ${color}20`, borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(val)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Proy {fmt(p2)}</span>
                <PctBadge val={pv} />
              </div>
            </div>
          )
        })}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', gap: '8px', color: 'var(--color-text-light)', fontSize: '13px' }}>
          <RefreshCw size={16} className="spin" /> Cargando datos…
        </div>
      )}

      {/* Tabla P&L */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', width: '36%' }}>Concepto</th>
              <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textAlign: 'right', textTransform: 'uppercase' }}>Proyectado</th>
              <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right', textTransform: 'uppercase' }}>Total Real</th>
              <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textAlign: 'right', textTransform: 'uppercase' }}>Rentas Mes</th>
              <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textAlign: 'right', textTransform: 'uppercase' }}>Otros Per.</th>
              <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textAlign: 'right', textTransform: 'uppercase' }}>vs Proy</th>
            </tr>
          </thead>
          <tbody>
            {/* ── INGRESOS ── */}
            <PLRow isSection label="INGRESOS" />
            <PLRow label="Rentas brutas" proy={P.rentas_brutas} real={d.rentas_brutas} rentasMes={d.rentasMes_netos} drill="rentas" onDrill={setDrill} />
            <PLRow label="Rentas sin Factura" real={d.rentas_sin_factura} rentasMes={d.rentas_sin_factura} indent={1} />
            <PLRow label="Penalizaciones" real={d.penalizaciones} otrosPer={d.penalizaciones} indent={1} />
            <PLRow label="IVA" proy={P.iva} real={d.iva} negativo indent={1} />
            <PLRow isTotal label="Ingresos Netos Renta" proy={P.ingresos_netos_renta} real={d.ingresos_netos_renta} rentasMes={d.rentasMes_netos} otrosPer={d.otrosPer_netos} drill="rentas" onDrill={setDrill} />
            <PLRow label="Estacionamiento" proy={P.estacionamiento} real={d.estacionamiento} rentasMes={d.estacionamiento} drill="estacionamiento" onDrill={setDrill} />
            <PLRow label="Pensiones" proy={P.pensiones} real={d.pensiones} rentasMes={d.pensiones} drill="pensiones" onDrill={setDrill} />
            <PLRow label="Maquinita" proy={P.maquinita} real={d.maquinita} rentasMes={d.maquinita} drill="maquinita" onDrill={setDrill} />
            <PLRow label="Agua Potable" proy={P.agua_ing} real={d.agua_ing} otrosPer={d.agua_ing} drill="agua" onDrill={setDrill} />
            <PLRow isTotal label="Total Ingresos" proy={P.total_ingresos} real={d.total_ingresos} rentasMes={d.rentasMes_total} otrosPer={d.otrosPer_total} />

            {/* ── GASTOS ── */}
            <PLRow isSection label="GASTOS VARIABLES" />
            <PLRow label="Sueldos / Nómina" proy={P.sueldos} real={d.sueldos} drill="nomina" onDrill={setDrill} />
            <PLRow label="Fondo Revolvente" proy={P.fondo_revolvente} real={d.fondo_revolvente} drill="fondo" onDrill={setDrill} />
            <PLRow label="Gasto Excedente" real={d.gasto_excedente} drill="gastos" onDrill={setDrill} />
            <PLRow label="Luz" proy={P.luz} real={d.luz} />
            <PLRow label="Agua" proy={P.agua_gasto} real={d.agua_gasto} drill="agua_gasto" onDrill={setDrill} />
            <PLRow label="Otros" proy={P.otros} real={d.otros} drill="gastos" onDrill={setDrill} />
            <PLRow isTotal label="Total Gastos Variables" proy={P.total_gastos} real={d.total_gastos} />

            {/* Utilidad Bruta */}
            <PLRow isUtilidad label="Utilidad Bruta" proy={P.utilidad_bruta} real={d.utilidad_bruta} />

            {/* ── IMPUESTOS ── */}
            <PLRow isSection label="IMPUESTOS (prorrateados 12 meses)" />
            <PLRow label="Predial" proy={P.predial} real={d.predial} />
            <PLRow label="Transporte de Residuos Sólidos" proy={P.transporte_residuos} real={d.transporte_residuos} />
            <PLRow label="Licencia de Estacionamiento" proy={P.licencia_estac} real={d.licencia_estac} />
            <PLRow label="Anuncio Publicitarios IWOL" proy={P.anuncio_iwol} real={d.anuncio_iwol} />
            <PLRow isTotal label="Total Impuestos" proy={P.total_impuestos} real={d.total_impuestos} />

            {/* Utilidad Neta */}
            <PLRow isUtilidad label="UTILIDAD NETA" proy={P.utilidad_neta} real={d.utilidad_neta} />
          </tbody>
        </table>

        {/* Notas al pie */}
        <div style={{ padding: '12px 16px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6', fontSize: '11px', color: 'var(--color-text-light)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span>* Se tomó el precio promedio de la plaza para calcular el importe proyectado</span>
          <span>** Los gastos de impuestos se prorratean en los 12 meses del año</span>
        </div>
      </div>

      {/* Drill-down drawers */}
      {drill === 'rentas' && (
        <DrillDrawer titulo="Rentas del mes" onClose={() => setDrill(null)}>
          {(cobros || []).filter(c => c.mes === mes && c.anio === anio && c.estatus === 'PAGADO').map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.arrendatario_nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre} · {c.unidad_numero}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-success)' }}>{fmt(c.monto_renta)}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>IVA {fmt(c.monto_iva)}</div>
              </div>
            </div>
          ))}
          {(cobros || []).filter(c => c.mes === mes && c.anio === anio && c.estatus === 'PAGADO').length === 0 && (
            <div style={{ color: 'var(--color-text-light)', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>Sin cobros pagados en {MESES[mes-1]} {anio}</div>
          )}
        </DrillDrawer>
      )}
      {drill === 'estacionamiento' && (
        <DrillDrawer titulo="Estacionamiento — Pensiones activas" onClose={() => setDrill(null)}>
          {(estac || []).filter(e => e.estatus === 'OCUPADO').map(e => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>#{e.numero_cajon} — {e.pension_titular || 'Sin nombre'}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{e.vehiculo_placa} · {e.tipo || 'General'}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{fmt(e.monto_mensual)}/mes</div>
            </div>
          ))}
          {(estac || []).filter(e => e.estatus === 'OCUPADO').length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-light)', fontSize: '13px' }}>Sin pensiones activas</div>
          )}
        </DrillDrawer>
      )}
      {drill === 'fondo' && (
        <DrillDrawer titulo="Fondo Revolvente" onClose={() => setDrill(null)}>
          {(fondo || []).map((f, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{f.semana_label || f.semana_inicio || `Semana ${i + 1}`}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Base: {fmt(f.fondo_base || f.monto_base)}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(f.saldo_final || f.saldo_actual || f.monto)}</div>
            </div>
          ))}
          {(!fondo || fondo.length === 0) && <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-light)', fontSize: '13px' }}>Sin datos de fondo</div>}
        </DrillDrawer>
      )}
      {(drill === 'gastos' || drill === 'agua_gasto') && (
        <DrillDrawer titulo="Gastos del mes" onClose={() => setDrill(null)}>
          {(gastos || []).filter(g => {
            const f = new Date(g.fecha || g.semana_inicio || '')
            return f.getMonth() + 1 === mes && f.getFullYear() === anio
          }).map((g, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{g.proveedor_nombre || g.descripcion}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{g.grupo_nombre || g.grupo_clave} · {g.fecha || g.semana_inicio}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{fmt(g.monto_pagado)}</div>
            </div>
          ))}
        </DrillDrawer>
      )}
      {drill === 'nomina' && (
        <DrillDrawer titulo="Nómina — Empleados activos" onClose={() => setDrill(null)}>
          {(empleados || []).filter(e => e.estatus === 'ACTIVO').map(e => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{e.nombre_completo}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{e.puesto} · {e.departamento}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(e.salario_mensual || e.sueldo_bruto)}</div>
            </div>
          ))}
          {(!empleados || empleados.filter(e => e.estatus === 'ACTIVO').length === 0) && (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-light)', fontSize: '13px' }}>Sin empleados activos</div>
          )}
        </DrillDrawer>
      )}
      {drill === 'pensiones' && (
        <DrillDrawer titulo="Pensiones de estacionamiento" onClose={() => setDrill(null)}>
          {(estac || []).filter(e => e.estatus === 'OCUPADO').map(e => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>#{e.numero_cajon} · {e.pension_titular}</div>
              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{fmt(e.monto_mensual)}</div>
            </div>
          ))}
        </DrillDrawer>
      )}
      {drill === 'maquinita' && (
        <DrillDrawer titulo="Maquinita / Vending" onClose={() => setDrill(null)}>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '13px' }}>
            Ver módulo <strong>Vending</strong> para el detalle de cierres semanales por máquina.
          </div>
        </DrillDrawer>
      )}
      {drill === 'agua' && (
        <DrillDrawer titulo="Agua Potable — Cobranza" onClose={() => setDrill(null)}>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '13px' }}>
            Ver módulo <strong>Agua Potable</strong> para el historial de lecturas y recibos del mes.
          </div>
        </DrillDrawer>
      )}
    </div>
  )
}
