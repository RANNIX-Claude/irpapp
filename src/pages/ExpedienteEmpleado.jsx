import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Briefcase, FileText, AlertCircle, Clock,
  DollarSign, BarChart2, Phone, Mail, Calendar, Hash,
  Edit2, Plus, X, Save, ChevronRight, TrendingUp,
  Award, CreditCard, CheckCircle, AlertTriangle,
  Users, Download, Upload, Star, BookOpen, Heart,
  History, Settings, Printer, Shield, Activity,
  ChevronDown, MoreVertical, Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { urlFirmada } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Paleta RANNIX ────────────────────────────────────────────────────────────
const C = {
  primary: '#0A66C2', dark: '#1A3C5E', gold: '#E8A020',
  success: '#057642', warning: '#F59E0B', danger: '#B24020',
  bg: '#F0F4F8', surface: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', light: '#F8FAFC',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const fmtD = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function antiguedad(fi) {
  if (!fi) return '—'
  const d0 = new Date(fi + 'T12:00:00'), d1 = new Date()
  let y = d1.getFullYear() - d0.getFullYear(), m = d1.getMonth() - d0.getMonth()
  if (m < 0) { y--; m += 12 }
  if (y === 0) return `${m} mes${m !== 1 ? 'es' : ''}`
  return `${y} año${y !== 1 ? 's' : ''} ${m > 0 ? m + ' mes' + (m !== 1 ? 'es' : '') : ''}`.trim()
}

const TIPOS_DOC = ['CONTRATO','INE','CURP','NSS','CONSTANCIA_MEDICA','COMPROBANTE_DOM','FOTO','ACTA_NAC','RFC','OTRO']
const TIPO_DOC_LABEL = { CONTRATO:'Contrato laboral', INE:'INE/IFE', CURP:'CURP', NSS:'NSS', CONSTANCIA_MEDICA:'Constancia médica', COMPROBANTE_DOM:'Comprobante domicilio', FOTO:'Fotografía', ACTA_NAC:'Acta de nacimiento', RFC:'RFC', OTRO:'Otro' }
const TIPO_DOC_FMT_COLOR = { PDF:'#EF4444', XLSX:'#16A34A', DOCX:'#2563EB', JPG:'#D97706', PNG:'#7C3AED' }
const TIPO_SUELDO = { AJUSTE:{label:'Ajuste',color:C.primary}, PROMOCION:{label:'Promoción',color:C.success}, REVISION:{label:'Revisión anual',color:C.gold}, CORRECION:{label:'Corrección',color:C.muted}, INICIAL:{label:'Inicial',color:C.dark} }
const TIPO_CONTRATO = { TEMPORAL_3SEM:'Temporal 3 semanas', TEMPORAL_30D:'Temporal 30 días', PRUEBA_90:'Prueba 90 días', INDEFINIDO:'Tiempo indefinido' }
const EVAL_COLOR = { EXCELENTE:C.success, BUENO:C.primary, REGULAR:C.warning, DEFICIENTE:C.danger }

const CAMPOS_EXPEDIENTE = ['CONTRATO','INE','CURP','NSS','CONSTANCIA_MEDICA','COMPROBANTE_DOM','FOTO','ACTA_NAC','RFC']

const AVATAR_COLORS = ['#0A66C2','#057642','#E8A020','#B24020','#6B21A8','#0F766E']

