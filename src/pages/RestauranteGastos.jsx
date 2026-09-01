import { useState, useEffect, useCallback, useRef } from 'react'
import { UtensilsCrossed, Plus, X, Search, Pencil, Trash2, ChevronDown, ChevronRight, FileSpreadsheet, Loader2, Images } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import TicketModal from '../components/ui/TicketModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n) => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const fmt2 = (n) => n != null ? '$' + (parseFloat(n)||0).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const GRUPOS_RESTAURANTE = [
  'Ingredientes y alimentos', 'Bebidas', 'Abarrotes', 'Carnes y mariscos',
  'Frutas y verduras', 'Lácteos y derivados', 'Limpieza e higiene', 'Utensilios y equipo',
  'Gas y combustible', 'Empaque y desechables', 'Nómina / Personal', 'Servicios externos',
  'Mantenimiento', 'Papelería y oficina', 'Otros',
]

const GRUPO_COLOR = {
  'Ingredientes y alimentos': '#059669', 'Bebidas': '#0284C7', 'Abarrotes': '#D97706',
  'Carnes y mariscos': '#DC2626', 'Frutas y verduras': '#16a34a', 'Lácteos y derivados': '#7C3AED',
  'Limpieza e higiene': '#0A66C2', 'Utensilios y equipo': '#9333EA',
  'Gas y combustible': '#EA580C', 'Empaque y desechables': '#0891B2',
  'Nómina / Personal': '#4F46E5', 'Servicios externos': '#8B5CF6',
  'Mantenimiento': '#E8A020', 'Papelería y oficina': '#6B7280', 'Otros': '#9CA3AF',
}

const SUPPORTED_IMG = ['image/jpeg','image/png','image/gif','image/webp']

async function fileToB64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      if (!SUPPORTED_IMG.includes(file.type)) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
          canvas.getContext('2d').drawImage(img, 0, 0)
          const jpegUrl = canvas.toDataURL('image/jpeg', 0.92)
          resolve({ b64: jpegUrl.split(',')[1], mtype: 'image/jpeg', preview: jpegUrl })
        }
        img.onerror = () => resolve(null)
        img.src = dataUrl
      } else {
        resolve({ b64: dataUrl.split(',')[1], mtype: file.type, preview: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  })
}

