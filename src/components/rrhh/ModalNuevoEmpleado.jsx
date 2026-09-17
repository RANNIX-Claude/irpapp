import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { TIPOS_CONTRATO, FieldWrapper } from './rh-helpers'

// ── Modal Nuevo Empleado ────────────────────────────────────────────────────
export default function NuevoEmpleadoModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: '', apellido_pat: '', apellido_mat: '',
    sexo: 'M', rfc: '', curp: '', nss: '',
    fecha_nacimiento: '', fecha_ingreso: new Date().toISOString().split('T')[0],
    puesto: '', area: '', departamento: '',
    salario_diario: '', email: '', celular: '',
    tipo_contrato: 'TEMPORAL_3SEM', fecha_fin_contrato: '',
    horario_trabajo: '', dia_descanso: '', forma_pago: 'TRANSFERENCIA',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const semanas3 = () => {
    const d = new Date(form.fecha_ingreso || Date.now())
    d.setDate(d.getDate() + 21)
    set('fecha_fin_contrato', d.toISOString().split('T')[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.apellido_pat || !form.salario_diario) return toast.error('Nombre, apellido y salario son obligatorios')
    setSaving(true)
    const { data: res, error } = await supabase.rpc('crear_empleado', {
      p_nombre: form.nombre, p_apellido_pat: form.apellido_pat,
      p_apellido_mat: form.apellido_mat || '',
      p_sexo: form.sexo, p_rfc: form.rfc || null, p_curp: form.curp || null,
      p_nss: form.nss || null, p_fecha_nacimiento: form.fecha_nacimiento || null,
      p_fecha_ingreso: form.fecha_ingreso, p_puesto: form.puesto || null,
      p_area: form.area || null, p_departamento: form.departamento || null,
      p_salario_diario: parseFloat(form.salario_diario) || null,
      p_email: form.email || null, p_celular: form.celular || null,
      p_tipo_contrato: form.tipo_contrato || null,
      p_fecha_fin_contrato: form.fecha_fin_contrato || null,
      p_horario_trabajo: form.horario_trabajo || null,
      p_dia_descanso: form.dia_descanso || null,
      p_forma_pago: form.forma_pago || 'TRANSFERENCIA',
    })
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Empleado registrado')
    onCreated(); onClose()
  }

  const inp = (k, rest = {}) => (
    <input value={form[k]} onChange={e => set(k, e.target.value)}
      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', ...rest.style }}
      {...rest} />
  )
  const F = FieldWrapper

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 680, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="var(--color-primary)" /> Nuevo Empleado
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <F label="Nombre(s)" ><input required value={form.nombre} onChange={e => set('nombre',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} /></F>
          <F label="Apellido Paterno"><input required value={form.apellido_pat} onChange={e => set('apellido_pat',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} /></F>
          <F label="Apellido Materno">{inp('apellido_mat')}</F>
          <F label="Sexo">
            <select value={form.sexo} onChange={e => set('sexo',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>
              <option value="M">Masculino</option><option value="F">Femenino</option>
            </select>
          </F>
          <F label="Fecha nacimiento">{inp('fecha_nacimiento', { type:'date' })}</F>
          <F label="Fecha ingreso">{inp('fecha_ingreso', { type:'date' })}</F>
          <F label="Puesto">{inp('puesto')}</F>
          <F label="Área">{inp('area')}</F>
          <F label="Departamento">{inp('departamento')}</F>
          <F label="Salario diario ($)"><input required type="number" step="0.01" value={form.salario_diario} onChange={e => set('salario_diario',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} /></F>
          <F label="RFC">{inp('rfc', { placeholder:'AAA######XXX', style: { fontFamily:'monospace', textTransform:'uppercase' }})}</F>
          <F label="CURP">{inp('curp', { placeholder:'AAAA######XXXXXXXXXX', style: { fontFamily:'monospace', textTransform:'uppercase' }})}</F>
          <F label="NSS (IMSS)">{inp('nss', { placeholder:'Número de Seguridad Social' })}</F>
          <F label="Email">{inp('email', { type:'email' })}</F>
          <F label="Celular">{inp('celular')}</F>
          <F label="Horario de trabajo" span>
            <input value={form.horario_trabajo} onChange={e => set('horario_trabajo', e.target.value)}
              placeholder="Ej: Lunes a Sábado 8-16 hrs"
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
          </F>
          <F label="Día de descanso">
            <select value={form.dia_descanso} onChange={e => set('dia_descanso', e.target.value)}
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>
              <option value="">— Seleccionar —</option>
              {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo','Sin descanso','-'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </F>
          <F label="Forma de pago">
            <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="MIXTO">Mixto (Transfer + Efectivo)</option>
            </select>
          </F>
          <div style={{ gridColumn: '1 / -1', background: '#F0F7FF', borderRadius: 8, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
            <F label="Tipo de Contrato">
              <select value={form.tipo_contrato} onChange={e => set('tipo_contrato',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>
                {TIPOS_CONTRATO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </F>
            <F label="Vencimiento contrato">{inp('fecha_fin_contrato', { type:'date' })}</F>
            <button type="button" onClick={semanas3} style={{ padding:'8px 12px',border:'1.5px solid #7B5EA7',borderRadius:7,fontSize:12,fontWeight:600,color:'#7B5EA7',background:'white',cursor:'pointer' }}>
              +3 semanas
            </button>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600,fontSize:13 }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ flex:2,padding:10,border:'none',borderRadius:8,background:'var(--color-primary)',color:'white',cursor:'pointer',fontWeight:700,fontSize:14,opacity:saving?.7:1 }}>
              {saving ? 'Registrando…' : 'Registrar empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
