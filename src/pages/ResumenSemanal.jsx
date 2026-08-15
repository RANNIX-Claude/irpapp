import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarRange, ChevronRight, Printer, CheckCircle, AlertCircle, Car, ShoppingBag, Home, Wallet, ExternalLink, Plus, X } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, dec = 2) {
  return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function isoDate(d) { return d.toISOString().split('T')[0] }

// Fecha local como YYYY-MM-DD (evita cambio de día por diferencia UTC vs hora local)
function hoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function labelFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  return `${DIAS_ES[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${MESES_ES[d.getMonth()]}`
}

// ── Tabla de semanas operativas ──────────────────────────────────────────────
// Cada semana tiene 3 fechas:
//   ini      = Sábado (inicio oficial del corte)
//   fin      = Viernes (fin del corte)
//   iniEstac = Viernes anterior al Sábado (estac. se cobra desde ese Vie)
//
// Formato de label corto para el combo: "Sáb 27/Jun — Vie 03/Jul/2026"

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function labelCorto(ini, fin) {
  const i = new Date(ini + 'T12:00:00')
  const f = new Date(fin + 'T12:00:00')
  const dI = `${DIAS_ES[i.getDay()].slice(0,3)} ${i.getDate()}/${MESES_ES[i.getMonth()]}`
  const dF = `${DIAS_ES[f.getDay()].slice(0,3)} ${f.getDate()}/${MESES_ES[f.getMonth()]}/${f.getFullYear()}`
  return `${dI} — ${dF}`
}

// Genera la tabla de semanas desde ORIGEN hasta hoy+4 semanas (más reciente primero)
function generarTablaSemanas() {
  const ORIGEN_INI = '2026-06-27'   // primer Sábado registrado
  const hoy = new Date()
  // Sábado de la semana actual (usando fecha local, no UTC)
  const dow = hoy.getDay()                            // 0=Dom … 6=Sáb
  const diasHastaSab = dow === 6 ? 0 : dow + 1
  const sabHoy = new Date(hoy)
  sabHoy.setDate(sabHoy.getDate() - diasHastaSab)
  const sabHoyLocal = `${sabHoy.getFullYear()}-${String(sabHoy.getMonth()+1).padStart(2,'0')}-${String(sabHoy.getDate()).padStart(2,'0')}`
  const limiteIso = addDays(sabHoyLocal, 4 * 7)

  const semanas = []
  let cur = ORIGEN_INI
  while (cur <= limiteIso) {
    const fin = addDays(cur, 6)          // Vie = Sáb + 6
    const iniEstac = addDays(cur, -1)    // Vie anterior = Sáb - 1
    semanas.push({ ini: cur, fin, iniEstac, label: labelCorto(cur, fin) })
    cur = addDays(cur, 7)
  }
  semanas.reverse()   // más reciente primero
  return semanas
}

// Sábado de la semana que contiene una fecha dada
function sabadoDe(iso) {
  const d = new Date(iso + 'T12:00:00')
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 6 ? 0 : dow + 1))
  return d.toISOString().split('T')[0]
}

// ── Carga de datos: estac usa iniEstac→fin, resto usa ini→fin ─────────────────
async function cargarDatos(ini, fin, iniEstac) {
  const [
    { data: estac },
    { data: pensiones },
    { data: vending },
    { data: gastos },
    { data: rentasEf },
  ] = await Promise.all([
    // Estacionamiento: desde Vie anterior (iniEstac) hasta el Vie del corte
    supabase.from('estacionamiento_diario')
      .select('fecha, cantidad, dia_semana, notas')
      .gte('fecha', iniEstac).lte('fecha', fin)
      .order('fecha'),

    // Pensiones: semana_inicio = Sábado
    supabase.from('estacionamiento_pensiones')
      .select('local_referencia, arrendatario_nombre, monto, num_recibo, fecha, pagado, nota')
      .eq('semana_inicio', ini)
      .order('num_recibo'),

    // Vending: semana cuyo fecha_inicio = Sábado seleccionado
    supabase.from('vending_semanas')
      .select('fecha_inicio, venta_pesos, residual_pesos, es_material, nota')
      .eq('fecha_inicio', ini)
      .limit(1),

    // Gastos operativos por fecha dentro del rango Sáb→Vie
    supabase.from('gastos_operativos')
      .select('fecha, proveedor, grupo_gasto, descripcion, cantidad')
      .gte('fecha', ini).lte('fecha', fin)
      .order('fecha'),

    // Ingresos efectivo (RENTA + AGUA + SANCION + OTRO): rango Sáb→Vie
    supabase.from('ingresos')
      .select('fecha, importe, tipo, origen, concepto_origen, nota, propietario, id_contrato')
      .eq('origen', 'EFECTIVO')
      .gte('fecha', ini).lte('fecha', fin)
      .order('fecha'),
  ])

  const ingresosEf = rentasEf ?? []

  return {
    estac:     estac     ?? [],
    pensiones: pensiones ?? [],
    vending:   vending   ?? [],
    gastos:    gastos    ?? [],
    rentasEf:  ingresosEf.filter(r => r.tipo === 'RENTA'),
    aguaEf:    ingresosEf.filter(r => r.tipo === 'AGUA'),
    otrosEf:   ingresosEf.filter(r => !['RENTA','AGUA'].includes(r.tipo)),
  }
}

// ── Grupos de gasto para el modal ─────────────────────────────────────────────
const GRUPOS_GASTO = [
  'Ferretería y materiales','Limpieza e higiene','Servicios externos',
  'Papelería y oficina','Alimentación','Vending / Reabasto',
  'Herramienta y equipo','Seguridad','Nómina / Personal','Otros',
]

const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