async function ocrizarTicket(b64, mtype) {
  const res = await fetch('/.netlify/functions/gastos-ocr', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_base64: b64, media_type: mtype }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

// ─── Export Excel ──────────────────────────────────────────────────────────────
function exportarExcel(gastos) {
  const rows = [
    ['Fecha','Proveedor','RFC','Folio','Grupo','Descripción','Subtotal','IVA','Total','Factura','Notas'],
    ...gastos.map(g => [
      g.fecha, g.proveedor || '—', g.rfc || '', g.folio || '',
      g.grupo_gasto || '', g.descripcion || '',
      g.subtotal ?? '', g.iva ?? '', g.total ?? '',
      g.tiene_factura ? 'Sí' : 'No', g.notas || '',
    ])
  ]
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `restaurante_gastos_${hoyISO()}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Exportado a CSV')
}

// ─── TicketCard para carga masiva ─────────────────────────────────────────────
function TicketCard({ t, idx, setForm, quitar }) {
  const [showLineas, setShowLineas] = useState(false)
  const ocr = t.ocr || {}
  const prv = ocr.proveedor || {}
  const tkt = ocr.ticket   || {}
  const lineas = ocr.lineas || []
  const ok = t.estado === 'listo' || t.estado === 'error_guardar'

  const parseProvNombre = (val) => {
    if (!val) return ''
    if (typeof val === 'object') return val.nombre_comercial || ''
    if (typeof val === 'string' && val.startsWith('{')) {
      try { return JSON.parse(val)?.nombre_comercial || val } catch { return val }
    }
    return val
  }

  return (
    <div style={{ border:'1.5px solid #E5E7EB', borderRadius:10, marginBottom:14, overflow:'hidden', background: t.estado==='guardado'?'#F0FDF4':'white' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
        <div style={{ flexShrink:0, width:52, height:52, borderRadius:7, overflow:'hidden', background:'#F3F4F6', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {t.preview ? <img src={t.preview} alt="ticket" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <Loader2 size={18} color="#9CA3AF" style={{ animation:'spin 1s linear infinite' }} />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            #{idx+1} {prv.nombre_comercial || parseProvNombre(t.form?.proveedor_nombre) || t.file.name}
          </div>
          {prv.rfc && <div style={{ fontSize:10, color:'#6B7280' }}>RFC: {prv.rfc}</div>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          {t.estado==='leyendo'   && <span style={{ fontSize:10, background:'#EFF6FF', color:'#0A66C2', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>Leyendo…</span>}
          {t.estado==='ocrizando' && <span style={{ fontSize:10, background:'#FFF7ED', color:'#C2410C', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>⏳ IA…</span>}
          {t.estado==='listo'     && <span style={{ fontSize:10, background:'#ECFDF5', color:'#057642', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>✓ Listo</span>}
          {t.estado==='guardado'  && <span style={{ fontSize:10, background:'#DCFCE7', color:'#15803D', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>✅ Guardado</span>}
          {(t.estado==='error'||t.estado==='error_guardar') && <span style={{ fontSize:10, background:'#FEF2F2', color:'#B24020', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>❌ Error</span>}
          <button onClick={() => quitar(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:14 }}>✕</button>
        </div>
      </div>

      {ok && (
        <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Proveedor */}
          <div style={{ background:'#F5F3FF', borderRadius:7, padding:'8px 10px' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#7B5EA7', textTransform:'uppercase', marginBottom:6 }}>🏪 Proveedor</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px' }}>
              {[['Nombre comercial','proveedor_nombre','Nombre visible en ticket'],['RFC','proveedor_rfc',''],['Razón social','proveedor_razon_social',''],['Sucursal','proveedor_sucursal','Ej: Suc. Centro']].map(([lbl,key,ph]) => (
                <div key={key}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#6B7280' }}>{lbl}</label>
                  <input value={t.form[key]||''} onChange={e => setForm(t.id,key,e.target.value)} placeholder={ph}
                    style={{ width:'100%', padding:'4px 7px', border:'1.5px solid #DDD6FE', borderRadius:5, fontSize:12, boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Ticket financiero */}
          <div style={{ background:'#FFFBEB', borderRadius:7, padding:'8px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ fontSize:10, fontWeight:800, color:'#92400E', textTransform:'uppercase' }}>🧾 Ticket</div>
              {tkt.validacion && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:tkt.validacion==='ok'?'#DCFCE7':'#FEF3C7', color:tkt.validacion==='ok'?'#15803D':'#92400E' }}>
                  {tkt.validacion==='ok'?'✔ Totales OK':`⚠ ${tkt.validacion}`}
                </span>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px 10px', marginBottom:8 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#6B7280' }}>Fecha</label>
                <input type="date" value={t.form.fecha||''} onChange={e => setForm(t.id,'fecha',e.target.value)}
                  style={{ width:'100%', padding:'4px 7px', border:'1.5px solid #FDE68A', borderRadius:5, fontSize:12, boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#6B7280' }}>Folio</label>
                <input value={t.form.folio||''} onChange={e => setForm(t.id,'folio',e.target.value)}
                  style={{ width:'100%', padding:'4px 7px', border:'1.5px solid #FDE68A', borderRadius:5, fontSize:12, boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:800, color:'#92400E' }}>TOTAL $</label>
                <input type="number" value={t.form.ticket_total||''} onChange={e => setForm(t.id,'ticket_total',e.target.value)}
                  style={{ width:'100%', padding:'4px 7px', border:'2px solid #F59E0B', borderRadius:5, fontSize:13, fontWeight:800, boxSizing:'border-box', color:'#92400E' }} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px 10px' }}>
              {[['Subtotal','subtotal'],['IVA','iva_monto'],['IEPS','ieps_monto']].map(([lbl,key]) => (
                <div key={key}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#6B7280' }}>{lbl}</label>
                  <input type="number" value={t.form[key]||''} onChange={e => setForm(t.id,key,e.target.value)}
                    style={{ width:'100%', padding:'4px 7px', border:'1.5px solid #FDE68A', borderRadius:5, fontSize:12, boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Artículos */}
          {lineas.length > 0 && (
            <div style={{ border:'1px solid #E5E7EB', borderRadius:7, overflow:'hidden' }}>
              <button onClick={() => setShowLineas(v=>!v)}
                style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'#F9FAFB', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:'#374151' }}>
                <span>📦 {lineas.length} artículo{lineas.length!==1?'s':''}</span>
                {showLineas ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              </button>
              {showLineas && (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr style={{ background:'#F3F4F6' }}>
                        {['SKU','Descripción','Cant.','P/U','Subtotal','Imp.'].map((h,i) => (
                          <th key={h} style={{ padding:'5px 7px', textAlign:i>1?'right':'left', fontSize:9, fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((l,li) => (
                        <tr key={li} style={{ borderTop:'1px solid #F3F4F6', background:li%2===0?'white':'#FAFAFA' }}>
                          <td style={{ padding:'4px 7px', color:'#9CA3AF', fontFamily:'monospace', fontSize:10 }}>{l.sku||'—'}</td>
                          <td style={{ padding:'4px 7px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descripcion}</td>
                          <td style={{ padding:'4px 7px', textAlign:'right' }}>{l.cantidad}</td>
                          <td style={{ padding:'4px 7px', textAlign:'right', fontFamily:'monospace' }}>{fmt2(l.precio_unit)}</td>
                          <td style={{ padding:'4px 7px', textAlign:'right', fontFamily:'monospace', fontWeight:700 }}>{fmt2(l.subtotal_linea ?? (l.cantidad*(l.precio_unit||0)))}</td>
                          <td style={{ padding:'4px 7px', textAlign:'right' }}>
                            {l.tasa_impuesto ? <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, background:'#DBEAFE', color:'#1D4ED8' }}>{l.tasa_impuesto}</span> : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Datos del gasto */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 10px' }}>
            <div>
              <label style={{ fontSize:10, fontWeight:800, color:'#374151' }}>Grupo * <span style={{ color:'#EF4444' }}>requerido</span></label>
              <select value={t.form.grupo_gasto||''} onChange={e => setForm(t.id,'grupo_gasto',e.target.value)}
                style={{ width:'100%', padding:'5px 8px', border:t.form.grupo_gasto?'1.5px solid #E5E7EB':'2px solid #FCA5A5', borderRadius:6, fontSize:12, boxSizing:'border-box', background:'white' }}>
                <option value="">— Seleccionar grupo —</option>
                {GRUPOS_RESTAURANTE.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'#374151' }}>Descripción / Concepto</label>
              <input value={t.form.descripcion||''} onChange={e => setForm(t.id,'descripcion',e.target.value)} placeholder="Opcional"
                style={{ width:'100%', padding:'5px 8px', border:'1.5px solid #E5E7EB', borderRadius:6, fontSize:12, boxSizing:'border-box' }} />
            </div>
          </div>
        </div>
      )}

      {(t.estado==='error'||t.estado==='error_guardar') && (
        <div style={{ padding:'8px 14px', fontSize:12, color:'#B24020' }}>❌ {t.errorMsg}</div>
      )}
    </div>
  )
}

// ─── Modal carga masiva ───────────────────────────────────────────────────────
function ModalCargaMasiva({ onClose, onSaved }) {
  const hoy = hoyISO()
  const [tickets, setTickets] = useState([])
  const [saving, setSaving]   = useState(false)
  const fileRef = useRef()

  const setTicket = (id, patch) => setTickets(prev => prev.map(t => t.id===id ? { ...t, ...patch } : t))
  const setForm   = (id, field, val) => setTickets(prev => prev.map(t => t.id===id ? { ...t, form:{ ...t.form,[field]:val } } : t))
  const quitar    = (id) => setTickets(prev => prev.filter(t => t.id!==id))

  const formDeOcr = (ocr) => {
    const prv = ocr?.proveedor || {}
    const tkt = ocr?.ticket   || {}
    const parseProvNombre = (val) => {
      if (!val) return ''
      if (typeof val === 'object') return val.nombre_comercial || ''
      if (typeof val === 'string' && val.startsWith('{')) { try { return JSON.parse(val)?.nombre_comercial || val } catch { return val } }
      return val
    }
    return {
      fecha: tkt.fecha || ocr?.fecha || hoy,
      folio: tkt.folio || '',
      grupo_gasto: '',
      descripcion: '',
      proveedor_nombre: parseProvNombre(prv.nombre_comercial || prv || ocr?.proveedor_str) || '',
      proveedor_rfc: prv.rfc || '',
      proveedor_razon_social: prv.razon_social || '',
      proveedor_sucursal: prv.nombre_sucursal || '',
      ticket_total: tkt.total != null ? String(tkt.total) : (ocr?.total != null ? String(ocr.total) : ''),
      subtotal: tkt.subtotal || '', iva_monto: tkt.iva_monto || '', ieps_monto: tkt.ieps_monto || '',
    }
  }

  const agregarArchivos = async (files) => {
    const nuevos = Array.from(files).map(f => ({
      id: `${Date.now()}-${Math.random()}`, file: f,
      preview: null, b64: null, mtype: null, estado: 'leyendo', ocr: null,
      form: { fecha:hoy, folio:'', grupo_gasto:'', descripcion:'', proveedor_nombre:'', proveedor_rfc:'', proveedor_razon_social:'', proveedor_sucursal:'', ticket_total:'', subtotal:'', iva_monto:'', ieps_monto:'' },
    }))
    setTickets(prev => [...prev, ...nuevos])
    for (const ticket of nuevos) {
      try {
        const img = await fileToB64(ticket.file)
        if (!img) { setTicket(ticket.id, { estado:'error', errorMsg:'No se pudo leer la imagen' }); continue }
        setTicket(ticket.id, { b64:img.b64, mtype:img.mtype, preview:img.preview, estado:'ocrizando' })
        const ocr = await ocrizarTicket(img.b64, img.mtype)
        if (typeof ocr.proveedor === 'string') ocr.proveedor_str = ocr.proveedor
        setTicket(ticket.id, { ocr, form: formDeOcr(ocr), estado:'listo' })
      } catch (err) {
        setTicket(ticket.id, { estado:'error', errorMsg: err.message })
      }
    }
  }

  const guardarTodos = async () => {
    const pendientes = tickets.filter(t => t.estado==='listo' || t.estado==='error_guardar')
    const sinGrupo   = pendientes.filter(t => !t.form.grupo_gasto)
    if (sinGrupo.length) { toast.error(`${sinGrupo.length} ticket(s) sin grupo asignado`); return }
    setSaving(true)
    for (const t of pendientes) {
      try {
        const fecha = t.form.fecha || hoy
        const dt = new Date(fecha + 'T12:00:00')
        // Subir imagen
        let ticket_url = null
        if (t.b64 && t.mtype) {
          const ext  = t.mtype.split('/')[1] || 'jpg'
          const path = `restaurante/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const buf  = Uint8Array.from(atob(t.b64), c => c.charCodeAt(0))
          const { error: upErr } = await supabase.storage.from('tickets-gastos').upload(path, buf, { contentType:t.mtype })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('tickets-gastos').getPublicUrl(path)
            ticket_url = urlData?.publicUrl || null
          }
        }
        // Insertar gasto
        const { data: inserted, error: gErr } = await supabase.from('restaurante_gastos').insert({
          fecha, mes: dt.getMonth()+1, anio: dt.getFullYear(),
          proveedor: t.form.proveedor_nombre || null,
          razon_social: t.form.proveedor_razon_social || null,
          rfc: t.form.proveedor_rfc || null,
          folio: t.form.folio || null,
          subtotal: t.form.subtotal ? parseFloat(t.form.subtotal) : null,
          iva: t.form.iva_monto ? parseFloat(t.form.iva_monto) : null,
          total: t.form.ticket_total ? parseFloat(t.form.ticket_total) : null,
          ticket_url,
          grupo_gasto: t.form.grupo_gasto,
          descripcion: t.form.descripcion || null,
        }).select('id').single()
        if (gErr) throw gErr
        // Insertar detalle
        const lineas = t.ocr?.lineas || []
        if (lineas.length && inserted?.id) {
          await supabase.from('restaurante_gasto_detalle').insert(
            lineas.map(l => ({
              gasto_id: inserted.id,
              sku: l.sku || null, descripcion: l.descripcion || null,
              cantidad: l.cantidad ?? null, precio_unit: l.precio_unit ?? null,
              subtotal_linea: l.subtotal_linea ?? null, tasa_impuesto: l.tasa_impuesto || null,
            }))
          )
        }
        setTicket(t.id, { estado:'guardado' })
      } catch (err) {
        setTicket(t.id, { estado:'error_guardar', errorMsg: err.message })
      }
    }
    setSaving(false)
    const guardados = tickets.filter(t => t.estado==='guardado').length + pendientes.filter(t=>t.estado==='listo').length
    toast.success(`${guardados} ticket(s) guardados`)
    onSaved()
  }

  const listos    = tickets.filter(t => t.estado==='listo' || t.estado==='error_guardar')
  const guardados = tickets.filter(t => t.estado==='guardado')

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:'20px 0', overflowY:'auto' }}>
      <div style={{ background:'white', borderRadius:14, width:'min(760px,96vw)', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid #E5E7EB', background:'#F0FDF4', borderRadius:'14px 14px 0 0' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:16, color:'#15803D' }}>🍽️ Importar Tickets — Restaurante</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>Carga masiva con OCR · IA extrae datos automáticamente</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}><X size={20}/></button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={e => { e.preventDefault(); agregarArchivos(e.dataTransfer.files) }}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{ margin:'16px 22px 0', border:'2px dashed #86EFAC', borderRadius:10, padding:'22px', textAlign:'center', cursor:'pointer', background:'#F0FDF4' }}>
          <Images size={28} color="#16a34a" style={{ margin:'0 auto 8px' }} />
          <div style={{ fontSize:13, fontWeight:700, color:'#15803D' }}>Arrastra imágenes de tickets o haz clic</div>
          <div style={{ fontSize:11, color:'#6B7280', marginTop:4 }}>JPG, PNG, WebP — puedes seleccionar múltiples</div>
          <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:'none' }} onChange={e => agregarArchivos(e.target.files)} />
        </div>

        {/* Lista de tickets */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 22px' }}>
          {tickets.length === 0 && (
            <div style={{ textAlign:'center', color:'#9CA3AF', padding:'30px 0', fontSize:13 }}>Sin tickets cargados</div>
          )}
          {tickets.map((t, idx) => (
            <TicketCard key={t.id} t={t} idx={idx} setForm={setForm} quitar={quitar} />
          ))}
        </div>

        {/* Footer */}
        {tickets.length > 0 && (
          <div style={{ borderTop:'1px solid #E5E7EB', padding:'14px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#F9FAFB' }}>
            <div style={{ fontSize:12, color:'#6B7280' }}>
              {listos.length} listo(s) · {guardados.length} guardado(s) · {tickets.length} total
            </div>
            <button onClick={guardarTodos} disabled={saving || listos.length===0}
              style={{ padding:'10px 24px', background:saving||listos.length===0?'#9CA3AF':'#15803D', color:'white', border:'none', borderRadius:9, fontWeight:800, fontSize:14, cursor:saving||listos.length===0?'not-allowed':'pointer' }}>
              {saving ? 'Guardando…' : `Guardar ${listos.length} ticket(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RestauranteGastos() {
  const [gastos, setGastos]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('TODOS')
  const [mesFilter, setMesFilter]   = useState('')
  const [modal, setModal]           = useState(null) // 'masivo' | 'individual'
  const [detalle, setDetalle]       = useState(null) // { gasto, lineas }
  const [lightbox, setLightbox]     = useState(null)
  const [editando, setEditando]     = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('restaurante_gastos').select('*').order('fecha', { ascending:false })
    if (mesFilter) {
      const [y, m] = mesFilter.split('-')
      q = q.eq('mes', parseInt(m)).eq('anio', parseInt(y))
    }
    const { data, error } = await q.limit(500)
    if (error) toast.error(error.message)
    setGastos(data || [])
    setLoading(false)
  }, [mesFilter])

  useEffect(() => { cargar() }, [cargar])

  const abrirDetalle = async (g) => {
    setDetalle({ gasto: g, lineas: [] })
    const { data } = await supabase.from('restaurante_gasto_detalle').select('*').eq('gasto_id', g.id).order('created_at')
    setDetalle({ gasto: g, lineas: data || [] })
  }

  const eliminar = async (g) => {
    if (!window.confirm(`¿Eliminar gasto de ${g.proveedor || 'proveedor'} por ${fmt(g.total)}?`)) return
    const { error } = await supabase.from('restaurante_gastos').delete().eq('id', g.id)
    if (error) toast.error(error.message)
    else { toast.success('Gasto eliminado'); cargar() }
  }

  const filtrados = gastos.filter(g => {
    const q = search.toLowerCase()
    const matchQ = !q || (g.proveedor||'').toLowerCase().includes(q) || (g.grupo_gasto||'').toLowerCase().includes(q) || (g.descripcion||'').toLowerCase().includes(q) || (g.folio||'').toLowerCase().includes(q)
    const matchG = filtroGrupo === 'TODOS' || g.grupo_gasto === filtroGrupo
    return matchQ && matchG
  })

  const totalFiltrado = filtrados.reduce((a,g) => a + (parseFloat(g.total)||0), 0)

  const S = {
    header: { padding:'18px 24px 14px', borderBottom:'1px solid #E5E7EB', background:'white' },
    pageTitle: { fontWeight:900, fontSize:20, color:'#1A3C5E', display:'flex', alignItems:'center', gap:8 },
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#F8FAFC' }}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={S.pageTitle}><UtensilsCrossed size={20} color="#15803D"/> Restaurante — Gastos</div>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>Registro y seguimiento de gastos operativos del restaurante · OCR con IA</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => exportarExcel(filtrados)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#15803D', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <FileSpreadsheet size={14}/> Exportar Excel
            </button>
            <button onClick={() => setModal('individual')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#0A66C2', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <Plus size={14}/> Ticket individual
            </button>
            <button onClick={() => setModal('masivo')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#1A3C5E', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <Images size={14}/> Carga masiva
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:10, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor, grupo, folio…"
              style={{ paddingLeft:28, padding:'7px 10px 7px 28px', border:'1.5px solid #E5E7EB', borderRadius:7, fontSize:12, width:240, outline:'none', boxSizing:'border-box' }} />
          </div>
          <input type="month" value={mesFilter} onChange={e => setMesFilter(e.target.value)}
            style={{ padding:'7px 10px', border:'1.5px solid #E5E7EB', borderRadius:7, fontSize:12, outline:'none' }} />
          <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
            style={{ padding:'7px 10px', border:'1.5px solid #E5E7EB', borderRadius:7, fontSize:12, outline:'none', background:'white' }}>
            <option value="TODOS">Todos los grupos</option>
            {GRUPOS_RESTAURANTE.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {(search||filtroGrupo!=='TODOS'||mesFilter) && (
            <button onClick={() => { setSearch(''); setFiltroGrupo('TODOS'); setMesFilter('') }}
              style={{ padding:'6px 12px', background:'#F3F4F6', border:'none', borderRadius:7, fontSize:12, cursor:'pointer', color:'#6B7280' }}>
              Limpiar filtros
            </button>
          )}
          <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:'#15803D', fontFamily:'monospace' }}>
            Total: {fmt(totalFiltrado)} ({filtrados.length} registros)
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflowY:'auto', padding:'0' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#9CA3AF', fontSize:14 }}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>
            <UtensilsCrossed size={40} style={{ margin:'0 auto 12px', opacity:0.3 }} />
            <div style={{ fontSize:14, fontWeight:600 }}>Sin gastos registrados</div>
            <div style={{ fontSize:12, marginTop:4 }}>Usa "Ticket individual" o "Carga masiva" para agregar gastos</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead style={{ position:'sticky', top:0, zIndex:10 }}>
              <tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Fecha','Proveedor','Folio','Grupo','Total','Ticket','Factura',''].map((h,i) => (
                  <th key={h+i} style={{ padding:'9px 10px', textAlign:i>=4&&i!==6?'right':i===6?'center':'left', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((g, i) => (
                <>
                  <tr key={g.id} onClick={() => abrirDetalle(detalle?.gasto?.id===g.id ? null : g)}
                    style={{ borderBottom:'1px solid #F3F4F6', background:detalle?.gasto?.id===g.id?'#F0FDF4':i%2===0?'white':'#FAFAFA', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background=detalle?.gasto?.id===g.id?'#F0FDF4':i%2===0?'white':'#FAFAFA'}>
                    <td style={{ padding:'7px 10px', color:'#6B7280', whiteSpace:'nowrap' }}>{g.fecha?.slice(5).replace('-','/')}</td>
                    <td style={{ padding:'7px 10px', fontWeight:600, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.proveedor||'—'}</td>
                    <td style={{ padding:'7px 10px', color:'#6B7280', fontFamily:'monospace', fontSize:11 }}>{g.folio||'—'}</td>
                    <td style={{ padding:'7px 10px' }}>
                      {g.grupo_gasto && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:(GRUPO_COLOR[g.grupo_gasto]||'#6B7280')+'18', color:GRUPO_COLOR[g.grupo_gasto]||'#6B7280', whiteSpace:'nowrap' }}>
                          {g.grupo_gasto}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'7px 10px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:'#0A66C2' }}>{fmt(g.total)}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right' }} onClick={e => e.stopPropagation()}>
                      {g.ticket_url
                        ? <button onClick={() => setLightbox(g.ticket_url)}
                            style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:5, padding:'3px 7px', cursor:'pointer', color:'#0A66C2', fontSize:10, fontWeight:700 }}>🖼️</button>
                        : <span style={{ fontSize:10, color:'#D1D5DB' }}>—</span>}
                    </td>
                    <td style={{ padding:'7px 10px', textAlign:'center' }}>
                      {g.tiene_factura ? <span style={{ color:'#057642', fontSize:13 }}>✓</span> : <span style={{ color:'#D1D5DB', fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ padding:'7px 10px', textAlign:'right' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => eliminar(g)} style={{ background:'#FEF2F2', border:'none', borderRadius:5, padding:'4px 7px', cursor:'pointer', color:'#B24020' }}><Trash2 size={12}/></button>
                    </td>
                  </tr>
                  {/* Detalle expandido */}
                  {detalle?.gasto?.id === g.id && (
                    <tr key={`det-${g.id}`}>
                      <td colSpan={8} style={{ padding:'12px 16px', background:'#F0FDF4', borderBottom:'2px solid #86EFAC' }}>
                        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                          {/* Info del gasto */}
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:11, fontWeight:800, color:'#15803D', marginBottom:8, textTransform:'uppercase' }}>Detalle del gasto</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px 16px', fontSize:11, marginBottom:10 }}>
                              <div><span style={{ color:'#9CA3AF' }}>Proveedor: </span><strong>{g.proveedor||'—'}</strong></div>
                              <div><span style={{ color:'#9CA3AF' }}>RFC: </span><span style={{ fontFamily:'monospace' }}>{g.rfc||'—'}</span></div>
                              <div><span style={{ color:'#9CA3AF' }}>Razón social: </span>{g.razon_social||'—'}</div>
                              <div><span style={{ color:'#9CA3AF' }}>Subtotal: </span><span style={{ fontFamily:'monospace' }}>{g.subtotal!=null?fmt(g.subtotal):'—'}</span></div>
                              <div><span style={{ color:'#9CA3AF' }}>IVA: </span><span style={{ fontFamily:'monospace' }}>{g.iva!=null?fmt(g.iva):'—'}</span></div>
                              <div><span style={{ color:'#9CA3AF' }}>Total: </span><strong style={{ fontFamily:'monospace', color:'#15803D' }}>{fmt(g.total)}</strong></div>
                            </div>
                            {/* Artículos */}
                            {detalle.lineas.length > 0 && (
                              <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                                  <thead>
                                    <tr style={{ background:'#DCFCE7' }}>
                                      {['SKU','Descripción','Cant.','Precio unit.','Subtotal','Impuesto'].map((h,idx2) => (
                                        <th key={h} style={{ padding:'5px 8px', textAlign:idx2>1?'right':'left', fontSize:10, fontWeight:700, color:'#15803D' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalle.lineas.map((l, li) => (
                                      <tr key={li} style={{ borderTop:'1px solid #BBF7D0', background:li%2===0?'white':'#F0FDF4' }}>
                                        <td style={{ padding:'4px 8px', fontFamily:'monospace', fontSize:10, color:'#9CA3AF' }}>{l.sku||'—'}</td>
                                        <td style={{ padding:'4px 8px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.descripcion}</td>
                                        <td style={{ padding:'4px 8px', textAlign:'right' }}>{l.cantidad}</td>
                                        <td style={{ padding:'4px 8px', textAlign:'right', fontFamily:'monospace' }}>{fmt2(l.precio_unit)}</td>
                                        <td style={{ padding:'4px 8px', textAlign:'right', fontFamily:'monospace', fontWeight:700 }}>{fmt2(l.subtotal_linea)}</td>
                                        <td style={{ padding:'4px 8px', textAlign:'right' }}>
                                          {l.tasa_impuesto?<span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:3, background:'#DBEAFE', color:'#1D4ED8' }}>{l.tasa_impuesto}</span>:'—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {detalle.lineas.length === 0 && <div style={{ fontSize:11, color:'#9CA3AF', fontStyle:'italic' }}>Sin detalle de artículos</div>}
                          </div>
                          {/* Imagen del ticket */}
                          {g.ticket_url && (
                            <div style={{ flexShrink:0, width:160, background:'white', border:'1.5px solid #BBF7D0', borderRadius:10, padding:8 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:'#15803D', marginBottom:4 }}>🖼️ Ticket</div>
                              <img src={g.ticket_url} alt="ticket" style={{ width:'100%', maxHeight:220, objectFit:'contain', cursor:'pointer', borderRadius:6 }}
                                onClick={() => setLightbox(g.ticket_url)} />
                              <a href={g.ticket_url} target="_blank" rel="noreferrer" style={{ fontSize:10, color:'#0A66C2', display:'block', marginTop:4, textAlign:'center' }}>Ver completo ↗</a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'#1A3C5E' }}>
                <td colSpan={4} style={{ padding:'10px', color:'white', fontWeight:800, fontSize:12, textTransform:'uppercase' }}>
                  Total ({filtrados.length} gastos)
                </td>
                <td style={{ padding:'10px', textAlign:'right', color:'#E8A020', fontWeight:900, fontSize:16, fontFamily:'monospace' }}>
                  {fmt(totalFiltrado)}
                </td>
                <td colSpan={3}/>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Modales */}
      {modal === 'masivo' && (
        <ModalCargaMasiva onClose={() => setModal(null)} onSaved={() => { setModal(null); cargar() }} />
      )}
      {modal === 'individual' && (
        <TicketModal
          tabla="restaurante_gastos"
          tablaDetalle="restaurante_gasto_detalle"
          storagePrefix="restaurante"
          gruposLista={GRUPOS_RESTAURANTE}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar() }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="ticket" style={{ maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} />
          <button onClick={() => setLightbox(null)} style={{ position:'absolute', top:20, right:20, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:50, width:36, height:36, cursor:'pointer', color:'white', fontSize:18 }}>✕</button>
        </div>
      )}
    </div>
  )
}
