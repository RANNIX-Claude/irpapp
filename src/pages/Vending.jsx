import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Plus, ChevronLeft, ChevronRight, X, Save, AlertTriangle,
  Pencil, Trash2, TrendingUp, Package, ShoppingCart, BarChart2, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// ── Formatters ─────────────────────────────────────────────────────────────
function fmt(n)  { return '$' + (parseFloat(n)||0).toLocaleString('es-MX',{minimumFractionDigits:0}) }
function fmtN(n) { return (parseFloat(n)||0).toLocaleString('es-MX',{maximumFractionDigits:2}) }

// ── Semanas Sáb→Vie (igual que ResumenSemanal) ─────────────────────────────
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function hoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function sabadoDe(iso) {
  const d = new Date(iso + 'T12:00:00')
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 6 ? 0 : dow + 1))
  return d.toISOString().split('T')[0]
}
function labelSemana(ini, fin) {
  const i = new Date(ini + 'T12:00:00'), f = new Date(fin + 'T12:00:00')
  return `Sáb ${i.getDate()}/${MESES[i.getMonth()]} — Vie ${f.getDate()}/${MESES[f.getMonth()]}/${f.getFullYear()}`
}
function generarSemanas() {
  const ORIGEN = '2026-06-27'
  const hoy = new Date(), dow = hoy.getDay()
  const sabHoy = new Date(hoy); sabHoy.setDate(sabHoy.getDate() - (dow === 6 ? 0 : dow + 1))
  const sabHoyIso = `${sabHoy.getFullYear()}-${String(sabHoy.getMonth()+1).padStart(2,'0')}-${String(sabHoy.getDate()).padStart(2,'0')}`
  const limite = addDays(sabHoyIso, 4 * 7)
  const semanas = []
  let cur = ORIGEN
  while (cur <= limite) {
    const fin = addDays(cur, 6)
    semanas.push({ ini: cur, fin, label: labelSemana(cur, fin) })
    cur = addDays(cur, 7)
  }
  return semanas.reverse()
}

// ── Precio compra por unidad ───────────────────────────────────────────────
function precioCostoPorUnidad(p) {
  if (p.unidades_caja && p.costo_caja) return parseFloat(p.costo_caja) / parseInt(p.unidades_caja)
  if (p.precio_proveedor) return parseFloat(p.precio_proveedor)
  return 0
}

// ── Corte semanal automático ───────────────────────────────────────────────
async function checkAndRunCorte(productos, onCorteEjecutado) {
  const hoy = hoyLocal()
  // Buscar semana ABIERTA ya vencida
  const { data: semanas } = await supabase
    .from('vending_semanas')
    .select('id, fecha_inicio, fecha_fin, estado')
    .eq('estado', 'ABIERTA')
    .lte('fecha_fin', hoy)
    .order('fecha_inicio', { ascending: false })

  if (!semanas || semanas.length === 0) return

  for (const sem of semanas) {
    // 1. Obtener snapshot de la semana
    const { data: detalle } = await supabase
      .from('vending_semana_producto')
      .select('*')
      .eq('semana_id', sem.id)

    // 2. Cerrar la semana
    await supabase.from('vending_semanas')
      .update({ estado: 'CERRADA', fecha_corte: new Date().toISOString() })
      .eq('id', sem.id)

    // 3. Crear semana siguiente
    const nuevaIni = addDays(sem.fecha_inicio, 7)
    const nuevaFin = addDays(nuevaIni, 6)

    // Buscar o crear el encabezado de la nueva semana
    let { data: nuevaSem } = await supabase
      .from('vending_semanas')
      .select('id')
      .eq('fecha_inicio', nuevaIni)
      .limit(1)
      .single()

    if (!nuevaSem) {
      const { data: ins } = await supabase.from('vending_semanas').insert({
        semana_label: labelSemana(nuevaIni, nuevaFin),
        fecha_inicio: nuevaIni,
        fecha_fin:    nuevaFin,
        estado:       'ABIERTA',
        producto:     'CORTE_SEMANAL',
        venta_pesos:  0,
        utilidad:     0,
        compras:      0,
        inventario_ini: 0,
        inventario_fin: 0,
        venta_unidades: 0,
        baja:         false,
        es_material:  false,
        residual_pesos: 0,
      }).select('id').single()
      nuevaSem = ins
    }

    if (!nuevaSem) continue

    // 4. Crear vending_semana_producto para la nueva semana (qty_inicial = qty_final anterior)
    const existingMap = {}
    const { data: existingDetalle } = await supabase
      .from('vending_semana_producto')
      .select('producto_id')
      .eq('semana_id', nuevaSem.id)
    ;(existingDetalle || []).forEach(r => { existingMap[r.producto_id] = true })

    const productosActivos = productos.filter(p => p.activo)
    const inserts = productosActivos
      .filter(p => !existingMap[p.id])
      .map(p => {
        const anterior = (detalle || []).find(d => d.producto_id === p.id)
        return {
          semana_id:           nuevaSem.id,
          producto_id:         p.id,
          qty_inicial:         anterior ? (parseFloat(anterior.qty_final) || 0) : 0,
          qty_compras:         0,
          qty_ventas:          0,
          precio_venta_semana:   parseFloat(p.precio_venta) || 0,
          precio_compra_semana:  precioCostoPorUnidad(p),
          importe_ventas:      0,
          importe_compras:     0,
        }
      })

    if (inserts.length > 0) {
      await supabase.from('vending_semana_producto').insert(inserts)
    }

    toast.success(`Corte automático: semana ${sem.fecha_inicio} cerrada. Nueva semana ${nuevaIni} abierta.`)
  }
  if (onCorteEjecutado) onCorteEjecutado()
}

