import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Plus, Save, BarChart2, FileText, Printer } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { supabase } from '../lib/supabase'
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

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════════════════════ */
export default function EDR() {
  useModuleAudit('EDR')

  const now = new Date()
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes,  setMes]  = useState(now.getMonth() + 1)
  const [tab,  setTab]  = useState('tablero')

  const [registro,    setRegistro]    = useState(null)
  const [form,        setForm]        = useState({})
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [proyRentas,  setProyRentas]  = useState(0)
  const [realRentas,  setRealRentas]  = useState({ factura: 0, total: 0 })
  const [proySueldos, setProySueldos] = useState(0)

  const loadProyectado = useCallback(async () => {
    const { data } = await supabase
      .from('prp_contratos').select('renta_mensual')
      .in('estatus', ['VIGENTE','vigente','Vigente'])
    if (data) setProyRentas(data.reduce((s, c) => s + (parseFloat(c.renta_mensual)||0), 0))
  }, [])

  const loadRealRentas = useCallback(async (m, a) => {
    const { data } = await supabase.from('ingresos').select('importe, factura')
      .eq('mes', m).eq('anio', a).eq('tipo', 'RENTA')
    if (data) {
      const total   = data.reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      const factura = data.filter(r => r.factura).reduce((s, r) => s + (parseFloat(r.importe)||0), 0)
      setRealRentas({ factura, total })
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

  // Real (Total = Rentas Mes + Otros Periodos)
  const rRentaFact = parseFloat(r.real_rentas_factura)    ?? realRentas.factura
  const rRentaSin  = parseFloat(r.real_rentas_sin_factura) || 0
  const rPenaliz   = parseFloat(r.real_penalizaciones) || 0
  const rIva       = -(Math.abs(parseFloat(r.real_iva) || 0))
  const rRentasBrutas = rRentaFact + rRentaSin + rPenaliz
  // Para Rentas Mes vs Otros: usamos renta factura como "del mes" y sin factura como "otros"
  const rmRentasBrutas = rRentaFact       // rentas mes
  const opRentasBrutas = rRentaSin + rPenaliz  // otros
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
      {/* Print CSS */}
      <style>{`
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
            {registro && tab === 'elaboracion' && (
              <button onClick={handleSave} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', background:'var(--color-success)', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
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
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>

            {/* Col 1: Ingresos Proyectado */}
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

            {/* Col 2: Ingresos Real */}
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

            {/* Col 3: Gastos + Fijos + Notas */}
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

              {/* Notas */}
              <div style={{ background:'white', borderRadius:'10px', border:'1px solid #E5E7EB', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#374151' }}>Notas del mes</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <textarea
                    value={form.notas ?? ''}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                    rows={4}
                    placeholder="Observaciones, eventos especiales, ajustes..."
                    style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
                      fontSize:'13px', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', outline:'none' }}
                  />
                </div>
              </div>

              {/* Cerrar mes */}
              {registro?.status !== 'cerrado' && (
                <button onClick={async () => {
                  await supabase.from('er_mensual').update({ status:'cerrado' }).eq('id', registro.id)
                  await loadRegistro(mes, anio)
                  toast.success('Mes cerrado')
                }} style={{ padding:'10px', background:'#374151', color:'white', border:'none',
                  borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  Cerrar mes
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
