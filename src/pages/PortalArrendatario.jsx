import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  LogOut, Download, FileText, CheckCircle, Clock, AlertTriangle,
  DollarSign, ChevronDown, ChevronUp, Eye, Home, CreditCard, Upload, X,
  User, Phone, Mail, MapPin, Building2, CalendarDays, ShieldCheck
} from 'lucide-react'

const OCR_FN = '/.netlify/functions/extraer-documento'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }
const MES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MES_CORTO = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const ESTATUS_META = {
  PAGADO:    { label: 'Pagado',    color: '#16a34a', bg: '#D1FAE5' },
  PARCIAL:   { label: 'Parcial',   color: '#7C3AED', bg: '#EDE9FE' },
  PENDIENTE: { label: 'Pendiente', color: '#D97706', bg: '#FEF3C7' },
  EN_MORA:   { label: 'En mora',   color: '#DC2626', bg: '#FEE2E2' },
  CANCELADO: { label: 'Cancelado', color: '#6B7280', bg: '#F3F4F6' },
}

const TIPO_META = {
  RENTA:      { label: 'Renta',    color: '#0A66C2' },
  SANCION:    { label: 'Sanción',  color: '#DC2626' },
  RECARGO:    { label: 'Recargo',  color: '#D97706' },
  CUOTA_MANT: { label: 'Mantenimiento', color: '#6B7280' },
  OTRO:       { label: 'Otro',     color: '#9CA3AF' },
}

