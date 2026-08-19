import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, X, Search, Pencil, Trash2, ChevronDown, ChevronRight, AlertTriangle, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import TicketModal from '../components/ui/TicketModal'

const fmt = (n) => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

const GRUPO_COLOR = {
  'Ferretería y materiales': '#0A66C2', 'Limpieza e higiene': '#057642',
  'Papelería y oficina': '#E8A020', 'Electricidad': '#F59E0B',
  'Plomería': '#3B82F6', 'Herramienta y equipo': '#6366F1',
  'Servicios externos': '#8B5CF6', 'Vending / Reabasto': '#EC4899',
  'Combustible': '#EF4444', 'Seguridad': '#B24020',
  'Alimentación': '#10B981', 'Otros': '#6B7280',
}

export default function GastosOperativos() {
  useModuleAudit('GASTOS_OPERATIVOS')
  const [gastos, setGastos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('Todos')
  const [modal, setModal]         = useState(null) // null | 'nuevo' | gasto
  const [expanded, setExpanded]   = useState(null)
  const [detalle, setDetalle]     = useState({})

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gastos_operativos')
      .select('*, cat_proveedores(nombre, categoria)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    setGastos(data || [])
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {gruposPresentes.map(g => {
            const color = g === 'Todos' ? '#6B7280' : (GRUPO_COLOR[g] || '#6B7280')
            const active = filtroGrupo === g
            return (
              <button key={g} onClick={() => setFiltroGrupo(g)} style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${color}`, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: active ? color : 'white', color: active ? 'white' : color }}>
                {g}
              </button>
            )
          })}
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 15, color: '#1A3C5E' }}>{fmt(totalFiltrado)}</div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
            <Receipt size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div>Sin gastos. Usa "+ Nuevo ticket" para agregar.</div>
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
                const isOpen   = expanded === g.id
                const lineas   = detalle[g.id] || []
                const sumaD    = lineas.reduce((a, l) => a + parseFloat(l.subtotal || 0), 0)
                const cuadra   = !g.ticket_total || lineas.length === 0 || Math.abs(sumaD - parseFloat(g.ticket_total)) < 0.02
                const color    = GRUPO_COLOR[g.grupo_gasto] || '#6B7280'
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
                        {lineas.length > 0
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: cuadra ? '#057642' : '#B24020', fontWeight: 700 }}>
                              {cuadra ? <Check size={13} /> : <AlertTriangle size={13} />} {lineas.length} líneas
                            </span>
                          : <span style={{ fontSize: 12, color: '#9CA3AF' }}>Sin detalle</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={e => { e.stopPropagation(); setModal(g) }} style={{ padding: '4px 8px', background: '#EFF6FF', color: '#0A66C2', border: 'none', borderRadius: 5, cursor: 'pointer' }}><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); eliminar(g) }} style={{ padding: '4px 8px', background: '#FEE2E2', color: '#B24020', border: 'none', borderRadius: 5, cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={g.id + '-det'} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td colSpan={8} style={{ padding: '0 12px 12px 32px', background: '#F0FDF4' }}>
                          {lineas.length === 0
                            ? <div style={{ fontSize: 13, color: '#6B7280', padding: '8px 0' }}>Sin detalle — edita para agregar</div>
                            : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                  <tr>{['Producto', 'Categoría', 'Cant.', 'Precio unit.', 'Subtotal'].map(h => (
                                    <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                  ))}</tr>
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
                                    <td colSpan={4} style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right' }}>Total detalle:</td>
                                    <td style={{ padding: '6px 8px', fontWeight: 800, color: cuadra ? '#057642' : '#B24020' }}>{fmt(sumaD)}</td>
                                  </tr>
                                </tbody>
                              </table>
                          }
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
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); setDetalle({}); cargar() }}
        />
      )}
    </div>
  )
}
