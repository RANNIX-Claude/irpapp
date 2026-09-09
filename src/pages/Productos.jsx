import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Search, X, Pencil, LayoutGrid, AlignJustify } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LogoEditable from '../components/ui/LogoEditable'
import toast from 'react-hot-toast'

// Unidades de compra habituales en los tickets de proveedor.
const UNIDADES = ['PZA', 'KG', 'GR', 'LT', 'ML', 'MT', 'CAJA', 'PAQUETE', 'BOLSA', 'SERVICIO']

// cat_productos tiene CHECK sobre categoria: solo acepta estos tres valores.
// Por eso es un select y no texto libre — cualquier otra cosa hace fallar el alta.
const CATEGORIAS = ['VENDING', 'OPERACION', 'MANTENIMIENTO']

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }

// ─── Alta / edición ──────────────────────────────────────────────────────────
function ProductoModal({ producto, onClose, onSaved }) {
  const esNuevo = producto === 'nuevo'
  const [form, setForm] = useState(esNuevo
    ? { clave: '', nombre: '', categoria: '', unidad: 'PZA', activo: true }
    : {
        clave: producto.clave || '', nombre: producto.nombre || '',
        categoria: producto.categoria || '', unidad: producto.unidad || 'PZA',
        activo: producto.activo ?? true,
      })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.clave.trim()) return toast.error('La clave es obligatoria')
    if (!form.categoria) return toast.error('Elige una categoría')
    setSaving(true)
    const payload = {
      clave: form.clave.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      unidad: form.unidad || null,
      activo: form.activo,
    }
    const { error } = esNuevo
      ? await supabase.from('cat_productos').insert(payload)
      : await supabase.from('cat_productos').update(payload).eq('id', producto.id)
    setSaving(false)
    if (error) {
      if (error.code === '23505') return toast.error('Ya existe un producto con esa clave')
      return toast.error(error.message)
    }
    toast.success(esNuevo ? 'Producto creado' : 'Producto actualizado')
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 480, maxWidth: '96vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{esNuevo ? 'Nuevo producto' : 'Editar producto'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
          {/* La imagen solo se puede cargar sobre un producto ya guardado: hace
              falta su id para nombrar el archivo y actualizar la fila. */}
          {!esNuevo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', background: '#F8FAFC', borderRadius: 10 }}>
              <LogoEditable
                prefijo="productos" tabla="cat_productos" columna="imagen_url"
                registroId={producto.id} url={producto.imagen_url} nombre={producto.nombre}
                size={64} redondo={false} onSubido={onSaved}
              />
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                Clic en la imagen para {producto.imagen_url ? 'cambiarla' : 'agregarla'}.<br />
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>JPG, PNG o WEBP · máx 2 MB</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Clave *</label>
              <input value={form.clave} onChange={e => set('clave', e.target.value)} placeholder="SKU interno" style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label style={lbl}>Unidad</label>
              <select value={form.unidad} onChange={e => set('unidad', e.target.value)} style={{ ...inp, background: 'white' }}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Coca-Cola 600 ml" style={inp} />
          </div>

          <div>
            <label style={lbl}>Categoría *</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={{ ...inp, background: 'white' }}>
              <option value="">— Seleccionar —</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} />
            Producto activo
          </label>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, border: '1.5px solid #E5E7EB', borderRadius: 8, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: '#0A66C2', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? .7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta ─────────────────────────────────────────────────────────────────
