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
      <td style={{ padding: '12px 16px', minWidth: '140px' }}>
        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: colorEstatus + '20', color: colorEstatus, marginBottom: '4px' }}>
          {c.estatus}
        </span>
        {vencida && (
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-danger)', marginTop: '2px' }}>
            ⚠ Vencida — genera moratoria
          </div>
        )}
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

          {/* Documentos CFDI */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
            {/* Botón adjuntar comprobante si no hay */}
            {!p.comprobante_url && (
              <button onClick={() => compRef.current?.click()} disabled={subiendoFactura === p.id + '_comp'}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6B7280', background: '#F3F4F6', border: '1px dashed #D1D5DB', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                <Image size={11} /> {subiendoFactura === p.id + '_comp' ? 'Subiendo…' : 'Adjuntar comprobante'}
              </button>
            )}
          </div>

          {/* Imagen comprobante — visible inline, grande */}
          {p.comprobante_url && (
            <div style={{ marginTop: '10px' }}>
              <img src={p.comprobante_url} alt="Comprobante de pago"
                onClick={() => setLightbox(p.comprobante_url)}
                style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '10px', border: '2px solid #E5E7EB', cursor: 'zoom-in', display: 'block', background: '#F9FAFB' }} />
              <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', textAlign: 'center' }}>
                Clic para ampliar
              </div>
            </div>
          )}

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

// ── Modal de pago único por cobro ────────────────────────────────────
const OCR_FN = '/.netlify/functions/extraer-documento'

