import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Receipt, Plus, X, Search, Pencil, Trash2, Camera, ChevronDown, ChevronRight, AlertTriangle, Check, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

const GRUPOS = [
  'Ferretería y materiales', 'Limpieza e higiene', 'Papelería y oficina',
  'Electricidad', 'Plomería', 'Herramienta y equipo', 'Servicios externos',
  'Vending / Reabasto', 'Combustible', 'Seguridad', 'Alimentación', 'Otros',
]
const GRUPO_COLOR = {
  'Ferretería y materiales': '#0A66C2', 'Limpieza e higiene': '#057642',
  'Papelería y oficina': '#E8A020', 'Electricidad': '#F59E0B',
  'Plomería': '#3B82F6', 'Herramienta y equipo': '#6366F1',
  'Servicios externos': '#8B5CF6', 'Vending / Reabasto': '#EC4899',
  'Combustible': '#EF4444', 'Seguridad': '#B24020',
  'Alimentación': '#10B981', 'Otros': '#6B7280',
}

function calcDatos(fecha) {
  const dt = new Date(fecha + 'T12:00:00')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return { anio: dt.getFullYear(), mes: MESES[dt.getMonth()], dia_semana: DIAS[dt.getDay()], semana: `S${Math.ceil(dt.getDate() / 7)}` }
}

