import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag, Plus, ChevronLeft, ChevronRight, TrendingUp,
  DollarSign, PackageCheck, X, Edit2, Save, AlertTriangle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }
function fmtN(n) { return (parseFloat(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 }) }

const CATEGORIAS = { snack: 'Snack', bebida: 'Bebida', otro: 'Otro' }

// ── Semana helpers ─────────────────────────────────────────────────────────
function semanaDeJulio(offset = 0) {
  const hoy = new Date()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) + offset * 7)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return {
    ini: lunes.toISOString().split('T')[0],
    fin: domingo.toISOString().split('T')[0],
    label: `${lunes.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} – ${domingo.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`,
  }
}

// ── Modal captura semanal ──────────────────────────────────────────────────
function CapturaModal({ semana, productos, onClose, onSaved }) {
  const [rows, setRows] = useState([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vending_inventario_semanal')
        .select('*')
        .eq('fecha_inicio', semana.ini)
      const existentes = {}
      ;(data || []).forEach(r => { existentes[r.producto_nombre] = r })
      setRows(productos.map(p => existentes[p.nombre] ? { ...existentes[p.nombre], _dirty: false } : {
        producto_nombre: p.nombre, producto_id: p.id,
        compras_unidades: 0, inventario_unidades: 0,
        ventas_unidades: 0, ventas_monto: 0, utilidad_semana: 0,
        semanas_inventario: null, status: p.activo ? 'ACTIVO' : 'BAJA', notas: '',
        _dirty: false,
      }))
    }
    load()
  }, [semana, productos])

  const set = (i, k, v) => setRows(prev => prev.map((r, j) => j === i ? { ...r, [k]: v, _dirty: true } : r))

  const guardar = async () => {
    setGuardando(true)
    const dirty = rows.filter(r => r._dirty)
    if (!dirty.length) { toast('Sin cambios'); setGuardando(false); return }
    const { error } = await supabase.from('vending_inventario_semanal').upsert(
      dirty.map(r => ({
        fecha_inicio: semana.ini, fecha_fin: semana.fin,
        anio: new Date(semana.ini).getFullYear(),
        semana_num: Math.ceil((new Date(semana.ini) - new Date(new Date(semana.ini).getFullYear(), 0, 1)) / 604800000) + 1,
        producto_id: r.producto_id, producto_nombre: r.producto_nombre,
        compras_unidades: +r.compras_unidades || 0,
        inventario_unidades: +r.inventario_unidades || 0,
        ventas_unidades: +r.ventas_unidades || 0,
        ventas_monto: +r.ventas_monto || 0,
        utilidad_semana: +r.utilidad_semana || 0,
        semanas_inventario: r.semanas_inventario ? +r.semanas_inventario : null,
        status: r.status, notas: r.notas || null,
      })),
      { onConflict: 'fecha_inicio,producto_nombre' }
    )
    setGuardando(false)
    if (error) return toast.error(error.message)
    toast.success('Semana guardada')
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-auto py-8">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-5xl mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Captura Semanal — Vending</h2>
            <p className="text-sm text-gray-500">{semana.label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={18} /></button>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="pb-2 pr-3 min-w-[140px]">Producto</th>
                <th className="pb-2 px-2 text-center w-20">Compras</th>
                <th className="pb-2 px-2 text-center w-22">Inventario</th>
                <th className="pb-2 px-2 text-center w-20">V.Unid</th>
                <th className="pb-2 px-2 text-center w-24">Venta $$</th>
                <th className="pb-2 px-2 text-center w-24">Utilidad</th>
                <th className="pb-2 px-2 text-center w-24">Sem.Inv.</th>
                <th className="pb-2 px-2 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.producto_nombre}
                  className={`border-t dark:border-gray-700 ${r.status === 'BAJA' ? 'opacity-50 bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                  <td className="py-1.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{r.producto_nombre}</td>
                  {['compras_unidades','inventario_unidades','ventas_unidades'].map(k => (
                    <td key={k} className="px-2">
                      <input type="number" value={r[k]} onChange={e => set(i, k, e.target.value)}
                        className="w-16 text-center border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                    </td>
                  ))}
                  {['ventas_monto','utilidad_semana'].map(k => (
                    <td key={k} className="px-2">
                      <input type="number" step="0.01" value={r[k]} onChange={e => set(i, k, e.target.value)}
                        className="w-20 text-center border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                    </td>
                  ))}
                  <td className="px-2">
                    <input type="number" step="0.01" value={r.semanas_inventario ?? ''} onChange={e => set(i, 'semanas_inventario', e.target.value)}
                      className="w-16 text-center border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                  </td>
                  <td className="px-2">
                    <select value={r.status} onChange={e => set(i, 'status', e.target.value)}
                      className="text-xs border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="BAJA">BAJA</option>
                      <option value="PAUSADO">PAUSADO</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 font-bold text-gray-700 dark:text-gray-300">
                <td className="py-2 pr-3">TOTAL</td>
                <td className="px-2 text-center">{rows.reduce((s, r) => s + (+r.compras_unidades || 0), 0)}</td>
                <td className="px-2 text-center">{rows.reduce((s, r) => s + (+r.inventario_unidades || 0), 0)}</td>
                <td className="px-2 text-center">{rows.reduce((s, r) => s + (+r.ventas_unidades || 0), 0)}</td>
                <td className="px-2 text-center">{fmt(rows.reduce((s, r) => s + (+r.ventas_monto || 0), 0))}</td>
                <td className="px-2 text-center">{fmt(rows.reduce((s, r) => s + (+r.utilidad_semana || 0), 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold"
            style={{ backgroundColor: '#0A66C2' }}>
            <Save size={16} />
            {guardando ? 'Guardando…' : 'Guardar semana'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal agregar producto ─────────────────────────────────────────────────
function ProductoModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', precio_venta: '', precio_costo: '', categoria: 'snack', notas: '' })
  const [guardando, setGuardando] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const guardar = async () => {
    if (!form.nombre || !form.precio_venta) return toast.error('Nombre y precio de venta son obligatorios')
    setGuardando(true)
    const { error } = await supabase.from('cat_productos_vending').insert({
      nombre: form.nombre.trim(),
      precio_venta: parseFloat(form.precio_venta),
      precio_costo: form.precio_costo ? parseFloat(form.precio_costo) : null,
      categoria: form.categoria,
      notas: form.notas || null,
    })
    setGuardando(false)
    if (error) return toast.error(error.message)
    toast.success('Producto agregado')
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md mx-4 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nuevo Producto</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {[['nombre','Nombre del producto','text'],['precio_venta','Precio de venta (MXN)','number'],['precio_costo','Precio de costo (MXN)','number']].map(([k, label, type]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input type={type} value={form[k]} onChange={set(k)} step={type==='number'?'0.01':undefined}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
            <select value={form.categoria} onChange={set('categoria')}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              {Object.entries(CATEGORIAS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <input type="text" value={form.notas} onChange={set('notas')}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg dark:border-gray-600 text-gray-600 dark:text-gray-400">Cancelar</button>
          <button onClick={guardar} disabled={guardando}
            className="px-5 py-2 rounded-lg text-white font-semibold" style={{ backgroundColor: '#0A66C2' }}>
            {guardando ? 'Guardando…' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tabla de inventario semanal ────────────────────────────────────────────
function TablaInventario({ datos, total }) {
  const semInvColor = (s) => {
    if (s === null) return ''
    if (s <= 1) return 'text-red-600 font-bold'
    if (s <= 2) return 'text-yellow-600 font-semibold'
    return 'text-green-700'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b dark:border-gray-700">
            <th className="pb-3 pr-3 min-w-[140px]">Producto</th>
            <th className="pb-3 px-3 text-center">Compras</th>
            <th className="pb-3 px-3 text-center">Inventario</th>
            <th className="pb-3 px-3 text-center">V. Unid</th>
            <th className="pb-3 px-3 text-right">Venta $$</th>
            <th className="pb-3 px-3 text-right">Utilidad</th>
            <th className="pb-3 px-3 text-center">Sem. Inv.</th>
            <th className="pb-3 px-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {datos.map(r => (
            <tr key={r.id || r.producto_nombre}
              className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors
                ${r.status === 'BAJA' ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
              <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{r.producto_nombre}</td>
              <td className="py-2.5 px-3 text-center tabular-nums text-gray-600 dark:text-gray-400">
                {r.compras_unidades > 0 ? r.compras_unidades : <span className="text-gray-300">—</span>}
              </td>
              <td className="py-2.5 px-3 text-center tabular-nums font-semibold text-gray-700 dark:text-gray-300">{r.inventario_unidades}</td>
              <td className="py-2.5 px-3 text-center tabular-nums text-gray-600 dark:text-gray-400">{r.ventas_unidades}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{fmt(r.ventas_monto)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-green-700">{fmt(r.utilidad_semana)}</td>
              <td className={`py-2.5 px-3 text-center tabular-nums ${semInvColor(r.semanas_inventario)}`}>
                {r.semanas_inventario != null ? fmtN(r.semanas_inventario) : <span className="text-gray-300">—</span>}
              </td>
              <td className="py-2.5 px-2 text-center">
                {r.status === 'BAJA'
                  ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Baja</span>
                  : r.status === 'PAUSADO'
                  ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pausado</span>
                  : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Activo</span>}
              </td>
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">
              <td className="py-3 pr-3">TOTAL</td>
              <td className="px-3 text-center tabular-nums">{total.compras}</td>
              <td className="px-3 text-center tabular-nums">{total.inventario}</td>
              <td className="px-3 text-center tabular-nums">{total.ventas_u}</td>
              <td className="px-3 text-right tabular-nums">{fmt(total.ventas_m)}</td>
              <td className="px-3 text-right tabular-nums text-green-700">{fmt(total.utilidad)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Vending() {
  useModuleAudit('Vending')
  const [tab, setTab] = useState('semanal')
  const [semOffset, setSemOffset] = useState(0)
  const [semana, setSemana] = useState(semanaDeJulio(0))
  const [datos, setDatos] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCaptura, setShowCaptura] = useState(false)
  const [showProducto, setShowProducto] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { setSemana(semanaDeJulio(semOffset)) }, [semOffset])

  const loadProductos = useCallback(async () => {
    const { data } = await supabase.from('cat_productos_vending').select('*').order('nombre')
    setProductos(data || [])
  }, [])

  const loadDatos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vending_inventario_semanal')
      .select('*')
      .eq('fecha_inicio', semana.ini)
      .order('producto_nombre')
    setDatos(data || [])
    setLoading(false)
  }, [semana.ini])

  useEffect(() => { loadProductos() }, [loadProductos, refreshKey])
  useEffect(() => { loadDatos() }, [loadDatos, refreshKey])

  const total = datos.length ? {
    compras: datos.reduce((s, r) => s + (r.compras_unidades || 0), 0),
    inventario: datos.reduce((s, r) => s + (r.inventario_unidades || 0), 0),
    ventas_u: datos.reduce((s, r) => s + (r.ventas_unidades || 0), 0),
    ventas_m: datos.reduce((s, r) => s + (r.ventas_monto || 0), 0),
    utilidad: datos.reduce((s, r) => s + (r.utilidad_semana || 0), 0),
  } : null

  const bajas = datos.filter(r => r.status === 'BAJA').length
  const stocBajo = datos.filter(r => r.semanas_inventario !== null && r.semanas_inventario <= 1).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={28} style={{ color: '#0A66C2' }} />
            Vending Machine
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Control de inventario y ventas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowProducto(true)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            <Plus size={16} /> Producto
          </button>
          <button onClick={() => setShowCaptura(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: '#0A66C2' }}>
            <Edit2 size={16} /> Capturar semana
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b dark:border-gray-700">
        {[['semanal', 'Control Semanal'], ['catalogo', 'Catálogo']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{l}</button>
        ))}
      </div>

      {/* Semanal tab */}
      {tab === 'semanal' && (
        <div className="space-y-5">
          {/* Navegador de semana */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSemOffset(o => o - 1)}
              className="p-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 text-center">
              <p className="font-semibold text-gray-800 dark:text-white">{semana.label}</p>
              <p className="text-xs text-gray-500">{semana.ini} → {semana.fin}</p>
            </div>
            <button onClick={() => setSemOffset(o => o + 1)}
              className="p-2 border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* KPIs */}
          {total && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Ventas</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: '#0A66C2' }}>{fmt(total.ventas_m)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{total.ventas_u} unidades</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Utilidad</p>
                <p className="text-2xl font-bold tabular-nums text-green-700">{fmt(total.utilidad)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {total.ventas_m > 0 ? ((total.utilidad / total.ventas_m) * 100).toFixed(1) + '% margen' : '—'}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Inventario</p>
                <p className="text-2xl font-bold tabular-nums text-gray-700 dark:text-gray-300">{total.inventario}</p>
                <p className="text-xs text-gray-400 mt-0.5">{total.compras} comprados</p>
              </div>
              <div className={`rounded-xl p-4 shadow-sm border ${stocBajo > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-white dark:bg-gray-900 dark:border-gray-700'}`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Alertas</p>
                <p className={`text-2xl font-bold tabular-nums ${stocBajo > 0 ? 'text-red-600' : 'text-gray-400'}`}>{stocBajo}</p>
                <p className="text-xs text-gray-400 mt-0.5">Stock &lt;1 sem · {bajas} en baja</p>
              </div>
            </div>
          )}

          {/* Alerta productos en baja */}
          {stocBajo > 0 && (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
              <AlertTriangle size={16} />
              {datos.filter(r => r.semanas_inventario !== null && r.semanas_inventario <= 1)
                .map(r => r.producto_nombre).join(', ')} — stock para menos de 1 semana
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Cargando…</div>
            ) : datos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Sin datos para esta semana</p>
                <button onClick={() => setShowCaptura(true)}
                  className="mt-3 text-sm text-blue-600 hover:underline">Capturar ahora →</button>
              </div>
            ) : (
              <TablaInventario datos={datos} total={total} />
            )}
          </div>
        </div>
      )}

      {/* Catálogo tab */}
      {tab === 'catalogo' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="p-4 text-left">Producto</th>
                <th className="p-4 text-center">Categoría</th>
                <th className="p-4 text-right">Precio Venta</th>
                <th className="p-4 text-right">Precio Costo</th>
                <th className="p-4 text-right">Margen</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-left">Notas</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => {
                const margen = p.precio_venta && p.precio_costo
                  ? ((p.precio_venta - p.precio_costo) / p.precio_venta * 100).toFixed(0)
                  : null
                return (
                  <tr key={p.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{p.nombre}</td>
                    <td className="p-4 text-center">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {CATEGORIAS[p.categoria] || p.categoria}
                      </span>
                    </td>
                    <td className="p-4 text-right tabular-nums">{fmt(p.precio_venta)}</td>
                    <td className="p-4 text-right tabular-nums text-gray-500">{p.precio_costo ? fmt(p.precio_costo) : '—'}</td>
                    <td className="p-4 text-right tabular-nums font-semibold text-green-700">{margen ? margen + '%' : '—'}</td>
                    <td className="p-4 text-center">
                      {p.activo
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>
                        : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Baja</span>}
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{p.notas || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {showCaptura && productos.length > 0 && (
        <CapturaModal
          semana={semana}
          productos={productos}
          onClose={() => setShowCaptura(false)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
      {showProducto && (
        <ProductoModal
          onClose={() => setShowProducto(false)}
          onSaved={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