function TarjetaProducto({ p, onImagen, onEditar }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,.06)', opacity: p.activo ? 1 : .55 }}>
      {/* La imagen manda en la tarjeta: es lo que permite reconocer el producto */}
      <div style={{ height: 130, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
        <LogoEditable
          prefijo="productos" tabla="cat_productos" columna="imagen_url"
          registroId={p.id} url={p.imagen_url} nombre={p.nombre}
          size={104} redondo={false} onSubido={url => onImagen(p.id, url)}
        />
        {p.unidad && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: '#0A66C2', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 5 }}>{p.unidad}</span>
        )}
      </div>

      <div style={{ padding: '12px 14px', flex: 1, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', lineHeight: 1.3 }}>{p.nombre}</div>
        {p.categoria && <div style={{ fontSize: 11, color: '#0A66C2', fontWeight: 600, marginTop: 3 }}>{p.categoria}</div>}
        {p.clave && <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 3 }}>{p.clave}</div>}
      </div>

      <button onClick={() => onEditar(p)} style={{ padding: '9px', background: 'none', border: 'none', borderTop: '1px solid #F3F4F6', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0A66C2' }}>
        Editar
      </button>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function Productos() {
  useModuleAudit('PRODUCTOS')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroCat, setFiltroCat] = useState('Todas')
  const [soloActivos, setSoloActivos] = useState(true)
  const [vistaGrid, setVistaGrid] = useState(true)
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('cat_productos').select('*').order('nombre')
    if (error) toast.error('No se pudieron cargar los productos: ' + error.message)
    setLista(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const aplicarImagen = (id, url) =>
    setLista(prev => prev.map(p => p.id === id ? { ...p, imagen_url: url } : p))

  const categorias = [...new Set(lista.map(p => p.categoria).filter(Boolean))].sort()

  const filtrados = lista.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.nombre.toLowerCase().includes(q) || (p.clave || '').toLowerCase().includes(q)
    const matchC = filtroCat === 'Todas' || p.categoria === filtroCat
    const matchA = !soloActivos || p.activo
    return matchQ && matchC && matchA
  })

  const conImagen = lista.filter(p => p.imagen_url).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={22} color="#0A66C2" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A66C2' }}>Productos</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
              Catálogo de compras · {lista.length} productos · {conImagen} con imagen
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setVistaGrid(false)} title="Vista lista"
              style={{ padding: '7px 11px', background: !vistaGrid ? '#0A66C2' : 'white', color: !vistaGrid ? 'white' : '#6B7280', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <AlignJustify size={15} />
            </button>
            <button onClick={() => setVistaGrid(true)} title="Vista mosaico"
              style={{ padding: '7px 11px', background: vistaGrid ? '#0A66C2' : 'white', color: vistaGrid ? 'white' : '#6B7280', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <LayoutGrid size={15} />
            </button>
          </div>
          <button onClick={() => setModal('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre o clave…" style={{ ...inp, paddingLeft: 32 }} />
        </div>
        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} style={{ ...inp, width: 'auto', background: 'white' }}>
          <option value="Todas">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} />
          Solo activos
        </label>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            <Package size={36} style={{ marginBottom: 12, opacity: .3 }} />
            <div>{lista.length === 0 ? 'Agrega el primer producto con el botón de arriba' : 'Sin resultados para esta búsqueda'}</div>
          </div>
        ) : vistaGrid ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, padding: 16, background: '#F8FAFC' }}>
            {filtrados.map(p => (
              <TarjetaProducto key={p.id} p={p} onImagen={aplicarImagen} onEditar={setModal} />
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {['', 'Producto', 'Clave', 'Categoría', 'Unidad', ''].map((h, i) => (
                  <th key={i} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', opacity: p.activo ? 1 : .5 }}>
                  <td style={{ padding: '8px 14px', width: 56 }}>
                    <LogoEditable
                      prefijo="productos" tabla="cat_productos" columna="imagen_url"
                      registroId={p.id} url={p.imagen_url} nombre={p.nombre}
                      size={40} redondo={false} onSubido={url => aplicarImagen(p.id, url)}
                    />
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 13.5, color: '#111827' }}>{p.nombre}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{p.clave || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{p.categoria || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>{p.unidad || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={() => setModal(p)} title="Editar" style={{ padding: '5px 8px', background: '#EFF6FF', color: '#0A66C2', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ProductoModal
          producto={modal}
          onClose={() => setModal(null)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
