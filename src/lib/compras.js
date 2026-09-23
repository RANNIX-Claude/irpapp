import { supabase } from './supabase'

export const AMBITOS = [
  { id: 'OPERACION', label: 'Operación', color: '#057642' },
  { id: 'VENDING',   label: 'Vending',   color: '#EC4899' },
  { id: 'PROYECTOS', label: 'Proyectos', color: '#E8A020' },
]

export const pesos = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const pesos2 = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fecha = (f) => f ? new Date(f + (String(f).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Misma normalización que proveedor_norm() en la base.
export const normNombre = (s) => (s || '')
  .toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z0-9]/g, '')

// Clave obligatoria y única para un proveedor dado de alta desde un ticket.
export const claveProveedor = (nombre) =>
  normNombre(nombre).slice(0, 16) + '_' + Date.now().toString(36).slice(-4).toUpperCase()

/**
 * Busca el proveedor en el catálogo (el trigger ya lo intentó por nombre/alias);
 * si no existe, lo da de alta con los datos del ticket. Devuelve su id o null.
 */
export async function asegurarProveedor({ nombre, rfc, razon_social }) {
  const n = (nombre || razon_social || '').trim()
  if (!n) return null
  if (rfc) {
    const { data } = await supabase.from('cat_proveedores').select('id').eq('rfc', rfc.toUpperCase()).limit(1)
    if (data?.[0]) return data[0].id
  }
  const { data, error } = await supabase.from('cat_proveedores').insert({
    nombre: n, clave: claveProveedor(n), activo: true,
    rfc: rfc ? rfc.toUpperCase() : null, razon_social: razon_social || null,
  }).select('id').single()
  return error ? null : data.id
}

/**
 * PostgREST corta en 1000 filas por respuesta: pide en bloques hasta vaciar.
 * `armar` recibe un query builder nuevo en cada vuelta.
 */
export async function traerTodo(armar, bloque = 1000) {
  const filas = []
  for (let desde = 0; ; desde += bloque) {
    const { data, error } = await armar().range(desde, desde + bloque - 1)
    if (error) throw error
    filas.push(...(data || []))
    if (!data || data.length < bloque) break
  }
  return filas
}

export const traerVista = (vista, filtrar = q => q, cols = '*') =>
  traerTodo(() => filtrar(supabase.from(vista).select(cols)))

// Agrupa líneas de ticket (prp_compras_productos) por producto o por proveedor.
export function agrupar(rows, llave, nombre) {
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
