import { useModuleAudit } from '../hooks/useAudit'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import NuevoContratoModalShared from '../components/ui/NuevoContratoModal'
import {
  FileText, Plus, Search, AlertTriangle, CheckCircle,
  Clock, TrendingUp, X, Upload, Paperclip, MessageSquare,
  Send, Download, Eye, ChevronRight, Wand2, Pencil, Save, Trash2,
  Grid, AlignJustify, Printer
} from 'lucide-react'
import ElaborarContratoModal from '../components/ui/ElaborarContratoModal'
import StatusBadge from '../components/ui/StatusBadge'
import KPICard from '../components/ui/KPICard'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'
import { supabase, urlFirmada } from '../lib/supabase'

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

const PROCESO_OPTS = [
  { val: 'EN_CONTRATACION', label: 'En contratación', color: '#0A66C2', bg: '#EFF6FF' },
  { val: 'EN_RENOVACION',   label: 'En renovación',   color: '#7C3AED', bg: '#F5F3FF' },
  { val: 'EN_EJECUCION',    label: 'En ejecución',    color: '#057642', bg: '#ECFDF5' },
]

const ESTATUS_OPTS = [
  { val: 'VIGENTE',   label: 'Vigente',   color: '#057642', bg: '#ECFDF5' },
  { val: 'VENCIDO',   label: 'Vencido',   color: '#B24020', bg: '#FEF2F2' },
  { val: 'RENOVADO',  label: 'Renovado',  color: '#0A66C2', bg: '#EBF4FF' },
  { val: 'RESCISION', label: 'Rescisión', color: '#7C3AED', bg: '#F5F3FF' },
]

