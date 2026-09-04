import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Plus, Edit3, Save, X, ChevronDown, BarChart2, FileText, RefreshCw } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt   = n => '$' + (parseFloat(n)||0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const pct   = (real, proy) => {
  if (!proy || proy === 0) return null
  return Math.round((real / proy) * 100)
}

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

// ── Fila de sección (subtotal) ────────────────────────────────────────────────
function SubRow({ label, proy, real, bold = false, highlight = false, indent = false, hideIf = false }) {
  if (hideIf) return null
  const p = parseFloat(proy) || 0
  const r = parseFloat(real) || 0
  const ratio = pct(r, p)
  const base = {
    display: 'grid', gridTemplateColumns: '260px 1fr 1fr 1fr 80px',
    gap: 0, padding: bold ? '10px 16px' : '7px 16px',
    background: highlight ? (r >= 0 ? '#F0FDF4' : '#FEF2F2') : bold ? '#F9FAFB' : 'transparent',
    borderTop: bold ? '2px solid #E5E7EB' : '1px solid #F3F4F6',
  }
  const numStyle = (n, isRed = false) => ({
    textAlign: 'right', fontSize: bold ? '13px' : '12px', fontWeight: bold ? 800 : 600,
    color: isRed ? (n < 0 ? '#B91C1C' : '#374151') : bold ? (n >= 0 ? '#057642' : '#B91C1C') : '#374151',
    padding: '0 16px 0 8px',
  })
  return (
    <div style={base}>
      <div style={{ fontSize: bold ? '13px' : '12px', fontWeight: bold ? 700 : 500,
        color: bold ? '#111827' : '#374151', paddingLeft: indent ? '28px' : '0',
        display: 'flex', alignItems: 'center' }}>
        {label}
      </div>
      <div style={numStyle(p)}>{ p !== 0 ? fmt(p) : '—' }</div>
      <div style={numStyle(r)}>{ r !== 0 ? fmt(r) : '—' }</div>
      <div style={{ padding:'0 8px', textAlign:'right' }} />
      <div style={{ textAlign:'center' }}><PctBadge value={ratio} /></div>
    </div>
  )
}

// ── Fila normal ───────────────────────────────────────────────────────────────
function PLRow({ label, proy, real, rentasMes, otrosPorcentaje, indent = false, isNeg = false }) {
  const p = parseFloat(proy) || 0
  const r = parseFloat(real) || 0
  const rm = parseFloat(rentasMes) || 0
  const op = parseFloat(otrosPorcentaje) || 0
  const ratio = pct(r, p)
  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 1fr 1fr 80px',
      gap:0, padding:'6px 16px', borderTop:'1px solid #F3F4F6',
      transition:'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ fontSize:'12px', color: isNeg ? '#B91C1C' : '#374151',
        paddingLeft: indent ? '20px' : '0', display:'flex', alignItems:'center' }}>
        {label}
      </div>
      <div style={{ textAlign:'right', fontSize:'12px', color: p < 0 ? '#B91C1C' : '#374151', padding:'0 16px 0 8px' }}>
        {p !== 0 ? fmt(p) : '—'}
      </div>
      <div style={{ textAlign:'right', fontSize:'12px', color: r < 0 ? '#B91C1C' : '#374151', padding:'0 16px 0 8px' }}>
        {r !== 0 ? fmt(r) : '—'}
      </div>
      <div style={{ textAlign:'right', fontSize:'11px', color:'#6B7280', padding:'0 8px' }}>
        {rm !== 0 && <span style={{ marginRight:'8px' }}>{fmt(rm)}</span>}
        {op !== 0 && <span>{fmt(op)}</span>}
      </div>
      <div style={{ textAlign:'center' }}><PctBadge value={ratio} /></div>
    </div>
  )
}

// ── Campo numérico para el formulario ─────────────────────────────────────────
function NumField({ label, field, values, onChange, readOnly = false, hint = '' }) {
  return (
    <div style={{ marginBottom:'10px' }}>
      <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', marginBottom:'3px' }}>
        {label} {hint && <span style={{ fontWeight:400, textTransform:'none', color:'#9CA3AF' }}>({hint})</span>}
      </label>
      <input
        type="number" step="0.01"
        value={values[field] ?? ''}
        onChange={e => onChange(field, e.target.value)}
        readOnly={readOnly}
        style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
          fontSize:'13px', fontWeight:600, textAlign:'right', background: readOnly ? '#F9FAFB' : 'white',
          color:'#111827', outline:'none', boxSizing:'border-box' }}
      />
    </div>
  )
}

