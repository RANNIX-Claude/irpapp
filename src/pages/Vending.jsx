import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Plus, ChevronLeft, ChevronRight, X, Edit2, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }
function fmtN(n) { return (parseFloat(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 }) }

const CATEGORIAS = { snack: 'Snack', bebida: 'Bebida', otro: 'Otro' }

function semanaActual(offset = 0) {
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
    onSaved(); onClose()
  }

  const inputStyle = {
    width: '72px', textAlign: 'center',
    border: '1.5px solid var(--border)', borderRadius: '6px',
    padding: '4px 6px', fontSize: '13px', fontFamily: 'inherit',
    background: 'var(--white)', color: 'var(--text)',
  }
  const semInvColor = (s) => {
    if (s === null) return 'var(--muted)'
    if (s <= 1) return 'var(--red)'
    if (s <= 2) return 'var(--gold)'
    return 'var(--green)'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: '14px', width: '100%', maxWidth: '920px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'var(--accent)', borderRadius: '14px 14px 0 0' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'white' }}>Captura Semanal — Vending</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>{semana.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto', padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Producto', 'Compras', 'Inventario', 'V.Unid', 'Venta $$', 'Utilidad', 'Sem.Inv.', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Producto' ? 'left' : 'center', fontSize: '10px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid var(--border)', background: 'var(--accent-light)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.producto_nombre} style={{ background: r.status === 'BAJA' ? '#FFF3E0' : i % 2 === 0 ? 'white' : '#FAFAFA', opacity: r.status === 'BAJA' ? 0.65 : 1 }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{r.producto_nombre}</td>
                  {['compras_unidades', 'inventario_unidades', 'ventas_unidades'].map(k => (
                    <td key={k} style={{ padding: '6px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                      <input type="number" value={r[k]} onChange={e => set(i, k, e.target.value)} style={inputStyle} />
                    </td>
                  ))}
                  {['ventas_monto', 'utilidad_semana'].map(k => (
                    <td key={k} style={{ padding: '6px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                      <input type="number" step="0.01" value={r[k]} onChange={e => set(i, k, e.target.value)} style={{ ...inputStyle, width: '84px' }} />
                    </td>
                  ))}
                  <td style={{ padding: '6px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                    <input type="number" step="0.01" value={r.semanas_inventario ?? ''} onChange={e => set(i, 'semanas_inventario', e.target.value)}
                      style={{ ...inputStyle, color: semInvColor(r.semanas_inventario ? +r.semanas_inventario : null), fontWeight: 700 }} />
                  </td>
                  <td style={{ padding: '6px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                    <select value={r.status} onChange={e => set(i, 'status', e.target.value)}
                      style={{ border: '1.5px solid var(--border)', borderRadius: '6px', padding: '4px 6px', fontSize: '11px', fontWeight: 700, background: 'var(--white)', color: 'var(--text)' }}>
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="BAJA">BAJA</option>
                      <option value="PAUSADO">PAUSADO</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--accent-light)', fontWeight: 800 }}>
                <td style={{ padding: '10px', color: 'var(--accent-dark)', fontSize: '12px', fontWeight: 900 }}>TOTAL</td>
                <td style={{ textAlign: 'center', padding: '10px', fontVariantNumeric: 'tabular-nums' }}>{rows.reduce((s, r) => s + (+r.compras_unidades || 0), 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px', fontVariantNumeric: 'tabular-nums' }}>{rows.reduce((s, r) => s + (+r.inventario_unidades || 0), 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px', fontVariantNumeric: 'tabular-nums' }}>{rows.reduce((s, r) => s + (+r.ventas_unidades || 0), 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{fmt(rows.reduce((s, r) => s + (+r.ventas_monto || 0), 0))}</td>
                <td style={{ textAlign: 'center', padding: '10px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{fmt(rows.reduce((s, r) => s + (+r.utilidad_semana || 0), 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '8px', background: guardando ? 'var(--muted)' : 'var(--accent)', color: 'white', cursor: guardando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700 }}>
            <Save size={15} />
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

  const fieldInput = { width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Nuevo Producto</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[['nombre', 'Nombre del producto', 'text'], ['precio_venta', 'Precio de venta (MXN)', 'number'], ['precio_costo', 'Precio de costo (MXN)', 'number']].map(([k, label, type]) => (
            <div key={k} className="field">
              <label>{label}</label>
              <input type={type} value={form[k]} onChange={set(k)} step={type === 'number' ? '0.01' : undefined} style={fieldInput} />
            </div>
          ))}
          <div className="field">
            <label>Categoría</label>
            <select value={form.categoria} onChange={set('categoria')} style={fieldInput}>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Notas</label>
            <input type="text" value={form.notas} onChange={set('notas')} style={fieldInput} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '8px', background: 'var(--accent)', color: 'white', cursor: guardando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando…' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tabla de inventario semanal ────────────────────────────────────────────
function TablaInventario({ datos, total }) {
  const semInvStyle = (s) => {
    if (s === null) return { color: 'var(--muted)' }
    if (s <= 1) return { color: 'var(--red)', fontWeight: 800 }
    if (s <= 2) return { color: 'var(--gold)', fontWeight: 700 }
    return { color: 'var(--green)', fontWeight: 600 }
  }
  const statusBadge = (s) => {
    if (s === 'BAJA') return { background: '#FFF3E0', color: '#E65100' }
    if (s === 'PAUSADO') return { background: '#FFF8E1', color: '#F59E0B' }
    return { background: '#E8F5E9', color: '#1B5E20' }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['Producto', 'Compras', 'Inventario', 'V. Unid', 'Venta $$', 'Utilidad', 'Sem. Inv.', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Producto' ? 'left' : 'right', fontSize: '10px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((r, i) => (
            <tr key={r.id || r.producto_nombre} style={{ background: r.status === 'BAJA' ? '#FFF8F0' : i % 2 === 0 ? 'white' : '#FAFAFA', transition: 'background .1s' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{r.producto_nombre}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border)', color: r.compras_unidades > 0 ? 'var(--text)' : 'var(--border)' }}>
                {r.compras_unidades > 0 ? r.compras_unidades : '—'}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{r.inventario_unidades}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{r.ventas_unidades}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border)' }}>{fmt(r.ventas_monto)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--green)', borderBottom: '1px solid var(--border)' }}>{fmt(r.utilidad_semana)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border)', ...semInvStyle(r.semanas_inventario) }}>
                {r.semanas_inventario != null ? fmtN(r.semanas_inventario) : '—'}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', ...statusBadge(r.status) }}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr style={{ background: 'var(--accent-light)', fontWeight: 800, borderTop: '2px solid var(--border)' }}>
              <td style={{ padding: '10px 12px', color: 'var(--accent-dark)', fontWeight: 900, fontSize: '12px' }}>TOTAL</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{total.compras}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{total.inventario}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>{total.ventas_u}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{fmt(total.ventas_m)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--green)' }}>{fmt(total.utilidad)}</td>
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
  const [semana, setSemana] = useState(semanaActual(0))
  const [datos, setDatos] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCaptura, setShowCaptura] = useState(false)
  const [showProducto, setShowProducto] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { setSemana(semanaActual(semOffset)) }, [semOffset])

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

  const tabStyle = (k) => ({
    padding: '12px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    color: tab === k ? 'var(--accent)' : 'var(--muted)',
    background: 'none', border: 'none', borderBottom: tab === k ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: '-1px', transition: 'color .15s',
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingBag size={24} color="var(--accent)" />
              Vending Machine
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Control de inventario y ventas</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowProducto(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              <Plus size={15} /> Producto
            </button>
            <button onClick={() => setShowCaptura(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: 'none', borderRadius: '8px', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
              <Edit2 size={15} /> Capturar semana
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', marginBottom: '20px' }}>
        {[['semanal', 'Control Semanal'], ['catalogo', 'Catálogo']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={tabStyle(k)}>{l}</button>
        ))}
      </div>

      {/* ── Tab: Control Semanal ── */}
      {tab === 'semanal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Navegador semana */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setSemOffset(o => o - 1)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ flex: 1, textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{semana.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'monospace' }}>{semana.ini} → {semana.fin}</div>
            </div>
            <button onClick={() => setSemOffset(o => o + 1)} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* KPIs */}
          {total && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Ventas', value: fmt(total.ventas_m), sub: total.ventas_u + ' unidades', color: 'var(--accent)' },
                { label: 'Utilidad', value: fmt(total.utilidad), sub: total.ventas_m > 0 ? ((total.utilidad / total.ventas_m) * 100).toFixed(1) + '% margen' : '—', color: 'var(--green)' },
                { label: 'Inventario', value: total.inventario, sub: total.compras + ' comprados', color: 'var(--text)' },
                { label: 'Alertas', value: stocBajo, sub: 'Stock <1 sem · ' + bajas + ' en baja', color: stocBajo > 0 ? 'var(--red)' : 'var(--muted)' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', boxShadow: 'var(--card-sh)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Alerta stock bajo */}
          {stocBajo > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#FFF8E1', border: '1px solid #F59E0B', borderRadius: '8px', fontSize: '13px', color: '#7B4100' }}>
              <AlertTriangle size={16} color="#F59E0B" />
              <span><strong>Stock bajo:</strong> {datos.filter(r => r.semanas_inventario !== null && r.semanas_inventario <= 1).map(r => r.producto_nombre).join(', ')} — menos de 1 semana de inventario</span>
            </div>
          )}

          {/* Tabla principal */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--card-sh)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>Cargando…</div>
            ) : datos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
                <ShoppingBag size={40} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>Sin datos para esta semana</div>
                <button onClick={() => setShowCaptura(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                  Capturar ahora →
                </button>
              </div>
            ) : (
              <TablaInventario datos={datos} total={total} />
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Catálogo ── */}
      {tab === 'catalogo' && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--card-sh)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Producto', 'Categoría', 'Precio Venta', 'Precio Costo', 'Margen', 'Estado', 'Notas'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: ['Precio Venta', 'Precio Costo', 'Margen'].includes(h) ? 'right' : 'left', fontSize: '10px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid var(--border)', background: 'var(--accent-light)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => {
                const margen = p.precio_venta && p.precio_costo
                  ? ((p.precio_venta - p.precio_costo) / p.precio_venta * 100).toFixed(0)
                  : null
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{p.nombre}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent-dark)', padding: '3px 9px', borderRadius: '20px' }}>
                        {p.categoria || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid var(--border)' }}>{fmt(p.precio_venta)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{p.precio_costo ? fmt(p.precio_costo) : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--green)', borderBottom: '1px solid var(--border)' }}>{margen ? margen + '%' : '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', background: p.activo ? '#E8F5E9' : '#FFF3E0', color: p.activo ? '#1B5E20' : '#E65100' }}>
                        {p.activo ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '11px', borderBottom: '1px solid var(--border)' }}>{p.notas || '—'}</td>
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