function PagosModal({ cobro, onClose, onSaved }) {
  // Un cobro tiene un solo registro de pago (ingreso). Lo cargamos y lo editamos.
  const [ingreso, setIngreso] = useState(null)   // el único ingreso de este cobro
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [ocrMsg, setOcrMsg] = useState(null)
  const [leyendoOCR, setLeyendoOCR] = useState(false)
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [comprobantePreview, setComprobantePreview] = useState(null)
  const [subiendoCFDI, setSubiendoCFDI] = useState(null)
  const compFileRef = useRef()
  const pdfRef = useRef()
  const xmlRef = useRef()

  const [form, setForm] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: String(cobro.monto_total || ''),
    forma_pago: 'TRANSFERENCIA',
    referencia: '',
    factura_numero: '',
    factura_serie: '',
    nota: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // OCR al adjuntar imagen → pre-llena fecha, referencia, forma_pago (no el monto)
  const adjuntarYOCR = async (file) => {
    if (!file) return
    setComprobanteFile(file)
    setComprobantePreview(URL.createObjectURL(file))
    setLeyendoOCR(true); setOcrMsg({ ok: null, txt: '⏳ Leyendo comprobante con IA…' })
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file)
      })
      const resp = await fetch(OCR_FN, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, media_type: file.type, tipo_doc: 'COMPROBANTE_PAGO' }),
      })
      const j = await resp.json()
      if (!resp.ok || !j.datos) throw new Error(j.error || 'Sin datos')
      const d = j.datos
      const formaMap = { transferencia:'TRANSFERENCIA', spei:'TRANSFERENCIA', deposito:'DEPOSITO', 'depósito':'DEPOSITO', efectivo:'EFECTIVO', cheque:'CHEQUE' }
      setForm(f => ({
        ...f,
        fecha_pago: d.fecha_pago || d.fecha || f.fecha_pago,
        referencia: d.referencia || d.folio || d.numero_operacion || f.referencia,
        forma_pago: formaMap[(d.forma_pago||'').toLowerCase()] || f.forma_pago,
        nota:       [d.concepto, d.banco ? `Desde: ${d.banco}` : ''].filter(Boolean).join(' · ') || f.nota,
      }))
      const totalImagen = d.monto ? fmt(d.monto) : null
      setOcrMsg({ ok: true, txt: `✓ Datos leídos${totalImagen ? ` — total en imagen: ${totalImagen}` : ''} — verifica el monto de esta renta` })
    } catch {
      setOcrMsg({ ok: false, txt: '⚠ No se pudo leer el comprobante — llena manualmente' })
    } finally { setLeyendoOCR(false) }
  }

  useEffect(() => { cargar(null) }, [cobro.id])

  const cargar = async (fileActivo) => {
    setLoading(true)
    const { data } = await supabase
      .from('ingresos')
      .select('id, fecha, importe, forma_pago, referencia_banco, tipo_concepto, factura_numero, factura_serie, factura_pdf_url, factura_xml_url, comprobante_url, nota, created_at')
      .eq('cobro_id', cobro.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setIngreso(data || null)
    if (data) {
      setForm(f => ({
        ...f,
        fecha_pago:     data.fecha     || f.fecha_pago,
        monto:          data.importe   ? String(data.importe) : f.monto,
        forma_pago:     data.forma_pago || f.forma_pago,
        referencia:     data.referencia_banco || '',
        factura_numero: data.factura_numero   || '',
        factura_serie:  data.factura_serie    || '',
        nota:           data.nota             || '',
      }))
      // Mostrar comprobante guardado solo si no hay archivo nuevo activo
      if (!fileActivo && data.comprobante_url) setComprobantePreview(data.comprobante_url)
    }
    setLoading(false)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) { setErr('El monto debe ser mayor a 0'); return }
    setSaving(true); setErr(null)
    try {
      const monto = parseFloat(form.monto)
      const _MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      const _dt = new Date(form.fecha_pago + 'T12:00:00')

      let ingresoId = ingreso?.id
      if (ingresoId) {
        // Actualizar el ingreso existente
        const { error } = await supabase.from('ingresos').update({
          fecha:            form.fecha_pago,
          importe:          monto,
          forma_pago:       form.forma_pago,
          referencia_banco: form.referencia || null,
          factura_numero:   form.factura_numero || null,
          factura_serie:    form.factura_serie  || null,
          nota:             form.nota || null,
        }).eq('id', ingresoId)
        if (error) throw error
      } else {
        // Crear el primer (y único) ingreso para este cobro
        const { data: nuevo, error } = await supabase.from('ingresos').insert({
          cobro_id:         cobro.id,
          fecha:            form.fecha_pago,
          mes:              cobro.mes || _MESES[_dt.getMonth()],
          anio:             cobro.anio || _dt.getFullYear(),
          importe:          monto,
          tipo:             'RENTA',
          tipo_concepto:    'RENTA',
          origen:           form.forma_pago === 'EFECTIVO' ? 'EFECTIVO' : 'TRANSFERENCIA BBVA',
          forma_pago:       form.forma_pago,
          referencia_banco: form.referencia || null,
          concepto_origen:  `RENTA ${cobro.mes}/${cobro.anio}`,
          propietario:      cobro.arrendatario_nombre || null,
          id_contrato:      cobro.referencia_pago     || null,
          factura_numero:   form.factura_numero || null,
          factura_serie:    form.factura_serie  || null,
          nota:             form.nota || null,
        }).select('id').single()
        if (error) throw error
        ingresoId = nuevo.id
      }

      // Subir comprobante si se adjuntó nuevo archivo
      if (comprobanteFile && ingresoId) {
        const ext = comprobanteFile.name.split('.').pop() || 'jpg'
        const path = `comprobantes/${cobro.referencia_pago}/${ingresoId}/comp.${ext}`
        const { error: upErr } = await supabase.storage.from('facturas-cfdi').upload(path, comprobanteFile, { upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
          await supabase.from('ingresos').update({ comprobante_url: urlData.publicUrl }).eq('id', ingresoId)
          setComprobantePreview(urlData.publicUrl)
        }
      }

      // Actualizar estatus y monto en cobros
      const rentaTotal = parseFloat(cobro.monto_total) || 0
      const nuevoEstatus = rentaTotal > 0 && monto >= rentaTotal - 0.01 ? 'PAGADO' : 'PARCIAL'
      const { error: errCobro } = await supabase.from('cobros').update({
        monto_pagado:    monto,
        estatus:         nuevoEstatus,
        fecha_pago_real: form.fecha_pago,
      }).eq('id', cobro.id)
      if (errCobro) throw errCobro

      setComprobanteFile(null)
      await cargar(null)   // null = sin archivo activo → muestra comprobante guardado
      onSaved()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  const subirCFDI = async (tipo, file) => {
    if (!file || !ingreso?.id) return
    const key = `${tipo}`
    setSubiendoCFDI(key)
    const ext = tipo === 'pdf' ? 'pdf' : 'xml'
    const path = `facturas-cfdi/${cobro.referencia_pago}/${ingreso.id}/${tipo}.${ext}`
    const { error: upErr } = await supabase.storage.from('facturas-cfdi').upload(path, file, { upsert: true })
    if (upErr) { alert('Error al subir: ' + upErr.message); setSubiendoCFDI(null); return }
    const { data: urlData } = supabase.storage.from('facturas-cfdi').getPublicUrl(path)
    const col = tipo === 'pdf' ? 'factura_pdf_url' : 'factura_xml_url'
    await supabase.from('ingresos').update({ [col]: urlData.publicUrl }).eq('id', ingreso.id)
    setSubiendoCFDI(null)
    await cargar(null)
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }
  const colorEst = ESTATUS_COLOR[cobro.estatus] || 'var(--color-warning)'
  const esVencidoModal = cobro.estatus !== 'PAGADO' && cobro.fecha_limite_pago && new Date(cobro.fecha_limite_pago) < new Date()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '980px', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Registro de pago</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'monospace', marginTop: '2px' }}>{cobro.referencia_pago}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{cobro.arrendatario_nombre} · {MES_NOMBRES[cobro.mes]} {cobro.anio}</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: colorEst, padding: '2px 8px', background: colorEst + '18', borderRadius: 6 }}>{cobro.estatus}</span>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>{fmt(cobro.monto_total)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        {/* Alerta vencido */}
        {esVencidoModal && (
          <div style={{ margin: '0', padding: '8px 22px', background: '#FEE2E2', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} color="#B24020" />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#B24020' }}>COBRO VENCIDO desde {cobro.fecha_limite_pago} — registra el pago y genera moratoria si aplica</span>
          </div>
        )}

        {/* ── Cuerpo: dos columnas ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: comprobantePreview ? '420px 1fr' : '1fr', minHeight: 0, overflow: 'hidden' }}>

          {/* ── Columna izquierda: formulario único ── */}
          <div style={{ overflowY: 'auto', padding: '18px 22px', borderRight: comprobantePreview ? '1px solid #E5E7EB' : 'none' }}>
            {loading
              ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>Cargando...</div>
              : (
                <form onSubmit={guardar}>
                  {err && <div style={{ padding: '6px 10px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '12px', marginBottom: '10px' }}>{err}</div>}
                  {ocrMsg && (
                    <div style={{ marginBottom: '10px', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      color: ocrMsg.ok === true ? '#057642' : ocrMsg.ok === false ? '#B24020' : '#92400E',
                      background: ocrMsg.ok === true ? '#D1FAE5' : ocrMsg.ok === false ? '#FEE2E2' : '#FEF3C7' }}>
                      {ocrMsg.txt}
                    </div>
                  )}

                  {/* Fecha + Monto */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label style={lbl}>Fecha de pago</label>
                      <input type="date" value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} style={inp} required
                        disabled={cobro.estatus === 'PAGADO'} />
                    </div>
                    <div><label style={lbl}>Monto pagado *</label>
                      <input type="number" value={form.monto} onChange={e => set('monto', e.target.value)}
                        placeholder={String(cobro.monto_total || '')} style={{ ...inp, fontWeight: 800, fontSize: '15px' }}
                        step="0.01" required disabled={cobro.estatus === 'PAGADO'} />
                    </div>
                  </div>

                  {/* Forma + Referencia */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label style={lbl}>Forma de pago</label>
                      <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)} style={inp}
                        disabled={cobro.estatus === 'PAGADO'}>
                        {['TRANSFERENCIA','DEPOSITO','EFECTIVO','CHEQUE'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div><label style={lbl}>No. operación / Ref.</label>
                      <input type="text" value={form.referencia} onChange={e => set('referencia', e.target.value)}
                        placeholder="TRF20260901..." style={inp} disabled={cobro.estatus === 'PAGADO'} />
                    </div>
                  </div>

                  {/* Nota */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={lbl}>Nota</label>
                    <input type="text" value={form.nota} onChange={e => set('nota', e.target.value)}
                      placeholder="Observaciones, depósito cubre Ene+Feb, etc." style={inp}
                      disabled={cobro.estatus === 'PAGADO'} />
                  </div>

                  {/* Comprobante de pago */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={lbl}>Comprobante de pago (depósito / transferencia)</label>
                    {!comprobanteFile && !comprobantePreview && (
                      <button type="button" onClick={() => compFileRef.current?.click()} disabled={leyendoOCR}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#F9FAFB', border: '2px dashed #0A66C2', borderRadius: '8px', fontSize: '12px', color: '#0A66C2', cursor: 'pointer', fontWeight: 700, width: '100%', justifyContent: 'center' }}>
                        <Image size={15} /> {leyendoOCR ? '⏳ Leyendo con IA…' : '📎 Adjuntar imagen o PDF — IA leerá los datos'}
                      </button>
                    )}
                    {comprobantePreview && !comprobanteFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: '#EFF6FF', borderRadius: 8, border: '1.5px solid #BFDBFE' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8', flex: 1 }}>🖼 Comprobante guardado — visible a la derecha</span>
                        <button type="button" onClick={() => compFileRef.current?.click()}
                          style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'none', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 700 }}>
                          Cambiar
                        </button>
                      </div>
                    )}
                    {comprobanteFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: '#F0FDF4', borderRadius: 8, border: '1.5px solid #BBF7D0' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', flex: 1 }}>✓ {comprobanteFile.name}</span>
                        <button type="button" onClick={() => { setComprobanteFile(null); setOcrMsg(null); setComprobantePreview(ingreso?.comprobante_url || null) }}
                          style={{ fontSize: '11px', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕ Quitar</button>
                      </div>
                    )}
                    <input ref={compFileRef} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) adjuntarYOCR(f); e.target.value = '' }} />
                  </div>

                  {/* Factura CFDI */}
                  <div style={{ marginBottom: '14px', padding: '12px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Factura CFDI</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div><label style={lbl}>Serie</label>
                        <input type="text" value={form.factura_serie} onChange={e => set('factura_serie', e.target.value)} placeholder="A" style={inp} disabled={cobro.estatus === 'PAGADO'} />
                      </div>
                      <div><label style={lbl}>Folio</label>
                        <input type="text" value={form.factura_numero} onChange={e => set('factura_numero', e.target.value)} placeholder="2151" style={inp} disabled={cobro.estatus === 'PAGADO'} />
                      </div>
                    </div>
                    {/* Botones subir PDF / XML — solo si ya hay ingreso guardado */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {ingreso?.factura_pdf_url
                        ? <a href={ingreso.factura_pdf_url} target="_blank" rel="noreferrer"
                            style={{ padding: '7px 0', textAlign: 'center', background: '#EFF6FF', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#1D4ED8', textDecoration: 'none' }}>
                            📄 Ver PDF
                          </a>
                        : <button type="button" onClick={() => pdfRef.current?.click()} disabled={subiendoCFDI === 'pdf' || !ingreso?.id}
                            style={{ padding: '7px', background: ingreso?.id ? '#F3F4F6' : '#FAFAFA', border: `1.5px dashed ${ingreso?.id ? '#9CA3AF' : '#E5E7EB'}`, borderRadius: 7, fontSize: 11, fontWeight: 700, color: ingreso?.id ? '#374151' : '#D1D5DB', cursor: ingreso?.id ? 'pointer' : 'default' }}>
                            {subiendoCFDI === 'pdf' ? '⏳ Subiendo...' : '📄 Subir PDF'}
                          </button>
                      }
                      {ingreso?.factura_xml_url
                        ? <a href={ingreso.factura_xml_url} target="_blank" rel="noreferrer"
                            style={{ padding: '7px 0', textAlign: 'center', background: '#F0FDF4', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#15803D', textDecoration: 'none' }}>
                            📋 Ver XML
                          </a>
                        : <button type="button" onClick={() => xmlRef.current?.click()} disabled={subiendoCFDI === 'xml' || !ingreso?.id}
                            style={{ padding: '7px', background: ingreso?.id ? '#F3F4F6' : '#FAFAFA', border: `1.5px dashed ${ingreso?.id ? '#9CA3AF' : '#E5E7EB'}`, borderRadius: 7, fontSize: 11, fontWeight: 700, color: ingreso?.id ? '#374151' : '#D1D5DB', cursor: ingreso?.id ? 'pointer' : 'default' }}>
                            {subiendoCFDI === 'xml' ? '⏳ Subiendo...' : '📋 Subir XML'}
                          </button>
                      }
                    </div>
                    {!ingreso?.id && (
                      <div style={{ marginTop: '6px', fontSize: '10px', color: '#9CA3AF', textAlign: 'center' }}>
                        Guarda el pago primero para habilitar la carga del CFDI
                      </div>
                    )}
                    <input ref={pdfRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) subirCFDI('pdf', f); e.target.value = '' }} />
                    <input ref={xmlRef} type="file" accept=".xml,text/xml,application/xml" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) subirCFDI('xml', f); e.target.value = '' }} />
                  </div>

                  {/* Botón confirmar */}
                  {cobro.estatus !== 'PAGADO' && (
                    <button type="submit" disabled={saving}
                      style={{ width: '100%', padding: '13px', background: saving ? '#9CA3AF' : 'var(--color-success)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: saving ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(5,118,66,0.25)' }}>
                      {saving ? '⏳ Guardando...' : ingreso ? '✓ Actualizar pago' : '✓ Confirmar pago'}
                    </button>
                  )}
                  {cobro.estatus === 'PAGADO' && (
                    <div style={{ padding: '12px', background: '#D1FAE5', borderRadius: 10, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#057642' }}>
                      ✓ Cobro liquidado el {ingreso?.fecha || cobro.fecha_pago_real}
                    </div>
                  )}
                </form>
              )
            }
          </div>

          {/* ── Columna derecha: comprobante grande ── */}
          {comprobantePreview && (
            <div style={{ background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderRadius: '0 16px 16px 0' }}>
              {comprobantePreview.match(/\.pdf($|\?)/i)
                ? <iframe src={comprobantePreview} title="Comprobante" style={{ width: '100%', height: '100%', border: 'none' }} />
                : <img src={comprobantePreview} alt="Comprobante de pago" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
              }
              {leyendoOCR && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700, gap: 10 }}>
                  <div style={{ fontSize: 36 }}>⏳</div>
                  Leyendo con IA…
                </div>
              )}
            </div>
          )}
        </div>
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
  }, [mesFiltro, anioFiltro])

  const hoyR = new Date(); hoyR.setHours(0,0,0,0)
  const esVencidoR = c => !['PAGADO','CANCELADO'].includes(c.estatus) && new Date(c.fecha_limite_pago) < hoyR

  // PAGADO se filtra por fecha_pago_real; resto por mes programado
  const base = mesFiltro === 0
    ? lista
    : lista.filter(c => {
        if (c.estatus === 'PAGADO') {
          const fp = c.fecha_pago_real ? new Date(c.fecha_pago_real) : null
          const porFecha = fp && fp.getMonth() + 1 === mesFiltro && fp.getFullYear() === anioFiltro
          return porFecha || (c.mes === mesFiltro && c.anio === anioFiltro)
        }
        return c.mes === mesFiltro && c.anio === anioFiltro
      })

  // ── KPIs por estatus ──
  const grupos = {
    PAGADO:    base.filter(c => c.estatus === 'PAGADO'),
    PARCIAL:   base.filter(c => c.estatus === 'PARCIAL'),
    PENDIENTE: base.filter(c => c.estatus === 'PENDIENTE'),
    EN_MORA:   base.filter(c => c.estatus === 'EN_MORA'),
  }
  const sum = arr => arr.reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)
  const sumPagado = arr => arr.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)

  // ── Ingresos por tipo — filtrados por período ──
  const ingPeriodo = mesFiltro === 0 ? ingresosData : ingresosData.filter(r => {
    if (!r.fecha) return false
    const d = new Date(r.fecha)
    return d.getMonth() + 1 === mesFiltro && d.getFullYear() === anioFiltro
  })
  const ingRentas    = ingPeriodo.filter(r => r.tipo_concepto === 'RENTA' || r.tipo === 'RENTA')
  const ingSanciones = ingPeriodo.filter(r => ['SANCION','RECARGO','CUOTA_MANT'].includes(r.tipo_concepto) || r.tipo === 'SANCION')
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
  const hoy = new Date(); hoy.setHours(0,0,0,0)

  // Un cobro "vencido" es PENDIENTE/PARCIAL cuya fecha_limite_pago ya pasó
  const esVencido = c => !['PAGADO','CANCELADO'].includes(c.estatus) && new Date(c.fecha_limite_pago) < hoy

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.arrendatario_nombre || '').toLowerCase().includes(q)
      || (c.referencia_pago || '').toLowerCase().includes(q)
      || (c.unidad_numero || '').toLowerCase().includes(q)
    const matchEst = filtroEstatus === 'Todos'
      || (filtroEstatus === 'EN_MORA' && (c.estatus === 'EN_MORA' || esVencido(c)))
      || (filtroEstatus === 'PENDIENTE' && c.estatus === 'PENDIENTE' && !esVencido(c))
      || (filtroEstatus === 'PAGADO' && c.estatus === 'PAGADO')

    // Lógica de período:
    // • mesFiltro === 0 → Todos los registros (universo completo)
    // • PAGADO: aparece si fecha_pago_real cae en el período O si su mes programado coincide
    // • Resto: mes/anio programado del cobro coincide con el filtro
    let matchMes
    if (mesFiltro === 0) {
      matchMes = true
    } else if (c.estatus === 'PAGADO') {
      const fp = c.fecha_pago_real ? new Date(c.fecha_pago_real) : null
      const porFechaPago = fp && fp.getMonth() + 1 === mesFiltro && fp.getFullYear() === anioFiltro
      const porMesProg  = c.mes === mesFiltro && c.anio === anioFiltro
      matchMes = porFechaPago || porMesProg
    } else {
      matchMes = c.mes === mesFiltro && c.anio === anioFiltro
    }

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

  // KPIs congruentes con el período seleccionado
  const inPeriodo = c => {
    if (mesFiltro === 0) return true
    if (c.estatus === 'PAGADO') {
      const fp = c.fecha_pago_real ? new Date(c.fecha_pago_real) : null
      return fp && fp.getMonth() + 1 === mesFiltro && fp.getFullYear() === anioFiltro
    }
    return c.mes === mesFiltro && c.anio === anioFiltro
  }
  const listaPeriodo = lista.filter(inPeriodo)
  // Cartera vencida: cobros PENDIENTE/PARCIAL cuya fecha_limite_pago ya pasó (cualquier período)
  const cartVencida = lista.filter(c => esVencido(c))

  const pagados    = listaPeriodo.filter(c => c.estatus === 'PAGADO').length
  const pendientes = listaPeriodo.filter(c => c.estatus === 'PENDIENTE' && !esVencido(c)).length
  const mora       = cartVencida.length
  const totalCobrado   = listaPeriodo.filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalPendiente = listaPeriodo.filter(c => c.estatus !== 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)

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

      {tab === 'reporte' && (
        <ReporteCobranza lista={lista} mesFiltro={mesFiltro} anioFiltro={anioFiltro} />
      )}

      {tab === 'cobros' && <><div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Búsqueda */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar arrendatario, referencia, unidad..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} />
        </div>

        {/* Selector período combinado mes+año */}
        <select
          value={mesFiltro === 0 ? '0-0' : `${mesFiltro}-${anioFiltro}`}
          onChange={e => {
            const [m, y] = e.target.value.split('-').map(Number)
            setMesFiltro(m); setAnioFiltro(y || anioFiltro)
          }}
          style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: mesFiltro === 0 ? 700 : 400, minWidth: '140px' }}>
          <option value="0-0">Todos los períodos</option>
          {[2025, 2026, 2027].flatMap(y =>
            MES_NOMBRES.slice(1).map((m, i) => (
              <option key={`${i+1}-${y}`} value={`${i+1}-${y}`}>{m} {y}</option>
            ))
          )}
        </select>

        {/* Filtro estatus */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'Todos', label: 'Todos' },
            { key: 'PENDIENTE', label: '⏳ Vigentes' },
            { key: 'EN_MORA', label: '🔴 Vencidos' },
            { key: 'PAGADO', label: '✅ Pagados' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltroEstatus(key)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroEstatus === key ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroEstatus === key ? 'var(--color-primary)' : 'white',
              color: filtroEstatus === key ? 'white' : 'var(--color-text-light)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* KPIs — debajo de los filtros, reflejan el período seleccionado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <KPICard title={mesFiltro === 0 ? 'Pagados' : `Pagados ${MES_NOMBRES[mesFiltro]}`} value={pagados} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Vigentes" value={pendientes} icon={Clock} color="var(--color-warning)" />
        <KPICard title="Cartera Vencida" value={mora} icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title={mesFiltro === 0 ? 'Total Cobrado' : `Cobrado ${MES_NOMBRES[mesFiltro]}`} value={`$${(totalCobrado/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
        <KPICard title="Por Cobrar" value={`$${(totalPendiente/1000).toFixed(0)}K`} icon={DollarSign} color="var(--color-secondary)" />
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