// ── Modal: Registrar Movimiento (COMPRA o VENTA) ───────────────────────────
function ModalMovimiento({ semanaId, semanaIni, semanaFin, productos, productoPresel, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo:           'VENTA',
    producto_id:    productoPresel?.id || '',
    fecha:          hoyLocal(),
    cantidad:       '',
    precio_unitario: productoPresel ? String(parseFloat(productoPresel.precio_venta)||0) : '',
    proveedor:      '',
    nota:           '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => {
    const v = e.target.value
    setForm(f => {
      const next = { ...f, [k]: v }
      // Auto-rellenar precio según tipo y producto seleccionado
      if (k === 'tipo' || k === 'producto_id') {
        const prod = productos.find(p => p.id === (k === 'producto_id' ? v : f.producto_id))
        if (prod) {
          next.precio_unitario = String(
            (k === 'tipo' ? v : f.tipo) === 'VENTA'
              ? parseFloat(prod.precio_venta) || 0
              : precioCostoPorUnidad(prod)
          )
        }
      }
      return next
    })
  }

  const guardar = async () => {
    if (!form.producto_id || !form.cantidad || parseFloat(form.cantidad) <= 0)
      return toast.error('Selecciona producto y cantidad')
    setSaving(true)
    try {
      const prod = productos.find(p => p.id === form.producto_id)
      const cant = parseFloat(form.cantidad)
      const precio = parseFloat(form.precio_unitario) || 0

      // 1. Buscar o crear vending_semana_producto
      let { data: sp } = await supabase
        .from('vending_semana_producto')
        .select('*')
        .eq('semana_id', semanaId)
        .eq('producto_id', form.producto_id)
        .single()

      if (!sp) {
        const { data: ins } = await supabase.from('vending_semana_producto').insert({
          semana_id:           semanaId,
          producto_id:         form.producto_id,
          qty_inicial:         0,
          qty_compras:         0,
          qty_ventas:          0,
          precio_venta_semana:   parseFloat(prod?.precio_venta) || 0,
          precio_compra_semana:  precioCostoPorUnidad(prod),
          importe_ventas:      0,
          importe_compras:     0,
        }).select('*').single()
        sp = ins
      }

      if (!sp) throw new Error('No se pudo obtener el registro de semana-producto')

      // 2. Insertar movimiento
      const { error: errMov } = await supabase.from('vending_movimientos').insert({
        semana_id:         semanaId,
        producto_id:       form.producto_id,
        semana_producto_id: sp.id,
        fecha:             form.fecha,
        tipo:              form.tipo,
        cantidad:          cant,
        precio_unitario:   precio,
        proveedor:         form.tipo === 'COMPRA' ? (form.proveedor || null) : null,
        nota:              form.nota || null,
      })
      if (errMov) throw errMov

      // 3. Actualizar snapshot
      const nuevoQtyCompras  = (parseFloat(sp.qty_compras) || 0)  + (form.tipo === 'COMPRA' ? cant : 0)
      const nuevoQtyVentas   = (parseFloat(sp.qty_ventas) || 0)   + (form.tipo === 'VENTA'  ? cant : 0)
      const nuevoImpCompras  = (parseFloat(sp.importe_compras)||0) + (form.tipo === 'COMPRA' ? cant * precio : 0)
      const nuevoImpVentas   = (parseFloat(sp.importe_ventas) ||0) + (form.tipo === 'VENTA'  ? cant * precio : 0)

      await supabase.from('vending_semana_producto').update({
        qty_compras:    nuevoQtyCompras,
        qty_ventas:     nuevoQtyVentas,
        importe_compras: nuevoImpCompras,
        importe_ventas:  nuevoImpVentas,
        precio_venta_semana:  parseFloat(prod?.precio_venta) || sp.precio_venta_semana,
        precio_compra_semana: form.tipo === 'COMPRA' ? precio : sp.precio_compra_semana,
      }).eq('id', sp.id)

      toast.success(`${form.tipo === 'COMPRA' ? '📦 Compra' : '🛒 Venta'} registrada`)
      onSaved(); onClose()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const prod = productos.find(p => p.id === form.producto_id)
  const inputS = { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:'14px', width:'100%', maxWidth:'440px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'16px 20px', background: form.tipo==='COMPRA' ? '#1A3C5E' : '#057642', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ color:'white', fontWeight:800, fontSize:'15px' }}>
            {form.tipo === 'COMPRA' ? '📦 Registrar Compra' : '🛒 Registrar Venta'}
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color:'white' }}><X size={16} /></button>
        </div>

        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Tipo */}
          <div style={{ display:'flex', gap:'8px' }}>
            {['COMPRA','VENTA'].map(t => (
              <button key={t} onClick={() => set('tipo')({ target:{ value:t } })} style={{
                flex:1, padding:'10px', border:'2px solid', borderRadius:'8px', fontWeight:700, fontSize:'13px', cursor:'pointer',
                borderColor: form.tipo===t ? (t==='COMPRA'?'#1A3C5E':'#057642') : '#E5E7EB',
                background: form.tipo===t ? (t==='COMPRA'?'#1A3C5E':'#057642') : 'white',
                color: form.tipo===t ? 'white' : '#6B7280',
              }}>
                {t === 'COMPRA' ? '📦 Compra' : '🛒 Venta'}
              </button>
            ))}
          </div>

          {/* Producto */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.05em' }}>Producto</label>
            <select value={form.producto_id} onChange={set('producto_id')} style={{ ...inputS, marginTop:'4px' }}>
              <option value="">— Seleccionar —</option>
              {productos.filter(p => p.activo).map(p => (
                <option key={p.id} value={p.id}>{p.producto}</option>
              ))}
            </select>
            {prod && (
              <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'4px' }}>
                Precio venta: {fmt(prod.precio_venta)} · Costo/u: {fmt(precioCostoPorUnidad(prod))}
                {prod.unidades_caja ? ` · ${prod.unidades_caja} uds/caja` : ''}
              </div>
            )}
          </div>

          {/* Fecha + Cantidad */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.05em' }}>Fecha</label>
              <input type="date" value={form.fecha} onChange={set('fecha')} style={{ ...inputS, marginTop:'4px' }} />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.05em' }}>Cantidad (uds)</label>
              <input type="number" min="1" step="1" value={form.cantidad} onChange={set('cantidad')} placeholder="0" style={{ ...inputS, marginTop:'4px' }} />
            </div>
          </div>

          {/* Precio */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.05em' }}>
              {form.tipo === 'COMPRA' ? 'Precio compra / unidad' : 'Precio venta / unidad'}
            </label>
            <input type="number" step="0.01" value={form.precio_unitario} onChange={set('precio_unitario')} style={{ ...inputS, marginTop:'4px' }} />
            {form.cantidad && form.precio_unitario && (
              <div style={{ fontSize:'12px', color: form.tipo==='COMPRA'?'#1A3C5E':'#057642', fontWeight:700, marginTop:'4px' }}>
                Total: {fmt(parseFloat(form.cantidad||0) * parseFloat(form.precio_unitario||0))}
              </div>
            )}
          </div>

          {/* Proveedor (solo compras) */}
          {form.tipo === 'COMPRA' && (
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.05em' }}>Proveedor</label>
              <input type="text" value={form.proveedor} onChange={set('proveedor')} placeholder="Nombre del proveedor" style={{ ...inputS, marginTop:'4px' }} />
            </div>
          )}

          {/* Nota */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.05em' }}>Nota (opcional)</label>
            <input type="text" value={form.nota} onChange={set('nota')} style={{ ...inputS, marginTop:'4px' }} />
          </div>
        </div>

        <div style={{ padding:'14px 20px', borderTop:'1px solid #E5E7EB', display:'flex', gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', border:'1.5px solid #E5E7EB', borderRadius:'8px', background:'white', cursor:'pointer', fontSize:'13px', fontWeight:600, color:'#6B7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2, padding:'10px', border:'none', borderRadius:'8px', background: form.tipo==='COMPRA'?'#1A3C5E':'#057642', color:'white', cursor: saving?'not-allowed':'pointer', fontSize:'13px', fontWeight:700, opacity: saving?0.7:1 }}>
            {saving ? 'Guardando…' : `Guardar ${form.tipo}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Editar producto del catálogo ────────────────────────────────────
function ModalProducto({ producto, onClose, onSaved }) {
  const [form, setForm] = useState({
    producto:        producto?.producto || '',
    costo_caja:      producto?.costo_caja != null ? String(producto.costo_caja) : '',
    unidades_caja:   producto?.unidades_caja != null ? String(producto.unidades_caja) : '',
    precio_venta:    producto?.precio_venta != null ? String(producto.precio_venta) : '',
    proveedor:       producto?.proveedor || '',
    descripcion:     producto?.descripcion || '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const costoU = form.costo_caja && form.unidades_caja
    ? (parseFloat(form.costo_caja) / parseInt(form.unidades_caja)).toFixed(2) : null
  const margen = form.precio_venta && costoU
    ? (((parseFloat(form.precio_venta) - parseFloat(costoU)) / parseFloat(form.precio_venta)) * 100).toFixed(0) : null
  const utilidad = form.precio_venta && costoU
    ? parseFloat(form.precio_venta) - parseFloat(costoU) : null

  const guardar = async () => {
    if (!form.producto || !form.precio_venta) return toast.error('Nombre y precio de venta requeridos')
    setSaving(true)
    const payload = {
      producto:      form.producto.trim(),
      costo_caja:    form.costo_caja    ? parseFloat(form.costo_caja)    : null,
      unidades_caja: form.unidades_caja ? parseInt(form.unidades_caja)   : null,
      precio_venta:  parseFloat(form.precio_venta),
      utilidad_por_pieza: utilidad,
      proveedor:     form.proveedor || null,
      descripcion:   form.descripcion || null,
    }
    let error
    if (producto) {
      ;({ error } = await supabase.from('vending_productos').update(payload).eq('id', producto.id))
    } else {
      ;({ error } = await supabase.from('vending_productos').insert({ ...payload, activo: true }))
    }
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(producto ? 'Producto actualizado' : 'Producto agregado')
    onSaved(); onClose()
  }

  const inputS = { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', fontSize:'13px', boxSizing:'border-box' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:'14px', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', padding:'24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
          <h2 style={{ margin:0, fontSize:'16px', fontWeight:800 }}>{producto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>Nombre del producto *</label>
            <input type="text" value={form.producto} onChange={set('producto')} style={{ ...inputS, marginTop:'4px' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>Costo / caja</label>
              <input type="number" step="0.01" value={form.costo_caja} onChange={set('costo_caja')} style={{ ...inputS, marginTop:'4px' }} />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>Uds / caja</label>
              <input type="number" step="1" value={form.unidades_caja} onChange={set('unidades_caja')} style={{ ...inputS, marginTop:'4px' }} />
            </div>
          </div>
          {costoU && (
            <div style={{ fontSize:'11px', color:'#6B7280', background:'#F9FAFB', padding:'8px 12px', borderRadius:'6px' }}>
              Costo por unidad: <strong>{fmt(costoU)}</strong>
            </div>
          )}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>Precio venta / unidad *</label>
            <input type="number" step="0.01" value={form.precio_venta} onChange={set('precio_venta')} style={{ ...inputS, marginTop:'4px' }} />
          </div>
          {margen && (
            <div style={{ fontSize:'12px', color:'#057642', fontWeight:700, background:'#F0FDF4', padding:'8px 12px', borderRadius:'6px' }}>
              Utilidad por pieza: {fmt(utilidad)} · Margen: {margen}%
            </div>
          )}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>Proveedor</label>
            <input type="text" value={form.proveedor} onChange={set('proveedor')} style={{ ...inputS, marginTop:'4px' }} />
          </div>
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>Descripción / nota</label>
            <input type="text" value={form.descripcion} onChange={set('descripcion')} style={{ ...inputS, marginTop:'4px' }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:'10px', marginTop:'18px' }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', border:'1.5px solid #E5E7EB', borderRadius:'8px', background:'white', cursor:'pointer', fontSize:'13px', fontWeight:600, color:'#6B7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{ flex:2, padding:'10px', border:'none', borderRadius:'8px', background:'var(--color-primary)', color:'white', cursor: saving?'not-allowed':'pointer', fontSize:'13px', fontWeight:700, opacity: saving?0.7:1 }}>
            {saving ? 'Guardando…' : producto ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function Vending() {
  useModuleAudit('Vending')
  const semanas    = generarSemanas()
  const sabActual  = sabadoDe(hoyLocal())
  const defaultIdx = semanas.findIndex(s => s.ini === sabActual)
  const [selIdx, setSelIdx]   = useState(defaultIdx >= 0 ? defaultIdx : 0)
  const [tab, setTab]         = useState('semanal')
  const [productos, setProductos] = useState([])
  const [semanaDb, setSemanaDb]   = useState(null)   // row de vending_semanas
  const [detalle, setDetalle]     = useState([])      // vending_semana_producto
  const [movs, setMovs]           = useState([])      // vending_movimientos
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)    // null | 'mov' | 'prod' | 'editProd'
  const [prodPresel, setProdPresel]   = useState(null)
  const [editProd, setEditProd]       = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [cortando, setCortando]       = useState(false)

  const semana = semanas[selIdx] || semanas[0]

  // ── Cargar catálogo ──
  const cargarProductos = useCallback(async () => {
    const { data } = await supabase.from('vending_productos').select('*').order('producto')
    setProductos(data || [])
    return data || []
  }, [])

  // ── Cargar datos de la semana seleccionada ──
  const cargarSemana = useCallback(async () => {
    setLoading(true)
    // 1. Buscar encabezado de semana
    const { data: semRows } = await supabase
      .from('vending_semanas')
      .select('*')
      .eq('fecha_inicio', semana.ini)
      .limit(1)
    const sem = semRows?.[0] || null
    setSemanaDb(sem)

    if (sem) {
      // 2. Cargar detalle por producto
      const { data: det } = await supabase
        .from('vending_semana_producto')
        .select('*, vending_productos(producto, precio_venta, costo_caja, unidades_caja, activo)')
        .eq('semana_id', sem.id)
      setDetalle(det || [])

      // 3. Cargar movimientos recientes
      const { data: mvs } = await supabase
        .from('vending_movimientos')
        .select('*, vending_productos(producto)')
        .eq('semana_id', sem.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setMovs(mvs || [])
    } else {
      setDetalle([]); setMovs([])
    }
    setLoading(false)
  }, [semana.ini])

  // ── Inicializar semana si no existe ──
  const inicializarSemana = async () => {
    if (semanaDb) return semanaDb
    const prods = productos.filter(p => p.activo)

    // Buscar semana anterior para heredar inventario
    const semAnt = semanas[selIdx + 1]
    let inventarioAnt = {}
    if (semAnt) {
      const { data: semRowAnt } = await supabase
        .from('vending_semanas').select('id').eq('fecha_inicio', semAnt.ini).limit(1)
      if (semRowAnt?.[0]) {
        const { data: detAnt } = await supabase
          .from('vending_semana_producto').select('producto_id, qty_final').eq('semana_id', semRowAnt[0].id)
        ;(detAnt || []).forEach(r => { inventarioAnt[r.producto_id] = parseFloat(r.qty_final) || 0 })
      }
    }

    // Crear encabezado
    const { data: nuevaSem } = await supabase.from('vending_semanas').insert({
      semana_label:   semana.label,
      fecha_inicio:   semana.ini,
      fecha_fin:      semana.fin,
      estado:         'ABIERTA',
      producto:       'CORTE_SEMANAL',
      venta_pesos:    0, utilidad: 0, compras: 0,
      inventario_ini: 0, inventario_fin: 0,
      venta_unidades: 0, baja: false, es_material: false, residual_pesos: 0,
    }).select('*').single()

    if (!nuevaSem) { toast.error('No se pudo crear la semana'); return null }

    // Crear filas de detalle
    const inserts = prods.map(p => ({
      semana_id:           nuevaSem.id,
      producto_id:         p.id,
      qty_inicial:         inventarioAnt[p.id] || 0,
      qty_compras:         0, qty_ventas: 0,
      precio_venta_semana:  parseFloat(p.precio_venta) || 0,
      precio_compra_semana: precioCostoPorUnidad(p),
      importe_ventas: 0, importe_compras: 0,
    }))
    if (inserts.length > 0) await supabase.from('vending_semana_producto').insert(inserts)

    await cargarSemana()
    return nuevaSem
  }

  // ── Corte manual ──
  const ejecutarCorte = async () => {
    if (!semanaDb || semanaDb.estado === 'CERRADA') return
    setCortando(true)
    await supabase.from('vending_semanas')
      .update({ estado: 'CERRADA', fecha_corte: new Date().toISOString() })
      .eq('id', semanaDb.id)
    toast.success('Semana cerrada. Cambia a la siguiente para ver el inventario heredado.')
    setRefreshKey(k => k + 1)
    setCortando(false)
  }

  // ── Abrir modal de movimiento ──
  const abrirMov = async (prod = null) => {
    let sem = semanaDb
    if (!sem) { sem = await inicializarSemana(); if (!sem) return }
    setProdPresel(prod)
    setModal('mov')
  }

  useEffect(() => {
    cargarProductos().then(prods => {
      if (prods.length > 0) checkAndRunCorte(prods, () => setRefreshKey(k => k+1))
    })
  }, [cargarProductos])

  useEffect(() => { cargarSemana() }, [cargarSemana, refreshKey])

  // ── KPIs ──
  const totVentas  = detalle.reduce((s, r) => s + (parseFloat(r.importe_ventas) || 0), 0)
  const totCompras = detalle.reduce((s, r) => s + (parseFloat(r.importe_compras)|| 0), 0)
  const totUnidVentas  = detalle.reduce((s, r) => s + (parseFloat(r.qty_ventas) || 0), 0)
  const totUnidCompras = detalle.reduce((s, r) => s + (parseFloat(r.qty_compras)|| 0), 0)
  const utilidad   = totVentas - totCompras

  const tabStyle = k => ({
    padding:'10px 18px', fontSize:'13px', fontWeight:600, cursor:'pointer',
    color: tab===k ? 'var(--color-primary)' : '#6B7280',
    background:'none', border:'none',
    borderBottom: tab===k ? '2px solid var(--color-primary)' : '2px solid transparent',
    marginBottom:'-1px',
  })

  return (
    <div style={{ padding:'24px', maxWidth:'1100px' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ margin:'0 0 2px', fontSize:'20px', fontWeight:900, display:'flex', alignItems:'center', gap:'10px' }}>
            <ShoppingBag size={22} color="var(--color-secondary)" /> Vending Machine
          </h1>
          <p style={{ margin:0, fontSize:'13px', color:'#6B7280' }}>Inventario semanal · {productos.filter(p=>p.activo).length} productos activos</p>
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <button onClick={() => { const i = semanas.findIndex(s=>s.ini===sabActual); setSelIdx(i>=0?i:0) }}
            style={{ padding:'9px 14px', border:'1.5px solid var(--color-primary)', borderRadius:'8px', background: semana.ini===sabActual?'var(--color-primary)':'white', cursor:'pointer', fontSize:'12px', fontWeight:700, color: semana.ini===sabActual?'white':'var(--color-primary)' }}>
            Hoy
          </button>
          <button onClick={() => setModal('prod')} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 14px', border:'1.5px solid #E5E7EB', borderRadius:'8px', background:'white', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
            <Plus size={15} /> Producto
          </button>
          <button onClick={() => abrirMov(null)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', border:'none', borderRadius:'8px', background:'var(--color-primary)', color:'white', cursor:'pointer', fontSize:'13px', fontWeight:700 }}>
            <Plus size={15} /> Movimiento
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom:'1px solid #E5E7EB', display:'flex', marginBottom:'20px' }}>
        {[['semanal','📋 Control Semanal'],['movimientos','📝 Movimientos'],['catalogo','🏷️ Catálogo']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={tabStyle(k)}>{l}</button>
        ))}
      </div>

      {/* ══ TAB: CONTROL SEMANAL ══ */}
      {tab === 'semanal' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Selector semana */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <button onClick={() => setSelIdx(i => Math.min(i+1, semanas.length-1))}
              style={{ padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', background:'white', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ flex:1, position:'relative' }}>
              <select value={selIdx} onChange={e => setSelIdx(Number(e.target.value))}
                style={{ width:'100%', appearance:'none', padding:'10px 40px 10px 14px', background:'white', border:'1.5px solid var(--color-primary)', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                {semanas.map((s,i) => <option key={s.ini} value={i}>{s.label}</option>)}
              </select>
              {semana.ini === sabActual && (
                <span style={{ position:'absolute', top:'-8px', right:'-8px', fontSize:'10px', fontWeight:700, color:'white', background:'var(--color-primary)', padding:'1px 6px', borderRadius:'10px' }}>HOY</span>
              )}
            </div>
            <button onClick={() => setSelIdx(i => Math.max(i-1, 0))}
              style={{ padding:'8px 12px', border:'1.5px solid #E5E7EB', borderRadius:'8px', background:'white', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Estado semana + botón corte */}
          {semanaDb && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', background: semanaDb.estado==='CERRADA'?'#F0FDF4':'#FFF8E1', border:`1px solid ${semanaDb.estado==='CERRADA'?'#A7F3D0':'#FDE68A'}`, borderRadius:'8px' }}>
              <span style={{ fontSize:'13px', fontWeight:700, color: semanaDb.estado==='CERRADA'?'#057642':'#92400E' }}>
                {semanaDb.estado === 'CERRADA' ? '✅ Semana cerrada' : '🔓 Semana abierta — capturando movimientos'}
              </span>
              {semanaDb.estado === 'ABIERTA' && (
                <button onClick={ejecutarCorte} disabled={cortando} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', border:'none', borderRadius:'8px', background:'#1A3C5E', color:'white', cursor: cortando?'not-allowed':'pointer', fontSize:'12px', fontWeight:700 }}>
                  <Scissors size={13} /> {cortando ? 'Cerrando…' : 'Hacer Corte'}
                </button>
              )}
            </div>
          )}

          {/* KPIs */}
          {detalle.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px,1fr))', gap:'12px' }}>
              {[
                { icon: TrendingUp, label:'Ventas semana', value: fmt(totVentas), sub: `${fmtN(totUnidVentas)} unidades`, color:'var(--color-success)' },
                { icon: BarChart2,  label:'Utilidad bruta', value: fmt(utilidad), sub: totVentas>0 ? ((utilidad/totVentas)*100).toFixed(0)+'% margen' : '—', color:'var(--color-primary)' },
                { icon: ShoppingCart, label:'Compras semana', value: fmt(totCompras), sub: `${fmtN(totUnidCompras)} unidades`, color:'var(--color-secondary)' },
                { icon: Package,   label:'Productos', value: detalle.length, sub: `${detalle.filter(d=>parseFloat(d.qty_final)<=0).length} sin stock`, color:'#6B7280' },
              ].map(({ icon: Icon, label, value, sub, color }) => (
                <div key={label} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', padding:'14px 16px' }}>
                  <div style={{ fontSize:'10px', fontWeight:800, textTransform:'uppercase', color:'#9CA3AF', marginBottom:'4px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Icon size={12} color={color} />{label}
                  </div>
                  <div style={{ fontSize:'22px', fontWeight:900, color, fontVariantNumeric:'tabular-nums' }}>{value}</div>
                  <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'2px' }}>{sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabla inventario */}
          <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', overflow:'hidden' }}>
            {loading ? (
              <div style={{ textAlign:'center', padding:'60px', color:'#9CA3AF' }}>Cargando…</div>
            ) : !semanaDb ? (
              <div style={{ textAlign:'center', padding:'60px' }}>
                <ShoppingBag size={40} color="#E5E7EB" style={{ margin:'0 auto 12px', display:'block' }} />
                <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'8px', color:'#374151' }}>Semana sin datos</div>
                <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'16px' }}>Esta semana no tiene registro. ¿Iniciar inventario?</div>
                <button onClick={inicializarSemana} style={{ padding:'10px 20px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'8px', fontWeight:700, cursor:'pointer', fontSize:'13px' }}>
                  Iniciar semana
                </button>
              </div>
            ) : detalle.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#9CA3AF' }}>Sin detalle de productos para esta semana.</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead>
                    <tr style={{ background:'#F9FAFB' }}>
                      {['Producto','Inicial','Compras','Ventas','Final','$Ventas','$Compras','Utilidad',''].map((h,i) => (
                        <th key={h+i} style={{ padding:'9px 12px', textAlign: i===0?'left':'right', fontSize:'10px', fontWeight:800, color:'#6B7280', textTransform:'uppercase', borderBottom:'2px solid #E5E7EB', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((d, i) => {
                      const sinStock = parseFloat(d.qty_final) <= 0
                      const prod = d.vending_productos
                      return (
                        <tr key={d.id} style={{ background: sinStock ? '#FFF8F8' : i%2===0 ? 'white' : '#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                          <td style={{ padding:'10px 12px', fontWeight:600, color: sinStock?'var(--color-danger)':'#374151', whiteSpace:'nowrap' }}>
                            {prod?.producto || '—'}
                            {sinStock && <span style={{ marginLeft:'6px', fontSize:'10px', color:'var(--color-danger)', fontWeight:800 }}>SIN STOCK</span>}
                          </td>
                          {[d.qty_inicial, d.qty_compras, d.qty_ventas, d.qty_final].map((v, j) => (
                            <td key={j} style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight: j===3?800:400, color: j===3&&parseFloat(v)<=0?'var(--color-danger)':j===3?'#374151':'#6B7280' }}>
                              {fmtN(v)}
                            </td>
                          ))}
                          <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--color-success)', fontWeight:600 }}>{fmt(d.importe_ventas)}</td>
                          <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'#6B7280' }}>{fmt(d.importe_compras)}</td>
                          <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:700, color: (d.importe_ventas-d.importe_compras)>=0?'var(--color-success)':'var(--color-danger)' }}>
                            {fmt(d.importe_ventas - d.importe_compras)}
                          </td>
                          <td style={{ padding:'8px 10px', textAlign:'center' }}>
                            {semanaDb?.estado === 'ABIERTA' && (
                              <button onClick={() => abrirMov(prod ? { ...prod, id: d.producto_id } : null)}
                                style={{ padding:'4px 10px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
                                + Mov
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'#F3F4F6', fontWeight:800, borderTop:'2px solid #E5E7EB' }}>
                      <td style={{ padding:'10px 12px', fontSize:'12px' }}>TOTAL</td>
                      <td colSpan={3} />
                      <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>
                        {fmtN(detalle.reduce((s,d)=>s+(parseFloat(d.qty_final)||0),0))}
                      </td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:'var(--color-success)', fontVariantNumeric:'tabular-nums' }}>{fmt(totVentas)}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color:'#6B7280', fontVariantNumeric:'tabular-nums' }}>{fmt(totCompras)}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', color: utilidad>=0?'var(--color-success)':'var(--color-danger)', fontVariantNumeric:'tabular-nums' }}>{fmt(utilidad)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: MOVIMIENTOS ══ */}
      {tab === 'movimientos' && (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'#1A3C5E', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:'white', fontWeight:800, fontSize:'13px' }}>Movimientos — {semana.label}</span>
            <button onClick={() => abrirMov(null)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'var(--color-secondary)', color:'white', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>
              <Plus size={13} /> Nuevo
            </button>
          </div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#9CA3AF' }}>Cargando…</div>
          ) : movs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#9CA3AF' }}>Sin movimientos registrados esta semana.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ background:'#F9FAFB' }}>
                    {['Fecha','Tipo','Producto','Cantidad','Precio/u','Importe','Proveedor','Nota'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign: ['Cantidad','Precio/u','Importe'].includes(h)?'right':'left', fontSize:'10px', fontWeight:800, color:'#6B7280', textTransform:'uppercase', borderBottom:'2px solid #E5E7EB', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m, i) => (
                    <tr key={m.id} style={{ background: i%2===0?'white':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'8px 12px', color:'#6B7280', fontSize:'12px' }}>{m.fecha}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:800, background: m.tipo==='COMPRA'?'#EFF6FF':'#F0FDF4', color: m.tipo==='COMPRA'?'#1A3C5E':'#057642' }}>
                          {m.tipo === 'COMPRA' ? '📦 COMPRA' : '🛒 VENTA'}
                        </span>
                      </td>
                      <td style={{ padding:'8px 12px', fontWeight:600 }}>{m.vending_productos?.producto || '—'}</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtN(m.cantidad)}</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', color:'#6B7280' }}>{fmt(m.precio_unitario)}</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color: m.tipo==='VENTA'?'var(--color-success)':'#6B7280', fontVariantNumeric:'tabular-nums' }}>{fmt(m.importe)}</td>
                      <td style={{ padding:'8px 12px', color:'#6B7280', fontSize:'12px' }}>{m.proveedor || '—'}</td>
                      <td style={{ padding:'8px 12px', color:'#9CA3AF', fontSize:'11px' }}>{m.nota || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: CATÁLOGO ══ */}
      {tab === 'catalogo' && (
        <div style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', background:'#1A3C5E', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:'white', fontWeight:800, fontSize:'13px' }}>Catálogo de Productos</span>
            <button onClick={() => setModal('prod')} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:'var(--color-secondary)', color:'white', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>
              <Plus size={13} /> Nuevo Producto
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ background:'#F9FAFB' }}>
                  {['Producto','Proveedor','Costo/caja','Uds/caja','Costo/u','Precio Venta','Utilidad/u','Margen','Activo',''].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign: ['Costo/caja','Uds/caja','Costo/u','Precio Venta','Utilidad/u','Margen'].includes(h)?'right':'left', fontSize:'10px', fontWeight:800, color:'#6B7280', textTransform:'uppercase', borderBottom:'2px solid #E5E7EB', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => {
                  const costoU = precioCostoPorUnidad(p)
                  const utilU  = parseFloat(p.precio_venta||0) - costoU
                  const margen = p.precio_venta && costoU ? ((utilU / parseFloat(p.precio_venta)) * 100).toFixed(0) : null
                  return (
                    <tr key={p.id} style={{ background: !p.activo ? '#FFF8F8' : i%2===0?'white':'#FAFAFA', borderBottom:'1px solid #F3F4F6' }}>
                      <td style={{ padding:'10px 12px', fontWeight:700, color: p.activo?'#374151':'#9CA3AF' }}>{p.producto}</td>
                      <td style={{ padding:'10px 12px', color:'#6B7280', fontSize:'12px' }}>{p.proveedor || '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{p.costo_caja ? fmt(p.costo_caja) : '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right' }}>{p.unidades_caja || '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'#6B7280' }}>{costoU ? fmt(costoU) : '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:700 }}>{fmt(p.precio_venta)}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--color-success)', fontWeight:700 }}>{costoU ? fmt(utilU) : '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color: margen && parseInt(margen)>=30 ? 'var(--color-success)' : 'var(--color-warning)' }}>{margen ? margen+'%' : '—'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'11px', fontWeight:700, background: p.activo?'#F0FDF4':'#FFF8F8', color: p.activo?'#057642':'#9CA3AF' }}>
                          {p.activo ? 'Activo' : 'Baja'}
                        </span>
                      </td>
                      <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>
                        <button onClick={() => { setEditProd(p); setModal('editProd') }}
                          style={{ marginRight:'4px', padding:'4px 8px', background:'#F3F4F6', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDel(p)}
                          style={{ padding:'4px 8px', background:'#FEF2F2', color:'#B91C1C', border:'none', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modales ── */}
      {modal === 'mov' && semanaDb && (
        <ModalMovimiento
          semanaId={semanaDb.id}
          semanaIni={semana.ini}
          semanaFin={semana.fin}
          productos={productos}
          productoPresel={prodPresel}
          onClose={() => { setModal(null); setProdPresel(null) }}
          onSaved={() => setRefreshKey(k => k+1)}
        />
      )}
      {(modal === 'prod' || modal === 'editProd') && (
        <ModalProducto
          producto={modal === 'editProd' ? editProd : null}
          onClose={() => { setModal(null); setEditProd(null) }}
          onSaved={() => setRefreshKey(k => k+1)}
        />
      )}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setConfirmDel(null)}>
          <div style={{ background:'white', borderRadius:'14px', padding:'28px', maxWidth:'380px', width:'100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:'16px', marginBottom:'8px' }}>¿Dar de baja el producto?</div>
            <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'20px' }}>{confirmDel.producto}</div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding:'9px 18px', background:'#F3F4F6', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={async () => {
                await supabase.from('vending_productos').update({ activo: false }).eq('id', confirmDel.id)
                toast.success('Producto dado de baja')
                setConfirmDel(null); setRefreshKey(k => k+1)
              }} style={{ padding:'9px 18px', background:'#B91C1C', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                Dar de baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
