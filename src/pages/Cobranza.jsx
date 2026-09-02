import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useRef } from 'react'
import { DollarSign, Search, CheckCircle, Clock, AlertTriangle, TrendingUp, Download, X, ExternalLink, Plus, CreditCard, Trash2, Upload, FileText, AlertCircle, BarChart2, Printer, Image } from 'lucide-react'
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
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>{c.unidad_numero || '—'}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre}</div>
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
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{MES_NOMBRES[c.mes]} {c.anio}</div>
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
function IngresoRow({ p, idx, total, onEliminar, onSubirFactura, subiendoFactura, onSubirComprobante }) {
  const pdfRef  = useRef()
  const xmlRef  = useRef()
  const compRef = useRef()
  const meta = TIPO_CONCEPTO_META[p.tipo_concepto] || TIPO_CONCEPTO_META.OTRO
  const [lightbox, setLightbox] = useState(null)

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

          {/* Comprobante de pago + Documentos CFDI */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Comprobante imagen */}
            {p.comprobante_url ? (
              <button onClick={() => setLightbox(p.comprobante_url)}
                style={{ padding: 0, border: '2px solid #0A66C2', borderRadius: '8px', cursor: 'pointer', background: 'none', overflow: 'hidden', width: '52px', height: '52px', flexShrink: 0 }}
                title="Ver comprobante de pago">
                <img src={p.comprobante_url} alt="comprobante"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ) : (
              <button onClick={() => compRef.current?.click()} disabled={subiendoFactura === p.id + '_comp'}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', width: '52px', height: '52px', fontSize: '10px', color: '#9CA3AF', background: '#F9FAFB', border: '1.5px dashed #D1D5DB', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>
                <Image size={14} color="#9CA3AF" />
                {subiendoFactura === p.id + '_comp' ? '…' : 'Foto'}
              </button>
            )}

            {/* CFDI docs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
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
            </div>
          </div>

          <input ref={pdfRef}  type="file" accept=".pdf"  style={{ display: 'none' }} onChange={e => onSubirFactura(p.id, 'pdf', e.target.files?.[0])} />
          <input ref={xmlRef}  type="file" accept=".xml"  style={{ display: 'none' }} onChange={e => onSubirFactura(p.id, 'xml', e.target.files?.[0])} />
          <input ref={compRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onSubirComprobante(p.id, f); e.target.value = '' }} />
        </div>
      </div>

      {/* Lightbox comprobante */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={lightbox} alt="comprobante"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()} />
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
            <a href={lightbox} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              ↗ Abrir
            </a>
            <button onClick={() => setLightbox(null)}
              style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 700 }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal de pagos: historial + agregar nuevo ─────────────────────────
const OCR_FN = '/.netlify/functions/extraer-documento'

