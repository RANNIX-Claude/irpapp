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

/* ── Celda de input numérico en tabla (nivel módulo) ──────────────────────── */
const COLS_E = '1fr 180px 180px'
const thE = { padding:'8px 12px', fontSize:'10px', fontWeight:700, color:'#6B7280',
  textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right',
  background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }

function CellInput({ field, values, onChange, hint, color = '#111827' }) {
  return (
    <div>
      <input type="number" step="0.01"
        value={values[field] ?? ''}
        onChange={e => onChange(field, e.target.value)}
        placeholder="—"
        style={{ width:'100%', padding:'5px 8px', border:'1.5px solid #E5E7EB', borderRadius:'6px',
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
function SubTot({ label, proy, real, highlight = false, big = false }) {
  const bg  = highlight ? (real >= 0 ? '#F0FDF4' : '#FEF2F2') : '#F5F5F5'
  const clr = big ? (real >= 0 ? '#057642' : '#B91C1C') : '#111827'
  const sz  = big ? '14px' : '12px', fw = big ? 900 : 700
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding: big ? '10px 12px' : '7px 12px', background: bg,
      borderTop: big ? '3px solid ' + (real >= 0 ? '#057642' : '#B91C1C') : '2px solid #E5E7EB' }}>
      <div style={{ fontSize: sz, fontWeight: fw, color: clr }}>{label}</div>
      <div style={{ textAlign:'right', fontSize: sz, fontWeight: fw, color:'#6B7280', padding:'0 6px' }}>
        {proy !== 0 ? fmt(proy) : ''}
      </div>
      <div style={{ textAlign:'right', fontSize: sz, fontWeight: fw,
        color: big ? clr : (real < 0 ? '#B91C1C' : '#374151'), padding:'0 6px' }}>
        {real !== 0 ? fmt(real) : ''}
      </div>
    </div>
  )
}
function EditRow({ label, fieldP, fieldR, form, setField, indent = 0, hintP, hintR, negLabel = false }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding:'5px 12px', borderTop:'1px solid #F3F4F6', alignItems:'center', background:'white' }}
      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <div style={{ fontSize:'12px', color: negLabel ? '#B91C1C' : '#374151',
        paddingLeft: indent * 14 + 'px', display:'flex', alignItems:'center' }}>
        {label}
      </div>
      <div style={{ padding:'2px 6px' }}>
        {fieldP
          ? <CellInput field={fieldP} values={form} onChange={setField} hint={hintP} />
          : <div style={{ textAlign:'right', color:'#D1D5DB', fontSize:'12px' }}>—</div>}
      </div>
      <div style={{ padding:'2px 6px' }}>
        {fieldR
          ? <CellInput field={fieldR} values={form} onChange={setField} hint={hintR}
              color={negLabel ? '#B91C1C' : '#111827'} />
          : <div style={{ textAlign:'right', color:'#D1D5DB', fontSize:'12px' }}>—</div>}
      </div>
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
    // Query por fecha de cobro (base caja): todo lo que entró en el mes calendario
    const { data } = await supabase.from('ingresos')
      .select('importe, factura, mes, anio')
      .eq('tipo', 'RENTA')
      .gte('fecha', fechaIni).lte('fecha', fechaFin)
    if (data) {
      const rentasMes    = data.filter(r => r.mes === m && r.anio === a)
      const otrosPer     = data.filter(r => r.mes !== m || r.anio !== a)
      const totalCobrado = data.reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      const rmTotal      = rentasMes.reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      const opTotal      = otrosPer.reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      const factura      = rentasMes.filter(r => r.factura).reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      setRealRentas({ factura, total: totalCobrado, rentas_mes: rmTotal, otros_periodos: opTotal })
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

    // 2. Rentas reales: ingresos del mes tipo RENTA
    const { data: ingresosRenta } = await supabase
      .from('ingresos').select('importe, factura')
      .eq('mes', mes).eq('anio', anio).eq('tipo', 'RENTA')
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
    const fechaIni = `${anio}-${String(mes).padStart(2,'0')}-01`
    const fechaFin = `${anio}-${String(mes).padStart(2,'0')}-${new Date(anio, mes, 0).getDate()}`
    const { data: nominas } = await supabase
      .from('nomina_periodos').select('total_neto')
      .in('estado', ['AUTORIZADA','PAGADA','TIMBRADA'])
      .gte('fecha_pago', fechaIni).lte('fecha_pago', fechaFin)
    const sumSueldos = nominas?.reduce((s, n) => s + (parseFloat(n.total_neto)||0), 0) || 0
    resumen.sueldos = sumSueldos

    // Actualizar form con los datos calculados
    setForm(f => ({
      ...f,
      proy_rentas_contratos:    sumRentas,
      real_rentas_factura:      rFactura,
      real_rentas_sin_factura:  rSinFact,
      proy_pensiones:           poyPensiones,
      real_pensiones:           realPensiones,
      real_sueldos:             sumSueldos,
    }))
    setProyRentas(sumRentas)
    setRealRentas({ factura: rFactura, total: rFactura + rSinFact })
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

  // Real — base caja: todo lo recibido en el mes calendario
  // realRentas.rentas_mes  = cobrado este mes PARA este período
  // realRentas.otros_periodos = cobrado este mes PARA períodos anteriores (adeudos)
  // realRentas.total = rentas_mes + otros_periodos
  const rRentaFact    = parseFloat(r.real_rentas_factura)    || realRentas.factura || 0
  const rRentaSin     = parseFloat(r.real_rentas_sin_factura) || 0
  const rPenaliz      = parseFloat(r.real_penalizaciones) || 0
  const rIva          = -(Math.abs(parseFloat(r.real_iva) || 0))
  const rRentasBrutas = rRentaFact + rRentaSin + rPenaliz
  // Rentas Mes / Otros Periodos: base caja por fecha de cobro
  const rmRentasBrutas = realRentas.rentas_mes    || 0   // cobrado y pertenece a este mes
  const opRentasBrutas = realRentas.otros_periodos || 0  // cobrado pero de otros períodos
  const rIngNeto   = rRentasBrutas + rIva
  const rEstac     = parseFloat(r.real_estacionamiento) || 0
  const rPensiones = parseFloat(r.real_pensiones) || 0
  const rMaquinita = parseFloat(r.real_maquinita) || 0
  const rAguaIng   = parseFloat(r.real_agua_ingresos) || 0
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
              total={rRentaSin} rentasMes={rRentaSin} />
            <PLRow label="Penalizaciones" indent={1}
              total={rPenaliz} otrosPer={rPenaliz} />
            <PLRow label="Iva" indent={1} isNeg
              proy={0} total={rIva}
              rentasMes={rIva !== 0 ? Math.round(rIva * (rRentaFact / (rRentasBrutas || 1))) : 0}
              otrosPer={rIva !== 0 ? Math.round(rIva * (opRentasBrutas / (rRentasBrutas || 1))) : 0} />

            <SubRow label="Ingresos Netos Renta" highlight
              proy={pIngNeto} total={rIngNeto}
              rentasMes={rmRentasBrutas + (rIva !== 0 ? Math.round(rIva * (rRentaFact / (rRentasBrutas || 1))) : 0)}
              otrosPer={opRentasBrutas + (rIva !== 0 ? Math.round(rIva * (opRentasBrutas / (rRentasBrutas || 1))) : 0)} />

            <PLRow label="Estacionamiento"
              proy={pEstac} total={rEstac} rentasMes={rEstac} />
            <PLRow label="Pensiones"
              proy={pPensiones} total={rPensiones} rentasMes={rPensiones} />
            <PLRow label="Maquinita"
              proy={pMaquinita} total={rMaquinita} rentasMes={rMaquinita} />
            <PLRow label="Agua"
              proy={pAguaIng} total={rAguaIng} otrosPer={rAguaIng} />

            <SubRow label="Total Ingresos" highlight
              proy={pTotalIng} total={rTotalIng}
              rentasMes={rmRentasBrutas + rEstac + rPensiones + rMaquinita}
              otrosPer={opRentasBrutas + rAguaIng} />

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
              proy_rentas_contratos: form.proy_rentas_contratos ?? proyRentas,
              proy_sueldos:          form.proy_sueldos          ?? proySueldos,
              real_rentas_factura:   form.real_rentas_factura   ?? realRentas.factura,
            }
            const sf = setField
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
                  <div style={thE}>Real</div>
                </div>

                <SecHdr label="Ingresos" />
                <EditRow label="Rentas contratos vigentes" fieldP="proy_rentas_contratos" fieldR="real_rentas_factura"
                  form={fForm} setField={sf} hintP={`auto: ${fmt(proyRentas)}`} hintR={`ingresos: ${fmt(realRentas.factura)}`} />
                <EditRow label="Restaurant / Ampliación ($276 m²)" fieldP="proy_restaurant" fieldR="real_rentas_sin_factura"
                  form={fForm} setField={sf} indent={1} hintR="rentas s/factura" />
                <EditRow label="Locales vacantes (pérdida)" fieldP="proy_locales_vacantes" fieldR="real_penalizaciones"
                  form={fForm} setField={sf} indent={1} hintR="penalizaciones" />
                <EditRow label="IVA retenido" fieldP={null} fieldR="real_iva"
                  form={fForm} setField={sf} indent={1} negLabel hintR="positivo, se resta" />

                <SubTot label="Rentas brutas" proy={pRentasBrutas} real={rRentasBrutas} />
                <SubTot label="Ingresos Netos Renta" proy={pIngNeto} real={rIngNeto} highlight />

                <EditRow label="Estacionamiento"  fieldP="proy_estacionamiento"  fieldR="real_estacionamiento"  form={fForm} setField={sf} />
                <EditRow label="Pensiones"         fieldP="proy_pensiones"        fieldR="real_pensiones"        form={fForm} setField={sf} />
                <EditRow label="Maquinita/Vending" fieldP="proy_maquinita"        fieldR="real_maquinita"        form={fForm} setField={sf} />
                <EditRow label="Agua (cobro)"      fieldP="proy_agua_ingresos"    fieldR="real_agua_ingresos"    form={fForm} setField={sf} />

                <SubTot label="Total Ingresos" proy={pTotalIng} real={rTotalIng} highlight />

                <SecHdr label="Gastos Variables" />
                <EditRow label="Sueldos"         fieldP="proy_sueldos"          fieldR="real_sueldos"          form={fForm} setField={sf} hintP={`RH: ${fmt(proySueldos)}`} />
                <EditRow label="Fondo Revolvente" fieldP="proy_fondo_revolvente" fieldR="real_fondo_revolvente" form={fForm} setField={sf} />
                <EditRow label="Gasto Excedente" fieldP={null}                  fieldR="real_gasto_excedente"  form={fForm} setField={sf} indent={1} />
                <EditRow label="Luz"             fieldP="proy_luz"              fieldR="real_luz"              form={fForm} setField={sf} />
                <EditRow label="Agua (gasto)"    fieldP="proy_agua_gastos"      fieldR="real_agua_gastos"      form={fForm} setField={sf} />
                <EditRow label="Otros gastos"    fieldP="proy_otros_gastos"     fieldR="real_otros_gastos"     form={fForm} setField={sf} />

                <SubTot label="Total Gastos Variables" proy={pTotalG} real={rTotalG} />
                <SubTot label="Utilidad Bruta" proy={pUtilBruta} real={rUtilBruta} highlight />

                <SecHdr label="Impuestos y Gastos Fijos" bg="#4B5563" />
                <EditRow label="Predial"                        fieldP="predial"                   fieldR="predial"                   form={fForm} setField={sf} />
                <EditRow label="Transporte Residuos Sólidos"    fieldP="transporte_residuos"        fieldR="transporte_residuos"        form={fForm} setField={sf} />
                <EditRow label="Licencia de Estacionamiento"    fieldP="licencia_estacionamiento"   fieldR="licencia_estacionamiento"   form={fForm} setField={sf} />
                <EditRow label="Anuncio Publicitario IWOL"      fieldP="anuncio_publicitario"       fieldR="anuncio_publicitario"       form={fForm} setField={sf} />

                <SubTot label="Total Impuestos" proy={pTotalImp} real={rTotalImp} />
                <SubTot label="Utilidad Neta" proy={pUtilNeta} real={rUtilNeta} highlight big />

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
