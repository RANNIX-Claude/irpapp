import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Folder, FolderOpen, Receipt, Package, Truck, HardHat, Camera, Merge, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../hooks/useAudit'
import LogoEditable from '../ui/LogoEditable'
import { ImagenPrivada, EnlacePrivado } from '../ui/ArchivoPrivado'
import { AMBITOS, pesos, pesos2, fecha, traerVista } from '../../lib/compras'

/**
 * Expediente navegable de compras, como carpetas:
 *   Proveedor → Tickets · Productos · Proyectos
 *   Ticket    → foto + productos del ticket
 *   Producto  → Tickets · Proveedores
 * Cada clic empuja un nivel; la ruta de arriba (migas) regresa a cualquiera.
 *
 * acciones (opcionales): onEditarProveedor(p), onEditarProducto(p), onCambio()
 */

const th = { padding: '7px 10px', fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, textAlign: 'left', background: '#F9FAFB', position: 'sticky', top: 0 }
const td = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid #F3F4F6' }

const Tile = ({ label, val, color = '#111827' }) => (
  <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', minWidth: 0 }}>
    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 800, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
  </div>
)

function Carpetas({ items, activa, onAbrir }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, margin: '16px 0 12px' }}>
      {items.map(c => {
        const on = activa === c.id
        const Icono = on ? FolderOpen : Folder
        return (
          <button key={c.id} onClick={() => onAbrir(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${on ? c.color : '#E5E7EB'}`, background: on ? c.color + '12' : 'white' }}>
            <Icono size={30} color={c.color} fill={c.color + '33'} strokeWidth={1.6} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: on ? c.color : '#111827' }}>{c.label}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{c.n} {c.sub}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const Vacio = ({ children }) => <div style={{ padding: 28, textAlign: 'center', fontSize: 12.5, color: '#9CA3AF', background: '#F8FAFC', borderRadius: 10 }}>{children}</div>

// Agrupa líneas de ticket (prp_compras_productos) por una llave.
function agrupar(rows, llave, nombre) {
  const m = new Map()
  for (const r of rows) {
    const k = r[llave] || 'sin:' + r[nombre]
    const a = m.get(k) || { k, id: r[llave], nombre: r[nombre] || '—', imagen: r.imagen_url, unidad: r.unidad, clasificacion: r.clasificacion, tickets: new Set(), cantidad: 0, total: 0, ultima: null, ultimoPrecio: null, min: Infinity, max: -Infinity }
    a.tickets.add(r.gasto_id)
    a.cantidad += Number(r.cantidad) || 0
    a.total += Number(r.subtotal) || 0
    const pu = Number(r.precio_unit) || 0
    a.min = Math.min(a.min, pu); a.max = Math.max(a.max, pu)
    if (!a.ultima || r.fecha > a.ultima) { a.ultima = r.fecha; a.ultimoPrecio = pu }
    m.set(k, a)
  }
  return [...m.values()].sort((x, y) => y.total - x.total)
}

// Lista de tickets (gastos). Se usa en proveedor.
function ListaTickets({ tickets, onTicket }) {
  if (!tickets.length) return <Vacio>Sin tickets de este proveedor.</Vacio>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={th}>Fecha</th><th style={th}>Grupo</th><th style={th}>Descripción</th>
        <th style={{ ...th, textAlign: 'center' }}>Productos</th><th style={{ ...th, textAlign: 'center' }}>Foto</th><th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th}></th>
      </tr></thead>
      <tbody>{tickets.map(t => (
        <tr key={t.id} onClick={() => onTicket(t)} style={{ cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
          <td style={{ ...td, whiteSpace: 'nowrap' }}><Receipt size={13} color="#0A66C2" style={{ verticalAlign: -2, marginRight: 6 }} />{fecha(t.fecha)}</td>
          <td style={td}>{t.grupo_gasto || '—'}</td>
          <td style={{ ...td, color: '#6B7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descripcion || '—'}</td>
          <td style={{ ...td, textAlign: 'center', color: t.num_lineas ? '#111827' : '#D1D5DB' }}>{t.num_lineas || '—'}</td>
          <td style={{ ...td, textAlign: 'center' }}>{t.ticket_url ? <Camera size={14} color="#057642" /> : <span style={{ color: '#D1D5DB' }}>—</span>}</td>
          <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(t.ticket_total ?? t.monto)}</td>
          <td style={{ ...td, width: 20 }}><ChevronRight size={14} color="#9CA3AF" /></td>
        </tr>
      ))}</tbody>
    </table>
  )
}

// Mosaico de productos agregados. Se usa en proveedor.
function MosaicoProductos({ prods, onProducto, clasifs }) {
  if (!prods.length) return <Vacio>Todavía no hay tickets con detalle de productos para este proveedor.</Vacio>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
      {prods.map(p => {
        const c = clasifs.find(x => x.clave === p.clasificacion)
        return (
          <div key={p.k} onClick={() => p.id && onProducto(p)} style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', cursor: p.id ? 'pointer' : 'default', background: 'white' }}>
            <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c ? c.color + '12' : '#F8FAFC' }}>
              {p.imagen ? <img src={p.imagen} alt="" style={{ maxHeight: 72, maxWidth: '90%', objectFit: 'contain' }} /> : <Package size={30} color={c?.color || '#CBD5E1'} />}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>{p.nombre}</div>
              {c && <div style={{ fontSize: 10, fontWeight: 700, color: c.color, marginTop: 2 }}>{c.nombre}</div>}
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}><b style={{ color: '#111827' }}>{pesos(p.total)}</b> · {p.tickets.size} ticket{p.tickets.size === 1 ? '' : 's'}</div>
              <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>Últ. {pesos2(p.ultimoPrecio)} · {p.cantidad.toLocaleString('es-MX')} {p.unidad || ''}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Nodo: proveedor ─────────────────────────────────────────────────────────
function NodoProveedor({ id, carpeta, setCarpeta, ir, clasifs, acciones }) {
  const [p, setP] = useState(null)
  const [tickets, setTickets] = useState(null)
  const [prods, setProds] = useState([])
  const [proy, setProy] = useState([])
  const [res, setRes] = useState([])

  const cargar = useCallback(() => {
    supabase.from('cat_proveedores').select('*').eq('id', id).single().then(({ data }) => setP(data))
    traerVista('prp_gastos', q => q.eq('proveedor_id', id).order('fecha', { ascending: false }),
      'id,fecha,grupo_gasto,descripcion,monto,ticket_total,num_lineas,ticket_url,tiene_factura').then(setTickets).catch(() => setTickets([]))
    traerVista('prp_compras_productos', q => q.eq('proveedor_id', id)).then(r => setProds(agrupar(r, 'producto_id', 'producto'))).catch(() => {})
    traerVista('prp_compras', q => q.eq('proveedor_id', id).eq('origen', 'PROYECTO').order('fecha', { ascending: false })).then(setProy).catch(() => {})
    traerVista('prp_compras_resumen', q => q.eq('proveedor_id', id)).then(setRes).catch(() => {})
  }, [id])
  useEffect(() => { cargar() }, [cargar])

  if (!p || !tickets) return <Vacio>Cargando expediente…</Vacio>

  const total = res.reduce((s, r) => s + Number(r.monto || 0), 0)
  const ultima = res.reduce((u, r) => !u || r.ultima_fecha > u ? r.ultima_fecha : u, null)
  const porAmbito = AMBITOS.map(a => ({ ...a, monto: res.filter(r => r.ambito === a.id).reduce((s, r) => s + Number(r.monto || 0), 0) })).filter(a => a.monto)
  const dato = (l, v) => v ? <span style={{ fontSize: 12, color: '#374151' }}><span style={{ color: '#9CA3AF' }}>{l}:</span> {v}</span> : null

  const carpetas = [
    { id: 'tickets', label: 'Tickets', n: tickets.length, sub: 'tickets', color: '#0A66C2' },
    { id: 'productos', label: 'Productos', n: prods.length, sub: 'productos', color: '#057642' },
    ...(proy.length ? [{ id: 'proyectos', label: 'Proyectos', n: proy.length, sub: 'pagos', color: '#E8A020' }] : []),
  ]
  const abierta = carpeta || 'tickets'

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <LogoEditable prefijo="proveedores" tabla="cat_proveedores" columna="logo_url" registroId={p.id} url={p.logo_url} nombre={p.nombre} size={72} redondo={false}
          onSubido={url => { setP(x => ({ ...x, logo_url: url })); acciones?.onCambio?.() }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#111827' }}>{p.nombre}</h2>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.clave}</span>
            {!p.activo && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#FEE2E2', color: '#B24020' }}>INACTIVO</span>}
            {acciones?.onEditarProveedor && <button onClick={() => acciones.onEditarProveedor(p)} style={{ marginLeft: 'auto', padding: '5px 12px', background: '#EFF6FF', color: '#0A66C2', border: '1.5px solid #BFDBFE', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Editar</button>}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
            {dato('RFC', p.rfc)}{dato('Razón social', p.razon_social)}{dato('Contacto', p.contacto)}{dato('Tel', p.telefono)}{dato('Email', p.email)}
          </div>
          {p.alias?.length > 0 && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>También capturado como: {p.alias.map(a => <span key={a} style={{ fontFamily: 'monospace', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, marginRight: 4 }}>{a}</span>)}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
        <Tile label="Total comprado" val={pesos(total)} color="#0A66C2" />
        <Tile label="Compras" val={res.reduce((s, r) => s + r.compras, 0)} />
        <Tile label="Última compra" val={fecha(ultima)} />
      </div>
      {porAmbito.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {porAmbito.map(a => <span key={a.id} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: a.color + '18', color: a.color }}>{a.label}: {pesos(a.monto)}</span>)}
        </div>
      )}

      <Carpetas items={carpetas} activa={abierta} onAbrir={setCarpeta} />

      {abierta === 'tickets' && <ListaTickets tickets={tickets} onTicket={t => ir({ tipo: 'ticket', id: t.id, nombre: 'Ticket ' + fecha(t.fecha) })} />}
      {abierta === 'productos' && <MosaicoProductos prods={prods} clasifs={clasifs} onProducto={x => ir({ tipo: 'producto', id: x.id, nombre: x.nombre })} />}
      {abierta === 'proyectos' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Fecha</th><th style={th}>Proyecto</th><th style={th}>Concepto</th><th style={{ ...th, textAlign: 'right' }}>Monto</th></tr></thead>
          <tbody>{proy.map(x => (
            <tr key={x.registro_id}><td style={{ ...td, whiteSpace: 'nowrap' }}>{fecha(x.fecha)}</td><td style={{ ...td, fontWeight: 600 }}><HardHat size={13} color="#E8A020" style={{ verticalAlign: -2, marginRight: 6 }} />{x.grupo}</td><td style={{ ...td, color: '#6B7280' }}>{x.concepto}</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(x.monto)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

// ─── Nodo: ticket ────────────────────────────────────────────────────────────
function NodoTicket({ id, ir }) {
  const [t, setT] = useState(null)
  const [lineas, setLineas] = useState([])
  useEffect(() => {
    supabase.from('prp_gastos').select('*').eq('id', id).single().then(({ data }) => setT(data))
    traerVista('prp_compras_productos', q => q.eq('gasto_id', id)).then(setLineas).catch(() => {})
  }, [id])

  if (!t) return <Vacio>Cargando ticket…</Vacio>
  const suma = lineas.reduce((s, l) => s + Number(l.subtotal || 0), 0)
  const total = Number(t.ticket_total ?? t.monto) || 0
  const nombreProv = t.proveedor_nombre || t.proveedor_txt || 'Sin proveedor'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <Receipt size={34} color="#0A66C2" strokeWidth={1.6} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Ticket del {fecha(t.fecha)}</h2>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {t.proveedor_id
              ? <span onClick={() => ir({ tipo: 'proveedor', id: t.proveedor_id, nombre: nombreProv })} style={{ color: '#0A66C2', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline dotted' }}><Truck size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{nombreProv}</span>
              : <span style={{ color: '#6B7280' }}>{nombreProv}</span>}
            <span style={{ color: '#9CA3AF' }}> · {t.grupo_gasto || 'Sin grupo'}</span>
            {t.tiene_factura && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: '#D1FAE5', color: '#057642' }}>FACTURA</span>}
          </div>
          {t.descripcion && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{t.descripcion}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>TOTAL</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A66C2' }}>{pesos2(total)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: t.ticket_url ? 'minmax(180px, 260px) 1fr' : '1fr', gap: 16, marginTop: 16 }}>
        {t.ticket_url && (
          <div>
            <ImagenPrivada bucket="tickets-gastos" valor={t.ticket_url} alt="Ticket" style={{ width: '100%', borderRadius: 8, border: '1px solid #E5E7EB', minHeight: 200 }} />
            <EnlacePrivado bucket="tickets-gastos" valor={t.ticket_url} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700, color: '#057642', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ExternalLink size={12} /> Ver foto completa
            </EnlacePrivado>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', marginBottom: 6 }}>Productos del ticket ({lineas.length})</div>
          {!lineas.length ? <Vacio>Este ticket no tiene el detalle de productos capturado.</Vacio> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Producto</th><th style={{ ...th, textAlign: 'right' }}>Cant.</th><th style={{ ...th, textAlign: 'right' }}>Precio</th><th style={{ ...th, textAlign: 'right' }}>Subtotal</th></tr></thead>
              <tbody>{lineas.map(l => (
                <tr key={l.detalle_id} onClick={() => l.producto_id && ir({ tipo: 'producto', id: l.producto_id, nombre: l.producto })} style={{ cursor: l.producto_id ? 'pointer' : 'default' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {l.imagen_url ? <img src={l.imagen_url} alt="" style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 4 }} /> : <Package size={16} color="#CBD5E1" />}
                      <div>
                        <div style={{ fontWeight: 600, color: '#0A66C2' }}>{l.producto || l.descripcion}</div>
                        {l.producto && l.descripcion !== l.producto && <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>{l.descripcion}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{Number(l.cantidad).toLocaleString('es-MX')}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{pesos2(l.precio_unit)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(l.subtotal)}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr>
                <td colSpan={3} style={{ ...td, textAlign: 'right', fontSize: 11, color: '#6B7280', borderBottom: 'none' }}>Suma de productos{Math.abs(suma - total) > 0.5 ? ` (diferencia ${pesos2(total - suma)} contra el total)` : ''}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 800, borderBottom: 'none' }}>{pesos2(suma)}</td>
              </tr></tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Nodo: producto ──────────────────────────────────────────────────────────
function NodoProducto({ id, carpeta, setCarpeta, ir, clasifs, acciones, cerrar }) {
  const [p, setP] = useState(null)
  const [rows, setRows] = useState(null)
  const [fusion, setFusion] = useState(false)
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [destino, setDestino] = useState(null)

  useEffect(() => {
    supabase.from('cat_productos').select('*').eq('id', id).single().then(({ data }) => setP(data))
    traerVista('prp_compras_productos', q => q.eq('producto_id', id).order('fecha', { ascending: false })).then(setRows).catch(() => setRows([]))
  }, [id])

  useEffect(() => {
    if (fusion && !lista.length) supabase.from('cat_productos').select('id,nombre,clave').eq('activo', true).order('nombre').then(({ data }) => setLista(data || []))
  }, [fusion, lista.length])

  if (!p || !rows) return <Vacio>Cargando expediente…</Vacio>

  const c = clasifs.find(x => x.clave === p.categoria)
  const provs = agrupar(rows, 'proveedor_id', 'proveedor')
  const total = rows.reduce((s, r) => s + Number(r.subtotal || 0), 0)
  const cant = rows.reduce((s, r) => s + Number(r.cantidad || 0), 0)
  const mejor = provs.filter(x => x.ultimoPrecio > 0).sort((a, b) => a.ultimoPrecio - b.ultimoPrecio)[0]
  const abierta = carpeta || 'tickets'

  const clasificar = async (clave) => {
    const { error } = await supabase.from('cat_productos').update({ categoria: clave || null }).eq('id', p.id)
    if (error) return toast.error(error.message)
    setP(x => ({ ...x, categoria: clave || null })); acciones?.onCambio?.()
  }

  const fusionar = async () => {
    const { data, error } = await supabase.rpc('fusionar_productos', { p_origen: p.id, p_destino: destino.id })
    if (error) return toast.error(error.message)
    logAudit({ modulo: 'PRODUCTOS', accion: 'EDITAR', entidad: 'producto', entidad_id: destino.id, descripcion: `"${p.nombre}" fusionado en "${destino.nombre}" (${data} líneas de ticket)` })
    toast.success(`Fusionado en "${destino.nombre}"`)
    acciones?.onCambio?.()
    ir({ tipo: 'producto', id: destino.id, nombre: destino.nombre }, true)
  }

  const candidatos = lista.filter(x => x.id !== p.id && (!busca || x.nombre.toLowerCase().includes(busca.toLowerCase()))).slice(0, 30)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <LogoEditable prefijo="productos" tabla="cat_productos" columna="imagen_url" registroId={p.id} url={p.imagen_url} nombre={p.nombre} size={84} redondo={false}
          onSubido={url => { setP(x => ({ ...x, imagen_url: url })); acciones?.onCambio?.() }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>{p.nombre}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <select value={p.categoria || ''} onChange={e => clasificar(e.target.value)} style={{ padding: '4px 8px', border: `1.5px solid ${c?.color || '#F59E0B'}`, borderRadius: 6, fontSize: 12, fontWeight: 700, color: c?.color || '#92400E', background: c ? c.color + '12' : '#FEF3C7', cursor: 'pointer' }}>
              <option value="">Sin clasificar</option>
              {clasifs.filter(x => x.activo || x.clave === p.categoria).map(x => <option key={x.clave} value={x.clave}>{x.nombre}</option>)}
            </select>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.clave}</span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{p.unidad}</span>
            {p.origen === 'TICKET' && <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 4 }}>ALTA DESDE TICKET</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {acciones?.onEditarProducto && <button onClick={() => { cerrar(); acciones.onEditarProducto(p) }} style={{ padding: '5px 12px', background: '#EFF6FF', color: '#0A66C2', border: '1.5px solid #BFDBFE', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Editar</button>}
              <button onClick={() => setFusion(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: '#FFF7ED', color: '#C2410C', border: '1.5px solid #FED7AA', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Merge size={13} /> Fusionar</button>
            </div>
          </div>
          {p.alias?.length > 0 && <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>También llega como: {p.alias.map(a => <span key={a} style={{ fontFamily: 'monospace', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, marginRight: 4 }}>{a}</span>)}</div>}
        </div>
      </div>

      {fusion && (
        <div style={{ marginTop: 12, padding: 12, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#9A3412', marginBottom: 8 }}>Los tickets de <b>{p.nombre}</b> pasan al producto elegido y este nombre queda como alias para los próximos tickets.</div>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar el producto que se queda…" style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #FED7AA', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
          <div style={{ maxHeight: 150, overflow: 'auto', marginTop: 6, background: 'white', borderRadius: 8 }}>
            {candidatos.map(x => (
              <div key={x.id} onClick={() => setDestino(x)} style={{ padding: '7px 10px', fontSize: 12.5, cursor: 'pointer', background: destino?.id === x.id ? '#FFEDD5' : 'white', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: destino?.id === x.id ? 700 : 500 }}>{x.nombre}</span><span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{x.clave}</span>
              </div>
            ))}
          </div>
          <button onClick={fusionar} disabled={!destino} style={{ marginTop: 8, width: '100%', padding: 8, border: 'none', borderRadius: 8, background: '#C2410C', color: 'white', fontWeight: 700, fontSize: 13, cursor: destino ? 'pointer' : 'default', opacity: destino ? 1 : .5 }}>
            {destino ? `Fusionar en "${destino.nombre}"` : 'Elige el producto que se queda'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
        <Tile label="Total comprado" val={pesos(total)} color="#0A66C2" />
        <Tile label="Cantidad" val={cant.toLocaleString('es-MX')} />
        <Tile label="Último precio" val={rows[0] ? pesos2(rows[0].precio_unit) : '—'} />
        <Tile label="Más barato" val={mejor ? `${mejor.nombre} ${pesos2(mejor.ultimoPrecio)}` : '—'} color="#057642" />
      </div>

      <Carpetas activa={abierta} onAbrir={setCarpeta} items={[
        { id: 'tickets', label: 'Tickets', n: new Set(rows.map(r => r.gasto_id)).size, sub: 'tickets', color: '#0A66C2' },
        { id: 'proveedores', label: 'Proveedores', n: provs.length, sub: 'proveedores', color: '#7C3AED' },
      ]} />

      {abierta === 'tickets' && (!rows.length ? <Vacio>Todavía no aparece en ningún ticket.</Vacio> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Fecha</th><th style={th}>Proveedor</th><th style={th}>Como venía en el ticket</th><th style={{ ...th, textAlign: 'right' }}>Cant. × precio</th><th style={{ ...th, textAlign: 'right' }}>Subtotal</th><th style={th}></th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.detalle_id} onClick={() => ir({ tipo: 'ticket', id: r.gasto_id, nombre: 'Ticket ' + fecha(r.fecha) })} style={{ cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <td style={{ ...td, whiteSpace: 'nowrap' }}><Receipt size={13} color="#0A66C2" style={{ verticalAlign: -2, marginRight: 6 }} />{fecha(r.fecha)}</td>
              <td style={{ ...td, fontWeight: 600 }}>{r.proveedor}</td>
              <td style={{ ...td, color: '#9CA3AF' }}>{r.descripcion}</td>
              <td style={{ ...td, textAlign: 'right' }}>{Number(r.cantidad).toLocaleString('es-MX')} × {pesos2(r.precio_unit)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(r.subtotal)}</td>
              <td style={{ ...td, width: 20 }}><ChevronRight size={14} color="#9CA3AF" /></td>
            </tr>
          ))}</tbody>
        </table>
      ))}

      {abierta === 'proveedores' && (!provs.length ? <Vacio>Sin proveedores todavía.</Vacio> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Proveedor</th><th style={{ ...th, textAlign: 'right' }}>Tickets</th><th style={{ ...th, textAlign: 'right' }}>Precio mín–máx</th><th style={{ ...th, textAlign: 'right' }}>Último</th><th style={{ ...th, textAlign: 'right' }}>Total</th><th style={th}></th></tr></thead>
          <tbody>{provs.map(x => (
            <tr key={x.k} onClick={() => x.id && ir({ tipo: 'proveedor', id: x.id, nombre: x.nombre })} style={{ cursor: x.id ? 'pointer' : 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <td style={{ ...td, fontWeight: 700, color: x.id ? '#0A66C2' : '#374151' }}><Truck size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{x.nombre}{x === mejor && <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 800, color: '#057642', background: '#D1FAE5', padding: '1px 6px', borderRadius: 4 }}>MÁS BARATO</span>}</td>
              <td style={{ ...td, textAlign: 'right' }}>{x.tickets.size}</td>
              <td style={{ ...td, textAlign: 'right', color: '#6B7280' }}>{pesos2(x.min)} – {pesos2(x.max)}</td>
              <td style={{ ...td, textAlign: 'right' }}>{pesos2(x.ultimoPrecio)} <span style={{ color: '#9CA3AF', fontSize: 10 }}>{fecha(x.ultima)}</span></td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(x.total)}</td>
              <td style={{ ...td, width: 20 }}>{x.id && <ChevronRight size={14} color="#9CA3AF" />}</td>
            </tr>
          ))}</tbody>
        </table>
      ))}
    </div>
  )
}

// ─── Contenedor con migas ────────────────────────────────────────────────────
const ICONO = { proveedor: Truck, producto: Package, ticket: Receipt }

export default function Expediente({ inicio, onClose, acciones }) {
  const [pila, setPila] = useState([inicio])
  const [clasifs, setClasifs] = useState([])

  useEffect(() => {
    supabase.from('cat_clasificacion_producto').select('*').order('orden').then(({ data }) => setClasifs(data || []))
  }, [])
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const actual = pila[pila.length - 1]
  // reemplazar=true sustituye el nivel actual (tras fusionar, el origen ya no existe)
  const ir = (nodo, reemplazar) => setPila(p => {
    const i = p.findIndex(n => n.tipo === nodo.tipo && n.id === nodo.id)
    if (i >= 0) return p.slice(0, i + 1)          // ya estaba en la ruta: regresa ahí
    return reemplazar ? [...p.slice(0, -1), nodo] : [...p, nodo]
  })
  const setCarpeta = (c) => setPila(p => [...p.slice(0, -1), { ...p[p.length - 1], carpeta: c }])
  const props = { id: actual.id, carpeta: actual.carpeta, setCarpeta, ir, clasifs, acciones, cerrar: onClose }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 980, maxWidth: '100%', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Migas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: '#F8FAFC', flexWrap: 'wrap' }}>
          <button onClick={() => setPila(p => p.slice(0, -1))} disabled={pila.length < 2} title="Atrás"
            style={{ display: 'flex', padding: 5, border: '1px solid #E5E7EB', borderRadius: 6, background: 'white', cursor: pila.length < 2 ? 'default' : 'pointer', opacity: pila.length < 2 ? .35 : 1 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginRight: 4 }}>Expediente</span>
          {pila.map((n, i) => {
            const I = ICONO[n.tipo]
            const ultimo = i === pila.length - 1
            return (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <ChevronRight size={13} color="#CBD5E1" />}
                <span onClick={() => !ultimo && setPila(p => p.slice(0, i + 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: ultimo ? 800 : 600, color: ultimo ? '#111827' : '#0A66C2', cursor: ultimo ? 'default' : 'pointer', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <I size={13} /> {n.nombre || '…'}
                </span>
              </span>
            )
          })}
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          {actual.tipo === 'proveedor' && <NodoProveedor key={actual.id} {...props} />}
          {actual.tipo === 'producto' && <NodoProducto key={actual.id} {...props} />}
          {actual.tipo === 'ticket' && <NodoTicket key={actual.id} {...props} />}
        </div>
      </div>
    </div>
  )
}