function PagosModal({ cobro, onClose, onSaved }) {
  const [ingresos, setIngresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subiendoFactura, setSubiendoFactura] = useState(null)
  const [leyendoOCR, setLeyendoOCR] = useState(false)
  const [ocrMsg, setOcrMsg] = useState(null)
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [comprobantePreview, setComprobantePreview] = useState(null)
  const [showQuickPay, setShowQuickPay] = useState(false)
  const [quickFecha, setQuickFecha]     = useState(new Date().toISOString().split('T')[0])
  const [quickMonto, setQuickMonto]     = useState('')
  const [quickRef, setQuickRef]         = useState('')
  const compFileRef  = useRef()
  const adjFileRef   = useRef()
  const quickFileRef = useRef()

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

  // OCR de comprobante bancario → prellena el formulario
  const leerComprobante = async (file) => {
    if (!file) return
    setComprobanteFile(file)
    setComprobantePreview(URL.createObjectURL(file))
    setLeyendoOCR(true); setOcrMsg(null)
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload  = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const resp = await fetch(OCR_FN, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, media_type: file.type, tipo_doc: 'COMPROBANTE_PAGO' }),
      })
      const j = await resp.json()
      if (!resp.ok || !j.datos) throw new Error(j.error || 'Sin datos extraídos')
      const d = j.datos
      // Mapear forma_pago a los valores del select
      const formaMap = {
        transferencia: 'TRANSFERENCIA', spei: 'TRANSFERENCIA', deposito: 'DEPOSITO',
        'depósito': 'DEPOSITO', efectivo: 'EFECTIVO', cheque: 'CHEQUE',
      }
      const formaRaw = (d.forma_pago || '').toLowerCase()
      const formaOK = formaMap[formaRaw] || 'TRANSFERENCIA'
      setForm(f => ({
        ...f,
        fecha_pago:  d.fecha_pago || d.fecha || f.fecha_pago,
        monto:       d.monto ? String(d.monto) : f.monto,
        referencia:  d.referencia || d.folio || d.numero_operacion || f.referencia,
        forma_pago:  formaOK,
        nota:        [d.concepto, d.banco ? `Desde: ${d.banco}` : ''].filter(Boolean).join(' · ') || f.nota,
      }))
      setShowForm(true)
      setOcrMsg({ ok: true, txt: `✓ Datos leídos — revisa y confirma` })
    } catch (e) {
      setOcrMsg({ ok: false, txt: `No se pudo leer: ${e.message}` })
    } finally { setLeyendoOCR(false) }
  }

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
      .select('id, fecha, importe, tipo_concepto, origen, concepto_origen, factura_numero, factura_serie, factura_pdf_url, factura_xml_url, comprobante_url, nota, creado_por, created_at')
      .eq('cobro_id', cobro.id)
      .order('fecha', { ascending: false })
    setIngresos(data ?? [])
    setLoading(false)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) { setErr('El monto debe ser mayor a 0'); return }
    // Validar diferencia de monto vs renta programada
    if (form.tipo_concepto === 'RENTA') {
      const montoCapturado = parseFloat(form.monto)
      const rentaProgramada = parseFloat(cobro.monto_total) || 0
      const diff = Math.abs(montoCapturado - rentaProgramada)
      if (diff > 0.01) {
        const mayor = montoCapturado > rentaProgramada
        const msg = `⚠ Diferencia detectada\n\nRenta programada: ${fmt(rentaProgramada)}\nMonto capturado:  ${fmt(montoCapturado)}\nDiferencia:       ${mayor ? '+' : '-'}${fmt(diff)}\n\n${mayor ? 'El pago es MAYOR a la renta (puede incluir otros conceptos).' : 'El pago es MENOR a la renta (quedará como PARCIAL).'}\n\n¿Confirmar de todos modos?`
        if (!window.confirm(msg)) return
      }
    }
    setSaving(true); setErr(null)
    try {
      const monto = parseFloat(form.monto)

      // 1. Insertar ingreso vinculado al cobro
      const _dt = new Date(form.fecha_pago + 'T12:00:00')
      const _MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      const { error: errIng } = await supabase.from('ingresos').insert({
        cobro_id:        cobro.id,
        fecha:           form.fecha_pago,
        mes:             cobro.mes || _MESES[_dt.getMonth()],
        anio:            cobro.anio || _dt.getFullYear(),
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

      // 1b. Subir comprobante si hay archivo seleccionado
      if (comprobanteFile) {
        const { data: ingData } = await supabase.from('ingresos')
          .select('id').eq('cobro_id', cobro.id).order('created_at', { ascending: false }).limit(1).single()
        if (ingData?.id) {
          const ext = comprobanteFile.name.split('.').pop() || 'jpg'
          const path = `comprobantes/${cobro.referencia_pago}/${ingData.id}/comp.${ext}`
          const { error: upErr } = await supabase.storage.from('facturas-cfdi').upload(path, comprobanteFile, { upsert: true })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
            await supabase.from('ingresos').update({ comprobante_url: urlData.publicUrl }).eq('id', ingData.id)
          }
        }
      }

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
      setComprobanteFile(null); setComprobantePreview(null)
      await cargar()
      onSaved()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const confirmarPagoRapido = async () => {
    const monto = parseFloat(quickMonto) || parseFloat(cobro.monto_total) || 0
    if (!monto) { alert('Ingresa el monto del pago'); return }
    const prog = parseFloat(cobro.monto_total) || 0
    const diff = monto - prog
    if (Math.abs(diff) > 0.01) {
      const esMayor = diff > 0
      const msg = `⚠ Diferencia detectada\n\nRenta programada: ${fmt(prog)}\nMonto capturado:  ${fmt(monto)}\nDiferencia:       ${esMayor ? '+' : '-'}${fmt(Math.abs(diff))}\n\n${esMayor ? 'El pago es MAYOR (puede incluir otros conceptos).' : 'El pago es MENOR (quedará como PARCIAL).'}\n\n¿Confirmar de todos modos?`
      if (!window.confirm(msg)) return
    }
    setSaving(true)
    try {
      const _dt = new Date(quickFecha + 'T12:00:00')
      const _MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      // 1. Insertar ingreso tipo RENTA
      const { data: ingData, error: errIng } = await supabase.from('ingresos').insert({
        cobro_id:        cobro.id,
        fecha:           quickFecha,
        mes:             cobro.mes || _MESES[_dt.getMonth()],
        anio:            cobro.anio || _dt.getFullYear(),
        importe:         monto,
        tipo:            'RENTA',
        tipo_concepto:   'RENTA',
        origen:          'TRANSFERENCIA BBVA',
        referencia_banco: quickRef || null,
        concepto_origen: `RENTA ${cobro.mes}/${cobro.anio}`,
        propietario:     cobro.arrendatario_nombre || null,
        id_contrato:     cobro.referencia_pago || null,
      }).select('id').single()
      if (errIng) throw errIng

      // 2. Subir comprobante si hay imagen
      if (comprobanteFile && ingData?.id) {
        const ext = comprobanteFile.name.split('.').pop() || 'jpg'
        const path = `comprobantes/${cobro.referencia_pago}/${ingData.id}/comp.${ext}`
        const buf  = await comprobanteFile.arrayBuffer()
        const { error: upErr } = await supabase.storage.from('facturas-cfdi')
          .upload(path, buf, { contentType: comprobanteFile.type, upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
          await supabase.from('ingresos').update({ comprobante_url: urlData.publicUrl }).eq('id', ingData.id)
        }
      }

      // 3. Actualizar estatus del cobro
      const nuevoEstatus = monto >= parseFloat(cobro.monto_total) ? 'PAGADO' : 'PARCIAL'
      await supabase.from('cobros').update({
        monto_pagado: monto,
        estatus:      nuevoEstatus,
        fecha_pago:   quickFecha,
      }).eq('id', cobro.id)

      setShowQuickPay(false)
      setComprobanteFile(null); setComprobantePreview(null)
      setQuickMonto(''); setQuickRef('')
      await cargar()
      onSaved()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const eliminar = async (ingresoId) => {
    if (!window.confirm('¿Eliminar este movimiento? El estatus del cobro se recalculará.')) return
    const { error } = await supabase.from('ingresos').delete().eq('id', ingresoId)
    if (error) { alert(error.message); return }
    await cargar(); onSaved()
  }

  const subirComprobante = async (ingresoId, file) => {
    const key = `${ingresoId}_comp`
    setSubiendoFactura(key)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `comprobantes/${cobro.referencia_pago}/${ingresoId}/comp.${ext}`
    const { error: upErr } = await supabase.storage.from('facturas-cfdi').upload(path, file, { upsert: true })
    if (upErr) { alert('Error al subir: ' + upErr.message); setSubiendoFactura(null); return }
    const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
    await supabase.from('ingresos').update({ comprobante_url: urlData.publicUrl }).eq('id', ingresoId)
    setSubiendoFactura(null)
    await cargar()
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
                    onSubirComprobante={subirComprobante}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} style={inp} required /></div>
                <div><label style={lbl}>Monto *</label><input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder={!esSancion && pendiente > 0 ? String(pendiente) : '0.00'} style={{ ...inp, fontWeight: 700 }} step="0.01" required autoFocus /></div>
              </div>
              {/* Alerta diferencia de monto */}
              {!esSancion && form.monto && parseFloat(form.monto) > 0 && (() => {
                const cap = parseFloat(form.monto)
                const prog = parseFloat(cobro.monto_total) || 0
                const diff = cap - prog
                if (Math.abs(diff) < 0.01) return <div style={{ marginBottom:'8px', padding:'5px 10px', borderRadius:6, fontSize:11, fontWeight:700, color:'#057642', background:'#D1FAE5' }}>✓ Monto coincide con la renta programada ({fmt(prog)})</div>
                const esMayor = diff > 0
                return (
                  <div style={{ marginBottom:'8px', padding:'6px 10px', borderRadius:6, fontSize:11, fontWeight:700, color: esMayor ? '#92400E' : '#B24020', background: esMayor ? '#FEF3C7' : '#FEE2E2', display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:14 }}>{esMayor ? '⚠' : '🔴'}</span>
                    <span>
                      {esMayor
                        ? `Pago MAYOR en ${fmt(diff)} vs renta programada (${fmt(prog)}). Puede incluir otros conceptos.`
                        : `Pago MENOR en ${fmt(Math.abs(diff))} vs renta programada (${fmt(prog)}). Quedará como PARCIAL.`}
                    </span>
                  </div>
                )
              })()}


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

              {/* Comprobante adjunto al movimiento */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Comprobante de pago</div>
                {comprobantePreview ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <img src={comprobantePreview} alt="comprobante"
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid #0A66C2', cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => window.open(comprobantePreview, '_blank')} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 700 }}>✓ Imagen lista para adjuntar</div>
                      <div style={{ fontSize: '10px', color: '#6B7280', marginTop: 2 }}>{comprobanteFile?.name}</div>
                      <button type="button" onClick={() => { setComprobanteFile(null); setComprobantePreview(null) }}
                        style={{ marginTop: 4, fontSize: '11px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                        ✕ Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => adjFileRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#F9FAFB', border: '1.5px dashed #D1D5DB', borderRadius: '8px', fontSize: '12px', color: '#6B7280', cursor: 'pointer', fontWeight: 600 }}>
                    <Image size={14} /> Adjuntar foto del comprobante (opcional)
                  </button>
                )}
                <input ref={adjFileRef} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setComprobanteFile(f); setComprobantePreview(URL.createObjectURL(f)) }
                    e.target.value = ''
                  }} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: saving ? '#9CA3AF' : esSancion ? 'var(--color-danger)' : 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? 'Guardando...' : esSancion ? '⚠ Registrar sanción' : '✓ Confirmar pago'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setErr(null); setForm(FORM_INIT); setComprobanteFile(null); setComprobantePreview(null) }} style={{ padding: '10px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        {!showForm && (
          <div style={{ borderTop: '1px solid #E5E7EB' }}>

            {/* Panel Pago Rápido */}
            {showQuickPay ? (
              <div style={{ padding: '14px 22px', background: '#F0FDF4' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803D', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✓ Confirmar pago — {cobro.arrendatario_nombre}
                </div>

                {/* Comprobante de pago (imagen) */}
                <div style={{ marginBottom: '10px' }}>
                  {comprobantePreview ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: 'white', borderRadius: '8px', border: '1.5px solid #BBF7D0' }}>
                      <img src={comprobantePreview} alt="comprobante"
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #D1D5DB', cursor:'pointer' }}
                        onClick={() => window.open(comprobantePreview, '_blank')} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803D' }}>✓ Comprobante adjunto</div>
                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{comprobanteFile?.name}</div>
                      </div>
                      <button type="button" onClick={() => { setComprobanteFile(null); setComprobantePreview(null) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, padding: '4px' }}>✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => quickFileRef.current?.click()}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'white', border: '2px dashed #86EFAC', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#15803D', fontWeight: 700 }}>
                      <Image size={18} /> Adjuntar foto del comprobante de pago
                    </button>
                  )}
                  <input ref={quickFileRef} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setComprobanteFile(f); setComprobantePreview(URL.createObjectURL(f)) }; e.target.value = '' }} />
                </div>

                {/* Fecha + Monto + Referencia */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Fecha pago</div>
                    <input type="date" value={quickFecha} onChange={e => setQuickFecha(e.target.value)}
                      style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Monto *</div>
                    <input type="number" value={quickMonto} onChange={e => setQuickMonto(e.target.value)}
                      placeholder={String(cobro.monto_total || '')}
                      style={{ width: '100%', padding: '7px 8px', border: `1.5px solid ${quickMonto && Math.abs(parseFloat(quickMonto) - parseFloat(cobro.monto_total||0)) > 0.01 ? '#F59E0B' : '#D1D5DB'}`, borderRadius: 6, fontSize: 12, fontWeight: 700, boxSizing: 'border-box' }} step="0.01" />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Referencia</div>
                    <input type="text" value={quickRef} onChange={e => setQuickRef(e.target.value)}
                      placeholder="No. operación"
                      style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #D1D5DB', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
                  </div>
                </div>
                {/* Alerta diferencia monto quick pay */}
                {quickMonto && (() => {
                  const cap = parseFloat(quickMonto) || 0
                  const prog = parseFloat(cobro.monto_total) || 0
                  const diff = cap - prog
                  if (Math.abs(diff) < 0.01) return null
                  const esMayor = diff > 0
                  return (
                    <div style={{ marginBottom: '8px', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: esMayor ? '#92400E' : '#B24020', background: esMayor ? '#FEF3C7' : '#FEE2E2' }}>
                      {esMayor ? '⚠' : '🔴'} {esMayor
                        ? `Pago MAYOR en ${fmt(diff)} vs renta programada (${fmt(prog)})`
                        : `Pago MENOR en ${fmt(Math.abs(diff))} — quedará como PARCIAL`}
                      {' · Se pedirá confirmación'}
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={confirmarPagoRapido} disabled={saving}
                    style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : '#15803D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: saving ? 'default' : 'pointer' }}>
                    {saving ? 'Guardando…' : '✓ Confirmar pago y cambiar a PAGADO'}
                  </button>
                  <button type="button"
                    onClick={() => { setShowQuickPay(false); setComprobanteFile(null); setComprobantePreview(null); setQuickMonto(''); setQuickRef('') }}
                    style={{ padding: '11px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 22px' }}>
                {ocrMsg && (
                  <div style={{ marginBottom: '8px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: ocrMsg.ok ? '#057642' : '#B24020', background: ocrMsg.ok ? '#D1FAE5' : '#FEE2E2' }}>
                    {ocrMsg.txt}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: colorEst + '20', color: colorEst }}>{cobro.estatus}</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* PAGO RÁPIDO — acción principal */}
                    {cobro.estatus !== 'PAGADO' && (
                      <button onClick={() => { setShowQuickPay(true); setQuickMonto(String(cobro.monto_total || '')) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#15803D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(21,128,61,0.3)' }}>
                        💳 Registrar pago
                      </button>
                    )}
                    {/* OCR comprobante */}
                    <button disabled={leyendoOCR} onClick={() => compFileRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: leyendoOCR ? '#9CA3AF' : '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '11px', cursor: leyendoOCR ? 'default' : 'pointer' }}
                      title="Leer comprobante con IA y pre-llenar el formulario">
                      {leyendoOCR ? '⏳ Leyendo…' : '🔍 OCR'}
                    </button>
                    <button onClick={() => { setShowForm(true); setOcrMsg(null) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>
                      <Plus size={13} /> Manual
                    </button>
                  </div>
                </div>
                <input ref={compFileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) leerComprobante(f); e.target.value = '' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


// ── Reporte de Cobranza ───────────────────────────────────────────────────────
function ReporteCobranza({ lista, mesFiltro, anioFiltro }) {
  const [ingresosData, setIngresosData] = useState([])

  useEffect(() => {
    supabase.from('ingresos')
      .select('importe, tipo, tipo_concepto, origen, fecha')
      .not('cobro_id', 'is', null)
      .then(({ data }) => setIngresosData(data || []))
  }, [])

  // Filtrar por mes/año si hay filtro activo
  const base = mesFiltro === 0
    ? lista
    : lista.filter(c => c.mes === mesFiltro && c.anio === anioFiltro)

  // ── KPIs por estatus ──
  const grupos = {
    PAGADO:    base.filter(c => c.estatus === 'PAGADO'),
    PARCIAL:   base.filter(c => c.estatus === 'PARCIAL'),
    PENDIENTE: base.filter(c => c.estatus === 'PENDIENTE'),
    EN_MORA:   base.filter(c => c.estatus === 'EN_MORA'),
  }
  const sum = arr => arr.reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)
  const sumPagado = arr => arr.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)

  // ── Ingresos por tipo (de tabla ingresos) ──
  const ingRentas    = ingresosData.filter(r => r.tipo_concepto === 'RENTA' || r.tipo === 'RENTA')
  const ingSanciones = ingresosData.filter(r => ['SANCION','RECARGO','CUOTA_MANT'].includes(r.tipo_concepto) || r.tipo === 'SANCION')
  const sumIng = arr => arr.reduce((a, b) => a + (parseFloat(b.importe) || 0), 0)

  const KPIS_EST = [
    { label: 'Pagado', key: 'PAGADO',    color: 'var(--color-success)', icon: '✅' },
    { label: 'Parcial', key: 'PARCIAL',   color: '#7C3AED',              icon: '🔵' },
    { label: 'Pendiente', key: 'PENDIENTE', color: 'var(--color-warning)', icon: '⏳' },
    { label: 'En Mora', key: 'EN_MORA',   color: 'var(--color-danger)',   icon: '🔴' },
  ]

  // ── Tabla completa ──
  const sorted = [...base].sort((a, b) => {
    const ord = { EN_MORA: 0, PENDIENTE: 1, PARCIAL: 2, PAGADO: 3 }
    return (ord[a.estatus] ?? 9) - (ord[b.estatus] ?? 9)
  })

  const handlePrint = () => {
    const mesLabel = mesFiltro === 0 ? 'Todos los meses' : `${MES_NOMBRES[mesFiltro]} ${anioFiltro}`
    const filas = sorted.map(c => `
      <tr style="border-bottom:1px solid #F3F4F6;background:${c.estatus==='EN_MORA'?'#FFF1F0':c.estatus==='PAGADO'?'#F0FDF4':'white'}">
        <td style="padding:5px 8px;font-size:11px;font-family:monospace;color:#0A66C2">${c.referencia_pago||''}</td>
        <td style="padding:5px 8px;font-size:12px">${c.unidad_numero||'—'}</td>
        <td style="padding:5px 8px;font-size:12px">${c.arrendatario_nombre||'—'}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right">${fmt(c.monto_total)}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right;color:${c.monto_pagado>0?'#057642':'#9CA3AF'}">${fmt(c.monto_pagado)}</td>
        <td style="padding:5px 8px;font-size:11px;text-align:right;color:${c.monto_total-c.monto_pagado>0?'#B24020':'#9CA3AF'}">${fmt(Math.max(0,c.monto_total-(parseFloat(c.monto_pagado)||0)))}</td>
        <td style="padding:5px 8px;font-size:11px">${c.fecha_limite_pago||''}</td>
        <td style="padding:5px 8px">
          <span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${ESTATUS_COLOR[c.estatus]||'#F59E0B'}20;color:${ESTATUS_COLOR[c.estatus]||'#F59E0B'}">${c.estatus}</span>
        </td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Cobranza</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
    h1{font-size:16px;color:#0A66C2;font-weight:800}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px solid #0A66C2;padding-bottom:10px;margin-bottom:16px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
    .kpi{border:1px solid #E5E7EB;border-radius:6px;padding:10px 12px}
    .kpi .val{font-size:18px;font-weight:800;margin-top:2px}.kpi .lbl{font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase}
    table{width:100%;border-collapse:collapse}th{background:#F3F4F6;padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;border-bottom:2px solid #E5E7EB}
    @media print{@page{size:landscape;margin:8mm}}</style></head><body>
    <div class="hdr"><div><h1>REPORTE DE COBRANZA — PLAZA IWOL</h1>
    <div style="font-size:12px;color:#6B7280;margin-top:2px">Periodo: ${mesLabel} · Generado: ${new Date().toLocaleDateString('es-MX')}</div></div>
    <div style="text-align:right;font-size:11px;color:#6B7280">IRP by RANNIX Consulting</div></div>
    <div class="kpis">
      ${KPIS_EST.map(k => `<div class="kpi"><div class="lbl">${k.icon} ${k.label}</div>
      <div class="val" style="color:${k.color}">${grupos[k.key].length} cobros</div>
      <div style="font-size:11px;color:#6B7280">Total: ${fmt(sum(grupos[k.key]))}</div>
      ${k.key!=='PENDIENTE'&&k.key!=='EN_MORA'?`<div style="font-size:11px;color:${k.color}">Cobrado: ${fmt(sumPagado(grupos[k.key]))}</div>`:''}</div>`).join('')}
    </div>
    <div style="margin-bottom:10px;display:flex;gap:20px;font-size:12px">
      <span>📥 Ingresos Rentas: <strong>${fmt(sumIng(ingRentas))}</strong> (${ingRentas.length} movs.)</span>
      <span>⚡ Sanciones/Recargos: <strong>${fmt(sumIng(ingSanciones))}</strong> (${ingSanciones.length} movs.)</span>
    </div>
    <table><thead><tr><th>Referencia</th><th>Local</th><th>Arrendatario</th><th style="text-align:right">Renta</th><th style="text-align:right">Pagado</th><th style="text-align:right">Pendiente</th><th>Vencimiento</th><th>Estatus</th></tr></thead>
    <tbody>${filas}</tbody></table>
    <div style="margin-top:12px;border-top:1px solid #E5E7EB;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF">
      <span>Total programado: ${fmt(sum(base))} · Total cobrado: ${fmt(sumPagado(base))}</span>
      <span>Firma: ________________________</span>
    </div></body></html>`
    const w = window.open('', '_blank', 'width=1100,height=700')
    w.document.write(html); w.document.close()
    setTimeout(() => w.print(), 400)
  }

  const EST_ORDEN = ['EN_MORA','PENDIENTE','PARCIAL','PAGADO']

  return (
    <div>
      {/* Botón imprimir */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1A3C5E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={14} /> Imprimir / PDF
        </button>
      </div>

      {/* ── KPIs por estatus ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {KPIS_EST.map(k => (
          <div key={k.key} style={{ background: 'white', border: `2px solid ${k.color}30`, borderRadius: '12px', padding: '14px 16px', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '6px' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: k.color, fontFamily: 'monospace' }}>{grupos[k.key].length}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginTop: '4px' }}>Programado: {fmt(sum(grupos[k.key]))}</div>
            {(k.key === 'PAGADO' || k.key === 'PARCIAL') && (
              <div style={{ fontSize: '11px', color: k.color, fontWeight: 600 }}>Cobrado: {fmt(sumPagado(grupos[k.key]))}</div>
            )}
            {(k.key === 'EN_MORA' || k.key === 'PENDIENTE') && (
              <div style={{ fontSize: '11px', color: k.color, fontWeight: 600 }}>Por cobrar: {fmt(sum(grupos[k.key]) - sumPagado(grupos[k.key]))}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desglose de ingresos recibidos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '8px' }}>📥 Ingresos por Rentas</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-success)', fontFamily: 'monospace' }}>{fmt(sumIng(ingRentas))}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{ingRentas.length} movimientos registrados</div>
        </div>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '8px' }}>⚡ Sanciones / Recargos / Mantenimiento</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-danger)', fontFamily: 'monospace' }}>{fmt(sumIng(ingSanciones))}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{ingSanciones.length} cargos adicionales</div>
        </div>
      </div>

      {/* ── Tabla completa ── */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#1A3C5E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '12px', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Detalle de Cobros — {base.length} registros
          </span>
          <span style={{ fontSize: '13px', color: '#E8A020', fontWeight: 900, fontFamily: 'monospace' }}>
            Programado: {fmt(sum(base))} · Cobrado: {fmt(sumPagado(base))}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Referencia','Local','Arrendatario','Renta','Pagado','Pendiente','Vencimiento','Estatus'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: i >= 3 && i <= 5 ? 'right' : 'left', fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const pendiente = Math.max(0, (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pagado) || 0))
                const color = ESTATUS_COLOR[c.estatus] || 'var(--color-warning)'
                const bgRow = c.estatus === 'EN_MORA' ? '#FFF8F8' : c.estatus === 'PAGADO' ? '#F0FDF4' : i%2===0?'white':'#FAFAFA'
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6', background: bgRow }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{c.referencia_pago}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#374151' }}>{c.unidad_numero || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{c.arrendatario_nombre}</div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{MES_NOMBRES[c.mes]} {c.anio}</div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmt(c.monto_total)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: parseFloat(c.monto_pagado) > 0 ? 'var(--color-success)' : '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {parseFloat(c.monto_pagado) > 0 ? fmt(c.monto_pagado) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: pendiente > 0 ? 'var(--color-danger)' : '#9CA3AF', fontWeight: pendiente > 0 ? 700 : 400, whiteSpace: 'nowrap' }}>
                      {pendiente > 0 ? fmt(pendiente) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>{c.fecha_limite_pago || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: color + '20', color }}>{c.estatus}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F3F4F6', borderTop: '2px solid #E5E7EB', fontWeight: 800 }}>
                <td colSpan={3} style={{ padding: '10px 12px', fontSize: '12px', color: '#374151' }}>TOTAL</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900 }}>{fmt(sum(base))}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--color-success)', fontWeight: 900 }}>{fmt(sumPagado(base))}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--color-danger)', fontWeight: 900 }}>{fmt(sum(base) - sumPagado(base))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
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
  const [tab, setTab] = useState('cobros')
  const [sortCol, setSortCol] = useState('fecha_limite_pago')
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

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
  }).sort((a, b) => {
    let va, vb
    if (sortCol === 'monto_total') { va = parseFloat(a.monto_total) || 0; vb = parseFloat(b.monto_total) || 0 }
    else if (sortCol === 'fecha_pago_real') { va = a.fecha_pago_real || '9999'; vb = b.fecha_pago_real || '9999' }
    else { va = (a[sortCol] || '').toString().toLowerCase(); vb = (b[sortCol] || '').toString().toLowerCase() }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {[{ key: 'cobros', label: 'Cobros' }, { key: 'reporte', label: '📊 Reporte' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
                background: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? 'var(--color-primary)' : '#6B7280',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>{t.label}</button>
            ))}
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Pagados" value={pagados} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Pendientes" value={pendientes} icon={Clock} color="var(--color-warning)" />
        <KPICard title="En Mora" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Total Cobrado" value={`$${(totalCobrado/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
        <KPICard title="Por Cobrar" value={`$${(totalPendiente/1000).toFixed(0)}K`} icon={DollarSign} color="var(--color-secondary)" />
      </div>

      {tab === 'reporte' && (
        <ReporteCobranza lista={lista} mesFiltro={mesFiltro} anioFiltro={anioFiltro} />
      )}

      {tab === 'cobros' && <><div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                    {[
                      { label: 'Referencia',   col: 'referencia_pago',  right: false },
                      { label: 'Local',         col: 'unidad_numero',    right: false },
                      { label: 'Arrendatario',  col: 'arrendatario_nombre', right: false },
                      { label: 'Total',         col: 'monto_total',      right: true  },
                      { label: 'Vence',         col: 'fecha_limite_pago', right: false },
                      { label: 'Fecha Pago',    col: 'fecha_pago_real',  right: false },
                      { label: 'Estatus',       col: null,               right: false },
                    ].map(({ label, col, right }) => (
                      <th key={label}
                        onClick={col ? () => toggleSort(col) : undefined}
                        style={{ padding: '11px 16px', textAlign: right ? 'right' : 'left', fontWeight: 600, fontSize: '12px', color: sortCol === col ? 'var(--color-primary)' : 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB', cursor: col ? 'pointer' : 'default', whiteSpace: 'nowrap', userSelect: 'none' }}>
                        {label}
                        {col && <span style={{ marginLeft: '4px', opacity: sortCol === col ? 1 : 0.3 }}>{sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>}
                      </th>
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

      </>}

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
