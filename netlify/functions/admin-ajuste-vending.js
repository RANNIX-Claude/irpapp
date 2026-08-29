// admin-ajuste-vending.js — Función temporal para ajustar ventas de semana vending
// Uso: POST /.netlify/functions/admin-ajuste-vending
// Body: { secret: "irp-admin-2026", accion: "consultar" | "insertar", semana_inicio: "2026-08-15", target_pesos: 758 }
// ELIMINAR después de usar

import { createClient } from '@supabase/supabase-js'

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://kusuoxwzdxfuybvyiakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, body: 'JSON inválido' } }

  const { secret, accion, semana_inicio = '2026-08-15', target_pesos = 758 } = body

  if (secret !== SECRET) return { statusCode: 403, body: 'Acceso denegado' }

  const headers = { 'Content-Type': 'application/json' }

  // ── CONSULTAR: muestra el estado actual ───────────────────────────────────
  if (accion === 'consultar') {
    const { data: semana } = await supabase
      .from('vending_semanas')
      .select('id, fecha_inicio, fecha_fin, estado, venta_pesos, venta_unidades')
      .eq('fecha_inicio', semana_inicio)
      .single()

    const { data: productos } = await supabase
      .from('vending_productos')
      .select('id, producto, precio_venta, activo')
      .eq('activo', true)
      .order('producto')

    const { data: movimientos } = semana ? await supabase
      .from('vending_movimientos')
      .select('tipo, cantidad, precio_unitario, producto_id')
      .eq('semana_id', semana.id) : { data: [] }

    const totalActual = (movimientos || [])
      .filter(m => m.tipo === 'VENTA')
      .reduce((s, m) => s + (m.cantidad * m.precio_unitario), 0)

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ semana, productos, movimientos, totalActual }, null, 2)
    }
  }

  // ── INSERTAR: distribuye target_pesos entre productos activos ─────────────
  if (accion === 'insertar') {
    const { data: semana, error: errSem } = await supabase
      .from('vending_semanas')
      .select('id, fecha_inicio, fecha_fin, estado, venta_pesos')
      .eq('fecha_inicio', semana_inicio)
      .single()

    if (errSem || !semana) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Semana no encontrada', detalle: errSem }) }
    if (semana.estado !== 'ABIERTA') return { statusCode: 400, headers, body: JSON.stringify({ error: `Semana en estado ${semana.estado}, debe estar ABIERTA` }) }

    const { data: productos } = await supabase
      .from('vending_productos')
      .select('id, producto, precio_venta')
      .eq('activo', true)
      .order('precio_venta', { ascending: false })

    if (!productos?.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Sin productos activos' }) }

    // ── Algoritmo greedy: distribuye target_pesos entre productos ──────────
    // Ordena por precio desc, asigna cantidades enteras, el sobrante al más barato
    let restante = Math.round(target_pesos * 100)  // centavos para evitar flotantes
    const distribucion = []

    // Filtrar solo productos con precio > 0
    const prods = productos.filter(p => parseFloat(p.precio_venta) > 0)

    // Repartir aproximadamente igual entre todos los productos con precio
    const precioCentavos = prods.map(p => Math.round(parseFloat(p.precio_venta) * 100))
    const porProducto    = Math.floor((restante / prods.length) / precioCentavos[0]) || 1

    for (let i = 0; i < prods.length && restante > 0; i++) {
      const p     = prods[i]
      const pc    = Math.round(parseFloat(p.precio_venta) * 100)
      if (pc === 0) continue
      // Cuántas unidades caben con la parte proporcional
      let cant = Math.floor(restante / pc / (prods.length - i))
      if (cant === 0 && i === prods.length - 1) cant = Math.floor(restante / pc)  // último producto toma el sobrante
      if (cant === 0) continue
      // Ajustar si nos pasamos
      const subtotal = cant * pc
      if (subtotal > restante) cant = Math.floor(restante / pc)
      if (cant === 0) continue
      distribucion.push({ prod: p, cant, subtotal: cant * pc })
      restante -= cant * pc
    }

    // Si queda restante > 0 y hay un primer producto que lo puede absorber
    if (restante > 0 && prods.length > 0) {
      const p  = prods[prods.length - 1]  // el más barato (precio más bajo)
      const pc = Math.round(parseFloat(p.precio_venta) * 100)
      if (pc > 0) {
        const cantExtra = Math.floor(restante / pc)
        if (cantExtra > 0) {
          const existing = distribucion.find(d => d.prod.id === p.id)
          if (existing) { existing.cant += cantExtra; existing.subtotal += cantExtra * pc }
          else distribucion.push({ prod: p, cant: cantExtra, subtotal: cantExtra * pc })
          restante -= cantExtra * pc
        }
      }
    }

    const totalCalculado = distribucion.reduce((s, d) => s + d.subtotal, 0) / 100
    const fecha          = semana.fecha_fin  // registrar al último día de la semana

    // Insertar movimientos y actualizar snapshots
    const resumen = []
    for (const d of distribucion) {
      const cant   = d.cant
      const precio = parseFloat(d.prod.precio_venta)

      // Buscar o crear vending_semana_producto
      let { data: sp } = await supabase
        .from('vending_semana_producto')
        .select('*')
        .eq('semana_id', semana.id)
        .eq('producto_id', d.prod.id)
        .single()

      if (!sp) {
        const { data: ins } = await supabase.from('vending_semana_producto').insert({
          semana_id: semana.id, producto_id: d.prod.id,
          qty_inicial: 0, qty_compras: 0, qty_ventas: 0,
          precio_venta_semana: precio, precio_compra_semana: 0,
          importe_ventas: 0, importe_compras: 0,
        }).select('*').single()
        sp = ins
      }

      // Insertar movimiento VENTA
      await supabase.from('vending_movimientos').insert({
        semana_id:        semana.id,
        producto_id:      d.prod.id,
        semana_producto_id: sp.id,
        fecha,
        tipo:             'VENTA',
        cantidad:         cant,
        precio_unitario:  precio,
        nota:             'Ajuste semana 15-21 Ago',
      })

      // Actualizar snapshot
      await supabase.from('vending_semana_producto').update({
        qty_ventas:    (parseFloat(sp.qty_ventas)    || 0) + cant,
        importe_ventas:(parseFloat(sp.importe_ventas) || 0) + cant * precio,
      }).eq('id', sp.id)

      resumen.push({ producto: d.prod.producto, cantidad: cant, precio_unitario: precio, subtotal: cant * precio })
    }

    // Recalcular vending_semanas totals
    const { data: tots } = await supabase
      .from('vending_semana_producto')
      .select('importe_ventas, qty_ventas')
      .eq('semana_id', semana.id)

    const totV = (tots || []).reduce((s, r) => s + (parseFloat(r.importe_ventas) || 0), 0)
    const totU = (tots || []).reduce((s, r) => s + (parseFloat(r.qty_ventas) || 0), 0)

    await supabase.from('vending_semanas').update({ venta_pesos: totV, venta_unidades: totU }).eq('id', semana.id)

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: true,
        target:          target_pesos,
        totalInsertado:  totalCalculado,
        diferencia:      +(target_pesos - totalCalculado).toFixed(2),
        resumen,
        nota: restante > 0 ? `Diferencia de $${(restante/100).toFixed(2)} — precio mínimo mayor al sobrante` : 'Distribución exacta',
      }, null, 2)
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'accion debe ser consultar o insertar' }) }
}
