import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  HardHat, Plus, ArrowLeft, Save, Trash2, Upload, FileText, X,
  Receipt, Camera, ChevronDown, ChevronUp, CheckCircle, Clock,
  AlertTriangle, Ban, Paperclip, Image, FilePlus, Download,
} from 'lucide-react'
import { supabase, urlFirmada } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmt = n => '$' + (parseFloat(n)||0).toLocaleString('es-MX', { minimumFractionDigits:0, maximumFractionDigits:0 })
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '—'

const ESTADOS = [
  { id:'PENDIENTE',   label:'Pendiente',   color:'#92400E', bg:'#FEF3C7', Icon: Clock },
  { id:'EN_PROCESO',  label:'En Proceso',  color:'#1D4ED8', bg:'#DBEAFE', Icon: HardHat },
  { id:'PAUSADO',     label:'Pausado',     color:'#6B7280', bg:'#F3F4F6', Icon: AlertTriangle },
  { id:'COMPLETADO',  label:'Completado',  color:'#057642', bg:'#D1FAE5', Icon: CheckCircle },
  { id:'CANCELADO',   label:'Cancelado',   color:'#B91C1C', bg:'#FEE2E2', Icon: Ban },
]
const TIPOS_PAGO = ['FACTURA','COMPRA','ANTICIPO','FINIQUITO']

function EstadoBadge({ estado }) {
  const e = ESTADOS.find(x => x.id === estado) || ESTADOS[0]
  const { Icon } = e
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'11px', fontWeight:700,
      color: e.color, background: e.bg, padding:'3px 10px', borderRadius:'20px' }}>
      <Icon size={10} /> {e.label}
    </span>
  )
}

/* ── Upload helper ──────────────────────────────────────────────────────────── */
async function uploadFile(bucket, carpeta, file) {
  if (!file) return null
  const ext  = file.name.split('.').pop()
  const path = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) { toast.error('Error subiendo archivo: ' + error.message); return null }
  return path
}
async function firmarUrl(bucket, path) {
  if (!path) return null
  // Detecta si es URL completa y extrae la ruta
  const clean = path.includes('/storage/v1/object/public/') || path.includes('/storage/v1/object/sign/')
    ? path.split('/').slice(-3).join('/')
    : path
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(clean, 600)
  if (error) return null
  return data.signedUrl
}

/* ── Input styled ───────────────────────────────────────────────────────────── */
const inp = { width:'100%', padding:'8px 10px', border:'1.5px solid #E5E7EB', borderRadius:'7px',
  fontSize:'13px', boxSizing:'border-box', outline:'none', background:'white', color:'#111827' }
const label = { display:'block', fontSize:'11px', fontWeight:700, color:'#6B7280',
  textTransform:'uppercase', marginBottom:'3px', letterSpacing:'.04em' }
function Field({ lbl, children }) {
  return <div style={{ marginBottom:'12px' }}><label style={label}>{lbl}</label>{children}</div>
}

/* ── FileUploadCell — botón de subir + link de ver ──────────────────────────── */
function FileCell({ bucket, path, onUploaded, accept = '*', label: lbl }) {
  const ref = useRef()
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (path) firmarUrl(bucket, path).then(setUrl)
    else setUrl(null)
  }, [path, bucket])

  const handleUpload = async (file) => {
    setLoading(true)
    const p = await uploadFile(bucket, 'docs', file)
    setLoading(false)
    if (p) onUploaded(p)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button type="button" onClick={() => ref.current.click()}
        style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px',
          border:'1.5px solid #E5E7EB', borderRadius:'6px', fontSize:'11px', fontWeight:600,
          color:'#374151', background:'white', cursor:'pointer', whiteSpace:'nowrap' }}>
        <Upload size={12} /> {loading ? 'Subiendo…' : (lbl || 'Subir')}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize:'11px', color:'#0A66C2', display:'flex', alignItems:'center', gap:3 }}>
          <Download size={11} /> Ver
        </a>
      )}
      <input ref={ref} type="file" accept={accept} style={{ display:'none' }}
        onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════════════════════ */