function EstatusBadge({ c, onChange }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const opt = ESTATUS_OPTS.find(o => o.val === c.estatus) || { label: c.estatus || '—', color: '#6B7280', bg: '#F3F4F6' }

  const cambiar = async (val) => {
    setOpen(false); setSaving(true)
    await supabase.from('contratos').update({ estatus: val, updated_at: new Date().toISOString() }).eq('id', c.id)
    setSaving(false)
    onChange?.()
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        title="Cambiar estatus del contrato"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', background: opt.bg, color: opt.color, border: `1.5px solid ${opt.color}50`, borderRadius: '12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {saving ? '...' : opt.label}
        <span style={{ fontSize: '8px' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', minWidth: '185px', overflow: 'hidden', marginTop: '4px' }}>
          {ESTATUS_OPTS.map(o => (
            <button key={o.val} onClick={() => cambiar(o.val)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: c.estatus === o.val ? o.bg : 'white', color: o.color, fontSize: '12px', fontWeight: c.estatus === o.val ? 700 : 500, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = o.bg}
              onMouseLeave={e => e.currentTarget.style.background = c.estatus === o.val ? o.bg : 'white'}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.color, flexShrink: 0 }} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProcesoBadge({ c, onChange }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const opt = PROCESO_OPTS.find(o => o.val === c.estatus_proceso) || { label: c.estatus_proceso || '—', color: '#6B7280', bg: '#F3F4F6' }

  const cambiar = async (val) => {
    setOpen(false); setSaving(true)
    await supabase.from('contratos').update({ estatus_proceso: val, updated_at: new Date().toISOString() }).eq('id', c.id)
    setSaving(false)
    onChange?.()
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        title="Cambiar estatus de proceso"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: opt.bg, color: opt.color, border: `1px solid ${opt.color}40`, borderRadius: '12px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {saving ? '...' : opt.label}
        <span style={{ fontSize: '8px' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '150px', overflow: 'hidden', marginTop: '4px' }}>
          {PROCESO_OPTS.map(o => (
            <button key={o.val} onClick={() => cambiar(o.val)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: c.estatus_proceso === o.val ? o.bg : 'white', color: o.color, fontSize: '12px', fontWeight: c.estatus_proceso === o.val ? 700 : 500, cursor: 'pointer' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ContratoRow({ c, onView, onEdit, onDelete, onRefresh }) {
  const { texto, color } = diasLabel(c.dias_restantes, c.semaforo_vencimiento)
  return (
    <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => onView(c)}>
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
      <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
        <EstatusBadge c={c} onChange={onRefresh} />
        <div style={{ marginTop: '4px' }}>
          <ProcesoBadge c={c} onChange={onRefresh} />
        </div>
      </td>
      <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <button title="Ver detalle" onClick={e => { e.stopPropagation(); onView(c) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', color: 'var(--color-primary)' }}>
            <Eye size={14} />
          </button>
          <button title="Editar contrato" onClick={e => { e.stopPropagation(); onEdit(c) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer', color: 'var(--color-secondary)' }}>
            <Pencil size={14} />
          </button>
          <button title="Eliminar contrato" onClick={e => { e.stopPropagation(); onDelete(c) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: '1px solid #FECACA', borderRadius: '6px', background: '#FFF5F5', cursor: 'pointer', color: 'var(--color-danger)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Modal de detalle con tabs ───────────────────────────────────────────────

function DetalleModal({ contrato: c, onClose, onUpdated, diasAnticip = 60, initialEditMode = false }) {
  const [tab, setTab] = useState('datos')
  const [notas, setNotas] = useState([])
  const [notasLoading, setNotasLoading] = useState(false)
  const [nuevaNota, setNuevaNota] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  useEffect(() => {
    const guardado = c?.contrato_pdf_url || c?.archivo_contrato_url
    if (!guardado) { setPdfUrl(null); return }
    let vivo = true
    urlFirmada('contratos-firmados', guardado).then(u => { if (vivo) setPdfUrl(u) })
    return () => { vivo = false }
  }, [c?.contrato_pdf_url, c?.archivo_contrato_url])
  const [notaErr, setNotaErr] = useState(null)
  const [showElaborar, setShowElaborar] = useState(false)
  const [showRenovar, setShowRenovar] = useState(false)
  const [showCancelar, setShowCancelar] = useState(false)
  const [editMode, setEditMode] = useState(initialEditMode)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState(null)
  const [localesDisp, setLocalesDisp] = useState([])
  const [localesSel, setLocalesSel] = useState([])
  const pdfRef = useRef()

  // Renovar: solo si NO tiene ya renovación en proceso, y vence en ≤30d o ya expiró
  const puedeRenovar = c
    && !['CANCELADO', 'RESCISION'].includes(c.estado_id)
    && c.estatus_proceso !== 'EN_RENOVACION'
    && (c.dias_restantes <= 30 || c.semaforo_vencimiento === 'VENCIDO')
  const puedeCancelar = c && !['CANCELADO', 'RESCISION'].includes(c.estatus)

  const startEdit = async () => {
    // Cargar locales disponibles, locales actuales del contrato, y datos reales del arrendatario — en paralelo
    const [{ data: todos }, { data: actuales }, { data: arr }] = await Promise.all([
      supabase.from('cat_locales').select('id_local, numero_local, superficie_m2').order('numero_local'),
      supabase.from('contratos_locales').select('local_id, renta_asignada').eq('contrato_id', c.id),
      c.arrendatario_id
        ? supabase.from('arrendatarios').select('nombre, apellidos').eq('id', c.arrendatario_id).single()
        : Promise.resolve({ data: null }),
    ])
    setLocalesDisp(todos ?? [])
    setLocalesSel((actuales ?? []).map(l => l.local_id))
    setEditForm({
      arr_nombre:                 arr?.nombre    ?? '',
      arr_apellidos:              arr?.apellidos ?? '',
      estatus:                    ['VIGENTE','VENCIDO','RENOVADO','RESCISION'].includes(c.estatus) ? c.estatus : 'VIGENTE',
      estatus_proceso:            c.estatus_proceso ?? 'EN_EJECUCION',
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
    const ESTATUS_VALIDOS = ['VIGENTE','VENCIDO','RENOVADO','RESCISION']
    const payload = {
      estatus:          ESTATUS_VALIDOS.includes(editForm.estatus) ? editForm.estatus : 'VIGENTE',
      estatus_proceso:  editForm.estatus_proceso  || null,
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

    // Actualizar locales_referencia y locales_display en contratos
    const rentaXLocal = localesSel.length > 0 ? (parseFloat(editForm.renta_mensual) || 0) / localesSel.length : 0
    payload.locales_referencia = localesSel.sort().join('|')
    payload.locales_display    = localesSel.sort().map(l => l.replace('L0','L').replace(/^L(\d)$/,'L$1')).join(', ')

    const { error } = await supabase.from('contratos').update(payload).eq('id', c.id)
    if (error) { setSavingEdit(false); setEditErr(error.message); return }

    // Actualizar nombre del arrendatario si fue modificado
    if (c.arrendatario_id && (editForm.arr_nombre || editForm.arr_apellidos)) {
      await supabase.from('arrendatarios').update({
        nombre:    editForm.arr_nombre    || null,
        apellidos: editForm.arr_apellidos || null,
      }).eq('id', c.arrendatario_id)
    }

    // Sincronizar contratos_locales
    await supabase.from('contratos_locales').delete().eq('contrato_id', c.id)
    if (localesSel.length > 0) {
      await supabase.from('contratos_locales').insert(
        localesSel.map(lid => ({ contrato_id: c.id, local_id: lid, renta_asignada: rentaXLocal }))
      )
      // Actualizar cat_locales para que apunten a este contrato
      await supabase.from('cat_locales').update({ contrato_activo_id: c.id, estatus: 'OCUPADO' }).in('id_local', localesSel)
    }

    setSavingEdit(false)
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
    // Se guarda la RUTA, no la URL: las URLs firmadas caducan.
    await supabase.from('contratos').update({ contrato_pdf_url: path }).eq('id', c.id)
    setPdfUrl(await urlFirmada('contratos-firmados', path))
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
                return (
                  <div>
                    {/* Arrendatario — editable */}
                    <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#F0F4FF', borderRadius: '8px', border: '1px solid #C7D2FE' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Arrendatario</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '3px', fontWeight: 600 }}>Nombre(s)</div>
                          <input value={editForm.arr_nombre}
                            onChange={e => setEditForm(f => ({ ...f, arr_nombre: e.target.value }))}
                            placeholder="Nombre(s)"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #C7D2FE', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: 'white' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '3px', fontWeight: 600 }}>Apellidos</div>
                          <input value={editForm.arr_apellidos}
                            onChange={e => setEditForm(f => ({ ...f, arr_apellidos: e.target.value }))}
                            placeholder="Apellido paterno materno"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #C7D2FE', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', background: 'white' }} />
                        </div>
                      </div>
                    </div>

                    {/* Estatus del contrato */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Estatus contrato</div>
                        <select value={editForm.estatus} onChange={e => setEditForm(f => ({ ...f, estatus: e.target.value }))}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}>
                          {ESTATUS_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>Etapa de proceso</div>
                        <select value={editForm.estatus_proceso} onChange={e => setEditForm(f => ({ ...f, estatus_proceso: e.target.value }))}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}>
                          {PROCESO_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Selector de locales */}
                    <div style={{ marginBottom: '16px', padding: '14px', background: '#F8FAFF', borderRadius: '10px', border: '1px solid #C7D2FE' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Locales asignados a este contrato
                        <span style={{ marginLeft: '8px', fontWeight: 400, color: '#6B7280', textTransform: 'none' }}>
                          ({localesSel.length} seleccionado{localesSel.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {localesDisp.map(l => {
                          const sel = localesSel.includes(l.id_local)
                          return (
                            <button key={l.id_local} type="button"
                              onClick={() => setLocalesSel(prev => sel ? prev.filter(x => x !== l.id_local) : [...prev, l.id_local])}
                              style={{
                                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                border: `2px solid ${sel ? 'var(--color-primary)' : '#D1D5DB'}`,
                                background: sel ? 'var(--color-primary)' : 'white',
                                color: sel ? 'white' : '#374151',
                                transition: 'all 0.12s',
                              }}>
                              {l.numero_local}
                              {l.superficie_m2 && <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>{l.superficie_m2}m²</span>}
                            </button>
                          )
                        })}
                        {localesDisp.length === 0 && <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Cargando locales...</span>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Renta y pagos</div>
                        <FormRow label="Renta mensual">{inp('renta_mensual','number','0')}</FormRow>
                        <FormRow label="Depósito garantía">{inp('deposito_garantia','number','0')}</FormRow>
                        <FormRow label="Día límite pago">{inp('dia_limite_pago','number','10')}</FormRow>
                        <FormRow label="Mora %">{inp('penalizacion_mora_pct','number','5')}</FormRow>
                        <FormRow label="Cuenta BBVA">{inp('cuenta_banco_pago')}</FormRow>
                        <FormRow label="CLABE">{inp('clabe_interbancaria')}</FormRow>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Vigencia y condiciones</div>
                        <FormRow label="Inicio">{inp('fecha_inicio','date')}</FormRow>
                        <FormRow label="Vencimiento">{inp('fecha_fin','date')}</FormRow>
                        <FormRow label="Fecha firma">{inp('fecha_firma','date')}</FormRow>
                        <FormRow label="Giro autorizado">{inp('giro_autorizado')}</FormRow>
                        <FormRow label="Horario inicio">{inp('horario_inicio','time')}</FormRow>
                        <FormRow label="Horario fin">{inp('horario_fin','time')}</FormRow>
                        <FormRow label="Canc. anticip. (meses)">{inp('cancelacion_anticipada_meses','number','2')}</FormRow>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador</div>
                      <FormRow label="Nombre">{inp('fiador_nombre')}</FormRow>
                      <FormRow label="RFC">{inp('fiador_rfc')}</FormRow>
                      <FormRow label="Domicilio">{inp('fiador_domicilio')}</FormRow>
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
                  title={puedeRenovar ? 'Renovar contrato' : c?.estatus_proceso === 'EN_RENOVACION' ? 'Ya tiene renovación en proceso' : 'Solo disponible cuando vence en ≤30 días o ya está vencido'}
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

// ─── FormRow compartido (debe estar fuera de cualquier componente para no perder foco) ──
function FormRow({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      {children}
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
    cuota_mant:       c.cuota_mant ?? 0,
    deposito_garantia: c.deposito_garantia ?? '',
    // dia_pago / penalizacion_pct / incremento_anual_pct son los nombres en prp_contratos
    dia_cobro:        c.dia_pago ?? c.dia_cobro ?? 1,
    penalizacion_mora: c.penalizacion_pct ?? c.penalizacion_mora ?? 5,
    incremento_anual: c.incremento_anual_pct ?? c.incremento_anual ?? 0,
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
      // Quitar sufijo -Rxx existente y generar nuevo folio único con año
      const base = (c.folio || 'CA').replace(/-R\d{2}(-\d+)?$/, '')
      const anio = new Date().getFullYear().toString().slice(-2)
      const candidato = `${base}-R${anio}`
      // Verificar si ya existe ese folio; si es así, agregar sufijo incremental
      const { data: existe } = await supabase.from('contratos').select('id').eq('numero_contrato', candidato).maybeSingle()
      const newFolio = existe ? `${candidato}-${Date.now().toString().slice(-4)}` : candidato
      const { error: e1 } = await supabase.rpc('renovar_contrato', {
        p_contrato_id:       c.id,
        p_folio:             newFolio,
        p_arrendatario_id:   c.arrendatario_id,
        p_unidad_id:         c.unidad_id,
        p_tipo_contrato:     c.tipo_contrato,
        p_fecha_inicio:      form.fecha_inicio,
        p_fecha_fin:         form.fecha_fin || null,
        p_renta_mensual:     parseFloat(form.renta_mensual),
        p_cuota_mant:        parseFloat(form.cuota_mant) || 0,
        p_deposito_garantia: parseFloat(form.deposito_garantia) || 0,
        p_dia_cobro:         parseInt(form.dia_cobro) || 1,
        p_penalizacion_mora: parseFloat(form.penalizacion_mora) || 5,
        p_incremento_anual:  parseFloat(form.incremento_anual) || 0,
        p_fiador_nombre:     form.fiador_nombre || null,
        p_fiador_rfc:        form.fiador_rfc || null,
        p_fiador_domicilio:  form.fiador_domicilio || null,
        p_notas:             form.notas || null,
      })
      if (e1) throw e1

      onDone?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }

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
              <FormRow label="Inicio"><input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} style={inp} /></FormRow>
              <FormRow label="Vencimiento"><input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} style={inp} /></FormRow>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Renta y condiciones</div>
              <FormRow label="Renta mensual"><input type="number" value={form.renta_mensual} onChange={e => set('renta_mensual', e.target.value)} style={inp} /></FormRow>
              <FormRow label="Depósito"><input type="number" value={form.deposito_garantia} onChange={e => set('deposito_garantia', e.target.value)} style={inp} /></FormRow>
              <FormRow label="Día pago"><input type="number" value={form.dia_cobro} onChange={e => set('dia_cobro', e.target.value)} style={{ ...inp, width: '60px' }} /></FormRow>
              <FormRow label="Mora %"><input type="number" value={form.penalizacion_mora} onChange={e => set('penalizacion_mora', e.target.value)} style={{ ...inp, width: '60px' }} /></FormRow>
              <FormRow label="Incremento %"><input type="number" value={form.incremento_anual} onChange={e => set('incremento_anual', e.target.value)} style={{ ...inp, width: '60px' }} /></FormRow>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#FFF8F0', borderRadius: '10px', border: '1px solid #FBBF24' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: '8px' }}>Fiador / Aval</div>
            <FormRow label="Nombre"><input type="text" value={form.fiador_nombre} onChange={e => set('fiador_nombre', e.target.value)} style={inp} /></FormRow>
            <FormRow label="RFC"><input type="text" value={form.fiador_rfc} onChange={e => set('fiador_rfc', e.target.value)} style={{ ...inp, textTransform: 'uppercase' }} /></FormRow>
            <FormRow label="Domicilio"><input type="text" value={form.fiador_domicilio} onChange={e => set('fiador_domicilio', e.target.value)} style={inp} /></FormRow>
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
      estatus: 'RESCISION',
      notas: `[RESCISION ${new Date().toLocaleDateString('es-MX')}] ${motivo.trim()}${c.notas ? '\n' + c.notas : ''}`,
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


// ─── Vista Anual de Vencimientos ──────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function VistaAnual({ lista, anio, onSelectContrato }) {
  const hoy = new Date()

  const byMes = Array.from({ length: 12 }, (_, i) => {
    const mes = String(i + 1).padStart(2, '0')
    const prefix = `${anio}-${mes}`
    return lista.filter(c => c.fecha_fin && c.fecha_fin.startsWith(prefix))
  })

  const chipColor = (c) => {
    if (!c.fecha_fin) return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' }
    const d = new Date(c.fecha_fin + 'T12:00:00')
    const dias = Math.round((d - hoy) / 86400000)
    if (dias < 0)  return { bg: '#FEF2F2', text: '#B24020', border: '#FECACA' }
    if (dias <= 30) return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' }
    if (dias <= 60) return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }
    return { bg: '#F0FDF4', text: '#057642', border: '#BBF7D0' }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {byMes.map((contratos, i) => {
        const esActual = hoy.getFullYear() === parseInt(anio) && hoy.getMonth() === i
        return (
          <div key={i} style={{
            background: 'white', borderRadius: '10px',
            border: esActual ? '2px solid var(--color-primary)' : '1px solid #E5E7EB',
            overflow: 'hidden', minHeight: '120px',
          }}>
            {/* Cabecera del mes */}
            <div style={{
              padding: '8px 14px',
              background: esActual ? 'var(--color-primary)' : '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: esActual ? 'white' : 'var(--color-text)' }}>
                {MESES[i]} {anio}
              </span>
              {contratos.length > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px',
                  background: esActual ? 'rgba(255,255,255,0.25)' : 'var(--color-primary)',
                  color: 'white',
                }}>
                  {contratos.length}
                </span>
              )}
            </div>

            {/* Chips de contratos */}
            <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {contratos.length === 0 ? (
                <span style={{ fontSize: '11px', color: '#D1D5DB', textAlign: 'center', padding: '12px 0', display: 'block' }}>—</span>
              ) : contratos.map(c => {
                const col = chipColor(c)
                return (
                  <button key={c.id} onClick={() => onSelectContrato(c)}
                    title={`${c.arrendatario_nombre} · Vence ${c.fecha_fin}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 9px', border: `1px solid ${col.border}`,
                      borderRadius: '7px', background: col.bg, cursor: 'pointer',
                      textAlign: 'left', width: '100%',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: col.text, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.unidad_numero || c.locales_display || c.folio}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.arrendatario_nombre?.split(' ').slice(0, 2).join(' ')}
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: col.text, fontWeight: 700, flexShrink: 0 }}>
                      {c.fecha_fin?.slice(8)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Contratos() {
  useModuleAudit('CONTRATOS')
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filtroEst, setFiltroEst] = useState('Todos')
  const [filtroPDF, setFiltroPDF] = useState('Todos')
  const [filtroVencAno, setFiltroVencAno] = useState('')
  const [filtroVencMes, setFiltroVencMes] = useState('')
  const [sortCol, setSortCol] = useState('fecha_inicio')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState(null)
  const [selectedInEditMode, setSelectedInEditMode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)
  const [generandoFolios, setGenerandoFolios] = useState(false)

  // Genera folio IWOL-L{locales}-{año} para contratos sin folio estándar
  const ESTATUS_VALIDOS = ['VIGENTE', 'VENCIDO', 'RENOVADO', 'RESCISION']
  const generarFolios = async () => {
    const sinFolio = lista.filter(c => !c.folio || !c.folio.startsWith('IWOL-'))
    if (sinFolio.length === 0) { alert('Todos los contratos ya tienen folio IWOL.'); return }
    setGenerandoFolios(true)
    let ok = 0, err = 0
    // Construir folios generados en este lote para controlar unicidad
    const foliosEnLote = {}
    for (const c of sinFolio) {
      const locStr = c.locales_display || c.locales_referencia || c.unidad_numero || ''
      const nums = [...locStr.matchAll(/\d+/g)].map(m => m[0])
      const locCode = nums.length > 0
        ? nums.map(n => n.padStart(2, '0')).join('')
        : (c.id || '').slice(0, 4).toUpperCase()
      const anio = c.fecha_inicio ? c.fecha_inicio.slice(0, 4) : new Date().getFullYear()
      const baseF = `IWOL-L${locCode}-${anio}`
      // Unicidad: revisar en lista existente Y en el lote actual
      const enLista = lista.filter(x => x.id !== c.id && (x.folio || '').startsWith(baseF)).length
      const enLote  = foliosEnLote[baseF] || 0
      const sufijo  = enLista + enLote
      const folio   = sufijo > 0 ? `${baseF}-${sufijo + 1}` : baseF
      foliosEnLote[baseF] = enLote + 1
      // Normalizar estatus si es valor legacy (el check constraint valida toda la fila)
      const estatus = ESTATUS_VALIDOS.includes(c.estatus) ? c.estatus : 'VIGENTE'
      const { error } = await supabase.from('contratos')
        .update({ folio, estatus, updated_at: new Date().toISOString() })
        .eq('id', c.id)
      if (error) err++; else ok++
    }
    setGenerandoFolios(false)
    setRefreshKey(k => k + 1)
    alert(`Folios generados: ${ok} actualizados${err > 0 ? `, ${err} con error` : ''}`)
  }

  // ?filtro=POR_VENCER viene del link "Renovaciones" del sidebar
  useEffect(() => {
    const f = searchParams.get('filtro')
    if (f) setFiltroEst(f)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [refreshKey, setRefreshKey] = useState(0)
  const [diasAnticip, setDiasAnticip] = useState(60)
  const [vistaAnual, setVistaAnual] = useState(false)
  const [anioAnual, setAnioAnual] = useState(String(new Date().getFullYear()))
  const { data, loading } = usePRP('prp_contratos', { order: { col: 'fecha_inicio', asc: false }, refreshKey })

  useEffect(() => {
    supabase.from('cat_parametros').select('valor').eq('clave', 'dias_anticip_renovacion').single()
      .then(({ data }) => { if (data?.valor) setDiasAnticip(parseInt(data.valor)) })
  }, [])

  const lista = data ?? []

  // Conteos para KPIs y filtros
  const cntActivos     = lista.filter(c => !['VENCIDO','RESCISION','RENOVADO'].includes(c.estado_id)).length
  const cntVigentes    = lista.filter(c => c.estado_id === 'VIGENTE' && !['ALERTA','CRITICO','VENCIDO'].includes(c.semaforo_vencimiento)).length
  const cntPorVencer   = lista.filter(c => ['ALERTA','CRITICO'].includes(c.semaforo_vencimiento)).length
  const cntVencidos    = lista.filter(c => c.estado_id === 'VENCIDO' || c.semaforo_vencimiento === 'VENCIDO').length
  const cntRenovacion  = lista.filter(c => c.estatus_proceso === 'EN_RENOVACION').length
  const cntRescision   = lista.filter(c => c.estado_id === 'RESCISION').length
  const cntCancelados  = lista.filter(c => c.estado_id === 'RESCISION').length
  const rentaTotal     = lista.filter(c => c.estado_id === 'VIGENTE').reduce((a, b) => a + (parseFloat(b.renta_mensual) || 0), 0)
  const conPDF         = lista.filter(c => c.archivo_contrato_url).length

  const FILTROS = [
    { id: 'Todos',         label: 'Todos',          cnt: lista.length,    color: '#6B7280' },
    { id: 'VIGENTE',       label: 'Vigentes',        cnt: cntVigentes,     color: 'var(--color-success)' },
    { id: 'POR_VENCER',    label: 'Por vencer',      cnt: cntPorVencer,    color: 'var(--color-warning)' },
    { id: 'VENCIDO',       label: 'Vencidos',        cnt: cntVencidos,     color: 'var(--color-danger)' },
    { id: 'EN_RENOVACION', label: 'En renovación',   cnt: cntRenovacion,   color: '#7C3AED' },
    { id: 'RESCISION',     label: 'Rescisión',       cnt: cntRescision,    color: '#9CA3AF' },
    { id: 'RESCISION',     label: 'Rescisión',       cnt: cntCancelados,   color: '#7C3AED' },
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
        || (filtroEst === 'ACTIVOS'    && !['VENCIDO','RESCISION','RENOVADO'].includes(c.estado_id))
        || (filtroEst === 'POR_VENCER' && ['ALERTA','CRITICO'].includes(c.semaforo_vencimiento))
        || (filtroEst === 'VENCIDO'    && (c.estado_id === 'VENCIDO' || c.semaforo_vencimiento === 'VENCIDO'))
        || (filtroEst === 'VIGENTE'    && c.estado_id === 'VIGENTE'  && !['ALERTA','CRITICO','VENCIDO'].includes(c.semaforo_vencimiento))
        || (filtroEst === 'EN_RENOVACION' && c.estatus_proceso === 'EN_RENOVACION')
        || (!['ACTIVOS','POR_VENCER','VENCIDO','VIGENTE','EN_RENOVACION'].includes(filtroEst) && c.estado_id === filtroEst)
      const matchPDF = filtroPDF === 'Todos' || (filtroPDF === 'CON_PDF' ? !!c.archivo_contrato_url : !c.archivo_contrato_url)
      const matchVencAno = !filtroVencAno || (c.fecha_fin && c.fecha_fin.startsWith(filtroVencAno))
      const matchVencMes = !filtroVencMes || (c.fecha_fin && c.fecha_fin.startsWith(filtroVencMes))
      return matchQ && matchE && matchPDF && matchVencAno && matchVencMes
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Toggle lista / vista anual */}
          <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setVistaAnual(false)} title="Vista lista"
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: !vistaAnual ? 'var(--color-primary)' : 'white', color: !vistaAnual ? 'white' : '#6B7280' }}>
              <AlignJustify size={16} />
            </button>
            <button onClick={() => setVistaAnual(true)} title="Vista anual de vencimientos"
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: vistaAnual ? 'var(--color-primary)' : 'white', color: vistaAnual ? 'white' : '#6B7280' }}>
              <Grid size={16} />
            </button>
          </div>
          {vistaAnual && (
            <select value={anioAnual} onChange={e => setAnioAnual(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}>
              {['2025','2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button onClick={generarFolios} disabled={generandoFolios} title="Genera folio IWOL-LXX-YYYY para contratos sin folio"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid #7C3AED', borderRadius: '8px', background: generandoFolios ? '#F5F3FF' : 'white', color: '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Wand2 size={15} /> {generandoFolios ? 'Generando...' : 'Generar Folios'}
          </button>
          <button onClick={() => {
            const cols = ['folio','arrendatario_nombre','inmueble_nombre','locales_display','fecha_inicio','fecha_fin','renta_mensual','estado_id']
            const head = ['Folio','Arrendatario','Inmueble','Locales','Inicio','Fin','Renta','Estatus']
            const rows = filtrados.map(c => cols.map(k => c[k] ?? '').join(','))
            const csv = [head.join(','), ...rows].join('\n')
            const a = document.createElement('a')
            a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
            a.download = 'contratos.csv'
            a.click()
          }} title="Exportar CSV" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={15} /> Excel
          </button>
          <button onClick={() => window.print()} title="Imprimir" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={15} /> Imprimir
          </button>
          <button onClick={() => setShowNuevo(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--color-primary)', color: 'white', border: 'none',
            borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={16} /> Nuevo Contrato
          </button>
        </div>
      </div>

      {/* KPIs + filtros: solo en vista lista */}
      {!vistaAnual && <>{/* Filtros de estado — primero */}
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

        {/* Filtro por vencimiento año/mes */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, whiteSpace: 'nowrap' }}>VENCE EN:</span>
          <select value={filtroVencAno} onChange={e => { setFiltroVencAno(e.target.value); setFiltroVencMes('') }}
            style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid', borderColor: filtroVencAno ? 'var(--color-primary)' : '#E5E7EB', background: filtroVencAno ? '#EEF2FF' : 'white', color: filtroVencAno ? 'var(--color-primary)' : 'var(--color-text-light)', cursor: 'pointer' }}>
            <option value="">Año</option>
            {['2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filtroVencMes} onChange={e => setFiltroVencMes(e.target.value)} disabled={!filtroVencAno}
            style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid', borderColor: filtroVencMes ? 'var(--color-primary)' : '#E5E7EB', background: filtroVencMes ? '#EEF2FF' : (filtroVencAno ? 'white' : '#F9FAFB'), color: filtroVencMes ? 'var(--color-primary)' : 'var(--color-text-light)', cursor: filtroVencAno ? 'pointer' : 'default' }}>
            <option value="">Mes</option>
            {[['01','Ene'],['02','Feb'],['03','Mar'],['04','Abr'],['05','May'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Sep'],['10','Oct'],['11','Nov'],['12','Dic']].map(([n,l]) => (
              <option key={n} value={`${filtroVencAno}-${n}`}>{l}</option>
            ))}
          </select>
          {(filtroVencAno || filtroVencMes) && (
            <button onClick={() => { setFiltroVencAno(''); setFiltroVencMes('') }}
              style={{ padding: '4px 8px', border: 'none', borderRadius: '5px', background: '#F3F4F6', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>✕</button>
          )}
        </div>
      </div>

      {/* KPIs — clickeables para filtrar — debajo de filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { title: 'Todos activos',   value: cntActivos,   icon: FileText,     color: 'var(--color-primary)', filtro: 'ACTIVOS' },
          { title: 'Vigentes',        value: cntVigentes,  icon: CheckCircle,  color: 'var(--color-success)', filtro: 'VIGENTE' },
          { title: 'Vencidos',        value: cntVencidos,  icon: AlertTriangle,color: 'var(--color-danger)',  filtro: 'VENCIDO' },
          { title: 'Por vencer',      value: cntPorVencer, icon: Clock,        color: 'var(--color-warning)', filtro: 'POR_VENCER' },
          { title: 'Renta total/mes', value: `$${(rentaTotal/1000).toFixed(0)}K`, icon: TrendingUp, color: '#7C3AED', filtro: null },
          { title: 'Con PDF adjunto', value: `${conPDF}/${lista.length}`,      icon: Paperclip,  color: 'var(--color-secondary)', filtro: null },
        ].map(k => (
          <div key={k.title} onClick={() => {
            if (!k.filtro) return
            if (k.filtro === 'ACTIVOS') setFiltroEst(f => f === 'ACTIVOS' ? 'Todos' : 'ACTIVOS')
            else setFiltroEst(f => f === k.filtro ? 'Todos' : k.filtro)
          }}
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

</>}

      {/* Vista Anual / Tabla */}
      {vistaAnual ? (
        <VistaAnual
          lista={lista}
          anio={anioAnual}
          onSelectContrato={c => { setSelectedInEditMode(false); setSelected(c) }}
        />
      ) : (
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
                      {filtrados.map(c => (
                        <ContratoRow key={c.id} c={c}
                          onView={c => { setSelectedInEditMode(false); setSelected(c) }}
                          onEdit={c => { setSelectedInEditMode(true); setSelected(c) }}
                          onDelete={c => setConfirmDelete(c)}
                          onRefresh={() => setRefreshKey(k => k + 1)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
          }
        </div>
      )}

      <DetalleModal
        contrato={selected}
        onClose={() => { setSelected(null); setSelectedInEditMode(false) }}
        onUpdated={() => { setRefreshKey(k => k + 1); setSelected(null); setSelectedInEditMode(false) }}
        diasAnticip={diasAnticip}
        initialEditMode={selectedInEditMode}
      />

      {/* Modal confirmación de borrado */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} color="var(--color-danger)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>Eliminar contrato</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{confirmDelete.folio}</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.5 }}>
              ¿Confirmas eliminar el contrato de <strong>{confirmDelete.arrendatario_nombre}</strong>?
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-danger)', margin: '0 0 24px', background: '#FFF5F5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FECACA' }}>
              Esta acción es irreversible. El registro se eliminará permanentemente.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                style={{ padding: '9px 20px', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Cancelar
              </button>
              <button disabled={deleting} onClick={async () => {
                setDeleting(true)
                await supabase.from('contratos_locales').delete().eq('contrato_id', confirmDelete.id)
                await supabase.from('contratos').delete().eq('id', confirmDelete.id)
                setDeleting(false)
                setConfirmDelete(null)
                setRefreshKey(k => k + 1)
              }}
                style={{ padding: '9px 20px', border: 'none', borderRadius: '8px', background: 'var(--color-danger)', color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNuevo && (
        <NuevoContratoModal
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setRefreshKey(k => k + 1); setShowNuevo(false) }}
        />
      )}
    </div>
  )
}
