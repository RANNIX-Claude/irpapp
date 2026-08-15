import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useRef } from 'react'
import { DollarSign, Search, CheckCircle, Clock, AlertTriangle, TrendingUp, Download, X, ExternalLink, Plus, CreditCard, Trash2, Upload, FileText, AlertCircle } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ExpedienteModal from '../components/ui/ExpedienteModal'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

const MES_NOMBRES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n) { return '$' + (parseFloat(n)||0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const ESTATUS_COLOR = {
  PAGADO:    'var(--color-success)',
  PARCIAL:   '#7C3AED',
  PENDIENTE: 'var(--color-warning)',
  EN_MORA:   'var(--color-danger)',
  CANCELADO: '#9CA3AF',
}

function CobroRow({ c, onSelect, onExpediente }) {
  const vencida = !c.fecha_pago_real && c.estatus !== 'PAGADO' && c.estatus !== 'PARCIAL' && new Date(c.fecha_limite_pago) < new Date()
  const colorEstatus = vencida ? 'var(--color-danger)' : (ESTATUS_COLOR[c.estatus] || 'var(--color-warning)')
  const pct = c.monto_total > 0 ? Math.min(100, ((parseFloat(c.monto_pagado) || 0) / parseFloat(c.monto_total)) * 100) : 0

  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onSelect(c)}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{c.referencia_pago}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{MES_NOMBRES[c.mes]} {c.anio} · Pagaré #{c.pagare_numero}</div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <button
          onClick={e => { e.stopPropagation(); onExpediente(c) }}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          title="Ver expediente completo">
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {c.arrendatario_nombre}<ExternalLink size={11} />
          </div>
        </button>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre} · {c.unidad_numero}</div>
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{fmt(c.monto_total)}</div>
        {c.estatus === 'PARCIAL' && (
          <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>
            {fmt(c.monto_pagado)} pagado
          </div>
        )}
        {c.monto_mora > 0 && <div style={{ fontSize: '11px', color: 'var(--color-danger)' }}>+{fmt(c.monto_mora)} mora</div>}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '12px' }}>{c.fecha_limite_pago}</div>
      </td>
      <td style={{ padding: '12px 16px' }}>
        {c.fecha_pago_real
          ? <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>{c.fecha_pago_real}</div>
          : <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>—</div>}
      </td>
      <td style={{ padding: '12px 16px', minWidth: '120px' }}>
        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: colorEstatus + '20', color: colorEstatus, marginBottom: '4px' }}>
          {c.estatus}
        </span>
        {c.estatus === 'PARCIAL' && (
          <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#7C3AED', borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>
        )}
      </td>
    </tr>
  )
}

const TIPO_CONCEPTO_META = {
  RENTA:      { label: 'Renta',    color: 'var(--color-primary)',  icon: CreditCard },
  SANCION:    { label: 'Sanción',  color: 'var(--color-danger)',   icon: AlertCircle },
  RECARGO:    { label: 'Recargo',  color: '#D97706',               icon: AlertTriangle },
  CUOTA_MANT: { label: 'Mant.',   color: '#6B7280',               icon: DollarSign },
  OTRO:       { label: 'Otro',     color: '#9CA3AF',               icon: DollarSign },
}

// ── Badge tipo concepto ───────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const meta = TIPO_CONCEPTO_META[tipo] || TIPO_CONCEPTO_META.OTRO
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, color: meta.color, background: meta.color + '18', padding: '2px 7px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
      {meta.label}
    </span>
  )
}

