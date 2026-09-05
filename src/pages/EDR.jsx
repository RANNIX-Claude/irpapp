import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Plus, Save, BarChart2, FileText, Printer, RefreshCw } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase, supabaseParking } from '../lib/supabase'
import toast from 'react-hot-toast'

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt   = n => '$' + (parseFloat(n)||0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const pct   = (real, proy) => (!proy || proy === 0) ? null : Math.round((real / proy) * 100)

/* ── Badge % ──────────────────────────────────────────────────────────────── */
function PctBadge({ value }) {
  if (value === null || value === undefined) return <span style={{ color:'#D1D5DB', fontSize:'11px' }}>—</span>
  const color = value >= 100 ? '#057642' : value >= 85 ? '#D97706' : '#B91C1C'
  const bg    = value >= 100 ? '#D1FAE5' : value >= 85 ? '#FEF3C7' : '#FEE2E2'
  return (
    <span style={{ fontSize:'11px', fontWeight:700, color, background:bg, padding:'2px 7px', borderRadius:'8px' }}>
      {value}%
    </span>
  )
}

/* ── Columnas: Concepto | Proyectado | Total | Rentas Mes | Otros Periodos | vs Proy ── */
const COLS = '260px 110px 110px 110px 110px 76px'

/* ── Fila de encabezado de sección (fondo oscuro azul/verde) ───────────────── */
function SectionHeader({ label, color = '#1E3A5F', bg = '#1E3A5F' }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0,
      background: bg, padding:'8px 16px' }}>
      <div style={{ fontSize:'11px', fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:'0.08em',
        gridColumn:'1 / -1' }}>
        {label}
      </div>
    </div>
  )
}

/* ── Fila informativa (rojo, sin datos en columnas reales) ─────────────────── */
function InfoRow({ label, proy = 0, indent = 0 }) {
  const p = parseFloat(proy) || 0
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0,
      padding:'4px 16px', borderTop:'1px solid #FEE2E2', background:'#FFF5F5' }}>
      <div style={{ fontSize:'11px', fontStyle:'italic', color:'#B91C1C',
        paddingLeft: indent * 16 + 'px', display:'flex', alignItems:'center' }}>
        {label}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#B91C1C', padding:'0 8px', fontWeight:600 }}>
        {p !== 0 ? fmt(p) : ''}
      </div>
      <div /><div /><div /><div />
    </div>
  )
}

/* ── Fila normal P&L ───────────────────────────────────────────────────────── */
function PLRow({ label, proy = 0, total = 0, rentasMes = 0, otrosPer = 0,
                 indent = 0, isNeg = false, noTotal = false }) {
  const p  = parseFloat(proy) || 0
  const t  = parseFloat(total) || 0
  const rm = parseFloat(rentasMes) || 0
  const op = parseFloat(otrosPer) || 0
  const ratio = noTotal ? null : pct(t, p)
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0,
      padding:'5px 16px', borderTop:'1px solid #F3F4F6',
      transition:'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ fontSize:'12px', color: isNeg ? '#B91C1C' : '#374151',
        paddingLeft: indent * 16 + 'px', display:'flex', alignItems:'center' }}>
        {label}
      </div>
      <div style={{ textAlign:'right', fontSize:'12px', color: p < 0 ? '#B91C1C' : '#374151', padding:'0 8px' }}>
        {p !== 0 ? fmt(p) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'12px', color: t < 0 ? '#B91C1C' : '#374151', padding:'0 8px' }}>
        {t !== 0 ? fmt(t) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#6B7280', padding:'0 8px' }}>
        {rm !== 0 ? fmt(rm) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#6B7280', padding:'0 8px' }}>
        {op !== 0 ? fmt(op) : ''}
      </div>
      <div style={{ textAlign:'center' }}><PctBadge value={ratio} /></div>
    </div>
  )
}

/* ── Fila subtotal / bold ──────────────────────────────────────────────────── */
function SubRow({ label, proy = 0, total = 0, rentasMes = 0, otrosPer = 0,
                  highlight = false, big = false }) {
  const p  = parseFloat(proy) || 0
  const t  = parseFloat(total) || 0
  const rm = parseFloat(rentasMes) || 0
  const op = parseFloat(otrosPer) || 0
  const ratio = pct(t, p)
  const bgColor = highlight ? (t >= 0 ? '#F0FDF4' : '#FEF2F2') : '#F9FAFB'
  const sz = big ? '14px' : '12px'
  const fw = big ? 900 : 700
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0,
      padding: big ? '12px 16px' : '8px 16px', background: bgColor,
      borderTop: big ? '3px solid ' + (t >= 0 ? '#057642' : '#B91C1C') : '2px solid #E5E7EB' }}>
      <div style={{ fontSize: sz, fontWeight: fw, color: big ? (t >= 0 ? '#057642' : '#B91C1C') : '#111827' }}>
        {label}
      </div>
      <div style={{ textAlign:'right', fontSize: sz, fontWeight: fw, color:'#374151', padding:'0 8px' }}>
        {p !== 0 ? fmt(p) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize: sz, fontWeight: fw,
        color: big ? (t >= 0 ? '#057642' : '#B91C1C') : '#374151', padding:'0 8px' }}>
        {t !== 0 ? fmt(t) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#6B7280', padding:'0 8px' }}>
        {rm !== 0 ? fmt(rm) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#6B7280', padding:'0 8px' }}>
        {op !== 0 ? fmt(op) : ''}
      </div>
      <div style={{ textAlign:'center' }}><PctBadge value={ratio} /></div>
    </div>
  )
}

/* ── Campo numérico ────────────────────────────────────────────────────────── */
function NumField({ label, field, values, onChange, hint = '' }) {
  return (
    <div style={{ marginBottom:'10px' }}>
      <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#6B7280',
        textTransform:'uppercase', marginBottom:'3px' }}>
        {label} {hint && <span style={{ fontWeight:400, textTransform:'none', color:'#9CA3AF' }}>({hint})</span>}
      </label>
      <input type="number" step="0.01"
        value={values[field] ?? ''}
        onChange={e => onChange(field, e.target.value)}
        style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
          fontSize:'13px', fontWeight:600, textAlign:'right', background:'white',
          color:'#111827', outline:'none', boxSizing:'border-box' }} />
    </div>
  )
}

