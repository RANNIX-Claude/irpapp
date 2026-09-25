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

// Grupos de gasto que ofrece TicketModal. El agente propone uno de estos.
export const GRUPOS_GASTO = [
  'Ferretería y materiales', 'Limpieza e higiene', 'Papelería y oficina',
  'Electricidad', 'Plomería', 'Herramienta y equipo', 'Servicios externos',
  'Vending / Reabasto', 'Mantenimiento', 'Combustible', 'Seguridad', 'Alimentación', 'Nómina / Personal', 'Otros',
]

// Columnas derivadas de la fecha que lleva gastos_operativos.
export function datosFechaGasto(fecha) {
  const dt = new Date(fecha + 'T12:00:00')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return { anio: dt.getFullYear(), mes: MESES[dt.getMonth()], dia_semana: DIAS[dt.getDay()], semana: `S${Math.ceil(dt.getDate() / 7)}` }
}

/**
 * Líneas de categoría VENDING de un ticket → compras en la semana de vending
 * abierta (movimiento + acumulados). Solo aplica a productos que ya existen en
 * vending_productos (por código de proveedor o por nombre); los demás se omiten.
 * Se usa desde TicketModal y desde el Agente Operativo.
 */
export async function integrarVending({ lineas, fecha, proveedor, descripcion }) {
  const lineasVending = lineas.filter(l => l.categoria === 'VENDING' && l.descripcion && l.precio_unit)
  if (!lineasVending.length) return { aplicadas: 0, omitidas: 0 }

  const { data: semana } = await supabase
    .from('vending_semanas').select('id').eq('estado', 'ABIERTA')
    .order('semana_inicio', { ascending: false }).limit(1).single()
  if (!semana) return { aplicadas: 0, omitidas: lineasVending.length, sinSemana: true }

  let aplicadas = 0
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
      semana_id: semana.id, producto_id: vprod.id, fecha, tipo: 'COMPRA',
      cantidad: cant, precio_unitario: precio,
      proveedor: proveedor || null,
      nota: `Desde ticket gastos: ${descripcion || ''}`.trim(),
    })

    await supabase.from('vending_semana_producto').update({
      qty_compras:     (parseFloat(sp.qty_compras) || 0) + cant,
      importe_compras: (parseFloat(sp.importe_compras) || 0) + cant * precio,
      precio_compra_semana: precio,
    }).eq('id', sp.id)
    aplicadas++
  }
  return { aplicadas, omitidas: lineasVending.length - aplicadas }
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
