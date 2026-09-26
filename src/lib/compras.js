import { supabase } from './supabase'
import {
  normNombre, claveProveedor, datosFechaGasto,
  asegurarProveedor as _asegurarProveedor, integrarVending as _integrarVending,
} from './agenteEjecutores'

// La lógica vive en agenteEjecutores.js (compartida con el servidor, que no puede usar
// el cliente del navegador); aquí se conecta al cliente de esta sesión.
export { normNombre, claveProveedor, datosFechaGasto }
export const asegurarProveedor = (datos) => _asegurarProveedor(supabase, datos)
export const integrarVending = (datos) => _integrarVending(supabase, datos)

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

// Grupos de gasto que ofrece TicketModal. El agente propone uno de estos.
export const GRUPOS_GASTO = [
  'Ferretería y materiales', 'Limpieza e higiene', 'Papelería y oficina',
  'Electricidad', 'Plomería', 'Herramienta y equipo', 'Servicios externos',
  'Vending / Reabasto', 'Mantenimiento', 'Combustible', 'Seguridad', 'Alimentación', 'Nómina / Personal', 'Otros',
]

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
