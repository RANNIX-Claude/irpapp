import { useState, useEffect } from 'react'
import { X, Edit2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ImportadorDocumento from '../ui/ImportadorDocumento'
import { TIPOS_CONTRATO, FieldWrapper } from './rh-helpers'

// ── Modal Editar Empleado ───────────────────────────────────────────────────
const DIAS_DESCANSO = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo','Sin descanso','-']
const ESTADOS_CIVILES = ['Soltero(a)','Casado(a)','Unión libre','Divorciado(a)','Viudo(a)']
const ESCOLARIDADES = ['Primaria','Secundaria','Preparatoria','Técnico','Licenciatura','Posgrado']
const TIPOS_JORNADA = ['Jornada completa','Media jornada','Jornada reducida','Turno nocturno','Fin de semana']
const TIPOS_CONTRATACION = ['Por tiempo determinado','Indeterminado','Por obra']
const BANCOS = [
  'BBVA','Banorte','Santander','Banamex','HSBC','Scotiabank','Inbursa',
  'Azteca','BanCoppel','Afirme','BanBajío','Banregio','Nu','Klar','Otro',
]

// Encabezado de sección dentro del formulario de dos columnas.
function Seccion({ titulo }) {
  return (
    <div style={{ gridColumn:'1 / -1', marginTop:6, paddingBottom:4, borderBottom:'1.5px solid #E5E7EB' }}>
      <span style={{ fontSize:11, fontWeight:800, color:'var(--color-primary)', textTransform:'uppercase', letterSpacing:'.06em' }}>
        {titulo}
      </span>
    </div>
  )
}

// Campos que el formulario administra. Se listan aparte para poder cargarlos
// y guardarlos sin repetir la lista tres veces.
const CAMPOS_EMPLEADO = [
  'nombre','apellido_pat','apellido_mat','sexo','rfc','curp','nss',
  'fecha_nacimiento','estado_civil','nacionalidad','lugar_nacimiento','escolaridad',
  'fecha_ingreso','puesto','area','departamento','centro_trabajo','supervisor',
  'tipo_jornada','tipo_contratacion',
  'hora_entrada_prog','hora_salida_prog','cruza_medianoche',
  'salario_diario','forma_pago','bono','forma_pago_bono','banco','cuenta_clabe',
  'email','celular','telefono_fijo',
  'calle','numero_ext','numero_int','colonia','municipio','estado_domicilio',
  'codigo_postal','referencias_domicilio','direccion',
  'contacto_emergencia_nombre','contacto_emergencia_telefono','contacto_emergencia_parentesco',
  'horario_trabajo','dia_descanso','notas',
]

const CAMPOS_MAYUSCULA = ['nombre','apellido_pat','apellido_mat','rfc','curp']
const CAMPOS_FECHA     = ['fecha_nacimiento','fecha_ingreso']

export default function EditarEmpleadoModal({ emp, onClose, onSaved }) {
  const vacio = Object.fromEntries(CAMPOS_EMPLEADO.map(k => [k, '']))
  const [form, setForm] = useState({ ...vacio, sexo: 'M', forma_pago: 'TRANSFERENCIA', forma_pago_bono: 'TRANSFERENCIA', tipo_contratacion: 'Indeterminado' })
  const [cargando, setCargando] = useState(true)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Se lee de rh_empleados y NO de la fila de prp_empleados que llega en `emp`:
  // la vista no expone fecha_nacimiento, direccion, banco ni cuenta_clabe, así
  // que partir de ella dejaba esos campos vacíos y el guardado los borraba.
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase
        .from('rh_empleados').select('*').eq('id', emp.id).maybeSingle()
      if (cancelado) return
      if (error) {
        toast.error('No se pudieron cargar los datos: ' + error.message)
        setCargando(false)
        return
      }
      const fila = data ?? {}
      setForm({
        ...vacio,
        ...Object.fromEntries(
          CAMPOS_EMPLEADO.map(k => [k, fila[k] == null ? '' : String(fila[k])])
        ),
        sexo:       fila.sexo       || 'M',
        forma_pago: fila.forma_pago || 'TRANSFERENCIA',
        // Postgres regresa TIME como "07:00:00"; el input type="time" quiere "07:00".
        hora_entrada_prog: fila.hora_entrada_prog ? String(fila.hora_entrada_prog).slice(0, 5) : '',
        hora_salida_prog:  fila.hora_salida_prog  ? String(fila.hora_salida_prog).slice(0, 5)  : '',
        cruza_medianoche:  fila.cruza_medianoche ? 'true' : 'false',
      })
      setCargando(false)
    })()
    return () => { cancelado = true }
  }, [emp.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.apellido_pat) return toast.error('Nombre y apellido son obligatorios')
    if (form.cuenta_clabe && !/^\d{18}$/.test(form.cuenta_clabe.replace(/\s/g, '')))
      return toast.error('La CLABE debe tener 18 dígitos')
    setSaving(true)

    const payload = Object.fromEntries(CAMPOS_EMPLEADO.map(k => {
      const v = (form[k] ?? '').toString().trim()
      if (CAMPOS_MAYUSCULA.includes(k)) return [k, v.toUpperCase() || null]
      if (CAMPOS_FECHA.includes(k))     return [k, v || null]
      return [k, v || null]
    }))
    payload.salario_diario = parseFloat(form.salario_diario) || null
    payload.forma_pago     = form.forma_pago || 'TRANSFERENCIA'
    payload.sexo           = form.sexo
    payload.cuenta_clabe   = form.cuenta_clabe ? form.cuenta_clabe.replace(/\s/g, '') : null
    // Booleano real: el mapeo genérico de arriba lo dejaría como el string
    // "false" (truthy), que se guardaría como si estuviera marcado.
    payload.cruza_medianoche  = form.cruza_medianoche === 'true'
    payload.hora_entrada_prog = form.hora_entrada_prog || null
    payload.hora_salida_prog  = form.hora_salida_prog || null

    const { error } = await supabase
      .from('rh_empleados')
      .update(payload)
      .eq('id', emp.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Empleado actualizado')
    onSaved()
    onClose()
  }

  const inp = (k, extra = {}) => (
    <input value={form[k]} onChange={e => set(k, e.target.value)}
      style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }}
      {...extra} />
  )
  const sel = (k, opts) => (
    <select value={form[k]} onChange={e => set(k, e.target.value)}
      style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,background:'white' }}>
      {opts}
    </select>
  )
  const F = FieldWrapper

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:'white',borderRadius:14,width:700,maxWidth:'96vw',maxHeight:'92vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'18px 24px',borderBottom:'1px solid #E5E7EB',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white',zIndex:1 }}>
          <h2 style={{ margin:0,fontSize:17,fontWeight:700,display:'flex',alignItems:'center',gap:8 }}>
            <Edit2 size={17} color="var(--color-primary)" /> Modificar Empleado — {emp.nombre_completo}
          </h2>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer' }}><X size={20} /></button>
        </div>

        {cargando ? (
          <div style={{ padding:'40px 24px',textAlign:'center',color:'var(--color-text-light)',fontSize:13 }}>
            Cargando datos del empleado…
          </div>
        ) : (
        <form onSubmit={handleSubmit} style={{ padding:'20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
          {/* Rellena los campos del formulario, no guarda: así se revisa antes
              de dar Guardar cambios. */}
          <div style={{ gridColumn:'1 / -1' }}>
            <ImportadorDocumento
              etiquetaAplicar="Rellenar formulario"
              onAplicar={cambios => {
                setForm(f => ({ ...f, ...cambios }))
                toast.success(`${Object.keys(cambios).length} campos rellenados — revisa y guarda`)
              }}
            />
          </div>

          {/* ── Datos personales ── */}
          <Seccion titulo="Datos personales" />
          <F label="Nombre(s)"><input required value={form.nombre} onChange={e => set('nombre',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} /></F>
          <F label="Apellido Paterno"><input required value={form.apellido_pat} onChange={e => set('apellido_pat',e.target.value)} style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} /></F>
          <F label="Apellido Materno">{inp('apellido_mat')}</F>
          <F label="Sexo">{sel('sexo', [<option key="M" value="M">Masculino</option>, <option key="F" value="F">Femenino</option>])}</F>
          <F label="Fecha nacimiento">{inp('fecha_nacimiento', { type:'date' })}</F>
          <F label="Lugar de nacimiento">{inp('lugar_nacimiento', { placeholder:'Ciudad, Estado' })}</F>
          <F label="Estado civil">
            {sel('estado_civil', [
              <option key="" value="">— Seleccionar —</option>,
              ...ESTADOS_CIVILES.map(v => <option key={v} value={v}>{v}</option>),
            ])}
          </F>
          <F label="Nacionalidad">{inp('nacionalidad', { placeholder:'Mexicana' })}</F>
          <F label="Escolaridad">
            {sel('escolaridad', [
              <option key="" value="">— Seleccionar —</option>,
              ...ESCOLARIDADES.map(v => <option key={v} value={v}>{v}</option>),
            ])}
          </F>
          <F label="RFC">{inp('rfc', { placeholder:'RFC', style:{ fontFamily:'monospace',textTransform:'uppercase' } })}</F>
          <F label="CURP">{inp('curp', { placeholder:'CURP', style:{ fontFamily:'monospace',textTransform:'uppercase' } })}</F>
          <F label="NSS (IMSS)">{inp('nss')}</F>

          {/* ── Datos laborales ── */}
          <Seccion titulo="Datos laborales" />
          <F label="Fecha ingreso">{inp('fecha_ingreso', { type:'date' })}</F>
          <F label="Puesto">{inp('puesto')}</F>
          <F label="Área">{inp('area')}</F>
          <F label="Departamento">{inp('departamento')}</F>
          <F label="Centro de trabajo">{inp('centro_trabajo', { placeholder:'Ej: Plaza IWOL' })}</F>
          <F label="Supervisor">{inp('supervisor', { placeholder:'Nombre del jefe directo' })}</F>
          <F label="Tipo de jornada">
            {sel('tipo_jornada', [
              <option key="" value="">— Seleccionar —</option>,
              ...TIPOS_JORNADA.map(v => <option key={v} value={v}>{v}</option>),
            ])}
          </F>
          <F label="Tipo de contratación">
            {sel('tipo_contratacion', [
              <option key="" value="">— Seleccionar —</option>,
              ...TIPOS_CONTRATACION.map(v => <option key={v} value={v}>{v}</option>),
            ])}
          </F>
          <F label="Horario de trabajo" span>
            <input value={form.horario_trabajo} onChange={e => set('horario_trabajo', e.target.value)}
              placeholder="Ej: Lunes a Sábado 8-16 hrs"
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
          </F>
          <F label="Día de descanso">
            {sel('dia_descanso', [
              <option key="" value="">— Seleccionar —</option>,
              ...DIAS_DESCANSO.map(d => <option key={d} value={d}>{d}</option>),
            ])}
          </F>
          <F label="Hora entrada programada">
            <input type="time" value={form.hora_entrada_prog} onChange={e => set('hora_entrada_prog', e.target.value)}
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
          </F>
          <F label="Hora salida programada">
            <input type="time" value={form.hora_salida_prog} onChange={e => set('hora_salida_prog', e.target.value)}
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
          </F>
          <F label="Turno cruza medianoche">
            <label style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 0',fontSize:13,cursor:'pointer' }}>
              <input type="checkbox" checked={form.cruza_medianoche === 'true'}
                onChange={e => set('cruza_medianoche', e.target.checked ? 'true' : 'false')} />
              Sale al día siguiente (ej. turno de 24h)
            </label>
          </F>

          {/* ── Compensación y pago ── */}
          <Seccion titulo="Compensación y pago" />
          <F label="Salario diario ($)">
            <input required type="number" step="0.01" value={form.salario_diario}
              onChange={e => set('salario_diario', e.target.value)}
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
          </F>
          <F label="Forma de pago">
            {sel('forma_pago', [
              <option key="T" value="TRANSFERENCIA">Transferencia</option>,
              <option key="E" value="EFECTIVO">Efectivo</option>,
              <option key="M" value="MIXTO">Mixto (Transfer + Efectivo)</option>,
            ])}
          </F>
          <F label="Bono ($)">
            <input type="number" step="0.01" value={form.bono} onChange={e => set('bono', e.target.value)}
              placeholder="0.00"
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box' }} />
          </F>
          <F label="Forma de pago del bono">
            {sel('forma_pago_bono', [
              <option key="T" value="TRANSFERENCIA">Transferencia</option>,
              <option key="E" value="EFECTIVO">Efectivo</option>,
            ])}
          </F>
          <F label="Banco">
            {sel('banco', [
              <option key="" value="">— Seleccionar —</option>,
              ...BANCOS.map(b => <option key={b} value={b}>{b}</option>),
            ])}
          </F>
          <F label="CLABE interbancaria">
            {inp('cuenta_clabe', { placeholder:'18 dígitos', maxLength:18, inputMode:'numeric', style:{ fontFamily:'monospace' } })}
          </F>

          {/* ── Contacto ── */}
          <Seccion titulo="Contacto" />
          <F label="Email">{inp('email', { type:'email' })}</F>
          <F label="Celular">{inp('celular')}</F>
          <F label="Teléfono fijo">{inp('telefono_fijo')}</F>
          <F label="Contacto de emergencia">{inp('contacto_emergencia_nombre', { placeholder:'Nombre completo' })}</F>
          <F label="Teléfono de emergencia">{inp('contacto_emergencia_telefono')}</F>
          <F label="Parentesco">{inp('contacto_emergencia_parentesco', { placeholder:'Ej: Esposa, Madre' })}</F>

          {/* ── Domicilio ── */}
          <Seccion titulo="Domicilio" />
          <F label="Calle" span>{inp('calle')}</F>
          <F label="Número exterior">{inp('numero_ext')}</F>
          <F label="Número interior">{inp('numero_int')}</F>
          <F label="Colonia">{inp('colonia')}</F>
          <F label="Código postal">{inp('codigo_postal', { maxLength:5, inputMode:'numeric' })}</F>
          <F label="Municipio / Alcaldía">{inp('municipio')}</F>
          <F label="Estado">{inp('estado_domicilio')}</F>
          <F label="Referencias" span>
            {inp('referencias_domicilio', { placeholder:'Entre calles, color de casa, etc.' })}
          </F>
          <F label="Domicilio en una línea (captura anterior)" span>
            {inp('direccion', { placeholder:'Se conserva de la captura previa' })}
          </F>

          {/* ── Notas ── */}
          <Seccion titulo="Notas" />
          <F label="Notas" span>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              style={{ width:'100%',padding:'8px 10px',border:'1.5px solid #E5E7EB',borderRadius:7,fontSize:13,boxSizing:'border-box',resize:'vertical' }} />
          </F>

          {/* Botones */}
          <div style={{ gridColumn:'1 / -1',display:'flex',gap:10,paddingTop:4 }}>
            <button type="button" onClick={onClose}
              style={{ flex:1,padding:10,border:'1.5px solid #E5E7EB',borderRadius:8,background:'white',cursor:'pointer',fontWeight:600,fontSize:13 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ flex:2,padding:10,border:'none',borderRadius:8,background:'var(--color-primary)',color:'white',cursor:'pointer',fontWeight:700,fontSize:14,opacity:saving?.7:1 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