// ── Fila de ingreso en historial ─────────────────────────────────────
function IngresoRow({ p, idx, total, onEliminar, onSubirFactura, subiendoFactura }) {
  const pdfRef = useRef()
  const xmlRef = useRef()
  const meta = TIPO_CONCEPTO_META[p.tipo_concepto] || TIPO_CONCEPTO_META.OTRO

  return (
    <div style={{ padding: '12px 0', borderBottom: idx < total - 1 ? '1px solid #F3F4F6' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icono */}
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <meta.icon size={15} color={meta.color} />
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: meta.color }}>{fmt(p.importe)}</span>
              <TipoBadge tipo={p.tipo_concepto} />
              {p.factura_numero && (
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: '10px', fontFamily: 'monospace' }}>
                  Fact. {p.factura_serie || ''}{p.factura_numero}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{p.fecha}</span>
              <button onClick={() => onEliminar(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: '2px' }} title="Eliminar">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>
            {p.origen}{p.concepto_origen ? ` · ${p.concepto_origen}` : ''}
            {p.nota && <span style={{ fontStyle: 'italic' }}> — {p.nota}</span>}
          </div>
          {/* Documentos CFDI */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {p.factura_pdf_url
              ? <a href={p.factura_pdf_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-danger)', fontWeight: 600, textDecoration: 'none', background: '#FEE2E2', padding: '3px 8px', borderRadius: '6px' }}>
                  <FileText size={11} /> PDF
                </a>
              : <button onClick={() => pdfRef.current?.click()} disabled={subiendoFactura === p.id + '_pdf'}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9CA3AF', background: '#F3F4F6', border: '1px dashed #D1D5DB', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <Upload size={11} /> {subiendoFactura === p.id + '_pdf' ? 'Subiendo…' : 'PDF factura'}
                </button>
            }
            {p.factura_xml_url
              ? <a href={p.factura_xml_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-success)', fontWeight: 600, textDecoration: 'none', background: '#D1FAE5', padding: '3px 8px', borderRadius: '6px' }}>
                  <FileText size={11} /> XML
                </a>
              : <button onClick={() => xmlRef.current?.click()} disabled={subiendoFactura === p.id + '_xml'}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9CA3AF', background: '#F3F4F6', border: '1px dashed #D1D5DB', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <Upload size={11} /> {subiendoFactura === p.id + '_xml' ? 'Subiendo…' : 'XML CFDI'}
                </button>
            }
            <input ref={pdfRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => onSubirFactura(p.id, 'pdf', e.target.files?.[0])} />
            <input ref={xmlRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={e => onSubirFactura(p.id, 'xml', e.target.files?.[0])} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal de pagos: historial + agregar nuevo ─────────────────────────
function PagosModal({ cobro, onClose, onSaved }) {
  const [ingresos, setIngresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subiendoFactura, setSubiendoFactura] = useState(null) // 'id_pdf' | 'id_xml'

  const FORM_INIT = {
    tipo_concepto: 'RENTA',
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: '',
    forma_pago: 'TRANSFERENCIA',
    referencia: '',
    factura_numero: '',
    factura_serie: '',
    nota: '',
  }
  const [form, setForm] = useState(FORM_INIT)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Solo ingresos tipo RENTA reducen el pendiente del cobro
  const totalRenta = ingresos.filter(p => p.tipo_concepto === 'RENTA' || !p.tipo_concepto).reduce((a, b) => a + (parseFloat(b.importe) || 0), 0)
  const totalSanciones = ingresos.filter(p => p.tipo_concepto !== 'RENTA' && p.tipo_concepto).reduce((a, b) => a + (parseFloat(b.importe) || 0), 0)
  const pendiente = Math.max(0, (parseFloat(cobro.monto_total) || 0) - totalRenta)
  const pct = cobro.monto_total > 0 ? Math.min(100, (totalRenta / parseFloat(cobro.monto_total)) * 100) : 0

  useEffect(() => { cargar() }, [cobro.id])

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ingresos')
      .select('id, fecha, importe, tipo_concepto, origen, concepto_origen, factura_numero, factura_serie, factura_pdf_url, factura_xml_url, nota, creado_por, created_at')
      .eq('cobro_id', cobro.id)
      .order('fecha', { ascending: false })
    setIngresos(data ?? [])
    setLoading(false)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) { setErr('El monto debe ser mayor a 0'); return }
    setSaving(true); setErr(null)
    try {
      const monto = parseFloat(form.monto)

      // 1. Insertar ingreso vinculado al cobro
      const { error: errIng } = await supabase.from('ingresos').insert({
        cobro_id:        cobro.id,
        fecha:           form.fecha_pago,
        importe:         monto,
        tipo:            form.tipo_concepto === 'RENTA' ? 'RENTA' : 'SANCION',
        tipo_concepto:   form.tipo_concepto,
        origen:          form.forma_pago === 'EFECTIVO' ? 'EFECTIVO' : 'TRANSFERENCIA BBVA',
        forma_pago:      form.forma_pago,
        referencia_banco: form.referencia || null,
        concepto_origen: `${form.tipo_concepto} ${cobro.mes}/${cobro.anio}`,
        propietario:     cobro.arrendatario_nombre || null,
        id_contrato:     cobro.referencia_pago || null,
        factura_numero:  form.factura_numero || null,
        factura_serie:   form.factura_serie  || null,
        nota:            form.nota || null,
      })
      if (errIng) throw errIng

      // 2. Recalcular estatus del cobro (solo pagos RENTA reducen el pendiente)
      if (form.tipo_concepto === 'RENTA') {
        const nuevoPagado = totalRenta + monto
        const nuevoEstatus = nuevoPagado >= parseFloat(cobro.monto_total)
          ? 'PAGADO'
          : nuevoPagado > 0 ? 'PARCIAL' : 'PENDIENTE'
        await supabase.from('cobros').update({
          monto_pagado: nuevoPagado,
          estatus:      nuevoEstatus,
          fecha_pago:   form.fecha_pago,
        }).eq('id', cobro.id)
      }

      setShowForm(false)
      setForm(FORM_INIT)
      await cargar()
      onSaved()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const eliminar = async (ingresoId) => {
    if (!window.confirm('¿Eliminar este movimiento? El estatus del cobro se recalculará.')) return
    const { error } = await supabase.from('ingresos').delete().eq('id', ingresoId)
    if (error) { alert(error.message); return }
    await cargar(); onSaved()
  }

  const subirFactura = async (ingresoId, tipo, file) => {
    if (!file) return
    const key = `${ingresoId}_${tipo}`
    setSubiendoFactura(key)
    const ext = tipo === 'pdf' ? 'pdf' : 'xml'
    const path = `facturas-cfdi/${cobro.referencia_pago}/${ingresoId}/${tipo}.${ext}`
    const { error: upErr } = await supabase.storage.from('facturas-cfdi').upload(path, file, { upsert: true })
    if (upErr) { alert('Error al subir: ' + upErr.message); setSubiendoFactura(null); return }
    const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
    const col = tipo === 'pdf' ? 'factura_pdf_url' : 'factura_xml_url'
    await supabase.from('ingresos').update({ [col]: urlData.publicUrl }).eq('id', ingresoId)
    setSubiendoFactura(null)
    await cargar()
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }
  const colorEst = ESTATUS_COLOR[cobro.estatus] || 'var(--color-warning)'
  const esSancion = form.tipo_concepto !== 'RENTA'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Movimientos del cobro</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'monospace', marginTop: '2px' }}>{cobro.referencia_pago}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '2px' }}>{cobro.arrendatario_nombre} · {MES_NOMBRES[cobro.mes]} {cobro.anio}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        {/* Barra de progreso renta */}
        <div style={{ padding: '14px 22px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 600 }}>Renta programada</span>
            <span style={{ fontSize: '14px', fontWeight: 800 }}>{fmt(cobro.monto_total)}</span>
          </div>
          <div style={{ height: '7px', background: '#E5E7EB', borderRadius: '8px', overflow: 'hidden', marginBottom: '5px' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: '8px', transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)', fontWeight: 700 }}>
              Renta cobrada: {fmt(totalRenta)} ({pct.toFixed(0)}%)
            </span>
            {pendiente > 0
              ? <span style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 700 }}>Pendiente: {fmt(pendiente)}</span>
              : <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700 }}>✓ Liquidado</span>
            }
          </div>
          {totalSanciones > 0 && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-danger)', fontWeight: 600 }}>
              + Sanciones/Recargos cobrados: {fmt(totalSanciones)}
            </div>
          )}
        </div>

        {/* Historial */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 22px' }}>
          {loading
            ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-light)' }}>Cargando movimientos...</div>
            : ingresos.length === 0
              ? <div style={{ textAlign: 'center', padding: '28px', color: 'var(--color-text-light)', fontSize: '13px' }}>Sin movimientos registrados</div>
              : ingresos.map((p, i) => (
                  <IngresoRow
                    key={p.id} p={p} idx={i} total={ingresos.length}
                    onEliminar={eliminar}
                    onSubirFactura={subirFactura}
                    subiendoFactura={subiendoFactura}
                  />
                ))
          }
        </div>

        {/* Formulario nuevo movimiento — compacto */}
        {showForm && (
          <div style={{ padding: '10px 18px 12px', borderTop: '1px solid #E5E7EB', background: esSancion ? '#FFF8F0' : '#F9FAFB' }}>
            <form onSubmit={guardar}>
              {err && <div style={{ padding: '6px 10px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '12px', marginBottom: '8px' }}>{err}</div>}

              {/* Fila 1: tipo */}
              <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginRight: '4px', whiteSpace:'nowrap' }}>Tipo:</span>
                {[['RENTA','Renta'],['SANCION','Sanción'],['RECARGO','Recargo'],['CUOTA_MANT','Mant.']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('tipo_concepto', v)} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${(TIPO_CONCEPTO_META[v]||{}).color || '#E5E7EB'}`,
                    background: form.tipo_concepto === v ? (TIPO_CONCEPTO_META[v]?.color || '#E5E7EB') : 'white',
                    color: form.tipo_concepto === v ? 'white' : (TIPO_CONCEPTO_META[v]?.color || '#6B7280'),
                  }}>{l}</button>
                ))}
              </div>

              {/* Fila 2: fecha + monto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} style={inp} required /></div>
                <div><label style={lbl}>Monto *</label><input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder={!esSancion && pendiente > 0 ? String(pendiente) : '0.00'} style={{ ...inp, fontWeight: 700 }} step="0.01" required autoFocus /></div>
              </div>

              {/* Fila 3: forma + ref */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={lbl}>Forma de pago</label>
                  <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)} style={inp}>
                    {['TRANSFERENCIA','DEPOSITO','EFECTIVO','CHEQUE'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Ref. bancaria / No. Op.</label><input type="text" value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="TRF20260801..." style={inp} /></div>
              </div>

              {/* Fila 4: CFDI + Nota en una sola línea */}
              <div style={{ display: 'grid', gridTemplateColumns: '60px 120px 1fr', gap: '8px', marginBottom: '10px' }}>
                <div><label style={lbl}>Serie</label><input type="text" value={form.factura_serie} onChange={e => set('factura_serie', e.target.value)} placeholder="A" style={inp} /></div>
                <div><label style={lbl}>Folio CFDI</label><input type="text" value={form.factura_numero} onChange={e => set('factura_numero', e.target.value)} placeholder="2151" style={inp} /></div>
                <div><label style={lbl}>Nota</label><input type="text" value={form.nota} onChange={e => set('nota', e.target.value)} placeholder="Observaciones..." style={inp} /></div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: saving ? '#9CA3AF' : esSancion ? 'var(--color-danger)' : 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? 'Guardando...' : esSancion ? '⚠ Registrar sanción' : '✓ Confirmar pago'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setErr(null); setForm(FORM_INIT) }} style={{ padding: '10px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        {!showForm && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: colorEst + '20', color: colorEst }}>{cobro.estatus}</span>
            <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              <Plus size={14} /> Agregar movimiento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


export default function Cobranza() {
  useModuleAudit('COBRANZA')
  const [search, setSearch] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('Todos')
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1)
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState(null)
  const [expedienteData, setExpedienteData] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const abrirExpediente = (c) => {
    setExpedienteData({
      id: c.arrendatario_id,
      nombre_completo: c.arrendatario_nombre,
      rfc: c.arrendatario_rfc,
      telefono: c.arrendatario_telefono,
      inmueble_nombre: c.inmueble_nombre,
      numero_local: c.unidad_numero,
    })
  }

  const { data, loading } = usePRP('prp_cobros', {
    order: { col: 'fecha_limite_pago', asc: true },
  })

  const lista = data ?? []

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.arrendatario_nombre || '').toLowerCase().includes(q)
      || (c.referencia_pago || '').toLowerCase().includes(q)
      || (c.unidad_numero || '').toLowerCase().includes(q)
    const matchEst = filtroEstatus === 'Todos' || c.estatus === filtroEstatus
    const matchMes = mesFiltro === 0 || (c.mes === mesFiltro && c.anio === anioFiltro)
    return matchQ && matchEst && matchMes
  })

  const pagados = lista.filter(c => c.estatus === 'PAGADO').length
  const pendientes = lista.filter(c => c.estatus === 'PENDIENTE').length
  const mora = lista.filter(c => c.estatus === 'EN_MORA').length
  const totalCobrado = lista.filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalPendiente = lista.filter(c => c.estatus !== 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Cobranza y Conciliación</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{lista.length} cobros programados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Pagados" value={pagados} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Pendientes" value={pendientes} icon={Clock} color="var(--color-warning)" />
        <KPICard title="En Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Total Cobrado" value={`$${(totalCobrado/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
        <KPICard title="Por Cobrar" value={`$${(totalPendiente/1000).toFixed(0)}K`} icon={DollarSign} color="var(--color-secondary)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar arrendatario, referencia, unidad..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>
        <select value={mesFiltro} onChange={e => setMesFiltro(parseInt(e.target.value))}
          style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}>
          <option value={0}>Todos los meses</option>
          {MES_NOMBRES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m} {anioFiltro}</option>)}
        </select>
        <select value={anioFiltro} onChange={e => setAnioFiltro(parseInt(e.target.value))}
          style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}>
          {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['Todos', 'PENDIENTE', 'PAGADO', 'EN_MORA'].map(e => (
            <button key={e} onClick={() => setFiltroEstatus(e)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroEstatus === e ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroEstatus === e ? 'var(--color-primary)' : 'white',
              color: filtroEstatus === e ? 'white' : 'var(--color-text-light)',
            }}>{e}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
          : filtrados.length === 0
          ? <EmptyState title="Sin cobros" description="No hay cobros que coincidan con los filtros." />
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Referencia', 'Arrendatario', 'Total', 'Vence', 'Pagado', 'Estatus'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Total' ? 'right' : 'left', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c => <CobroRow key={c.id} c={c} onSelect={setSelected} onExpediente={abrirExpediente} />)}
                </tbody>
              </table>
            </div>
        }
      </div>

      {selected && (
        <PagosModal cobro={selected} onClose={() => setSelected(null)} onSaved={() => setRefreshKey(k => k + 1)} />
      )}
      {expedienteData && (
        <ExpedienteModal
          entidad={expedienteData}
          entidadTipo="ARRENDATARIO"
          titulo={`Expediente — ${expedienteData.nombre_completo}`}
          onClose={() => setExpedienteData(null)}
        />
      )}
    </div>
  )
}
