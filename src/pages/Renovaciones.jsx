import { useState, useRef } from 'react'
import { RefreshCw, FileText, CheckCircle, Clock, AlertTriangle, Eye, Pencil, Trash2, X, Save, Paperclip, Wand2, Upload, ExternalLink, User, Shield } from 'lucide-react'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/ui/StatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import ElaborarContratoModal from '../components/ui/ElaborarContratoModal'

// Sólo aparecen contratos con estatus_proceso = EN_RENOVACION
// Salen de aquí cuando se cambia a EN_EJECUCION (contrato firmado y vigente)

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
function fmtFecha(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${parseInt(d)} ${MESES[parseInt(m)]} ${y}`
}

// ─── Panel lateral de detalle/edición ────────────────────────────────────────

function PanelDetalle({ contrato: c, initialEditMode = false, onClose, onUpdated, onCerrar }) {
  const [tab, setTab] = useState('datos')
  const [editMode, setEditMode] = useState(initialEditMode)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [confirmCerrar, setConfirmCerrar] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [showElaborar, setShowElaborar] = useState(false)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(c?.contrato_pdf_url || c?.archivo_contrato_url || null)
  const pdfRef = useRef()

  const startEdit = () => {
    setEditForm({
      renta_mensual:     c.renta_mensual ?? '',
      deposito_garantia: c.deposito_garantia ?? '',
      fecha_inicio:      c.fecha_inicio ?? '',
      fecha_fin:         c.fecha_fin ?? '',
      giro_autorizado:   c.giro_autorizado ?? '',
      dia_pago:          c.dia_pago ?? '',
      penalizacion_pct:  c.penalizacion_pct ?? '',
      pagares_cantidad:  c.pagares_cantidad ?? '',
      fiador_nombre:     c.fiador_nombre ?? '',
      fiador_rfc:        c.fiador_rfc ?? '',
      fiador_telefono:   c.fiador_telefono ?? '',
      fiador_domicilio:  c.fiador_domicilio ?? '',
      notas:             c.notas ?? '',
    })
    setErr(null)
    setEditMode(true)
  }

  const guardar = async () => {
    setSaving(true); setErr(null)
    const { error } = await supabase.from('contratos').update({
      renta_mensual:     editForm.renta_mensual     ? parseFloat(editForm.renta_mensual)     : null,
      deposito_garantia: editForm.deposito_garantia ? parseFloat(editForm.deposito_garantia) : null,
      fecha_inicio:      editForm.fecha_inicio      || null,
      fecha_fin:         editForm.fecha_fin         || null,
      giro_autorizado:   editForm.giro_autorizado   || null,
      dia_pago:          editForm.dia_pago          ? parseInt(editForm.dia_pago)            : null,
      penalizacion_pct:  editForm.penalizacion_pct  ? parseFloat(editForm.penalizacion_pct) : null,
      pagares_cantidad:  editForm.pagares_cantidad   ? parseInt(editForm.pagares_cantidad)   : null,
      fiador_nombre:     editForm.fiador_nombre     || null,
      fiador_rfc:        editForm.fiador_rfc        || null,
      fiador_telefono:   editForm.fiador_telefono   || null,
      fiador_domicilio:  editForm.fiador_domicilio  || null,
      notas:             editForm.notas             || null,
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    setEditMode(false)
    onUpdated?.()
  }

  const subirPDF = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.name.match(/\.pdf$/i)) { alert('Solo se permiten archivos PDF'); return }
    setUploadingPDF(true)
    const path = `contratos/${c.id}/contrato_firmado.pdf`
    const { error: upErr } = await supabase.storage.from('contratos-firmados').upload(path, file, { upsert: true })
    if (upErr) { setUploadingPDF(false); alert('Error al subir: ' + upErr.message); return }
    const { data: urlData } = supabase.storage.from('contratos-firmados').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('contratos').update({ contrato_pdf_url: url }).eq('id', c.id)
    setPdfUrl(url)
    setUploadingPDF(false)
    onUpdated?.()
  }

  const cerrarRenovacion = async () => {
    setCerrando(true)
    await supabase.from('contratos').update({
      estatus_proceso: 'EN_EJECUCION',
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)
    setCerrando(false)
    setConfirmCerrar(false)
    onCerrar?.()
  }

  const inp = (field, type = 'text', placeholder = '') => (
    <input type={type} value={editForm[field] ?? ''} placeholder={placeholder}
      onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
      style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
  )
  const ERow = ({ label, children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '6px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  )
  const Campo = ({ label, val, mono }) => (
    <div style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: val ? 'var(--color-text)' : '#D1D5DB', fontFamily: mono ? 'monospace' : 'inherit' }}>{val || '—'}</div>
    </div>
  )

  const TabBtn = ({ id, label, icon: Icon }) => (
    <button onClick={() => { setTab(id); setEditMode(false) }} style={{
      display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px',
      background: tab === id ? 'white' : 'transparent',
      color: tab === id ? '#7C3AED' : '#6B7280',
      border: 'none', borderBottom: tab === id ? '2px solid #7C3AED' : '2px solid transparent',
      fontSize: '12px', fontWeight: tab === id ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      <Icon size={13} />{label}
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 560, height: '100%', background: 'white', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #E5E7EB', background: '#F5F3FF', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <RefreshCw size={13} color="#7C3AED" />
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em' }}>En renovación</span>
                {pdfUrl && <span style={{ fontSize: '10px', background: '#DCFCE7', color: 'var(--color-success)', fontWeight: 700, padding: '2px 7px', borderRadius: '8px' }}>PDF firmado ✓</span>}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>{c.folio}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                {c.arrendatario_nombre} · {(c.unidad_numero || c.locales_display || '—')}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
          </div>
          {/* KPIs rápidos */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            {[
              { label: 'Inicio', val: fmtFecha(c.fecha_inicio) },
              { label: 'Vencimiento', val: fmtFecha(c.fecha_fin) },
              { label: 'Renta', val: fmt(c.renta_mensual) },
              { label: 'Depósito', val: c.deposito_garantia ? fmt(c.deposito_garantia) : '—' },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, background: 'white', borderRadius: '7px', padding: '8px 10px', border: '1px solid #DDD6FE' }}>
                <div style={{ fontSize: '9px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', marginTop: '1px' }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA', flexShrink: 0, overflowX: 'auto' }}>
          <TabBtn id="datos"     label="Datos del contrato"  icon={FileText} />
          <TabBtn id="personas"  label="Arrendatario / Fiador" icon={User} />
          <TabBtn id="pdf"       label={pdfUrl ? 'PDF firmado ✓' : 'Contrato firmado'} icon={Paperclip} />
        </div>

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── TAB: DATOS DEL CONTRATO ── */}
          {tab === 'datos' && !editMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Condiciones del contrato</span>
                <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  <Pencil size={12} /> Editar
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <div>
                  <Campo label="Tipo contrato"   val={c.tipo_contrato} />
                  <Campo label="Giro autorizado" val={c.giro_autorizado} />
                  <Campo label="Renta mensual"   val={c.renta_mensual ? fmt(c.renta_mensual) : null} />
                  <Campo label="Depósito"        val={c.deposito_garantia ? fmt(c.deposito_garantia) : null} />
                  <Campo label="Día de pago"     val={c.dia_pago ? `Día ${c.dia_pago}` : null} />
                  <Campo label="Mora mensual"    val={c.penalizacion_pct ? `${c.penalizacion_pct}%` : null} />
                  <Campo label="Pagarés"         val={c.pagares_cantidad ? `${c.pagares_cantidad} pagarés` : null} />
                </div>
                <div>
                  <Campo label="Fecha inicio"   val={fmtFecha(c.fecha_inicio)} />
                  <Campo label="Fecha fin"      val={fmtFecha(c.fecha_fin)} />
                  <Campo label="Folio"          val={c.folio} mono />
                  <Campo label="Contrato ant."  val={c.contrato_anterior_id ? 'Referencia previa' : null} />
                  <Campo label="Cuenta BBVA"    val={c.cuenta_bbva} mono />
                  <Campo label="CLABE"          val={c.clabe_interbancaria} mono />
                </div>
              </div>
              {c.notas && (
                <div style={{ marginTop: '14px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Notas / Condiciones especiales</div>
                  <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.6 }}>{c.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: DATOS - MODO EDICIÓN ── */}
          {tab === 'datos' && editMode && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', marginBottom: '14px' }}>Editar datos del contrato</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div>
                  <ERow label="Renta mensual">{inp('renta_mensual','number','$0.00')}</ERow>
                  <ERow label="Depósito">{inp('deposito_garantia','number','$0.00')}</ERow>
                  <ERow label="Día de pago">{inp('dia_pago','number','1-31')}</ERow>
                  <ERow label="Mora %">{inp('penalizacion_pct','number','5')}</ERow>
                  <ERow label="Pagarés">{inp('pagares_cantidad','number','0')}</ERow>
                </div>
                <div>
                  <ERow label="Inicio">{inp('fecha_inicio','date')}</ERow>
                  <ERow label="Vencimiento">{inp('fecha_fin','date')}</ERow>
                  <ERow label="Giro">{inp('giro_autorizado')}</ERow>
                </div>
              </div>
              <div style={{ marginTop: '14px', padding: '12px', background: '#FFF8F0', borderRadius: '8px', border: '1px solid #FBBF24' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '10px' }}>Fiador / Aval</div>
                <ERow label="Nombre">{inp('fiador_nombre')}</ERow>
                <ERow label="RFC">{inp('fiador_rfc')}</ERow>
                <ERow label="Teléfono">{inp('fiador_telefono','tel')}</ERow>
                <ERow label="Domicilio">{inp('fiador_domicilio')}</ERow>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Notas / Condiciones especiales</div>
                <textarea value={editForm.notas} onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              {err && <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '8px' }}>{err}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button onClick={guardar} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  <Save size={14} />{saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button onClick={() => setEditMode(false)} style={{ padding: '9px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── TAB: ARRENDATARIO / FIADOR ── */}
          {tab === 'personas' && (
            <div>
              {/* Arrendatario */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={14} color="var(--color-primary)" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Arrendatario</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <div>
                    <Campo label="Nombre completo" val={c.arrendatario_nombre} />
                    <Campo label="RFC"             val={c.arrendatario_rfc}    mono />
                    <Campo label="Teléfono"        val={c.arrendatario_telefono} />
                  </div>
                  <div>
                    <Campo label="Email"           val={c.arrendatario_email} />
                    <Campo label="Domicilio"       val={c.arrendatario_domicilio} />
                    <Campo label="Local(es)"       val={c.unidad_numero || c.locales_display} />
                  </div>
                </div>
              </div>

              {/* Fiador */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={14} color="#D97706" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>Fiador / Aval</span>
                  {!c.fiador_nombre && (
                    <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>Sin fiador</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <div>
                    <Campo label="Nombre"    val={c.fiador_nombre} />
                    <Campo label="RFC"       val={c.fiador_rfc}    mono />
                    <Campo label="Teléfono"  val={c.fiador_telefono} />
                  </div>
                  <div>
                    <Campo label="Domicilio" val={c.fiador_domicilio} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: PDF FIRMADO ── */}
          {tab === 'pdf' && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '14px' }}>Contrato firmado</div>
              <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.6 }}>
                Sube el PDF del contrato una vez que haya sido firmado por ambas partes. Puede reemplazarse cuantas veces sea necesario hasta la versión final.
              </p>

              {pdfUrl ? (
                <div style={{ padding: '16px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Paperclip size={16} color="var(--color-success)" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>Contrato firmado adjunto</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href={pdfUrl} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--color-success)', color: 'white', borderRadius: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                      <ExternalLink size={13} /> Ver PDF
                    </a>
                    <button onClick={() => pdfRef.current?.click()} disabled={uploadingPDF}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <Upload size={13} /> {uploadingPDF ? 'Subiendo...' : 'Reemplazar PDF'}
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => pdfRef.current?.click()}
                  style={{ border: '2px dashed #D1D5DB', borderRadius: '10px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: uploadingPDF ? '#F9FAFB' : 'white', marginBottom: '16px' }}>
                  <Upload size={36} color="#9CA3AF" style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                    {uploadingPDF ? 'Subiendo archivo...' : 'Subir contrato firmado'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {uploadingPDF ? 'Por favor espera...' : 'Haz clic o arrastra el PDF aquí'}
                  </div>
                </div>
              )}

              <input ref={pdfRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={subirPDF} />

              {!pdfUrl && (
                <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
                  ⚠️ Se recomienda adjuntar el PDF firmado antes de marcar el contrato como en ejecución.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal elaborar contrato */}
        {showElaborar && (
          <ElaborarContratoModal
            prospecto={{
              nombre:           c.arrendatario_nombre,
              domicilio:        c.arrendatario_domicilio || '',
              rfc:              c.arrendatario_rfc || '',
              telefono:         c.arrendatario_telefono || '',
              giro_solicitado:  c.giro_autorizado || '',
              fiador_nombre:    c.fiador_nombre || '',
              fiador_telefono:  c.fiador_telefono || '',
              fiador_domicilio: c.fiador_domicilio || '',
              monto_ofertado:   c.renta_mensual,
            }}
            contrato={{
              fecha_fin:        c.fecha_fin,
              dia_pago:         c.dia_pago,
              duracion_meses:   12,
              penalizacion_pct: c.penalizacion_pct,
              deposito_garantia: c.deposito_garantia,
              renta_mensual:    c.renta_mensual,
            }}
            unidad={{ numero_local: c.unidad_numero || c.locales_display }}
            onClose={() => setShowElaborar(false)}
          />
        )}

        {/* Footer — acciones */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA', flexShrink: 0 }}>
          {!confirmCerrar ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setShowElaborar(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                <Wand2 size={15} /> Elaborar Contrato
              </button>
              <button onClick={() => setConfirmCerrar(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                <CheckCircle size={15} /> Marcar como en ejecución
              </button>
            </div>
          ) : (
            <div style={{ background: '#F0FFF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontSize: '13px', margin: '0 0 6px', fontWeight: 600 }}>
                ¿Confirmas que <strong>{c.folio}</strong> ya fue firmado y está vigente?
              </p>
              <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 12px' }}>
                Saldrá de Renovaciones y pasará a contratos activos (EN_EJECUCION).
              </p>
              {!pdfUrl && (
                <p style={{ fontSize: '11px', color: '#D97706', background: '#FFFBEB', padding: '6px 10px', borderRadius: '6px', margin: '0 0 10px' }}>
                  ⚠️ No se ha adjuntado el PDF firmado. Puedes continuar sin él.
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={cerrarRenovacion} disabled={cerrando}
                  style={{ flex: 1, padding: '9px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {cerrando ? 'Procesando...' : 'Sí, en ejecución'}
                </button>
                <button onClick={() => setConfirmCerrar(false)}
                  style={{ padding: '9px 14px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal Renovaciones ───────────────────────────────────────────

export default function Renovaciones() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [seleccionado, setSeleccionado] = useState(null)
  const [openInEdit, setOpenInEdit] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data, loading } = usePRP('prp_contratos', {
    order: { col: 'fecha_fin', asc: true },
    refreshKey,
  })

  const refresh = () => setRefreshKey(k => k + 1)

  // Sólo contratos EN_RENOVACION
  const lista = (data ?? []).filter(c => c.estatus_proceso === 'EN_RENOVACION')

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase().trim()
    return !q
      || (c.folio || '').toLowerCase().includes(q)
      || (c.arrendatario_nombre || '').toLowerCase().includes(q)
      || (c.locales_display || '').toLowerCase().includes(q)
      || (c.unidad_numero || '').toLowerCase().includes(q)
  })

  // Métricas propias del proceso de renovación
  const total        = lista.length
  const conPDF       = lista.filter(c => c.archivo_contrato_url).length
  const yaVencidos   = lista.filter(c => c.fecha_fin && c.fecha_fin < new Date().toISOString().split('T')[0]).length
  const porVencer30  = lista.filter(c => {
    if (!c.fecha_fin) return false
    const dias = Math.ceil((new Date(c.fecha_fin) - new Date()) / 86400000)
    return dias >= 0 && dias <= 30
  }).length
  const sinFiador    = lista.filter(c => !c.fiador_nombre).length

  const KPI = ({ title, value, sub, color, icon: Icon }) => (
    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '16px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>{sub}</div>}
    </div>
  )

  const diasLabel = c => {
    if (!c.fecha_fin) return { texto: 'Indefinido', color: '#9CA3AF' }
    const dias = Math.ceil((new Date(c.fecha_fin) - new Date()) / 86400000)
    if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)}d`, color: 'var(--color-danger)' }
    if (dias <= 30) return { texto: `${dias}d restantes`, color: '#D97706' }
    return { texto: `${dias}d restantes`, color: 'var(--color-success)' }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1300px' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={18} color="#7C3AED" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>Renovaciones</h1>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              Contratos en proceso de renovación · Permanecen aquí hasta ser firmados y ejecutados
            </p>
          </div>
        </div>
      </div>

      {/* Aviso informativo */}
      <div style={{ padding: '10px 14px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #DDD6FE', fontSize: '12px', color: '#5B21B6', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RefreshCw size={13} />
        Un contrato sale de este panel cuando se marca como <strong>&nbsp;En ejecución</strong> — significa que ya fue firmado y está vigente.
      </div>

      {/* KPIs específicos de renovación */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
        <KPI title="En renovación"     value={total}       sub="contratos activos"         color="#7C3AED"                    icon={RefreshCw} />
        <KPI title="Vencidos"          value={yaVencidos}  sub="contrato original vencido" color="var(--color-danger)"        icon={AlertTriangle} />
        <KPI title="Vencen en 30 días" value={porVencer30} sub="requieren atención urgente" color="var(--color-warning)"       icon={Clock} />
        <KPI title="Sin fiador"        value={sinFiador}   sub="pendientes de aval"         color="#D97706"                    icon={FileText} />
        <KPI title="Con PDF adjunto"   value={`${conPDF}/${total}`} sub="documentos cargados" color="var(--color-success)"   icon={Paperclip} />
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '16px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, local, folio..."
          style={{ width: '100%', maxWidth: '480px', padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
          : filtrados.length === 0
            ? <EmptyState title="Sin contratos en renovación" description="No hay contratos en proceso de renovación actualmente." />
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F5F3FF' }}>
                      {['Contrato', 'Local(es)', 'Arrendatario', 'Renta', 'Vencimiento original', 'Plazo', 'Proceso', 'Vigencia', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Renta' ? 'right' : 'left', fontWeight: 600, fontSize: '11px', color: '#5B21B6', borderBottom: '1px solid #DDD6FE', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(c => {
                      const { texto, color } = diasLabel(c)
                      return (
                        <tr key={c.id}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                          onClick={() => setSeleccionado(c)}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#7C3AED' }}>{c.folio}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{c.tipo_contrato}</div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            {(c.unidad_numero || c.locales_display || '—').split(',').map(l => (
                              <span key={l} style={{ display: 'inline-block', background: '#EEF2FF', color: 'var(--color-primary)', fontWeight: 700, fontSize: '11px', padding: '2px 8px', borderRadius: '10px', marginRight: '4px', marginBottom: '2px' }}>{l.trim()}</span>
                            ))}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.arrendatario_nombre}</div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>{c.arrendatario_rfc}</div>
                          </td>
                          <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{fmt(c.renta_mensual)}</div>
                            {c.deposito_garantia > 0 && <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Dep. {fmt(c.deposito_garantia)}</div>}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontSize: '12px' }}>{fmtFecha(c.fecha_inicio)}</div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{fmtFecha(c.fecha_fin)}</div>
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color, background: color + '18', padding: '3px 8px', borderRadius: '12px' }}>{texto}</span>
                          </td>
                          {/* Estatus proceso */}
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, background: '#F5F3FF', color: '#7C3AED', padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                              EN RENOVACIÓN
                            </span>
                          </td>
                          {/* Estatus vigencia */}
                          <td style={{ padding: '13px 16px' }}>
                            {(() => {
                              const hoy = new Date().toISOString().split('T')[0]
                              const vencido = c.fecha_fin && c.fecha_fin < hoy
                              return (
                                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, background: vencido ? '#FEF2F2' : '#F0FDF4', color: vencido ? 'var(--color-danger)' : 'var(--color-success)', padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                  {vencido ? 'VENCIDO' : 'VIGENTE'}
                                </span>
                              )
                            })()}
                          </td>
                          <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button title="Ver detalle" onClick={e => { e.stopPropagation(); setOpenInEdit(false); setSeleccionado(c) }}
                                style={{ width: 30, height: 30, border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Eye size={14} />
                              </button>
                              <button title="Editar" onClick={e => { e.stopPropagation(); setOpenInEdit(true); setSeleccionado(c) }}
                                style={{ width: 30, height: 30, border: '1px solid #DBEAFE', borderRadius: '6px', background: '#EFF6FF', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Pencil size={14} />
                              </button>
                              <button title="Eliminar" onClick={e => { e.stopPropagation(); setConfirmDelete(c) }}
                                style={{ width: 30, height: 30, border: '1px solid #FECACA', borderRadius: '6px', background: '#FFF5F5', cursor: 'pointer', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Panel detalle */}
      {seleccionado && (
        <PanelDetalle
          contrato={seleccionado}
          initialEditMode={openInEdit}
          onClose={() => { setSeleccionado(null); setOpenInEdit(false) }}
          onUpdated={() => { refresh(); setSeleccionado(null); setOpenInEdit(false) }}
          onCerrar={() => { refresh(); setSeleccionado(null); setOpenInEdit(false) }}
        />
      )}

      {/* Modal confirmación eliminar */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>Eliminar contrato en renovación</div>
            <p style={{ fontSize: '13px', margin: '0 0 8px' }}>
              ¿Eliminar <strong>{confirmDelete.folio}</strong> ({confirmDelete.arrendatario_nombre})?
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-danger)', background: '#FFF5F5', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA', margin: '0 0 20px' }}>
              Acción irreversible. Se eliminará el contrato y sus locales asignados.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                style={{ padding: '9px 20px', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
              <button disabled={deleting} onClick={async () => {
                setDeleting(true)
                await supabase.from('contratos_locales').delete().eq('contrato_id', confirmDelete.id)
                await supabase.from('contratos').delete().eq('id', confirmDelete.id)
                setDeleting(false); setConfirmDelete(null); refresh()
              }}
                style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'var(--color-danger)', color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