// ── EDR Principal ─────────────────────────────────────────────────────────────
export default function EDR() {
  useModuleAudit('EDR')

  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [tab,  setTab]  = useState('tablero') // tablero | elaboracion

  const [registro, setRegistro]         = useState(null)  // er_mensual row
  const [form,     setForm]             = useState({})     // form values
  const [loading,  setLoading]          = useState(false)
  const [saving,   setSaving]           = useState(false)
  const [proyRentas, setProyRentas]     = useState(0)      // sum de contratos vigentes
  const [realRentas, setRealRentas]     = useState({ factura: 0, total: 0 }) // from ingresos
  const [proySueldos, setProySueldos]   = useState(0)      // from RH

  // ── Carga proyectado de contratos vigentes ────────────────────────────────
  const loadProyectado = useCallback(async () => {
    const { data } = await supabase
      .from('prp_contratos')
      .select('renta_mensual')
      .in('estatus', ['VIGENTE', 'vigente', 'Vigente'])
    if (data) setProyRentas(data.reduce((s, c) => s + (parseFloat(c.renta_mensual)||0), 0))
  }, [])

  // ── Carga real de ingresos del mes ────────────────────────────────────────
  const loadRealRentas = useCallback(async (m, a) => {
    const { data } = await supabase
      .from('ingresos')
      .select('importe, tipo, factura')
      .eq('mes', m).eq('anio', a).eq('tipo', 'RENTA')
    if (data) {
      const total   = data.reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      const factura = data.filter(r => r.factura).reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      setRealRentas({ factura, total })
    }
  }, [])

  // ── Carga sueldos proyectados de RH ──────────────────────────────────────
  const loadProySueldos = useCallback(async (m, a) => {
    // días del mes
    const dias = new Date(a, m, 0).getDate()
    const { data } = await supabase
      .from('empleados')
      .select('sueldo_diario, status')
      .eq('status', 'ACTIVO')
      .not('sueldo_diario', 'is', null)
    if (data) {
      const total = data.reduce((s, e) => s + ((parseFloat(e.sueldo_diario)||0) * dias), 0)
      setProySueldos(total)
    }
  }, [])

  // ── Carga registro er_mensual ─────────────────────────────────────────────
  const loadRegistro = useCallback(async (m, a) => {
    setLoading(true)
    const { data } = await supabase
      .from('er_mensual')
      .select('*')
      .eq('mes', m).eq('anio', a)
      .maybeSingle()
    setRegistro(data || null)
    setForm(data || {})
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProyectado()
  }, [loadProyectado])

  useEffect(() => {
    loadRegistro(mes, anio)
    loadRealRentas(mes, anio)
    loadProySueldos(mes, anio)
  }, [mes, anio, loadRegistro, loadRealRentas, loadProySueldos])

  // ── Crear nuevo registro para el mes ─────────────────────────────────────
  const handleNuevo = async () => {
    if (registro) { toast('Ya existe un registro para este mes'); return }
    setSaving(true)
    const payload = {
      anio, mes,
      proy_rentas_contratos: proyRentas,
      proy_sueldos: proySueldos,
      status: 'borrador',
    }
    const { data, error } = await supabase.from('er_mensual').insert(payload).select().single()
    if (error) { toast.error('Error al crear: ' + error.message); setSaving(false); return }
    setRegistro(data)
    setForm(data)
    setSaving(false)
    setTab('elaboracion')
    toast.success('Registro creado — completa los datos reales')
  }

  // ── Guardar cambios del formulario ────────────────────────────────────────
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

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value === '' ? null : parseFloat(value) || 0 }))

  // ── Calculos para el tablero ──────────────────────────────────────────────
  const r = registro || {}

  // Proyectado
  const pRentas     = parseFloat(r.proy_rentas_contratos) || proyRentas
  const pRestaurant = parseFloat(r.proy_restaurant) || 0
  const pVacantes   = -(Math.abs(parseFloat(r.proy_locales_vacantes) || 0))
  const pRentasBrutas = pRentas + pRestaurant + pVacantes
  const pIva        = -(Math.abs(parseFloat(r.proy_sueldos ? 0 : 0)))  // IVA no proyectado explícitamente
  const pIngNeto    = pRentasBrutas
  const pEstac      = parseFloat(r.proy_estacionamiento) || 0
  const pPensiones  = parseFloat(r.proy_pensiones) || 0
  const pMaquinita  = parseFloat(r.proy_maquinita) || 0
  const pAguaIng    = parseFloat(r.proy_agua_ingresos) || 0
  const pTotalIng   = pIngNeto + pEstac + pPensiones + pMaquinita + pAguaIng

  const pSueldos    = parseFloat(r.proy_sueldos) || proySueldos
  const pFondo      = parseFloat(r.proy_fondo_revolvente) || 0
  const pLuz        = parseFloat(r.proy_luz) || 0
  const pAguaG      = parseFloat(r.proy_agua_gastos) || 0
  const pOtros      = parseFloat(r.proy_otros_gastos) || 0
  const pTotalGastos = pSueldos + pFondo + pLuz + pAguaG + pOtros

  const pUtilidadBruta = pTotalIng - pTotalGastos

  const pPredial    = parseFloat(r.predial) || 0
  const pTransporte = parseFloat(r.transporte_residuos) || 0
  const pLicencia   = parseFloat(r.licencia_estacionamiento) || 0
  const pAnuncio    = parseFloat(r.anuncio_publicitario) || 0
  const pTotalImp   = pPredial + pTransporte + pLicencia + pAnuncio

  const pUtilidadNeta = pUtilidadBruta - pTotalImp

  // Real
  const rRentaFact  = parseFloat(r.real_rentas_factura)   ?? realRentas.factura
  const rRentaSin   = parseFloat(r.real_rentas_sin_factura) || 0
  const rPenaliz    = parseFloat(r.real_penalizaciones) || 0
  const rIva        = -(Math.abs(parseFloat(r.real_iva) || 0))
  const rRentasBrutas = rRentaFact + rRentaSin + rPenaliz
  const rIngNeto    = rRentasBrutas + rIva
  const rEstac      = parseFloat(r.real_estacionamiento) || 0
  const rPensiones  = parseFloat(r.real_pensiones) || 0
  const rMaquinita  = parseFloat(r.real_maquinita) || 0
  const rAguaIng    = parseFloat(r.real_agua_ingresos) || 0
  const rTotalIng   = rIngNeto + rEstac + rPensiones + rMaquinita + rAguaIng

  const rSueldos    = parseFloat(r.real_sueldos) || 0
  const rFondo      = parseFloat(r.real_fondo_revolvente) || 0
  const rExcedente  = parseFloat(r.real_gasto_excedente) || 0
  const rLuz        = parseFloat(r.real_luz) || 0
  const rAguaG      = parseFloat(r.real_agua_gastos) || 0
  const rOtros      = parseFloat(r.real_otros_gastos) || 0
  const rTotalGastos = rSueldos + rFondo + rExcedente + rLuz + rAguaG + rOtros

  const rUtilidadBruta = rTotalIng - rTotalGastos
  const rTotalImp      = pTotalImp // impuestos son fijos = proyectado
  const rUtilidadNeta  = rUtilidadBruta - rTotalImp

  const thStyle = { padding:'9px 16px', fontSize:'10px', fontWeight:700, color:'#6B7280',
    textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right', background:'#F9FAFB',
    borderBottom:'2px solid #E5E7EB' }

  return (
    <div style={{ padding:'24px', maxWidth:'1100px' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:700, margin:'0 0 3px', display:'flex', alignItems:'center', gap:'8px', color:'var(--color-text)' }}>
            <TrendingUp size={20} color="var(--color-primary)" /> Estado de Resultados
          </h1>
          <p style={{ fontSize:'12px', color:'var(--color-text-light)', margin:0 }}>
            Proyectado vs Real · IWOL Plaza Comercial
          </p>
        </div>

        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          {/* Año/Mes */}
          <select value={anio} onChange={e => setAnio(+e.target.value)}
            style={{ padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', fontWeight:600, color:'var(--color-primary)', background:'#EFF6FF' }}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(+e.target.value)}
            style={{ padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', fontWeight:600, color:'var(--color-primary)', background:'#EFF6FF' }}>
            {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>

          {!registro && (
            <button onClick={handleNuevo} disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
              <Plus size={15} /> Nuevo
            </button>
          )}
          {registro && tab === 'elaboracion' && (
            <button onClick={handleSave} disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'var(--color-success)', color:'white', border:'none', borderRadius:'8px', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
              <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:'0', marginBottom:'20px', borderBottom:'2px solid #E5E7EB' }}>
        {[
          { id:'tablero',      label:'Tablero', icon:<BarChart2 size={14} /> },
          { id:'elaboracion',  label:'En Elaboración', icon:<FileText size={14} /> },
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
          <div style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'20px' }}>
            Crea el registro mensual para capturar el Estado de Resultados
          </div>
          <button onClick={handleNuevo} disabled={saving}
            style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'10px 22px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontWeight:600, cursor:'pointer' }}>
            <Plus size={15} /> Crear registro {MESES[mes]} {anio}
          </button>
        </div>
      ) : tab === 'tablero' ? (

        /* ════════════════════════════════════════════════════════════
           TAB: TABLERO
           ════════════════════════════════════════════════════════════ */
        <div style={{ background:'white', borderRadius:'12px', border:'1px solid #E5E7EB', overflow:'hidden' }}>

          {/* Encabezado de columnas */}
          <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 1fr 1fr 80px', gap:0 }}>
            <div style={{ ...thStyle, textAlign:'left' }}>Concepto</div>
            <div style={thStyle}>Proyectado</div>
            <div style={thStyle}>Total Real</div>
            <div style={{ ...thStyle, fontSize:'9px' }}>Rentas Mes / Otros</div>
            <div style={thStyle}>vs Proy</div>
          </div>

          {/* ── SECCIÓN: RENTAS ── */}
          <div style={{ padding:'6px 16px 2px', background:'#EFF6FF', borderTop:'1px solid #DBEAFE' }}>
            <span style={{ fontSize:'10px', fontWeight:800, color:'#0A66C2', textTransform:'uppercase', letterSpacing:'0.06em' }}>Ingresos por Rentas</span>
          </div>

          <PLRow label="Rentas totales (contratos vigentes)"
            proy={pRentas} real={rRentaFact + rRentaSin} />
          {pRestaurant !== 0 && (
            <PLRow label="Restaurant / Ampliación" indent
              proy={pRestaurant} real={0} isNeg={pRestaurant < 0} />
          )}
          {pVacantes !== 0 && (
            <PLRow label="Locales vacantes (descuento)" indent isNeg
              proy={pVacantes} real={0} />
          )}

          <SubRow label="Rentas brutas" bold
            proy={pRentasBrutas} real={rRentaFact + rRentaSin} />

          <PLRow label="Rentas sin factura" indent
            proy={0} real={rRentaSin} />
          <PLRow label="Penalizaciones / Recargos" indent
            proy={0} real={rPenaliz} />
          <PLRow label="IVA retenido" indent isNeg
            proy={0} real={rIva} />

          <SubRow label="Ingresos Netos Renta" bold highlight
            proy={pIngNeto} real={rIngNeto} />

          {/* ── SECCIÓN: OTROS INGRESOS ── */}
          <div style={{ padding:'6px 16px 2px', background:'#F0FDF4', borderTop:'1px solid #BBF7D0' }}>
            <span style={{ fontSize:'10px', fontWeight:800, color:'#057642', textTransform:'uppercase', letterSpacing:'0.06em' }}>Otros Ingresos</span>
          </div>

          <PLRow label="Estacionamiento"  proy={pEstac}    real={rEstac}    />
          <PLRow label="Pensiones"         proy={pPensiones} real={rPensiones} />
          <PLRow label="Maquinita / Vending" proy={pMaquinita} real={rMaquinita} />
          <PLRow label="Agua (cobro)"      proy={pAguaIng}  real={rAguaIng}  />

          <SubRow label="Total Ingresos" bold highlight
            proy={pTotalIng} real={rTotalIng} />

          {/* ── SECCIÓN: GASTOS VARIABLES ── */}
          <div style={{ padding:'6px 16px 2px', background:'#FEF9C3', borderTop:'1px solid #FDE68A' }}>
            <span style={{ fontSize:'10px', fontWeight:800, color:'#92400E', textTransform:'uppercase', letterSpacing:'0.06em' }}>Gastos Variables</span>
          </div>

          <PLRow label="Sueldos" proy={pSueldos} real={rSueldos} />
          <PLRow label="Fondo Revolvente" proy={pFondo} real={rFondo} />
          {rExcedente !== 0 && <PLRow label="Gasto Excedente" indent proy={0} real={rExcedente} />}
          <PLRow label="Luz" proy={pLuz} real={rLuz} />
          <PLRow label="Agua (gasto)" proy={pAguaG} real={rAguaG} />
          <PLRow label="Otros" proy={pOtros} real={rOtros} />

          <SubRow label="Total Gastos Variables" bold
            proy={pTotalGastos} real={rTotalGastos} />

          {/* ── UTILIDAD BRUTA ── */}
          <SubRow label="Utilidad Bruta" bold highlight
            proy={pUtilidadBruta} real={rUtilidadBruta} />

          {/* ── SECCIÓN: IMPUESTOS/FIJOS ── */}
          <div style={{ padding:'6px 16px 2px', background:'#F5F3FF', borderTop:'1px solid #DDD6FE' }}>
            <span style={{ fontSize:'10px', fontWeight:800, color:'#6D28D9', textTransform:'uppercase', letterSpacing:'0.06em' }}>Impuestos y Gastos Fijos</span>
          </div>

          <PLRow label="Predial" proy={pPredial} real={pPredial} />
          <PLRow label="Transporte de Residuos Sólidos" proy={pTransporte} real={pTransporte} />
          <PLRow label="Licencia de Estacionamiento" proy={pLicencia} real={pLicencia} />
          <PLRow label="Anuncio Publicitario IWOL" proy={pAnuncio} real={pAnuncio} />

          <SubRow label="Total Impuestos" bold proy={pTotalImp} real={rTotalImp} />

          {/* ── UTILIDAD NETA ── */}
          <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 1fr 1fr 80px',
            gap:0, padding:'14px 16px',
            background: rUtilidadNeta >= 0 ? '#F0FDF4' : '#FEF2F2',
            borderTop:'3px solid ' + (rUtilidadNeta >= 0 ? '#057642' : '#B91C1C') }}>
            <div style={{ fontSize:'15px', fontWeight:900, color: rUtilidadNeta >= 0 ? '#057642' : '#B91C1C' }}>
              Utilidad Neta
            </div>
            <div style={{ textAlign:'right', fontSize:'15px', fontWeight:800, color:'#374151', padding:'0 16px 0 8px' }}>
              {fmt(pUtilidadNeta)}
            </div>
            <div style={{ textAlign:'right', fontSize:'15px', fontWeight:900,
              color: rUtilidadNeta >= 0 ? '#057642' : '#B91C1C', padding:'0 16px 0 8px' }}>
              {fmt(rUtilidadNeta)}
            </div>
            <div />
            <div style={{ textAlign:'center' }}>
              <PctBadge value={pct(rUtilidadNeta, pUtilidadNeta)} />
            </div>
          </div>

          {/* Status footer */}
          <div style={{ padding:'8px 16px', background:'#F9FAFB', borderTop:'1px solid #E5E7EB', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'11px', color:'#9CA3AF' }}>
              {MESES[mes]} {anio} · Actualizado: {registro?.updated_at ? new Date(registro.updated_at).toLocaleDateString('es-MX') : '—'}
            </span>
            <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'8px',
              background: registro?.status === 'cerrado' ? '#D1FAE5' : '#FEF3C7',
              color: registro?.status === 'cerrado' ? '#057642' : '#92400E' }}>
              {registro?.status === 'cerrado' ? 'CERRADO' : 'BORRADOR'}
            </span>
          </div>
        </div>

      ) : (

        /* ════════════════════════════════════════════════════════════
           TAB: EN ELABORACIÓN (CAPTURA)
           ════════════════════════════════════════════════════════════ */
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>

          {/* ── Col 1: Ingresos Proyectados ── */}
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #E5E7EB', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'#EFF6FF', borderBottom:'1px solid #DBEAFE' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#0A66C2' }}>Ingresos — Proyectado</div>
              <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'2px' }}>Se autocalcula de contratos vigentes</div>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <NumField label="Rentas contratos vigentes" field="proy_rentas_contratos"
                values={{ proy_rentas_contratos: form.proy_rentas_contratos ?? proyRentas }}
                onChange={setField} hint={`auto: ${fmt(proyRentas)}`} />
              <NumField label="Restaurant / Ampliación ($276 m²)" field="proy_restaurant"
                values={form} onChange={setField} hint="negativo si descuenta" />
              <NumField label="Locales vacantes (monto pérdida)" field="proy_locales_vacantes"
                values={form} onChange={setField} hint="positivo, se resta" />
              <NumField label="Estacionamiento proyectado" field="proy_estacionamiento" values={form} onChange={setField} />
              <NumField label="Pensiones proyectadas" field="proy_pensiones" values={form} onChange={setField} />
              <NumField label="Maquinita / Vending proyectado" field="proy_maquinita" values={form} onChange={setField} />
              <NumField label="Agua (cobro proyectado)" field="proy_agua_ingresos" values={form} onChange={setField} />
            </div>
          </div>

          {/* ── Col 2: Ingresos Reales ── */}
          <div style={{ background:'white', borderRadius:'10px', border:'1px solid #E5E7EB', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', background:'#F0FDF4', borderBottom:'1px solid #BBF7D0' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#057642' }}>Ingresos — Real</div>
              <div style={{ fontSize:'10px', color:'#6B7280', marginTop:'2px' }}>Valores del mes cobrados</div>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <NumField label="Rentas con factura" field="real_rentas_factura"
                values={{ real_rentas_factura: form.real_rentas_factura ?? realRentas.factura }}
                onChange={setField} hint={`de ingresos: ${fmt(realRentas.factura)}`} />
              <NumField label="Rentas sin factura" field="real_rentas_sin_factura" values={form} onChange={setField} />
              <NumField label="Penalizaciones / Recargos" field="real_penalizaciones" values={form} onChange={setField} />
              <NumField label="IVA retenido" field="real_iva" values={form} onChange={setField} hint="monto positivo, se resta" />
              <NumField label="Estacionamiento real" field="real_estacionamiento" values={form} onChange={setField} />
              <NumField label="Pensiones real" field="real_pensiones" values={form} onChange={setField} />
              <NumField label="Maquinita / Vending real" field="real_maquinita" values={form} onChange={setField} />
              <NumField label="Agua (cobro real)" field="real_agua_ingresos" values={form} onChange={setField} />
            </div>
          </div>

          {/* ── Col 3: Gastos + Fijos ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            <div style={{ background:'white', borderRadius:'10px', border:'1px solid #E5E7EB', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', background:'#FEF9C3', borderBottom:'1px solid #FDE68A' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#92400E' }}>Gastos Variables</div>
              </div>
              <div style={{ padding:'14px 16px' }}>
                <NumField label="Sueldos proyectado" field="proy_sueldos"
                  values={{ proy_sueldos: form.proy_sueldos ?? proySueldos }}
                  onChange={setField} hint={`RH: ${fmt(proySueldos)}`} />
                <NumField label="Sueldos real" field="real_sueldos" values={form} onChange={setField} />
                <NumField label="Fondo Revolvente proyectado" field="proy_fondo_revolvente" values={form} onChange={setField} />
                <NumField label="Fondo Revolvente real" field="real_fondo_revolvente" values={form} onChange={setField} />
                <NumField label="Gasto Excedente" field="real_gasto_excedente" values={form} onChange={setField} />
                <NumField label="Luz proyectada" field="proy_luz" values={form} onChange={setField} />
                <NumField label="Luz real" field="real_luz" values={form} onChange={setField} />
                <NumField label="Agua (gasto) proyectada" field="proy_agua_gastos" values={form} onChange={setField} />
                <NumField label="Agua (gasto) real" field="real_agua_gastos" values={form} onChange={setField} />
                <NumField label="Otros gastos proyectados" field="proy_otros_gastos" values={form} onChange={setField} />
                <NumField label="Otros gastos reales" field="real_otros_gastos" values={form} onChange={setField} />
              </div>
            </div>

            <div style={{ background:'white', borderRadius:'10px', border:'1px solid #E5E7EB', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', background:'#F5F3FF', borderBottom:'1px solid #DDD6FE' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color:'#6D28D9' }}>Impuestos y Gastos Fijos</div>
              </div>
              <div style={{ padding:'14px 16px' }}>
                <NumField label="Predial" field="predial" values={form} onChange={setField} />
                <NumField label="Transporte Residuos Sólidos" field="transporte_residuos" values={form} onChange={setField} />
                <NumField label="Licencia de Estacionamiento" field="licencia_estacionamiento" values={form} onChange={setField} />
                <NumField label="Anuncio Publicitario IWOL" field="anuncio_publicitario" values={form} onChange={setField} />
              </div>
            </div>

            {/* Cerrar mes */}
            {registro?.status !== 'cerrado' && (
              <button onClick={async () => {
                await supabase.from('er_mensual').update({ status:'cerrado' }).eq('id', registro.id)
                await loadRegistro(mes, anio)
                toast.success('Mes cerrado')
              }} style={{ padding:'10px', background:'#374151', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                Cerrar mes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