/* ── Columnas En Elaboración: Concepto | Proy | Rentas Mes | Otros Periodos | Total | vs Proy ── */
const COLS_E = '1fr 100px 100px 100px 90px 68px'
const thE = { padding:'8px 10px', fontSize:'10px', fontWeight:700, color:'#6B7280',
  textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right',
  background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }

function CellInput({ field, values, onChange, hint, color = '#111827' }) {
  return (
    <div>
      <input type="number" step="0.01"
        value={values[field] ?? ''}
        onChange={e => onChange(field, e.target.value)}
        placeholder="—"
        style={{ width:'100%', padding:'4px 6px', border:'1.5px solid #E5E7EB', borderRadius:'6px',
          fontSize:'12px', fontWeight:600, textAlign:'right', background:'white',
          color, outline:'none', boxSizing:'border-box' }} />
      {hint && <div style={{ fontSize:'9px', color:'#9CA3AF', textAlign:'right', marginTop:'1px' }}>{hint}</div>}
    </div>
  )
}
function SecHdr({ label, bg = '#1A3C5E' }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, background: bg, padding:'7px 12px' }}>
      <div style={{ fontSize:'11px', fontWeight:800, color:'white', textTransform:'uppercase',
        letterSpacing:'0.07em', gridColumn:'1 / -1' }}>{label}</div>
    </div>
  )
}
function SubTot({ label, proy, real, mes = 0, otros = 0, highlight = false, big = false }) {
  const bg  = highlight ? (real >= 0 ? '#F0FDF4' : '#FEF2F2') : '#F5F5F5'
  const clr = big ? (real >= 0 ? '#057642' : '#B91C1C') : '#111827'
  const sz  = big ? '14px' : '12px', fw = big ? 900 : 700
  const ratio = pct(real, proy)
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding: big ? '10px 12px' : '7px 12px', background: bg,
      borderTop: big ? '3px solid ' + (real >= 0 ? '#057642' : '#B91C1C') : '2px solid #E5E7EB' }}>
      <div style={{ fontSize: sz, fontWeight: fw, color: clr }}>{label}</div>
      <div style={{ textAlign:'right', fontSize: sz, fontWeight: fw, color:'#6B7280', padding:'0 6px' }}>
        {proy !== 0 ? fmt(proy) : ''}
      </div>
      {/* Total antes que Mes/Otros (igual que Tablero) */}
      <div style={{ textAlign:'right', fontSize: sz, fontWeight: fw,
        color: big ? clr : (real < 0 ? '#B91C1C' : '#374151'), padding:'0 6px' }}>
        {real !== 0 ? fmt(real) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', fontWeight: fw, color:'#4B5563', padding:'0 6px' }}>
        {mes !== 0 ? fmt(mes) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', fontWeight: fw, color:'#4B5563', padding:'0 6px' }}>
        {otros !== 0 ? fmt(otros) : ''}
      </div>
      <div style={{ textAlign:'center' }}><PctBadge value={ratio} /></div>
    </div>
  )
}
/* Fila informativa de referencia dentro de En Elaboración */
function InfoRowE({ label, proy = 0, indent = 0 }) {
  const p = parseFloat(proy) || 0
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding:'3px 12px', borderTop:'1px solid #FEE2E2', background:'#FFF5F5' }}>
      <div style={{ fontSize:'11px', fontStyle:'italic', color:'#B91C1C',
        paddingLeft: indent * 14 + 'px', display:'flex', alignItems:'center' }}>
        {label}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#B91C1C', padding:'0 6px', fontWeight:600 }}>
        {p !== 0 ? fmt(p) : ''}
      </div>
      <div /><div /><div /><div />
    </div>
  )
}
/* EditRow para ingresos: fieldMes + fieldOtros → Total auto
   EditRow para gastos:   fieldR → Total editable, Mes/Otros vacíos */
function EditRow({ label, fieldP, fieldMes, fieldOtros, fieldR, form, setField,
                   indent = 0, hintP, hintMes, hintOtros, hintR, negLabel = false }) {
  const isSplit = !!fieldMes
  const mes   = isSplit ? (parseFloat(form[fieldMes])   || 0) : 0
  const otros = isSplit ? (parseFloat(form[fieldOtros]) || 0) : 0
  const total = isSplit ? mes + otros : (parseFloat(form[fieldR]) || 0)
  const proy  = parseFloat(form[fieldP]) || 0
  const ratio = pct(total, proy)
  const dash  = <div style={{ textAlign:'right', color:'#D1D5DB', fontSize:'12px' }}>—</div>
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding:'4px 12px', borderTop:'1px solid #F3F4F6', alignItems:'center', background:'white' }}
      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <div style={{ fontSize:'12px', color: negLabel ? '#B91C1C' : '#374151',
        paddingLeft: indent * 14 + 'px', display:'flex', alignItems:'center' }}>
        {label}
      </div>
      {/* Proyectado */}
      <div style={{ padding:'2px 4px' }}>
        {fieldP ? <CellInput field={fieldP} values={form} onChange={setField} hint={hintP} /> : dash}
      </div>
      {/* Total: auto si split, editable si gasto — posición 3 (igual que Tablero) */}
      <div style={{ padding:'2px 4px' }}>
        {isSplit
          ? <div style={{ textAlign:'right', fontSize:'12px', fontWeight:700, color:'#374151', padding:'4px 6px' }}>
              {total !== 0 ? fmt(total) : <span style={{ color:'#D1D5DB' }}>—</span>}
            </div>
          : fieldR
            ? <CellInput field={fieldR} values={form} onChange={setField} hint={hintR}
                color={negLabel ? '#B91C1C' : '#111827'} />
            : dash}
      </div>
      {/* Rentas Mes */}
      <div style={{ padding:'2px 4px' }}>
        {isSplit ? <CellInput field={fieldMes} values={form} onChange={setField} hint={hintMes} /> : dash}
      </div>
      {/* Otros Periodos */}
      <div style={{ padding:'2px 4px' }}>
        {isSplit ? <CellInput field={fieldOtros} values={form} onChange={setField} hint={hintOtros} /> : dash}
      </div>
      {/* % vs Proy */}
      <div style={{ textAlign:'center' }}><PctBadge value={ratio} /></div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════════════════════ */
