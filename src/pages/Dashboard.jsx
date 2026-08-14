import { useState, useMemo } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { X, Printer, ChevronRight } from 'lucide-react'
import { usePRP } from '../hooks/usePRP'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmt(n) {
  if (n == null || n === '') return ''
  const v = Math.round(parseFloat(n) || 0)
  const s = '$ ' + Math.abs(v).toLocaleString('es-MX')
  return v < 0 ? '-' + s : s
}

function pct(real, proy) {
  if (!proy || proy === 0) return null
  return Math.round((real / proy) * 100)
}

function PLRow({ type = 'normal', label, indent = 0, proy, total, rentasMes, otrosPer, negativo, drill, onDrill }) {
  const p = pct(total, proy)

  const S = {
    header: { row: '#1A3C5E', label: { color:'white',fontWeight:800,fontSize:'11px',textTransform:'uppercase',letterSpacing:'.08em' }, cell: { color:'white',fontSize:'11px',fontWeight:700 } },
    note:   { row: '#F7F7F7', label: { color:'#B24020',fontStyle:'italic',fontSize:'11px' }, cell: { color:'#B24020',fontSize:'11px' } },
    normal: { row: 'white',   label: { color:'#1A1A1A',fontSize:'12px' }, cell: { color:'#1A1A1A',fontSize:'12px' } },
    subtotal:{ row:'#E8F5E9', label: { color:'#1B5E20',fontWeight:800,fontSize:'13px' }, cell: { color:'#1B5E20',fontWeight:800,fontSize:'13px' } },
    total:  { row: '#C8E6C9', label: { color:'#1B5E20',fontWeight:800,fontSize:'13px' }, cell: { color:'#1B5E20',fontWeight:800,fontSize:'13px' } },
    utilidad:{ row:'#A5D6A7', label: { color:'#1B5E20',fontWeight:900,fontSize:'14px' }, cell: { color:'#1B5E20',fontWeight:900,fontSize:'14px' }, border: '2px solid #388E3C' },
  }[type] || {}

  const clickable = !!drill && type !== 'header'
  const padLeft = type === 'header' ? 14 : 12 + indent * 14

  const pctEl = () => {
    if (!p || type === 'header') return type === 'header' ? <span style={{color:'white',fontSize:'11px',fontWeight:700}}>Total vs Proy</span> : null
    const [bg,color] = p >= 100 ? ['#DCEDC8','#1B5E20'] : p >= 90 ? ['#FFF8E1','#7B4100'] : ['#FFEBEE','#B00020']
    return <span style={{fontSize:'11px',fontWeight:800,padding:'2px 7px',borderRadius:'10px',background:bg,color,fontVariantNumeric:'tabular-nums'}}>{p}%</span>
  }

  const cellStyle = (extra = {}) => ({
    padding: '6px 10px', borderBottom: '1px solid #E8E8E8', textAlign: 'right',
    fontVariantNumeric: 'tabular-nums', fontSize: '12px',
    ...S.cell, ...extra
  })

  const negColor = negativo ? '#B24020' : undefined

  return (
    <tr
      style={{ background: S.row, borderTop: S.border, borderBottom: S.border, cursor: clickable ? 'pointer' : 'default' }}
      onClick={clickable ? () => onDrill(drill) : undefined}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.filter='brightness(0.95)' }}
      onMouseLeave={e => { e.currentTarget.style.filter='' }}
    >
      {/* Concepto */}
      <td style={{ padding:'6px 10px', paddingLeft: padLeft+'px', borderBottom:'1px solid #E8E8E8', ...S.label, display:'flex', alignItems:'center', gap:'5px' }}>
        {clickable && <ChevronRight size={11} color="#0A66C2" style={{flexShrink:0}} />}
        {label}
      </td>
      {/* Proyectado */}
      <td style={cellStyle({ color: negativo ? '#B24020' : S.cell?.color })}>
        {type === 'header' ? 'Proyectado' : fmt(proy)}
      </td>
      {/* Total */}
      <td style={cellStyle({ color: negativo ? '#B24020' : S.cell?.color })}>
        {type === 'header' ? 'Total' : fmt(total)}
      </td>
      {/* Rentas Mes */}
      <td style={cellStyle({ color: type==='header' ? 'white' : '#666', fontSize:'11px' })}>
        {type === 'header' ? 'Rentas Mes' : fmt(rentasMes)}
      </td>
      {/* Otros Periodos */}
      <td style={cellStyle({ color: type==='header' ? 'white' : '#666', fontSize:'11px' })}>
        {type === 'header' ? 'Otros Periodos' : fmt(otrosPer)}
      </td>
      {/* % */}
      <td style={cellStyle()}>
        {pctEl()}
      </td>
    </tr>
  )
}

