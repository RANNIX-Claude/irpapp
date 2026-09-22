import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Plus, Save, BarChart2, FileText, Printer, RefreshCw } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase, supabaseParking } from '../lib/supabase'
import DetalleEDR from '../components/ui/DetalleEDR'
import toast from 'react-hot-toast'

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt   = n => '$' + (parseFloat(n)||0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const pct   = (real, proy) => (!proy || proy === 0) ? null : Math.round((real / proy) * 100)

// PostgREST del parking no tiene aggregate functions habilitado → paginar
async function sumTicketsMes(client, fechaIni, fechaFin) {
  let total = 0, offset = 0
  while (true) {
    const { data, error } = await client
      .from('tickets').select('importe')
      .gte('fecha_op', fechaIni).lte('fecha_op', fechaFin)
      .eq('estatus', 'cobrado').range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    total += data.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0)
    if (data.length < 1000) break
    offset += 1000
  }
  return total
}

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
                 indent = 0, isNeg = false, noTotal = false, detalle, onDetalle }) {
  const p  = parseFloat(proy) || 0
  const t  = parseFloat(total) || 0
  const rm = parseFloat(rentasMes) || 0
  const op = parseFloat(otrosPer) || 0
  const ratio = noTotal ? null : pct(t, p)
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0,
      padding:'5px 16px', borderTop:'1px solid #F3F4F6',
      transition:'background 0.1s' }}
      onClick={detalle ? () => onDetalle({ concepto: detalle, valor: t }) : undefined}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ fontSize:'12px', color: isNeg ? '#B91C1C' : '#374151',
        paddingLeft: indent * 16 + 'px', display:'flex', alignItems:'center', gap:5,
        cursor: detalle ? 'pointer' : 'default' }}>
        {label}
        {detalle && <span title="Ver el detalle que suma este renglón"
          style={{ fontSize:9, color:'#0A66C2', border:'1px solid #BFDBFE', background:'#EFF6FF',
            borderRadius:4, padding:'0 4px', fontWeight:700, letterSpacing:'.04em' }}>DETALLE</span>}
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
                  highlight = false, big = false, composicion, onDetalle }) {
  const p  = parseFloat(proy) || 0
  const t  = parseFloat(total) || 0
  const rm = parseFloat(rentasMes) || 0
  const op = parseFloat(otrosPer) || 0
  const ratio = pct(t, p)
  const bgColor = highlight ? (t >= 0 ? '#F0FDF4' : '#FEF2F2') : '#F9FAFB'
  const sz = big ? '14px' : '12px'
  const fw = big ? 900 : 700
  // Un subtotal no sale de una tabla: sale de otros renglones. Su detalle es la
  // fórmula y el valor de cada sumando, y desde ahí se baja al que sí tiene
  // registros detrás.
  const clicable = !!composicion
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS, gap:0,
      padding: big ? '12px 16px' : '8px 16px', background: bgColor,
      borderTop: big ? '3px solid ' + (t >= 0 ? '#057642' : '#B91C1C') : '2px solid #E5E7EB',
      cursor: clicable ? 'pointer' : 'default' }}
      onClick={clicable ? () => onDetalle({ composicion }) : undefined}>
      <div style={{ fontSize: sz, fontWeight: fw, color: big ? (t >= 0 ? '#057642' : '#B91C1C') : '#111827',
        display:'flex', alignItems:'center', gap:6 }}>
        {label}
        {clicable && <span title="Ver cómo se calcula este renglón"
          style={{ fontSize:9, color:'#0A66C2', border:'1px solid #BFDBFE', background:'#EFF6FF',
            borderRadius:4, padding:'0 4px', fontWeight:700, letterSpacing:'.04em' }}>CÁLCULO</span>}
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
function SubTot({ label, proy, real, mes = 0, otros = 0, highlight = false, big = false,
                  composicion, onDetalle }) {
  const bg  = highlight ? (real >= 0 ? '#F0FDF4' : '#FEF2F2') : '#F5F5F5'
  const clr = big ? (real >= 0 ? '#057642' : '#B91C1C') : '#111827'
  const sz  = big ? '14px' : '12px', fw = big ? 900 : 700
  const ratio = pct(real, proy)
  const clicable = !!composicion
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding: big ? '10px 12px' : '7px 12px', background: bg,
      borderTop: big ? '3px solid ' + (real >= 0 ? '#057642' : '#B91C1C') : '2px solid #E5E7EB',
      cursor: clicable ? 'pointer' : 'default' }}
      onClick={clicable ? () => onDetalle({ composicion }) : undefined}>
      <div style={{ fontSize: sz, fontWeight: fw, color: clr, display:'flex', alignItems:'center', gap:6 }}>
        {label}
        {clicable && <span title="Ver cómo se calcula este renglón"
          style={{ fontSize:9, color:'#0A66C2', border:'1px solid #BFDBFE', background:'#EFF6FF',
            borderRadius:4, padding:'0 4px', fontWeight:700, letterSpacing:'.04em' }}>CÁLCULO</span>}
      </div>
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
/* Fila de lectura automática — muestra proy (opcionalmente editable), total/mes/otros de solo lectura */
function CalcRowE({ label, proy = 0, total = 0, mes = 0, otros = 0, indent = 0,
                    detalle, onDetalle, negLabel = false,
                    fieldP, values, setField }) {
  const displayProy = fieldP && values ? (parseFloat(values[fieldP]) || 0) : proy
  const ratio = pct(total, displayProy || proy)
  const clicable = !!detalle && !!onDetalle
  return (
    <div style={{ display:'grid', gridTemplateColumns: COLS_E, gap:0,
      padding:'4px 12px', borderTop:'1px solid #F3F4F6', background:'white', alignItems:'center' }}>
      <div style={{ fontSize:'12px', color: negLabel ? '#B91C1C' : '#374151',
        paddingLeft: indent * 14 + 'px', display:'flex', alignItems:'center', gap:6,
        cursor: clicable ? 'pointer' : 'default' }}
        onClick={clicable ? () => onDetalle({ concepto: detalle }) : undefined}>
        {label}
        {clicable && <span style={{ fontSize:9, color:'#0A66C2', border:'1px solid #BFDBFE',
          background:'#EFF6FF', borderRadius:4, padding:'0 4px', fontWeight:700 }}>DETALLE</span>}
      </div>
      <div style={{ padding:'2px 4px' }}>
        {fieldP && setField
          ? <CellInput field={fieldP} values={values} onChange={setField} />
          : <div style={{ textAlign:'right', fontSize:'12px', color:'#6B7280', padding:'4px 6px' }}>
              {displayProy !== 0 ? fmt(displayProy) : <span style={{color:'#D1D5DB'}}>—</span>}
            </div>
        }
      </div>
      <div style={{ textAlign:'right', fontSize:'12px', color: negLabel ? '#B91C1C' : '#374151',
        padding:'0 6px', fontWeight:500 }}>
        {total !== 0 ? fmt(total) : <span style={{color:'#D1D5DB'}}>—</span>}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#4B5563', padding:'0 6px' }}>
        {mes !== 0 ? fmt(mes) : <span style={{color:'#D1D5DB'}}>—</span>}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#4B5563', padding:'0 6px' }}>
        {otros !== 0 ? fmt(otros) : <span style={{color:'#D1D5DB'}}>—</span>}
      </div>
      <div style={{ textAlign:'center' }}>{(displayProy || proy) !== 0 && <PctBadge value={ratio} />}</div>
    </div>
  )
}
/* EditRow para ingresos: fieldMes + fieldOtros → Total auto
   EditRow para gastos:   fieldR → Total editable, Mes/Otros vacíos */