export default function Proyectos() {
  useModuleAudit('Proyectos')

  const [proyectos,   setProyectos]   = useState([])
  const [proveedores, setProveedores] = useState([])
  const [selected,    setSelected]    = useState(null)   // proyecto activo
  const [tab,         setTab]         = useState('resumen')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)  // modal nuevo proyecto

  /* ── Cargar datos ─────────────────────────────────────────────────────────── */
  const loadProyectos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('proyectos').select('*')
      .order('created_at', { ascending: false })
    setProyectos(data || [])
    setLoading(false)
  }, [])

  const loadProveedores = useCallback(async () => {
    const { data } = await supabase.from('cat_proveedores').select('id, nombre').order('nombre')
    setProveedores(data || [])
  }, [])

  useEffect(() => { loadProyectos(); loadProveedores() }, [loadProyectos, loadProveedores])

  /* Refrescar proyecto seleccionado */
  const reloadSelected = useCallback(async (id) => {
    const { data } = await supabase.from('proyectos').select('*').eq('id', id).single()
    if (data) setSelected(data)
  }, [])

  /* ── KPIs de lista ──────────────────────────────────────────────────────── */
  const kpiTotal    = proyectos.length
  const kpiActivos  = proyectos.filter(p => p.estado === 'EN_PROCESO').length
  const kpiPres     = proyectos.reduce((s, p) => s + (parseFloat(p.presupuesto_total)||0), 0)

  /* ── Vista detalle ──────────────────────────────────────────────────────── */
  if (selected) {
    return (
      <ProyectoDetalle
        proyecto={selected}
        proveedores={proveedores}
        onBack={() => { setSelected(null); loadProyectos() }}
        onReload={() => reloadSelected(selected.id)}
      />
    )
  }

  /* ── Vista lista ──────────────────────────────────────────────────────── */
  return (
    <div style={{ padding:'24px', maxWidth:'1100px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:'20px', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'20px', fontWeight:700, margin:'0 0 3px',
            display:'flex', alignItems:'center', gap:8, color:'var(--color-text)' }}>
            <HardHat size={20} color="var(--color-primary)" /> Proyectos
          </h1>
          <p style={{ fontSize:'12px', color:'var(--color-text-light)', margin:0 }}>
            Obras, instalaciones y mejoras de la plaza
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
            background:'var(--color-primary)', color:'white', border:'none',
            borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
          <Plus size={14} /> Nuevo Proyecto
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total proyectos', value: kpiTotal },
          { label:'En proceso',      value: kpiActivos },
          { label:'Presupuesto total', value: fmt(kpiPres) },
        ].map(k => (
          <div key={k.label} style={{ background:'white', border:'1px solid #E5E7EB',
            borderRadius:'10px', padding:'14px 18px' }}>
            <div style={{ fontSize:'11px', color:'#6B7280', fontWeight:600,
              textTransform:'uppercase', marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#111827' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Cargando…</div>
      ) : proyectos.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
          <HardHat size={40} style={{ marginBottom:12, opacity:.3 }} />
          <div style={{ fontSize:'14px' }}>Sin proyectos registrados</div>
        </div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {proyectos.map(p => (
            <div key={p.id} onClick={() => { setSelected(p); setTab('resumen') }}
              style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px',
                padding:'16px 20px', cursor:'pointer', transition:'box-shadow .15s',
                display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div>
                <div style={{ fontWeight:700, fontSize:'14px', color:'#111827', marginBottom:3 }}>
                  {p.nombre}
                </div>
                <div style={{ fontSize:'12px', color:'#6B7280' }}>
                  {p.proveedor_nombre || '—'} · {p.presupuesto_total ? fmt(p.presupuesto_total) : 'Sin presupuesto'}
                  {p.fecha_inicio && ` · Inicio: ${fmtDate(p.fecha_inicio)}`}
                </div>
              </div>
              <EstadoBadge estado={p.estado} />
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo proyecto */}
      {showForm && (
        <NuevoProyectoModal
          proveedores={proveedores}
          onClose={() => setShowForm(false)}
          onCreated={(p) => { setShowForm(false); setSelected(p); loadProyectos() }}
        />
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   MODAL NUEVO PROYECTO
   ════════════════════════════════════════════════════════════════════════════ */
function NuevoProyectoModal({ proveedores, onClose, onCreated }) {
  const [form, setForm] = useState({ estado:'PENDIENTE' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.nombre?.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    const prov = proveedores.find(p => p.id === form.proveedor_id)
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      proveedor_id: form.proveedor_id || null,
      proveedor_nombre: prov?.nombre || form.proveedor_nombre_libre || null,
      estado: form.estado,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
      presupuesto_total: parseFloat(form.presupuesto_total) || null,
      notas: form.notas || null,
    }
    const { data, error } = await supabase.from('proyectos').insert(payload).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Proyecto creado')
    onCreated(data)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:'12px', width:'100%', maxWidth:540,
        maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'18px 20px', borderBottom:'1px solid #E5E7EB' }}>
          <span style={{ fontWeight:700, fontSize:'15px' }}>Nuevo Proyecto</span>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#6B7280' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding:'20px' }}>
          <Field lbl="Nombre del proyecto *">
            <input style={inp} value={form.nombre||''} onChange={e => f('nombre', e.target.value)} placeholder="Ej: Instalación pantalla publicitaria exterior" />
          </Field>
          <Field lbl="Descripción">
            <textarea style={{ ...inp, minHeight:70, resize:'vertical', fontFamily:'inherit' }}
              value={form.descripcion||''} onChange={e => f('descripcion', e.target.value)} />
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field lbl="Estado">
              <select style={inp} value={form.estado} onChange={e => f('estado', e.target.value)}>
                {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </Field>
            <Field lbl="Presupuesto total">
              <input style={inp} type="number" value={form.presupuesto_total||''} onChange={e => f('presupuesto_total', e.target.value)} placeholder="0.00" />
            </Field>
            <Field lbl="Fecha inicio">
              <input style={inp} type="date" value={form.fecha_inicio||''} onChange={e => f('fecha_inicio', e.target.value)} />
            </Field>
            <Field lbl="Fecha fin estimada">
              <input style={inp} type="date" value={form.fecha_fin_estimada||''} onChange={e => f('fecha_fin_estimada', e.target.value)} />
            </Field>
          </div>
          <Field lbl="Proveedor (catálogo)">
            <select style={inp} value={form.proveedor_id||''} onChange={e => f('proveedor_id', e.target.value)}>
              <option value="">— Seleccionar del catálogo —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          {!form.proveedor_id && (
            <Field lbl="Proveedor (texto libre)">
              <input style={inp} value={form.proveedor_nombre_libre||''} onChange={e => f('proveedor_nombre_libre', e.target.value)} placeholder="Nombre del proveedor" />
            </Field>
          )}
          <Field lbl="Notas internas">
            <textarea style={{ ...inp, minHeight:60, resize:'vertical', fontFamily:'inherit' }}
              value={form.notas||''} onChange={e => f('notas', e.target.value)} />
          </Field>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
            <button onClick={onClose} style={{ padding:'8px 16px', border:'1.5px solid #E5E7EB', borderRadius:'7px', background:'white', fontSize:'13px', cursor:'pointer' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:'8px 18px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              {saving ? 'Guardando…' : 'Crear Proyecto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   DETALLE DEL PROYECTO (tabs)
   ════════════════════════════════════════════════════════════════════════════ */
function ProyectoDetalle({ proyecto, proveedores, onBack, onReload }) {
  const [tab, setTab] = useState('resumen')

  const TABS = [
    { id:'resumen',       label:'Resumen' },
    { id:'cotizaciones',  label:'Cotizaciones' },
    { id:'contrato',      label:'Contrato' },
    { id:'pagos',         label:'Pagos / Facturas' },
    { id:'avances',       label:'Avances de Obra' },
  ]

  return (
    <div style={{ padding:'24px', maxWidth:'1100px' }}>
      {/* Back + título */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={onBack}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
            border:'1.5px solid #E5E7EB', borderRadius:'7px', background:'white',
            fontSize:'12px', fontWeight:600, cursor:'pointer', color:'#374151' }}>
          <ArrowLeft size={13} /> Proyectos
        </button>
        <div>
          <div style={{ fontSize:'16px', fontWeight:700, color:'#111827' }}>{proyecto.nombre}</div>
          <div style={{ fontSize:'11px', color:'#6B7280' }}>{proyecto.proveedor_nombre || 'Sin proveedor asignado'}</div>
        </div>
        <div style={{ marginLeft:'auto' }}><EstadoBadge estado={proyecto.estado} /></div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid #E5E7EB', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'9px 18px', background:'none', border:'none',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom:'-2px', fontSize:'13px', fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--color-primary)' : '#6B7280', cursor:'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen'      && <TabResumen      proyecto={proyecto} proveedores={proveedores} onReload={onReload} />}
      {tab === 'cotizaciones' && <TabCotizaciones proyecto={proyecto} />}
      {tab === 'contrato'     && <TabContrato     proyecto={proyecto} />}
      {tab === 'pagos'        && <TabPagos        proyecto={proyecto} />}
      {tab === 'avances'      && <TabAvances      proyecto={proyecto} />}
    </div>
  )
}

/* ── TAB RESUMEN ─────────────────────────────────────────────────────────── */
function TabResumen({ proyecto: p, proveedores, onReload }) {
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({ ...p })
  const [saving,  setSaving]  = useState(false)
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const prov = proveedores.find(x => x.id === form.proveedor_id)
    const { error } = await supabase.from('proyectos').update({
      nombre: form.nombre,
      descripcion: form.descripcion,
      estado: form.estado,
      proveedor_id: form.proveedor_id || null,
      proveedor_nombre: prov?.nombre || form.proveedor_nombre || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
      fecha_fin_real: form.fecha_fin_real || null,
      presupuesto_total: parseFloat(form.presupuesto_total) || null,
      notas: form.notas || null,
    }).eq('id', p.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Guardado')
    setEditing(false)
    onReload()
  }

  const ROW = ({ lbl, val }) => (
    <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:8,
      padding:'8px 0', borderBottom:'1px solid #F3F4F6' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase',
        paddingTop:1 }}>{lbl}</div>
      <div style={{ fontSize:'13px', color:'#111827' }}>{val || <span style={{color:'#D1D5DB'}}>—</span>}</div>
    </div>
  )

  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'12px', padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:'14px', color:'#374151' }}>Información general</div>
        {!editing
          ? <button onClick={() => setEditing(true)} style={{ padding:'6px 14px', border:'1.5px solid #E5E7EB', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', background:'white' }}>Editar</button>
          : <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setEditing(false)} style={{ padding:'6px 14px', border:'1.5px solid #E5E7EB', borderRadius:'7px', fontSize:'12px', cursor:'pointer', background:'white' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'6px 14px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
        }
      </div>

      {!editing ? (
        <>
          <ROW lbl="Nombre"      val={p.nombre} />
          <ROW lbl="Descripción" val={p.descripcion} />
          <ROW lbl="Estado"      val={<EstadoBadge estado={p.estado} />} />
          <ROW lbl="Proveedor"   val={p.proveedor_nombre} />
          <ROW lbl="Presupuesto" val={p.presupuesto_total ? fmt(p.presupuesto_total) : null} />
          <ROW lbl="Inicio"      val={fmtDate(p.fecha_inicio)} />
          <ROW lbl="Fin estimado" val={fmtDate(p.fecha_fin_estimada)} />
          <ROW lbl="Fin real"    val={fmtDate(p.fecha_fin_real)} />
          <ROW lbl="Notas"       val={p.notas} />
        </>
      ) : (
        <div>
          <Field lbl="Nombre *"><input style={inp} value={form.nombre||''} onChange={e => f('nombre', e.target.value)} /></Field>
          <Field lbl="Descripción"><textarea style={{ ...inp, minHeight:70, fontFamily:'inherit', resize:'vertical' }} value={form.descripcion||''} onChange={e => f('descripcion', e.target.value)} /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field lbl="Estado">
              <select style={inp} value={form.estado} onChange={e => f('estado', e.target.value)}>
                {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </Field>
            <Field lbl="Presupuesto">
              <input style={inp} type="number" value={form.presupuesto_total||''} onChange={e => f('presupuesto_total', e.target.value)} />
            </Field>
            <Field lbl="Inicio"><input style={inp} type="date" value={form.fecha_inicio||''} onChange={e => f('fecha_inicio', e.target.value)} /></Field>
            <Field lbl="Fin estimado"><input style={inp} type="date" value={form.fecha_fin_estimada||''} onChange={e => f('fecha_fin_estimada', e.target.value)} /></Field>
            <Field lbl="Fin real"><input style={inp} type="date" value={form.fecha_fin_real||''} onChange={e => f('fecha_fin_real', e.target.value)} /></Field>
          </div>
          <Field lbl="Proveedor (catálogo)">
            <select style={inp} value={form.proveedor_id||''} onChange={e => f('proveedor_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          {!form.proveedor_id && (
            <Field lbl="Proveedor (texto libre)">
              <input style={inp} value={form.proveedor_nombre||''} onChange={e => f('proveedor_nombre', e.target.value)} />
            </Field>
          )}
          <Field lbl="Notas">
            <textarea style={{ ...inp, minHeight:60, fontFamily:'inherit', resize:'vertical' }} value={form.notas||''} onChange={e => f('notas', e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  )
}

/* ── TAB COTIZACIONES ────────────────────────────────────────────────────── */
function TabCotizaciones({ proyecto }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('proyecto_cotizaciones')
      .select('*').eq('proyecto_id', proyecto.id).order('created_at')
    setItems(data || [])
    setLoading(false)
  }, [proyecto.id])

  useEffect(() => { load() }, [load])

  const toggleSeleccionada = async (item) => {
    await supabase.from('proyecto_cotizaciones').update({ seleccionada: !item.seleccionada }).eq('id', item.id)
    load()
  }
  const handleDelete = async (id) => {
    await supabase.from('proyecto_cotizaciones').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:'13px', color:'#6B7280' }}>
          {items.length} cotización{items.length !== 1 ? 'es' : ''}
          {items.length < 3 && <span style={{ marginLeft:8, fontSize:'11px', color:'#D97706', fontWeight:700 }}>
            · Se recomiendan al menos 3
          </span>}
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
            background:'var(--color-primary)', color:'white', border:'none',
            borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
          <Plus size={13} /> Agregar cotización
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>Cargando…</div>
      : items.length === 0
        ? <EmptySection icon={<FileText size={32} />} text="Sin cotizaciones. Agrega al menos 3 para comparar." />
        : (
          <div style={{ display:'grid', gap:10 }}>
            {items.map(item => (
              <CotizacionCard key={item.id} item={item}
                onToggle={() => toggleSeleccionada(item)}
                onDelete={() => handleDelete(item.id)}
                onReload={load} />
            ))}
          </div>
        )
      }

      {showAdd && (
        <CotizacionForm proyectoId={proyecto.id}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function CotizacionCard({ item, onToggle, onDelete, onReload }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (item.archivo_url) firmarUrl('proyectos-docs', item.archivo_url).then(setUrl)
  }, [item.archivo_url])

  return (
    <div style={{ background:'white', border: item.seleccionada ? '2px solid #057642' : '1px solid #E5E7EB',
      borderRadius:'10px', padding:'14px 18px',
      background: item.seleccionada ? '#F0FDF4' : 'white' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:'13px', color:'#111827' }}>{item.proveedor}</div>
          <div style={{ fontSize:'12px', color:'#6B7280', marginTop:2 }}>
            {item.monto ? fmt(item.monto) : 'Sin monto'} · {fmtDate(item.fecha)}
          </div>
          {item.notas && <div style={{ fontSize:'11px', color:'#6B7280', marginTop:4 }}>{item.notas}</div>}
          <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:'11px', color:'#0A66C2', display:'flex', alignItems:'center', gap:3 }}>
                <Download size={11} /> Ver cotización
              </a>
            )}
            <FileCell bucket="proyectos-docs" path={item.archivo_url}
              lbl="Subir PDF" accept=".pdf,.doc,.docx"
              onUploaded={async (p) => {
                await supabase.from('proyecto_cotizaciones').update({ archivo_url: p }).eq('id', item.id)
                onReload()
              }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button onClick={onToggle}
            style={{ padding:'5px 10px', fontSize:'11px', fontWeight:700,
              background: item.seleccionada ? '#057642' : 'white',
              color: item.seleccionada ? 'white' : '#057642',
              border: '1.5px solid #057642', borderRadius:'6px', cursor:'pointer' }}>
            {item.seleccionada ? '✓ Seleccionada' : 'Seleccionar'}
          </button>
          <button onClick={onDelete}
            style={{ padding:'5px 8px', background:'white', border:'1.5px solid #FEE2E2',
              borderRadius:'6px', cursor:'pointer', color:'#B91C1C' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CotizacionForm({ proyectoId, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))

  const handleSave = async () => {
    if (!form.proveedor?.trim()) { toast.error('El proveedor es requerido'); return }
    setSaving(true)
    let archivo_url = null
    if (file) archivo_url = await uploadFile('proyectos-docs', 'cotizaciones', file)
    const { error } = await supabase.from('proyecto_cotizaciones').insert({
      proyecto_id: proyectoId,
      proveedor: form.proveedor,
      monto: parseFloat(form.monto) || null,
      fecha: form.fecha || null,
      notas: form.notas || null,
      archivo_url,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Cotización agregada')
    onSaved()
  }

  return (
    <SimpleModal title="Nueva cotización" onClose={onClose}>
      <Field lbl="Proveedor *"><input style={inp} value={form.proveedor||''} onChange={e => f('proveedor', e.target.value)} /></Field>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field lbl="Monto"><input style={inp} type="number" value={form.monto||''} onChange={e => f('monto', e.target.value)} /></Field>
        <Field lbl="Fecha"><input style={inp} type="date" value={form.fecha||''} onChange={e => f('fecha', e.target.value)} /></Field>
      </div>
      <Field lbl="Notas"><textarea style={{ ...inp, minHeight:60, fontFamily:'inherit', resize:'vertical' }} value={form.notas||''} onChange={e => f('notas', e.target.value)} /></Field>
      <Field lbl="Archivo (PDF/DOC)">
        <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files[0])}
          style={{ fontSize:'12px' }} />
      </Field>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} />
    </SimpleModal>
  )
}

/* ── TAB CONTRATO ────────────────────────────────────────────────────────── */
function TabContrato({ proyecto }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('proyecto_contratos')
      .select('*').eq('proyecto_id', proyecto.id).order('created_at')
    setItems(data || [])
    setLoading(false)
  }, [proyecto.id])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:'13px', color:'#6B7280' }}>{items.length} contrato{items.length !== 1 ? 's' : ''} registrado{items.length !== 1 ? 's' : ''}</div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
            background:'var(--color-primary)', color:'white', border:'none',
            borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
          <Plus size={13} /> Agregar contrato
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>Cargando…</div>
      : items.length === 0
        ? <EmptySection icon={<FileText size={32} />} text="Sin contratos registrados" />
        : (
          <div style={{ display:'grid', gap:10 }}>
            {items.map(item => <ContratoCard key={item.id} item={item} onDelete={async () => { await supabase.from('proyecto_contratos').delete().eq('id', item.id); load() }} onReload={load} />)}
          </div>
        )
      }

      {showAdd && (
        <ContratoForm proyectoId={proyecto.id} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function ContratoCard({ item, onDelete, onReload }) {
  const [urlC, setUrlC] = useState(null)
  const [urlA, setUrlA] = useState(null)
  useEffect(() => {
    if (item.contrato_url) firmarUrl('proyectos-docs', item.contrato_url).then(setUrlC)
    if (item.anexo_url)    firmarUrl('proyectos-docs', item.anexo_url).then(setUrlA)
  }, [item.contrato_url, item.anexo_url])

  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:'13px', color:'#111827', marginBottom:4 }}>
            {item.descripcion || 'Contrato'}
          </div>
          <div style={{ fontSize:'12px', color:'#6B7280' }}>
            Firma: {fmtDate(item.fecha_firma)} · {item.monto_contratado ? fmt(item.monto_contratado) : 'Sin monto'}
          </div>
          <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <div style={label}>Contrato</div>
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                {urlC && <a href={urlC} target="_blank" rel="noopener noreferrer" style={{ fontSize:'11px', color:'#0A66C2', display:'flex', alignItems:'center', gap:3 }}><Download size={11} /> Ver</a>}
                <FileCell bucket="proyectos-docs" path={item.contrato_url} lbl="Subir" accept=".pdf,.doc,.docx"
                  onUploaded={async p => { await supabase.from('proyecto_contratos').update({ contrato_url: p }).eq('id', item.id); onReload() }} />
              </div>
            </div>
            <div>
              <div style={label}>Anexo</div>
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                {urlA && <a href={urlA} target="_blank" rel="noopener noreferrer" style={{ fontSize:'11px', color:'#0A66C2', display:'flex', alignItems:'center', gap:3 }}><Download size={11} /> Ver</a>}
                <FileCell bucket="proyectos-docs" path={item.anexo_url} lbl="Subir" accept=".pdf,.doc,.docx"
                  onUploaded={async p => { await supabase.from('proyecto_contratos').update({ anexo_url: p }).eq('id', item.id); onReload() }} />
              </div>
            </div>
          </div>
        </div>
        <button onClick={onDelete} style={{ padding:'5px 8px', background:'white', border:'1.5px solid #FEE2E2', borderRadius:'6px', cursor:'pointer', color:'#B91C1C', alignSelf:'flex-start' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function ContratoForm({ proyectoId, onClose, onSaved }) {
  const [form, setForm]         = useState({})
  const [fileC, setFileC]       = useState(null)
  const [fileA, setFileA]       = useState(null)
  const [saving, setSaving]     = useState(false)
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    let contrato_url = null, anexo_url = null
    if (fileC) contrato_url = await uploadFile('proyectos-docs', 'contratos', fileC)
    if (fileA) anexo_url    = await uploadFile('proyectos-docs', 'contratos', fileA)
    const { error } = await supabase.from('proyecto_contratos').insert({
      proyecto_id: proyectoId,
      descripcion: form.descripcion || null,
      fecha_firma: form.fecha_firma || null,
      monto_contratado: parseFloat(form.monto_contratado) || null,
      contrato_url, anexo_url,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Contrato registrado')
    onSaved()
  }

  return (
    <SimpleModal title="Registrar contrato" onClose={onClose}>
      <Field lbl="Descripción"><input style={inp} value={form.descripcion||''} onChange={e => f('descripcion', e.target.value)} placeholder="Ej: Contrato principal" /></Field>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field lbl="Fecha de firma"><input style={inp} type="date" value={form.fecha_firma||''} onChange={e => f('fecha_firma', e.target.value)} /></Field>
        <Field lbl="Monto contratado"><input style={inp} type="number" value={form.monto_contratado||''} onChange={e => f('monto_contratado', e.target.value)} /></Field>
      </div>
      <Field lbl="Contrato (PDF)"><input type="file" accept=".pdf,.doc,.docx" onChange={e => setFileC(e.target.files[0])} style={{ fontSize:'12px' }} /></Field>
      <Field lbl="Anexo (PDF)"><input type="file" accept=".pdf,.doc,.docx" onChange={e => setFileA(e.target.files[0])} style={{ fontSize:'12px' }} /></Field>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} />
    </SimpleModal>
  )
}

/* ── TAB PAGOS / FACTURAS ────────────────────────────────────────────────── */
function TabPagos({ proyecto }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('proyecto_pagos')
      .select('*').eq('proyecto_id', proyecto.id).order('fecha', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [proyecto.id])

  useEffect(() => { load() }, [load])

  const total = items.reduce((s, i) => s + (parseFloat(i.monto)||0), 0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:'13px', color:'#6B7280' }}>
          {items.length} pago{items.length !== 1 ? 's' : ''} · Total: <strong>{fmt(total)}</strong>
          {proyecto.presupuesto_total && (
            <span style={{ marginLeft:8, fontSize:'11px',
              color: total > parseFloat(proyecto.presupuesto_total) ? '#B91C1C' : '#057642', fontWeight:700 }}>
              ({Math.round((total / parseFloat(proyecto.presupuesto_total)) * 100)}% del presupuesto)
            </span>
          )}
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
            background:'var(--color-primary)', color:'white', border:'none',
            borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
          <Plus size={13} /> Registrar pago
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>Cargando…</div>
      : items.length === 0
        ? <EmptySection icon={<Receipt size={32} />} text="Sin pagos registrados" />
        : (
          <div style={{ display:'grid', gap:10 }}>
            {items.map(item => (
              <PagoCard key={item.id} item={item}
                onDelete={async () => { await supabase.from('proyecto_pagos').delete().eq('id', item.id); load() }}
                onReload={load} />
            ))}
          </div>
        )
      }

      {showAdd && (
        <PagoForm proyectoId={proyecto.id} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function PagoCard({ item, onDelete, onReload }) {
  const [urls, setUrls] = useState({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const u = {}
      if (item.factura_pdf_url)   u.pdf   = await firmarUrl('proyectos-docs', item.factura_pdf_url)
      if (item.factura_xml_url)   u.xml   = await firmarUrl('proyectos-docs', item.factura_xml_url)
      if (item.factura_zip_url)   u.zip   = await firmarUrl('proyectos-docs', item.factura_zip_url)
      if (item.transferencia_url) u.trans = await firmarUrl('proyectos-docs', item.transferencia_url)
      setUrls(u)
    }
    load()
  }, [item])

  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start',
        cursor:'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:700, fontSize:'13px', color:'#111827' }}>{fmt(item.monto)}</span>
            <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'20px',
              background:'#EFF6FF', color:'#1D4ED8' }}>{item.tipo}</span>
            {item.incluye_iva && <span style={{ fontSize:'11px', color:'#6B7280' }}>con IVA</span>}
          </div>
          <div style={{ fontSize:'12px', color:'#374151', marginTop:2 }}>{item.descripcion}</div>
          {item.alcance && <div style={{ fontSize:'11px', color:'#6B7280', marginTop:1 }}>{item.alcance}</div>}
          <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:3 }}>{fmtDate(item.fecha)}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {open ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ padding:'4px 7px', background:'white', border:'1.5px solid #FEE2E2', borderRadius:'6px', cursor:'pointer', color:'#B91C1C' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:'1px solid #F3F4F6', padding:'12px 18px',
          display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, background:'#FAFAFA' }}>
          {[
            { k:'pdf',   lbl:'Factura PDF',   field:'factura_pdf_url',   accept:'.pdf' },
            { k:'xml',   lbl:'Factura XML',   field:'factura_xml_url',   accept:'.xml' },
            { k:'zip',   lbl:'Factura ZIP',   field:'factura_zip_url',   accept:'.zip,.rar' },
            { k:'trans', lbl:'Transferencia', field:'transferencia_url', accept:'image/*,.pdf' },
          ].map(({ k, lbl, field, accept }) => (
            <div key={k}>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', marginBottom:4 }}>{lbl}</div>
              <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                {urls[k] && <a href={urls[k]} target="_blank" rel="noopener noreferrer" style={{ fontSize:'11px', color:'#0A66C2', display:'flex', alignItems:'center', gap:2 }}><Download size={10} /> Ver</a>}
                <FileCell bucket="proyectos-docs" path={item[field]}
                  lbl={urls[k] ? 'Reemplazar' : 'Subir'} accept={accept}
                  onUploaded={async p => {
                    await supabase.from('proyecto_pagos').update({ [field]: p }).eq('id', item.id)
                    onReload()
                  }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PagoForm({ proyectoId, onClose, onSaved }) {
  const [form,  setForm]  = useState({ tipo:'FACTURA', incluye_iva: true })
  const [files, setFiles] = useState({})
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))
  const ffile = (k, file) => setFiles(x => ({ ...x, [k]: file }))

  const handleSave = async () => {
    if (!form.descripcion?.trim()) { toast.error('La descripción es requerida'); return }
    if (!form.monto) { toast.error('El monto es requerido'); return }
    setSaving(true)
    const uploads = {}
    for (const [k, file] of Object.entries(files)) {
      if (file) uploads[k] = await uploadFile('proyectos-docs', 'pagos', file)
    }
    const { error } = await supabase.from('proyecto_pagos').insert({
      proyecto_id: proyectoId,
      fecha: form.fecha || new Date().toISOString().slice(0,10),
      descripcion: form.descripcion,
      alcance: form.alcance || null,
      monto: parseFloat(form.monto),
      incluye_iva: form.incluye_iva,
      tipo: form.tipo,
      factura_pdf_url:   uploads.pdf  || null,
      factura_xml_url:   uploads.xml  || null,
      factura_zip_url:   uploads.zip  || null,
      transferencia_url: uploads.trans || null,
      notas: form.notas || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Pago registrado')
    onSaved()
  }

  return (
    <SimpleModal title="Registrar pago / factura" onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field lbl="Fecha">
          <input style={inp} type="date" value={form.fecha||''} onChange={e => f('fecha', e.target.value)} />
        </Field>
        <Field lbl="Tipo">
          <select style={inp} value={form.tipo} onChange={e => f('tipo', e.target.value)}>
            {TIPOS_PAGO.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field lbl="Monto">
          <input style={inp} type="number" value={form.monto||''} onChange={e => f('monto', e.target.value)} placeholder="0.00" />
        </Field>
        <Field lbl="¿Incluye IVA?">
          <select style={inp} value={form.incluye_iva ? 'si' : 'no'} onChange={e => f('incluye_iva', e.target.value === 'si')}>
            <option value="si">Sí incluye IVA</option>
            <option value="no">No incluye IVA</option>
          </select>
        </Field>
      </div>
      <Field lbl="Descripción *">
        <input style={inp} value={form.descripcion||''} onChange={e => f('descripcion', e.target.value)} placeholder="Ej: Pago anticipo 50%" />
      </Field>
      <Field lbl="Alcance">
        <textarea style={{ ...inp, minHeight:60, fontFamily:'inherit', resize:'vertical' }}
          value={form.alcance||''} onChange={e => f('alcance', e.target.value)} placeholder="Descripción del alcance cubierto en este pago" />
      </Field>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field lbl="Factura PDF"><input type="file" accept=".pdf" onChange={e => ffile('pdf', e.target.files[0])} style={{ fontSize:'12px' }} /></Field>
        <Field lbl="Factura XML"><input type="file" accept=".xml" onChange={e => ffile('xml', e.target.files[0])} style={{ fontSize:'12px' }} /></Field>
        <Field lbl="Factura ZIP"><input type="file" accept=".zip,.rar" onChange={e => ffile('zip', e.target.files[0])} style={{ fontSize:'12px' }} /></Field>
        <Field lbl="Imagen transferencia"><input type="file" accept="image/*,.pdf" onChange={e => ffile('trans', e.target.files[0])} style={{ fontSize:'12px' }} /></Field>
      </div>
      <Field lbl="Notas">
        <textarea style={{ ...inp, minHeight:50, fontFamily:'inherit', resize:'vertical' }} value={form.notas||''} onChange={e => f('notas', e.target.value)} />
      </Field>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} saveLbl="Registrar pago" />
    </SimpleModal>
  )
}

/* ── TAB AVANCES ─────────────────────────────────────────────────────────── */
function TabAvances({ proyecto }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('proyecto_avances')
      .select('*, fotos:proyecto_avance_fotos(*)')
      .eq('proyecto_id', proyecto.id)
      .order('fecha', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [proyecto.id])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:'13px', color:'#6B7280' }}>{items.length} registro{items.length !== 1 ? 's' : ''} de avance</div>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px',
            background:'var(--color-primary)', color:'white', border:'none',
            borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
          <Plus size={13} /> Registrar avance
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:40, color:'#9CA3AF' }}>Cargando…</div>
      : items.length === 0
        ? <EmptySection icon={<Camera size={32} />} text="Sin avances registrados. Agrega registros periódicos con fotos de la obra." />
        : (
          <div style={{ display:'grid', gap:14 }}>
            {items.map(item => (
              <AvanceCard key={item.id} item={item}
                onDelete={async () => { await supabase.from('proyecto_avances').delete().eq('id', item.id); load() }}
                onReload={load} />
            ))}
          </div>
        )
      }

      {showAdd && (
        <AvanceForm proyectoId={proyecto.id} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />
      )}
    </div>
  )
}

function AvanceCard({ item, onDelete, onReload }) {
  const [fotos, setFotos] = useState([])
  const [open,  setOpen]  = useState(true)
  const fileRef = useRef()

  useEffect(() => {
    const loadFotos = async () => {
      const signed = await Promise.all(
        (item.fotos || []).map(async f => ({
          ...f,
          url: await firmarUrl('proyectos-avances', f.foto_url)
        }))
      )
      setFotos(signed)
    }
    loadFotos()
  }, [item.fotos])

  const handleAddFotos = async (files) => {
    for (const file of Array.from(files)) {
      const path = await uploadFile('proyectos-avances', `avance-${item.id}`, file)
      if (path) {
        await supabase.from('proyecto_avance_fotos').insert({ avance_id: item.id, foto_url: path })
      }
    }
    onReload()
  }

  const deletePhoto = async (fotoId) => {
    await supabase.from('proyecto_avance_fotos').delete().eq('id', fotoId)
    onReload()
  }

  return (
    <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', cursor:'pointer' }}
        onClick={() => setOpen(!open)}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:700, fontSize:'13px', color:'#111827' }}>{item.descripcion_corta}</span>
            {item.porcentaje_avance != null && (
              <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'20px',
                background: item.porcentaje_avance >= 100 ? '#D1FAE5' : '#DBEAFE',
                color: item.porcentaje_avance >= 100 ? '#057642' : '#1D4ED8' }}>
                {item.porcentaje_avance}%
              </span>
            )}
          </div>
          <div style={{ fontSize:'11px', color:'#9CA3AF', marginTop:2 }}>
            {fmtDate(item.fecha)} · {(item.fotos||[]).length} foto{(item.fotos||[]).length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {open ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ padding:'4px 7px', background:'white', border:'1.5px solid #FEE2E2', borderRadius:'6px', cursor:'pointer', color:'#B91C1C' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:'1px solid #F3F4F6', padding:'14px 18px', background:'#FAFAFA' }}>
          {item.descripcion_larga && (
            <p style={{ fontSize:'12px', color:'#374151', margin:'0 0 12px', lineHeight:1.6 }}>{item.descripcion_larga}</p>
          )}

          {/* Barra de progreso */}
          {item.porcentaje_avance != null && (
            <div style={{ marginBottom:14 }}>
              <div style={{ height:6, background:'#E5E7EB', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width: item.porcentaje_avance + '%',
                  background: item.porcentaje_avance >= 100 ? '#057642' : '#0A66C2',
                  transition:'width .3s', borderRadius:3 }} />
              </div>
            </div>
          )}

          {/* Galería de fotos */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            {fotos.map(f => (
              <div key={f.id} style={{ position:'relative', width:100, height:100, borderRadius:8, overflow:'hidden', border:'1px solid #E5E7EB' }}>
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  <img src={f.url} alt={f.descripcion||'Avance'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </a>
                <button onClick={() => deletePhoto(f.id)}
                  style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%',
                    background:'rgba(0,0,0,.6)', border:'none', color:'white', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>
                  <X size={10} />
                </button>
              </div>
            ))}
            <button onClick={() => fileRef.current.click()}
              style={{ width:100, height:100, borderRadius:8, border:'2px dashed #D1D5DB',
                background:'white', cursor:'pointer', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:4, color:'#9CA3AF', fontSize:'11px' }}>
              <Plus size={16} /> Agregar
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
            onChange={e => handleAddFotos(e.target.files)} />
        </div>
      )}
    </div>
  )
}