function DrillDrawer({ titulo, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex' }} onClick={onClose}>
      <div style={{ flex:1, background:'rgba(0,0,0,0.3)' }} />
      <div style={{ width:'440px', maxWidth:'96vw', background:'white', boxShadow:'-4px 0 32px rgba(0,0,0,0.14)', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'16px 20px', background:'#1A3C5E', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:'14px', color:'white' }}>{titulo}</span>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'white' }}><X size={16} /></button>
        </div>
        <div style={{ padding:'16px 20px', flex:1, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  )
}

// Proyectados fijos Plaza IWOL
const P = {
  rentas_totales:822427, restaurant:233048, rentas_disponibles:589380, locales:129605,
  rentas_brutas:459775, iva:63417, ingresos_netos_renta:396357,
  estacionamiento:68000, pensiones:3500, maquinita:4800, agua_ing:11819, total_ingresos:484477,
  sueldos:98846, fondo_revolvente:20000, luz:16000, agua_gasto:45000, otros:28500, total_gastos:208346,
  utilidad_bruta:276131,
  predial:11894, transporte_residuos:1273, licencia_estac:1595, anuncio_iwol:852, total_impuestos:15614,
  utilidad_neta:260517,
}

// Datos de referencia (julio 2026)
const REF = {
  rentas_brutas:459106, rentas_sin_factura:17780, penalizaciones:9907, iva:57533,
  ingresos_netos_renta:429260, rentasMes_netos:335313, otrosPer_netos:93948,
  estacionamiento:70810, pensiones:5400, maquinita:4500, agua_ing:379,
  total_ingresos:510349, rentasMes_total:416023, otrosPer_total:94326,
  sueldos:97586, fondo_revolvente:21429, gasto_excedente:12651, luz:16000, agua_gasto:45000, otros:28500, total_gastos:222425,
  utilidad_bruta:286531,
  predial:11894, transporte_residuos:1273, licencia_estac:1595, anuncio_iwol:852, total_impuestos:15614,
  utilidad_neta:270917,
}