function EditRow({ label, fieldP, fieldMes, fieldOtros, fieldR, form, setField,
                   indent = 0, hintP, hintMes, hintOtros, hintR, negLabel = false,
                   detalle, onDetalle }) {
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
        paddingLeft: indent * 14 + 'px', display:'flex', alignItems:'center', gap:5 }}>
        {label}
        {/* El campo se captura, pero el detalle deja ver de dónde salió el
            número que se propuso, para capturar con fundamento y no a ciegas. */}
        {detalle && (
          <button type="button" onClick={e => { e.stopPropagation(); onDetalle({ concepto: detalle, valor: total }) }}
            title="Ver los registros que integran este importe"
            style={{ fontSize:9, color:'#0A66C2', border:'1px solid #BFDBFE', background:'#EFF6FF',
              borderRadius:4, padding:'1px 4px', fontWeight:700, letterSpacing:'.04em', cursor:'pointer' }}>
            DETALLE
          </button>
        )}
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
  // Renglón cuyo detalle se está viendo. Ver src/components/ui/DetalleEDR.jsx
  const [detalle, setDetalle] = useState(null)

  const [registro,      setRegistro]      = useState(null)
  const [form,          setForm]          = useState({})
  const [dirty,         setDirty]         = useState(false)  // form modificado sin guardar
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [cargando,      setCargando]      = useState(false)
  const [proyRentas,    setProyRentas]    = useState(0)
  const [realRentas,    setRealRentas]    = useState({ factura: 0, total: 0 })
  const [realIngByTipo, setRealIngByTipo] = useState({})
  const [realParking,   setRealParking]   = useState({})   // { estac_mes, pension_mes, vending_mes, ... }
  const [proySueldos,   setProySueldos]   = useState(0)
  const [resumenCarga,  setResumenCarga]  = useState(null) // { rentas, pensiones, sueldos }

  const loadProyectado = useCallback(async () => {
    const { data } = await supabase
      .from('contratos').select('renta_mensual')
      .eq('estatus_operacion', 'OCUPADO')
    if (data) setProyRentas(data.reduce((s, c) => s + (parseFloat(c.renta_mensual)||0), 0))
  }, [])

  const loadRealRentas = useCallback(async (m, a) => {
    const fechaIni = `${a}-${String(m).padStart(2,'0')}-01`
    const fechaFin = `${a}-${String(m).padStart(2,'0')}-${new Date(a, m, 0).getDate()}`
    // Base caja: pagos con fecha en el mes. Concepto y periodo vienen del cobro cubierto.
    // Fallback: si el ingreso no tiene aplicaciones_pago, usa clasificacion/mes/anio del ingreso.
    const { data } = await supabase
      .from('ingresos')
      .select('id, origen, importe, clasificacion, mes, anio, aplicaciones_pago(importe_aplicado, cargo:cargos_programados(concepto, periodo_mes, periodo_anio))')
      .gte('fecha', fechaIni).lte('fecha', fechaFin)
    if (data) {
      const filas = data.flatMap(ing => {
        const apps = ing.aplicaciones_pago ?? []
        if (apps.length > 0) {
          return apps.map(ap => ({
            importe:      parseFloat(ap.importe_aplicado) || 0,
            concepto:     ap.cargo?.concepto,
            periodo_mes:  ap.cargo?.periodo_mes,
            periodo_anio: ap.cargo?.periodo_anio,
            origen:       ing.origen,
          }))
        }
        // Sin distribución: usa clasificacion (auto) + mes/anio del ingreso.
        // RENTA quedó FUERA de este respaldo a propósito: un depósito sin
        // distribución no prueba qué cargo cubre, y el rubro de rentas debe
        // contener solo renta comprobada contra su cargo. El detalle del
        // renglón avisa cuánto quedó fuera por esto, para que se aplique en
        // Cobranza y entre por la vía normal.
        const c = ing.clasificacion
        if (!c || !['SANCION','AGUA','MANTENIMIENTO'].includes(c)) return []
        return [{ importe: parseFloat(ing.importe)||0, concepto:c, periodo_mes:ing.mes, periodo_anio:ing.anio, origen:ing.origen }]
      })
      const isEfectivo = r => (r.origen || '').toUpperCase() === 'EFECTIVO'
      const esMes      = r => r.periodo_mes === m && r.periodo_anio === a
      const sum        = (rows, pred) => rows.filter(pred ?? (() => true)).reduce((s, r) => s + r.importe, 0)

      // RENTA: transferencia=con factura, efectivo=sin factura (regla fiscal)
      const rentas      = filas.filter(r => r.concepto === 'RENTA')
      const rentasMes   = rentas.filter(esMes)
      const rentasOtros = rentas.filter(r => !esMes(r))
      setRealRentas({
        factura:        sum(rentasMes, r => !isEfectivo(r)),
        rsfMes:         sum(rentasMes, r =>  isEfectivo(r)),
        total:          sum(rentas),
        rentas_mes:     sum(rentasMes),
        otros_periodos: sum(rentasOtros),
      })

      // SANCION: mismo criterio fiscal
      const sanciones = filas.filter(r => r.concepto === 'SANCION')
      setRealIngByTipo(prev => ({
        ...prev,
        SANCION: {
          cf_mes:   sum(sanciones, r => !isEfectivo(r) &&  esMes(r)),
          sf_mes:   sum(sanciones, r =>  isEfectivo(r) &&  esMes(r)),
          cf_otros: sum(sanciones, r => !isEfectivo(r) && !esMes(r)),
          sf_otros: sum(sanciones, r =>  isEfectivo(r) && !esMes(r)),
        }
      }))

      // Otros tipos — split mes/otros base cobro
      const byTipo = {}
      for (const tipo of ['ESTACIONAMIENTO','PENSION','MAQUINITA','AGUA']) {
        const rows = filas.filter(r => r.concepto === tipo)
        byTipo[tipo] = {
          mes:   sum(rows, esMes),
          otros: sum(rows, r => !esMes(r)),
          total: sum(rows),
        }
      }
      setRealIngByTipo(prev => ({ ...prev, ...byTipo }))
    }
  }, [])

  // Estacionamiento y pensiones viven en el sistema de tickets (proyecto aparte).
  // Vending NO: es de IRP, se opera en /vending y vive en esta misma base — antes
  // se buscaba en el proyecto de tickets, donde esa tabla no existe, así que el
  // renglón salía siempre en cero.
  const loadParkingData = useCallback(async (m, a) => {
    const fechaIni = `${a}-${String(m).padStart(2,'0')}-01`
    const fechaFin = `${a}-${String(m).padStart(2,'0')}-${new Date(a, m, 0).getDate()}`

    // Vending: semanas cuya fecha_inicio cae en el mes seleccionado.
    const { data: vendingMes, error: errVending } = await supabase
      .from('vending_semanas').select('venta_pesos')
      .gte('fecha_inicio', fechaIni).lte('fecha_inicio', fechaFin)
    if (errVending) console.warn('[EDR] vending:', errVending.message)
    const vending_mes = (vendingMes ?? []).reduce((s, v) => s + (parseFloat(v.venta_pesos)||0), 0)

    let estac_mes = 0, pension_mes = 0
    if (supabaseParking) {
      estac_mes = await sumTicketsMes(supabaseParking, fechaIni, fechaFin)

      const { data: pagosPension, error: errPension } = await supabaseParking
        .from('pagos_pension').select('monto_pagado')
        .eq('periodo_mes', m).eq('periodo_año', a).eq('estado', 'validado')
      if (errPension) console.warn('[EDR] pensiones:', errPension.message)
      pension_mes = (pagosPension ?? []).reduce((s, p) => s + (parseFloat(p.monto_pagado)||0), 0)
    }

    setRealParking({ estac_mes, estac_otros: 0, pension_mes, pension_otros: 0, vending_mes, vending_otros: 0 })
  }, [])

  const loadProySueldos = useCallback(async (m, a) => {
    const dias = new Date(a, m, 0).getDate()
    // Leía de 'empleados', que solo existe en el esquema prp: PostgREST devolvía
    // 404, el guard de `data` se lo tragaba y el sueldo proyectado quedaba
    // siempre en cero sin decirlo. La tabla real es rh_empleados, con
    // estado_id y salario_diario.
    const { data, error } = await supabase.from('rh_empleados')
      .select('salario_diario').eq('estado_id','ACTIVO').not('salario_diario','is',null)
    if (error) { console.warn('[EDR] sueldos proyectados:', error.message); return }
    setProySueldos((data ?? []).reduce((s, e) => s + ((parseFloat(e.salario_diario)||0) * dias), 0))
  }, [])

  const loadRegistro = useCallback(async (m, a) => {
    setLoading(true)
    const { data } = await supabase.from('er_mensual').select('*')
      .eq('mes', m).eq('anio', a).maybeSingle()
    setRegistro(data || null)
    setForm(data || {})
    setDirty(false)
    setLoading(false)
  }, [])

  useEffect(() => { loadProyectado() }, [loadProyectado])
  useEffect(() => {
    loadRegistro(mes, anio)
    loadRealRentas(mes, anio)
    loadProySueldos(mes, anio)
    loadParkingData(mes, anio)
  }, [mes, anio, loadRegistro, loadRealRentas, loadProySueldos, loadParkingData])

  // Auto-sincroniza campos _mes/_otros desde ingresos.
  // Rentas, sanciones, estacionamiento, pensiones y maquinita/vending se
  // muestran de solo lectura (CalcRowE/fuente operativa): nadie las captura a
  // mano en esta pantalla — la renta se captura en Ingresos, el estacionamiento
  // y pensiones en el sistema de tickets, vending en /vending. Aquí siempre se
  // sobreescriben con el cálculo en vivo, no hay nada que "proteger". Guardar
  // solo deja constancia histórica del valor en ese momento, no lo congela para
  // las próximas visitas.
  // Agua sí se captura a mano en esta pantalla (EditRow): ahí se respeta lo que
  // ya tenga la foto (campo === 0 o null → usa valor de ingresos; si ya tiene
  // valor → respeta lo capturado a mano).
  // Prioridad: fuente operativa (vending propio, estac/pension del sistema de tickets) > main ingresos > 0
  useEffect(() => {
    if (!realRentas.rentas_mes && !realIngByTipo.ESTACIONAMIENTO && !realParking.estac_mes && !realParking.pension_mes) return
    setForm(f => ({
      ...f,
      real_rentas_factura_mes:   realRentas.factura                || 0,
      real_rentas_factura_otros: realRentas.otros_periodos         || 0,
      real_rsf_mes:              realRentas.rsfMes                 || 0,
      real_rsf_otros:            0,
      // Sanciones: cf=con factura (transferencia), sf=sin factura (efectivo)
      real_penaliz_cf_mes:       realIngByTipo.SANCION?.cf_mes     || 0,
      real_penaliz_sf_mes:       realIngByTipo.SANCION?.sf_mes     || 0,
      real_penaliz_cf_otros:     realIngByTipo.SANCION?.cf_otros   || 0,
      real_penaliz_sf_otros:     realIngByTipo.SANCION?.sf_otros   || 0,
      // Estacionamiento: Sistema de Tickets (supabaseParking pagos_boletos) > main ingresos
      real_estac_mes:            realParking.estac_mes        || realIngByTipo.ESTACIONAMIENTO?.mes   || 0,
      real_estac_otros:          realParking.estac_otros      || realIngByTipo.ESTACIONAMIENTO?.otros || 0,
      // Pensiones: supabaseParking pagos_pension > main ingresos
      real_pension_mes:          realParking.pension_mes      || realIngByTipo.PENSION?.mes           || 0,
      real_pension_otros:        realParking.pension_otros    || realIngByTipo.PENSION?.otros         || 0,
      // Maquinita/Vending: vending_semanas de esta base > main ingresos
      real_maquinita_mes:        realParking.vending_mes      || realIngByTipo.MAQUINITA?.mes         || 0,
      real_maquinita_otros:      realParking.vending_otros    || realIngByTipo.MAQUINITA?.otros       || 0,
      // Agua: tabla de ingresos main supabase (tipo='AGUA') — sí es capturable a mano
      real_agua_ing_mes:         f.real_agua_ing_mes         || realIngByTipo.AGUA?.mes               || 0,
      real_agua_ing_otros:       f.real_agua_ing_otros       || realIngByTipo.AGUA?.otros             || 0,
    }))
  }, [realRentas, realIngByTipo, realParking])

  const irMes = async (delta) => {
    // Auto-guardar cambios manuales antes de cambiar de mes
    if (dirty && registro) {
      setSaving(true)
      const payload = { ...form }
      delete payload.id; delete payload.created_at; delete payload.updated_at
      Object.keys(payload).forEach(k => { if (k.startsWith('calc_')) delete payload[k] })
      await supabase.from('er_mensual').update(payload).eq('id', registro.id)
      setSaving(false)
      toast.success(`${MESES[mes]} guardado`)
    }
    let m = mes + delta, a = anio
    if (m < 1)  { m = 12; a-- }
    if (m > 12) { m = 1;  a++ }
    setMes(m); setAnio(a)
  }

  // ── Cargar datos automáticos de las fuentes de verdad ───────────────────────
  const cargarDatosAutomaticos = useCallback(async () => {
    setCargando(true)
    const resumen = { rentas: 0, poyPensiones: 0, realPensiones: 0, sueldos: 0 }

    // 1. Rentas proyectadas: todos los locales OCUPADO (independiente de estatus jurídico del contrato)
    const { data: contratos } = await supabase
      .from('contratos').select('renta_mensual')
      .eq('estatus_operacion', 'OCUPADO')
    const sumRentas = contratos?.reduce((s, c) => s + (parseFloat(c.renta_mensual)||0), 0) || 0
    resumen.rentas = sumRentas

    // 2. Rentas y sanciones: base caja (fecha de pago en el mes).
    //    Concepto y periodo_mes/anio vienen del cobro cubierto (cargos_programados).
    //    Regla fiscal: origen=EFECTIVO → sin factura; resto → con factura.
    const fechaIniR = `${anio}-${String(mes).padStart(2,'0')}-01`
    const fechaFinR = `${anio}-${String(mes).padStart(2,'0')}-${new Date(anio, mes, 0).getDate()}`
    const isEfectivo = r => (r.origen || '').toUpperCase() === 'EFECTIVO'

    const { data: ingresosRaw } = await supabase
      .from('ingresos')
      .select('id, origen, importe, clasificacion, mes, anio, aplicaciones_pago(importe_aplicado, cargo:cargos_programados(concepto, periodo_mes, periodo_anio))')
      .gte('fecha', fechaIniR).lte('fecha', fechaFinR)

    const filas = (ingresosRaw ?? []).flatMap(ing => {
      const apps = ing.aplicaciones_pago ?? []
      if (apps.length > 0) {
        return apps.map(ap => ({
          importe:      parseFloat(ap.importe_aplicado) || 0,
          concepto:     ap.cargo?.concepto,
          periodo_mes:  ap.cargo?.periodo_mes,
          periodo_anio: ap.cargo?.periodo_anio,
          origen:       ing.origen,
        }))
      }
      // Sin distribución: usa clasificacion (auto) + mes/anio del ingreso.
      // RENTA quedó FUERA de este respaldo a propósito: un depósito sin
      // distribución no prueba qué cargo cubre, y el rubro de rentas debe
      // contener solo renta comprobada contra su cargo. El detalle del
      // renglón avisa cuánto quedó fuera por esto, para que se aplique en
      // Cobranza y entre por la vía normal.
      const c = ing.clasificacion
      if (!c || !['SANCION','AGUA','MANTENIMIENTO'].includes(c)) return []
      return [{ importe: parseFloat(ing.importe)||0, concepto:c, periodo_mes:ing.mes, periodo_anio:ing.anio, origen:ing.origen }]
    })

    const rentas    = filas.filter(r => r.concepto === 'RENTA')
    const sanciones = filas.filter(r => r.concepto === 'SANCION')
    const rFactura  = rentas.filter(r => !isEfectivo(r)).reduce((s, r) => s + r.importe, 0)
    const rSinFact  = rentas.filter(r =>  isEfectivo(r)).reduce((s, r) => s + r.importe, 0)

    // 3. Pensiones y estacionamiento: sistema de tickets. Vending: esta base.
    let poyPensiones = 0, realPensiones = 0, realEstacParking = 0, realVendingParking = 0
    if (supabaseParking) {
      // Proyectado pensiones: suma de monto_mensual de pensiones activas
      const { data: pensionesActivas } = await supabaseParking
        .from('pensiones').select('monto_mensual').eq('activa', true)
      poyPensiones = pensionesActivas?.reduce((s, p) => s + (parseFloat(p.monto_mensual)||0), 0) || 0

      // Real pensiones: pagos_pension validados en el mes
      const { data: pagosPension } = await supabaseParking
        .from('pagos_pension').select('monto_pagado')
        .eq('periodo_mes', mes).eq('periodo_año', anio).eq('estado', 'validado')
      realPensiones = pagosPension?.reduce((s, p) => s + (parseFloat(p.monto_pagado)||0), 0) || 0

      // Real estacionamiento: tickets cobrados en el mes (Sistema de Tickets)
      try {
        const fechaIniE = `${anio}-${String(mes).padStart(2,'0')}-01`
        const fechaFinE = `${anio}-${String(mes).padStart(2,'0')}-${new Date(anio, mes, 0).getDate()}`
        realEstacParking = await sumTicketsMes(supabaseParking, fechaIniE, fechaFinE)
      } catch (_) {}

    }

    // Vending: de ESTA base, no del sistema de tickets. Es de IRP y se opera en
    // /vending, así que se carga exista o no el proyecto de tickets.
    const fechaIniV = `${anio}-${String(mes).padStart(2,'0')}-01`
    const fechaFinV = `${anio}-${String(mes).padStart(2,'0')}-${new Date(anio, mes, 0).getDate()}`
    const { data: vendingMes, error: errV } = await supabase
      .from('vending_semanas').select('venta_pesos')
      .gte('fecha_inicio', fechaIniV).lte('fecha_inicio', fechaFinV)
    if (errV) console.warn('[EDR] vending:', errV.message)
    realVendingParking = (vendingMes ?? []).reduce((s, v) => s + (parseFloat(v.venta_pesos)||0), 0)

    setRealParking(p => ({
      ...p,
      estac_mes: realEstacParking, estac_otros: 0,
      pension_mes: realPensiones, pension_otros: 0,
      vending_mes: realVendingParking, vending_otros: 0,
    }))
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

    // Splits mes/otros: "mes actual" = periodo_mes/anio del cargo cubierto (no del ingreso)
    const esMesCurrent = r => r.periodo_mes === mes && r.periodo_anio === anio
    const sum = (rows, pred) => rows.filter(pred ?? (() => true)).reduce((s, r) => s + r.importe, 0)

    // Rentas
    const rmFact  = sum(rentas, r => !isEfectivo(r) &&  esMesCurrent(r))
    const opFact  = sum(rentas, r => !isEfectivo(r) && !esMesCurrent(r))
    const rmSin   = sum(rentas, r =>  isEfectivo(r) &&  esMesCurrent(r))
    const opSin   = sum(rentas, r =>  isEfectivo(r) && !esMesCurrent(r))

    // Sanciones: con factura (CF) = transferencia, sin factura (SF) = efectivo
    const sCfMes   = sum(sanciones, r => !isEfectivo(r) &&  esMesCurrent(r))
    const sCfOtros = sum(sanciones, r => !isEfectivo(r) && !esMesCurrent(r))
    const sSfMes   = sum(sanciones, r =>  isEfectivo(r) &&  esMesCurrent(r))
    const sSfOtros = sum(sanciones, r =>  isEfectivo(r) && !esMesCurrent(r))
    const sTotalMes   = sCfMes + sSfMes
    const sTotalOtros = sCfOtros + sSfOtros

    // Actualiza solo columnas real_* — proy_* son input manual del admin, nunca se pisan
    setForm(f => ({
      ...f,
      real_rentas_factura:         rFactura,
      real_rentas_sin_factura:     rSinFact,
      real_rentas_factura_mes:     rmFact,
      real_rentas_factura_otros:   opFact,
      real_rsf_mes:                rmSin,
      real_rsf_otros:              opSin,
      real_penaliz_cf_mes:         sCfMes,
      real_penaliz_cf_otros:       sCfOtros,
      real_penaliz_sf_mes:         sSfMes,
      real_penaliz_sf_otros:       sSfOtros,
      real_penalizaciones:         sTotalMes + sTotalOtros,
      real_penaliz_mes:            sTotalMes,
      real_penaliz_otros:          sTotalOtros,
      // Si la fuente live devuelve 0, preserva el valor guardado en el form
      // (puede ser un ingreso ingresado manualmente). Si devuelve >0, lo pisa.
      real_pensiones:              realPensiones      || f.real_pensiones      || 0,
      real_pension_mes:            realPensiones      || f.real_pension_mes    || 0,
      real_pension_otros:          f.real_pension_otros || 0,
      real_sueldos:                sumSueldos         || f.real_sueldos        || 0,
      real_estac_mes:              realEstacParking   || realIngByTipo.ESTACIONAMIENTO?.mes   || f.real_estac_mes   || 0,
      real_estac_otros:            f.real_estac_otros || 0,
      real_maquinita_mes:          realVendingParking || realIngByTipo.MAQUINITA?.mes         || f.real_maquinita_mes || 0,
      real_maquinita_otros:        f.real_maquinita_otros || 0,
      real_agua_ing_mes:           realIngByTipo.AGUA?.mes   || f.real_agua_ing_mes   || 0,
      real_agua_ing_otros:         realIngByTipo.AGUA?.otros || f.real_agua_ing_otros || 0,
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
      .insert({ anio, mes, status: 'borrador' })
      .select().single()
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    setRegistro(data); setForm(data); setDirty(false); setSaving(false)
    setTab('elaboracion')
    toast.success('Registro creado')
  }

  const handleSave = async () => {
    if (!registro) return
    setSaving(true)
    const payload = { ...form }
    // Eliminar columnas que Postgres no acepta en UPDATE
    delete payload.id; delete payload.created_at; delete payload.updated_at
    Object.keys(payload).forEach(k => { if (k.startsWith('calc_')) delete payload[k] })
    const { error } = await supabase.from('er_mensual').update(payload).eq('id', registro.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    await loadRegistro(mes, anio)
    setSaving(false)
    toast.success('Guardado')
  }

  const setField = (field, val) => {
    setForm(f => ({ ...f, [field]: val === '' ? null : parseFloat(val) || 0 }))
    setDirty(true)
  }

  /* ── Cálculos tablero ─────────────────────────────────────────────────────── */
  // El Tablero lee de `form` (no de `registro`) para mostrar datos calculados
  // en tiempo real aunque no haya snapshot guardado. Cuando existe registro,
  // form = registro + auto-sync de campos _mes/_otros → resultado idéntico.
  // Los calc_* GENERATED los devuelve registro; para form sin snapshot se usan
  // los fallbacks aritméticos definidos en cada variable.
  const r = form || {}

  // Proyectado — info rows usan campos raw; subtotales leen calc_proy_*
  const pRentas       = parseFloat(r.proy_rentas_contratos) || proyRentas
  const pRestaurant   = parseFloat(r.proy_restaurant) || 0
  const pVacantes     = -(Math.abs(parseFloat(r.proy_locales_vacantes) || 0))
  const pDisponibles  = parseFloat(r.calc_proy_disponibles)   || (pRentas - pRestaurant)
  const pRentasBrutas = parseFloat(r.calc_proy_rentas_brutas) || (pDisponibles + pVacantes)
  const pEstac     = parseFloat(r.proy_estacionamiento) || 0
  const pPensiones = parseFloat(r.proy_pensiones) || 0
  const pMaquinita = parseFloat(r.proy_maquinita) || 0
  const pAguaIng   = parseFloat(r.proy_agua_ingresos) || 0
  const pIngNeto   = pRentasBrutas  // IVA no proyectado
  const pTotalIng  = parseFloat(r.calc_proy_total_ing)    || (pIngNeto + pEstac + pPensiones + pMaquinita + pAguaIng)
  const pSueldos   = parseFloat(r.proy_sueldos) || proySueldos
  const pFondo     = parseFloat(r.proy_fondo_revolvente) || 0
  const pLuz       = parseFloat(r.proy_luz) || 0
  const pAguaG     = parseFloat(r.proy_agua_gastos) || 0
  const pOtros     = parseFloat(r.proy_otros_gastos) || 0
  const pTotalG    = parseFloat(r.calc_proy_total_gastos) || (pSueldos + pFondo + pLuz + pAguaG + pOtros)
  const pPredial   = parseFloat(r.predial) || 0
  const pTransp    = parseFloat(r.transporte_residuos) || 0
  const pLicencia  = parseFloat(r.licencia_estacionamiento) || 0
  const pAnuncio   = parseFloat(r.anuncio_publicitario) || 0
  const pTotalImp  = parseFloat(r.calc_proy_total_imp)  || (pPredial + pTransp + pLicencia + pAnuncio)
  const pUtilBruta = parseFloat(r.calc_proy_util_bruta) || (pTotalIng - pTotalG)
  const pUtilNeta  = parseFloat(r.calc_proy_util_neta)  || (pUtilBruta - pTotalImp)

  // Real — campos _mes/_otros directamente de er_mensual (sin fallback a queries vivas)
  const rmRentaFact = parseFloat(r.real_rentas_factura_mes)   || 0
  const opRentaFact = parseFloat(r.real_rentas_factura_otros) || 0
  const rmRentaSin  = parseFloat(r.real_rsf_mes)              || 0
  const opRentaSin  = parseFloat(r.real_rsf_otros)            || 0
  const rmPenaliz   = parseFloat(r.real_penaliz_mes)          || 0
  const opPenaliz   = parseFloat(r.real_penaliz_otros)        || 0
  const rmEstac     = parseFloat(r.real_estac_mes)            || 0
  const opEstac     = parseFloat(r.real_estac_otros)          || 0
  const rmPension   = parseFloat(r.real_pension_mes)          || 0
  const opPension   = parseFloat(r.real_pension_otros)        || 0
  const rmMaquinita = parseFloat(r.real_maquinita_mes)        || 0
  const opMaquinita = parseFloat(r.real_maquinita_otros)      || 0
  const rmAguaIng   = parseFloat(r.real_agua_ing_mes)         || 0
  const opAguaIng   = parseFloat(r.real_agua_ing_otros)       || 0
  const rmIva       = parseFloat(r.real_iva_mes)              || 0
  const opIva       = parseFloat(r.real_iva_otros)            || 0

  // Totales individuales (suma directa de _mes + _otros, para las filas PLRow)
  const rRentaFact    = rmRentaFact + opRentaFact
  const rRentaSin     = rmRentaSin  + opRentaSin
  const rPenaliz      = rmPenaliz   + opPenaliz
  const rmTotalRentas = rmRentaFact + rmRentaSin
  const opTotalRentas = opRentaFact + opRentaSin

  // Subtotales desde calc_* — PostgreSQL los mantiene; fallback solo para registros legacy
  const rTotalRentas  = parseFloat(r.calc_real_total_rentas)  || (rRentaFact + rRentaSin)
  const rRentasBrutas = parseFloat(r.calc_real_rentas_brutas) || (rTotalRentas + rPenaliz)
  const rIva          = parseFloat(r.calc_real_iva)           || -(rmIva + opIva)
  const rIngNeto      = parseFloat(r.calc_real_ing_neto)      || (rRentasBrutas + rIva)
  const rEstac        = parseFloat(r.calc_real_total_estac)   || (rmEstac + opEstac)
  const rPensiones    = parseFloat(r.calc_real_total_pension) || (rmPension + opPension)
  const rMaquinita    = parseFloat(r.calc_real_total_maq)     || (rmMaquinita + opMaquinita)
  const rAguaIng      = parseFloat(r.calc_real_total_agua_i)  || (rmAguaIng + opAguaIng)
  const rTotalIng     = parseFloat(r.calc_real_total_ing)     || (rIngNeto + rEstac + rPensiones + rMaquinita + rAguaIng)
  const rSueldos   = parseFloat(r.real_sueldos) || 0
  const rFondo     = parseFloat(r.real_fondo_revolvente) || 0
  const rExcedente = parseFloat(r.real_gasto_excedente) || 0
  const rLuz       = parseFloat(r.real_luz) || 0
  const rAguaG     = parseFloat(r.real_agua_gastos) || 0
  const rOtros     = parseFloat(r.real_otros_gastos) || 0
  const rTotalG    = parseFloat(r.calc_real_total_gastos) || (rSueldos + rFondo + rExcedente + rLuz + rAguaG + rOtros)
  const rTotalImp  = parseFloat(r.calc_real_total_imp)   || pTotalImp
  const rUtilBruta = parseFloat(r.calc_real_util_bruta)  || (rTotalIng - rTotalG)
  const rUtilNeta  = parseFloat(r.calc_real_util_neta)   || (rUtilBruta - rTotalImp)

  // Split mes/otros para subtotales — calc_* reemplaza la aritmética IVA proporcional
  const rmIngNeto  = parseFloat(r.calc_real_ing_neto_mes)     || (rmRentaFact + rmRentaSin + rmPenaliz - rmIva)
  const opIngNeto  = parseFloat(r.calc_real_ing_neto_otros)   || (opRentaFact + opRentaSin + opPenaliz - opIva)
  const rmTotalIng = parseFloat(r.calc_real_total_ing_mes)    || (rmIngNeto + rmEstac + rmPension + rmMaquinita + rmAguaIng)
  const opTotalIng = parseFloat(r.calc_real_total_ing_otros)  || (opIngNeto + opEstac + opPension + opMaquinita + opAguaIng)

  /* ── Composición de los renglones calculados ────────────────────────────────
     Cada subtotal declara su fórmula y sus sumandos con el valor de este mes.
     Los que tienen `concepto` dejan seguir bajando hasta los registros. */
  const parte = (label, valor, concepto, extra = {}) => ({ label, valor, concepto, ...extra })

  const compTotalRentas = {
    titulo: 'Total Rentas',
    formula: 'Rentas brutas (facturadas) + Rentas sin factura',
    partes: [
      parte('Rentas brutas — con factura', rRentaFact, 'rentas_factura'),
      parte('Rentas sin factura — cobradas en efectivo', rRentaSin, 'rentas_sin_factura'),
    ],
    total: rTotalRentas,
    etiquetaTotal: 'Total Rentas',
    nota: 'Las rentas sin factura no se leen de ninguna tabla: son los cobros de renta del mes a los que no se les capturó número de factura.',
  }

  // Composición específica para En Elaboración: incluye las 4 fuentes de ingreso por renta
  const compTotalRentasObt = {
    titulo: 'Total Rentas Obtenidas',
    formula: 'Rentas con Factura + Rentas sin Factura + Sanciones con Factura + Sanciones sin Factura',
    partes: [
      parte('Rentas con Factura (transferencia/depósito)', rRentaFact, 'rentas_factura'),
      parte('Rentas sin Factura (efectivo)', rRentaSin, 'rentas_sin_factura'),
      parte('Sanciones con Factura + sin Factura', rPenaliz, 'sanciones'),
    ],
    total: rTotalRentas + rPenaliz,
    etiquetaTotal: 'Total Rentas Obtenidas',
    nota: 'Total = Rentas con factura + Rentas sin factura + Sanciones con factura + Sanciones sin factura. Las sanciones se suman al total de rentas obtenidas antes de deducir IVA.',
  }

  const compIngNeto = {
    titulo: 'Ingresos Netos Renta',
    formula: 'Total Rentas + Penalizaciones − IVA retenido',
    partes: [
      parte('Total Rentas', rTotalRentas),
      parte('Penalizaciones por mora', rPenaliz, 'sanciones'),
      parte('IVA retenido', rIva, null, { signo: rIva < 0 ? '' : '-' }),
    ],
    total: rIngNeto,
    etiquetaTotal: 'Ingresos Netos Renta',
    nota: 'El IVA solo existe del lado real: no se proyecta. Por eso el proyectado de este renglón es igual a las rentas brutas y no es comparable al real uno contra uno.',
  }

  const compTotalIng = {
    titulo: 'Total Ingresos',
    formula: 'Ingresos Netos Renta + Estacionamiento + Pensiones + Maquinita + Agua',
    partes: [
      parte('Ingresos Netos Renta', rIngNeto),
      parte('Estacionamiento', rEstac, 'estacionamiento'),
      parte('Pensiones', rPensiones, 'pensiones'),
      parte('Maquinita / Vending', rMaquinita, 'vending'),
      parte('Agua cobrada', rAguaIng, 'agua_ingreso'),
    ],
    total: rTotalIng,
    etiquetaTotal: 'Total Ingresos',
  }

  const compTotalG = {
    titulo: 'Total Gastos Variables',
    formula: 'Sueldos + Fondo Revolvente + Gasto Excedente + Luz + Agua + Otros',
    partes: [
      parte('Sueldos', rSueldos, 'sueldos'),
      parte('Fondo Revolvente', rFondo, 'gastos'),
      parte('Gasto Excedente', rExcedente),
      parte('Luz', rLuz, 'gastos'),
      parte('Agua (gasto)', rAguaG),
      parte('Otros gastos', rOtros, 'gastos'),
    ],
    total: rTotalG,
    etiquetaTotal: 'Total Gastos Variables',
    nota: 'El real lleva un sumando que el proyectado no tiene: el Gasto Excedente. Por eso el real puede pasarse del presupuesto sin que ningún renglón individual se haya pasado.',
  }

  const compUtilBruta = {
    titulo: 'Utilidad Bruta',
    formula: 'Total Ingresos − Total Gastos Variables',
    partes: [
      parte('Total Ingresos', rTotalIng),
      parte('Total Gastos Variables', rTotalG, null, { signo: '-' }),
    ],
    total: rUtilBruta,
    etiquetaTotal: 'Utilidad Bruta',
  }

  const compTotalImp = {
    titulo: 'Total Impuestos',
    formula: 'Predial + Transporte de Residuos + Licencia de Estacionamiento + Anuncio Publicitario',
    partes: [
      parte('Predial', pPredial),
      parte('Transporte de Residuos Sólidos', pTransp),
      parte('Licencia de Estacionamiento', pLicencia),
      parte('Anuncio Publicitario IWOL', pAnuncio),
    ],
    total: pTotalImp,
    etiquetaTotal: 'Total Impuestos',
    nota: 'Los cuatro se capturan en un solo campo que sirve para proyectado y para real: son el mismo dato mostrado dos veces. En el anexo del cliente estos impuestos se prorratean entre los doce meses del año.',
  }

  const compUtilNeta = {
    titulo: 'Utilidad Neta',
    formula: 'Utilidad Bruta − Total Impuestos',
    partes: [
      parte('Utilidad Bruta', rUtilBruta),
      parte('Total Impuestos', rTotalImp, null, { signo: '-' }),
    ],
    total: rUtilNeta,
    etiquetaTotal: 'Utilidad Neta',
  }

  const thSt = { padding:'9px 16px', fontSize:'10px', fontWeight:700, color:'#6B7280',
    textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right',
    background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }

  return (
    <>
      {/* Print + spinner CSS */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          header, aside { display: none !important; }
          main { margin-left: 0 !important; margin-top: 0 !important; min-height: auto !important; }
          .no-print { display: none !important; }
          #edr-print { overflow: visible !important; border: none !important; border-radius: 0 !important; }
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
        ) : tab === 'tablero' ? (
          /* ══════════════════════════════════════════════════════════════════
             TAB: TABLERO
             ══════════════════════════════════════════════════════════════════ */
          <div id="edr-print" style={{ background:'white', borderRadius:'12px', border:'1px solid #E5E7EB', overflow:'hidden' }}>

            {/* Banner cuando no hay snapshot guardado */}
            {!registro && (
              <div className="no-print" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px', background:'#FFFBEB', borderBottom:'1px solid #FDE68A', gap:12 }}>
                <span style={{ fontSize:'12px', color:'#92400E' }}>
                  Datos calculados en tiempo real · sin snapshot guardado para {MESES[mes]} {anio}
                </span>
                <button onClick={handleNuevo} disabled={saving}
                  style={{ padding:'5px 14px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                  + Crear snapshot
                </button>
              </div>
            )}

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
            <InfoRow label="Rentas disponibles (locales-Restau)" proy={pDisponibles} indent={1} />
            {pVacantes !== 0 && (
              <InfoRow label="** Locales (L10, L22, Financiera L24,25,26)" proy={Math.abs(pVacantes)} indent={2} />
            )}

            <PLRow label="Rentas brutas" detalle="rentas_factura" onDetalle={setDetalle}
              proy={pRentasBrutas} total={rRentaFact}
              rentasMes={rmRentaFact} otrosPer={opRentaFact} />
            <PLRow label="Rentas sin Factura" indent={1} detalle="rentas_sin_factura" onDetalle={setDetalle}
              total={rRentaSin} rentasMes={rmRentaSin} otrosPer={opRentaSin} />
            <SubRow label="Total Rentas"
              proy={pRentasBrutas} total={rTotalRentas}
              rentasMes={rmTotalRentas} otrosPer={opTotalRentas}
              composicion={compTotalRentas} onDetalle={setDetalle} />
            <PLRow label="Penalizaciones" indent={1} detalle="sanciones" onDetalle={setDetalle}
              total={rPenaliz} rentasMes={rmPenaliz} otrosPer={opPenaliz} />
            <PLRow label="Iva" indent={1} isNeg
              proy={parseFloat(r.proy_iva)||0} total={rIva}
              rentasMes={-rmIva}
              otrosPer={-opIva} />

            <SubRow label="Ingresos Netos Renta" highlight composicion={compIngNeto} onDetalle={setDetalle}
              proy={pIngNeto} total={rIngNeto}
              rentasMes={rmIngNeto}
              otrosPer={opIngNeto} />

            <PLRow label="Estacionamiento" detalle="otros_ingresos" onDetalle={setDetalle}
              proy={pEstac} total={rEstac} rentasMes={rmEstac} otrosPer={opEstac} />
            <PLRow label="Pensiones" detalle="otros_ingresos" onDetalle={setDetalle}
              proy={pPensiones} total={rPensiones} rentasMes={rmPension} otrosPer={opPension} />
            <PLRow label="Maquinita" detalle="vending" onDetalle={setDetalle}
              proy={pMaquinita} total={rMaquinita} rentasMes={rmMaquinita} otrosPer={opMaquinita} />
            <PLRow label="Agua" detalle="agua_ingreso" onDetalle={setDetalle}
              proy={pAguaIng} total={rAguaIng} rentasMes={rmAguaIng} otrosPer={opAguaIng} />

            <SubRow label="Total Ingresos" highlight composicion={compTotalIng} onDetalle={setDetalle}
              proy={pTotalIng} total={rTotalIng}
              rentasMes={rmTotalIng}
              otrosPer={opTotalIng} />

            {/* ── GASTOS VARIABLES ─────────────────────────────────────────── */}
            <SectionHeader label="Gastos Variables" bg="#1A3C5E" />

            <PLRow label="Sueldos" detalle="sueldos" onDetalle={setDetalle}          proy={pSueldos}  total={rSueldos} />
            <PLRow label="Fondo Revolvente" detalle="gastos" onDetalle={setDetalle} proy={pFondo}    total={rFondo} />
            {rExcedente !== 0 && (
              <PLRow label="Gasto Excedente" indent={1} total={rExcedente} />
            )}
            <PLRow label="Luz" detalle="gastos" onDetalle={setDetalle}   proy={pLuz}   total={rLuz} />
            <PLRow label="Agua" detalle="gastos" onDetalle={setDetalle} proy={pAguaG} total={rAguaG} />
            <PLRow label="Otros" detalle="gastos" onDetalle={setDetalle} proy={pOtros} total={rOtros} />

            <SubRow label="Total Gastos Variables" composicion={compTotalG} onDetalle={setDetalle}
              proy={pTotalG} total={rTotalG} />

            {/* ── UTILIDAD BRUTA ── */}
            <SubRow label="Utilidad Bruta" highlight composicion={compUtilBruta} onDetalle={setDetalle}
              proy={pUtilBruta} total={rUtilBruta} />

            {/* ── IMPUESTOS Y GASTOS FIJOS ─────────────────────────────────── */}
            <SectionHeader label="Impuestos y Gastos Fijos" bg="#4B5563" />

            <PLRow label="Predial"                        proy={pPredial}  total={pPredial} />
            <PLRow label="Transporte de Residuos Sólidos" proy={pTransp}   total={pTransp} />
            <PLRow label="Licencia de Estacionamiento"    proy={pLicencia} total={pLicencia} />
            <PLRow label="Anuncio Publicitario IWOL"      proy={pAnuncio}  total={pAnuncio} />

            <SubRow label="Total Impuestos" composicion={compTotalImp} onDetalle={setDetalle}
              proy={pTotalImp} total={rTotalImp} />

            {/* ── UTILIDAD NETA ── */}
            <SubRow label="Utilidad Neta" highlight big composicion={compUtilNeta} onDetalle={setDetalle}
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

            // Totales auto en En Elaboración
            // Rentas
            const eRentaCFMes   = parseFloat(fForm.real_rentas_factura_mes)   || 0
            const eRentaCFOtros = parseFloat(fForm.real_rentas_factura_otros) || 0
            const eRentaSFMes   = parseFloat(fForm.real_rsf_mes)              || 0
            const eRentaSFOtros = parseFloat(fForm.real_rsf_otros)            || 0
            const eRentaFact    = eRentaCFMes + eRentaCFOtros
            const eRentaSin     = eRentaSFMes + eRentaSFOtros
            // Sanciones (cf=con factura/transferencia, sf=sin factura/efectivo)
            const eSanCFMes     = parseFloat(fForm.real_penaliz_cf_mes)   || 0
            const eSanCFOtros   = parseFloat(fForm.real_penaliz_cf_otros) || 0
            const eSanSFMes     = parseFloat(fForm.real_penaliz_sf_mes)   || 0
            const eSanSFOtros   = parseFloat(fForm.real_penaliz_sf_otros) || 0
            const eSancion      = eSanCFMes + eSanCFOtros + eSanSFMes + eSanSFOtros
            const ePenaliz      = eSancion  // alias para compat
            // Proyectado Total Rentas Obtenidas = suma de los 4 campos proyectados de las filas
            const eProyRentasCF  = parseFloat(fForm.proy_rentas_contratos) || proyRentas
            const eProyRentasSF  = parseFloat(fForm.proy_rsf)       || 0
            const eProySanCF     = parseFloat(fForm.proy_penaliz)    || 0
            const eProyTotalRent = eProyRentasCF + eProyRentasSF + eProySanCF
            // Total Rentas Obtenidas (mes y otros)
            const eRmTotalRentas = eRentaCFMes   + eRentaSFMes   + eSanCFMes   + eSanSFMes
            const eOpTotalRentas = eRentaCFOtros + eRentaSFOtros + eSanCFOtros + eSanSFOtros
            const eTotalRentas   = eRmTotalRentas + eOpTotalRentas
            const eRentasBrutas  = eTotalRentas   // rentas + sanciones = brutas
            // IVA
            const eIvaMes    = parseFloat(fForm.real_iva_mes)   || 0
            const eIvaOtros  = parseFloat(fForm.real_iva_otros) || 0
            const eIva       = -(eIvaMes + eIvaOtros) || -(Math.abs(parseFloat(fForm.real_iva)||0))
            // Ingresos Netos Renta
            const eRmIngNeto = eRmTotalRentas - eIvaMes
            const eOpIngNeto = eOpTotalRentas - eIvaOtros
            const eIngNeto   = eRentasBrutas + eIva
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
                {/* Proyectado de rentas — única entrada manual en esta sección */}
                <EditRow label="Proyectado Rentas" detalle="proyectado" onDetalle={setDetalle}
                  fieldP="proy_rentas_contratos"
                  form={fForm} setField={sf}
                  hintP={`auto: ${fmt(proyRentas)}`} />
                <EditRow label="• Restaurant; Ampliación ($276 m² pp)"
                  fieldP="proy_restaurant"
                  form={fForm} setField={sf} indent={1} />
                <InfoRowE label="Rentas disponibles (locales-Restau)"
                  proy={(parseFloat(fForm.proy_rentas_contratos)||proyRentas) - (parseFloat(fForm.proy_restaurant)||0)}
                  indent={1} />
                <EditRow label="** Locales (L10, L22, Financiera L24,25,26)"
                  fieldP="proy_locales_vacantes"
                  form={fForm} setField={sf} indent={2} />

                {/* Rentas y sanciones: lectura automática — solo el Proyectado es editable */}
                <CalcRowE label="Rentas con Factura"
                  fieldP="proy_rentas_contratos" values={fForm} setField={sf}
                  total={eRentaFact} mes={eRentaCFMes} otros={eRentaCFOtros}
                  detalle="rentas_cf" onDetalle={setDetalle} />
                <CalcRowE label="Rentas sin Factura"
                  fieldP="proy_rsf" values={fForm} setField={sf}
                  total={eRentaSin} mes={eRentaSFMes} otros={eRentaSFOtros}
                  detalle="rentas_sf" onDetalle={setDetalle} />
                <CalcRowE label="Sanciones con Factura"
                  fieldP="proy_penaliz" values={fForm} setField={sf}
                  total={eSanCFMes + eSanCFOtros} mes={eSanCFMes} otros={eSanCFOtros}
                  detalle="sanciones_cf" onDetalle={setDetalle} />
                <CalcRowE label="Sanciones sin Factura"
                  total={eSanSFMes + eSanSFOtros} mes={eSanSFMes} otros={eSanSFOtros}
                  detalle="sanciones_sf" onDetalle={setDetalle} />

                <SubTot label="Total Rentas Obtenidas" proy={eProyTotalRent} real={eTotalRentas} composicion={compTotalRentasObt} onDetalle={setDetalle}
                  mes={eRmTotalRentas} otros={eOpTotalRentas} />
                {/* IVA: calculado del sistema, sin cajas de captura */}
                <CalcRowE label="IVA retenido"
                  proy={parseFloat(fForm.proy_iva)||0}
                  total={eIva} mes={eIvaMes !== 0 ? -eIvaMes : 0} otros={eIvaOtros !== 0 ? -eIvaOtros : 0}
                  indent={1} negLabel />

                <SubTot label="Ingresos Netos Renta" proy={pIngNeto} real={eIngNeto} highlight composicion={compIngNeto} onDetalle={setDetalle}
                  mes={eRmIngNeto} otros={eOpIngNeto} />

                {/* Estac/Pensiones/Vending/Agua: real viene del sistema — solo proyectado editable */}
                <CalcRowE label="Estacionamiento" detalle="estacionamiento" onDetalle={setDetalle}
                  fieldP="proy_estacionamiento" values={fForm} setField={sf}
                  total={eEstac} mes={eRmEstac} otros={eOpEstac} />
                <CalcRowE label="Pensiones" detalle="pensiones" onDetalle={setDetalle}
                  fieldP="proy_pensiones" values={fForm} setField={sf}
                  total={ePension} mes={eRmPension} otros={eOpPension} />
                <CalcRowE label="Maquinita/Vending" detalle="vending" onDetalle={setDetalle}
                  fieldP="proy_maquinita" values={fForm} setField={sf}
                  total={eMaquinita} mes={eRmMaq} otros={eOpMaq} />
                <CalcRowE label="Agua (cobro)" detalle="agua_ingreso" onDetalle={setDetalle}
                  fieldP="proy_agua_ingresos" values={fForm} setField={sf}
                  total={eAguaIng} mes={eRmAgua} otros={eOpAgua} />

                <SubTot label="Total Ingresos" proy={pTotalIng} real={eTotalIng} highlight composicion={compTotalIng} onDetalle={setDetalle}
                  mes={eRmIngNeto + eRmEstac + eRmPension + eRmMaq + eRmAgua}
                  otros={eOpIngNeto + eOpEstac + eOpPension + eOpMaq + eOpAgua} />

                <SecHdr label="Gastos Variables" />
                <EditRow label="Sueldos" detalle="sueldos" onDetalle={setDetalle}          fieldP="proy_sueldos"          fieldR="real_sueldos"          form={fForm} setField={sf} hintP={`RH: ${fmt(proySueldos)}`} />
                <EditRow label="Fondo Revolvente" detalle="gastos" onDetalle={setDetalle}  fieldP="proy_fondo_revolvente" fieldR="real_fondo_revolvente" form={fForm} setField={sf} />
                <EditRow label="Gasto Excedente"  fieldP={null}                  fieldR="real_gasto_excedente"  form={fForm} setField={sf} indent={1} />
                <EditRow label="Luz" detalle="gastos" onDetalle={setDetalle}              fieldP="proy_luz"              fieldR="real_luz"              form={fForm} setField={sf} />
                <EditRow label="Agua (gasto)"     fieldP="proy_agua_gastos"      fieldR="real_agua_gastos"      form={fForm} setField={sf} />
                <EditRow label="Otros gastos" detalle="gastos" onDetalle={setDetalle}     fieldP="proy_otros_gastos"     fieldR="real_otros_gastos"     form={fForm} setField={sf} />

                <SubTot label="Total Gastos Variables" proy={pTotalG} real={rTotalG} composicion={compTotalG} onDetalle={setDetalle} />
                <SubTot label="Utilidad Bruta"         proy={pUtilBruta} real={rUtilBruta} highlight composicion={compUtilBruta} onDetalle={setDetalle} />

                <SecHdr label="Impuestos y Gastos Fijos" bg="#4B5563" />
                <EditRow label="Predial"                     fieldP="predial"                  fieldR="predial"                  form={fForm} setField={sf} />
                <EditRow label="Transporte Residuos Sólidos" fieldP="transporte_residuos"       fieldR="transporte_residuos"       form={fForm} setField={sf} />
                <EditRow label="Licencia de Estacionamiento" fieldP="licencia_estacionamiento"  fieldR="licencia_estacionamiento"  form={fForm} setField={sf} />
                <EditRow label="Anuncio Publicitario IWOL"   fieldP="anuncio_publicitario"      fieldR="anuncio_publicitario"      form={fForm} setField={sf} />

                <SubTot label="Total Impuestos" proy={pTotalImp} real={rTotalImp} composicion={compTotalImp} onDetalle={setDetalle} />
                <SubTot label="Utilidad Neta"   proy={pUtilNeta} real={rUtilNeta} highlight big composicion={compUtilNeta} onDetalle={setDetalle} />

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

      {detalle && (
        <DetalleEDR concepto={detalle.concepto} composicion={detalle.composicion} valorTablero={detalle.valor}
          mes={mes} anio={anio} onClose={() => setDetalle(null)} />
      )}
    </>
  )
}
