import { useModuleAudit } from '../hooks/useAudit'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import NuevoContratoModalShared from '../components/ui/NuevoContratoModal'
import {
  FileText, Plus, Search, AlertTriangle, CheckCircle,
  Clock, TrendingUp, X, Upload, Paperclip, MessageSquare,
  Send, Download, Eye, ChevronRight, Wand2, Pencil, Save
} from 'lucide-react'
import ElaborarContratoModal from '../components/ui/ElaborarContratoModal'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase } from '../lib/supabase'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const SEMAFORO = {
  VIGENTE:       { color: 'var(--color-success)',  label: 'Vigente' },
  INDEFINIDO:    { color: 'var(--color-primary)',  label: 'Indefinido' },
  ALERTA:        { color: 'var(--color-warning)',  label: 'Por vencer' },
  CRITICO:       { color: 'var(--color-danger)',   label: 'Crítico' },
  VENCIDO:       { color: 'var(--color-danger)',   label: 'Vencido' },
  CANCELADO:     { color: '#9CA3AF',               label: 'Cancelado' },
  RESCISION:     { color: '#9CA3AF',               label: 'Rescisión' },
  EN_RENOVACION: { color: '#7C3AED',               label: 'En renovación' },
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
        <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.unidad_numero}</div>
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

function DetalleModal({ contrato: c, onClose, onUpdated, diasAnticip = 60 }) {
  const [tab, setTab] = useState('datos')
  const [notas, setNotas] = useState([])
  const [notasLoading, setNotasLoading] = useState(false)
  const [nuevaNota, setNuevaNota] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(c?.archivo_contrato_url || null)
  const [notaErr, setNotaErr] = useState(null)
  const [showElaborar, setShowElaborar] = useState(false)
  const [showRenovar, setShowRenovar] = useState(false)
  const [showCancelar, setShowCancelar] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState(null)
  const pdfRef = useRef()

  const puedeRenovar = c && ['VIGENTE', 'ALERTA', 'CRITICO', 'VENCIDO'].includes(c.semaforo_vencimiento) && !['CANCELADO', 'RESCISION', 'EN_RENOVACION'].includes(c.estado_id)
  const puedeCancelar = c && !['CANCELADO', 'RESCISION'].includes(c.estatus)

  const startEdit = () => {
    setEditForm({
      renta_mensual:              c.renta_mensual ?? '',
      deposito_garantia:          c.deposito_garantia ?? '',
      dia_limite_pago:            c.dia_limite_pago ?? '',
      penalizacion_mora_pct:      c.penalizacion_mora_pct ?? '',
      cuenta_banco_pago:          c.cuenta_banco_pago ?? '',
      clabe_interbancaria:        c.clabe_interbancaria ?? '',
      fecha_inicio:               c.fecha_inicio ?? '',
      fecha_fin:                  c.fecha_fin ?? '',
      fecha_firma:                c.fecha_firma ?? '',
      giro_autorizado:            c.giro_autorizado ?? '',
      horario_inicio:             c.horario_inicio ?? '',
      horario_fin:                c.horario_fin ?? '',
      cancelacion_anticipada_meses: c.cancelacion_anticipada_meses ?? '',
      fiador_nombre:              c.fiador_nombre ?? '',
      fiador_rfc:                 c.fiador_rfc ?? '',
      fiador_domicilio:           c.fiador_domicilio ?? '',
    })
    setEditErr(null)
    setEditMode(true)
  }

  const guardarEdit = async () => {
    setSavingEdit(true); setEditErr(null)
    // Columnas reales de public.contratos (dia_pago y penalizacion_pct son los nombres en tabla)
    const payload = {
      renta_mensual:    editForm.renta_mensual    ? parseFloat(editForm.renta_mensual)    : null,
      deposito_garantia: editForm.deposito_garantia ? parseFloat(editForm.deposito_garantia) : null,
      dia_pago:         editForm.dia_limite_pago  ? parseInt(editForm.dia_limite_pago)   : null,
      penalizacion_pct: editForm.penalizacion_mora_pct ? parseFloat(editForm.penalizacion_mora_pct) : null,
      fecha_inicio:     editForm.fecha_inicio     || null,
      fecha_fin:        editForm.fecha_fin        || null,
    }
    // Campos adicionales que existen en la tabla si los tiene el registro actual
    if ('giro_autorizado' in c)              payload.giro_autorizado = editForm.giro_autorizado || null
    if ('fecha_firma' in c)                  payload.fecha_firma = editForm.fecha_firma || null
    if ('cuenta_banco_pago' in c)            payload.cuenta_banco_pago = editForm.cuenta_banco_pago || null
    if ('clabe_interbancaria' in c)          payload.clabe_interbancaria = editForm.clabe_interbancaria || null
    if ('horario_inicio' in c)               payload.horario_inicio = editForm.horario_inicio || null
    if ('horario_fin' in c)                  payload.horario_fin = editForm.horario_fin || null
    if ('cancelacion_anticipada_meses' in c) payload.cancelacion_anticipada_meses = editForm.cancelacion_anticipada_meses ? parseInt(editForm.cancelacion_anticipada_meses) : null
    if ('fiador_nombre' in c)                payload.fiador_nombre = editForm.fiador_nombre || null
    if ('fiador_rfc' in c)                   payload.fiador_rfc = editForm.fiador_rfc || null
    if ('fiador_domicilio' in c)             payload.fiador_domicilio = editForm.fiador_domicilio || null

    const { error } = await supabase.from('contratos').update(payload).eq('id', c.id)
    setSavingEdit(false)
    if (error) { setEditErr(error.message); return }
    setEditMode(false)
    onUpdated?.()
  }

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
    const { error: upErr } = await supabase.storage.from('contratos-firmados').upload(path, file, { upsert: true })
    if (upErr) { setUploadingPDF(false); alert('Error al subir: ' + upErr.message); return }
    const { data: urlData } = supabase.storage.from('contratos-firmados').getPublicUrl(path)
    const url = urlData.publicUrl
    await supabase.from('contratos').update({ contrato_pdf_url: url }).eq('id', c.id)
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

  const Campo = ({ label, val }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', padding: '9px 0', borderBottom: '1px solid #F9FAFB' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase', paddingTop: '1px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: val ? 'var(--color-text)' : '#D1D5DB', fontStyle: val ? 'normal' : 'italic' }}>{val || '—'}</span>
    </div>
  )

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
                  {c.arrendatario_nombre} · {c.inmueble_nombre} – {c.unidad_numero} · {c.tipo_unidad} {c.m2_totales ? `(${c.m2_totales}m²)` : ''}
                </p>
                {!editMode && (
                  <button onClick={startEdit} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                    <Pencil size={13} /> Editar
                  </button>
                )}
              </div>

              {/* ── MODO EDICIÓN ── */}
              {editMode ? (() => {
                const inp = (field, type = 'text', placeholder = '') => (
                  <input type={type} value={editForm[field]} placeholder={placeholder}
                    onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                )
                const Row = ({ label, children }) => (
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                    {children}
                  </div>
                )
                return (
                  <div>
                    {/* Local y arrendatario — solo lectura, no se editan */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '10px 14px', background: '#F0F4FF', borderRadius: '8px', border: '1px solid #C7D2FE', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, background: 'var(--color-primary)', color: 'white', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{c.unidad_numero}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{c.arrendatario_nombre}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-light)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>Local e inquilino no editables</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Renta y pagos</div>
                        <Row label="Renta mensual">{inp('renta_mensual','number','0')}</Row>
                        <Row label="Depósito garantía">{inp('deposito_garantia','number','0')}</Row>
                        <Row label="Día límite pago">{inp('dia_limite_pago','number','10')}</Row>
                        <Row label="Mora %">{inp('penalizacion_mora_pct','number','5')}</Row>
                        <Row label="Cuenta BBVA">{inp('cuenta_banco_pago')}</Row>
                        <Row label="CLABE">{inp('clabe_interbancaria')}</Row>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Vigencia y condiciones</div>
                        <Row label="Inicio">{inp('fecha_inicio','date')}</Row>
                        <Row label="Vencimiento">{inp('fecha_fin','date')}</Row>
                        <Row label="Fecha firma">{inp('fecha_firma','date')}</Row>
                        <Row label="Giro autorizado">{inp('giro_autorizado')}</Row>
                        <Row label="Horario inicio">{inp('horario_inicio','time')}</Row>
                        <Row label="Horario fin">{inp('horario_fin','time')}</Row>
                        <Row label="Canc. anticip. (meses)">{inp('cancelacion_anticipada_meses','number','2')}</Row>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador</div>
                      <Row label="Nombre">{inp('fiador_nombre')}</Row>
                      <Row label="RFC">{inp('fiador_rfc')}</Row>
                      <Row label="Domicilio">{inp('fiador_domicilio')}</Row>
                    </div>
                    {editErr && <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '8px' }}>{editErr}</p>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button onClick={guardarEdit} disabled={savingEdit}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: savingEdit ? 0.6 : 1 }}>
                        <Save size={14} /> {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button onClick={() => setEditMode(false)} disabled={savingEdit}
                        style={{ padding: '9px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )
              })() : (
                <>
                  {/* ── Arrendatario ── */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', paddingBottom: '6px', borderBottom: '2px solid #EEF2FF' }}>Arrendatario</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                      <div>
                        <Campo label="Nombre / Razón social" val={c.arrendatario_nombre} />
                        <Campo label="RFC"                   val={c.arrendatario_rfc} />
                        <Campo label="Tipo de persona"       val={c.tipo_persona} />
                      </div>
                      <div>
                        <Campo label="Teléfono"              val={c.arrendatario_telefono} />
                        <Campo label="Domicilio"             val={c.arrendatario_domicilio} />
                      </div>
                    </div>
                  </div>

                  {/* ── Local / Unidad ── */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', paddingBottom: '6px', borderBottom: '2px solid #EEF2FF' }}>Local / Unidad</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                      <div>
                        <Campo label="Número de local"   val={c.unidad_numero} />
                        <Campo label="Inmueble / Plaza"  val={c.inmueble_nombre} />
                        <Campo label="Tipo de unidad"    val={c.tipo_unidad} />
                      </div>
                      <div>
                        <Campo label="Superficie"        val={c.m2_totales ? `${c.m2_totales} m²` : null} />
                        <Campo label="Giro autorizado"   val={c.giro_autorizado} />
                        <Campo label="Horario"           val={c.horario_inicio ? `${c.horario_inicio} – ${c.horario_fin ?? ''}` : null} />
                      </div>
                    </div>
                  </div>

                  {/* ── Renta y pagos + Vigencia ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', paddingBottom: '6px', borderBottom: '2px solid #EEF2FF' }}>Renta y pagos</div>
                      <Campo label="Renta mensual"      val={fmt(c.renta_mensual)} />
                      <Campo label="Cuota mantenimiento" val={c.cuota_mant > 0 ? fmt(c.cuota_mant) : null} />
                      <Campo label="Depósito garantía"  val={c.deposito_garantia > 0 ? fmt(c.deposito_garantia) : null} />
                      <Campo label="Día límite pago"    val={c.dia_limite_pago ? `Día ${c.dia_limite_pago}` : null} />
                      <Campo label="Mora mensual"       val={c.penalizacion_mora_pct ? `${c.penalizacion_mora_pct}%` : null} />
                      <Campo label="Cuenta BBVA"        val={c.cuenta_banco_pago} />
                      <Campo label="CLABE interbancaria" val={c.clabe_interbancaria} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', paddingBottom: '6px', borderBottom: '2px solid #EEF2FF' }}>Vigencia</div>
                      <Campo label="Tipo"               val={c.tipo_contrato} />
                      <Campo label="Fecha firma"        val={c.fecha_firma} />
                      <Campo label="Inicio"             val={c.fecha_inicio} />
                      <Campo label="Vencimiento"        val={c.fecha_fin || 'Tiempo indeterminado'} />
                      <Campo label="Días restantes"     val={c.dias_restantes != null ? `${c.dias_restantes} días` : null} />
                      <Campo label="Cancelación antic." val={c.cancelacion_anticipada_meses ? `${c.cancelacion_anticipada_meses} meses previo aviso` : null} />
                      <Campo label="Folio"              val={c.folio} />
                    </div>
                  </div>

                  {/* ── Fiador ── */}
                  <div style={{ padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador / Aval</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                      <div>
                        <Campo label="Nombre"    val={c.fiador_nombre} />
                        <Campo label="RFC"       val={c.fiador_rfc} />
                      </div>
                      <div>
                        <Campo label="Teléfono"  val={c.fiador_telefono} />
                        <Campo label="Domicilio" val={c.fiador_domicilio} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Acciones (solo en modo lectura) */}
              {!editMode && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  onClick={() => setShowElaborar(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 18px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  <Wand2 size={15} /> Elaborar Contrato
                </button>
                <button
                  onClick={() => setShowRenovar(true)}
                  disabled={!puedeRenovar}
                  title={puedeRenovar ? 'Renovar contrato' : 'No disponible — el contrato ya fue cancelado, rescindido o está en proceso de renovación'}
                  style={{ padding: '8px 14px', background: puedeRenovar ? 'var(--color-success)' : '#E5E7EB', color: puedeRenovar ? 'white' : '#9CA3AF', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: puedeRenovar ? 'pointer' : 'not-allowed' }}>
                  Renovar contrato
                </button>
                {puedeCancelar && (
                  <button
                    onClick={() => setShowCancelar(true)}
                    style={{ padding: '8px 14px', background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
              </div>
              )}
              {showRenovar && (
                <ModalRenovacion
                  contrato={c}
                  onClose={() => setShowRenovar(false)}
                  onDone={() => { setShowRenovar(false); onUpdated?.(); onClose() }}
                />
              )}
              {showCancelar && (
                <ModalCancelar
                  contrato={c}
                  onClose={() => setShowCancelar(false)}
                  onDone={() => { setShowCancelar(false); onUpdated?.(); onClose() }}
                />
              )}
              {showElaborar && (
                <ElaborarContratoModal
                  prospecto={{
                    nombre: c.arrendatario_nombre,
                    domicilio: c.fiador_domicilio || '',
                    rfc: c.fiador_rfc || '',
                    telefono: '',
                    giro_solicitado: c.giro_autorizado || '',
                    fiador_nombre: c.fiador_nombre || '',
                    fiador_telefono: '',
                    fiador_domicilio: c.fiador_domicilio || '',
                    monto_ofertado: c.renta_mensual,
                  }}
                  unidad={{ numero_local: c.unidad_numero }}
                  onClose={() => setShowElaborar(false)}
                />
              )}
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

// ─── Modal Renovación ────────────────────────────────────────────────────────

function ModalRenovacion({ contrato: c, onClose, onDone }) {
  const hoy = new Date()
  const defaultInicio = new Date(c.fecha_fin ? new Date(c.fecha_fin).getTime() + 86400000 : hoy)
  const defaultFin = new Date(defaultInicio); defaultFin.setFullYear(defaultFin.getFullYear() + 1); defaultFin.setDate(defaultFin.getDate() - 1)
  const toISO = d => d.toISOString().split('T')[0]

  const [form, setForm] = useState({
    fecha_inicio:     toISO(defaultInicio),
    fecha_fin:        toISO(defaultFin),
    renta_mensual:    c.renta_mensual ?? '',
    deposito_garantia: c.deposito_garantia ?? '',
    dia_pago:         c.dia_pago ?? 5,
    penalizacion_pct: c.penalizacion_pct ?? 5,
    incremento_anual_pct: c.incremento_anual_pct ?? 0,
    fiador_nombre:    c.fiador_nombre ?? '',
    fiador_rfc:       c.fiador_rfc ?? '',
    fiador_domicilio: c.fiador_domicilio ?? '',
    notas:            '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.fecha_inicio || !form.renta_mensual) { setError('Fecha inicio y renta son obligatorios.'); return }
    setSaving(true); setError(null)
    try {
      // 1. Crear nuevo contrato
      const newFolio = (c.folio || 'C').replace(/(-R\d+)?$/, '') + '-R' + new Date().getFullYear().toString().slice(-2)
      const { data: nuevo, error: e1 } = await supabase.from('contratos').insert({
        numero_contrato:      newFolio,
        arrendatario_id:      c.arrendatario_id,
        fecha_inicio:         form.fecha_inicio,
        fecha_fin:            form.fecha_fin || null,
        renta_mensual:        parseFloat(form.renta_mensual),
        renta_sin_iva:        parseFloat(form.renta_mensual) / 1.16,
        deposito_garantia:    parseFloat(form.deposito_garantia) || 0,
        dia_pago:             parseInt(form.dia_pago) || 5,
        penalizacion_pct:     parseFloat(form.penalizacion_pct) || 5,
        incremento_anual_pct: parseFloat(form.incremento_anual_pct) || 0,
        estatus:              'VIGENTE',
        contrato_origen_id:   c.id,
        locales_referencia:   c.locales_referencia,
        locales_display:      c.locales_display,
        num_locales:          c.num_locales,
        notas:                form.notas || null,
      }).select('id').single()
      if (e1) throw e1

      // 2. Copiar contratos_locales al nuevo contrato
      const { data: locales } = await supabase.from('contratos_locales').select('local_id,renta_asignada,es_principal,notas').eq('contrato_id', c.id)
      if (locales?.length) {
        await supabase.from('contratos_locales').insert(locales.map(l => ({ ...l, contrato_id: nuevo.id })))
      }

      // 3. Marcar contrato original como RENOVADO
      const { error: e2 } = await supabase.from('contratos').update({ estatus: 'RENOVADO' }).eq('id', c.id)
      if (e2) throw e2

      onDone?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const Row = ({ label, children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      {children}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase' }}>Renovación de contrato</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{c.folio} → {c.arrendatario_nombre}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gap: '20px' }}>
          {/* Contrato origen — info */}
          <div style={{ padding: '12px 16px', background: '#F5F3FF', borderRadius: '10px', border: '1px solid #DDD6FE', fontSize: '12px', color: '#5B21B6' }}>
            <strong>Contrato actual:</strong> {c.fecha_inicio} → {c.fecha_fin || '—'} · Renta {fmt(c.renta_mensual)} · Local {c.unidad_numero}
            <br/>El contrato original pasará a estado <strong>EN RENOVACIÓN</strong> y se creará uno nuevo como VIGENTE.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Vigencia nuevo contrato</div>
              <Row label="Inicio"><input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={inp} /></Row>
              <Row label="Vencimiento"><input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} style={inp} /></Row>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Renta y condiciones</div>
              <Row label="Renta mensual"><input type="number" value={form.renta_mensual} onChange={e => set('renta_mensual', e.target.value)} style={inp} /></Row>
              <Row label="Depósito"><input type="number" value={form.deposito_garantia} onChange={e => set('deposito_garantia', e.target.value)} style={inp} /></Row>
              <Row label="Día pago"><input type="number" value={form.dia_pago} onChange={e => set('dia_pago', e.target.value)} style={{ ...inp, width: '60px' }} /></Row>
              <Row label="Mora %"><input type="number" value={form.penalizacion_pct} onChange={e => set('penalizacion_pct', e.target.value)} style={{ ...inp, width: '60px' }} /></Row>
              <Row label="Incremento %"><input type="number" value={form.incremento_anual_pct} onChange={e => set('incremento_anual_pct', e.target.value)} style={{ ...inp, width: '60px' }} /></Row>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador / Aval</div>
            <Row label="Nombre"><input type="text" value={form.fiador_nombre} onChange={e => set('fiador_nombre', e.target.value)} style={inp} /></Row>
            <Row label="RFC"><input type="text" value={form.fiador_rfc} onChange={e => set('fiador_rfc', e.target.value)} style={{ ...inp, textTransform: 'uppercase' }} /></Row>
            <Row label="Domicilio"><input type="text" value={form.fiador_domicilio} onChange={e => set('fiador_domicilio', e.target.value)} style={inp} /></Row>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '6px' }}>Notas de renovación</div>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} placeholder="Observaciones, acuerdos especiales..."
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
        </div>

        {error && <div style={{ margin: '0 24px', padding: '10px 14px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '10px' }}>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : '#7C3AED', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Creando renovación...' : 'Confirmar renovación'}
          </button>
          <button onClick={onClose} style={{ padding: '11px 20px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Cancelar ──────────────────────────────────────────────────────────

function ModalCancelar({ contrato: c, onClose, onDone }) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleCancelar = async () => {
    if (!motivo.trim()) { setError('El motivo de cancelación es requerido.'); return }
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('contratos').update({
      estatus: 'CANCELADO',
      notas: `[CANCELADO ${new Date().toLocaleDateString('es-MX')}] ${motivo.trim()}${c.notas ? '\n' + c.notas : ''}`,
    }).eq('id', c.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onDone?.()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '480px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: 700, textTransform: 'uppercase' }}>Cancelar contrato</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{c.folio}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'grid', gap: '16px' }}>
          <div style={{ padding: '12px 16px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', fontSize: '12px', color: '#991B1B' }}>
            Esta acción marcará el contrato de <strong>{c.arrendatario_nombre}</strong> como CANCELADO. No se puede deshacer desde el sistema.
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '6px' }}>Motivo de cancelación *</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={4} placeholder="Describe el motivo de la cancelación..."
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
          </div>
          {error && <div style={{ padding: '10px 14px', background: '#FEE2E2', color: 'var(--color-danger)', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleCancelar} disabled={saving} style={{ flex: 1, padding: '11px', background: saving ? '#9CA3AF' : 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Cancelando...' : 'Confirmar cancelación'}
            </button>
            <button onClick={onClose} style={{ padding: '11px 20px', background: '#F3F4F6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Volver</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// NuevoContratoModal is the shared component imported above

function NuevoContratoModal({ onClose, onCreated, fromProspecto = null }) {
  return <NuevoContratoModalShared onClose={onClose} onCreated={onCreated} fromProspecto={fromProspecto} />
}


// ─── Página principal ────────────────────────────────────────────────────────

export default function Contratos() {
  useModuleAudit('CONTRATOS')
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filtroEst, setFiltroEst] = useState('Todos')
  const [filtroPDF, setFiltroPDF] = useState('Todos')
  const [sortCol, setSortCol] = useState('fecha_inicio')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showNuevo, setShowNuevo] = useState(false)

  // ?filtro=POR_VENCER viene del link "Renovaciones" del sidebar
  useEffect(() => {
    const f = searchParams.get('filtro')
    if (f) setFiltroEst(f)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [refreshKey, setRefreshKey] = useState(0)
  const [diasAnticip, setDiasAnticip] = useState(60)
  const { data, loading } = usePRP('prp_contratos', { order: { col: 'fecha_inicio', asc: false }, refreshKey })

  useEffect(() => {
    supabase.from('cat_parametros').select('valor').eq('clave', 'dias_anticip_renovacion').single()
      .then(({ data }) => { if (data?.valor) setDiasAnticip(parseInt(data.valor)) })
  }, [])

  const lista = data ?? []

  // Conteos para KPIs y filtros
  const cntVigentes    = lista.filter(c => c.estado_id === 'VIGENTE' && !['ALERTA','CRITICO','VENCIDO'].includes(c.semaforo_vencimiento)).length
  const cntPorVencer   = lista.filter(c => ['ALERTA','CRITICO'].includes(c.semaforo_vencimiento)).length
  const cntVencidos    = lista.filter(c => c.estado_id === 'VENCIDO' || c.semaforo_vencimiento === 'VENCIDO').length
  const cntRenovacion  = lista.filter(c => c.estado_id === 'EN_RENOVACION').length
  const cntRescision   = lista.filter(c => c.estado_id === 'RESCISION').length
  const cntCancelados  = lista.filter(c => c.estado_id === 'CANCELADO').length
  const rentaTotal     = lista.filter(c => c.estado_id === 'VIGENTE').reduce((a, b) => a + (parseFloat(b.renta_mensual) || 0), 0)
  const conPDF         = lista.filter(c => c.archivo_contrato_url).length

  const FILTROS = [
    { id: 'Todos',         label: 'Todos',          cnt: lista.length,    color: '#6B7280' },
    { id: 'VIGENTE',       label: 'Vigentes',        cnt: cntVigentes,     color: 'var(--color-success)' },
    { id: 'POR_VENCER',    label: 'Por vencer',      cnt: cntPorVencer,    color: 'var(--color-warning)' },
    { id: 'VENCIDO',       label: 'Vencidos',        cnt: cntVencidos,     color: 'var(--color-danger)' },
    { id: 'EN_RENOVACION', label: 'En renovación',   cnt: cntRenovacion,   color: '#7C3AED' },
    { id: 'RESCISION',     label: 'Rescisión',       cnt: cntRescision,    color: '#9CA3AF' },
    { id: 'CANCELADO',     label: 'Cancelados',      cnt: cntCancelados,   color: '#9CA3AF' },
  ].filter(f => f.id === 'Todos' || f.id === 'VIGENTE' || f.id === 'POR_VENCER' || f.id === 'VENCIDO' || f.cnt > 0)

  const SORTS = [
    { col: 'dias_restantes',    label: 'Urgencia' },
    { col: 'unidad_numero',     label: 'Local A-Z' },
    { col: 'arrendatario_nombre', label: 'Arrendatario A-Z' },
    { col: 'renta_mensual',     label: 'Renta' },
    { col: 'fecha_inicio',      label: 'Fecha inicio' },
  ]

  const filtrados = lista
    .filter(c => {
      const q = search.toLowerCase().trim()
      const matchQ = !q
        || (c.folio || '').toLowerCase().includes(q)
        || (c.arrendatario_nombre || '').toLowerCase().includes(q)
        || (c.inmueble_nombre || '').toLowerCase().includes(q)
        || (c.unidad_numero || '').toLowerCase().includes(q)
        || (c.locales_referencia || '').toLowerCase().includes(q)
        || (c.locales_display || '').toLowerCase().includes(q)
      const matchE = filtroEst === 'Todos'
        || (filtroEst === 'POR_VENCER' && ['ALERTA','CRITICO'].includes(c.semaforo_vencimiento))
        || (filtroEst === 'VENCIDO'    && (c.estado_id === 'VENCIDO' || c.semaforo_vencimiento === 'VENCIDO'))
        || (filtroEst === 'VIGENTE'    && c.estado_id === 'VIGENTE'  && !['ALERTA','CRITICO','VENCIDO'].includes(c.semaforo_vencimiento))
        || (!['POR_VENCER','VENCIDO','VIGENTE'].includes(filtroEst) && c.estado_id === filtroEst)
      const matchPDF = filtroPDF === 'Todos' || (filtroPDF === 'CON_PDF' ? !!c.archivo_contrato_url : !c.archivo_contrato_url)
      return matchQ && matchE && matchPDF
    })
    .sort((a, b) => {
      const va = a[sortCol] ?? (sortCol === 'dias_restantes' ? 99999 : ''); const vb = b[sortCol] ?? (sortCol === 'dias_restantes' ? 99999 : '')
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const toggleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(true) }
  }

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

      {/* KPIs — clickeables para filtrar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { title: 'Vigentes',        value: cntVigentes,  icon: CheckCircle,  color: 'var(--color-success)', filtro: 'VIGENTE' },
          { title: 'Vencidos',        value: cntVencidos,  icon: AlertTriangle,color: 'var(--color-danger)',  filtro: 'VENCIDO' },
          { title: 'Por vencer',      value: cntPorVencer, icon: Clock,        color: 'var(--color-warning)', filtro: 'POR_VENCER' },
          { title: 'Renta total/mes', value: `$${(rentaTotal/1000).toFixed(0)}K`, icon: TrendingUp, color: 'var(--color-primary)', filtro: null },
          { title: 'Con PDF adjunto', value: `${conPDF}/${lista.length}`,      icon: Paperclip,  color: 'var(--color-secondary)', filtro: null },
        ].map(k => (
          <div key={k.title} onClick={() => k.filtro && setFiltroEst(f => f === k.filtro ? 'Todos' : k.filtro)}
            style={{
              background: 'white', borderRadius: '10px', border: `2px solid ${filtroEst === k.filtro ? k.color : '#E5E7EB'}`,
              padding: '16px', cursor: k.filtro ? 'pointer' : 'default',
              boxShadow: filtroEst === k.filtro ? `0 0 0 3px ${k.color}22` : 'none',
              transition: 'all 0.15s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.title}</span>
              <k.icon size={16} color={k.color} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            {k.filtro && <div style={{ fontSize: '10px', color: filtroEst === k.filtro ? k.color : '#9CA3AF', marginTop: '4px', fontWeight: 600 }}>
              {filtroEst === k.filtro ? '● Filtro activo' : 'Clic para filtrar'}
            </div>}
          </div>
        ))}
      </div>

      {/* Filtros de estado */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTROS.map(f => {
          const activo = filtroEst === f.id
          return (
            <button key={f.id} onClick={() => setFiltroEst(f.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              border: `2px solid ${activo ? f.color : '#E5E7EB'}`,
              background: activo ? f.color : 'white',
              color: activo ? 'white' : '#374151',
              transition: 'all 0.15s',
            }}>
              {f.label}
              {f.id !== 'Todos' && (
                <span style={{
                  background: activo ? 'rgba(255,255,255,0.3)' : f.color + '22',
                  color: activo ? 'white' : f.color,
                  borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 800,
                }}>{f.cnt}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Barra de búsqueda + filtro PDF */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nombre, local (L09, L24), folio..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '16px', lineHeight: 1 }}>×</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['Todos','Todos'],['CON_PDF','Con anexo'],['SIN_PDF','Sin anexo']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFiltroPDF(val)} style={{
              padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: filtroPDF === val ? (val === 'SIN_PDF' ? 'var(--color-warning)' : 'var(--color-secondary)') : '#E5E7EB',
              background: filtroPDF === val ? (val === 'SIN_PDF' ? 'var(--color-warning)' : 'var(--color-secondary)') : 'white',
              color: filtroPDF === val ? 'white' : 'var(--color-text-light)',
            }}><Paperclip size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{lbl}</button>
          ))}
        </div>
      </div>
      {/* Sort */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600 }}>ORDENAR:</span>
        {SORTS.map(s => (
          <button key={s.col} onClick={() => toggleSort(s.col)} style={{
            padding: '5px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
            borderColor: sortCol === s.col ? 'var(--color-primary)' : '#E5E7EB',
            background: sortCol === s.col ? '#EEF2FF' : 'white',
            color: sortCol === s.col ? 'var(--color-primary)' : 'var(--color-text-light)',
          }}>
            {s.label} {sortCol === s.col ? (sortAsc ? '▲' : '▼') : ''}
          </button>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--color-text-light)', marginLeft: '8px' }}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
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
                      {['Contrato','Local','Arrendatario','Renta','Vigencia','Plazo','Estado',''].map(h => (
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
        onUpdated={() => { setRefreshKey(k => k + 1); setSelected(null) }}
        diasAnticip={diasAnticip}
      />
      {showNuevo && (
        <NuevoContratoModal
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setRefreshKey(k => k + 1); setShowNuevo(false) }}
        />
      )}
    </div>
  )
}