export default function EDR() {
  useModuleAudit('EDR')

  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [tab,  setTab]  = useState('tablero')

  const [registro,      setRegistro]      = useState(null)
  const [form,          setForm]          = useState({})
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [cargando,      setCargando]      = useState(false)
  const [proyRentas,    setProyRentas]    = useState(0)
  const [realRentas,    setRealRentas]    = useState({ factura: 0, total: 0 })
  const [realIngByTipo, setRealIngByTipo] = useState({})
  const [proySueldos,   setProySueldos]   = useState(0)
  const [resumenCarga,  setResumenCarga]  = useState(null) // { rentas, pensiones, sueldos }

  const loadProyectado = useCallback(async () => {
    const { data } = await supabase
      .from('prp_contratos').select('renta_mensual')
      .in('estatus', ['VIGENTE','vigente','Vigente'])
    if (data) setProyRentas(data.reduce((s, c) => s + (parseFloat(c.renta_mensual)||0), 0))
  }, [])

  const loadRealRentas = useCallback(async (m, a) => {
    const fechaIni = `${a}-${String(m).padStart(2,'0')}-01`
    const fechaFin = `${a}-${String(m).padStart(2,'0')}-${new Date(a, m, 0).getDate()}`
    // Base caja: todo cobrado en el mes calendario, todos los tipos
    const { data } = await supabase.from('ingresos')
      .select('importe, factura, mes, anio, tipo')
      .gte('fecha', fechaIni).lte('fecha', fechaFin)
    if (data) {
      const esMes = r => r.mes === m && r.anio === a
      const sum   = rows => rows.reduce((s, r) => s + (parseFloat(r.importe)||0), 0)

      // RENTA
      const rentas      = data.filter(r => r.tipo === 'RENTA')
      const rentasMes   = rentas.filter(esMes)
      const rentasOtros = rentas.filter(r => !esMes(r))
      const factura     = rentasMes.filter(r => r.factura).reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      setRealRentas({
        factura,
        total:          sum(rentas),
        rentas_mes:     sum(rentasMes),
        otros_periodos: sum(rentasOtros),
      })

      // Otros tipos — split mes/otros base caja
      const byTipo = {}
      for (const tipo of ['ESTACIONAMIENTO','PENSION','MAQUINITA','AGUA']) {
        const rows = data.filter(r => r.tipo === tipo)
        byTipo[tipo] = {
          mes:   sum(rows.filter(esMes)),
          otros: sum(rows.filter(r => !esMes(r))),
          total: sum(rows),
        }
      }
      setRealIngByTipo(byTipo)
    }
  }, [])

  const loadProySueldos = useCallback(async (m, a) => {
    const dias = new Date(a, m, 0).getDate()
    const { data } = await supabase.from('empleados')
      .select('sueldo_diario').eq('status','ACTIVO').not('sueldo_diario','is',null)
    if (data) setProySueldos(data.reduce((s, e) => s + ((parseFloat(e.sueldo_diario)||0) * dias), 0))
  }, [])

  const loadRegistro = useCallback(async (m, a) => {
    setLoading(true)
    const { data } = await supabase.from('er_mensual').select('*')
      .eq('mes', m).eq('anio', a).maybeSingle()
    setRegistro(data || null)
    setForm(data || {})
    setLoading(false)
  }, [])

  useEffect(() => { loadProyectado() }, [loadProyectado])
  useEffect(() => {
    loadRegistro(mes, anio)
    loadRealRentas(mes, anio)
    loadProySueldos(mes, anio)
  }, [mes, anio, loadRegistro, loadRealRentas, loadProySueldos])

  // Auto-sincroniza campos _mes/_otros desde ingresos si no hay foto guardada
  // (campo === 0 o null → usa valor de ingresos; si ya tiene valor → respeta la foto)
  useEffect(() => {
    if (!realRentas.rentas_mes && !realIngByTipo.ESTACIONAMIENTO) return
    setForm(f => ({
      ...f,
      real_rentas_factura_mes:   f.real_rentas_factura_mes   || realRentas.factura           || 0,
      real_rentas_factura_otros: f.real_rentas_factura_otros || (realRentas.otros_periodos   || 0),
      real_rsf_mes:              f.real_rsf_mes              || ((realRentas.rentas_mes || 0) - (realRentas.factura || 0)) || 0,
      real_rsf_otros:            f.real_rsf_otros            || 0,
      real_estac_mes:            f.real_estac_mes            || realIngByTipo.ESTACIONAMIENTO?.mes   || 0,
      real_estac_otros:          f.real_estac_otros          || realIngByTipo.ESTACIONAMIENTO?.otros || 0,
      real_pension_mes:          f.real_pension_mes          || realIngByTipo.PENSION?.mes            || 0,
      real_pension_otros:        f.real_pension_otros        || realIngByTipo.PENSION?.otros          || 0,
      real_maquinita_mes:        f.real_maquinita_mes        || realIngByTipo.MAQUINITA?.mes          || 0,
      real_maquinita_otros:      f.real_maquinita_otros      || realIngByTipo.MAQUINITA?.otros        || 0,
      real_agua_ing_mes:         f.real_agua_ing_mes         || realIngByTipo.AGUA?.mes               || 0,
      real_agua_ing_otros:       f.real_agua_ing_otros       || realIngByTipo.AGUA?.otros             || 0,
    }))
  }, [realRentas, realIngByTipo])

  const irMes = (delta) => {
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  // ── Cargar datos automáticos de las fuentes de verdad ───────────────────────
  const cargarDatosAutomaticos = useCallback(async () => {
    setCargando(true)
    const resumen = { rentas: 0, poyPensiones: 0, realPensiones: 0, sueldos: 0 }

    // 1. Rentas proyectadas: contratos vigentes
    const { data: contratos } = await supabase
      .from('prp_contratos').select('renta_mensual')
      .in('estatus', ['VIGENTE','vigente','Vigente'])
    const sumRentas = contratos?.reduce((s, c) => s + (parseFloat(c.renta_mensual)||0), 0) || 0
    resumen.rentas = sumRentas

    // 2. Rentas reales: ingresos cobrados en el mes (base caja), tipo RENTA
    const fechaIniR = `${anio}-${String(mes).padStart(2,'0')}-01`
    const fechaFinR = `${anio}-${String(mes).padStart(2,'0')}-${new Date(anio, mes, 0).getDate()}`
    const { data: ingresosRenta } = await supabase
      .from('ingresos').select('importe, factura, mes, anio')
      .eq('tipo', 'RENTA')
      .gte('fecha', fechaIniR).lte('fecha', fechaFinR)
    const rFactura = ingresosRenta?.filter(r => r.factura).reduce((s, r) => s + (parseFloat(r.importe)||0), 0) || 0
    const rSinFact = ingresosRenta?.filter(r => !r.factura).reduce((s, r) => s + (parseFloat(r.importe)||0), 0) || 0

    // 3. Pensiones: desde DB de estacionamiento
    let poyPensiones = 0, realPensiones = 0
    if (supabaseParking) {
      // Proyectado: suma de monto_mensual de pensiones activas
      const { data: pensionesActivas } = await supabaseParking
        .from('pensiones').select('monto_mensual').eq('activa', true)
      poyPensiones = pensionesActivas?.reduce((s, p) => s + (parseFloat(p.monto_mensual)||0), 0) || 0

      // Real: pagos_pension cobrados en el mes seleccionado
      const { data: pagosPension } = await supabaseParking
        .from('pagos_pension').select('monto_pagado')
        .eq('periodo_mes', mes).eq('periodo_año', anio).eq('estado', 'pagado')
      realPensiones = pagosPension?.reduce((s, p) => s + (parseFloat(p.monto_pagado)||0), 0) || 0
    }
    resumen.poyPensiones  = poyPensiones
    resumen.realPensiones = realPensiones

    // 4. Sueldos reales: nóminas autorizadas/pagadas con fecha_pago en el mes
    const fechaIni = fechaIniR
    const fechaFin = fechaFinR
    const { data: nominas } = await supabase
      .from('nomina_periodos').select('total_neto')
      .in('estado', ['AUTORIZADA','PAGADA','TIMBRADA'])
      .gte('fecha_pago', fechaIni).lte('fecha_pago', fechaFin)
    const sumSueldos = nominas?.reduce((s, n) => s + (parseFloat(n.total_neto)||0), 0) || 0
    resumen.sueldos = sumSueldos

    // Splits cash-basis desde ingresos (sugerencias para captura)
    const esMesCurrent = r => r.mes === mes && r.anio === anio
    const rmFact  = ingresosRenta?.filter(r => r.factura  && esMesCurrent(r)).reduce((s,r)=>s+(parseFloat(r.importe)||0),0) || 0
    const opFact  = ingresosRenta?.filter(r => r.factura  && !esMesCurrent(r)).reduce((s,r)=>s+(parseFloat(r.importe)||0),0) || 0
    const rmSin   = ingresosRenta?.filter(r => !r.factura && esMesCurrent(r)).reduce((s,r)=>s+(parseFloat(r.importe)||0),0) || 0
    const opSin   = ingresosRenta?.filter(r => !r.factura && !esMesCurrent(r)).reduce((s,r)=>s+(parseFloat(r.importe)||0),0) || 0

    // Fuerza recarga — siempre sobreescribe con datos frescos de ingresos (foto nueva)
    setForm(f => ({
      ...f,
      proy_rentas_contratos:       sumRentas,
      real_rentas_factura:         rFactura,
      real_rentas_sin_factura:     rSinFact,
      real_rentas_factura_mes:     rmFact,
      real_rentas_factura_otros:   opFact,
      real_rsf_mes:                rmSin,
      real_rsf_otros:              opSin,
      proy_pensiones:              poyPensiones,
      real_pensiones:              realPensiones,
      real_pension_mes:            realPensiones,
      real_pension_otros:          0,
      real_sueldos:                sumSueldos,
      // Estacionamiento/Maquinita/Agua — desde realIngByTipo ya cargado
      real_estac_mes:              realIngByTipo.ESTACIONAMIENTO?.mes   || 0,
      real_estac_otros:            realIngByTipo.ESTACIONAMIENTO?.otros || 0,
      real_maquinita_mes:          realIngByTipo.MAQUINITA?.mes         || 0,
      real_maquinita_otros:        realIngByTipo.MAQUINITA?.otros       || 0,
      real_agua_ing_mes:           realIngByTipo.AGUA?.mes              || 0,
      real_agua_ing_otros:         realIngByTipo.AGUA?.otros            || 0,
    }))
    setProyRentas(sumRentas)
    setRealRentas({ factura: rFactura, total: rFactura + rSinFact, rentas_mes: rmFact + rmSin, otros_periodos: opFact + opSin })
    setResumenCarga(resumen)
    setCargando(false)
    toast.success(`Datos cargados: rentas ${fmt(sumRentas)}, sueldos ${fmt(sumSueldos)}, pensiones ${fmt(realPensiones)}`)
  }, [mes, anio])

  const handleNuevo = async () => {
    if (registro) { toast('Ya existe un registro para este mes'); return }
    setSaving(true)
    const { data, error } = await supabase.from('er_mensual')
      .insert({ anio, mes, proy_rentas_contratos: proyRentas, proy_sueldos: proySueldos, status:'borrador' })
      .select().single()
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    setRegistro(data); setForm(data); setSaving(false)
    setTab('elaboracion')
    toast.success('Registro creado')
  }

  const handleSave = async () => {
    if (!registro) return
    setSaving(true)
    const payload = { ...form }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = await supabase.from('er_mensual').update(payload).eq('id', registro.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    await loadRegistro(mes, anio)
    setSaving(false)
    toast.success('Guardado')
  }

  const setField = (field, val) =>
    setForm(f => ({ ...f, [field]: val === '' ? null : parseFloat(val) || 0 }))

  /* ── Cálculos tablero ─────────────────────────────────────────────────────── */
  const r = registro || {}

  // Proyectado
  const pRentas    = parseFloat(r.proy_rentas_contratos) || proyRentas
  const pRestaurant= parseFloat(r.proy_restaurant) || 0
  const pVacantes  = -(Math.abs(parseFloat(r.proy_locales_vacantes) || 0))
  const pRentasBrutas = pRentas + pRestaurant + pVacantes
  const pEstac     = parseFloat(r.proy_estacionamiento) || 0
  const pPensiones = parseFloat(r.proy_pensiones) || 0
  const pMaquinita = parseFloat(r.proy_maquinita) || 0
  const pAguaIng   = parseFloat(r.proy_agua_ingresos) || 0
  const pIngNeto   = pRentasBrutas  // IVA no proyectado
  const pTotalIng  = pIngNeto + pEstac + pPensiones + pMaquinita + pAguaIng

  const pSueldos   = parseFloat(r.proy_sueldos) || proySueldos
  const pFondo     = parseFloat(r.proy_fondo_revolvente) || 0
  const pLuz       = parseFloat(r.proy_luz) || 0
  const pAguaG     = parseFloat(r.proy_agua_gastos) || 0
  const pOtros     = parseFloat(r.proy_otros_gastos) || 0
  const pTotalG    = pSueldos + pFondo + pLuz + pAguaG + pOtros

  const pPredial   = parseFloat(r.predial) || 0
  const pTransp    = parseFloat(r.transporte_residuos) || 0
  const pLicencia  = parseFloat(r.licencia_estacionamiento) || 0
  const pAnuncio   = parseFloat(r.anuncio_publicitario) || 0
  const pTotalImp  = pPredial + pTransp + pLicencia + pAnuncio

  const pUtilBruta = pTotalIng - pTotalG
  const pUtilNeta  = pUtilBruta - pTotalImp

  // Real — leído desde er_mensual (capturado en En Elaboración)
  // Columnas _mes / _otros almacenadas; total = mes + otros
  const rmRentaFact = parseFloat(r.real_rentas_factura_mes)   || 0
  const opRentaFact = parseFloat(r.real_rentas_factura_otros)  || 0
  const rmRentaSin  = parseFloat(r.real_rsf_mes)               || 0
  const opRentaSin  = parseFloat(r.real_rsf_otros)             || 0
  const rmPenaliz   = parseFloat(r.real_penaliz_mes)           || 0
  const opPenaliz   = parseFloat(r.real_penaliz_otros)         || 0
  const rmEstac     = parseFloat(r.real_estac_mes)             || 0
  const opEstac     = parseFloat(r.real_estac_otros)           || 0
  const rmPension   = parseFloat(r.real_pension_mes)           || 0
  const opPension   = parseFloat(r.real_pension_otros)         || 0
  const rmMaquinita = parseFloat(r.real_maquinita_mes)         || 0
  const opMaquinita = parseFloat(r.real_maquinita_otros)       || 0
  const rmAguaIng   = parseFloat(r.real_agua_ing_mes)          || 0
  const opAguaIng   = parseFloat(r.real_agua_ing_otros)        || 0

  // Totales: foto guardada (er_mensual) > fallback ingresos query
  // null en er_mensual → aún sin foto → usar datos vivos de ingresos
  const hasFoto = (mes_val, otros_val) => r.id && (mes_val !== null || otros_val !== null)
  const rRentaFact    = hasFoto(r.real_rentas_factura_mes, r.real_rentas_factura_otros)
    ? rmRentaFact + opRentaFact
    : (realRentas.factura || 0)
  const rRentaSin     = hasFoto(r.real_rsf_mes, r.real_rsf_otros)
    ? rmRentaSin + opRentaSin
    : 0
  const rPenaliz      = hasFoto(r.real_penaliz_mes, r.real_penaliz_otros)
    ? rmPenaliz + opPenaliz
    : 0
  const rIva          = -(Math.abs(parseFloat(r.real_iva) || 0))
  const rRentasBrutas = rRentaFact + rRentaSin + rPenaliz

  const rmRentasBrutas = hasFoto(r.real_rentas_factura_mes, r.real_rsf_mes)
    ? rmRentaFact + rmRentaSin + rmPenaliz
    : (realRentas.rentas_mes    || 0)
  const opRentasBrutas = hasFoto(r.real_rentas_factura_otros, r.real_rsf_otros)
    ? opRentaFact + opRentaSin + opPenaliz
    : (realRentas.otros_periodos || 0)

  const rIngNeto   = rRentasBrutas + rIva
  const rEstac     = hasFoto(r.real_estac_mes, r.real_estac_otros)
    ? rmEstac + opEstac
    : (realIngByTipo.ESTACIONAMIENTO?.total || parseFloat(r.real_estacionamiento) || 0)
  const rPensiones = hasFoto(r.real_pension_mes, r.real_pension_otros)
    ? rmPension + opPension
    : (realIngByTipo.PENSION?.total || parseFloat(r.real_pensiones) || 0)
  const rMaquinita = hasFoto(r.real_maquinita_mes, r.real_maquinita_otros)
    ? rmMaquinita + opMaquinita
    : (realIngByTipo.MAQUINITA?.total || parseFloat(r.real_maquinita) || 0)
  const rAguaIng   = hasFoto(r.real_agua_ing_mes, r.real_agua_ing_otros)
    ? rmAguaIng + opAguaIng
    : (realIngByTipo.AGUA?.total || parseFloat(r.real_agua_ingresos) || 0)
  const rTotalIng  = rIngNeto + rEstac + rPensiones + rMaquinita + rAguaIng

  const rSueldos   = parseFloat(r.real_sueldos) || 0
  const rFondo     = parseFloat(r.real_fondo_revolvente) || 0
  const rExcedente = parseFloat(r.real_gasto_excedente) || 0
  const rLuz       = parseFloat(r.real_luz) || 0
  const rAguaG     = parseFloat(r.real_agua_gastos) || 0
  const rOtros     = parseFloat(r.real_otros_gastos) || 0
  const rTotalG    = rSueldos + rFondo + rExcedente + rLuz + rAguaG + rOtros

  const rUtilBruta = rTotalIng - rTotalG
  const rTotalImp  = pTotalImp
  const rUtilNeta  = rUtilBruta - rTotalImp

  const thSt = { padding:'9px 16px', fontSize:'10px', fontWeight:700, color:'#6B7280',
    textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right',
    background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }

  return (
    <>
      {/* Print + spinner CSS */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden; }
          #edr-print, #edr-print * { visibility: visible; }
          #edr-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 15mm; }
        }
      `}</style>

      <div style={{ padding:'24px', maxWidth:'1200px' }}>

        {/* ── Header ── */}
        <div className="no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:700, margin:'0 0 3px', display:'flex', alignItems:'center', gap:'8px', color:'var(--color-text)' }}>
              <TrendingUp size={20} color="var(--color-primary)" /> Estado de Resultados
            </h1>
            <p style={{ fontSize:'12px', color:'var(--color-text-light)', margin:0 }}>
              Plaza IWOL · Haz clic en cualquier renglón para ver el detalle
            </p>
          </div>

          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={() => irMes(0)}
              style={{ padding:'7px 14px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
              Mes Actual
            </button>
            <button onClick={() => irMes(-1)}
              style={{ padding:'7px 14px', background:'white', color:'#374151', border:'1.5px solid #E5E7EB', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
              Mes Pasado
            </button>
            <select value={mes} onChange={e => setMes(+e.target.value)}
              style={{ padding:'7px 12px', border:'1.5px solid #E5E7EB', borderRadius:'7px', fontSize:'13px', fontWeight:600, color:'var(--color-primary)' }}>
              {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={anio} onChange={e => setAnio(+e.target.value)}
              style={{ padding:'7px 12px', border:'1.5px solid #E5E7EB', borderRadius:'7px', fontSize:'13px', fontWeight:600, color:'var(--color-primary)' }}>
              {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <button onClick={() => window.print()}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', background:'#374151', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
              <Printer size={14} /> Imprimir PDF
            </button>
            {!registro && (
              <button onClick={handleNuevo} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                <Plus size={14} /> Nuevo
              </button>
            )}
            {registro && tab === 'elaboracion' && (<>
              <button onClick={cargarDatosAutomaticos} disabled={cargando}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', background:'#6D28D9', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                <RefreshCw size={14} style={{ animation: cargando ? 'spin 1s linear infinite' : 'none' }} />
                {cargando ? 'Cargando…' : 'Cargar Datos'}
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', background:'var(--color-success)', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </>)}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="no-print" style={{ display:'flex', gap:0, marginBottom:'20px', borderBottom:'2px solid #E5E7EB' }}>
          {[
            { id:'tablero',     label:'Tablero',        icon:<BarChart2 size={14} /> },
            { id:'elaboracion', label:'En Elaboración', icon:<FileText  size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'10px 20px', background:'none', border:'none',
                borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom:'-2px', fontSize:'13px', fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? 'var(--color-primary)' : '#6B7280', cursor:'pointer' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><LoadingSpinner /></div>
        ) : !registro && tab === 'tablero' ? (
          <div style={{ textAlign:'center', padding:'60px 20px', background:'white', borderRadius:'12px', border:'1.5px dashed #D1D5DB' }}>
            <TrendingUp size={40} color="#D1D5DB" style={{ marginBottom:'12px' }} />
            <div style={{ fontSize:'15px', fontWeight:600, color:'#6B7280', marginBottom:'6px' }}>
              Sin registro para {MESES[mes]} {anio}
            </div>
            <button onClick={handleNuevo} disabled={saving}
              style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'10px 22px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
              <Plus size={15} /> Crear registro {MESES[mes]} {anio}
            </button>
          </div>

        ) : tab === 'tablero' ? (
          /* ══════════════════════════════════════════════════════════════════
             TAB: TABLERO
             ══════════════════════════════════════════════════════════════════ */
          <div id="edr-print" style={{ background:'white', borderRadius:'12px', border:'1px solid #E5E7EB', overflow:'hidden' }}>

            {/* Encabezado de columnas */}
            <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0 }}>
              <div style={{ ...thSt, textAlign:'left' }}>Concepto</div>
              <div style={thSt}>Proyectado</div>
              <div style={thSt}>Total</div>
              <div style={thSt}>Rentas Mes</div>
              <div style={thSt}>Otros Periodos</div>
              <div style={thSt}>Total vs Proy</div>
            </div>

            {/* ── INGRESOS ─────────────────────────────────────────────────── */}
            <SectionHeader label="Ingresos" bg="#1A3C5E" />

            {/* Filas informativas rojas (referencia) */}
            <InfoRow label={`* Rentas totales`} proy={pRentas} />
            {pRestaurant !== 0 && (
              <InfoRow label={`• Restaurant; Ampliación ($276 mt² pp)`} proy={pRestaurant} indent={1} />
            )}
            <InfoRow label="Rentas disponibles (locales-Restau)" proy={pRentas - pRestaurant} indent={1} />
            {pVacantes !== 0 && (
              <InfoRow label="** Locales (L10, L22, Financiera L24,25,26)" proy={Math.abs(pVacantes)} indent={2} />
            )}

            <PLRow label="Rentas brutas"
              proy={pRentasBrutas} total={rRentasBrutas}
              rentasMes={rmRentasBrutas} otrosPer={opRentasBrutas} />
            <PLRow label="Rentas sin Factura" indent={1}
              total={rRentaSin} rentasMes={rmRentaSin} otrosPer={opRentaSin} />
            <PLRow label="Penalizaciones" indent={1}
              total={rPenaliz} rentasMes={rmPenaliz} otrosPer={opPenaliz} />
            <PLRow label="Iva" indent={1} isNeg
              proy={0} total={rIva}
              rentasMes={rIva !== 0 ? Math.round(rIva * (rmRentasBrutas / (rRentasBrutas || 1))) : 0}
              otrosPer={rIva !== 0 ? Math.round(rIva * (opRentasBrutas / (rRentasBrutas || 1))) : 0} />

            <SubRow label="Ingresos Netos Renta" highlight
              proy={pIngNeto} total={rIngNeto}
              rentasMes={rmRentasBrutas + (rIva !== 0 ? Math.round(rIva * (rmRentasBrutas / (rRentasBrutas || 1))) : 0)}
              otrosPer={opRentasBrutas  + (rIva !== 0 ? Math.round(rIva * (opRentasBrutas  / (rRentasBrutas || 1))) : 0)} />

            <PLRow label="Estacionamiento"
              proy={pEstac} total={rEstac} rentasMes={rmEstac} otrosPer={opEstac} />
            <PLRow label="Pensiones"
              proy={pPensiones} total={rPensiones} rentasMes={rmPension} otrosPer={opPension} />
            <PLRow label="Maquinita"
              proy={pMaquinita} total={rMaquinita} rentasMes={rmMaquinita} otrosPer={opMaquinita} />
            <PLRow label="Agua"
              proy={pAguaIng} total={rAguaIng} rentasMes={rmAguaIng} otrosPer={opAguaIng} />

            <SubRow label="Total Ingresos" highlight
              proy={pTotalIng} total={rTotalIng}
              rentasMes={rmRentasBrutas + rmEstac + rmPension + rmMaquinita + rmAguaIng}
              otrosPer={opRentasBrutas  + opEstac + opPension + opMaquinita + opAguaIng} />

            {/* ── GASTOS VARIABLES ─────────────────────────────────────────── */}
            <SectionHeader label="Gastos Variables" bg="#1A3C5E" />

            <PLRow label="Sueldos"          proy={pSueldos}  total={rSueldos} />
            <PLRow label="Fondo Revolvente" proy={pFondo}    total={rFondo} />
            {rExcedente !== 0 && (
              <PLRow label="Gasto Excedente" indent={1} total={rExcedente} />
            )}
            <PLRow label="Luz"   proy={pLuz}   total={rLuz} />
            <PLRow label="Agua"  proy={pAguaG} total={rAguaG} />
            <PLRow label="Otros" proy={pOtros} total={rOtros} />

            <SubRow label="Total Gastos Variables"
              proy={pTotalG} total={rTotalG} />

            {/* ── UTILIDAD BRUTA ── */}
            <SubRow label="Utilidad Bruta" highlight
              proy={pUtilBruta} total={rUtilBruta} />

            {/* ── IMPUESTOS Y GASTOS FIJOS ─────────────────────────────────── */}
            <SectionHeader label="Impuestos y Gastos Fijos" bg="#4B5563" />

            <PLRow label="Predial"                        proy={pPredial}  total={pPredial} />
            <PLRow label="Transporte de Residuos Sólidos" proy={pTransp}   total={pTransp} />
            <PLRow label="Licencia de Estacionamiento"    proy={pLicencia} total={pLicencia} />
            <PLRow label="Anuncio Publicitario IWOL"      proy={pAnuncio}  total={pAnuncio} />

            <SubRow label="Total Impuestos"
              proy={pTotalImp} total={rTotalImp} />

            {/* ── UTILIDAD NETA ── */}
            <SubRow label="Utilidad Neta" highlight big
              proy={pUtilNeta} total={rUtilNeta} />

            {/* Footer */}
            <div style={{ padding:'8px 16px', background:'#F9FAFB', borderTop:'1px solid #E5E7EB',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'11px', color:'#9CA3AF' }}>
                {MESES[mes]} {anio} · Act: {registro?.updated_at ? new Date(registro.updated_at).toLocaleDateString('es-MX') : '—'}
              </span>
              <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'8px',
                background: registro?.status === 'cerrado' ? '#D1FAE5' : '#FEF3C7',
                color: registro?.status === 'cerrado' ? '#057642' : '#92400E' }}>
                {registro?.status === 'cerrado' ? 'CERRADO' : 'BORRADOR'}
              </span>
            </div>
          </div>

        ) : (
          /* ══════════════════════════════════════════════════════════════════
             TAB: EN ELABORACIÓN
             ══════════════════════════════════════════════════════════════════ */
          (() => {
            const fForm = {
              ...form,
              proy_rentas_contratos:      form.proy_rentas_contratos ?? proyRentas,
              proy_sueldos:               form.proy_sueldos          ?? proySueldos,
              real_rentas_factura_mes:    form.real_rentas_factura_mes  ?? 0,
              real_rentas_factura_otros:  form.real_rentas_factura_otros ?? 0,
            }
            const sf = setField

            // Totales auto en En Elaboración (para SubTot)
            const eRentaFact  = (parseFloat(fForm.real_rentas_factura_mes)||0)  + (parseFloat(fForm.real_rentas_factura_otros)||0)
            const eRentaSin   = (parseFloat(fForm.real_rsf_mes)||0)              + (parseFloat(fForm.real_rsf_otros)||0)
            const ePenaliz    = (parseFloat(fForm.real_penaliz_mes)||0)          + (parseFloat(fForm.real_penaliz_otros)||0)
            const eIva        = -(Math.abs(parseFloat(fForm.real_iva)||0))
            const eRentasBrutas = eRentaFact + eRentaSin + ePenaliz
            const eRmRentas   = (parseFloat(fForm.real_rentas_factura_mes)||0)  + (parseFloat(fForm.real_rsf_mes)||0)   + (parseFloat(fForm.real_penaliz_mes)||0)
            const eOpRentas   = (parseFloat(fForm.real_rentas_factura_otros)||0) + (parseFloat(fForm.real_rsf_otros)||0) + (parseFloat(fForm.real_penaliz_otros)||0)
            const eIngNeto    = eRentasBrutas + eIva
            const eEstac      = (parseFloat(fForm.real_estac_mes)||0)    + (parseFloat(fForm.real_estac_otros)||0)
            const ePension    = (parseFloat(fForm.real_pension_mes)||0)  + (parseFloat(fForm.real_pension_otros)||0)
            const eMaquinita  = (parseFloat(fForm.real_maquinita_mes)||0) + (parseFloat(fForm.real_maquinita_otros)||0)
            const eAguaIng    = (parseFloat(fForm.real_agua_ing_mes)||0) + (parseFloat(fForm.real_agua_ing_otros)||0)
            const eTotalIng   = eIngNeto + eEstac + ePension + eMaquinita + eAguaIng
            const eRmEstac    = parseFloat(fForm.real_estac_mes)||0
            const eOpEstac    = parseFloat(fForm.real_estac_otros)||0
            const eRmPension  = parseFloat(fForm.real_pension_mes)||0
            const eOpPension  = parseFloat(fForm.real_pension_otros)||0
            const eRmMaq      = parseFloat(fForm.real_maquinita_mes)||0
            const eOpMaq      = parseFloat(fForm.real_maquinita_otros)||0
            const eRmAgua     = parseFloat(fForm.real_agua_ing_mes)||0
            const eOpAgua     = parseFloat(fForm.real_agua_ing_otros)||0

            return (
              <div style={{ background:'white', borderRadius:'12px', border:'1px solid #E5E7EB', overflow:'hidden' }}>

                {resumenCarga && (
                  <div style={{ padding:'10px 14px', background:'#EDE9FE', borderBottom:'1px solid #DDD6FE',
                    display:'flex', gap:'20px', flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#6D28D9' }}>Datos cargados automáticamente:</span>
                    <span style={{ fontSize:'11px', color:'#374151' }}>Rentas: <strong>{fmt(resumenCarga.rentas)}</strong></span>
                    <span style={{ fontSize:'11px', color:'#374151' }}>Pens.proy: <strong>{fmt(resumenCarga.poyPensiones)}</strong></span>
                    <span style={{ fontSize:'11px', color:'#374151' }}>Pens.real: <strong>{fmt(resumenCarga.realPensiones)}</strong></span>
                    <span style={{ fontSize:'11px', color:'#374151' }}>Nómina: <strong>{fmt(resumenCarga.sueldos)}</strong></span>
                  </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns: COLS_E }}>
                  <div style={{ ...thE, textAlign:'left' }}>Concepto</div>
                  <div style={thE}>Proyectado</div>
                  <div style={thE}>Total</div>
                  <div style={thE}>Rentas Mes</div>
                  <div style={thE}>Otros Periodos</div>
                  <div style={thE}>vs Proy</div>
                </div>

                <SecHdr label="Ingresos" />
                {/* Sección proyectada — referencia de presupuesto */}
                <EditRow label="* Rentas totales"
                  fieldP="proy_rentas_contratos"
                  fieldMes="real_rentas_factura_mes" fieldOtros="real_rentas_factura_otros"
                  form={fForm} setField={sf}
                  hintP={`auto: ${fmt(proyRentas)}`}
                  hintMes={`ref: ${fmt(realRentas.factura)}`} />
                <EditRow label="• Restaurant; Ampliación ($276 m² pp)"
                  fieldP="proy_restaurant"
                  form={fForm} setField={sf} indent={1} />
                <InfoRowE label="Rentas disponibles (locales-Restau)"
                  proy={(parseFloat(fForm.proy_rentas_contratos)||proyRentas) - (parseFloat(fForm.proy_restaurant)||0)}
                  indent={1} />
                <EditRow label="** Locales (L10, L22, Financiera L24,25,26)"
                  fieldP="proy_locales_vacantes"
                  form={fForm} setField={sf} indent={2} />

                {/* Subtotal + desglose real (igual orden que Tablero) */}
                <SubTot label="Rentas brutas" proy={pRentasBrutas} real={eRentasBrutas}
                  mes={eRmRentas} otros={eOpRentas} />
                <EditRow label="Rentas sin Factura"
                  fieldMes="real_rsf_mes" fieldOtros="real_rsf_otros"
                  form={fForm} setField={sf} indent={1} />
                <EditRow label="Penalizaciones"
                  fieldMes="real_penaliz_mes" fieldOtros="real_penaliz_otros"
                  form={fForm} setField={sf} indent={1} />
                <EditRow label="IVA retenido" fieldP={null} fieldR="real_iva"
                  form={fForm} setField={sf} indent={1} negLabel hintR="positivo, se resta" />

                <SubTot label="Ingresos Netos Renta" proy={pIngNeto} real={eIngNeto} highlight />

                <EditRow label="Estacionamiento"
                  fieldP="proy_estacionamiento"
                  fieldMes="real_estac_mes" fieldOtros="real_estac_otros"
                  form={fForm} setField={sf} />
                <EditRow label="Pensiones"
                  fieldP="proy_pensiones"
                  fieldMes="real_pension_mes" fieldOtros="real_pension_otros"
                  form={fForm} setField={sf} />
                <EditRow label="Maquinita/Vending"
                  fieldP="proy_maquinita"
                  fieldMes="real_maquinita_mes" fieldOtros="real_maquinita_otros"
                  form={fForm} setField={sf} />
                <EditRow label="Agua (cobro)"
                  fieldP="proy_agua_ingresos"
                  fieldMes="real_agua_ing_mes" fieldOtros="real_agua_ing_otros"
                  form={fForm} setField={sf} />

                <SubTot label="Total Ingresos" proy={pTotalIng} real={eTotalIng} highlight
                  mes={eRmEstac + eRmPension + eRmMaq + eRmAgua + eRmRentas}
                  otros={eOpEstac + eOpPension + eOpMaq + eOpAgua + eOpRentas} />

                <SecHdr label="Gastos Variables" />
                <EditRow label="Sueldos"          fieldP="proy_sueldos"          fieldR="real_sueldos"          form={fForm} setField={sf} hintP={`RH: ${fmt(proySueldos)}`} />
                <EditRow label="Fondo Revolvente"  fieldP="proy_fondo_revolvente" fieldR="real_fondo_revolvente" form={fForm} setField={sf} />
                <EditRow label="Gasto Excedente"  fieldP={null}                  fieldR="real_gasto_excedente"  form={fForm} setField={sf} indent={1} />
                <EditRow label="Luz"              fieldP="proy_luz"              fieldR="real_luz"              form={fForm} setField={sf} />
                <EditRow label="Agua (gasto)"     fieldP="proy_agua_gastos"      fieldR="real_agua_gastos"      form={fForm} setField={sf} />
                <EditRow label="Otros gastos"     fieldP="proy_otros_gastos"     fieldR="real_otros_gastos"     form={fForm} setField={sf} />

                <SubTot label="Total Gastos Variables" proy={pTotalG} real={rTotalG} />
                <SubTot label="Utilidad Bruta"         proy={pUtilBruta} real={rUtilBruta} highlight />

                <SecHdr label="Impuestos y Gastos Fijos" bg="#4B5563" />
                <EditRow label="Predial"                     fieldP="predial"                  fieldR="predial"                  form={fForm} setField={sf} />
                <EditRow label="Transporte Residuos Sólidos" fieldP="transporte_residuos"       fieldR="transporte_residuos"       form={fForm} setField={sf} />
                <EditRow label="Licencia de Estacionamiento" fieldP="licencia_estacionamiento"  fieldR="licencia_estacionamiento"  form={fForm} setField={sf} />
                <EditRow label="Anuncio Publicitario IWOL"   fieldP="anuncio_publicitario"      fieldR="anuncio_publicitario"      form={fForm} setField={sf} />

                <SubTot label="Total Impuestos" proy={pTotalImp} real={rTotalImp} />
                <SubTot label="Utilidad Neta"   proy={pUtilNeta} real={rUtilNeta} highlight big />

                <div style={{ padding:'14px 16px', borderTop:'2px solid #E5E7EB', background:'#F9FAFB',
                  display:'grid', gridTemplateColumns:'1fr auto', gap:'16px', alignItems:'start' }}>
                  <div>
                    <div style={{ fontSize:'11px', fontWeight:700, color:'#374151', marginBottom:'5px', textTransform:'uppercase' }}>Notas del mes</div>
                    <textarea value={form.notas ?? ''}
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                      rows={3} placeholder="Observaciones, eventos especiales, ajustes..."
                      style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
                        fontSize:'12px', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', outline:'none' }} />
                  </div>
                  <div style={{ paddingTop:'20px' }}>
                    {registro?.status !== 'cerrado' && (
                      <button onClick={async () => {
                        await supabase.from('er_mensual').update({ status:'cerrado' }).eq('id', registro.id)
                        await loadRegistro(mes, anio); toast.success('Mes cerrado')
                      }} style={{ padding:'8px 14px', background:'#374151', color:'white', border:'none',
                        borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                        Cerrar mes
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()
        )}
      </div>
    </>
  )
}