function AvanceForm({ proyectoId, onClose, onSaved }) {
  const [form,  setForm]  = useState({ porcentaje_avance: '' })
  const [fotos, setFotos] = useState([])
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(x => ({ ...x, [k]: v }))

  const handleSave = async () => {
    if (!form.descripcion_corta?.trim()) { toast.error('La descripción corta es requerida'); return }
    setSaving(true)
    const { data: avance, error } = await supabase.from('proyecto_avances').insert({
      proyecto_id: proyectoId,
      fecha: form.fecha || new Date().toISOString().slice(0,10),
      porcentaje_avance: form.porcentaje_avance !== '' ? parseInt(form.porcentaje_avance) : null,
      descripcion_corta: form.descripcion_corta,
      descripcion_larga: form.descripcion_larga || null,
    }).select().single()

    if (error) { toast.error(error.message); setSaving(false); return }

    // Subir fotos
    for (const file of fotos) {
      const path = await uploadFile('proyectos-avances', `avance-${avance.id}`, file)
      if (path) await supabase.from('proyecto_avance_fotos').insert({ avance_id: avance.id, foto_url: path })
    }

    setSaving(false)
    toast.success('Avance registrado')
    onSaved()
  }

  return (
    <SimpleModal title="Registrar avance de obra" onClose={onClose}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field lbl="Fecha"><input style={inp} type="date" value={form.fecha||''} onChange={e => f('fecha', e.target.value)} /></Field>
        <Field lbl="% Avance">
          <input style={inp} type="number" min="0" max="100" value={form.porcentaje_avance}
            onChange={e => f('porcentaje_avance', e.target.value)} placeholder="0 – 100" />
        </Field>
      </div>
      <Field lbl="Descripción corta *">
        <input style={inp} value={form.descripcion_corta||''} onChange={e => f('descripcion_corta', e.target.value)} placeholder="Ej: Terminado colado de losa nivel 2" />
      </Field>
      <Field lbl="Descripción detallada">
        <textarea style={{ ...inp, minHeight:80, fontFamily:'inherit', resize:'vertical' }}
          value={form.descripcion_larga||''} onChange={e => f('descripcion_larga', e.target.value)}
          placeholder="Descripción extensa del estado actual de la obra…" />
      </Field>
      <Field lbl="Fotografías del avance">
        <input type="file" accept="image/*" multiple style={{ fontSize:'12px' }}
          onChange={e => setFotos(Array.from(e.target.files))} />
        {fotos.length > 0 && <div style={{ fontSize:'11px', color:'#6B7280', marginTop:4 }}>{fotos.length} foto{fotos.length !== 1 ? 's' : ''} seleccionada{fotos.length !== 1 ? 's' : ''}</div>}
      </Field>
      <ModalFooter onClose={onClose} onSave={handleSave} saving={saving} saveLbl="Guardar avance" />
    </SimpleModal>
  )
}

/* ── Helpers UI ──────────────────────────────────────────────────────────── */
function SimpleModal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'white', borderRadius:'12px', width:'100%', maxWidth:560,
        maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'16px 20px', borderBottom:'1px solid #E5E7EB' }}>
          <span style={{ fontWeight:700, fontSize:'14px' }}>{title}</span>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#6B7280' }}><X size={17} /></button>
        </div>
        <div style={{ padding:'18px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, onSave, saving, saveLbl = 'Guardar' }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
      <button onClick={onClose} style={{ padding:'8px 16px', border:'1.5px solid #E5E7EB', borderRadius:'7px', background:'white', fontSize:'13px', cursor:'pointer' }}>Cancelar</button>
      <button onClick={onSave} disabled={saving}
        style={{ padding:'8px 18px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
        {saving ? 'Guardando…' : saveLbl}
      </button>
    </div>
  )
}

function EmptySection({ icon, text }) {
  return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:'#9CA3AF', background:'white',
      border:'1px solid #E5E7EB', borderRadius:'10px' }}>
      <div style={{ marginBottom:10, opacity:.4 }}>{icon}</div>
      <div style={{ fontSize:'13px' }}>{text}</div>
    </div>
  )
}