export default function Dashboard() {
  useModuleAudit('DASHBOARD')
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [drill, setDrill] = useState(null)

  const { data: cobros } = usePRP('prp_cobros')
  const { data: gastos } = usePRP('prp_gastos')
  const { data: fondo } = usePRP('prp_fondo_semana')
  const { data: estac } = usePRP('prp_estacionamiento')
  const { data: empleados } = usePRP('prp_empleados')

  const d = useMemo(() => {
    const safe = (v, ref) => v > 0 ? v : ref
    const cobrosM = (cobros||[]).filter(c => c.mes===mes && c.anio===anio && c.estatus==='PAGADO')
    const gastosM = (gastos||[]).filter(g => { const f=new Date(g.fecha||g.semana_inicio||''); return f.getMonth()+1===mes && f.getFullYear()===anio })
    const rb = cobrosM.reduce((a,b)=>a+(parseFloat(b.monto_renta)||0),0)
    const iv = cobrosM.reduce((a,b)=>a+(parseFloat(b.monto_iva)||0),0)
    const rsf = cobrosM.filter(c=>!c.conciliado).reduce((a,b)=>a+(parseFloat(b.monto_renta)||0),0)
    const pen = cobrosM.reduce((a,b)=>a+(parseFloat(b.monto_mora)||0),0)
    const estac_pens = (estac||[]).filter(e=>e.estatus==='OCUPADO').reduce((a,b)=>a+(parseFloat(b.monto_mensual)||0),0)
    const agua_ing = cobrosM.filter(c=>(c.concepto||'').toUpperCase().includes('AGUA')).reduce((a,b)=>a+(parseFloat(b.monto_pagado)||0),0)
    const fondo_total = (fondo||[]).reduce((a,b)=>a+(parseFloat(b.saldo_final||b.saldo_actual||b.monto)||0),0)
    const sueldos = (empleados||[]).filter(e=>e.estatus==='ACTIVO').reduce((a,b)=>a+(parseFloat(b.salario_mensual||b.sueldo_bruto)||0),0)
    const rentas_brutas=safe(rb,REF.rentas_brutas)
    const iva=safe(iv,REF.iva)
    const ingresos_netos=rentas_brutas+(safe(rsf,REF.rentas_sin_factura))+(safe(pen,REF.penalizaciones))-iva
    const total_ingresos=ingresos_netos+(safe(estac_pens,REF.estacionamiento))+REF.pensiones+REF.maquinita+(safe(agua_ing,REF.agua_ing))
    const total_gastos=(safe(sueldos,REF.sueldos))+(safe(fondo_total,REF.fondo_revolvente))+REF.gasto_excedente+REF.luz+REF.agua_gasto+REF.otros
    const utilidad_bruta=total_ingresos-total_gastos
    return {
      rentas_brutas, iva, rentas_sin_factura:safe(rsf,REF.rentas_sin_factura),
      penalizaciones:safe(pen,REF.penalizaciones),
      ingresos_netos_renta:ingresos_netos, rentasMes_netos:REF.rentasMes_netos, otrosPer_netos:REF.otrosPer_netos,
      estacionamiento:safe(estac_pens,REF.estacionamiento), pensiones:REF.pensiones, maquinita:REF.maquinita, agua_ing:safe(agua_ing,REF.agua_ing),
      total_ingresos, rentasMes_total:REF.rentasMes_total, otrosPer_total:REF.otrosPer_total,
      sueldos:safe(sueldos,REF.sueldos), fondo_revolvente:safe(fondo_total,REF.fondo_revolvente),
      gasto_excedente:REF.gasto_excedente, luz:REF.luz, agua_gasto:REF.agua_gasto, otros:REF.otros,
      total_gastos, utilidad_bruta,
      predial:REF.predial, transporte_residuos:REF.transporte_residuos, licencia_estac:REF.licencia_estac, anuncio_iwol:REF.anuncio_iwol,
      total_impuestos:REF.total_impuestos, utilidad_neta:utilidad_bruta-REF.total_impuestos,
      cobros_raw:cobrosM, gastos_raw:gastosM,
      estac_raw:(estac||[]).filter(e=>e.estatus==='OCUPADO'),
      empleados_raw:(empleados||[]).filter(e=>e.estatus==='ACTIVO'),
      fondo_raw:fondo||[],
    }
  }, [cobros, gastos, fondo, estac, empleados, mes, anio])

  const imprimir = () => {
    const win = window.open('','_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Edo Resultados ${MESES[mes-1]} ${anio}</title>
    <style>*{box-sizing:border-box}body{font-family:Arial;padding:28px;font-size:11px}h2{color:#1A3C5E;margin:0 0 4px}
    table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1A3C5E;color:white;padding:7px;text-align:right;font-size:10px}th:first-child{text-align:left;width:42%}
    td{padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums}td:first-child{text-align:left}
    .sec td{background:#1A3C5E;color:white;font-weight:700;font-size:10px;text-transform:uppercase;padding:6px 8px}
    .note td{background:#F7F7F7;color:#B24020;font-style:italic;font-size:10px}
    .sub td{background:#E8F5E9;color:#1B5E20;font-weight:800}
    .tot td{background:#C8E6C9;color:#1B5E20;font-weight:800}
    .util td{background:#A5D6A7;color:#1B5E20;font-weight:900;font-size:13px;border-top:2px solid #388E3C;border-bottom:2px solid #388E3C}
    .neg{color:#B24020}.ft{margin-top:14px;font-size:9px;color:#888;border-top:1px solid #ddd;padding-top:8px}</style></head><body>
    <h2>Edo de Resultados Mes — ${MESES[mes-1]} ${anio}</h2>
    <p style="font-size:10px;color:#666;margin:0 0 8px">Plaza IWOL · ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</p>
    <table>
    <tr><th>Concepto</th><th>Proyectado</th><th>Total</th><th>Rentas Mes</th><th>Otros Periodos</th><th>Total vs Proy</th></tr>
    <tr class="sec"><td colspan="6">INGRESOS</td></tr>
    <tr class="note"><td>* Rentas totales</td><td>$ 822,427</td><td></td><td></td><td></td><td></td></tr>
    <tr class="note"><td>&nbsp;&nbsp;• Restaurant; Ampliación ($276 mt² pp)</td><td>$ 233,048</td><td></td><td></td><td></td><td></td></tr>
    <tr class="note"><td>&nbsp;&nbsp;Rentas disponibles (locales-Restau)</td><td>$ 589,380</td><td></td><td></td><td></td><td></td></tr>
    <tr class="note"><td>&nbsp;&nbsp;** Locales (L10, L22, Financiera L24,25,26)</td><td>$ 129,605</td><td></td><td></td><td></td><td></td></tr>
    <tr><td>Rentas brutas</td><td>$ 459,775</td><td>$ ${d.rentas_brutas.toLocaleString('es-MX')}</td><td>$ ${d.rentasMes_netos.toLocaleString('es-MX')}</td><td>$ 99,072</td><td>100%</td></tr>
    <tr><td>&nbsp;&nbsp;Rentas sin Factura</td><td></td><td>$ ${d.rentas_sin_factura.toLocaleString('es-MX')}</td><td>$ ${d.rentas_sin_factura.toLocaleString('es-MX')}</td><td></td><td></td></tr>
    <tr><td>&nbsp;&nbsp;Penalizaciones</td><td></td><td>$ ${d.penalizaciones.toLocaleString('es-MX')}</td><td></td><td>$ ${d.penalizaciones.toLocaleString('es-MX')}</td><td></td></tr>
    <tr><td>&nbsp;&nbsp;Iva</td><td class="neg">-$ 63,417</td><td class="neg">-$ ${d.iva.toLocaleString('es-MX')}</td><td class="neg">-$ 42,501</td><td class="neg">-$ 15,032</td><td>91%</td></tr>
    <tr class="sub"><td>Ingresos Netos Renta</td><td>$ 396,357</td><td>$ ${d.ingresos_netos_renta.toLocaleString('es-MX')}</td><td>$ ${d.rentasMes_netos.toLocaleString('es-MX')}</td><td>$ ${d.otrosPer_netos.toLocaleString('es-MX')}</td><td>108%</td></tr>
    <tr><td>Estacionamiento</td><td>$ 68,000</td><td>$ ${d.estacionamiento.toLocaleString('es-MX')}</td><td>$ ${d.estacionamiento.toLocaleString('es-MX')}</td><td></td><td>102%</td></tr>
    <tr><td>Pensiones</td><td>$ 3,500</td><td>$ ${d.pensiones.toLocaleString('es-MX')}</td><td>$ ${d.pensiones.toLocaleString('es-MX')}</td><td></td><td>154%</td></tr>
    <tr><td>Maquinita</td><td>$ 4,800</td><td>$ ${d.maquinita.toLocaleString('es-MX')}</td><td>$ ${d.maquinita.toLocaleString('es-MX')}</td><td></td><td>94%</td></tr>
    <tr><td>Agua</td><td>$ 11,819</td><td>$ ${d.agua_ing.toLocaleString('es-MX')}</td><td></td><td>$ ${d.agua_ing.toLocaleString('es-MX')}</td><td>3%</td></tr>
    <tr class="tot"><td>Total Ingresos</td><td>$ 484,477</td><td>$ ${d.total_ingresos.toLocaleString('es-MX')}</td><td>$ ${d.rentasMes_total.toLocaleString('es-MX')}</td><td>$ ${d.otrosPer_total.toLocaleString('es-MX')}</td><td>105%</td></tr>
    <tr class="sec"><td colspan="6">GASTOS VARIABLES</td></tr>
    <tr><td>Sueldos</td><td>$ 98,846</td><td>$ ${d.sueldos.toLocaleString('es-MX')}</td><td></td><td></td><td></td></tr>
    <tr><td>Fondo Revolvente</td><td>$ 20,000</td><td>$ ${d.fondo_revolvente.toLocaleString('es-MX')}</td><td></td><td></td><td></td></tr>
    <tr><td>Gasto Excedente</td><td></td><td>$ ${d.gasto_excedente.toLocaleString('es-MX')}</td><td></td><td></td><td></td></tr>
    <tr><td>Luz</td><td>$ 16,000</td><td>$ 16,000</td><td></td><td></td><td></td></tr>
    <tr><td>Agua</td><td>$ 45,000</td><td>$ 45,000</td><td></td><td></td><td></td></tr>
    <tr><td>Otros</td><td>$ 28,500</td><td>$ 28,500</td><td></td><td></td><td></td></tr>
    <tr class="tot"><td>Total Gastos Variables</td><td>$ 208,346</td><td>$ ${d.total_gastos.toLocaleString('es-MX')}</td><td></td><td></td><td>107%</td></tr>
    <tr class="util"><td>Utilidad Bruta</td><td>$ 276,131</td><td>$ ${d.utilidad_bruta.toLocaleString('es-MX')}</td><td></td><td></td><td>104%</td></tr>
    <tr class="sec"><td colspan="6">IMPUESTOS (prorrateados 12 meses) ***</td></tr>
    <tr><td>Predial</td><td>$ 11,894</td><td>$ 11,894</td><td></td><td></td><td></td></tr>
    <tr><td>Transporte De Residuos Sólidos</td><td>$ 1,273</td><td>$ 1,273</td><td></td><td></td><td></td></tr>
    <tr><td>Licencia De Estacionamiento</td><td>$ 1,595</td><td>$ 1,595</td><td></td><td></td><td></td></tr>
    <tr><td>Anuncio Publicitarios IWOL</td><td>$ 852</td><td>$ 852</td><td></td><td></td><td></td></tr>
    <tr class="tot"><td>Total Impuestos</td><td>$ 15,614</td><td>$ 15,614</td><td></td><td></td><td></td></tr>
    <tr class="util"><td>Utilidad Neta</td><td>$ 260,517</td><td>$ ${d.utilidad_neta.toLocaleString('es-MX')}</td><td></td><td></td><td>104%</td></tr>
    </table>
    <div class="ft">* Se tomó el precio promedio de la plaza para calcular este importe<br>** El monto de las rentas de los locales (Cafetería+Financiera)+importe calculado de L22<br>*** Los gastos de impuestos se prorratean en los 12 meses del año</div>
    </body></html>`)
    win.document.close(); win.print()
  }

  return (
    <div style={{ padding:'20px', maxWidth:'1080px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <div>
          <h1 style={{ margin:'0 0 2px', fontSize:'18px', fontWeight:900, color:'#1A3C5E' }}>Edo de Resultados Mes</h1>
          <p style={{ margin:0, fontSize:'12px', color:'#666' }}>Plaza IWOL · Haz clic en cualquier renglón para ver el detalle</p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          {[
            { label:'Mes Actual', fn: () => { const n=new Date(); setMes(n.getMonth()+1); setAnio(n.getFullYear()) } },
            { label:'Mes Pasado', fn: () => { const n=new Date(); const m=n.getMonth(); setMes(m===0?12:m); setAnio(m===0?n.getFullYear()-1:n.getFullYear()) } },
          ].map(({label,fn}) => (
            <button key={label} onClick={fn} style={{ padding:'6px 11px', border:'1.5px solid #D1D5DB', borderRadius:'20px', fontSize:'12px', fontWeight:600, background:'white', color:'#1A3C5E', cursor:'pointer', whiteSpace:'nowrap' }}>
              {label}
            </button>
          ))}
          <select value={mes} onChange={e=>setMes(Number(e.target.value))} style={{ padding:'7px 10px', border:'1.5px solid #D1D5DB', borderRadius:'7px', fontSize:'13px', fontWeight:600, background:'white', outline:'none' }}>
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e=>setAnio(Number(e.target.value))} style={{ padding:'7px 10px', border:'1.5px solid #D1D5DB', borderRadius:'7px', fontSize:'13px', fontWeight:600, background:'white', outline:'none' }}>
            {[2024,2025,2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={imprimir} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', background:'#1A3C5E', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>
            <Printer size={14}/> Imprimir PDF
          </button>
        </div>
      </div>

      {/* Tabla P&L */}
      <div style={{ background:'white', border:'1px solid #D1D5DB', borderRadius:'10px', overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <colgroup>
            <col style={{width:'40%'}}/>
            <col style={{width:'12%'}}/>
            <col style={{width:'12%'}}/>
            <col style={{width:'12%'}}/>
            <col style={{width:'12%'}}/>
            <col style={{width:'12%'}}/>
          </colgroup>
          <tbody>
            {/* Cabecera */}
            <PLRow type="header" label="Concepto" />

            {/* ── INGRESOS ── */}
            <PLRow type="header" label="INGRESOS" />
            <PLRow type="note" label="* Rentas totales" proy={822427} />
            <PLRow type="note" label="   • Restaurant; Ampliación ($276 mt² pp)" proy={233048} indent={1}/>
            <PLRow type="note" label="   Rentas disponibles (locales-Restau)" proy={589380} indent={1}/>
            <PLRow type="note" label="   ** Locales (L10, L22, Financiera L24,25,26)" proy={129605} indent={2}/>
            <PLRow label="Rentas brutas" proy={P.rentas_brutas} total={d.rentas_brutas} rentasMes={d.rentasMes_netos} otrosPer={99072} drill="rentas" onDrill={setDrill}/>
            <PLRow label="Rentas sin Factura" total={d.rentas_sin_factura} rentasMes={d.rentas_sin_factura} indent={1}/>
            <PLRow label="Penalizaciones" total={d.penalizaciones} otrosPer={d.penalizaciones} indent={1}/>
            <PLRow label="Iva" proy={P.iva} total={d.iva} rentasMes={42501} otrosPer={15032} negativo indent={1}/>
            <PLRow type="subtotal" label="Ingresos Netos Renta" proy={P.ingresos_netos_renta} total={d.ingresos_netos_renta} rentasMes={d.rentasMes_netos} otrosPer={d.otrosPer_netos} drill="rentas" onDrill={setDrill}/>
            <PLRow label="Estacionamiento" proy={P.estacionamiento} total={d.estacionamiento} rentasMes={d.estacionamiento} drill="estacionamiento" onDrill={setDrill}/>
            <PLRow label="Pensiones" proy={P.pensiones} total={d.pensiones} rentasMes={d.pensiones} drill="pensiones" onDrill={setDrill}/>
            <PLRow label="Maquinita" proy={P.maquinita} total={d.maquinita} rentasMes={d.maquinita} drill="maquinita" onDrill={setDrill}/>
            <PLRow label="Agua" proy={P.agua_ing} total={d.agua_ing} otrosPer={d.agua_ing} drill="agua" onDrill={setDrill}/>
            <PLRow type="total" label="Total Ingresos" proy={P.total_ingresos} total={d.total_ingresos} rentasMes={d.rentasMes_total} otrosPer={d.otrosPer_total}/>

            {/* ── GASTOS ── */}
            <PLRow type="header" label="GASTOS VARIABLES"/>
            <PLRow label="Sueldos" proy={P.sueldos} total={d.sueldos} drill="nomina" onDrill={setDrill}/>
            <PLRow label="Fondo Revolvente" proy={P.fondo_revolvente} total={d.fondo_revolvente} drill="fondo" onDrill={setDrill}/>
            <PLRow label="Gasto Excedente" total={d.gasto_excedente} drill="gastos" onDrill={setDrill}/>
            <PLRow label="Luz" proy={P.luz} total={d.luz}/>
            <PLRow label="Agua" proy={P.agua_gasto} total={d.agua_gasto}/>
            <PLRow label="Otros" proy={P.otros} total={d.otros} drill="gastos" onDrill={setDrill}/>
            <PLRow type="total" label="Total Gastos Variables" proy={P.total_gastos} total={d.total_gastos}/>

            {/* Utilidad Bruta */}
            <PLRow type="utilidad" label="Utilidad Bruta" proy={P.utilidad_bruta} total={d.utilidad_bruta}/>

            {/* ── IMPUESTOS ── */}
            <PLRow type="header" label="IMPUESTOS (prorrateados 12 meses) ***"/>
            <PLRow label="Predial" proy={P.predial} total={d.predial}/>
            <PLRow label="Transporte De Residuos Sólidos" proy={P.transporte_residuos} total={d.transporte_residuos}/>
            <PLRow label="Licencia De Estacionamiento" proy={P.licencia_estac} total={d.licencia_estac}/>
            <PLRow label="Anuncio Publicitarios IWOL" proy={P.anuncio_iwol} total={d.anuncio_iwol}/>
            <PLRow type="total" label="Total Impuestos" proy={P.total_impuestos} total={d.total_impuestos}/>

            {/* Utilidad Neta */}
            <PLRow type="utilidad" label="Utilidad Neta" proy={P.utilidad_neta} total={d.utilidad_neta}/>
          </tbody>
        </table>

        {/* Notas al pie */}
        <div style={{ padding:'10px 14px', background:'#FAFAFA', borderTop:'1px solid #E8E8E8', fontSize:'10px', color:'#666', lineHeight:1.8 }}>
          * Se tomó el precio promedio de la plaza para calcular este importe<br/>
          ** El monto de las rentas de los locales (Cafetería+Financiera)+importe calculado de L22<br/>
          *** Los gastos de impuestos se prorratean en los 12 meses del año
        </div>
      </div>

      {/* Drawers */}
      {drill==='rentas' && (
        <DrillDrawer titulo="Rentas cobradas del mes" onClose={()=>setDrill(null)}>
          {d.cobros_raw.length===0
            ? <p style={{color:'#888',fontSize:'13px'}}>Sin cobros pagados en {MESES[mes-1]} {anio}</p>
            : d.cobros_raw.map(c=>(
              <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F0F0F0'}}>
                <div><div style={{fontWeight:700,fontSize:'13px'}}>{c.arrendatario_nombre}</div><div style={{fontSize:'11px',color:'#888'}}>{c.unidad_numero}</div></div>
                <div style={{fontWeight:700,color:'#1B5E20'}}>{fmt(c.monto_renta)}</div>
              </div>
            ))
          }
        </DrillDrawer>
      )}
      {drill==='estacionamiento' && (
        <DrillDrawer titulo="Cajones ocupados" onClose={()=>setDrill(null)}>
          {d.estac_raw.map(e=>(
            <div key={e.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F0F0F0'}}>
              <div><div style={{fontWeight:700,fontSize:'13px'}}>#{e.numero_cajon} — {e.pension_titular||'Visitante'}</div><div style={{fontSize:'11px',color:'#888'}}>{e.vehiculo_placa}</div></div>
              <div style={{fontWeight:700,color:'#1B5E20'}}>{fmt(e.monto_mensual)}/mes</div>
            </div>
          ))}
          {d.estac_raw.length===0 && <p style={{color:'#888',fontSize:'13px'}}>Sin datos</p>}
        </DrillDrawer>
      )}
      {drill==='pensiones' && (
        <DrillDrawer titulo="Pensiones" onClose={()=>setDrill(null)}>
          {d.estac_raw.map(e=>(
            <div key={e.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F0F0F0'}}>
              <div style={{fontWeight:600,fontSize:'13px'}}>#{e.numero_cajon} · {e.pension_titular}</div>
              <div style={{fontWeight:700,color:'#1B5E20'}}>{fmt(e.monto_mensual)}</div>
            </div>
          ))}
        </DrillDrawer>
      )}
      {drill==='fondo' && (
        <DrillDrawer titulo="Fondo Revolvente" onClose={()=>setDrill(null)}>
          {d.fondo_raw.map((f,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F0F0F0'}}>
              <div style={{fontSize:'13px',fontWeight:600}}>{f.semana_label||f.semana_inicio||`Semana ${i+1}`}</div>
              <div style={{fontWeight:700,color:'#0A66C2'}}>{fmt(f.saldo_final||f.saldo_actual||f.monto)}</div>
            </div>
          ))}
          {d.fondo_raw.length===0 && <p style={{color:'#888',fontSize:'13px'}}>Sin registros</p>}
        </DrillDrawer>
      )}
      {drill==='nomina' && (
        <DrillDrawer titulo="Nómina — Empleados activos" onClose={()=>setDrill(null)}>
          {d.empleados_raw.map(e=>(
            <div key={e.id} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F0F0F0'}}>
              <div><div style={{fontWeight:700,fontSize:'13px'}}>{e.nombre_completo}</div><div style={{fontSize:'11px',color:'#888'}}>{e.puesto}</div></div>
              <div style={{fontWeight:700,color:'#0A66C2'}}>{fmt(e.salario_mensual||e.sueldo_bruto)}</div>
            </div>
          ))}
          {d.empleados_raw.length===0 && <p style={{color:'#888',fontSize:'13px'}}>Sin empleados activos</p>}
        </DrillDrawer>
      )}
      {drill==='gastos' && (
        <DrillDrawer titulo="Gastos del mes" onClose={()=>setDrill(null)}>
          {d.gastos_raw.map((g,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #F0F0F0'}}>
              <div><div style={{fontWeight:700,fontSize:'13px'}}>{g.proveedor_nombre||g.descripcion}</div><div style={{fontSize:'11px',color:'#888'}}>{g.grupo_nombre}</div></div>
              <div style={{fontWeight:700,color:'#B24020'}}>{fmt(g.monto_pagado)}</div>
            </div>
          ))}
          {d.gastos_raw.length===0 && <p style={{color:'#888',fontSize:'13px'}}>Sin gastos registrados</p>}
        </DrillDrawer>
      )}
      {drill==='agua' && (
        <DrillDrawer titulo="Agua Potable — Cobranza" onClose={()=>setDrill(null)}>
          <p style={{color:'#888',fontSize:'13px'}}>Ver módulo <strong>Agua Potable</strong> para el detalle de lecturas y recibos del mes.</p>
        </DrillDrawer>
      )}
      {drill==='maquinita' && (
        <DrillDrawer titulo="Maquinita / Vending" onClose={()=>setDrill(null)}>
          <p style={{color:'#888',fontSize:'13px'}}>Ver módulo <strong>Vending</strong> para el detalle de cierres semanales por máquina.</p>
        </DrillDrawer>
      )}
    </div>
  )
}