// ── Componente: badge estatus ─────────────────────────────────────────────────
function EstatusBadge({ estatus }) {
  const m = ESTATUS_META[estatus] || ESTATUS_META.PENDIENTE
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color: m.color, background: m.bg, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

// ── Modal: subir comprobante de pago ─────────────────────────────────────────
function ModalComprobante({ cobro, arrendatarioId, onClose, onSaved }) {
  const fileRef  = useRef()
  const [step, setStep]         = useState('foto')  // 'foto' | 'confirm'
  const [preview, setPreview]   = useState(null)
  const [b64, setB64]           = useState(null)
  const [mtype, setMtype]       = useState('image/jpeg')
  const [ocr, setOcr]           = useState({})
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState(null)
  const [saved, setSaved]       = useState(false)

  // Form fields (pre-llenados por OCR)
  const [form, setForm] = useState({
    fecha_pago: '', monto: '', banco: '', referencia: '', forma_pago: 'Transferencia', notas: ''
  })
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleFile = async (file) => {
    if (!file) return
    setErr(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setMtype(file.type)

    // Leer base64
    const b = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload  = () => res(r.result.split(',')[1])
      r.onerror = rej
      r.readAsDataURL(file)
    })
    setB64(b)

    // OCR automático
    setLoading(true)
    try {
      const res = await fetch(OCR_FN, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: b, media_type: file.type, tipo_doc: 'COMPROBANTE_PAGO' }),
      })
      const j = await res.json()
      if (j.datos) {
        const d = j.datos
        setOcr(d)
        setForm({
          fecha_pago:  d.fecha_pago || d.fecha || '',
          monto:       String(d.monto || d.total || ''),
          banco:       d.banco || d.institucion || '',
          referencia:  d.referencia || d.folio || d.numero_operacion || '',
          forma_pago:  d.forma_pago || 'Transferencia',
          notas: '',
        })
      }
    } catch (_) { /* OCR opcional — no bloquea */ }
    finally { setLoading(false) }
    setStep('confirm')
  }

  const handleSubmit = async () => {
    setLoading(true); setErr(null)
    try {
      // Subir imagen a Storage
      let imagen_url = null, imagen_path = null
      if (b64) {
        const ext  = mtype.split('/')[1] || 'jpg'
        const path = `${arrendatarioId}/${cobro.id}_${Date.now()}.${ext}`
        const bin  = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const { error: upErr } = await supabase.storage
          .from('comprobantes-pago')
          .upload(path, bin, { contentType: mtype, upsert: false })
        if (!upErr) {
          imagen_path = path
          const { data: pub } = supabase.storage.from('comprobantes-pago').getPublicUrl(path)
          imagen_url = pub?.publicUrl || null
        }
      }

      const { error: dbErr } = await supabase.from('comprobantes_pago').insert({
        cobro_id:        cobro.id,
        arrendatario_id: arrendatarioId,
        imagen_url,
        imagen_path,
        ocr_datos:  ocr,
        fecha_pago: form.fecha_pago || null,
        monto:      parseFloat(form.monto) || null,
        banco:      form.banco || null,
        referencia: form.referencia || null,
        forma_pago: form.forma_pago || null,
        notas:      form.notas || null,
        estado:     'ENVIADO',
      })
      if (dbErr) throw dbErr
      setSaved(true)
      setTimeout(() => { onSaved?.(); onClose() }, 1800)
    } catch (e) {
      setErr(e.message || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const fInp = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }
  const fLbl = { fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', padding: '20px 20px 32px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1F2937' }}>Subir comprobante</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {cobro.tipo} — {cobro.mes && ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][cobro.mes]} {cobro.anio}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {saved && (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#057642', fontSize: 16 }}>¡Comprobante enviado!</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>La administración revisará tu pago.</div>
          </div>
        )}

        {!saved && step === 'foto' && (
          <div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>
              Toma una foto de tu comprobante de pago. La IA leerá los datos automáticamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Botón cámara (móvil) */}
              <button
                onClick={() => { fileRef.current.removeAttribute('capture'); fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click() }}
                style={{ padding: '16px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                📷 Tomar foto con la cámara
              </button>
              {/* Botón galería / archivo */}
              <button
                onClick={() => { fileRef.current.removeAttribute('capture'); fileRef.current.click() }}
                style={{ padding: '14px', background: '#F3F4F6', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                🖼 Seleccionar de galería / archivo
              </button>
            </div>
            <input ref={fileRef} type='file' accept='image/*' style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = '' }} />
          </div>
        )}

        {!saved && step === 'confirm' && (
          <div>
            {/* Preview imagen */}
            {preview && (
              <div style={{ marginBottom: 14, textAlign: 'center' }}>
                <img src={preview} alt="comprobante" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 10, border: '1px solid #E5E7EB', objectFit: 'contain' }} />
                {loading && <div style={{ fontSize: 12, color: '#0A66C2', marginTop: 6 }}>⏳ Leyendo datos con IA…</div>}
              </div>
            )}

            {/* Campos confirmación */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={fLbl}>Fecha de pago</label>
                  <input type='date' value={form.fecha_pago} onChange={e => setF('fecha_pago', e.target.value)} style={fInp} />
                </div>
                <div>
                  <label style={fLbl}>Monto pagado</label>
                  <input type='number' value={form.monto} onChange={e => setF('monto', e.target.value)} placeholder='0.00' style={fInp} />
                </div>
              </div>
              <div>
                <label style={fLbl}>Banco / institución</label>
                <input value={form.banco} onChange={e => setF('banco', e.target.value)} placeholder='BBVA, Banorte, SPEI…' style={fInp} />
              </div>
              <div>
                <label style={fLbl}>Referencia / folio</label>
                <input value={form.referencia} onChange={e => setF('referencia', e.target.value)} placeholder='Número de operación' style={fInp} />
              </div>
              <div>
                <label style={fLbl}>Forma de pago</label>
                <select value={form.forma_pago} onChange={e => setF('forma_pago', e.target.value)} style={{ ...fInp, cursor: 'pointer' }}>
                  {['Transferencia','SPEI','Depósito en ventanilla','Efectivo','Cheque','Tarjeta'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={fLbl}>Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setF('notas', e.target.value)} rows={2} placeholder='Cualquier comentario adicional…' style={{ ...fInp, resize: 'vertical' }} />
              </div>
            </div>

            {err && <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEE2E2', color: '#DC2626', borderRadius: 8, fontSize: 13 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setStep('foto')} style={{ flex: 1, padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← Cambiar foto
              </button>
              <button onClick={handleSubmit} disabled={loading || !form.monto} style={{ flex: 2, padding: '12px', background: loading || !form.monto ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading || !form.monto ? 'default' : 'pointer' }}>
                {loading ? 'Enviando…' : '✓ Enviar comprobante'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente: tarjeta de un cobro ──────────────────────────────────────────
function CobrosCard({ cobro, arrendatarioId }) {
  const [open, setOpen] = useState(false)
  const [modalComp, setModalComp] = useState(false)
  const ingresos = cobro.ingresos_json || []
  const m = ESTATUS_META[cobro.estatus] || ESTATUS_META.PENDIENTE
  const tipo = TIPO_META[cobro.tipo] || TIPO_META.RENTA
  const pct = cobro.monto_total > 0
    ? Math.min(100, ((parseFloat(cobro.monto_pagado) || 0) / parseFloat(cobro.monto_total)) * 100)
    : 0

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${cobro.estatus === 'EN_MORA' ? '#FCA5A5' : '#E5E7EB'}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Cabecera del cobro */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {/* Mes / año */}
        <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: cobro.estatus === 'PAGADO' ? '#D1FAE5' : cobro.estatus === 'EN_MORA' ? '#FEE2E2' : '#EEF2FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: cobro.estatus === 'PAGADO' ? '#16a34a' : cobro.estatus === 'EN_MORA' ? '#DC2626' : '#0A66C2' }}>{MES_CORTO[cobro.mes]}</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: cobro.estatus === 'PAGADO' ? '#16a34a' : cobro.estatus === 'EN_MORA' ? '#DC2626' : '#0A66C2' }}>{cobro.anio}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1F2937' }}>{fmt(cobro.monto_total)}</span>
            <EstatusBadge estatus={cobro.estatus} />
            {cobro.tipo !== 'RENTA' && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: tipo.color, background: tipo.color + '18', padding: '2px 7px', borderRadius: '10px' }}>{tipo.label}</span>
            )}
          </div>
          {cobro.estatus === 'PARCIAL' && (
            <div style={{ marginTop: '5px' }}>
              <div style={{ height: '5px', background: '#E5E7EB', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#7C3AED', borderRadius: '5px' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600 }}>{fmt(cobro.monto_pagado)} pagado ({pct.toFixed(0)}%)</span>
            </div>
          )}
          {cobro.fecha_pago_real && (
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>Pagado el {cobro.fecha_pago_real}</div>
          )}
          {ingresos.length > 0 && (
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
              {ingresos.filter(i => i.factura_pdf_url).length} factura(s) disponible(s)
            </div>
          )}
        </div>

        <ChevronDown size={18} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {/* Detalle expandible */}
      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 16px', background: '#FAFAFA' }}>
          {ingresos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#9CA3AF', fontSize: '13px' }}>
              Sin movimientos registrados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ingresos.map((ing, idx) => (
                <div key={ing.id || idx} style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>{fmt(ing.importe)}</span>
                        {ing.tipo_concepto && ing.tipo_concepto !== 'RENTA' && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: (TIPO_META[ing.tipo_concepto] || TIPO_META.OTRO).color, background: (TIPO_META[ing.tipo_concepto] || TIPO_META.OTRO).color + '18', padding: '2px 7px', borderRadius: '10px' }}>
                            {(TIPO_META[ing.tipo_concepto] || TIPO_META.OTRO).label}
                          </span>
                        )}
                        {ing.factura_numero && (
                          <span style={{ fontSize: '10px', color: '#6B7280', fontFamily: 'monospace', background: '#F3F4F6', padding: '2px 7px', borderRadius: '8px' }}>
                            Factura {ing.factura_serie || ''}{ing.factura_numero}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                        {ing.fecha} · {ing.forma_pago}{ing.referencia ? ` · ${ing.referencia}` : ''}
                      </div>
                    </div>
                    {/* Botones descarga */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {ing.factura_pdf_url && (
                        <a href={ing.factura_pdf_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#DC2626', color: 'white', borderRadius: '7px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                          <Download size={12} /> PDF
                        </a>
                      )}
                      {ing.factura_xml_url && (
                        <a href={ing.factura_xml_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#16a34a', color: 'white', borderRadius: '7px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                          <Download size={12} /> XML
                        </a>
                      )}
                      {!ing.factura_pdf_url && !ing.factura_xml_url && (
                        <span style={{ fontSize: '11px', color: '#9CA3AF', padding: '6px 10px', background: '#F9FAFB', borderRadius: '7px' }}>Sin factura</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Si está pendiente o en mora */}
          {(cobro.estatus === 'PENDIENTE' || cobro.estatus === 'EN_MORA' || cobro.estatus === 'PARCIAL') && (
            <div style={{ marginTop: '12px', padding: '12px 14px', background: cobro.estatus === 'EN_MORA' ? '#FEF2F2' : '#FFFBEB', borderRadius: '10px', border: `1px solid ${cobro.estatus === 'EN_MORA' ? '#FCA5A5' : '#FDE68A'}` }}>
              <div style={{ fontSize: '12px', color: cobro.estatus === 'EN_MORA' ? '#DC2626' : '#92400E', fontWeight: 600, marginBottom: 6 }}>
                {cobro.estatus === 'EN_MORA'
                  ? `⚠ Pago vencido — Saldo pendiente: ${fmt((parseFloat(cobro.monto_total) || 0) - (parseFloat(cobro.monto_pagado) || 0))}`
                  : `Saldo pendiente: ${fmt((parseFloat(cobro.monto_total) || 0) - (parseFloat(cobro.monto_pagado) || 0))}`}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: 10 }}>
                Realiza tu depósito/transferencia a la cuenta BBVA indicada en tu contrato y sube aquí tu comprobante.
              </div>
              {/* Botón subir comprobante */}
              {arrendatarioId && (
                <button
                  onClick={() => setModalComp(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                >
                  <Upload size={15} /> Subir comprobante de pago
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal comprobante */}
      {modalComp && (
        <ModalComprobante
          cobro={cobro}
          arrendatarioId={arrendatarioId}
          onClose={() => setModalComp(false)}
          onSaved={() => setModalComp(false)}
        />
      )}
    </div>
  )
}

// ── Login del portal (email + contraseña) ────────────────────────────────────
function PortalLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setLoading(false)
    if (error) setErr('Correo o contraseña incorrectos. Contacta a la administración.')
    else onLogin()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1A3C5E 0%, #0A66C2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '40px 36px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Home size={28} color="white" />
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#1A3C5E' }}>Portal del Arrendatario</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Plaza IWOL — Metepec, México</p>
        </div>

        <form onSubmit={handleSubmit}>
          {err && (
            <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {err}
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Correo electrónico
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="tucorreo@ejemplo.com"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contraseña
            </label>
            <input
              type="password" value={pass} onChange={e => setPass(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', background: loading ? '#9CA3AF' : '#0A66C2', color: 'white',
            border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          }}>
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9CA3AF', marginTop: '20px', lineHeight: 1.6 }}>
          ¿Problemas para acceder? Comunícate con la administración de Plaza IWOL.
        </p>
      </div>
    </div>
  )
}

// ── Tab: Mi Perfil ───────────────────────────────────────────────────────────
function TabMiPerfil({ arrendatario, contrato }) {
  const Row = ({ label, val, mono }) => val ? (
    <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', gap:10, borderBottom:'1px solid #F3F4F6', padding:'10px 0' }}>
      <span style={{ fontSize:12, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.4px' }}>{label}</span>
      <span style={{ fontSize:13, fontFamily: mono ? 'monospace' : 'inherit', color:'#111827' }}>{val}</span>
    </div>
  ) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Avatar / nombre */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'20px 18px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:60, height:60, borderRadius:16, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <User size={28} color="#0A66C2" />
        </div>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#1F2937' }}>{arrendatario.nombre_razon_social}</div>
          <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>
            {arrendatario.tipo_persona === 'MORAL' ? 'Persona Moral' : 'Persona Física'}
            {arrendatario.representante_legal ? ` · Rep: ${arrendatario.representante_legal}` : ''}
          </div>
        </div>
      </div>

      {/* Datos de contacto */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'16px 18px' }}>
        <div style={{ fontSize:12, fontWeight:800, color:'#0A66C2', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Datos de contacto</div>
        <Row label="RFC"      val={arrendatario.rfc}      mono />
        <Row label="Teléfono" val={arrendatario.telefono} />
        <Row label="Email"    val={arrendatario.email} />
        <Row label="Domicilio" val={arrendatario.domicilio} />
        <Row label="Giro"     val={arrendatario.nombre_negocio} />
      </div>

      {/* Datos del contrato */}
      {contrato && (
        <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#0A66C2', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Mi Local</div>
          <Row label="Local(es)"     val={contrato.locales_display} />
          <Row label="Folio contrato" val={contrato.folio} mono />
          <Row label="Renta mensual" val={contrato.renta_mensual ? '$' + parseFloat(contrato.renta_mensual).toLocaleString('es-MX', {minimumFractionDigits:2}) : null} />
          <Row label="Inicio"        val={contrato.fecha_inicio} />
          <Row label="Vencimiento"   val={contrato.fecha_fin ?? 'Tiempo indeterminado'} />
          <Row label="Estatus"       val={contrato.estatus} />
        </div>
      )}
    </div>
  )
}

// ── Tab: Mi Contrato ─────────────────────────────────────────────────────────
function TabMiContrato({ contrato }) {
  if (!contrato) return (
    <div style={{ textAlign:'center', padding:48, color:'#9CA3AF', background:'white', borderRadius:14 }}>
      <FileText size={36} color="#E5E7EB" style={{ marginBottom:12 }} />
      <div>Sin contrato asociado</div>
    </div>
  )

  const Row = ({ label, val, mono, span }) => val ? (
    <div style={{ gridColumn: span ? '1 / -1' : undefined, display:'grid', gridTemplateColumns:'160px 1fr', gap:10, borderBottom:'1px solid #F3F4F6', padding:'10px 0' }}>
      <span style={{ fontSize:12, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.4px' }}>{label}</span>
      <span style={{ fontSize:13, fontFamily: mono ? 'monospace' : 'inherit', color:'#111827' }}>{val}</span>
    </div>
  ) : null

  const fmtMoney = n => n ? '$' + parseFloat(n).toLocaleString('es-MX', {minimumFractionDigits:2}) : null

  const SEMAFORO = { VIGENTE:'#057642', VENCIDO:'#B24020', BORRADOR:'#6B7280' }
  const sc = SEMAFORO[contrato.estatus] || '#E8A020'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Header contrato */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ShieldCheck size={26} color="#0A66C2" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:16, fontWeight:800, color:'#1F2937', fontFamily:'monospace' }}>{contrato.folio}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background: sc+'20', color: sc }}>{contrato.estatus}</span>
            </div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>
              {contrato.locales_display} · {contrato.tipo_contrato || 'Arrendamiento'}
            </div>
          </div>
          {contrato.contrato_pdf_url && (
            <a href={contrato.contrato_pdf_url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 14px', background:'#DC2626', color:'white', borderRadius:9, fontSize:12, fontWeight:700, textDecoration:'none' }}>
              <Download size={14} /> PDF
            </a>
          )}
        </div>
      </div>

      {/* Condiciones económicas */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'16px 18px' }}>
        <div style={{ fontSize:12, fontWeight:800, color:'#0A66C2', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Condiciones económicas</div>
        <Row label="Renta mensual"       val={fmtMoney(contrato.renta_mensual)} />
        <Row label="Renta sin IVA"       val={fmtMoney(contrato.renta_sin_iva)} />
        <Row label="Depósito garantía"   val={fmtMoney(contrato.deposito_garantia)} />
        <Row label="Incremento anual"    val={contrato.incremento_anual_pct ? contrato.incremento_anual_pct + '%' : null} />
        <Row label="Penalización mora"   val={contrato.penalizacion_pct ? contrato.penalizacion_pct + '% mensual' : null} />
        <Row label="Día de pago"         val={contrato.dia_pago ? `Día ${contrato.dia_pago} de cada mes` : null} />
      </div>

      {/* Vigencia */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'16px 18px' }}>
        <div style={{ fontSize:12, fontWeight:800, color:'#0A66C2', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Vigencia</div>
        <Row label="Fecha inicio"        val={contrato.fecha_inicio} />
        <Row label="Fecha vencimiento"   val={contrato.fecha_fin ?? 'Tiempo indeterminado'} />
        <Row label="Giro autorizado"     val={contrato.giro_autorizado} />
      </div>

      {/* Fiador */}
      {contrato.fiador_nombre && (
        <div style={{ background:'white', borderRadius:14, border:'1px solid #E5E7EB', padding:'16px 18px' }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#0A66C2', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Fiador / Aval</div>
          <Row label="Nombre"   val={contrato.fiador_nombre} />
          <Row label="RFC"      val={contrato.fiador_rfc} mono />
          <Row label="Domicilio" val={contrato.fiador_domicilio} />
        </div>
      )}
    </div>
  )
}

// ── Página principal del portal ───────────────────────────────────────────────
export default function PortalArrendatario({ embedded = false }) {
  const [session, setSession]       = useState(null)
  const [arrendatario, setArrendatario] = useState(null)
  const [contrato, setContrato]     = useState(null)
  const [cobros, setCobros]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('pagos')  // 'pagos' | 'contrato' | 'perfil'
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const [filtroEst, setFiltroEst]   = useState('Todos')

  // Escuchar cambios de sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Cargar datos cuando hay sesión
  useEffect(() => {
    if (!session) { setLoading(false); return }
    cargarDatos()
  }, [session])

  const cargarDatos = async () => {
    setLoading(true)
    // Datos completos del arrendatario
    const { data: arr } = await supabase
      .from('arrendatarios')
      .select('id, nombre_razon_social, rfc, tipo_persona, telefono, email, domicilio, nombre_negocio, representante_legal, auth_user_id')
      .eq('auth_user_id', session.user.id)
      .single()

    if (!arr) { setLoading(false); return }
    setArrendatario(arr)

    // Contrato vigente del arrendatario
    const { data: ctrs } = await supabase
      .from('prp_contratos')
      .select('*')
      .eq('arrendatario_id', arr.id)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
    setContrato(ctrs?.[0] ?? null)

    // Cobros del portal
    const { data: rows } = await supabase
      .from('portal_mis_cobros')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    setCobros(rows ?? [])
    setLoading(false)
  }

  const cerrarSesion = () => supabase.auth.signOut()

  // ── Sin sesión → login (no mostrar si embedded — el usuario ya está logueado) ──
  if (!session && !embedded) return <PortalLogin onLogin={cargarDatos} />
  if (!session && embedded)  return null  // espera que la sesión cargue

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#6B7280' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#0A66C2', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Cargando tu información...
      </div>
    </div>
  )

  if (!arrendatario) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: '#1F2937', marginBottom: '8px' }}>Cuenta no vinculada</h2>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Tu cuenta no está asociada a ningún contrato. Contacta a la administración de Plaza IWOL.</p>
        <button onClick={cerrarSesion} style={{ marginTop: '20px', padding: '10px 20px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cerrar sesión</button>
      </div>
    </div>
  )

  // ── KPIs ──
  const totalPagado    = cobros.filter(c => c.estatus === 'PAGADO').reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalPendiente = cobros.filter(c => c.estatus !== 'PAGADO' && c.estatus !== 'CANCELADO').reduce((a, b) => a + ((parseFloat(b.monto_total) || 0) - (parseFloat(b.monto_pagado) || 0)), 0)
  const pagados        = cobros.filter(c => c.estatus === 'PAGADO').length
  const pendientes     = cobros.filter(c => c.estatus === 'PENDIENTE' || c.estatus === 'PARCIAL').length
  const mora           = cobros.filter(c => c.estatus === 'EN_MORA').length
  const totalFacturas  = cobros.reduce((a, b) => a + (parseInt(b.num_pdfs) || 0), 0)

  // ── Tab Mis Pagos: lógica de filtros ────────────────────────────────────────
  const anios    = [...new Set(cobros.map(c => c.anio))].sort((a, b) => b - a)
  const filtrados = cobros.filter(c => {
    const matchAnio = c.anio === anioFiltro
    const matchEst  = filtroEst === 'Todos' || c.estatus === filtroEst
    return matchAnio && matchEst
  })

  // Navegación inferior
  const TABS = [
    { id: 'pagos',    label: 'Mis Pagos',    icon: CreditCard },
    { id: 'contrato', label: 'Mi Contrato',  icon: ShieldCheck },
    { id: 'perfil',   label: 'Mi Perfil',    icon: User },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', paddingBottom: 72 }}>
      {/* Header */}
      <div style={{ background: '#1A3C5E', padding: '0 20px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Portal IWOL</div>
              <div style={{ fontSize: '10px', color: '#93C5FD', lineHeight: 1.2 }}>
                {arrendatario.nombre_razon_social}
              </div>
            </div>
          </div>
          <button onClick={cerrarSesion} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#93C5FD', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 16px' }}>

        {/* ── TAB: MIS PAGOS ─────────────────────────────────────────── */}
        {tab === 'pagos' && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Total pagado', value: fmt(totalPagado), color: '#16a34a', bg: '#D1FAE5', icon: CheckCircle },
                { label: 'Por pagar', value: fmt(totalPendiente), color: totalPendiente > 0 ? '#D97706' : '#16a34a', bg: totalPendiente > 0 ? '#FEF3C7' : '#D1FAE5', icon: totalPendiente > 0 ? Clock : CheckCircle },
                { label: `${pagados} pagados`, value: `${cobros.length} cobros`, color: '#0A66C2', bg: '#EEF2FF', icon: DollarSign },
                { label: `${totalFacturas} facturas`, value: 'disponibles', color: '#6B7280', bg: '#F3F4F6', icon: FileText },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1F2937' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alerta mora */}
            {mora > 0 && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '14px' }}>Tienes {mora} pago(s) en mora</div>
                  <div style={{ fontSize: '12px', color: '#991B1B', marginTop: '2px' }}>Por favor realiza tu pago a la brevedad para evitar cargos adicionales.</div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {anios.map(a => (
                  <button key={a} onClick={() => setAnioFiltro(a)} style={{
                    padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1.5px solid',
                    borderColor: anioFiltro === a ? '#0A66C2' : '#E5E7EB',
                    background: anioFiltro === a ? '#0A66C2' : 'white',
                    color: anioFiltro === a ? 'white' : '#6B7280',
                  }}>{a}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                {['Todos', 'PAGADO', 'PENDIENTE', 'EN_MORA'].map(e => (
                  <button key={e} onClick={() => setFiltroEst(e)} style={{
                    padding: '7px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                    borderColor: filtroEst === e ? '#0A66C2' : '#E5E7EB',
                    background: filtroEst === e ? '#EEF2FF' : 'white',
                    color: filtroEst === e ? '#0A66C2' : '#6B7280',
                  }}>{e === 'Todos' ? 'Todos' : (ESTATUS_META[e]?.label || e)}</button>
                ))}
              </div>
            </div>

            {/* Lista de cobros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', color: '#9CA3AF' }}>
                  <FileText size={36} color="#E5E7EB" style={{ marginBottom: '12px' }} />
                  <div style={{ fontWeight: 600 }}>Sin movimientos para este período</div>
                </div>
              ) : (
                filtrados.map(cobro => <CobrosCard key={cobro.id} cobro={cobro} arrendatarioId={arrendatario?.id} />)
              )}
            </div>
          </>
        )}

        {/* ── TAB: MI CONTRATO ───────────────────────────────────────── */}
        {tab === 'contrato' && <TabMiContrato contrato={contrato} />}

        {/* ── TAB: MI PERFIL ─────────────────────────────────────────── */}
        {tab === 'perfil' && <TabMiPerfil arrendatario={arrendatario} contrato={contrato} />}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', paddingTop: 28, paddingBottom: '20px' }}>
          Plaza IWOL — Metepec, México · {new Date().getFullYear()}<br />
          Powered by RANNIX Consulting
        </div>
      </div>

      {/* ── Barra de navegación inferior ──────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #E5E7EB',
        display: 'flex', justifyContent: 'center',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 700, width: '100%', display: 'flex' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '10px 0', border: 'none', background: 'transparent',
              cursor: 'pointer',
              color: tab === id ? '#0A66C2' : '#9CA3AF',
              borderTop: `2.5px solid ${tab === id ? '#0A66C2' : 'transparent'}`,
              fontWeight: tab === id ? 700 : 500,
            }}>
              <Icon size={20} />
              <span style={{ fontSize: 11 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
