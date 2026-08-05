import { useState, useRef, useEffect } from 'react'
import {
  FileText, Plus, Search, AlertTriangle, CheckCircle,
  Clock, TrendingUp, X, Upload, Paperclip, MessageSquare,
  Send, Download, Eye, ChevronRight
} from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const SEMAFORO = {
  VIGENTE:    { color: 'var(--color-success)',  label: 'Vigente' },
  INDEFINIDO: { color: 'var(--color-primary)',  label: 'Indefinido' },
  ALERTA:     { color: 'var(--color-warning)',  label: 'Por vencer' },
  CRITICO:    { color: 'var(--color-danger)',   label: 'Crítico' },
  VENCIDO:    { color: 'var(--color-danger)',   label: 'Vencido' },
  CANCELADO:  { color: '#9CA3AF',               label: 'Cancelado' },
}

function diasLabel(dias, semaforo) {
  const s = SEMAFORO[semaforo] || SEMAFORO.VIGENTE
  if (dias === null || dias === undefined) return { texto: s.label, color: s.color }
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)}d`, color: 'var(--color-danger)' }
  if (dias === 0) return { texto: 'Vence hoy', color: 'var(--color-danger)' }
  return { texto: `${dias}d restantes`, color: s.color }
}

// ─── Fila de tabla ───────────────────────────────────────────────────────────

function ContratoRow({ c, onClick }) {
  const { texto, color } = diasLabel(c.dias_restantes, c.semaforo_vencimiento)
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onClick(c)}>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>{c.folio}</span>
          {c.archivo_contrato_url && <Paperclip size={12} color="#9CA3AF" title="Contrato adjunto" />}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.tipo_contrato}</div>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.inmueble_nombre}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{c.unidad_numero}</div>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.arrendatario_nombre}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>{c.arrendatario_rfc}</div>
      </td>
      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{fmt(c.renta_mensual)}</div>
        {c.deposito_garantia > 0 && <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Dep. {fmt(c.deposito_garantia)}</div>}
      </td>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ fontSize: '12px' }}>{c.fecha_inicio}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{c.fecha_fin ?? '—'}</div>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color, background: color + '18', padding: '3px 8px', borderRadius: '12px' }}>{texto}</span>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <StatusBadge status={c.estado_id} />
      </td>
      <td style={{ padding: '13px 16px' }}>
        <ChevronRight size={16} color="#9CA3AF" />
      </td>
    </tr>
  )
}

// ─── Modal de detalle con tabs ───────────────────────────────────────────────

function DetalleModal({ contrato: c, onClose, onUpdated }) {
  const [tab, setTab] = useState('datos')
  const [notas, setNotas] = useState([])
  const [notasLoading, setNotasLoading] = useState(false)
  const [nuevaNota, setNuevaNota] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(c?.archivo_contrato_url || null)
  const [notaErr, setNotaErr] = useState(null)
  const pdfRef = useRef()

  useEffect(() => {
    if (!c) return
    setPdfUrl(c.archivo_contrato_url || null)
    setNotas([])
    if (tab === 'notas') cargarNotas()
  }, [c])

  useEffect(() => {
    if (tab === 'notas' && c) cargarNotas()
  }, [tab])

  const cargarNotas = async () => {
    setNotasLoading(true)
    const { data } = await supabase.from('notas_contrato')
      .select('*').eq('contrato_id', c.id).order('created_at', { ascending: false })
    setNotasLoading(false)
    setNotas(data ?? [])
  }

  const agregarNota = async () => {
    if (!nuevaNota.trim()) return
    setSavingNota(true); setNotaErr(null)
    const { error } = await supabase.from('notas_contrato').insert({
      contrato_id: c.id,
      texto: nuevaNota.trim(),
      tipo: 'NOTA',
      autor_nombre: 'Administrador',
    })
    setSavingNota(false)
    if (error) { setNotaErr(error.message); return }
    setNuevaNota('')
    cargarNotas()
  }

  const subirPDF = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.name.match(/\.pdf$/i)) { alert('Solo se permiten archivos PDF'); return }
    setUploadingPDF(true)
    const path = `contratos/${c.id}/contrato_firmado.pdf`
    const { error: upErr } = await supabase.storage.from('contratos-docs').upload(path, file, { upsert: true })
    if (upErr) { setUploadingPDF(false); alert('Error al subir: ' + upErr.message); return }
    const { data: urlData } = supabase.storage.from('contratos-docs').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('contratos_arrendamiento').update({ archivo_contrato_url: url }).eq('id', c.id)
    setPdfUrl(url)
    setUploadingPDF(false)
    onUpdated?.()
  }

  if (!c) return null
  const { texto, color } = diasLabel(c.dias_restantes, c.semaforo_vencimiento)

  const Tab = ({ id, label, icon: Icon }) => (
    <button onClick={() => setTab(id)} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
      color: tab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
      fontWeight: tab === id ? 700 : 400, fontSize: '13px', whiteSpace: 'nowrap',
    }}>
      <Icon size={14} />{label}
    </button>
  )

  const Campo = ({ label, val }) => val ? (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', padding: '9px 0', borderBottom: '1px solid #F9FAFB' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', paddingTop: '1px' }}>{label}</span>
      <span style={{ fontSize: '13px' }}>{val}</span>
    </div>
  ) : null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contrato</div>
              <h2 style={{ margin: '2px 0 4px', fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>{c.folio}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status={c.estado_id} />
                <span style={{ fontSize: '12px', fontWeight: 600, color }}>{texto}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9CA3AF' }}><X size={20} /></button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
            <Tab id="datos"     label="Datos del contrato" icon={FileText} />
            <Tab id="documento" label="Contrato firmado"   icon={Paperclip} />
            <Tab id="notas"     label="Notas y comentarios" icon={MessageSquare} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── TAB DATOS ── */}
          {tab === 'datos' && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
                {c.arrendatario_nombre} · {c.inmueble_nombre} – {c.unidad_numero} · {c.tipo_unidad} {c.m2_totales ? `(${c.m2_totales}m²)` : ''}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Renta y pagos</div>
                  <Campo label="Renta mensual"     val={fmt(c.renta_mensual)} />
                  <Campo label="Depósito garantía" val={c.deposito_garantia > 0 ? fmt(c.deposito_garantia) : null} />
                  <Campo label="Día límite pago"   val={c.dia_limite_pago ? `Día ${c.dia_limite_pago}` : null} />
                  <Campo label="Mora"              val={c.penalizacion_mora_pct ? `${c.penalizacion_mora_pct}% mensual` : null} />
                  <Campo label="Cuenta BBVA"       val={c.cuenta_banco_pago} />
                  <Campo label="CLABE"             val={c.clabe_interbancaria} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Vigencia y condiciones</div>
                  <Campo label="Tipo"             val={c.tipo_contrato} />
                  <Campo label="Inicio"           val={c.fecha_inicio} />
                  <Campo label="Vencimiento"      val={c.fecha_fin ?? 'Tiempo indeterminado'} />
                  <Campo label="Fecha firma"      val={c.fecha_firma} />
                  <Campo label="Giro autorizado"  val={c.giro_autorizado} />
                  <Campo label="Horario"          val={c.horario_inicio ? `${c.horario_inicio} – ${c.horario_fin}` : null} />
                  <Campo label="Cancelación antic." val={c.cancelacion_anticipada_meses ? `${c.cancelacion_anticipada_meses} meses` : null} />
                </div>
              </div>
              {(c.fiador_nombre || c.fiador_rfc) && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador</div>
                  <Campo label="Nombre"    val={c.fiador_nombre} />
                  <Campo label="RFC"       val={c.fiador_rfc} />
                  <Campo label="Domicilio" val={c.fiador_domicilio} />
                </div>
              )}
              {/* Acciones */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                {[
                  ['Renovar contrato', 'var(--color-primary)'],
                  ['Generar addenda', 'var(--color-secondary)'],
                  ['Ver cobranza', 'var(--color-success)'],
                  ['Cancelar', 'var(--color-danger)'],
                ].map(([label, bg]) => (
                  <button key={label} style={{ padding: '8px 14px', background: bg, color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB DOCUMENTO PDF ── */}
          {tab === 'documento' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              {pdfUrl ? (
                <>
                  <div style={{ width: '100%', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                    <Paperclip size={32} color="var(--color-primary)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Contrato firmado adjunto</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '16px' }}>Archivo PDF · {c.folio}</div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <a href={pdfUrl} target="_blank" rel="noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '9px 18px', background: 'var(--color-primary)', color: 'white',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                      }}>
                        <Eye size={15} /> Ver PDF
                      </a>
                      <a href={pdfUrl} download style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '9px 18px', background: '#F3F4F6', color: 'var(--color-text)',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                      }}>
                        <Download size={15} /> Descargar
                      </a>
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-text-light)', fontSize: '12px' }}>¿Deseas reemplazar el archivo?</div>
                  <button onClick={() => pdfRef.current?.click()} disabled={uploadingPDF} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', background: '#F3F4F6', border: '1.5px dashed #D1D5DB',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}>
                    <Upload size={15} /> {uploadingPDF ? 'Subiendo...' : 'Reemplazar PDF'}
                  </button>
                </>
              ) : (
                <div
                  onClick={() => pdfRef.current?.click()}
                  style={{
                    width: '100%', minHeight: '240px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '12px',
                    border: '2px dashed #D1D5DB', borderRadius: '14px', cursor: 'pointer',
                    background: '#FAFAFA', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                >
                  <Upload size={36} color="#9CA3AF" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
                      {uploadingPDF ? 'Subiendo archivo...' : 'Adjuntar contrato firmado'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                      {uploadingPDF ? 'Por favor espera...' : 'Haz clic o arrastra el PDF aquí'}
                    </div>
                  </div>
                </div>
              )}
              <input ref={pdfRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={subirPDF} />
            </div>
          )}

          {/* ── TAB NOTAS ── */}
          {tab === 'notas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Input nueva nota */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={nuevaNota}
                    onChange={e => setNuevaNota(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); agregarNota() } }}
                    placeholder="Agregar nota o comentario... (Enter para enviar)"
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB',
                      borderRadius: '10px', fontSize: '13px', resize: 'none', boxSizing: 'border-box',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  {notaErr && <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>{notaErr}</div>}
                </div>
                <button onClick={agregarNota} disabled={savingNota || !nuevaNota.trim()} style={{
                  padding: '10px 14px', background: nuevaNota.trim() ? 'var(--color-primary)' : '#E5E7EB',
                  color: nuevaNota.trim() ? 'white' : '#9CA3AF', border: 'none', borderRadius: '10px',
                  cursor: nuevaNota.trim() ? 'pointer' : 'default', transition: 'all 0.15s',
                }}>
                  <Send size={16} />
                </button>
              </div>

              {/* Lista de notas */}
              {notasLoading
                ? <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><LoadingSpinner /></div>
                : notas.length === 0
                  ? <EmptyState title="Sin notas" description="Agrega la primera nota o comentario sobre este contrato." />
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {notas.map(n => (
                        <div key={n.id} style={{ background: '#F9FAFB', borderRadius: '10px', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {n.autor_nombre || 'Sistema'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                              {new Date(n.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.texto}</p>
                        </div>
                      ))}
                    </div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal Nuevo Contrato ────────────────────────────────────────────────────

function NuevoContratoModal({ onClose, onCreated }) {
  const { data: arrendatarios } = usePRP('prp_arrendatarios', { order: { col: 'nombre_razon_social' } })
  const { data: unidades } = usePRP('prp_unidades', { filters: [['estado_id', 'eq', 'DISPONIBLE']], order: { col: 'numero_local' } })

  const [form, setForm] = useState({
    arrendatario_id: '', unidad_id: '', tipo_contrato: 'ANUAL',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '', renta_mensual: '', cuota_mant: '0', deposito_garantia: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.arrendatario_id || !form.unidad_id || !form.renta_mensual) {
      setError('Completa los campos obligatorios.'); return
    }
    setSaving(true); setError(null)
    try {
      const { data: res, error: err } = await supabase.rpc('crear_contrato', {
        p_arrendatario_id: form.arrendatario_id,
        p_unidad_id: form.unidad_id,
        p_tipo_contrato: form.tipo_contrato,
        p_fecha_inicio: form.fecha_inicio,
        p_fecha_fin: form.fecha_fin || null,
        p_renta_mensual: parseFloat(form.renta_mensual),
        p_cuota_mant: parseFloat(form.cuota_mant) || 0,
        p_deposito_garantia: parseFloat(form.deposito_garantia) || parseFloat(form.renta_mensual) * 2,
      })
      if (err) throw err
      setSuccess(`Contrato creado exitosamente.`)
      setTimeout(() => { onCreated?.(); onClose() }, 1800)
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', marginBottom: '5px', textTransform: 'uppercase' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>Nuevo Contrato</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-light)' }}>Folio generado automáticamente</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>
        {success ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success)' }}>{success}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'grid', gap: '16px' }}>
            {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Arrendatario *</label>
                <select value={form.arrendatario_id} onChange={e => set('arrendatario_id', e.target.value)} style={inp} required>
                  <option value="">— Seleccionar —</option>
                  {(arrendatarios ?? []).map(a => <option key={a.id} value={a.id}>{a.nombre_razon_social} ({a.rfc})</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Unidad disponible *</label>
                <select value={form.unidad_id} onChange={e => set('unidad_id', e.target.value)} style={inp} required>
                  <option value="">— Seleccionar —</option>
                  {(unidades ?? []).map(u => <option key={u.id} value={u.id}>{u.inmueble_nombre} — {u.numero_local} ({u.tipo_unidad}, {u.m2_totales}m²)</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Tipo de contrato</label>
                <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} style={inp}>
                  {[['ANUAL','Anual'],['SEMESTRAL','Semestral'],['MENSUAL','Mensual'],['EVENTUAL','Eventual']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Renta mensual *</label>
                <input type="number" value={form.renta_mensual} onChange={e => set('renta_mensual', e.target.value)} placeholder="0.00" style={inp} required min="1" step="0.01" />
              </div>
              <div>
                <label style={lbl}>Cuota mantenimiento</label>
                <input type="number" value={form.cuota_mant} onChange={e => set('cuota_mant', e.target.value)} placeholder="0" style={inp} min="0" step="0.01" />
              </div>
              <div>
                <label style={lbl}>Depósito en garantía</label>
                <input type="number" value={form.deposito_garantia} onChange={e => set('deposito_garantia', e.target.value)} placeholder={form.renta_mensual ? String(parseFloat(form.renta_mensual) * 2) : '0'} style={inp} min="0" step="0.01" />
              </div>
              <div>
                <label style={lbl}>Fecha inicio *</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={inp} required />
              </div>
              <div>
                <label style={lbl}>Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} style={inp} min={form.fecha_inicio} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
              <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Creando...' : 'Crear Contrato'}
              </button>
              <button type="button" onClick={onClose} style={{ padding: '11px 20px', background: '#F3F4F6', color: 'var(--color-text)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Contratos() {
  const [search, setSearch] = useState('')
  const [filtroEst, setFiltroEst] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading } = usePRP('prp_contratos', { order: { col: 'fecha_inicio', asc: false } })

  const lista = data ?? []
  const ESTADOS = ['Todos', 'VIGENTE', 'VENCIDO', 'EN_MORA', 'CANCELADO']

  const filtrados = lista.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || (c.folio || '').toLowerCase().includes(q)
      || (c.arrendatario_nombre || '').toLowerCase().includes(q)
      || (c.inmueble_nombre || '').toLowerCase().includes(q)
      || (c.unidad_numero || '').toLowerCase().includes(q)
    const matchE = filtroEst === 'Todos' || c.estado_id === filtroEst
    return matchQ && matchE
  })

  const vigentes = lista.filter(c => c.estado_id === 'VIGENTE').length
  const vencidos = lista.filter(c => c.semaforo_vencimiento === 'VENCIDO').length
  const porVencer = lista.filter(c => ['ALERTA','CRITICO'].includes(c.semaforo_vencimiento)).length
  const rentaTotal = lista.filter(c => ['VIGENTE','INDEFINIDO'].includes(c.semaforo_vencimiento)).reduce((a, b) => a + (parseFloat(b.renta_mensual) || 0), 0)
  const conPDF = lista.filter(c => c.archivo_contrato_url).length

  return (
    <div style={{ padding: '24px', maxWidth: '1300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Contratos de Arrendamiento</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>
            {lista.length} contratos · <span style={{ color: conPDF === lista.length ? 'var(--color-success)' : 'var(--color-warning)' }}>{conPDF} con PDF adjunto</span>
          </p>
        </div>
        <button onClick={() => setShowNuevo(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-primary)', color: 'white', border: 'none',
          borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={16} /> Nuevo Contrato
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Vigentes"         value={vigentes}               icon={CheckCircle}  color="var(--color-success)" />
        <KPICard title="Vencidos"         value={vencidos}               icon={AlertTriangle} color="var(--color-danger)" />
        <KPICard title="Por vencer (60d)" value={porVencer}              icon={Clock}         color="var(--color-warning)" />
        <KPICard title="Renta total/mes"  value={`$${(rentaTotal/1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-primary)" />
        <KPICard title="Con PDF adjunto"  value={`${conPDF}/${lista.length}`} icon={Paperclip} color="var(--color-secondary)" />
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, arrendatario, unidad..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setFiltroEst(e)} style={{
              padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroEst === e ? 'var(--color-primary)' : '#E5E7EB',
              background: filtroEst === e ? 'var(--color-primary)' : 'white',
              color: filtroEst === e ? 'white' : 'var(--color-text-light)',
            }}>{e}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner /></div>
          : filtrados.length === 0
            ? <EmptyState title="Sin contratos" description="No hay contratos que coincidan con los filtros." />
            : <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {['Contrato','Inmueble','Arrendatario','Renta','Vigencia','Plazo','Estado',''].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Renta' ? 'right' : 'left', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-light)', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(c => <ContratoRow key={c.id} c={c} onClick={setSelected} />)}
                  </tbody>
                </table>
              </div>
        }
      </div>

      <DetalleModal
        contrato={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => setRefreshKey(k => k + 1)}
      />
      {showNuevo && (
        <NuevoContratoModal onClose={() => setShowNuevo(false)} onCreated={() => setRefreshKey(k => k + 1)} />
      )}
    </div>
  )
}