// ── UI Atoms ─────────────────────────────────────────────────────────────────
function Avatar({ nombre, foto, size = 56 }) {
  if (foto) return <img src={foto} alt={nombre} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.surface}`, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }} />
  const ini = (nombre || 'NN').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
  const col = AVATAR_COLORS[(nombre || '').charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: col + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 800, color: col, border: `3px solid ${C.surface}`, boxShadow: '0 2px 8px rgba(0,0,0,.15)', flexShrink: 0 }}>
      {ini}
    </div>
  )
}

function Badge({ label, color = C.primary, bg }) {
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg || color + '15', color, letterSpacing: '.2px' }}>{label}</span>
}

function Campo({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? C.text : C.muted, fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</div>
    </div>
  )
}

function Grid4({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px 24px' }}>{children}</div>
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} color={C.primary} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Empty({ icon: Icon = FileText, msg, color = C.muted }) {
  return (
    <div style={{ padding: '36px 0', textAlign: 'center', color }}>
      <Icon size={30} style={{ marginBottom: 8, opacity: .35 }} />
      <div style={{ fontSize: 13, color: C.muted }}>{msg}</div>
    </div>
  )
}

function BtnPrimary({ onClick, children, small }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: small ? '5px 12px' : '8px 16px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: small ? 12 : 13, fontWeight: 600 }}>
      {children}
    </button>
  )
}

function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: C.light, border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: C.muted }}>
      {children}
    </button>
  )
}

// ── Completitud del expediente ─────────────────────────────────────────────
function Completitud({ docs }) {
  const presentes = CAMPOS_EXPEDIENTE.filter(t => docs.some(d => d.tipo === t)).length
  const pct = Math.round(presentes / CAMPOS_EXPEDIENTE.length * 100)
  const color = pct === 100 ? C.success : pct >= 60 ? C.warning : C.danger
  const r = 22, stroke = 4, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
        <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', lineHeight: 1.3 }}>
        Expediente<br />{pct === 100 ? '✓ completo' : `${presentes}/${CAMPOS_EXPEDIENTE.length} docs`}
      </div>
    </div>
  )
}

// ── Modal: cambio de sueldo ──────────────────────────────────────────────────
function ModalSueldo({ empleadoId, sueldoActual, onClose, onSaved }) {
  const [form, setForm] = useState({ sueldo_nuevo: '', motivo: '', tipo: 'AJUSTE', fecha: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.sueldo_nuevo) return toast.error('Ingresa el nuevo sueldo')
    setSaving(true)
    const { error } = await supabase.from('rh_historial_sueldo').insert({
      empleado_id: empleadoId, fecha: form.fecha,
      sueldo_anterior: parseFloat(sueldoActual) || null,
      sueldo_nuevo: parseFloat(form.sueldo_nuevo),
      motivo: form.motivo || null, tipo: form.tipo,
    })
    if (!error) await supabase.from('prp_empleados').update({ salario_diario: parseFloat(form.sueldo_nuevo) }).eq('id', empleadoId)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Cambio de sueldo registrado')
    onSaved(); onClose()
  }
  return (
    <Modal title="Cambio de Sueldo" icon={TrendingUp} onClose={onClose}>
      <FormGrid>
        <div style={{ gridColumn: '1/-1', background: C.light, borderRadius: 8, padding: '10px 14px' }}>
          <span style={{ fontSize: 11, color: C.muted }}>Sueldo actual: </span>
          <span style={{ fontWeight: 700, color: C.text }}>{fmt$(sueldoActual)} / día</span>
        </div>
        <FI label="Nuevo sueldo diario *" type="number" value={form.sueldo_nuevo} onChange={v => sf('sueldo_nuevo', v)} />
        <FI label="Fecha efectiva" type="date" value={form.fecha} onChange={v => sf('fecha', v)} />
        <FI label="Tipo" type="select" value={form.tipo} onChange={v => sf('tipo', v)}
          opts={[['AJUSTE','Ajuste salarial'],['PROMOCION','Promoción'],['REVISION','Revisión anual'],['CORRECION','Corrección']]} />
        <FI label="Motivo" type="text" value={form.motivo} onChange={v => sf('motivo', v)} span />
      </FormGrid>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} label="Registrar cambio" />
    </Modal>
  )
}

// ── Modal: cambio de nombre ──────────────────────────────────────────────────
function ModalNombre({ empleadoId, nombreActual, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre_nuevo: '', motivo: '', fecha: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.nombre_nuevo.trim()) return toast.error('Ingresa el nuevo nombre')
    setSaving(true)
    const { error } = await supabase.from('rh_historial_nombre').insert({ empleado_id: empleadoId, fecha: form.fecha, nombre_anterior: nombreActual, nombre_nuevo: form.nombre_nuevo.trim(), motivo: form.motivo || null })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Cambio de nombre registrado'); onSaved(); onClose()
  }
  return (
    <Modal title="Cambio de Nombre" icon={User} onClose={onClose}>
      <FormGrid>
        <div style={{ gridColumn: '1/-1', background: C.light, borderRadius: 8, padding: '10px 14px' }}>
          <span style={{ fontSize: 11, color: C.muted }}>Nombre actual: </span>
          <span style={{ fontWeight: 700, color: C.text }}>{nombreActual}</span>
        </div>
        <FI label="Nuevo nombre completo *" value={form.nombre_nuevo} onChange={v => sf('nombre_nuevo', v)} span />
        <FI label="Fecha efectiva" type="date" value={form.fecha} onChange={v => sf('fecha', v)} />
        <FI label="Motivo (matrimonio, corrección…)" value={form.motivo} onChange={v => sf('motivo', v)} />
      </FormGrid>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} label="Registrar cambio" />
    </Modal>
  )
}

// ── Modal: agregar documento ────────────────────────────────────────────────
function ModalDocumento({ empleadoId, onClose, onSaved }) {
  const [form, setForm] = useState({ tipo: 'CONTRATO', nombre: '', fecha_doc: '', vence: '', notas: '' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.nombre) return toast.error('Escribe el nombre del documento')
    setSaving(true)
    let archivo_url = null, archivo_path = null, tamano_kb = null, formato = null
    if (file) {
      const ext = file.name.split('.').pop().toUpperCase()
      const path = `expedientes/${empleadoId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('rh-expedientes').upload(path, file, { upsert: true })
      if (!upErr) { archivo_path = path; tamano_kb = Math.round(file.size / 1024); formato = ext }
    }
    const { error } = await supabase.from('rh_expediente_documentos').insert({
      empleado_id: empleadoId, tipo: form.tipo, nombre: form.nombre,
      archivo_url, archivo_path, tamano_kb, formato,
      fecha_doc: form.fecha_doc || null, vence: form.vence || null, notas: form.notas || null,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Documento registrado'); onSaved(); onClose()
  }
  return (
    <Modal title="Agregar Documento" icon={FileText} onClose={onClose}>
      <FormGrid>
        <FI label="Tipo de documento" type="select" value={form.tipo} onChange={v => sf('tipo', v)} opts={TIPOS_DOC.map(t => [t, TIPO_DOC_LABEL[t]])} />
        <FI label="Nombre del documento *" value={form.nombre} onChange={v => sf('nombre', v)} />
        <FI label="Fecha del documento" type="date" value={form.fecha_doc} onChange={v => sf('fecha_doc', v)} />
        <FI label="Fecha de vencimiento" type="date" value={form.vence} onChange={v => sf('vence', v)} />
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Archivo (PDF, DOCX, XLSX, imagen)</label>
          <input type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])}
            style={{ display: 'block', width: '100%', padding: '8px', border: `1.5px dashed ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }} />
        </div>
        <FI label="Notas" value={form.notas} onChange={v => sf('notas', v)} span />
      </FormGrid>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} label="Guardar documento" />
    </Modal>
  )
}

// ── Modal: agregar capacitación ─────────────────────────────────────────────
function ModalCapacitacion({ empleadoId, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'INTERNA', institucion: '', fecha_inicio: '', fecha_fin: '', horas: '', resultado: 'APROBADO', notas: '' })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.nombre) return toast.error('Ingresa el nombre del curso')
    setSaving(true)
    const { error } = await supabase.from('rh_capacitacion').insert({
      empleado_id: empleadoId, nombre: form.nombre, tipo: form.tipo,
      institucion: form.institucion || null, fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null, horas: parseFloat(form.horas) || null,
      resultado: form.resultado, notas: form.notas || null,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Capacitación registrada'); onSaved(); onClose()
  }
  return (
    <Modal title="Registrar Capacitación" icon={BookOpen} onClose={onClose}>
      <FormGrid>
        <FI label="Nombre del curso/capacitación *" value={form.nombre} onChange={v => sf('nombre', v)} span />
        <FI label="Tipo" type="select" value={form.tipo} onChange={v => sf('tipo', v)} opts={[['INTERNA','Interna'],['EXTERNA','Externa'],['CERTIFICACION','Certificación'],['CURSO','Curso en línea']]} />
        <FI label="Institución / Proveedor" value={form.institucion} onChange={v => sf('institucion', v)} />
        <FI label="Fecha inicio" type="date" value={form.fecha_inicio} onChange={v => sf('fecha_inicio', v)} />
        <FI label="Fecha fin" type="date" value={form.fecha_fin} onChange={v => sf('fecha_fin', v)} />
        <FI label="Horas" type="number" value={form.horas} onChange={v => sf('horas', v)} />
        <FI label="Resultado" type="select" value={form.resultado} onChange={v => sf('resultado', v)} opts={[['APROBADO','Aprobado'],['REPROBADO','Reprobado'],['EN_CURSO','En curso']]} />
        <FI label="Notas" value={form.notas} onChange={v => sf('notas', v)} span />
      </FormGrid>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} label="Registrar" />
    </Modal>
  )
}

// ── Modal: agregar evaluación ────────────────────────────────────────────────
function ModalEvaluacion({ empleadoId, onClose, onSaved }) {
  const [form, setForm] = useState({ periodo: '', tipo: 'ANUAL', calificacion: '', nivel: 'BUENO', evaluador: '', fortalezas: '', areas_mejora: '', fecha: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.periodo) return toast.error('Indica el período')
    setSaving(true)
    const { error } = await supabase.from('rh_evaluaciones').insert({
      empleado_id: empleadoId, periodo: form.periodo, tipo: form.tipo,
      calificacion: parseFloat(form.calificacion) || null, nivel: form.nivel,
      evaluador: form.evaluador || null, fortalezas: form.fortalezas || null,
      areas_mejora: form.areas_mejora || null, fecha: form.fecha,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Evaluación registrada'); onSaved(); onClose()
  }
  return (
    <Modal title="Registrar Evaluación" icon={Star} onClose={onClose}>
      <FormGrid>
        <FI label="Período (ej. 2026-Anual) *" value={form.periodo} onChange={v => sf('periodo', v)} />
        <FI label="Tipo" type="select" value={form.tipo} onChange={v => sf('tipo', v)} opts={[['ANUAL','Anual'],['SEMESTRAL','Semestral'],['TRIMESTRAL','Trimestral'],['PRUEBA','Período de prueba']]} />
        <FI label="Calificación (0-100)" type="number" value={form.calificacion} onChange={v => sf('calificacion', v)} />
        <FI label="Nivel" type="select" value={form.nivel} onChange={v => sf('nivel', v)} opts={[['EXCELENTE','Excelente'],['BUENO','Bueno'],['REGULAR','Regular'],['DEFICIENTE','Deficiente']]} />
        <FI label="Evaluador" value={form.evaluador} onChange={v => sf('evaluador', v)} />
        <FI label="Fecha" type="date" value={form.fecha} onChange={v => sf('fecha', v)} />
        <FI label="Fortalezas" value={form.fortalezas} onChange={v => sf('fortalezas', v)} span />
        <FI label="Áreas de mejora" value={form.areas_mejora} onChange={v => sf('areas_mejora', v)} span />
      </FormGrid>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} label="Registrar" />
    </Modal>
  )
}

// ── Modal: agregar beneficio ─────────────────────────────────────────────────
function ModalBeneficio({ empleadoId, onClose, onSaved }) {
  const [form, setForm] = useState({ tipo: 'VALES_DESPENSA', descripcion: '', monto: '', periodicidad: 'MENSUAL', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => {
    if (!form.tipo) return toast.error('Selecciona el tipo de beneficio')
    setSaving(true)
    const { error } = await supabase.from('rh_beneficios').insert({
      empleado_id: empleadoId, tipo: form.tipo, descripcion: form.descripcion || null,
      monto: parseFloat(form.monto) || null, periodicidad: form.periodicidad,
      activo: true, fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null, notas: form.notas || null,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Beneficio registrado'); onSaved(); onClose()
  }
  return (
    <Modal title="Agregar Beneficio" icon={Heart} onClose={onClose}>
      <FormGrid>
        <FI label="Tipo" type="select" value={form.tipo} onChange={v => sf('tipo', v)} opts={[['VALES_DESPENSA','Vales de despensa'],['SEGURO_MEDICO','Seguro médico'],['FONDO_AHORRO','Fondo de ahorro'],['CAJA_AHORRO','Caja de ahorro'],['BONO','Bono'],['OTRO','Otro']]} />
        <FI label="Monto" type="number" value={form.monto} onChange={v => sf('monto', v)} />
        <FI label="Periodicidad" type="select" value={form.periodicidad} onChange={v => sf('periodicidad', v)} opts={[['MENSUAL','Mensual'],['QUINCENAL','Quincenal'],['ANUAL','Anual'],['UNICO','Único']]} />
        <FI label="Descripción" value={form.descripcion} onChange={v => sf('descripcion', v)} span />
        <FI label="Fecha inicio" type="date" value={form.fecha_inicio} onChange={v => sf('fecha_inicio', v)} />
        <FI label="Fecha fin (si aplica)" type="date" value={form.fecha_fin} onChange={v => sf('fecha_fin', v)} />
      </FormGrid>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} label="Agregar" />
    </Modal>
  )
}

// ── Componentes genéricos de formulario ──────────────────────────────────────
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }
const inputStyle = { display: 'block', width: '100%', padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', background: C.surface }

function FI({ label, type = 'text', value, onChange, opts, span }) {
  return (
    <div style={span ? { gridColumn: '1/-1' } : {}}>
      <label style={labelStyle}>{label}</label>
      {type === 'select'
        ? <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, background: C.surface, cursor: 'pointer' }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
      }
    </div>
  )
}

function FormGrid({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div> }

function Modal({ title, icon: Icon, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 14, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.surface, zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={16} color={C.primary} /> {title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, onSave, saving, label }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
      <button onClick={onClose} style={{ padding: '8px 18px', border: `1.5px solid ${C.border}`, borderRadius: 7, background: 'none', cursor: 'pointer', fontSize: 13, color: C.muted }}>Cancelar</button>
      <button onClick={onSave} disabled={saving} style={{ padding: '8px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? .6 : 1 }}>
        {saving ? 'Guardando…' : label}
      </button>
    </div>
  )
}

// ── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',      label: 'Resumen',          icon: BarChart2 },
  { id: 'laboral',      label: 'Información laboral', icon: Briefcase },
  { id: 'documentos',   label: 'Documentos',        icon: FileText },
  { id: 'incidencias',  label: 'Incidencias',       icon: AlertCircle },
  { id: 'asistencia',   label: 'Asistencia',        icon: Clock },
  { id: 'nomina',       label: 'Nómina',            icon: CreditCard },
  { id: 'capacitacion', label: 'Capacitación',      icon: BookOpen },
  { id: 'evaluaciones', label: 'Evaluaciones',      icon: Star },
  { id: 'beneficios',   label: 'Beneficios',        icon: Heart },
  { id: 'historial',    label: 'Historial',         icon: History },
]

// ── Avatar con upload ────────────────────────────────────────────────────────
function AvatarUpload({ nombre, foto, size = 72, uploading, inputRef, onChange }) {
  const [hovered, setHovered] = useState(false)
  const ini = (nombre || 'NN').split(' ').slice(0,2).map(w => w[0]||'').join('').toUpperCase()
  const col = AVATAR_COLORS[(nombre||'').charCodeAt(0) % AVATAR_COLORS.length]
  const showOverlay = hovered || uploading
  return (
    <div
      style={{ position: 'relative', cursor: 'pointer', flexShrink: 0, width: size, height: size }}
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Cambiar foto de perfil"
    >
      {foto
        ? <img src={foto} alt={nombre} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.15)', display: 'block' }} />
        : <div style={{ width: size, height: size, borderRadius: '50%', background: col+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size*0.35, fontWeight: 800, color: col, border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>{ini}</div>
      }
      {/* Overlay hover/uploading */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: showOverlay ? 1 : 0, transition: 'opacity .18s', pointerEvents: 'none' }}>
        {uploading
          ? <div style={{ width: 22, height: 22, border: '2.5px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          : <><Upload size={18} color="white" /><span style={{ fontSize: 9, color: 'white', fontWeight: 700, letterSpacing: '.3px' }}>CAMBIAR</span></>
        }
      </div>
      {/* Badge cámara */}
      {!uploading && (
        <div style={{ position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: C.primary, border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Upload size={9} color="white" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onChange} />
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ExpedienteEmpleado() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('resumen')
  const [histSueldo, setHistSueldo] = useState([])
  const [histNombre, setHistNombre] = useState([])
  const [histCambios, setHistCambios] = useState([])
  const [docs, setDocs]             = useState([])
  const [incidencias, setIncidencias] = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [nominaPeriodos, setNomina] = useState([])
  const [capacitacion, setCapacitacion] = useState([])
  const [evaluaciones, setEvaluaciones] = useState([])
  const [beneficios, setBeneficios] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const [modal, setModal] = useState(null) // 'sueldo' | 'nombre' | 'doc' | 'capac' | 'eval' | 'benef'
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = useRef(null)
  const reload = () => setRefreshKey(k => k + 1)

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !emp) return
    setUploadingFoto(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `${emp.id}.${ext}`
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.error('Sin sesión activa'); return }
      const base = import.meta.env.VITE_SUPABASE_URL
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${base}/storage/v1/object/avatars/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: anon, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file,
      })
      if (!res.ok) { const t = await res.text(); toast.error('Error foto: ' + t); return }
      const url = `${base}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`
      await supabase.from('rh_empleados').update({ foto_url: url }).eq('id', emp.id)
      setEmp(em => ({ ...em, foto_url: url }))
      toast.success('Foto actualizada')
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setUploadingFoto(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [empR, sueldoR, nombreR, cambiosR, docsR, incR, asistR, nomR, capacR, evalR, benefR] = await Promise.all([
      supabase.from('prp_empleados').select('*').eq('id', id).maybeSingle(),
      supabase.from('rh_historial_sueldo').select('*').eq('empleado_id', id).order('fecha', { ascending: false }),
      supabase.from('rh_historial_nombre').select('*').eq('empleado_id', id).order('fecha', { ascending: false }),
      supabase.from('rh_historial_cambios').select('*').eq('empleado_id', id).order('fecha', { ascending: false }),
      supabase.from('rh_expediente_documentos').select('*').eq('empleado_id', id).order('created_at', { ascending: false }),
      supabase.from('prp_incidencias').select('*').eq('empleado_id', id).order('fecha', { ascending: false }).limit(50),
      supabase.from('prp_asistencia').select('*').eq('empleado_id', id).order('fecha', { ascending: false }).limit(30),
      supabase.from('nomina_periodos').select('id,folio,fecha_inicio,fecha_fin,estado,total_neto').order('fecha_inicio', { ascending: false }).limit(20),
      supabase.from('rh_capacitacion').select('*').eq('empleado_id', id).order('fecha_inicio', { ascending: false }),
      supabase.from('rh_evaluaciones').select('*').eq('empleado_id', id).order('fecha', { ascending: false }),
      supabase.from('rh_beneficios').select('*').eq('empleado_id', id).order('activo', { ascending: false }),
    ])
    setEmp(empR.data)
    setHistSueldo(sueldoR.data ?? [])
    setHistNombre(nombreR.data ?? [])
    setHistCambios(cambiosR.data ?? [])
    setDocs(docsR.data ?? [])
    setIncidencias(incR.data ?? [])
    setAsistencia(asistR.data ?? [])
    setNomina(nomR.data ?? [])
    setCapacitacion(capacR.data ?? [])
    setEvaluaciones(evalR.data ?? [])
    setBeneficios(benefR.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData, refreshKey])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: C.muted, flexDirection: 'column' }}>
      <div style={{ width: 30, height: 30, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Cargando expediente…
    </div>
  )
  if (!emp) return <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Empleado no encontrado. <button onClick={() => navigate('/rh')} style={{ color: C.primary, border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Volver</button></div>

  const salMensual = (parseFloat(emp.salario_diario) || 0) * 30
  const activo = emp.estado_id === 'ACTIVO'
  const pctExp = Math.round(CAMPOS_EXPEDIENTE.filter(t => docs.some(d => d.tipo === t)).length / CAMPOS_EXPEDIENTE.length * 100)

  // Actividad reciente combinada
  const actividad = [
    ...histSueldo.map(h => ({ fecha: h.fecha, tipo: 'sueldo', desc: `Cambio sueldo: ${fmt$(h.sueldo_anterior)} → ${fmt$(h.sueldo_nuevo)}`, icon: TrendingUp, color: C.success })),
    ...histNombre.map(h => ({ fecha: h.fecha, tipo: 'nombre', desc: `Cambio nombre: ${h.nombre_anterior} → ${h.nombre_nuevo}`, icon: User, color: C.primary })),
    ...docs.slice(0,5).map(d => ({ fecha: d.fecha_doc || d.created_at?.slice(0,10), tipo: 'doc', desc: `Documento: ${d.nombre}`, icon: FileText, color: C.gold })),
    ...evaluaciones.map(e => ({ fecha: e.fecha, tipo: 'eval', desc: `Evaluación ${e.periodo}: ${e.nivel} (${e.calificacion ?? '—'})`, icon: Star, color: C.warning })),
  ].filter(a => a.fecha).sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0, 8)

  // Próximas fechas
  const hoy = new Date().toISOString().split('T')[0]
  const proxFechas = [
    emp.fecha_fin_contrato && { label: 'Vencimiento contrato', fecha: emp.fecha_fin_contrato, color: C.danger },
    ...docs.filter(d => d.vence && d.vence > hoy).map(d => ({ label: `Vence: ${d.nombre}`, fecha: d.vence, color: C.warning })),
  ].filter(Boolean).sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,4)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/rh')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', color: C.muted, fontSize: 13 }}>
          <ArrowLeft size={13} /> RH
        </button>
        <ChevronRight size={13} color={C.muted} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{emp.nombre_completo}</span>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{emp.numero_empleado}</span>
        <div style={{ flex: 1 }} />
        <Badge label={activo ? 'Activo' : 'Inactivo'} color={activo ? C.success : C.danger} />
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: C.muted }}>
          <Printer size={13} /> Imprimir
        </button>
      </div>

      {/* Encabezado tipo LinkedIn */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 90, background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 60%, ${C.primary}99 100%)`, borderRadius: '0 0 12px 12px', marginBottom: '-28px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 8px 16px' }}>
            {/* Avatar clickeable — cambiar foto */}
            <AvatarUpload
              nombre={emp.nombre_completo}
              foto={emp.foto_url}
              size={72}
              uploading={uploadingFoto}
              inputRef={fotoInputRef}
              onChange={handleFotoChange}
            />
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>{emp.nombre_completo}</h1>
                <Badge label={activo ? 'Activo' : 'Inactivo'} color={activo ? C.success : C.danger} />
              </div>
              <div style={{ fontSize: 14, color: C.primary, fontWeight: 600, marginTop: 2 }}>{emp.puesto || '—'}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                {emp.email && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{emp.email}</span>}
                {emp.celular && <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{emp.celular}</span>}
                <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={12} />ID: {emp.numero_empleado}</span>
                <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />Desde {fmtD(emp.fecha_ingreso)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
              <Completitud docs={docs} />
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? `2.5px solid ${C.primary}` : '2.5px solid transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.primary : C.muted, whiteSpace: 'nowrap', transition: 'all .15s' }}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Columna central */}
        <div style={{ display: 'grid', gap: 20 }}>

          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <>
              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: C.border, borderRadius: 8, overflow: 'hidden' }}>
                  {[
                    [Briefcase, 'Puesto actual', emp.puesto, emp.area, C.primary],
                    [Users, 'Antigüedad', antiguedad(emp.fecha_ingreso), `Desde ${fmtD(emp.fecha_ingreso)}`, C.dark],
                    [Shield, 'Departamento', emp.departamento || emp.area || '—', 'Dirección', C.gold],
                    [Activity, 'Estatus', activo ? 'Activo' : 'Inactivo', TIPO_CONTRATO[emp.tipo_contrato] || emp.tipo_contrato || '—', activo ? C.success : C.danger],
                  ].map(([Icon, label, val, sub, color]) => (
                    <div key={label} style={{ background: C.surface, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Icon size={15} color={color} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{val}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <Section title="Información laboral" icon={Briefcase} action={<BtnSecondary onClick={() => setTab('laboral')}>Ver más</BtnSecondary>}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 0' }}>
                    {[
                      ['Fecha de ingreso', fmtD(emp.fecha_ingreso)],
                      ['Tipo de contrato', TIPO_CONTRATO[emp.tipo_contrato] || emp.tipo_contrato],
                      ['Departamento', emp.departamento],
                      ['Puesto', emp.puesto],
                      ['Centro de trabajo', emp.centro_trabajo],
                      ['Salario base', fmt$(emp.salario_diario) + ' / día'],
                      ['Tipo de jornada', emp.tipo_jornada || 'Jornada Completa'],
                      ['Horario', emp.horario_trabajo],
                      ['Supervisor', emp.supervisor],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 12, color: C.muted, minWidth: 140 }}>{k}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>

              <Card>
                <Section title="Resumen de incidencias (últimos 30 días)" icon={AlertCircle} action={<BtnSecondary onClick={() => setTab('incidencias')}>Ver todas</BtnSecondary>}>
                  {incidencias.length === 0 ? <Empty icon={CheckCircle} msg="Sin incidencias" color={C.success} /> : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                        {[['Retardos','RETARDO',C.warning],['Faltas','FALTA',C.danger],['Permisos','PERMISO',C.primary],['Horas extra','HORA_EXTRA',C.success]].map(([l, tipo, c]) => (
                          <div key={l} style={{ textAlign: 'center', padding: '10px', background: c + '10', borderRadius: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{incidencias.filter(i => i.tipo_incidencia === tipo || i.tipo === tipo).length}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <IncidenciasTable rows={incidencias.slice(0, 4)} />
                    </>
                  )}
                </Section>
              </Card>
            </>
          )}

          {/* ── INFORMACIÓN LABORAL ── */}
          {tab === 'laboral' && (
            <Card>
              <div style={{ display: 'grid', gap: 24 }}>
                <Section title="Datos personales" icon={User}>
                  <Grid4>
                    <Campo label="Nombre(s)" value={emp.nombre} />
                    <Campo label="Apellido paterno" value={emp.apellido_pat} />
                    <Campo label="Apellido materno" value={emp.apellido_mat} />
                    <Campo label="Sexo" value={emp.sexo === 'M' ? 'Masculino' : emp.sexo === 'F' ? 'Femenino' : emp.sexo} />
                    <Campo label="Fecha de nacimiento" value={fmtD(emp.fecha_nacimiento)} />
                    <Campo label="RFC" value={emp.rfc} mono />
                    <Campo label="CURP" value={emp.curp} mono />
                    <Campo label="NSS" value={emp.nss} mono />
                  </Grid4>
                </Section>
                <Section title="Datos laborales" icon={Briefcase}>
                  <Grid4>
                    <Campo label="N° empleado" value={emp.numero_empleado} mono />
                    <Campo label="Puesto" value={emp.puesto} />
                    <Campo label="Área" value={emp.area} />
                    <Campo label="Departamento" value={emp.departamento} />
                    <Campo label="Centro de trabajo" value={emp.centro_trabajo} />
                    <Campo label="Supervisor" value={emp.supervisor} />
                    <Campo label="Fecha de ingreso" value={fmtD(emp.fecha_ingreso)} />
                    <Campo label="Tipo de contrato" value={TIPO_CONTRATO[emp.tipo_contrato] || emp.tipo_contrato} />
                    <Campo label="Fecha fin contrato" value={fmtD(emp.fecha_fin_contrato)} />
                    <Campo label="Tipo de jornada" value={emp.tipo_jornada} />
                  </Grid4>
                </Section>
                <Section title="Compensación y pago" icon={DollarSign}>
                  <Grid4>
                    <Campo label="Sueldo diario" value={fmt$(emp.salario_diario)} />
                    <Campo label="Sueldo mensual aprox." value={fmt$(salMensual)} />
                    <Campo label="Forma de pago" value={emp.forma_pago} />
                    <Campo label="Banco / CLABE" value={emp.clabe || emp.banco} mono />
                  </Grid4>
                </Section>
                <Section title="Horario" icon={Clock}>
                  <Grid4>
                    <Campo label="Horario" value={emp.horario_trabajo} />
                    <Campo label="Día de descanso" value={emp.dia_descanso} />
                  </Grid4>
                </Section>
                <Section title="Contacto" icon={Phone}>
                  <Grid4>
                    <Campo label="Email" value={emp.email} />
                    <Campo label="Celular" value={emp.celular} />
                    <Campo label="Dirección" value={emp.direccion} />
                  </Grid4>
                </Section>
              </div>
            </Card>
          )}

          {/* ── DOCUMENTOS ── */}
          {tab === 'documentos' && (
            <Card>
              <Section title="Documentos del expediente" icon={FileText} action={<BtnPrimary onClick={() => setModal('doc')} small><Plus size={13} /> Agregar</BtnPrimary>}>
                {/* Checklist completitud */}
                <div style={{ background: C.light, borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Documentos requeridos ({CAMPOS_EXPEDIENTE.filter(t => docs.some(d => d.tipo === t)).length}/{CAMPOS_EXPEDIENTE.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                    {CAMPOS_EXPEDIENTE.map(t => {
                      const tiene = docs.some(d => d.tipo === t)
                      return (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: tiene ? C.success : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {tiene && <CheckCircle size={10} color="#fff" />}
                          </div>
                          <span style={{ color: tiene ? C.text : C.muted }}>{TIPO_DOC_LABEL[t]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {docs.length === 0 ? <Empty icon={FileText} msg="Sin documentos registrados" /> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {docs.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.light }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: (TIPO_DOC_FMT_COLOR[doc.formato] || C.muted) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: TIPO_DOC_FMT_COLOR[doc.formato] || C.muted, flexShrink: 0 }}>
                          {doc.formato || '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{doc.nombre}</div>
                          <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 10, marginTop: 2 }}>
                            <span>{TIPO_DOC_LABEL[doc.tipo] || doc.tipo}</span>
                            {doc.tamano_kb && <span>· {doc.tamano_kb} KB</span>}
                            {doc.fecha_doc && <span>· {fmtD(doc.fecha_doc)}</span>}
                            {doc.vence && <span style={{ color: doc.vence < hoy ? C.danger : C.warning }}>· Vence {fmtD(doc.vence)}</span>}
                          </div>
                        </div>
                        {doc.archivo_path && (
                          <button onClick={async () => { const url = await urlFirmada('rh-expedientes', doc.archivo_path); if (url) window.open(url) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, cursor: 'pointer', fontSize: 12, color: C.primary }}>
                            <Download size={13} /> Descargar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          )}

          {/* ── INCIDENCIAS ── */}
          {tab === 'incidencias' && (
            <Card>
              <Section title="Historial de incidencias" icon={AlertCircle}>
                {incidencias.length === 0 ? <Empty icon={CheckCircle} msg="Sin incidencias" color={C.success} /> : <IncidenciasTable rows={incidencias} />}
              </Section>
            </Card>
          )}

          {/* ── ASISTENCIA ── */}
          {tab === 'asistencia' && (
            <Card>
              <Section title="Registro de asistencia (últimos 30 días)" icon={Clock}>
                {asistencia.length === 0 ? <Empty icon={Clock} msg="Sin registros de asistencia" /> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: C.light }}>{['Fecha','Entrada','Salida','Horas','Estatus'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                      <tbody>
                        {asistencia.map(a => (
                          <tr key={a.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <Td>{fmtD(a.fecha)}</Td>
                            <Td mono>{a.hora_entrada || '—'}</Td>
                            <Td mono>{a.hora_salida || '—'}</Td>
                            <Td mono>{a.horas_trabajadas ? `${a.horas_trabajadas}h` : '—'}</Td>
                            <Td><Badge label={a.estatus || 'Registrado'} color={a.estatus === 'RETARDO' ? C.warning : C.success} /></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </Card>
          )}

          {/* ── NÓMINA ── */}
          {tab === 'nomina' && (
            <Card>
              <Section title="Períodos de nómina" icon={CreditCard}>
                {nominaPeriodos.length === 0 ? <Empty icon={CreditCard} msg="Sin períodos de nómina" /> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: C.light }}>{['Folio','Período','Estado','Neto'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
                      <tbody>
                        {nominaPeriodos.map(p => (
                          <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <Td mono blue>{p.folio}</Td>
                            <Td small>{fmtD(p.fecha_inicio)} — {fmtD(p.fecha_fin)}</Td>
                            <Td><Badge label={p.estado} color={p.estado === 'PAGADA' || p.estado === 'TIMBRADA' ? C.success : p.estado === 'AUTORIZADA' ? C.primary : C.warning} /></Td>
                            <Td bold>{p.total_neto ? fmt$(p.total_neto) : '—'}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </Card>
          )}

          {/* ── CAPACITACIÓN ── */}
          {tab === 'capacitacion' && (
            <Card>
              <Section title="Capacitación y formación" icon={BookOpen} action={<BtnPrimary onClick={() => setModal('capac')} small><Plus size={13} /> Registrar</BtnPrimary>}>
                {capacitacion.length === 0 ? <Empty icon={BookOpen} msg="Sin capacitaciones registradas" /> : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {capacitacion.map(c => (
                      <div key={c.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', background: C.light }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{c.nombre}</div>
                            {c.institucion && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{c.institucion}</div>}
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                              <Badge label={c.tipo} color={C.primary} />
                              {c.resultado && <Badge label={c.resultado} color={c.resultado === 'APROBADO' ? C.success : c.resultado === 'EN_CURSO' ? C.warning : C.danger} />}
                              {c.horas && <span style={{ fontSize: 11, color: C.muted }}>{c.horas}h</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                            {c.fecha_inicio && <div>{fmtD(c.fecha_inicio)}</div>}
                            {c.fecha_fin && <div>al {fmtD(c.fecha_fin)}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          )}

          {/* ── EVALUACIONES ── */}
          {tab === 'evaluaciones' && (
            <Card>
              <Section title="Evaluaciones de desempeño" icon={Star} action={<BtnPrimary onClick={() => setModal('eval')} small><Plus size={13} /> Registrar</BtnPrimary>}>
                {evaluaciones.length === 0 ? <Empty icon={Star} msg="Sin evaluaciones registradas" /> : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {evaluaciones.map(ev => (
                      <div key={ev.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', background: C.light, borderLeft: `4px solid ${EVAL_COLOR[ev.nivel] || C.muted}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{ev.periodo}</span>
                              <Badge label={ev.nivel} color={EVAL_COLOR[ev.nivel] || C.muted} />
                              <Badge label={ev.tipo} color={C.muted} />
                            </div>
                            {ev.evaluador && <div style={{ fontSize: 12, color: C.muted }}>Evaluador: {ev.evaluador}</div>}
                            {ev.fortalezas && <div style={{ fontSize: 12, color: C.text, marginTop: 6 }}><strong>Fortalezas:</strong> {ev.fortalezas}</div>}
                            {ev.areas_mejora && <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}><strong>Áreas de mejora:</strong> {ev.areas_mejora}</div>}
                          </div>
                          <div style={{ textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: EVAL_COLOR[ev.nivel] || C.muted }}>{ev.calificacion ?? '—'}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{fmtD(ev.fecha)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          )}

          {/* ── BENEFICIOS ── */}
          {tab === 'beneficios' && (
            <Card>
              <Section title="Beneficios y prestaciones" icon={Heart} action={<BtnPrimary onClick={() => setModal('benef')} small><Plus size={13} /> Agregar</BtnPrimary>}>
                {beneficios.length === 0 ? <Empty icon={Heart} msg="Sin beneficios registrados" /> : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {beneficios.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', border: `1px solid ${C.border}`, borderRadius: 10, background: b.activo ? C.light : C.border + '40', opacity: b.activo ? 1 : .6 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Heart size={16} color={C.primary} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{b.tipo.replace(/_/g, ' ')}</div>
                          {b.descripcion && <div style={{ fontSize: 11, color: C.muted }}>{b.descripcion}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {b.monto && <div style={{ fontWeight: 700, fontSize: 14, color: C.success }}>{fmt$(b.monto)}</div>}
                          <div style={{ fontSize: 11, color: C.muted }}>{b.periodicidad}</div>
                        </div>
                        <Badge label={b.activo ? 'Activo' : 'Inactivo'} color={b.activo ? C.success : C.muted} />
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          )}

          {/* ── HISTORIAL ── */}
          {tab === 'historial' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Historial sueldo */}
              <Card>
                <Section title="Historial de sueldo" icon={TrendingUp} action={<BtnPrimary onClick={() => setModal('sueldo')} small><Plus size={13} /> Cambio</BtnPrimary>}>
                  {histSueldo.length === 0 ? <Empty icon={DollarSign} msg="Sin cambios registrados" /> : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {histSueldo.map((h, i) => {
                        const delta = (parseFloat(h.sueldo_nuevo) || 0) - (parseFloat(h.sueldo_anterior) || 0)
                        const pct = h.sueldo_anterior ? (delta / parseFloat(h.sueldo_anterior) * 100).toFixed(1) : null
                        return (
                          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: i === 0 ? C.success + '08' : C.light }}>
                            <TrendingUp size={18} color={TIPO_SUELDO[h.tipo]?.color || C.primary} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                                <Badge label={TIPO_SUELDO[h.tipo]?.label || h.tipo} color={TIPO_SUELDO[h.tipo]?.color || C.primary} />
                                {i === 0 && <Badge label="Actual" color={C.success} />}
                              </div>
                              {h.motivo && <div style={{ fontSize: 12, color: C.muted }}>{h.motivo}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {h.sueldo_anterior != null && <span style={{ fontSize: 12, color: C.muted, textDecoration: 'line-through' }}>{fmt$(h.sueldo_anterior)}</span>}
                                <ChevronRight size={12} color={C.muted} />
                                <span style={{ fontSize: 15, fontWeight: 800, color: delta >= 0 ? C.success : C.danger }}>{fmt$(h.sueldo_nuevo)}</span>
                              </div>
                              {pct && <div style={{ fontSize: 11, color: delta >= 0 ? C.success : C.danger }}>{delta >= 0 ? '↑' : '↓'} {Math.abs(pct)}%</div>}
                              <div style={{ fontSize: 11, color: C.muted }}>{fmtD(h.fecha)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Section>
              </Card>

              {/* Historial nombre */}
              <Card>
                <Section title="Historial de nombre" icon={User} action={<BtnPrimary onClick={() => setModal('nombre')} small><Plus size={13} /> Cambio</BtnPrimary>}>
                  {histNombre.length === 0 ? <Empty icon={User} msg="Sin cambios de nombre" /> : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {histNombre.map((h, i) => (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: i === 0 ? C.primary + '06' : C.light }}>
                          <User size={16} color={C.primary} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                              <span style={{ color: C.muted, textDecoration: 'line-through' }}>{h.nombre_anterior || '—'}</span>
                              <ChevronRight size={12} color={C.muted} />
                              <span style={{ fontWeight: 700, color: C.text }}>{h.nombre_nuevo}</span>
                            </div>
                            {h.motivo && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{h.motivo}</div>}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>{fmtD(h.fecha)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </Card>

              {/* Historial cambios generales */}
              {histCambios.length > 0 && (
                <Card>
                  <Section title="Otros cambios" icon={History}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {histCambios.map(h => (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.light, fontSize: 12 }}>
                          <Badge label={h.tipo} color={C.muted} />
                          <div style={{ flex: 1, color: C.text }}>{h.campo}: <span style={{ textDecoration: 'line-through', color: C.muted }}>{h.valor_anterior}</span> → <strong>{h.valor_nuevo}</strong></div>
                          {h.motivo && <span style={{ color: C.muted, fontSize: 11 }}>{h.motivo}</span>}
                          <span style={{ color: C.muted }}>{fmtD(h.fecha)}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: sidebar */}
        <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 60 }}>

          {/* Documentos recientes */}
          <Card padding="16px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Documentos recientes</span>
              <button onClick={() => setTab('documentos')} style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todos</button>
            </div>
            {docs.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>Sin documentos</div> : docs.slice(0, 4).map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: (TIPO_DOC_FMT_COLOR[d.formato] || C.muted) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: TIPO_DOC_FMT_COLOR[d.formato] || C.muted, flexShrink: 0 }}>{d.formato || '?'}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{d.tamano_kb ? d.tamano_kb + ' KB · ' : ''}{fmtD(d.fecha_doc || d.created_at?.slice(0,10))}</div>
                </div>
                {d.archivo_path && (
                  <button onClick={async () => { const url = await urlFirmada('rh-expedientes', d.archivo_path); if (url) window.open(url) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2 }}>
                    <Download size={13} />
                  </button>
                )}
              </div>
            ))}
          </Card>

          {/* Actividad reciente */}
          <Card padding="16px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Actividad reciente</span>
            </div>
            {actividad.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>Sin actividad</div> : actividad.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <a.icon size={13} color={a.color} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{a.desc}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{fmtD(a.fecha)}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* Próximas fechas */}
          {proxFechas.length > 0 && (
            <Card padding="16px">
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Próximas fechas</div>
              {proxFechas.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={13} color={f.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: f.color, fontWeight: 600 }}>{fmtD(f.fecha)}</div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Acciones */}
          <Card padding="16px">
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Acciones rápidas</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {[
                [TrendingUp, 'Cambio de sueldo', () => setModal('sueldo')],
                [User, 'Cambio de nombre', () => setModal('nombre')],
                [FileText, 'Agregar documento', () => { setTab('documentos'); setModal('doc') }],
                [BookOpen, 'Registrar capacitación', () => { setTab('capacitacion'); setModal('capac') }],
                [Star, 'Nueva evaluación', () => { setTab('evaluaciones'); setModal('eval') }],
                [Heart, 'Agregar beneficio', () => { setTab('beneficios'); setModal('benef') }],
              ].map(([Icon, label, fn]) => (
                <button key={label} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.light, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: C.text, width: '100%', textAlign: 'left' }}>
                  <Icon size={13} color={C.primary} /> {label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modales */}
      {modal === 'sueldo' && <ModalSueldo empleadoId={emp.id} sueldoActual={emp.salario_diario} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'nombre' && <ModalNombre empleadoId={emp.id} nombreActual={emp.nombre_completo} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'doc'    && <ModalDocumento empleadoId={emp.id} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'capac'  && <ModalCapacitacion empleadoId={emp.id} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'eval'   && <ModalEvaluacion empleadoId={emp.id} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'benef'  && <ModalBeneficio empleadoId={emp.id} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  )
}

// ── Mini-componentes tabla ────────────────────────────────────────────────────
const hoy = new Date().toISOString().split('T')[0]

function Th({ children }) { return <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{children}</th> }
function Td({ children, mono, blue, bold, small }) {
  return <td style={{ padding: '10px 12px', fontSize: small ? 11 : 13, fontFamily: mono ? 'monospace' : undefined, color: blue ? C.primary : C.text, fontWeight: bold ? 700 : 400, fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>{children}</td>
}
function Card({ children, padding = '20px' }) { return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding }}>{children}</div> }

function IncidenciasTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: C.light }}>{['Fecha','Tipo','Hora afectada','Duración','Estatus','Justificación'].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
        <tbody>
          {rows.map(inc => (
            <tr key={inc.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <Td small>{fmtD(inc.fecha)}</Td>
              <Td bold>{inc.tipo_incidencia || inc.tipo || '—'}</Td>
              <Td mono small>{inc.hora_inicio ? `${inc.hora_inicio} - ${inc.hora_fin || ''}` : '—'}</Td>
              <Td mono small>{inc.horas_afectadas ? `${inc.horas_afectadas}h` : '—'}</Td>
              <td style={{ padding: '10px 12px' }}><Badge label={inc.estatus || '—'} color={inc.estatus === 'AUTORIZADA' ? C.success : inc.estatus === 'PENDIENTE' ? C.warning : C.danger} /></td>
              <Td small>{inc.justificacion || '—'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
