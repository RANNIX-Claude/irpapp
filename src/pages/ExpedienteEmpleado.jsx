import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Briefcase, FileText, AlertCircle, Clock,
  DollarSign, BarChart2, Phone, Mail, Calendar, Hash,
  Edit2, Plus, X, Save, ChevronRight, Shield, TrendingUp,
  Award, MapPin, CreditCard, CheckCircle, AlertTriangle,
  Users, Printer, Download
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Paleta RANNIX ────────────────────────────────────────────────────────────
const C = {
  primary:  '#0A66C2',
  dark:     '#1A3C5E',
  gold:     '#E8A020',
  success:  '#057642',
  warning:  '#F59E0B',
  danger:   '#B24020',
  bg:       '#F0F4F8',
  surface:  '#FFFFFF',
  border:   '#E2E8F0',
  text:     '#1E293B',
  muted:    '#64748B',
  light:    '#F8FAFC',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtD = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function antiguedad(fechaIngreso) {
  if (!fechaIngreso) return '—'
  const d0 = new Date(fechaIngreso + 'T12:00:00')
  const d1 = new Date()
  let yrs = d1.getFullYear() - d0.getFullYear()
  let mos = d1.getMonth() - d0.getMonth()
  if (mos < 0) { yrs--; mos += 12 }
  if (yrs === 0) return `${mos} mes${mos !== 1 ? 'es' : ''}`
  return `${yrs} año${yrs !== 1 ? 's' : ''} ${mos > 0 ? mos + ' mes' + (mos !== 1 ? 'es' : '') : ''}`
}

const AVATAR_COLORS = ['#0A66C2', '#057642', '#E8A020', '#B24020', '#6B21A8', '#0F766E']
function Avatar({ nombre, foto, size = 56 }) {
  if (foto) return <img src={foto} alt={nombre} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.border}` }} />
  const ini = (nombre || 'NN').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
  const col = AVATAR_COLORS[(nombre || '').charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: col + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 800, color: col, border: `3px solid ${col}30`, flexShrink: 0 }}>
      {ini}
    </div>
  )
}

function Badge({ label, color = C.primary, bg }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg || color + '15', color, letterSpacing: '.3px' }}>
      {label}
    </span>
  )
}

function Pill({ ok, label }) {
  return <Badge label={label} color={ok ? C.success : C.danger} />
}

function KPI({ icon: Icon, label, value, color = C.primary }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{value}</div>
      </div>
    </div>
  )
}

function Campo({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

// ── Modal: registrar cambio de sueldo ────────────────────────────────────────
function ModalSueldo({ empleadoId, sueldoActual, onClose, onSaved }) {
  const [form, setForm] = useState({ sueldo_nuevo: '', motivo: '', tipo: 'AJUSTE', fecha: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.sueldo_nuevo) return toast.error('Ingresa el nuevo sueldo')
    setSaving(true)
    const { error } = await supabase.from('rh_historial_sueldo').insert({
      empleado_id: empleadoId,
      fecha: form.fecha,
      sueldo_anterior: parseFloat(sueldoActual) || null,
      sueldo_nuevo: parseFloat(form.sueldo_nuevo),
      motivo: form.motivo || null,
      tipo: form.tipo,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    // Actualizar salario_diario en prp_empleados
    await supabase.from('prp_empleados').update({ salario_diario: parseFloat(form.sueldo_nuevo) }).eq('id', empleadoId)
    toast.success('Cambio de sueldo registrado')
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 14, width: 440, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={17} color={C.primary} /> Cambio de Sueldo
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Sueldo anterior
            <div style={{ fontSize: 15, fontWeight: 700, color: C.muted, marginTop: 3 }}>{fmt$(sueldoActual)} / día</div>
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Nuevo sueldo diario *
            <input type="number" step="0.01" min="0" value={form.sueldo_nuevo} onChange={e => sf('sueldo_nuevo', e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 14, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Tipo de ajuste
            <select value={form.tipo} onChange={e => sf('tipo', e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, background: C.surface, boxSizing: 'border-box' }}>
              <option value="AJUSTE">Ajuste salarial</option>
              <option value="PROMOCION">Promoción</option>
              <option value="REVISION">Revisión anual</option>
              <option value="CORRECION">Corrección</option>
            </select>
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Fecha efectiva
            <input type="date" value={form.fecha} onChange={e => sf('fecha', e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Motivo
            <textarea value={form.motivo} onChange={e => sf('motivo', e.target.value)} rows={2}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', border: `1.5px solid ${C.border}`, borderRadius: 7, background: 'none', cursor: 'pointer', fontSize: 13, color: C.muted }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? .6 : 1 }}>
            {saving ? 'Guardando…' : 'Registrar cambio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: registrar cambio de nombre ────────────────────────────────────────
function ModalNombre({ empleadoId, nombreActual, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre_nuevo: '', motivo: '', fecha: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.nombre_nuevo.trim()) return toast.error('Ingresa el nuevo nombre completo')
    setSaving(true)
    const { error } = await supabase.from('rh_historial_nombre').insert({
      empleado_id: empleadoId,
      fecha: form.fecha,
      nombre_anterior: nombreActual,
      nombre_nuevo: form.nombre_nuevo.trim(),
      motivo: form.motivo || null,
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Cambio de nombre registrado')
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 14, width: 440, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={17} color={C.primary} /> Cambio de Nombre
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Nombre actual
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 3 }}>{nombreActual}</div>
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Nuevo nombre completo *
            <input value={form.nombre_nuevo} onChange={e => sf('nombre_nuevo', e.target.value)}
              placeholder="Nombre completo actualizado"
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Fecha efectiva
            <input type="date" value={form.fecha} onChange={e => sf('fecha', e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Motivo (matrimonio, corrección, etc.)
            <textarea value={form.motivo} onChange={e => sf('motivo', e.target.value)} rows={2}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', border: `1.5px solid ${C.border}`, borderRadius: 7, background: 'none', cursor: 'pointer', fontSize: 13, color: C.muted }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? .6 : 1 }}>
            {saving ? 'Guardando…' : 'Registrar cambio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen',     label: 'Resumen',       icon: BarChart2 },
  { id: 'datos',       label: 'Datos Generales', icon: User },
  { id: 'sueldo',      label: 'Historial Sueldo', icon: DollarSign },
  { id: 'nombre',      label: 'Historial Nombre', icon: FileText },
  { id: 'incidencias', label: 'Incidencias',    icon: AlertCircle },
  { id: 'nomina',      label: 'Nómina',         icon: CreditCard },
]

const TIPO_CONTRATO_LABEL = {
  TEMPORAL_3SEM: 'Temporal 3 semanas',
  TEMPORAL_30D:  'Temporal 30 días',
  PRUEBA_90:     'Prueba 90 días',
  INDEFINIDO:    'Tiempo indefinido',
}

const TIPO_SUELDO = {
  AJUSTE:    { label: 'Ajuste', color: C.primary },
  PROMOCION: { label: 'Promoción', color: C.success },
  REVISION:  { label: 'Revisión anual', color: C.gold },
  CORRECION: { label: 'Corrección', color: C.muted },
  INICIAL:   { label: 'Sueldo inicial', color: C.dark },
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ExpedienteEmpleado() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('resumen')
  const [histSueldo, setHistSueldo] = useState([])
  const [histNombre, setHistNombre] = useState([])
  const [incidencias, setIncidencias] = useState([])
  const [nominaPeriodos, setNominaPeriodos] = useState([])
  const [modalSueldo, setModalSueldo] = useState(false)
  const [modalNombre, setModalNombre] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = () => setRefreshKey(k => k + 1)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [empRes, sueldoRes, nombreRes, incRes, nomRes] = await Promise.all([
      supabase.from('prp_empleados').select('*').eq('id', id).maybeSingle(),
      supabase.from('rh_historial_sueldo').select('*').eq('empleado_id', id).order('fecha', { ascending: false }),
      supabase.from('rh_historial_nombre').select('*').eq('empleado_id', id).order('fecha', { ascending: false }),
      supabase.from('prp_incidencias').select('*').eq('empleado_id', id).order('fecha', { ascending: false }).limit(50),
      supabase.from('nomina_periodos').select('id, folio, fecha_inicio, fecha_fin, estado, total_neto, created_at').order('fecha_inicio', { ascending: false }).limit(20),
    ])
    setEmp(empRes.data)
    setHistSueldo(sueldoRes.data ?? [])
    setHistNombre(nombreRes.data ?? [])
    setIncidencias(incRes.data ?? [])
    setNominaPeriodos(nomRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData, refreshKey])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: C.muted }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      Cargando expediente…
    </div>
  )

  if (!emp) return (
    <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
      <AlertTriangle size={40} style={{ marginBottom: 12, opacity: .4 }} />
      <div>Empleado no encontrado</div>
      <button onClick={() => navigate('/rh')} style={{ marginTop: 16, padding: '8px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>Volver a RH</button>
    </div>
  )

  const salMensual = (parseFloat(emp.salario_diario) || 0) * (emp.dias_mes || 30)
  const activo = emp.estado_id === 'ACTIVO'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Top bar ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/rh')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', color: C.muted, fontSize: 13, fontWeight: 500 }}>
          <ArrowLeft size={14} /> Volver a RH
        </button>
        <ChevronRight size={14} color={C.muted} />
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{emp.nombre_completo}</span>
        <span style={{ fontSize: 11, color: C.muted }}>{emp.numero_empleado}</span>
        <div style={{ flex: 1 }} />
        <Pill ok={activo} label={activo ? 'Activo' : 'Inactivo'} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Columna izquierda: perfil fijo ── */}
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Card perfil */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ height: 64, background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 100%)` }} />
            <div style={{ padding: '0 20px 20px', marginTop: -28 }}>
              <Avatar nombre={emp.nombre_completo} foto={emp.foto_url} size={56} />
              <div style={{ marginTop: 10 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{emp.nombre_completo}</h2>
                <div style={{ fontSize: 13, color: C.primary, fontWeight: 600, marginTop: 3 }}>{emp.puesto || '—'}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{emp.departamento || emp.area || 'Sin departamento'}</div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'grid', gap: 8 }}>
                {emp.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                    <Mail size={13} color={C.muted} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                  </div>
                )}
                {emp.celular && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                    <Phone size={13} color={C.muted} /> {emp.celular}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                  <Hash size={13} color={C.muted} /> {emp.numero_empleado || 'Sin ID'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                  <Calendar size={13} color={C.muted} /> Desde {fmtD(emp.fecha_ingreso)}
                </div>
              </div>
            </div>
          </div>

          {/* KPIs laterales */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>Datos clave</div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Sueldo diario</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.dark, marginTop: 1 }}>{fmt$(emp.salario_diario)}</div>
              <div style={{ fontSize: 11, color: C.muted }}>≈ {fmt$(salMensual)} / mes</div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Antigüedad</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 2 }}>{antiguedad(emp.fecha_ingreso)}</div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Tipo contrato</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{TIPO_CONTRATO_LABEL[emp.tipo_contrato] || emp.tipo_contrato || '—'}</div>
              {emp.fecha_fin_contrato && <div style={{ fontSize: 11, color: C.warning, marginTop: 2 }}>Vence: {fmtD(emp.fecha_fin_contrato)}</div>}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600 }}>Forma de pago</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{emp.forma_pago || '—'}</div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Acciones</div>
            <button onClick={() => setModalSueldo(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.light, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.text, width: '100%', textAlign: 'left' }}>
              <TrendingUp size={14} color={C.primary} /> Registrar cambio sueldo
            </button>
            <button onClick={() => setModalNombre(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.light, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.text, width: '100%', textAlign: 'left' }}>
              <User size={14} color={C.primary} /> Registrar cambio nombre
            </button>
            <button onClick={() => navigate('/rh')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.light, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: C.text, width: '100%', textAlign: 'left' }}>
              <Edit2 size={14} color={C.muted} /> Editar en módulo RH
            </button>
          </div>
        </div>

        {/* ── Columna derecha: tabs ── */}
        <div style={{ display: 'grid', gap: 0 }}>

          {/* Tab bar */}
          <div style={{ background: C.surface, borderRadius: '12px 12px 0 0', border: `1px solid ${C.border}`, borderBottom: 'none', display: 'flex', overflow: 'auto' }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 18px', background: 'none', border: 'none', borderBottom: active ? `2.5px solid ${C.primary}` : '2.5px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.primary : C.muted, whiteSpace: 'nowrap', transition: 'all .15s' }}>
                  <t.icon size={14} /> {t.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 24, minHeight: 400 }}>

            {/* ── RESUMEN ── */}
            {tab === 'resumen' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <KPI icon={Briefcase}   label="Puesto"       value={emp.puesto || '—'} color={C.primary} />
                  <KPI icon={Users}        label="Departamento" value={emp.departamento || emp.area || '—'} color={C.dark} />
                  <KPI icon={Clock}        label="Antigüedad"   value={antiguedad(emp.fecha_ingreso)} color={C.gold} />
                  <KPI icon={DollarSign}   label="Sueldo diario" value={fmt$(emp.salario_diario)} color={C.success} />
                </div>

                {/* Resumen incidencias */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} color={C.warning} /> Incidencias recientes
                  </div>
                  {incidencias.length === 0 ? (
                    <div style={{ color: C.muted, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                      <CheckCircle size={22} color={C.success} style={{ marginBottom: 6, opacity: .6 }} />
                      <div>Sin incidencias registradas</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: C.light }}>
                            {['Fecha', 'Tipo', 'Duración', 'Estatus', 'Justificación'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {incidencias.slice(0, 5).map(inc => (
                            <tr key={inc.id} style={{ borderTop: `1px solid ${C.border}` }}>
                              <td style={{ padding: '9px 12px', color: C.muted, fontSize: 12 }}>{fmtD(inc.fecha)}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600 }}>{inc.tipo_incidencia || inc.tipo || '—'}</td>
                              <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{inc.horas_afectadas ? `${inc.horas_afectadas}h` : '—'}</td>
                              <td style={{ padding: '9px 12px' }}>
                                <Badge label={inc.estatus || '—'} color={inc.estatus === 'AUTORIZADA' ? C.success : C.warning} />
                              </td>
                              <td style={{ padding: '9px 12px', color: C.muted, fontSize: 12 }}>{inc.justificacion || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Resumen historial sueldo */}
                {histSueldo.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={15} color={C.success} /> Último cambio de sueldo
                    </div>
                    <div style={{ background: C.light, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>Anterior</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>{fmt$(histSueldo[0].sueldo_anterior)}</div>
                      </div>
                      <ChevronRight size={16} color={C.muted} />
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>Nuevo</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{fmt$(histSueldo[0].sueldo_nuevo)}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <Badge label={TIPO_SUELDO[histSueldo[0].tipo]?.label || histSueldo[0].tipo} color={TIPO_SUELDO[histSueldo[0].tipo]?.color || C.primary} />
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{fmtD(histSueldo[0].fecha)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── DATOS GENERALES ── */}
            {tab === 'datos' && (
              <div style={{ display: 'grid', gap: 24 }}>
                <Section title="Información personal" icon={User}>
                  <Grid4>
                    <Campo label="Nombre(s)" value={emp.nombre} />
                    <Campo label="Apellido paterno" value={emp.apellido_pat} />
                    <Campo label="Apellido materno" value={emp.apellido_mat} />
                    <Campo label="Sexo" value={emp.sexo === 'M' ? 'Masculino' : emp.sexo === 'F' ? 'Femenino' : emp.sexo} />
                    <Campo label="Fecha de nacimiento" value={fmtD(emp.fecha_nacimiento)} />
                    <Campo label="RFC" value={emp.rfc} />
                    <Campo label="CURP" value={emp.curp} />
                    <Campo label="NSS" value={emp.nss} />
                  </Grid4>
                </Section>

                <Section title="Información laboral" icon={Briefcase}>
                  <Grid4>
                    <Campo label="N° empleado" value={emp.numero_empleado} />
                    <Campo label="Puesto" value={emp.puesto} />
                    <Campo label="Área" value={emp.area} />
                    <Campo label="Departamento" value={emp.departamento} />
                    <Campo label="Centro de trabajo" value={emp.centro_trabajo} />
                    <Campo label="Fecha de ingreso" value={fmtD(emp.fecha_ingreso)} />
                    <Campo label="Tipo de contrato" value={TIPO_CONTRATO_LABEL[emp.tipo_contrato] || emp.tipo_contrato} />
                    <Campo label="Fecha fin contrato" value={fmtD(emp.fecha_fin_contrato)} />
                  </Grid4>
                </Section>

                <Section title="Compensación" icon={DollarSign}>
                  <Grid4>
                    <Campo label="Sueldo diario" value={fmt$(emp.salario_diario)} />
                    <Campo label="Sueldo mensual aprox." value={fmt$(salMensual)} />
                    <Campo label="Forma de pago" value={emp.forma_pago} />
                    <Campo label="Banco / CLABE" value={emp.clabe || emp.banco} />
                  </Grid4>
                </Section>

                <Section title="Horario" icon={Clock}>
                  <Grid4>
                    <Campo label="Horario" value={emp.horario_trabajo} />
                    <Campo label="Día de descanso" value={emp.dia_descanso} />
                    <Campo label="Jornada" value={emp.tipo_jornada} />
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
            )}

            {/* ── HISTORIAL SUELDO ── */}
            {tab === 'sueldo' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Historial de sueldo</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{histSueldo.length} registro{histSueldo.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => setModalSueldo(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <Plus size={14} /> Registrar cambio
                  </button>
                </div>

                {histSueldo.length === 0 ? (
                  <EmptyState icon={DollarSign} msg="Sin cambios de sueldo registrados" />
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {histSueldo.map((h, i) => {
                      const delta = (parseFloat(h.sueldo_nuevo) || 0) - (parseFloat(h.sueldo_anterior) || 0)
                      const pct = h.sueldo_anterior ? (delta / parseFloat(h.sueldo_anterior) * 100).toFixed(1) : null
                      return (
                        <div key={h.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, background: i === 0 ? C.primary + '06' : C.light }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: (TIPO_SUELDO[h.tipo]?.color || C.primary) + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <TrendingUp size={16} color={TIPO_SUELDO[h.tipo]?.color || C.primary} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <Badge label={TIPO_SUELDO[h.tipo]?.label || h.tipo} color={TIPO_SUELDO[h.tipo]?.color || C.primary} />
                              {i === 0 && <Badge label="Actual" color={C.success} />}
                            </div>
                            {h.motivo && <div style={{ fontSize: 12, color: C.muted }}>{h.motivo}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                              {h.sueldo_anterior != null && (
                                <>
                                  <span style={{ fontSize: 13, color: C.muted, textDecoration: 'line-through' }}>{fmt$(h.sueldo_anterior)}</span>
                                  <ChevronRight size={12} color={C.muted} />
                                </>
                              )}
                              <span style={{ fontSize: 16, fontWeight: 800, color: delta >= 0 ? C.success : C.danger }}>{fmt$(h.sueldo_nuevo)}</span>
                            </div>
                            {pct && (
                              <div style={{ fontSize: 11, fontWeight: 600, color: delta >= 0 ? C.success : C.danger, marginTop: 2 }}>
                                {delta >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{fmtD(h.fecha)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIAL NOMBRE ── */}
            {tab === 'nombre' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Historial de nombre</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{histNombre.length} registro{histNombre.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => setModalNombre(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <Plus size={14} /> Registrar cambio
                  </button>
                </div>

                <div style={{ background: C.primary + '08', border: `1px solid ${C.primary}20`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <User size={15} color={C.primary} />
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Nombre actual: </span>
                    <span style={{ fontWeight: 700, color: C.text }}>{emp.nombre_completo}</span>
                  </div>
                </div>

                {histNombre.length === 0 ? (
                  <EmptyState icon={FileText} msg="Sin cambios de nombre registrados" />
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {histNombre.map((h, i) => (
                      <div key={h.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', background: i === 0 ? C.primary + '06' : C.light }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              {i === 0 && <Badge label="Más reciente" color={C.primary} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, color: C.muted, textDecoration: 'line-through' }}>{h.nombre_anterior || '—'}</span>
                              <ChevronRight size={13} color={C.muted} />
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{h.nombre_nuevo}</span>
                            </div>
                            {h.motivo && <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{h.motivo}</div>}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>{fmtD(h.fecha)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── INCIDENCIAS ── */}
            {tab === 'incidencias' && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Incidencias</div>
                {incidencias.length === 0 ? (
                  <EmptyState icon={CheckCircle} msg="Sin incidencias registradas" color={C.success} />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: C.light }}>
                          {['Fecha', 'Tipo', 'Hora afectada', 'Duración', 'Estatus', 'Justificación'].map(h => (
                            <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {incidencias.map(inc => (
                          <tr key={inc.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td style={{ padding: '10px 12px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtD(inc.fecha)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{inc.tipo_incidencia || inc.tipo || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{inc.hora_inicio || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{inc.horas_afectadas ? `${inc.horas_afectadas}h` : '—'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <Badge label={inc.estatus || '—'} color={inc.estatus === 'AUTORIZADA' ? C.success : inc.estatus === 'PENDIENTE' ? C.warning : C.danger} />
                            </td>
                            <td style={{ padding: '10px 12px', color: C.muted, fontSize: 12 }}>{inc.justificacion || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── NÓMINA ── */}
            {tab === 'nomina' && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Periodos de nómina</div>
                {nominaPeriodos.length === 0 ? (
                  <EmptyState icon={CreditCard} msg="Sin periodos de nómina generados" />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: C.light }}>
                          {['Folio', 'Período', 'Estado', 'Neto'].map(h => (
                            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {nominaPeriodos.map(p => (
                          <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: C.primary }}>{p.folio}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>{fmtD(p.fecha_inicio)} — {fmtD(p.fecha_fin)}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <Badge label={p.estado} color={p.estado === 'PAGADA' || p.estado === 'TIMBRADA' ? C.success : p.estado === 'AUTORIZADA' ? C.primary : C.warning} />
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.total_neto ? fmt$(p.total_neto) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modales */}
      {modalSueldo && (
        <ModalSueldo empleadoId={emp.id} sueldoActual={emp.salario_diario}
          onClose={() => setModalSueldo(false)} onSaved={reload} />
      )}
      {modalNombre && (
        <ModalNombre empleadoId={emp.id} nombreActual={emp.nombre_completo}
          onClose={() => setModalNombre(false)} onSaved={reload} />
      )}
    </div>
  )
}

// ── Sub-componentes simples ───────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        <Icon size={15} color={C.primary} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Grid4({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px 20px' }}>{children}</div>
}

function EmptyState({ icon: Icon, msg, color = C.muted }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted }}>
      <Icon size={32} color={color} style={{ marginBottom: 10, opacity: .4 }} />
      <div style={{ fontSize: 13 }}>{msg}</div>
    </div>
  )
}
