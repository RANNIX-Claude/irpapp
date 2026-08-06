import { useModuleAudit } from '../hooks/useAudit'
import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Clock, Search, RefreshCw, FileText, X, Zap, RotateCcw } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function fmt(n) {
  return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
}

const ESTATUS_STYLE = {
  PAGADO:    { bg: '#D1FAE5', color: '#057642' },
  PENDIENTE: { bg: '#FEF3C7', color: '#D97706' },
  EN_MORA:   { bg: '#FEE2E2', color: '#B24020' },
  VENCIDO:   { bg: '#FEE2E2', color: '#B24020' },
}

function EstatusBadge({ estatus }) {
  const s = ESTATUS_STYLE[estatus] || { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color }}>
      {estatus}
    </span>
  )
}

function PalomearModal({ cobro, onClose, onSaved }) {
  const [form, setForm] = useState({
    fecha_pago_real: new Date().toISOString().split('T')[0],
    monto_pagado: cobro.monto_total,
    forma_pago: 'TRANSFERENCIA',
    numero_operacion_banco: cobro.banco_monto ? cobro.referencia_banco : '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      const { error } = await supabase.from('cobros_programados').update({
        estatus: 'PAGADO',
        conciliado: true,
        fecha_pago_real: form.fecha_pago_real,
        monto_pagado: parseFloat(form.monto_pagado),
        forma_pago: form.forma_pago,
        numero_operacion_banco: form.numero_operacion_banco || null,
      }).eq('id', cobro.id)
      if (error) throw error
      onSaved(); onClose()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const FORMAS = ['TRANSFERENCIA', 'DEPOSITO', 'CHEQUE', 'EFECTIVO', 'TARJETA', 'OTRO']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '440px', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800 }}>Registrar Pago</h2>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>{cobro.referencia_pago}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>
              {cobro.arrendatario_nombre} · {cobro.unidad_numero} · {cobro.mes}/{cobro.anio}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><X size={18} /></button>
        </div>

        {cobro.banco_monto && (
          <div style={{ margin: '16px 24px 0', padding: '12px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>🏦 Movimiento bancario detectado</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
              {cobro.banco_fecha} · {fmt(cobro.banco_monto)} · {cobro.banco_descripcion?.substring(0,40)}
            </div>
          </div>
        )}

        <form onSubmit={guardar} style={{ padding: '20px 24px', display: 'grid', gap: '14px' }}>
          {err && <div style={{ padding: '10px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>Fecha pago</label>
              <input type="date" value={form.fecha_pago_real} onChange={e => set('fecha_pago_real', e.target.value)} style={inp} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>Monto</label>
              <input type="number" value={form.monto_pagado} onChange={e => set('monto_pagado', e.target.value)} style={inp} step="0.01" required />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>Forma de pago</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FORMAS.map(f => (
                <button key={f} type="button" onClick={() => set('forma_pago', f)} style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  borderColor: form.forma_pago === f ? 'var(--color-primary)' : '#E5E7EB',
                  background: form.forma_pago === f ? 'var(--color-primary)' : 'white',
                  color: form.forma_pago === f ? 'white' : 'var(--color-text-light)',
                }}>{f}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '5px' }}>No. Operación / Referencia banco</label>
            <input value={form.numero_operacion_banco} onChange={e => set('numero_operacion_banco', e.target.value)} placeholder="Folio, referencia o confirmación" style={inp} />
          </div>
          <button type="submit" disabled={saving} style={{
            padding: '13px', background: saving ? '#9CA3AF' : 'var(--color-success)',
            color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '15px', cursor: saving ? 'default' : 'pointer',
          }}>
            {saving ? 'Guardando...' : '✓ Confirmar Pago'}
          </button>
        </form>
      </div>
    </div>
  )
}

function CobroRow({ c, onPalomear }) {
  const conciliado = c.estatus === 'PAGADO'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{c.referencia_pago}</span>
          {c.banco_monto && !conciliado && (
            <span title="Movimiento bancario detectado" style={{ fontSize: '16px' }}>🏦</span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
          {c.arrendatario_nombre} · {c.unidad_numero} · {c.mes}/{c.anio}
        </div>
        {c.fecha_pago_real && (
          <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px' }}>
            Pagado {c.fecha_pago_real} {c.forma_pago ? `· ${c.forma_pago}` : ''}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 800, fontSize: '14px' }}>{fmt(c.monto_total)}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>vence {c.fecha_limite_pago}</div>
      </div>
      <EstatusBadge estatus={c.estatus} />
      {!conciliado && (
        <button onClick={() => onPalomear(c)} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px',
          padding: '7px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          <CheckCircle size={13} /> Palomear
        </button>
      )}
      {conciliado && <div style={{ width: '90px' }} />}
    </div>
  )
}

// Parser simple de CSV BBVA (formato estándar descarga web)
function parseBBVAcsv(text) {
  const lines = text.trim().split('\n')
  const movs = []
  // Buscar líneas con fecha (DD/MM/YYYY) y monto
  const reDate = /\d{2}\/\d{2}\/\d{4}/
  for (const line of lines) {
    if (!reDate.test(line)) continue
    const parts = line.split(/[,;]/).map(p => p.trim().replace(/^"|"$/g,''))
    if (parts.length < 3) continue
    const fecha = parts.find(p => reDate.test(p))
    const montos = parts.filter(p => /^-?\d[\d,.]+$/.test(p.replace(/\s/,'')))
    if (!fecha || !montos.length) continue
    // El último monto suele ser el saldo; tomamos el anterior
    const montoStr = montos[montos.length > 1 ? montos.length - 2 : 0]?.replace(/,/g,'')
    const monto = parseFloat(montoStr)
    if (!monto) continue
    const desc = parts.filter(p => !reDate.test(p) && !/^-?\d[\d,.]+$/.test(p.replace(/\s/,'')) && p.length > 2).join(' ')
    movs.push({ fecha: fecha.split('/').reverse().join('-'), descripcion: desc, monto: Math.abs(monto), tipo: monto > 0 ? 'ABONO' : 'CARGO' })
  }
  return movs
}

// ── Modal preview de conciliación automática ──────────────────────────────────
function ConciliarModal({ matches, onClose, onAplicar }) {
  const [aplicando, setAplicando] = useState(false)
  const total = matches.reduce((a, b) => a + b.banco.monto, 0)

  const aplicar = async () => {
    setAplicando(true)
    let ok = 0
    for (const m of matches) {
      const { error } = await supabase.from('cobros_programados').update({
        estatus: 'PAGADO',
        conciliado: true,
        fecha_pago_real: m.banco.fecha,
        monto_pagado: m.banco.monto,
        forma_pago: 'TRANSFERENCIA',
        numero_operacion_banco: m.banco.descripcion?.substring(0, 120) || null,
      }).eq('id', m.cobro.id)
      if (!error) ok++
    }
    setAplicando(false)
    toast.success(`${ok} de ${matches.length} cobros conciliados`)
    onAplicar()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '600px', maxWidth: '95vw', maxHeight: '88vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#E8A020" /> Conciliación automática
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{matches.length} coincidencias detectadas · {fmt(total)} total</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 24px' }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-success)', fontWeight: 600 }}>
            Se marcará cada cobro como PAGADO con la fecha, monto y referencia del banco. Esta acción se puede deshacer con "Desmarcar".
          </div>

          {matches.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', marginBottom: '3px' }}>COBRO EN SISTEMA</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>{m.cobro.referencia_pago}</div>
                <div style={{ color: 'var(--color-text-light)', marginTop: '2px' }}>{m.cobro.arrendatario_nombre}</div>
                <div style={{ fontWeight: 700 }}>{fmt(m.cobro.monto_total)}</div>
              </div>
              <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '3px' }}>MOVIMIENTO BBVA</div>
                <div style={{ color: 'var(--color-text-light)' }}>{m.banco.fecha}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.banco.descripcion}</div>
                <div style={{ fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>{fmt(m.banco.monto)}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '10px', position: 'sticky', bottom: 0, background: 'white' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
          <button onClick={aplicar} disabled={aplicando} style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '8px', background: 'var(--color-success)', color: 'white', cursor: aplicando ? 'default' : 'pointer', fontSize: '14px', fontWeight: 800, opacity: aplicando ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {aplicando ? 'Aplicando...' : <><Zap size={16} /> Aplicar {matches.length} conciliaciones</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Conciliacion() {
  useModuleAudit('CONCILIACION')
  const [search, setSearch] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroEst, setFiltroEst] = useState('PENDIENTE')
  const [palomear, setPalomear] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [csvMovs, setCsvMovs] = useState([])
  const [csvErr, setCsvErr] = useState(null)
  const [conciliarModal, setConciliarModal] = useState(null)
  const [desmarcando, setDesmarcando] = useState(false)
  const fileRef = useRef()

  const { data, loading, refresh } = usePRP('prp_conciliacion_cobros', {
    order: { col: 'fecha_limite_pago', asc: true },
    refreshKey,
  })

  const lista = (data ?? []).filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.referencia_pago || '').toLowerCase().includes(q) || (c.arrendatario_nombre || '').toLowerCase().includes(q)
    const matchMes = !filtroMes || `${c.anio}-${String(c.mes).padStart(2,'0')}` === filtroMes
    const matchEst = filtroEst === 'Todos' || c.estatus === filtroEst
    return matchQ && matchMes && matchEst
  })

  const pagados = (data ?? []).filter(c => c.estatus === 'PAGADO').length
  const pendientes = (data ?? []).filter(c => c.estatus === 'PENDIENTE').length
  const mora = (data ?? []).filter(c => ['EN_MORA','VENCIDO'].includes(c.estatus)).length
  const totalCobrado = (data ?? []).filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)

  const handleCSV = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setCsvErr(null); setCsvMovs([])
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const movs = parseBBVAcsv(ev.target.result)
        if (!movs.length) { setCsvErr('No se detectaron movimientos. Verifica que sea el CSV de descarga BBVA.'); return }
        setCsvMovs(movs)
      } catch (err) { setCsvErr('Error al leer el archivo: ' + err.message) }
    }
    reader.readAsText(file, 'latin1')
    // reset input so same file can be re-uploaded
    e.target.value = ''
  }

  // Cruzar CSV contra cartera: buscar CP-YYYY-MM-LXX en descripción del movimiento
  const calcularMatches = () => {
    const reRef = /CP-\d{4}-\d{2}-L\d+/i
    const pendientesList = (data ?? []).filter(c => c.estatus !== 'PAGADO')
    const matches = []
    for (const mov of csvMovs) {
      if (mov.tipo !== 'ABONO') continue
      const match = mov.descripcion?.match(reRef)
      if (!match) continue
      const ref = match[0].toUpperCase()
      const cobro = pendientesList.find(c => c.referencia_pago?.toUpperCase() === ref)
      if (cobro) matches.push({ cobro, banco: mov })
    }
    return matches
  }

  const handleAutoMatch = () => {
    const matches = calcularMatches()
    if (!matches.length) {
      toast.error('No se encontraron coincidencias entre el CSV y los cobros pendientes.')
      return
    }
    setConciliarModal(matches)
  }

  // Desmarcar los cobros PAGADOS visibles (reset a PENDIENTE)
  const desmarcarGrupo = async () => {
    const pagadosVisibles = lista.filter(c => c.estatus === 'PAGADO')
    if (!pagadosVisibles.length) { toast.error('No hay cobros PAGADOS en la vista actual'); return }
    setDesmarcando(true)
    const ids = pagadosVisibles.map(c => c.id)
    const { error } = await supabase.from('cobros_programados').update({
      estatus: 'PENDIENTE',
      conciliado: false,
      fecha_pago_real: null,
      monto_pagado: null,
      forma_pago: null,
      numero_operacion_banco: null,
    }).in('id', ids)
    setDesmarcando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`${ids.length} cobros regresados a PENDIENTE`)
    setRefreshKey(k => k + 1)
  }

  const KPIBox = ({ label, value, color, sub, onClick }) => (
    <div onClick={onClick} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 900, color }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )

  // Coincidencias del CSV (para mostrar botón)
  const matchCount = csvMovs.length ? calcularMatches().length : 0

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Conciliación Bancaria</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Palomea pagos y concilia con extracto BBVA</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={desmarcarGrupo} disabled={desmarcando} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: 'white', color: 'var(--color-danger)', border: '1.5px solid var(--color-danger)',
            borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            opacity: desmarcando ? 0.6 : 1,
          }}>
            <RotateCcw size={14} /> {desmarcando ? 'Desmarcando...' : 'Desmarcar grupo'}
          </button>
          <button onClick={() => fileRef.current?.click()} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--color-primary)', color: 'white', border: 'none',
            borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>
            <Upload size={15} /> Cargar BBVA CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCSV} />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPIBox label="Pagados" value={pagados} color="var(--color-success)" onClick={() => setFiltroEst('PAGADO')} />
        <KPIBox label="Pendientes" value={pendientes} color="var(--color-warning)" onClick={() => setFiltroEst('PENDIENTE')} />
        <KPIBox label="En mora" value={mora} color="var(--color-danger)" onClick={() => setFiltroEst('EN_MORA')} />
        <KPIBox label="Total cobrado" value={fmt(totalCobrado)} color="var(--color-primary)" sub="mes actual" />
      </div>

      {/* CSV preview + botón de auto-conciliación */}
      {csvMovs.length > 0 && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary)' }}>
              🏦 {csvMovs.length} movimientos bancarios cargados
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {matchCount > 0 && (
                <button onClick={handleAutoMatch} style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  background: 'var(--color-success)', color: 'white', border: 'none',
                  borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}>
                  <Zap size={14} /> Aplicar {matchCount} coincidencias
                </button>
              )}
              <button onClick={() => setCsvMovs([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={16} /></button>
            </div>
          </div>
          {matchCount === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600, marginBottom: '10px' }}>
              ⚠️ No se detectaron referencias CP-XXXX en los movimientos. Verifica el formato del CSV.
            </div>
          )}
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {csvMovs.slice(0, 10).map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #BFDBFE' }}>
                <div><span style={{ color: 'var(--color-text-light)', marginRight: '8px' }}>{m.fecha}</span>{m.descripcion?.substring(0, 60)}</div>
                <div style={{ fontWeight: 700, color: m.tipo === 'ABONO' ? 'var(--color-success)' : 'var(--color-danger)', flexShrink: 0, marginLeft: '12px' }}>{fmt(m.monto)}</div>
              </div>
            ))}
            {csvMovs.length > 10 && <div style={{ fontSize: '12px', color: 'var(--color-text-light)', padding: '6px 0' }}>...y {csvMovs.length - 10} más</div>}
          </div>
        </div>
      )}
      {csvErr && <div style={{ padding: '12px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{csvErr}</div>}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por referencia o arrendatario..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }} />
        {['Todos', 'PENDIENTE', 'PAGADO', 'EN_MORA'].map(e => (
          <button key={e} onClick={() => setFiltroEst(e)} style={{
            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
            borderColor: filtroEst === e ? 'var(--color-primary)' : '#E5E7EB',
            background: filtroEst === e ? 'var(--color-primary)' : 'white',
            color: filtroEst === e ? 'white' : 'var(--color-text-light)',
          }}>{e}</button>
        ))}
        {lista.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{lista.length} registros</span>
        )}
      </div>

      {/* Tabla */}
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
        : lista.length === 0
          ? <EmptyState title="Sin cobros" description="No hay cobros que coincidan con el filtro aplicado." />
          : <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '0 20px' }}>
              {lista.map(c => <CobroRow key={c.id} c={c} onPalomear={setPalomear} />)}
            </div>
      }

      {palomear && (
        <PalomearModal cobro={palomear} onClose={() => setPalomear(null)} onSaved={() => setRefreshKey(k => k + 1)} />
      )}
      {conciliarModal && (
        <ConciliarModal
          matches={conciliarModal}
          onClose={() => setConciliarModal(null)}
          onAplicar={() => { setConciliarModal(null); setCsvMovs([]); setRefreshKey(k => k + 1); setFiltroEst('PAGADO') }}
        />
      )}
    </div>
  )
}