// ─── Modal Ticket ──────────────────────────────────────────────────────────────
function TicketModal({ gasto, proveedores, productos, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!gasto?.id
  const fileRef = useRef()

  const [form, setForm] = useState({
    fecha:       gasto?.fecha || today,
    proveedor_id: gasto?.proveedor_id || '',
    proveedor_txt: gasto?.proveedor_txt || '',
    grupo_gasto:  gasto?.grupo_gasto || GRUPOS[0],
    descripcion:  gasto?.descripcion || '',
    ticket_total: gasto?.ticket_total || gasto?.monto || '',
  })
  const [lineas, setLineas] = useState([])
  const [ocr, setOcr] = useState({ loading: false, error: null })
  const [saving, setSaving] = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [imgB64, setImgB64] = useState(null)
  const [imgType, setImgType] = useState('image/jpeg')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Cargar detalle existente al editar
  useEffect(() => {
    if (!gasto?.id) return
    supabase.from('gasto_detalle').select('*').eq('gasto_id', gasto.id).order('created_at')
      .then(({ data }) => setLineas(data?.map(d => ({ ...d, _key: d.id })) || []))
  }, [gasto?.id])

  const addLinea = () => setLineas(l => [...l, { _key: Date.now(), producto_id: '', descripcion: '', categoria: '', cantidad: 1, precio_unit: '' }])
  const updLinea = (key, field, val) => setLineas(l => l.map(r => r._key === key ? { ...r, [field]: val } : r))
  const delLinea = (key) => setLineas(l => l.filter(r => r._key !== key))

  const sumaLineas = lineas.reduce((a, r) => a + (parseFloat(r.cantidad || 1) * parseFloat(r.precio_unit || 0)), 0)
  const totalOK    = !form.ticket_total || Math.abs(sumaLineas - parseFloat(form.ticket_total)) < 0.02

  // ── OCR: leer imagen con Claude Vision ────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgType(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImgPreview(ev.target.result)
      setImgB64(ev.target.result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const runOCR = async () => {
    if (!imgB64) return
    setOcr({ loading: true, error: null })
    try {
      const res = await fetch('/.netlify/functions/gastos-ocr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: imgB64, media_type: imgType }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.total)     set('ticket_total', String(data.total))
      if (data.proveedor) set('proveedor_txt', data.proveedor)
      if (data.fecha)     set('fecha', data.fecha)
      if (data.lineas?.length) {
        setLineas(data.lineas.map((l, i) => ({
          _key: Date.now() + i,
          descripcion: l.descripcion || '',
          cantidad:    l.cantidad ?? 1,
          precio_unit: l.precio_unit ?? '',
          producto_id: '',
          categoria:   '',
        })))
      }
      setOcr({ loading: false, error: null })
      toast.success(`Ticket leído: ${data.lineas?.length || 0} productos`)
    } catch (err) {
      setOcr({ loading: false, error: err.message })
    }
  }

  const guardar = async () => {
    if (!form.fecha || !form.grupo_gasto) { toast.error('Fecha y grupo son obligatorios'); return }
    setSaving(true)
    try {
      const montoTotal = parseFloat(form.ticket_total) || sumaLineas || 0
      const datosFecha = calcDatos(form.fecha)
      const payload = {
        fecha:        form.fecha,
        proveedor:    form.proveedor_txt || (proveedores.find(p => p.id === form.proveedor_id)?.nombre) || null,
        proveedor_id: form.proveedor_id || null,
        grupo_gasto:  form.grupo_gasto,
        descripcion:  form.descripcion || null,
        cantidad:     montoTotal,
        ticket_total: montoTotal,
        ...datosFecha,
      }

      let gastoId = gasto?.id
      if (isEdit) {
        const { error } = await supabase.from('gastos_operativos').update(payload).eq('id', gastoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('gastos_operativos').insert(payload).select('id').single()
        if (error) throw error
        gastoId = data.id
      }

      // Guardar detalle: borrar previo e insertar de nuevo
      if (lineas.length > 0) {
        await supabase.from('gasto_detalle').delete().eq('gasto_id', gastoId)
        const lineasPayload = lineas.filter(l => l.descripcion && l.precio_unit).map(l => ({
          gasto_id:    gastoId,
          producto_id: l.producto_id || null,
          descripcion: l.descripcion,
          categoria:   l.categoria || null,
          cantidad:    parseFloat(l.cantidad) || 1,
          precio_unit: parseFloat(l.precio_unit),
        }))
        if (lineasPayload.length) await supabase.from('gasto_detalle').insert(lineasPayload)
      }

      toast.success(isEdit ? 'Gasto actualizado' : 'Ticket registrado')
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '8px 11px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', margin: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A66C2', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} /> {isEdit ? 'Editar gasto' : 'Nuevo Ticket / Gasto'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Sección 1: Encabezado ── */}
          <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0A66C2', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.06em' }}>1. Encabezado del ticket</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Fecha *</label>
                <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Monto total del ticket *</label>
                <input type="number" value={form.ticket_total} onChange={e => set('ticket_total', e.target.value)} placeholder="0.00" style={{ ...inp, borderColor: !totalOK && lineas.length > 0 ? '#B24020' : '#E5E7EB' }} step="0.01" min="0" />
              </div>
              <div>
                <label style={lbl}>Proveedor (catálogo)</label>
                <select value={form.proveedor_id} onChange={e => { set('proveedor_id', e.target.value); set('proveedor_txt', '') }} style={inp}>
                  <option value="">— Seleccionar —</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              {!form.proveedor_id && (
                <div>
                  <label style={lbl}>Proveedor (texto libre)</label>
                  <input value={form.proveedor_txt} onChange={e => set('proveedor_txt', e.target.value)} placeholder="Ej: Dogo, Oxxo, Sam's…" style={inp} />
                </div>
              )}
              <div style={{ gridColumn: form.proveedor_id ? '2' : '1 / -1' }}>
                <label style={lbl}>Categoría / Grupo *</label>
                <select value={form.grupo_gasto} onChange={e => set('grupo_gasto', e.target.value)} style={inp}>
                  {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Descripción / Concepto general</label>
                <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Resumen del gasto…" style={inp} />
              </div>
            </div>
          </div>

          {/* ── Sección 2: OCR / Imagen ── */}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.06em' }}>2. Foto del ticket (OCR con IA)</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                <button type="button" onClick={() => fileRef.current.click()} style={{ padding: '8px 14px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={15} /> {imgPreview ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {imgB64 && !ocr.loading && (
                  <button type="button" onClick={runOCR} style={{ marginTop: 8, padding: '8px 14px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader size={14} /> Leer con IA
                  </button>
                )}
                {ocr.loading && <div style={{ marginTop: 8, fontSize: 13, color: '#0A66C2', display: 'flex', alignItems: 'center', gap: 6 }}><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analizando ticket…</div>}
                {ocr.error && <div style={{ marginTop: 8, fontSize: 12, color: '#B24020' }}>Error: {ocr.error}</div>}
              </div>
              {imgPreview && <img src={imgPreview} alt="ticket" style={{ width: 100, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #FDE68A' }} />}
              {!imgPreview && (
                <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                  Sube la foto del ticket → la IA extrae productos, cantidades y montos automáticamente.<br />
                  Puedes corregir el resultado antes de guardar.
                </div>
              )}
            </div>
          </div>

          {/* ── Sección 3: Detalle de productos ── */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>3. Detalle de productos</div>
              <button type="button" onClick={addLinea} style={{ padding: '5px 12px', background: '#057642', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> Agregar línea
              </button>
            </div>
            {lineas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#6B7280' }}>
                Sin detalle — usa el botón + o la IA para agregar productos
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                  {['Producto / descripción', 'Categoría', 'Cant.', 'Precio unit.', ''].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>
                {lineas.map(l => {
                  const subtotal = (parseFloat(l.cantidad || 1) * parseFloat(l.precio_unit || 0))
                  return (
                    <div key={l._key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <input value={l.descripcion} onChange={e => updLinea(l._key, 'descripcion', e.target.value)}
                        placeholder="Producto o servicio" list={`prod-${l._key}`}
                        style={{ ...inp, padding: '6px 9px' }} />
                      <datalist id={`prod-${l._key}`}>
                        {productos.map(p => <option key={p.id} value={p.nombre} />)}
                      </datalist>
                      <select value={l.categoria || ''} onChange={e => updLinea(l._key, 'categoria', e.target.value)} style={{ ...inp, padding: '6px 6px' }}>
                        <option value="">—</option>
                        {[['VENDING','Vending'],['OPERACION','Operación'],['MANTENIMIENTO','Mantenimiento']].map(([v,lb]) => <option key={v} value={v}>{lb}</option>)}
                      </select>
                      <input type="number" value={l.cantidad} onChange={e => updLinea(l._key, 'cantidad', e.target.value)} style={{ ...inp, padding: '6px 9px' }} min="0" step="0.001" />
                      <div style={{ position: 'relative' }}>
                        <input type="number" value={l.precio_unit} onChange={e => updLinea(l._key, 'precio_unit', e.target.value)}
                          placeholder="0.00" style={{ ...inp, padding: '6px 9px' }} min="0" step="0.01" />
                        {subtotal > 0 && <div style={{ position: 'absolute', right: 6, bottom: -14, fontSize: 9, color: '#6B7280', whiteSpace: 'nowrap' }}>{fmt(subtotal)}</div>}
                      </div>
                      <button onClick={() => delLinea(l._key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><X size={14} /></button>
                    </div>
                  )
                })}

                {/* Validación total */}
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: '#6B7280' }}>Suma detalle: </span>
                    <strong style={{ color: totalOK ? '#057642' : '#B24020' }}>{fmt(sumaLineas)}</strong>
                  </div>
                  {form.ticket_total && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      {totalOK
                        ? <><Check size={15} color="#057642" /><span style={{ color: '#057642', fontWeight: 700 }}>Cuadra con el ticket</span></>
                        : <><AlertTriangle size={15} color="#B24020" /><span style={{ color: '#B24020', fontWeight: 700 }}>Diferencia: {fmt(Math.abs(sumaLineas - parseFloat(form.ticket_total)))}</span></>
                      }
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botón guardar */}
          <button onClick={guardar} disabled={saving} style={{ padding: '12px', background: saving ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : '💾 Registrar Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function GastosOperativos() {
  useModuleAudit('GASTOS_OPERATIVOS')
  const [gastos, setGastos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('Todos')
  const [modal, setModal]         = useState(null) // null | 'nuevo' | gasto
  const [expanded, setExpanded]   = useState(null)
  const [detalle, setDetalle]     = useState({}) // { [gastoId]: lineas[] }
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos]   = useState([])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: g }, { data: p }, { data: pr }] = await Promise.all([
      supabase.from('gastos_operativos').select('*, cat_proveedores(nombre, categoria)').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(300),
      supabase.from('cat_proveedores').select('id, nombre, categoria').eq('activo', true).order('nombre'),
      supabase.from('cat_productos').select('id, clave, nombre, categoria, unidad').eq('activo', true).order('nombre'),
    ])
    setGastos(g || [])
    setProveedores(p || [])
    setProductos(pr || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cargarDetalle = async (gastoId) => {
    if (detalle[gastoId]) return
    const { data } = await supabase.from('gasto_detalle').select('*').eq('gasto_id', gastoId).order('created_at')
    setDetalle(d => ({ ...d, [gastoId]: data || [] }))
  }

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    await cargarDetalle(id)
  }

  const eliminar = async (g) => {
    if (!window.confirm(`¿Eliminar gasto ${g.descripcion || fmt(g.cantidad)}?`)) return
    await supabase.from('gastos_operativos').delete().eq('id', g.id)
    cargar()
    toast.success('Gasto eliminado')
  }

  const filtrados = gastos.filter(g => {
    const matchQ = !search || (g.descripcion || '').toLowerCase().includes(search.toLowerCase()) || (g.proveedor || '').toLowerCase().includes(search.toLowerCase())
    const matchG = filtroGrupo === 'Todos' || g.grupo_gasto === filtroGrupo
    return matchQ && matchG
  })

  const totalFiltrado = filtrados.reduce((a, g) => a + (parseFloat(g.cantidad) || 0), 0)

  // Grupos presentes en datos para filtros
  const gruposPresentes = ['Todos', ...new Set(gastos.map(g => g.grupo_gasto).filter(Boolean))]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Receipt size={22} color="#E8A020" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A3C5E' }}>Gastos Operativos</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Tickets con detalle de productos • Proveedor • OCR</p>
          </div>
        </div>
        <button onClick={() => setModal('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#E8A020', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo ticket
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '0 0 240px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar concepto o proveedor…"
            style={{ width: '100%', paddingLeft: 28, padding: '7px 8px 7px 28px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ overflowX: 'auto', display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
          {gruposPresentes.map(g => {
            const color = g === 'Todos' ? '#6B7280' : (GRUPO_COLOR[g] || '#6B7280')
            const active = filtroGrupo === g
            return (
              <button key={g} onClick={() => setFiltroGrupo(g)} style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${color}`, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: active ? color : 'white', color: active ? 'white' : color }}>
                {g === 'Todos' ? 'Todos' : g}
              </button>
            )
          })}
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 15, color: '#1A3C5E' }}>
          {fmt(totalFiltrado)}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            <Receipt size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>Sin gastos registrados. Usa el botón "+ Nuevo ticket" para agregar.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {['', 'Fecha', 'Proveedor', 'Grupo', 'Descripción', 'Monto', 'Detalle', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(g => {
                const isOpen = expanded === g.id
                const lineas = detalle[g.id] || []
                const sumaD  = lineas.reduce((a, l) => a + parseFloat(l.subtotal || 0), 0)
                const cuadra = !g.ticket_total || lineas.length === 0 || Math.abs(sumaD - parseFloat(g.ticket_total)) < 0.02
                const color  = GRUPO_COLOR[g.grupo_gasto] || '#6B7280'
                const prvNombre = g.cat_proveedores?.nombre || g.proveedor || '—'

                return (
                  <>
                    <tr key={g.id} style={{ borderBottom: isOpen ? 'none' : '1px solid #F3F4F6', background: isOpen ? '#F0FDF4' : 'transparent', cursor: 'pointer' }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#F9FAFB' }}
                      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding: '10px 8px 10px 12px', width: 24 }}>
                        <button onClick={() => toggleExpand(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}>
                          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{prvNombre}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color }}>{g.grupo_gasto}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.descripcion || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, color: '#1A3C5E', whiteSpace: 'nowrap' }}>{fmt(g.cantidad)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {g.num_lineas > 0 || lineas.length > 0 ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: cuadra ? '#057642' : '#B24020', fontWeight: 700 }}>
                            {cuadra ? <Check size={13} /> : <AlertTriangle size={13} />}
                            {lineas.length || '?'} líneas
                          </span>
                        ) : <span style={{ fontSize: 12, color: '#9CA3AF' }}>Sin detalle</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={(e) => { e.stopPropagation(); setModal(g) }} style={{ padding: '4px 8px', background: '#EFF6FF', color: '#0A66C2', border: 'none', borderRadius: 5, cursor: 'pointer' }}><Pencil size={12} /></button>
                          <button onClick={(e) => { e.stopPropagation(); eliminar(g) }} style={{ padding: '4px 8px', background: '#FEE2E2', color: '#B24020', border: 'none', borderRadius: 5, cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={g.id + '-det'} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td colSpan={8} style={{ padding: '0 12px 12px 32px', background: '#F0FDF4' }}>
                          {lineas.length === 0 ? (
                            <div style={{ fontSize: 13, color: '#6B7280', padding: '8px 0' }}>Sin detalle de productos — edita para agregar</div>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr>
                                  {['Producto', 'Categoría', 'Cant.', 'Precio unit.', 'Subtotal'].map(h => (
                                    <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {lineas.map(l => (
                                  <tr key={l.id}>
                                    <td style={{ padding: '4px 8px', color: '#374151' }}>{l.descripcion}</td>
                                    <td style={{ padding: '4px 8px', color: '#6B7280' }}>{l.categoria || '—'}</td>
                                    <td style={{ padding: '4px 8px', color: '#374151' }}>{l.cantidad}</td>
                                    <td style={{ padding: '4px 8px', color: '#374151' }}>{fmt(l.precio_unit)}</td>
                                    <td style={{ padding: '4px 8px', fontWeight: 700, color: '#057642' }}>{fmt(l.subtotal)}</td>
                                  </tr>
                                ))}
                                <tr style={{ borderTop: '1px dashed #BBF7D0' }}>
                                  <td colSpan={4} style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right', color: '#374151' }}>Total detalle:</td>
                                  <td style={{ padding: '6px 8px', fontWeight: 800, color: cuadra ? '#057642' : '#B24020' }}>
                                    {fmt(sumaD)} {!cuadra && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: 4 }} />}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <TicketModal
          gasto={modal === 'nuevo' ? null : modal}
          proveedores={proveedores}
          productos={productos}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); setDetalle({}); cargar() }}
        />
      )}
    </div>
  )
}