// ── Modal base ────────────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'white', borderRadius:'14px', width:'420px', maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #F3F4F6' }}>
          <h3 style={{ margin:0, fontSize:'15px', fontWeight:700, color:'#111827' }}>{titulo}</h3>
          <button onClick={onClose} style={{ background:'#F3F4F6', border:'none', borderRadius:'6px', padding:'5px', cursor:'pointer', display:'flex', alignItems:'center', color:'#6B7280' }}><X size={16}/></button>
        </div>
        <div style={{ padding:'20px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Modal: Estacionamiento Diario ─────────────────────────────────────────────
function ModalEstac({ semIni, semFin, onClose, onSaved }) {
  const hoy = hoyLocal()
  const fechaDefault = hoy >= semIni && hoy <= semFin ? hoy : semFin
  const [form, setForm] = useState({ fecha: fechaDefault, cantidad: '', notas: '' })
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    if (!form.cantidad) return toast.error('Ingresa el monto')
    setSaving(true)
    const dt = new Date(form.fecha + 'T12:00:00')
    const payload = {
      fecha: form.fecha, cantidad: parseFloat(form.cantidad), notas: form.notas || null,
      anio: dt.getFullYear(), mes: MESES_ES[dt.getMonth()],
      dia_semana: DIAS_SEMANA[dt.getDay()], semana: 'S' + Math.ceil(dt.getDate() / 7),
    }
    const { error } = await supabase.from('estacionamiento_diario').upsert(payload, { onConflict: 'fecha' })
    if (error) toast.error(error.message)
    else { toast.success('Estacionamiento guardado'); onSaved() }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' }
  return (
    <>
      <div style={{ marginBottom:'12px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Fecha</label>
        <input type="date" value={form.fecha} min={semIni} max={semFin}
          onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Monto del día ($)</label>
        <input type="number" min="0" step="50" value={form.cantidad} placeholder="0.00" autoFocus
          onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
          style={{ ...inp, fontSize:'28px', fontWeight:800, textAlign:'right', color:'var(--color-success)' }} />
      </div>
      <div style={{ marginBottom:'20px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Nota (opcional)</label>
        <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: festivo, lluvia..." style={inp} />
      </div>
      <button onClick={guardar} disabled={saving}
        style={{ width:'100%', padding:'13px', background:'var(--color-success)', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:800, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Guardando...' : 'Guardar ingreso'}
      </button>
    </>
  )
}

// ── Modal: Gasto Fondo Revolvente ─────────────────────────────────────────────
function ModalGasto({ semIni, semFin, onClose, onSaved }) {
  const hoy = hoyLocal()
  const fechaDefault = hoy >= semIni && hoy <= semFin ? hoy : semFin
  const [form, setForm] = useState({ fecha: fechaDefault, proveedor: '', grupo_gasto: '', descripcion: '', cantidad: '' })
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    if (!form.proveedor || !form.cantidad) return toast.error('Proveedor y monto son obligatorios')
    setSaving(true)
    const dt = new Date(form.fecha + 'T12:00:00')
    const payload = {
      fecha: form.fecha,
      anio: dt.getFullYear(),
      mes: MESES_ES[dt.getMonth()],
      dia_semana: DIAS_SEMANA[dt.getDay()],
      semana: 'S' + Math.ceil(dt.getDate() / 7),
      semana_inicio: semIni,
      proveedor: form.proveedor.toUpperCase(),
      proveedor_nombre: form.proveedor,
      grupo_gasto: form.grupo_gasto || 'Otros',
      descripcion: form.descripcion || form.proveedor,
      cantidad: parseFloat(form.cantidad),
      monto_pagado: parseFloat(form.cantidad),
      tiene_factura: false,
    }
    const { error } = await supabase.from('gastos_operativos').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success('Gasto registrado'); onSaved() }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' }
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Fecha</label>
          <input type="date" value={form.fecha} min={semIni} max={semFin}
            onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Monto ($)</label>
          <input type="number" min="0" step="0.50" value={form.cantidad} placeholder="0.00" autoFocus
            onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
            style={{ ...inp, fontSize:'18px', fontWeight:800, textAlign:'right', color:'#DC2626' }} />
        </div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Proveedor</label>
        <input value={form.proveedor} onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))} placeholder="Ej: Dogo, Office Depot..." style={inp} />
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Categoría</label>
        <select value={form.grupo_gasto} onChange={e => setForm(p => ({ ...p, grupo_gasto: e.target.value }))} style={inp}>
          <option value="">— Seleccionar —</option>
          {GRUPOS_GASTO.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div style={{ marginBottom:'20px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Concepto / Descripción</label>
        <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Papel higiénico, Cloro..." style={inp} />
      </div>
      <button onClick={guardar} disabled={saving}
        style={{ width:'100%', padding:'13px', background:'#DC2626', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:800, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Guardando...' : 'Registrar gasto'}
      </button>
    </>
  )
}

// ── Modal: Ingreso Efectivo (Renta o Agua) ────────────────────────────────────
const MESES_INGRESO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function ModalIngreso({ tipo, semIni, semFin, onClose, onSaved }) {
  const hoy = hoyLocal()
  const fechaDefault = hoy >= semIni && hoy <= semFin ? hoy : semFin
  const [form, setForm] = useState({
    fecha: fechaDefault, importe: '', propietario: '',
    id_contrato: '', concepto_origen: '', nota: '',
  })
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    if (!form.importe) return toast.error('Ingresa el importe')
    setSaving(true)
    const { error } = await supabase.from('ingresos').insert({
      fecha: form.fecha,
      tipo,
      origen: 'EFECTIVO',
      importe: parseFloat(form.importe),
      propietario: form.propietario || null,
      id_contrato: form.id_contrato || null,
      concepto_origen: form.concepto_origen || `${tipo} ${MESES_INGRESO[new Date(form.fecha+'T12:00:00').getMonth()]}${new Date(form.fecha+'T12:00:00').getFullYear().toString().slice(2)}`,
      nota: form.nota || null,
    })
    if (error) toast.error(error.message)
    else { toast.success(`${tipo} registrada`); onSaved() }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' }
  const color = tipo === 'RENTA' ? 'var(--color-success)' : '#0284C7'
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Fecha de pago</label>
          <input type="date" value={form.fecha} min={semIni} max={semFin}
            onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Importe ($)</label>
          <input type="number" min="0" step="0.01" value={form.importe} placeholder="0.00" autoFocus
            onChange={e => setForm(p => ({ ...p, importe: e.target.value }))}
            style={{ ...inp, fontSize:'22px', fontWeight:800, textAlign:'right', color }} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Propietario / Razón Social</label>
          <input value={form.propietario} onChange={e => setForm(p => ({ ...p, propietario: e.target.value }))} placeholder="Nombre..." style={inp} />
        </div>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>ID Contrato / Local</label>
          <input value={form.id_contrato} onChange={e => setForm(p => ({ ...p, id_contrato: e.target.value }))} placeholder="Ej: L04" style={inp} />
        </div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Concepto (opcional)</label>
        <input value={form.concepto_origen} onChange={e => setForm(p => ({ ...p, concepto_origen: e.target.value }))}
          placeholder={tipo === 'RENTA' ? 'Ej: RENTA AGO26' : 'Ej: AGUA AGO26'} style={inp} />
      </div>
      <div style={{ marginBottom:'20px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Nota</label>
        <input value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} placeholder="Observaciones..." style={inp} />
      </div>
      <button onClick={guardar} disabled={saving}
        style={{ width:'100%', padding:'13px', background: color, color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:800, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Guardando...' : `Registrar ${tipo.charAt(0)+tipo.slice(1).toLowerCase()}`}
      </button>
    </>
  )
}

// ── Modal: Pensión de Estacionamiento ─────────────────────────────────────────
function ModalPension({ semIni, semFin, onClose, onSaved }) {
  const hoy = hoyLocal()
  const fechaDefault = hoy >= semIni && hoy <= semFin ? hoy : semFin
  const [form, setForm] = useState({ fecha: fechaDefault, local_referencia: '', arrendatario_nombre: '', monto: '', num_recibo: '', nota: '' })
  const [saving, setSaving] = useState(false)

  const guardar = async () => {
    if (!form.monto) return toast.error('Ingresa el monto')
    setSaving(true)
    const { error } = await supabase.from('estacionamiento_pensiones').insert({
      fecha: form.fecha, semana_inicio: semIni,
      local_referencia: form.local_referencia || null,
      arrendatario_nombre: form.arrendatario_nombre || null,
      monto: parseFloat(form.monto),
      num_recibo: form.num_recibo || null,
      pagado: true,
      nota: form.nota || null,
    })
    if (error) toast.error(error.message)
    else { toast.success('Pensión registrada'); onSaved() }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' }
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Fecha de cobro</label>
          <input type="date" value={form.fecha} min={semIni} max={semFin}
            onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Monto ($)</label>
          <input type="number" min="0" step="50" value={form.monto} placeholder="0.00" autoFocus
            onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
            style={{ ...inp, fontSize:'18px', fontWeight:800, textAlign:'right', color:'var(--color-primary)' }} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>No. Local</label>
          <input value={form.local_referencia} onChange={e => setForm(p => ({ ...p, local_referencia: e.target.value }))} placeholder="Ej: L17, L26-27" style={inp} />
        </div>
        <div>
          <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>No. Recibo</label>
          <input value={form.num_recibo} onChange={e => setForm(p => ({ ...p, num_recibo: e.target.value }))} placeholder="001" style={inp} />
        </div>
      </div>
      <div style={{ marginBottom:'12px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Nombre del pensionado</label>
        <input value={form.arrendatario_nombre} onChange={e => setForm(p => ({ ...p, arrendatario_nombre: e.target.value }))} placeholder="Nombre completo" style={inp} />
      </div>
      <div style={{ marginBottom:'20px' }}>
        <label style={{ fontSize:'12px', fontWeight:700, color:'#6B7280', display:'block', marginBottom:'5px' }}>Nota</label>
        <input value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} placeholder="Observaciones..." style={inp} />
      </div>
      <button onClick={guardar} disabled={saving}
        style={{ width:'100%', padding:'13px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:800, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Guardando...' : 'Registrar pensión'}
      </button>
    </>
  )
}

// ── Componente fila de tabla ──────────────────────────────────────────────────
function FilaTabla({ label, monto, sub, bold, highlight, indent }) {
  return (
    <tr style={{ background: highlight ? '#FFFBEB' : 'transparent' }}>
      <td style={{ padding: '5px 8px', fontSize: '13px', paddingLeft: indent ? '24px' : '8px', color: bold ? '#111827' : '#374151', fontWeight: bold ? 700 : 400 }}>
        {label}
      </td>
      {sub != null && <td style={{ padding: '5px 8px', fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>{sub}</td>}
      <td style={{ padding: '5px 8px', fontSize: '13px', fontWeight: bold ? 700 : 500, textAlign: 'right', color: bold ? '#111827' : '#374151' }}>
        {monto != null ? fmt(monto) : ''}
      </td>
    </tr>
  )
}

// ── Generador HTML para imprimir ──────────────────────────────────────────────
function generarHTML({ iniStr, finStr, pensiones, estac, vending, gastos, rentasEf, aguaEf, otrosEf, totales }) {
  const { totPensiones, totEstac, totVending, totRentas, totAgua, totOtros, totalEfectivo, totGastosFondo, diferencia, residualVending } = totales

  const rowsEstac = estac.map(e =>
    `<tr><td style="padding:3px 6px;font-size:12px">${labelFecha(e.fecha)}</td><td></td><td style="text-align:right;padding:3px 6px">${fmt(e.cantidad)}</td><td style="color:#16a34a;text-align:center;font-size:11px">${e.cantidad > 0 ? '✓' : ''}</td></tr>`
  ).join('')

  const rowsPensiones = pensiones.map(p =>
    `<tr><td style="padding:3px 6px;font-size:11px;padding-left:16px">${p.local_referencia || '—'} ${p.arrendatario_nombre || ''}</td><td style="text-align:center;font-size:11px">${p.num_recibo || ''}</td><td style="text-align:right;padding:3px 6px">${fmt(p.monto)}</td><td></td></tr>`
  ).join('')

  const rowsRentas = rentasEf.map(r =>
    `<tr><td style="padding:3px 6px;font-size:12px">${r.propietario ? `${r.propietario} ${r.id_contrato||''}` : (r.concepto_origen || 'Renta')}</td><td style="font-size:11px;color:#6B7280">${r.fecha}</td><td style="text-align:right;padding:3px 6px">${fmt(r.importe)}</td><td></td></tr>`
  ).join('')
  const rowsAgua = (aguaEf||[]).map(r =>
    `<tr><td style="padding:3px 6px;font-size:12px">${r.propietario ? `${r.propietario} ${r.id_contrato||''}` : (r.concepto_origen || 'Agua')}</td><td style="font-size:11px;color:#6B7280">${r.fecha}</td><td style="text-align:right;padding:3px 6px;color:#0284C7">${fmt(r.importe)}</td><td></td></tr>`
  ).join('')

  const rowsGastos = gastos.map(g =>
    `<tr>
      <td style="padding:3px 6px;font-size:11px">${g.fecha ? g.fecha.slice(5).replace('-','/') : '—'}</td>
      <td style="padding:3px 6px;font-size:11px">${g.proveedor || '—'}</td>
      <td style="padding:3px 6px;font-size:11px">${g.grupo_gasto || g.descripcion || '—'}</td>
      <td style="padding:3px 6px;text-align:right;font-size:11px">${fmt(g.cantidad)}</td>
      <td style="padding:3px 6px;text-align:right;font-size:11px;color:#6B7280">${g.monto_comprobante ? fmt(g.monto_comprobante) : ''}</td>
      <td style="padding:3px 6px;font-size:11px">${g.tiene_factura ? '✓ Fact.' : ''}</td>
    </tr>`
  ).join('')

  const vendingRows = vending.map(v =>
    `<tr><td style="padding:3px 6px;font-size:12px">Vending Machine</td><td></td><td style="text-align:right;padding:3px 6px;color:${v.es_material ? '#DC2626':'#374151'}">${fmt(v.venta_pesos)}${v.es_material ? ' (Material)' : ''}</td><td></td></tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Corte Semanal — ${iniStr}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1A1A1A; padding: 24px; }
  h1 { font-size:16px; color:#0A66C2; font-weight:800; }
  .sub { font-size:11px; color:#6B7280; }
  .hdr { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0A66C2; padding-bottom:12px; margin-bottom:16px; }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .panel-title { background:#1A3C5E; color:white; font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; padding:6px 10px; border-radius:4px 4px 0 0; }
  table { width:100%; border-collapse:collapse; }
  th { background:#F3F4F6; font-size:10px; font-weight:700; text-transform:uppercase; padding:5px 6px; color:#6B7280; text-align:left; border-bottom:1px solid #E5E7EB; }
  th.r, td.r { text-align:right; }
  tr:nth-child(even) { background:#FAFAFA; }
  .section-row td { background:#F0F4FF; font-weight:700; font-size:11px; text-transform:uppercase; color:#0A66C2; padding:5px 8px; border-top:1px solid #DBEAFE; }
  .total-box { border:2px solid #0A66C2; border-radius:6px; padding:8px 12px; margin:10px 0; display:flex; justify-content:space-between; align-items:center; }
  .total-box .lbl { font-size:11px; font-weight:700; text-transform:uppercase; color:#0A66C2; }
  .total-box .val { font-size:18px; font-weight:900; color:#0A66C2; }
  .sum-row td { font-weight:800; border-top:2px solid #1A3C5E; }
  .warn { color:#DC2626; font-weight:700; }
  .note { font-size:10px; color:#6B7280; font-style:italic; margin-top:4px; }
  .footer { border-top:1px solid #E5E7EB; margin-top:16px; padding-top:8px; display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; }
  @media print { @page { size: landscape; margin:10mm; } }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <h1>CORTE SEMANAL OPERATIVO</h1>
      <div class="sub">Inmobiliaria Alcedines del Norte · Plaza IWOL, Metepec</div>
      <div style="margin-top:4px; font-weight:700; color:#374151">${labelCorto(iniStr, finStr)}</div>
    </div>
    <div style="text-align:right">
      <div class="sub">Generado: ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric', hour:'2-digit',minute:'2-digit'})}</div>
      <div class="sub">Semana: Viernes → Jueves</div>
    </div>
  </div>

  <div class="cols">
    <!-- ── COLUMNA IZQUIERDA: INGRESOS ── -->
    <div>
      <div class="panel-title">💵 Ingresos en Efectivo</div>
      <table>
        <tbody>
          <!-- PENSIONES -->
          ${pensiones.length > 0 ? `
          <tr class="section-row"><td colspan="4">Pensiones de Estacionamiento</td></tr>
          ${rowsPensiones}
          <tr><td colspan="2" style="padding:4px 8px;font-weight:700">Total Pensiones</td><td></td><td style="text-align:right;font-weight:800;padding:4px 8px">${fmt(totPensiones)}</td></tr>
          ` : ''}

          <!-- ESTACIONAMIENTO DIARIO -->
          <tr class="section-row"><td colspan="4">Estacionamiento Diario</td></tr>
          ${rowsEstac || '<tr><td colspan="4" style="padding:6px;color:#9CA3AF;text-align:center">Sin registros</td></tr>'}
          <tr><td colspan="2" style="padding:4px 8px;font-weight:700">Total Estacionamiento</td><td></td><td style="text-align:right;font-weight:800;padding:4px 8px">${fmt(totEstac)}</td></tr>

          <!-- VENDING MACHINE -->
          ${vending.length > 0 ? `
          <tr class="section-row"><td colspan="4">Vending Machine</td></tr>
          ${vendingRows}
          ` : ''}

          <!-- RENTAS EN EFECTIVO -->
          <tr class="section-row"><td colspan="4">Rentas cobradas en efectivo</td></tr>
          ${rowsRentas || '<tr><td colspan="4" style="padding:4px 8px;color:#9CA3AF;font-size:11px">Sin registros</td></tr>'}
          ${rentasEf.length > 0 ? `<tr><td colspan="2" style="padding:3px 8px;font-weight:700;font-size:11px">Total rentas</td><td></td><td style="text-align:right;font-weight:800;padding:3px 8px">${fmt(totRentas)}</td></tr>` : ''}

          <!-- AGUA -->
          <tr class="section-row"><td colspan="4">💧 Agua cobrada en efectivo</td></tr>
          ${rowsAgua || '<tr><td colspan="4" style="padding:4px 8px;color:#9CA3AF;font-size:11px">Sin registros</td></tr>'}
          ${(aguaEf||[]).length > 0 ? `<tr><td colspan="2" style="padding:3px 8px;font-weight:700;font-size:11px">Total agua</td><td></td><td style="text-align:right;font-weight:800;padding:3px 8px;color:#0284C7">${fmt(totAgua)}</td></tr>` : ''}
        </tbody>
      </table>

      <div class="total-box" style="margin-top:12px">
        <span class="lbl">Total Efectivo a Entregar</span>
        <span class="val">${fmt(totalEfectivo)}</span>
      </div>

      <table>
        <tbody>
          <tr><td style="padding:4px 8px;color:#DC2626">Gastos Fondo Revolvente</td><td style="text-align:right;font-weight:700;color:#DC2626;padding:4px 8px">— ${fmt(totGastosFondo)}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:700;border-top:1px solid #E5E7EB">Diferencia</td><td style="text-align:right;font-weight:800;border-top:1px solid #E5E7EB;padding:4px 8px">${fmt(diferencia)}</td></tr>
          ${residualVending > 0 ? `<tr><td style="padding:4px 8px;font-size:11px;color:#6B7280">Residual Vending Machine</td><td style="text-align:right;font-size:11px;color:#6B7280;padding:4px 8px">${fmt(residualVending)}</td></tr>` : ''}
        </tbody>
      </table>

      ${pensiones.some(p => p.nota) ? `<div class="note">${pensiones.filter(p=>p.nota).map(p=>`${p.local_referencia}: ${p.nota}`).join(' · ')}</div>` : ''}
    </div>

    <!-- ── COLUMNA DERECHA: GASTOS FONDO ── -->
    <div>
      <div class="panel-title">🧾 Gastos a Comprobar — Fondo Revolvente</div>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Gasto</th>
            <th>Concepto</th>
            <th class="r">Importe</th>
            <th class="r">$$ Comprob.</th>
            <th>Factura</th>
          </tr>
        </thead>
        <tbody>
          ${rowsGastos || '<tr><td colspan="6" style="padding:12px;color:#9CA3AF;text-align:center">Sin gastos registrados</td></tr>'}
          <tr class="sum-row">
            <td colspan="3" style="padding:5px 6px">Total</td>
            <td style="text-align:right;padding:5px 6px">${fmt(totGastosFondo)}</td>
            <td></td><td></td>
          </tr>
        </tbody>
      </table>

      <!-- Fondo recibido vs gastado -->
      <div style="margin-top:12px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;padding:8px 12px">
        <div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:4px">BALANCE FONDO REVOLVENTE</div>
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span>Fondo recibido (base $5,000)</span><span style="font-weight:700">$5,000.00</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px">
          <span>Total gastado</span><span style="font-weight:700;color:#DC2626">${fmt(totGastosFondo)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;border-top:1px solid #FCA5A5;margin-top:4px;padding-top:4px;font-weight:700">
          <span>Diferencia (a comprobación)</span><span style="color:${totGastosFondo > 5000 ? '#DC2626':'#16a34a'}">${fmt(totGastosFondo - 5000)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>RANNIX Consulting · IRP — Plaza IWOL</span>
    <span>Firma administrador: ________________________</span>
  </div>
</body>
</html>`
}

// ── Componente principal ─────────────────────────────────────────────────────
function BtnIr({ to, label, navigate }) {
  return (
    <button
      onClick={() => navigate(to)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}
    >
      <ExternalLink size={11} /> {label}
    </button>
  )
}

export default function ResumenSemanal() {
  useModuleAudit('RESUMEN_SEMANAL')
  const navigate = useNavigate()

  // Tabla de semanas: [{ ini, fin, iniEstac, label }, ...]  (más reciente primero)
  const semanas = generarTablaSemanas()

  // Índice por defecto: semana actual
  const sabActual = sabadoDe(hoyLocal())
  const defaultIdx = semanas.findIndex(s => s.ini === sabActual)
  const [selIdx, setSelIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0)
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'estac' | 'gasto' | 'pension' | 'renta' | 'agua'

  const semSel = semanas[selIdx]   // { ini, fin, iniEstac, label }

  const recargar = () => {
    if (!semSel) return
    setLoading(true)
    cargarDatos(semSel.ini, semSel.fin, semSel.iniEstac)
      .then(d => { setDatos(d); setLoading(false) })
  }

  useEffect(() => { recargar() }, [semSel?.ini])

  // Calcular totales
  const totPensiones  = (datos?.pensiones  ?? []).reduce((a, b) => a + (parseFloat(b.monto)      || 0), 0)
  const totEstac      = (datos?.estac      ?? []).reduce((a, b) => a + (parseFloat(b.cantidad)    || 0), 0)
  const totVending    = (datos?.vending    ?? []).reduce((a, b) => a + (parseFloat(b.venta_pesos) || 0), 0)
  const totRentas     = (datos?.rentasEf   ?? []).reduce((a, b) => a + (parseFloat(b.importe)     || 0), 0)
  const totAgua       = (datos?.aguaEf     ?? []).reduce((a, b) => a + (parseFloat(b.importe)     || 0), 0)
  const totOtros      = (datos?.otrosEf    ?? []).reduce((a, b) => a + (parseFloat(b.importe)     || 0), 0)
  const totGastosFondo= (datos?.gastos     ?? []).reduce((a, b) => a + (parseFloat(b.cantidad)    || 0), 0)

  const vendingMaterial = (datos?.vending ?? []).filter(v => v.es_material).reduce((a, b) => a + (parseFloat(b.venta_pesos) || 0), 0)
  const residualVending = (datos?.vending ?? []).reduce((a, b) => a + (parseFloat(b.residual_pesos) || 0), 0)

  const totalEfectivo = totPensiones + totEstac + totVending + totRentas + totAgua + totOtros
  const diferencia    = totalEfectivo - totGastosFondo

  const totales = { totPensiones, totEstac, totVending, totRentas, totAgua, totOtros, totalEfectivo, totGastosFondo, diferencia, residualVending }

  const handlePrint = () => {
    const html = generarHTML({ iniStr: semSel.ini, finStr: semSel.fin, ...datos, aguaEf, otrosEf, totales })
    const w = window.open('', '_blank', 'width=1100,height=750')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  // ── Estilos rápidos ──
  const S = {
    panelTitle: { background: '#1A3C5E', color: 'white', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 14px', borderRadius: '8px 8px 0 0' },
    sectionHeader: { background: '#EEF2FF', color: '#0A66C2', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', padding: '6px 12px', borderTop: '1px solid #DBEAFE', borderBottom: '1px solid #DBEAFE' },
    row: (stripe) => ({ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', padding: '6px 12px', background: stripe ? '#F9FAFB' : 'white', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }),
    monto: (color) => ({ fontWeight: 700, fontSize: '13px', color: color || '#374151', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }),
    lbl: { fontSize: '12px', color: '#374151' },
    lblSmall: { fontSize: '11px', color: '#6B7280', paddingLeft: '14px' },
  }

  const estac     = datos?.estac     ?? []
  const pensiones = datos?.pensiones ?? []
  const vending   = datos?.vending   ?? []
  const gastos    = datos?.gastos    ?? []
  const rentasEf  = datos?.rentasEf  ?? []
  const aguaEf    = datos?.aguaEf    ?? []
  const otrosEf   = datos?.otrosEf   ?? []

  const esEstaSemana = semSel?.ini === sabActual

  return (
    <div style={{ padding: '24px', maxWidth: '1400px' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarRange size={22} color="var(--color-primary)" /> Corte Semanal Operativo
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Semana: <strong>Sábado → Viernes</strong> · Corte entregado el Sábado en reunión de oficina central</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selIdx}
              onChange={e => setSelIdx(Number(e.target.value))}
              style={{ appearance: 'none', padding: '9px 40px 9px 14px', background: 'white', border: '1.5px solid var(--color-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#111827', cursor: 'pointer', minWidth: '340px' }}
            >
              {semanas.map((s, i) => (
                <option key={s.ini} value={i}>{s.label}</option>
              ))}
            </select>
            <ChevronRight size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none', color: 'var(--color-primary)' }} />
            {esEstaSemana && <span style={{ position: 'absolute', top: '-8px', right: '-8px', fontSize: '10px', fontWeight: 700, color: 'white', background: 'var(--color-primary)', padding: '1px 6px', borderRadius: '10px' }}>HOY</span>}
          </div>
          <button
            onClick={() => { const idx = semanas.findIndex(s => s.ini === sabActual); if (idx >= 0) setSelIdx(idx) }}
            style={{ padding: '8px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Hoy
          </button>
          <button onClick={handlePrint} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1A3C5E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            <Printer size={14} /> Imprimir PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><LoadingSpinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ══════════════════════════════════════════════
              COLUMNA IZQUIERDA — INGRESOS EN EFECTIVO
          ══════════════════════════════════════════════ */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
            <div style={{ ...S.panelTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💵 Ingresos en Efectivo</span>
            <BtnIr to="/ingresos" label="Ir a Ingresos" navigate={navigate} />
          </div>

            {/* ── PENSIONES ── */}
            {(pensiones.length > 0 || true) && (
              <>
                <div style={{ ...S.sectionHeader, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>Pensiones de estacionamiento</span>
                  <button onClick={() => setModal('pension')} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'var(--color-primary)', border:'none', borderRadius:'5px', color:'white', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>
                    <Plus size={10}/> Nueva
                  </button>
                </div>
                {pensiones.length === 0 && (
                <div style={{ padding:'10px 12px', color:'#9CA3AF', fontSize:'12px', textAlign:'center' }}>Sin pensiones esta semana</div>
              )}
              {pensiones.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px', gap: '4px', padding: '6px 12px', background: i % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                    <span style={S.lblSmall}>{p.local_referencia} {p.arrendatario_nombre}</span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center' }}>#{p.num_recibo}</span>
                    <span style={S.monto('#374151')}>{fmt(p.monto)}</span>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px', padding: '7px 12px', background: '#F0F9FF', borderBottom: '1px solid #BFDBFE' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0A66C2' }}>Total pensiones</span>
                  <span />
                  <span style={S.monto('#0A66C2')}>{fmt(totPensiones)}</span>
                </div>
              </>
            )}

            {/* ── ESTACIONAMIENTO DIARIO ── */}
            <div style={{ ...S.sectionHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Car size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Estacionamiento diario</span>
              <button onClick={() => setModal('estac')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--color-success)', border: 'none', borderRadius: '5px', color: 'white', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={10} /> Agregar
              </button>
            </div>
            {estac.length === 0 ? (
              <div style={{ padding: '16px 12px', color: '#9CA3AF', fontSize: '12px', textAlign: 'center' }}>Sin registros esta semana</div>
            ) : estac.map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 100px', padding: '6px 12px', background: i % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                <span style={S.lbl}>{labelFecha(e.fecha)}</span>
                <CheckCircle size={13} color={parseFloat(e.cantidad) > 0 ? 'var(--color-success)' : '#E5E7EB'} />
                <span style={S.monto('#374151')}>{fmt(e.cantidad)}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 100px', padding: '7px 12px', background: '#F0F9FF', borderBottom: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0A66C2' }}>Total estacionamiento</span>
              <span />
              <span style={S.monto('#0A66C2')}>{fmt(totEstac)}</span>
            </div>

            {/* ── VENDING MACHINE ── */}
            {vending.length > 0 && (
              <>
                <div style={{ ...S.sectionHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><ShoppingBag size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Vending Machine</span>
                  <button onClick={() => navigate('/vending')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: 'var(--color-primary)', border: 'none', borderRadius: '5px', color: 'white', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                    <ExternalLink size={10} /> Agregar
                  </button>
                </div>
                {vending.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 100px', padding: '6px 12px', background: i % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F3F4F6', alignItems: 'center', gap: '8px' }}>
                    <span style={S.lbl}>Vending Machine</span>
                    {v.es_material && <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: '8px' }}>Material</span>}
                    <span style={S.monto(v.es_material ? '#DC2626' : '#374151')}>{fmt(v.venta_pesos)}</span>
                  </div>
                ))}
                {residualVending > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '5px 12px', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Residual Vending Machine</span>
                    <span style={S.monto('#9CA3AF')}>{fmt(residualVending)}</span>
                  </div>
                )}
              </>
            )}

            {/* ── RENTAS EN EFECTIVO ── */}
            <div style={{ ...S.sectionHeader, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span><Home size={12} style={{ marginRight:'6px', verticalAlign:'middle' }}/>Rentas cobradas en efectivo</span>
              <button onClick={() => setModal('renta')} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'var(--color-success)', border:'none', borderRadius:'5px', color:'white', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>
                <Plus size={10}/> Nueva
              </button>
            </div>
            {rentasEf.length === 0
              ? <div style={{ padding:'8px 12px', color:'#9CA3AF', fontSize:'12px' }}>Sin rentas esta semana</div>
              : rentasEf.map((r, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background: i%2===0?'white':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                  <span style={S.lbl}>{r.propietario ? `${r.propietario}${r.id_contrato?' · '+r.id_contrato:''}` : (r.concepto_origen||'Renta')} <span style={{ color:'#9CA3AF', fontSize:'11px' }}>· {r.fecha}</span></span>
                  <span style={S.monto('var(--color-success)')}>{fmt(r.importe)}</span>
                </div>
              ))
            }
            {rentasEf.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background:'#F0FDF4', borderBottom:'1px solid #BBF7D0' }}>
                <span style={{ fontSize:'12px', fontWeight:700, color:'var(--color-success)' }}>Total rentas</span>
                <span style={S.monto('var(--color-success)')}>{fmt(totRentas)}</span>
              </div>
            )}

            {/* ── AGUA EN EFECTIVO ── */}
            <div style={{ ...S.sectionHeader, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>💧 Agua cobrada en efectivo</span>
              <button onClick={() => setModal('agua')} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'#0284C7', border:'none', borderRadius:'5px', color:'white', fontSize:'10px', fontWeight:700, cursor:'pointer' }}>
                <Plus size={10}/> Nueva
              </button>
            </div>
            {aguaEf.length === 0
              ? <div style={{ padding:'8px 12px', color:'#9CA3AF', fontSize:'12px' }}>Sin cobros de agua esta semana</div>
              : aguaEf.map((r, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background: i%2===0?'white':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                  <span style={S.lbl}>{r.propietario ? `${r.propietario}${r.id_contrato?' · '+r.id_contrato:''}` : (r.concepto_origen||'Agua')} <span style={{ color:'#9CA3AF', fontSize:'11px' }}>· {r.fecha}</span></span>
                  <span style={{ ...S.monto(), color:'#0284C7' }}>{fmt(r.importe)}</span>
                </div>
              ))
            }
            {aguaEf.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background:'#F0F9FF', borderBottom:'1px solid #BAE6FD' }}>
                <span style={{ fontSize:'12px', fontWeight:700, color:'#0284C7' }}>Total agua</span>
                <span style={{ ...S.monto(), color:'#0284C7' }}>{fmt(totAgua)}</span>
              </div>
            )}

            {/* ── OTROS INGRESOS EFECTIVO ── */}
            {otrosEf.length > 0 && (
              <>
                <div style={S.sectionHeader}>Otros ingresos en efectivo</div>
                {otrosEf.map((r, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background: i%2===0?'white':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                    <span style={S.lbl}>{r.tipo} · {r.concepto_origen || r.propietario || '—'} <span style={{ color:'#9CA3AF', fontSize:'11px' }}>· {r.fecha}</span></span>
                    <span style={S.monto('#374151')}>{fmt(r.importe)}</span>
                  </div>
                ))}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', padding:'6px 12px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#6B7280' }}>Total otros</span>
                  <span style={S.monto('#6B7280')}>{fmt(totOtros)}</span>
                </div>
              </>
            )}

            {/* ── TOTAL EFECTIVO A ENTREGAR ── */}
            <div style={{ background: '#1A3C5E', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 0' }}>
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'white', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Efectivo a Entregar</span>
              <span style={{ fontWeight: 900, fontSize: '22px', color: '#E8A020', fontFamily: 'monospace' }}>{fmt(totalEfectivo)}</span>
            </div>

            {/* ── CÁLCULO FONDO ── */}
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '6px 14px', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: '12px', color: '#DC2626' }}>Gastos a comprobar Fondo Revolvente</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#DC2626', textAlign: 'right', fontFamily: 'monospace' }}>— {fmt(totGastosFondo)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '7px 14px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Diferencia</span>
                <span style={{ fontWeight: 800, fontSize: '14px', color: diferencia >= 0 ? '#16a34a' : '#DC2626', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(diferencia)}</span>
              </div>
              {residualVending > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', padding: '5px 14px' }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Residual Vending Machine</span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(residualVending)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              COLUMNA DERECHA — GASTOS FONDO REVOLVENTE
          ══════════════════════════════════════════════ */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
            <div style={{ ...S.panelTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🧾 Gastos a Comprobar — Fondo Revolvente</span>
              <button onClick={() => setModal('gasto')} style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'6px', color:'white', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
                <Plus size={12}/> Agregar Gasto
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                    {['Fecha','Gasto','Concepto','Importe','$$ Comprob.','Factura'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 8px', textAlign: i >= 3 ? 'right' : 'left', fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gastos.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>Sin gastos registrados esta semana</td></tr>
                  ) : gastos.map((g, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '6px 8px', color: '#6B7280', whiteSpace: 'nowrap' }}>{g.fecha ? g.fecha.slice(5).replace('-','/') : '—'}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.proveedor || '—'}</td>
                      <td style={{ padding: '6px 8px', color: '#374151', maxWidth: '120px' }}>{g.grupo_gasto || g.descripcion || '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(g.cantidad)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6B7280', fontFamily: 'monospace' }}>{g.monto_comprobante ? fmt(g.monto_comprobante) : ''}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {g.tiene_factura
                          ? <CheckCircle size={13} color="var(--color-success)" />
                          : <span style={{ fontSize: '10px', color: '#D1D5DB' }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#1A3C5E', borderTop: '2px solid #1A3C5E' }}>
                    <td colSpan={3} style={{ padding: '9px 8px', color: 'white', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                      Total Fondo Revolvente ({gastos.length} gastos)
                    </td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', color: '#E8A020', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace' }}>
                      {fmt(totGastosFondo)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance del Fondo */}
            <div style={{ padding: '14px', background: '#FFF8F0', borderTop: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wallet size={13} /> Balance Fondo Revolvente
              </div>
              {[
                ['Fondo entregado (base semanal)', 5000, '#374151'],
                ['Total gastado', totGastosFondo, '#DC2626'],
                ['Balance fondo', 5000 - totGastosFondo, 5000 - totGastosFondo >= 0 ? '#16a34a' : '#DC2626'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                  <span style={{ color: '#6B7280' }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontFamily: 'monospace' }}>{fmt(val)}</span>
                </div>
              ))}
            </div>

            {/* Resumen KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '1px', background: '#E5E7EB', borderTop: '2px solid #E5E7EB' }}>
              {[
                ['Estacionamiento', totEstac, '#0A66C2'],
                ['Pensiones', totPensiones, '#0A66C2'],
                ['Vending', totVending, '#0A66C2'],
                ['Rentas', totRentas, 'var(--color-success)'],
                ['Agua', totAgua, '#0284C7'],
                ['Otros', totOtros, '#6B7280'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: 'white', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color, fontFamily: 'monospace', textAlign: 'right' }}>{fmt(val)}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── MODALES DE CAPTURA RÁPIDA ── */}
      {modal === 'estac' && (
        <Modal titulo="➕ Ingreso Estacionamiento Diario" onClose={() => setModal(null)}>
          <ModalEstac semIni={semSel.ini} semFin={semSel.fin}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); recargar() }} />
        </Modal>
      )}
      {modal === 'gasto' && (
        <Modal titulo="🧾 Registrar Gasto — Fondo Revolvente" onClose={() => setModal(null)}>
          <ModalGasto semIni={semSel.ini} semFin={semSel.fin}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); recargar() }} />
        </Modal>
      )}
      {modal === 'pension' && (
        <Modal titulo="🚗 Nueva Pensión de Estacionamiento" onClose={() => setModal(null)}>
          <ModalPension semIni={semSel.ini} semFin={semSel.fin}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); recargar() }} />
        </Modal>
      )}
      {modal === 'renta' && (
        <Modal titulo="🏠 Registrar Renta en Efectivo" onClose={() => setModal(null)}>
          <ModalIngreso tipo="RENTA" semIni={semSel.ini} semFin={semSel.fin}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); recargar() }} />
        </Modal>
      )}
      {modal === 'agua' && (
        <Modal titulo="💧 Registrar Cobro de Agua en Efectivo" onClose={() => setModal(null)}>
          <ModalIngreso tipo="AGUA" semIni={semSel.ini} semFin={semSel.fin}
            onClose={() => setModal(null)}
            onSaved={() => { setModal(null); recargar() }} />
        </Modal>
      )}
    </div>
  )
}
