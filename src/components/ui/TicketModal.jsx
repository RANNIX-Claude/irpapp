import { useState, useEffect, useRef } from 'react'
import { Receipt, Plus, X, Camera, AlertTriangle, Check, FileText, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const fmt = (n) => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

const GRUPOS = [
  'Ferretería y materiales', 'Limpieza e higiene', 'Papelería y oficina',
  'Electricidad', 'Plomería', 'Herramienta y equipo', 'Servicios externos',
  'Vending / Reabasto', 'Combustible', 'Seguridad', 'Alimentación', 'Nómina / Personal', 'Otros',
]

function calcDatos(fecha) {
  const dt = new Date(fecha + 'T12:00:00')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return { anio: dt.getFullYear(), mes: MESES[dt.getMonth()], dia_semana: DIAS[dt.getDay()], semana: `S${Math.ceil(dt.getDate() / 7)}` }
}

// ── Panel IA — Foto o texto pegado ───────────────────────────────────────────
function PanelIA({ onExtracted }) {
  const [mode, setMode]     = useState(null)       // null | 'foto' | 'texto'
  const [loading, setLoading] = useState(false)
  const [imgPreview, setImgPreview] = useState(null)
  const [texto, setTexto]   = useState('')
  const [result, setResult] = useState(null)       // null | 'ok' | 'err'
  const fileRef = useRef()

  const callOCR = async (b64, mediaType) => {
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/.netlify/functions/gastos-ocr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, media_type: mediaType }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onExtracted(data)
      setResult('ok')
      toast.success(`Ticket leído: ${data.lineas?.length || 0} artículos`)
    } catch (err) {
      setResult('err'); toast.error('OCR: ' + err.message)
    } finally { setLoading(false) }
  }

  const callTexto = async () => {
    if (!texto.trim()) return
    setLoading(true); setResult(null)
    try {
      // Reutilizamos gastos-ocr enviando el texto como prompt especial
      const res = await fetch('/.netlify/functions/gastos-ocr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto_libre: texto }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onExtracted(data)
      setResult('ok')
      toast.success('Datos extraídos del texto')
    } catch (err) {
      setResult('err'); toast.error('Texto: ' + err.message)
    } finally { setLoading(false) }
  }

  const SUPPORTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result

      // Claude Vision no soporta TIFF ni BMP: convertir a JPEG via canvas
      if (!SUPPORTED.includes(file.type)) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width  = img.naturalWidth
          canvas.height = img.naturalHeight
          canvas.getContext('2d').drawImage(img, 0, 0)
          const jpegUrl = canvas.toDataURL('image/jpeg', 0.92)
          setImgPreview(jpegUrl)
          callOCR(jpegUrl.split(',')[1], 'image/jpeg')
        }
        img.onerror = () => setResult('err')  // TIFF no renderizable en el browser
        img.src = dataUrl
        return
      }

      setImgPreview(dataUrl)
      callOCR(dataUrl.split(',')[1], file.type)
    }
    reader.readAsDataURL(file)
  }

  // Si el resultado ya es ok, mostrar sello compacto
  if (result === 'ok') return (
    <div style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1.5px solid #6EE7B7', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Check size={22} color="#057642" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>Datos importados ✓</div>
        <div style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>Revisa y corrige los campos si es necesario</div>
      </div>
      <button onClick={() => { setResult(null); setMode(null); setImgPreview(null); setTexto('') }}
        style={{ fontSize: 11, color: '#047857', background: 'none', border: '1px solid #6EE7B7', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
        Volver a importar
      </button>
    </div>
  )

  return (
    <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F0F9FF)', border: '2px solid #BFDBFE', borderRadius: 12, padding: '14px 16px' }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={18} color="#0A66C2" />
        <span style={{ fontSize: 13, fontWeight: 800, color: '#0A66C2' }}>Apoyo con IA — Importar datos del ticket</span>
      </div>

      {/* Botones de modo — grandes para móvil */}
      {!mode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => { setMode('foto'); setTimeout(() => fileRef.current?.click(), 50) }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '18px 12px', background: '#0A66C2', color: '#fff',
              border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13,
              minHeight: 80,
            }}>
            <Camera size={26} />
            Foto del ticket
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.85 }}>Cámara o galería</span>
          </button>
          <button
            onClick={() => setMode('texto')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '18px 12px', background: '#fff', color: '#0A66C2',
              border: '2px solid #0A66C2', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13,
              minHeight: 80,
            }}>
            <FileText size={26} />
            Pegar texto
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.75 }}>WhatsApp, documento…</span>
          </button>
        </div>
      )}

      {/* Input oculto para foto — capture=environment activa cámara en móvil */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />

      {/* Modo foto: previsualización + estado */}
      {mode === 'foto' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {imgPreview && (
            <img src={imgPreview} alt="ticket"
              style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #BFDBFE', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            {loading
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0A66C2', fontWeight: 700, fontSize: 13 }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Leyendo con IA…
                </div>
              : <div style={{ fontSize: 12, color: '#1E40AF' }}>
                  {imgPreview ? 'Procesando…' : 'Selecciona o toma la foto del ticket'}
                </div>
            }
            {result === 'err' && <div style={{ fontSize: 12, color: '#B24020', marginTop: 6 }}>Error al leer — si es TIFF, verifica que tu navegador lo soporte, o guárdalo como JPG/PNG</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button onClick={() => fileRef.current?.click()} disabled={loading}
                style={{ padding: '7px 14px', background: '#fff', color: '#0A66C2', border: '1.5px solid #0A66C2', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> {imgPreview ? 'Cambiar foto' : 'Seleccionar foto'}
              </button>
              <button onClick={() => { setMode(null); setImgPreview(null) }}
                style={{ padding: '7px 12px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                ← Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modo texto */}
      {mode === 'texto' && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#1E40AF' }}>
            Pega los datos del ticket — texto de WhatsApp, descripción, lista de artículos, lo que sea.
          </p>
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={5}
            placeholder={'Ej:\nSam\'s Club 2026-08-19\nFLORETINAS TOTIS 2 x $45.50\nCHIPS SABRITAS $38.00\nTotal: $129.00'}
            style={{ width: '100%', padding: '9px 11px', border: '1.5px solid #BFDBFE', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={callTexto} disabled={loading || !texto.trim()}
              style={{ flex: 1, padding: '10px 0', background: loading ? '#93C5FD' : '#0A66C2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Sparkles size={15} /> {loading ? 'Extrayendo…' : 'Extraer datos'}
            </button>
            <button onClick={() => { setMode(null); setTexto('') }}
              style={{ padding: '10px 14px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
              ← Volver
            </button>
          </div>
          {result === 'err' && <div style={{ fontSize: 12, color: '#B24020', marginTop: 6 }}>No se pudo extraer — intenta con más detalle en el texto</div>}
        </div>
      )}
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────────────────────
export default function TicketModal({ gasto = null, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!gasto?.id

  const [form, setForm] = useState({
    fecha:            gasto?.fecha || today,
    proveedor_id:     gasto?.proveedor_id || '',
    proveedor_txt:    gasto?.proveedor_txt || gasto?.proveedor || '',
    grupo_gasto:      gasto?.grupo_gasto || '',
    descripcion:      gasto?.descripcion || '',
    ticket_total:     gasto?.ticket_total || gasto?.cantidad || '',
    tipo_compra:      gasto?.tipo_compra || '',
    categoria_ticket: '',
  })
  const [lineas, setLineas]         = useState([])
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos]   = useState([])
  const [saving, setSaving]         = useState(false)

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

  // Callback cuando la IA extrae datos (OCR o texto)
  const handleExtracted = (data) => {
    if (data.total)     set('ticket_total', String(data.total))
    if (data.proveedor) set('proveedor_txt', data.proveedor)
    if (data.fecha)     set('fecha', data.fecha)
    if (data.lineas?.length) {
      setLineas(data.lineas.map((l, i) => ({
        _key: Date.now() + i,
        codigo_proveedor: l.codigo_proveedor || '',
        descripcion:      l.descripcion || '',
        cantidad:         l.cantidad ?? 1,
        precio_unit:      l.precio_unit ?? '',
        producto_id:      '',
        categoria:        form.categoria_ticket || '',
      })))
    }
  }

  const addLinea = () => setLineas(l => [...l, { _key: Date.now(), producto_id: '', descripcion: '', categoria: form.categoria_ticket || '', cantidad: 1, precio_unit: '', codigo_proveedor: '' }])
  const updLinea = (key, field, val) => setLineas(l => l.map(r => r._key === key ? { ...r, [field]: val } : r))
  const delLinea = (key) => setLineas(l => l.filter(r => r._key !== key))

  const sumaLineas = lineas.reduce((a, r) => a + (parseFloat(r.cantidad || 1) * parseFloat(r.precio_unit || 0)), 0)
  const totalOK    = !form.ticket_total || Math.abs(sumaLineas - parseFloat(form.ticket_total)) < 0.02

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
      if (form.tipo_compra) payload.tipo_compra = form.tipo_compra

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
        const { data: semana } = await supabase
          .from('vending_semanas').select('id').eq('estado', 'ABIERTA')
          .order('semana_inicio', { ascending: false }).limit(1).single()

        if (semana) {
          for (const linea of lineasVending) {
            let vprod = null
            if (linea.codigo_proveedor) {
              const { data: porCodigo } = await supabase.from('vending_productos')
                .select('id,nombre,precio_compra_default').eq('codigo_proveedor', linea.codigo_proveedor).eq('activo', true).limit(1)
              vprod = porCodigo?.[0] || null
            }
            if (!vprod) {
              const { data: porNombre } = await supabase.from('vending_productos')
                .select('id,nombre,precio_compra_default').ilike('nombre', `%${linea.descripcion.trim()}%`).eq('activo', true).limit(1)
              vprod = porNombre?.[0] || null
            }
            if (!vprod) continue

            const cant   = parseFloat(linea.cantidad) || 1
            const precio = parseFloat(linea.precio_unit) || vprod.precio_compra_default || 0

            let { data: sp } = await supabase.from('vending_semana_producto')
              .select('id,qty_compras,importe_compras').eq('semana_id', semana.id).eq('producto_id', vprod.id).single()

            if (!sp) {
              const { data: nuevo } = await supabase.from('vending_semana_producto')
                .insert({ semana_id: semana.id, producto_id: vprod.id, qty_inicial: 0, qty_compras: 0, qty_ventas: 0, precio_compra_semana: precio, precio_venta_semana: 0, importe_compras: 0, importe_ventas: 0 })
                .select('*').single()
              sp = nuevo
            }
            if (!sp) continue

            await supabase.from('vending_movimientos').insert({
              semana_id: semana.id, producto_id: vprod.id, fecha: form.fecha, tipo: 'COMPRA',
              cantidad: cant, precio_unitario: precio,
              proveedor: form.proveedor_txt || null,
              nota: `Desde ticket gastos: ${form.descripcion || ''}`.trim(),
            })

            await supabase.from('vending_semana_producto').update({
              qty_compras:     (parseFloat(sp.qty_compras) || 0) + cant,
              importe_compras: (parseFloat(sp.importe_compras) || 0) + cant * precio,
              precio_compra_semana: precio,
            }).eq('id', sp.id)
          }
        }
      }

      toast.success(isEdit ? 'Gasto actualizado' : 'Ticket registrado')
      onSaved()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // Estilos responsivos (mobile-first)
  const inp = { width: '100%', padding: '9px 11px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 5, textTransform: 'uppercase' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 680, margin: '0 auto', minHeight: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A66C2', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} /> {isEdit ? 'Editar gasto' : 'Nuevo Ticket / Gasto'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6 }}><X size={20} /></button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── 0. APOYO IA (arriba siempre) ── */}
          <PanelIA onExtracted={handleExtracted} />

          {/* ── 1. Encabezado ── */}
          <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0A66C2', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.06em' }}>Encabezado del ticket</div>

            {/* Fila 1: Fecha + Total */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Fecha *</label>
                <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Total del ticket *</label>
                <input type="number" value={form.ticket_total} onChange={e => set('ticket_total', e.target.value)}
                  placeholder="0.00" style={{ ...inp, borderColor: !totalOK && lineas.length > 0 ? '#B24020' : '#E5E7EB' }} step="0.01" min="0" />
              </div>
            </div>

            {/* Fila 2: Proveedor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Proveedor (catálogo)</label>
                <select value={form.proveedor_id} onChange={e => { set('proveedor_id', e.target.value); if (e.target.value) set('proveedor_txt', '') }} style={inp}>
                  <option value="">— Seleccionar —</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>o Texto libre</label>
                <input value={form.proveedor_txt} onChange={e => { set('proveedor_txt', e.target.value); if (e.target.value) set('proveedor_id', '') }}
                  placeholder="Ej: Sam's Club, Oxxo…" style={inp} />
              </div>
            </div>

            {/* Fila 3: Grupo */}
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Categoría / Grupo *</label>
              <select value={form.grupo_gasto} onChange={e => set('grupo_gasto', e.target.value)} style={inp}>
                <option value="">— Seleccionar —</option>
                {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Tipo de compra */}
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Tipo de compra</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['VENDING','🥤 Vending','#EC4899'],['MANTENIMIENTO','🔧 Mantenimiento','#B24020'],['CONSUMO','🛒 Consumo','#057642']].map(([v, lb, color]) => {
                  const active = form.tipo_compra === v
                  return (
                    <button key={v} type="button" onClick={() => set('tipo_compra', active ? '' : v)}
                      style={{ padding: '8px 16px', borderRadius: 20, border: `2px solid ${color}`, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: active ? color : 'white', color: active ? 'white' : color }}>
                      {lb}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Categoría del ticket */}
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Categoría de líneas <span style={{ color: '#0A66C2', textTransform: 'none' }}>(aplica a todos los artículos)</span></label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['','Mixto','#6B7280'],['VENDING','🥤 Vending','#EC4899'],['OPERACION','🏢 Operación','#0A66C2'],['MANTENIMIENTO','🔧 Mantenimiento','#B24020']].map(([v, lb, color]) => {
                  const active = form.categoria_ticket === v
                  return (
                    <button key={v} type="button"
                      onClick={() => { set('categoria_ticket', v); if (v) setLineas(l => l.map(r => ({ ...r, categoria: v }))) }}
                      style={{ padding: '7px 14px', borderRadius: 20, border: `2px solid ${color}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? color : 'white', color: active ? 'white' : color }}>
                      {lb}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={lbl}>Descripción / Concepto general</label>
              <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Resumen del gasto…" style={inp} />
            </div>
          </div>

          {/* ── 2. Detalle de artículos ── */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Artículos del ticket</div>
              <button type="button" onClick={addLinea}
                style={{ padding: '7px 14px', background: '#057642', color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={14} /> Agregar
              </button>
            </div>

            {lineas.length === 0
              ? <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#6B7280' }}>
                  Usa la IA de arriba o agrega líneas manualmente
                </div>
              : <>
                  {/* Tabla scrollable en móvil */}
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: 480 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '72px 2fr 100px 60px 90px 28px', gap: 5, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #BBF7D0' }}>
                        {['Cód.','Artículo','Categoría','Cant.','Precio',''].map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>{h}</div>
                        ))}
                      </div>
                      {lineas.map(l => {
                        const sub = parseFloat(l.cantidad || 1) * parseFloat(l.precio_unit || 0)
                        return (
                          <div key={l._key} style={{ display: 'grid', gridTemplateColumns: '72px 2fr 100px 60px 90px 28px', gap: 5, marginBottom: 6, alignItems: 'center' }}>
                            <input value={l.codigo_proveedor || ''} onChange={e => updLinea(l._key, 'codigo_proveedor', e.target.value)}
                              placeholder="Código" style={{ ...inp, padding: '6px 5px', fontFamily: 'monospace', fontSize: 11 }} />
                            <div>
                              <input value={l.descripcion} onChange={e => updLinea(l._key, 'descripcion', e.target.value)}
                                placeholder="Producto" list={`prod-${l._key}`} style={{ ...inp, padding: '6px 8px', fontSize: 13 }} />
                              <datalist id={`prod-${l._key}`}>{productos.map(p => <option key={p.id} value={p.nombre} />)}</datalist>
                            </div>
                            <select value={l.categoria || ''} onChange={e => updLinea(l._key, 'categoria', e.target.value)}
                              style={{ ...inp, padding: '6px 5px', fontSize: 12 }}>
                              <option value="">—</option>
                              {[['VENDING','Vending'],['OPERACION','Op.'],['MANTENIMIENTO','Mant.']].map(([v,lb]) => <option key={v} value={v}>{lb}</option>)}
                            </select>
                            <input type="number" value={l.cantidad} onChange={e => updLinea(l._key, 'cantidad', e.target.value)}
                              style={{ ...inp, padding: '6px 5px', fontSize: 13 }} min="0" step="0.001" />
                            <div style={{ position: 'relative' }}>
                              <input type="number" value={l.precio_unit} onChange={e => updLinea(l._key, 'precio_unit', e.target.value)}
                                placeholder="0.00" style={{ ...inp, padding: '6px 5px', fontSize: 13 }} min="0" step="0.01" />
                              {sub > 0 && <div style={{ position: 'absolute', right: 4, bottom: -13, fontSize: 9, color: '#6B7280', whiteSpace: 'nowrap' }}>{fmt(sub)}</div>}
                            </div>
                            <button onClick={() => delLinea(l._key)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 2 }}><X size={14} /></button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Totales */}
                  <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px dashed #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 14 }}>
                      <span style={{ color: '#6B7280' }}>Suma: </span>
                      <strong style={{ color: totalOK ? '#057642' : '#B24020' }}>{fmt(sumaLineas)}</strong>
                    </div>
                    {form.ticket_total && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        {totalOK
                          ? <><Check size={15} color="#057642" /><span style={{ color: '#057642', fontWeight: 700 }}>✓ Cuadra</span></>
                          : <><AlertTriangle size={15} color="#B24020" /><span style={{ color: '#B24020', fontWeight: 700 }}>Dif: {fmt(Math.abs(sumaLineas - parseFloat(form.ticket_total)))}</span></>
                        }
                      </div>
                    )}
                  </div>
                </>
            }
          </div>

          {/* Botón guardar — grande para móvil */}
          <button onClick={guardar} disabled={saving}
            style={{ padding: '14px 0', background: saving ? '#9CA3AF' : '#0A66C2', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: saving ? 'default' : 'pointer', width: '100%' }}>
            {saving ? 'Guardando…' : isEdit ? '💾 Guardar cambios' : '💾 Registrar Ticket'}
          </button>
          <div style={{ height: 8 }} /> {/* Espaciado inferior para móvil */}
        </div>
      </div>
    </div>
  )
}
