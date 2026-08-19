import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { Truck, Plus, Search, X, Pencil, Check, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CATEGORIAS = [
  { id: 'VENDING',       label: 'Vending',        color: '#EC4899' },
  { id: 'OPERACION',     label: 'Operación',      color: '#057642' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento',   color: '#E8A020' },
  { id: 'MIXTO',         label: 'Mixto',           color: '#0A66C2' },
]
const catInfo = (id) => CATEGORIAS.find(c => c.id === id) || { label: id || '—', color: '#6B7280' }

function Badge({ cat }) {
  const { label, color } = catInfo(cat)
  return <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color, border: `1px solid ${color}44` }}>{label}</span>
}

const EMPTY = { clave: '', nombre: '', rfc: '', categoria: '', telefono: '', email: '', contacto: '', notas: '' }

function ModalProveedor({ proveedor, onClose, onSaved }) {
  const [form, setForm] = useState(proveedor ? { ...proveedor } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!proveedor?.id

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.clave.trim() || !form.nombre.trim()) { setError('Clave y nombre son obligatorios'); return }
    setSaving(true); setError(null)
    try {
      if (isEdit) {
        const { error: err } = await supabase.from('cat_proveedores').update({ ...form, clave: form.clave.toUpperCase() }).eq('id', proveedor.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('cat_proveedores').insert({ ...form, clave: form.clave.toUpperCase() })
        if (err) throw err
      }
      onSaved()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0A66C2' }}>{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        <form onSubmit={guardar} style={{ padding: 22, display: 'grid', gap: 14 }}>
          {error && <div style={{ padding: '8px 12px', background: '#FEE2E2', color: '#B24020', borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={lbl}>Clave *</label>
              <input value={form.clave} onChange={e => set('clave', e.target.value.toUpperCase())} style={inp} placeholder="DOGO" required />
            </div>
            <div>
              <label style={lbl}>Nombre *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} style={inp} placeholder="Nombre del proveedor" required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>RFC</label>
              <input value={form.rfc || ''} onChange={e => set('rfc', e.target.value.toUpperCase())} style={inp} placeholder="RFC123456789" />
            </div>
            <div>
              <label style={lbl}>Categoría</label>
              <select value={form.categoria || ''} onChange={e => set('categoria', e.target.value)} style={inp}>
                <option value="">— Seleccionar —</option>
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Teléfono</label>
              <input value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} style={inp} placeholder="667-000-0000" />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} style={inp} placeholder="contacto@proveedor.mx" />
            </div>
          </div>
          <div>
            <label style={lbl}>Contacto / Nombre persona</label>
            <input value={form.contacto || ''} onChange={e => set('contacto', e.target.value)} style={inp} placeholder="Nombre del contacto" />
          </div>
          <div>
            <label style={lbl}>Notas</label>
            <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} style={{ ...inp, resize: 'vertical', minHeight: 60 }} placeholder="Observaciones…" />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #E5E7EB' }}>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: saving ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar proveedor'}
            </button>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Proveedores() {
  useModuleAudit('PROVEEDORES')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroCat, setFiltroCat] = useState('Todos')
  const [modal, setModal] = useState(null) // null | 'nuevo' | {proveedor}
  const [expanded, setExpanded] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cat_proveedores').select('*').order('nombre')
    setLista(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (p) => {
    await supabase.from('cat_proveedores').update({ activo: !p.activo }).eq('id', p.id)
    cargar()
  }

  const filtrados = lista.filter(p => {
    const matchQ = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.rfc || '').toLowerCase().includes(search.toLowerCase())
    const matchC = filtroCat === 'Todos' || p.categoria === filtroCat
    return matchQ && matchC
  })

  const kpis = [
    { label: 'Total proveedores', val: lista.length,                                      color: '#0A66C2' },
    { label: 'Activos',           val: lista.filter(p => p.activo).length,               color: '#057642' },
    { label: 'Vending',          val: lista.filter(p => p.categoria === 'VENDING').length, color: '#EC4899' },
    { label: 'Mantenimiento',    val: lista.filter(p => p.categoria === 'MANTENIMIENTO').length, color: '#E8A020' },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={22} color="#0A66C2" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A66C2' }}>Proveedores</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Catálogo compartido: Gastos, Mantenimiento, Vending</p>
          </div>
        </div>
        <button onClick={() => setModal('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={15} /> Nuevo proveedor
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 18px', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre o RFC…" style={{ width: '100%', paddingLeft: 30, padding: '8px 8px 8px 32px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['Todos', ...CATEGORIAS.map(c => c.id)].map(c => (
          <button key={c} onClick={() => setFiltroCat(c)} style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filtroCat === c ? (catInfo(c).color || '#0A66C2') : 'white', color: filtroCat === c ? 'white' : (catInfo(c).color || '#374151'), borderColor: catInfo(c).color || '#E5E7EB' }}>
            {c === 'Todos' ? 'Todos' : catInfo(c).label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            <Truck size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>{lista.length === 0 ? 'Agrega el primer proveedor con el botón +' : 'Sin resultados para esta búsqueda'}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {['Proveedor', 'RFC', 'Categoría', 'Contacto', 'Teléfono', ''].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <>
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', opacity: p.activo ? 1 : 0.5, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.clave}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#6B7280' }}>{p.rfc || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><Badge cat={p.categoria} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{p.contacto || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{p.telefono || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setModal(p)} title="Editar" style={{ padding: '5px 8px', background: '#EFF6FF', color: '#0A66C2', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Pencil size={13} /></button>
                        <button onClick={() => toggleActivo(p)} title={p.activo ? 'Desactivar' : 'Activar'} style={{ padding: '5px 8px', background: p.activo ? '#FEF3C7' : '#D1FAE5', color: p.activo ? '#92400E' : '#065F46', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                          {p.activo ? 'Act' : 'Inact'}
                        </button>
                        {p.notas && (
                          <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ padding: '5px 8px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            <ChevronDown size={13} style={{ transform: expanded === p.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={p.id + '-notes'} style={{ background: '#F9FAFB' }}>
                      <td colSpan={6} style={{ padding: '8px 14px 10px 28px', fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>
                        📝 {p.notas}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ModalProveedor
          proveedor={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}
    </div>
  )
}
