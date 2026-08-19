import { useState, useEffect, useRef } from 'react'
import { Receipt, Plus, X, Camera, AlertTriangle, Check, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

const GRUPOS = [
  'Ferretería y materiales', 'Limpieza e higiene', 'Papelería y oficina',
  'Electricidad', 'Plomería', 'Herramienta y equipo', 'Servicios externos',
  'Vending / Reabasto', 'Combustible', 'Seguridad', 'Alimentación', 'Otros',
]

function calcDatos(fecha) {
  const dt = new Date(fecha + 'T12:00:00')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return { anio: dt.getFullYear(), mes: MESES[dt.getMonth()], dia_semana: DIAS[dt.getDay()], semana: `S${Math.ceil(dt.getDate() / 7)}` }
}

export default function TicketModal({ gasto = null, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!gasto?.id
  const fileRef = useRef()

  const [form, setForm] = useState({
    fecha:           gasto?.fecha || today,
    proveedor_id:    gasto?.proveedor_id || '',
    proveedor_txt:   gasto?.proveedor_txt || gasto?.proveedor || '',
    grupo_gasto:     gasto?.grupo_gasto || GRUPOS[0],
    descripcion:     gasto?.descripcion || '',
    ticket_total:    gasto?.ticket_total || gasto?.cantidad || '',
    categoria_ticket: '',   // VENDING | OPERACION | MANTENIMIENTO | '' (mixto)
  })
  const [lineas, setLineas]       = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [ocr, setOcr]             = useState({ loading: false, error: null })
  const [saving, setSaving]       = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [imgB64, setImgB64]       = useState(null)
  const [imgType, setImgType]     = useState('image/jpeg')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      supabase.from('cat_proveedores').select('id,nombre,categoria').eq('activo', true).order('nombre'),
      supabase.from('cat_productos').select('id,clave,nombre,categoria,unidad').eq('activo', true).order('nombre'),
    ]).then(([{ data: p }, { data: pr }]) => {
      setProveedores(p || [])
      setProductos(pr || [])
    })
  }, [])

  useEffect(() => {
    if (!gasto?.id) return
    supabase.from('gasto_detalle').select('*').eq('gasto_id', gasto.id).order('created_at')
      .then(({ data }) => setLineas(data?.map(d => ({ ...d, _key: d.id })) || []))
  }, [gasto?.id])

  const addLinea = () => setLineas(l => [...l, { _key: Date.now(), producto_id: '', descripcion: '', categoria: form.categoria_ticket || '', cantidad: 1, precio_unit: '', codigo_proveedor: '' }])
  const updLinea = (key, field, val) => setLineas(l => l.map(r => r._key === key ? { ...r, [field]: val } : r))
  const delLinea = (key) => setLineas(l => l.filter(r => r._key !== key))

  const sumaLineas = lineas.reduce((a, r) => a + (parseFloat(r.cantidad || 1) * parseFloat(r.precio_unit || 0)), 0)
  const totalOK    = !form.ticket_total || Math.abs(sumaLineas - parseFloat(form.ticket_total)) < 0.02

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgType(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => { setImgPreview(ev.target.result); setImgB64(ev.target.result.split(',')[1]) }
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
          codigo_proveedor: l.codigo_proveedor || '',
          descripcion: l.descripcion || '',
          cantidad:    l.cantidad ?? 1,
          precio_unit: l.precio_unit ?? '',
          producto_id: '',
          categoria:   form.categoria_ticket || '',  // hereda categoría del ticket
        })))
      }
      setOcr({ loading: false, error: null })
      toast.success(`Ticket leído: ${data.lineas?.length || 0} productos`)
    } catch (err) { setOcr({ loading: false, error: err.message }) }
  }

  const guardar = async () => {
    if (!form.fecha || !form.grupo_gasto) { toast.error('Fecha y grupo son obligatorios'); return }
    setSaving(true)
    try {
      const montoTotal = parseFloat(form.ticket_total) || sumaLineas || 0
      const payload = {
        fecha:        form.fecha,
        proveedor:    form.proveedor_txt || (proveedores.find(p => p.id === form.proveedor_id)?.nombre) || null,
        proveedor_id: form.proveedor_id || null,
        grupo_gasto:  form.grupo_gasto,
        descripcion:  form.descripcion || null,
        cantidad:     montoTotal,
        ticket_total: montoTotal,
        ...calcDatos(form.fecha),
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

      if (lineas.length > 0) {
        await supabase.from('gasto_detalle').delete().eq('gasto_id', gastoId)
        const lineasPayload = lineas.filter(l => l.descripcion && l.precio_unit).map(l => ({
          gasto_id: gastoId, producto_id: l.producto_id || null,
          descripcion: l.descripcion, categoria: l.categoria || null,
          cantidad: parseFloat(l.cantidad) || 1, precio_unit: parseFloat(l.precio_unit),
          codigo_proveedor: l.codigo_proveedor || null,
        }))
        if (lineasPayload.length) await supabase.from('gasto_detalle').insert(lineasPayload)
      }

      // ── Integración Vending: líneas VENDING → compras automáticas ──────
      const lineasVending = lineas.filter(l => l.categoria === 'VENDING' && l.descripcion && l.precio_unit)
      if (lineasVending.length > 0) {
        // 1. Obtener semana vending activa
        const { data: semana } = await supabase
          .from('vending_semanas')
          .select('id')
          .eq('estado', 'ABIERTA')
          .order('semana_inicio', { ascending: false })
          .limit(1)
          .single()

        if (semana) {
          for (const linea of lineasVending) {
            // 2. Doble match: código proveedor primero → fallback nombre ILIKE
            let vprod = null
            if (linea.codigo_proveedor) {
              const { data: porCodigo } = await supabase
                .from('vending_productos')
                .select('id, nombre, precio_compra_default')
                .eq('codigo_proveedor', linea.codigo_proveedor)
                .eq('activo', true)
                .limit(1)
              vprod = porCodigo?.[0] || null
            }
            if (!vprod) {
              const { data: porNombre } = await supabase
                .from('vending_productos')
                .select('id, nombre, precio_compra_default')
                .ilike('nombre', `%${linea.descripcion.trim()}%`)
                .eq('activo', true)
                .limit(1)
              vprod = porNombre?.[0] || null
            }
            if (!vprod) continue // sin match, se omite silenciosamente

            const cant   = parseFloat(linea.cantidad) || 1
            const precio = parseFloat(linea.precio_unit) || vprod.precio_compra_default || 0

            // 3. Obtener o crear snapshot semana-producto
            let { data: sp } = await supabase
              .from('vending_semana_producto')
              .select('id, qty_compras, importe_compras, qty_ventas, importe_ventas, precio_compra_semana, precio_venta_semana')
              .eq('semana_id', semana.id)
              .eq('producto_id', vprod.id)
              .single()

            if (!sp) {
              const { data: nuevo } = await supabase
                .from('vending_semana_producto')
                .insert({ semana_id: semana.id, producto_id: vprod.id, qty_inicial: 0, qty_compras: 0, qty_ventas: 0, precio_compra_semana: precio, precio_venta_semana: 0, importe_compras: 0, importe_ventas: 0 })
                .select('*').single()
              sp = nuevo
            }
            if (!sp) continue

            // 4. Registrar movimiento COMPRA
            await supabase.from('vending_movimientos').insert({
              semana_id:    semana.id,
              producto_id:  vprod.id,
              fecha:        form.fecha,
              tipo:         'COMPRA',
              cantidad:     cant,
              precio_unitario: precio,
              proveedor:    form.proveedor_txt || (proveedores.find(p => p.id === form.proveedor_id)?.nombre) || null,
              nota:         `Desde ticket gastos: ${form.descripcion || ''}`.trim(),
            })

            // 5. Actualizar snapshot
            await supabase.from('vending_semana_producto').update({
              qty_compras:          (parseFloat(sp.qty_compras) || 0) + cant,
              importe_compras:      (parseFloat(sp.importe_compras) || 0) + cant * precio,
              precio_compra_semana: precio,
            }).eq('id', sp.id)
          }

          // 6. Sincronizar totales en vending_semanas
          const { data: totales } = await supabase
            .from('vending_semana_producto')
            .select('importe_ventas, importe_compras, qty_ventas, qty_compras')
            .eq('semana_id', semana.id)
          const totVentas  = (totales || []).reduce((s, r) => s + (parseFloat(r.importe_ventas) || 0), 0)
          const totCompras = (totales || []).reduce((s, r) => s + (parseFloat(r.importe_compras) || 0), 0)
          const totUnidC   = (totales || []).reduce((s, r) => s + (parseFloat(r.qty_compras) || 0), 0)
          await supabase.from('vending_semanas').update({
            compras: totUnidC,
          }).eq('id', semana.id)
        }
      }

      toast.success(isEdit ? 'Gasto actualizado' : 'Ticket registrado')
      onSaved()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '8px 11px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', margin: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A66C2', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} /> {isEdit ? 'Editar gasto' : 'Nuevo Ticket / Gasto'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── 1. Encabezado ── */}
          <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0A66C2', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.06em' }}>1. Encabezado del ticket</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Fecha *</label>
                <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Monto total del ticket *</label>
                <input type="number" value={form.ticket_total} onChange={e => set('ticket_total', e.target.value)}
                  placeholder="0.00" style={{ ...inp, borderColor: !totalOK && lineas.length > 0 ? '#B24020' : '#E5E7EB' }} step="0.01" min="0" />
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
                  <input value={form.proveedor_txt} onChange={e => set('proveedor_txt', e.target.value)} placeholder="Ej: Dogo, Oxxo…" style={inp} />
                </div>
              )}
              <div style={{ gridColumn: form.proveedor_id ? '2' : '1 / -1' }}>
                <label style={lbl}>Categoría / Grupo *</label>
                <select value={form.grupo_gasto} onChange={e => set('grupo_gasto', e.target.value)} style={inp}>
                  {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {/* Categoría del ticket — aplica a TODAS las líneas */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Categoría del ticket <span style={{ color: '#0A66C2' }}>(se aplica a todas las líneas)</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['', 'Mixto'], ['VENDING', '🥤 Vending'], ['OPERACION', '🏢 Operación'], ['MANTENIMIENTO', '🔧 Mantenimiento']].map(([v, lb]) => {
                    const active = form.categoria_ticket === v
                    const color = v === 'VENDING' ? '#EC4899' : v === 'OPERACION' ? '#0A66C2' : v === 'MANTENIMIENTO' ? '#B24020' : '#6B7280'
                    return (
                      <button key={v} type="button"
                        onClick={() => {
                          set('categoria_ticket', v)
                          if (v) setLineas(l => l.map(r => ({ ...r, categoria: v })))
                        }}
                        style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${color}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? color : 'white', color: active ? 'white' : color }}>
                        {lb}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Descripción / Concepto general</label>
                <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Resumen del gasto…" style={inp} />
              </div>
            </div>
          </div>

          {/* ── 2. OCR ── */}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.06em' }}>2. Foto del ticket (OCR con IA)</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
                <button type="button" onClick={() => fileRef.current.click()}
                  style={{ padding: '8px 14px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={15} /> {imgPreview ? 'Cambiar foto' : 'Tomar / Subir foto'}
                </button>
                {imgB64 && !ocr.loading && (
                  <button type="button" onClick={runOCR}
                    style={{ marginTop: 8, padding: '8px 14px', background: '#0A66C2', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader size={14} /> Leer con IA
                  </button>
                )}
                {ocr.loading && <div style={{ marginTop: 8, fontSize: 13, color: '#0A66C2', display: 'flex', alignItems: 'center', gap: 6 }}><Loader size={14} /> Analizando…</div>}
                {ocr.error && <div style={{ marginTop: 8, fontSize: 12, color: '#B24020' }}>Error: {ocr.error}</div>}
              </div>
              {imgPreview
                ? <img src={imgPreview} alt="ticket" style={{ width: 100, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #FDE68A' }} />
                : <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                    Toma foto con la cámara o sube una imagen — la IA extrae productos, cantidades y montos automáticamente.
                  </div>
              }
            </div>
          </div>

          {/* ── 3. Detalle ── */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>3. Detalle de productos</div>
              <button type="button" onClick={addLinea}
                style={{ padding: '5px 12px', background: '#057642', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> Agregar línea
              </button>
            </div>

            {lineas.length === 0
              ? <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 13, color: '#6B7280' }}>Sin detalle — usa + o la IA para agregar productos</div>
              : <>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6 }}>
                    {['Cód. Sam\'s', 'Producto', 'Categoría', 'Cant.', 'Precio unit.', ''].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {lineas.map(l => {
                    const sub = parseFloat(l.cantidad || 1) * parseFloat(l.precio_unit || 0)
                    return (
                      <div key={l._key} style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                        <input value={l.codigo_proveedor || ''} onChange={e => updLinea(l._key, 'codigo_proveedor', e.target.value)}
                          placeholder="Código" style={{ ...inp, padding: '6px 6px', fontFamily: 'monospace', fontSize: 11 }} />
                        <input value={l.descripcion} onChange={e => updLinea(l._key, 'descripcion', e.target.value)}
                          placeholder="Producto o servicio" list={`prod-${l._key}`} style={{ ...inp, padding: '6px 9px' }} />
                        <datalist id={`prod-${l._key}`}>{productos.map(p => <option key={p.id} value={p.nombre} />)}</datalist>
                        <select value={l.categoria || ''} onChange={e => updLinea(l._key, 'categoria', e.target.value)} style={{ ...inp, padding: '6px 6px' }}>
                          <option value="">—</option>
                          {[['VENDING','Vending'],['OPERACION','Operación'],['MANTENIMIENTO','Mantenimiento']].map(([v,lb]) => <option key={v} value={v}>{lb}</option>)}
                        </select>
                        <input type="number" value={l.cantidad} onChange={e => updLinea(l._key, 'cantidad', e.target.value)}
                          style={{ ...inp, padding: '6px 9px' }} min="0" step="0.001" />
                        <div style={{ position: 'relative' }}>
                          <input type="number" value={l.precio_unit} onChange={e => updLinea(l._key, 'precio_unit', e.target.value)}
                            placeholder="0.00" style={{ ...inp, padding: '6px 9px' }} min="0" step="0.01" />
                          {sub > 0 && <div style={{ position: 'absolute', right: 6, bottom: -14, fontSize: 9, color: '#6B7280', whiteSpace: 'nowrap' }}>{fmt(sub)}</div>}
                        </div>
                        <button onClick={() => delLinea(l._key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4 }}><X size={14} /></button>
                      </div>
                    )
                  })}
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
            }
          </div>

          <button onClick={guardar} disabled={saving}
            style={{ padding: 12, background: saving ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : '💾 Registrar Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
