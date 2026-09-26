// Pruebas de la integración con IwolPark (chat-operativo.js). Las primeras no usan red; la última lee
// IwolPark con su llave pública (solo lectura) y compara contra una suma independiente.
//   node scripts/test-estacionamiento.mjs
import fs from 'fs'
import { resumenEstacionamiento, consultarIwolpark, PARKING_TABLAS, TOOLS_PARKING } from '../netlify/functions/chat-operativo.js'

let total = 0, fallas = 0
const check = (nombre, ok, detalle = '') => { total++; if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${nombre}${!ok && detalle ? '  → ' + detalle : ''}`) }

// Constructor de consultas simulado: from().select().gte().lte().order().range() → filas fijas por tabla
function base(tablas) {
  return { from: t => {
    let filas = [...(tablas[t] || [])]
    const q = {
      select: () => q, eq: (c, v) => (filas = filas.filter(r => r[c] === v), q), neq: () => q,
      gte: (c, v) => (filas = filas.filter(r => String(r[c]) >= v), q), lte: (c, v) => (filas = filas.filter(r => String(r[c]) <= v), q),
      gt: () => q, lt: () => q, ilike: () => q, is: () => q, order: () => q,
      range: (a, b) => (filas = filas.slice(a, b + 1), q), limit: () => q,
      then: (ok, ko) => Promise.resolve({ data: filas, error: null, count: filas.length }).then(ok, ko),
    }
    return q
  } }
}

console.log('\nResumen de ingresos (con datos simulados)')
const tk = (fecha, estatus, importe, cajero = 'Carmen') => ({ fecha_op: fecha, estatus, importe, cajero_salida: cajero })
const pk = base({
  tickets: [tk('2026-09-18', 'cobrado', 30), tk('2026-09-18', 'cobrado', 45, 'Juan'), tk('2026-09-18', 'perdido', 100), tk('2026-09-18', 'cortesia', 0), tk('2026-09-18', 'abierto', 0), tk('2026-09-20', 'cobrado', 60), tk('2026-09-20', 'cerrado_admin', 0)],
  pagos_pension: [{ monto_pagado: 300, estado: 'validado', periodo_mes: 9, fecha_pago: '2026-09-19' }, { monto_pagado: 300, estado: 'pendiente', periodo_mes: 9, fecha_pago: '2026-09-20' }],
  pensiones: [{ monto_mensual: 300, estado: 'activo' }, { monto_mensual: 500, estado: 'activo' }],
})
const irp = base({ estacionamiento_diario: [{ fecha: '2026-09-18', cantidad: 170 }] })
const r = await resumenEstacionamiento(irp, { desde: '2026-09-18', hasta: '2026-09-20' }, pk)
check('ingreso del día = cobrado + perdido (30 + 45 + 100 = 175)', r.por_dia[0].ingreso === 175, r.por_dia[0]?.ingreso)
check('la cortesía y los abiertos no suman', r.por_dia[0].cortesias === 1 && r.por_dia[0].abiertos === 1 && r.por_dia[0].ingreso === 175)
check('el cierre administrativo se cuenta aparte', r.por_dia[2].cerrados_admin === 1 && r.por_dia[2].ingreso === 60)
check('total de la semana = 235', r.total_ingreso === 235, r.total_ingreso)
check('el día sin tickets aparece con su nota (19-sep)', r.por_dia[1].fecha === '2026-09-19' && r.por_dia[1].ingreso === 0 && /sin tickets/.test(r.por_dia[1].nota || '') && r.dias_sin_tickets.includes('2026-09-19'))
check('por cajero de salida', r.por_cajero_de_salida.find(c => c.cajero === 'Juan')?.importe === 45)
check('compara con lo registrado en IRP y da la diferencia (175 vs 170 = 5)', r.por_dia[0].irp_registrado === 170 && r.por_dia[0].diferencia_vs_irp === 5, JSON.stringify(r.por_dia[0]))
check('pensiones: pagos por estado y pensiones activas', r.pensiones.pagos_en_el_rango_por_estado.validado.monto === 300 && r.pensiones.pensiones_activas === 2 && r.pensiones.monto_mensual_de_activas === 800, JSON.stringify(r.pensiones))
check('rango inválido → error', !!(await resumenEstacionamiento(irp, { desde: '2026-09-25', hasta: '2026-09-18' }, pk)).error)
check('más de 92 días → error', /92/.test((await resumenEstacionamiento(irp, { desde: '2026-01-01', hasta: '2026-12-31' }, pk)).error || ''))
check('fecha mal escrita → error', !!(await resumenEstacionamiento(irp, { desde: '18/09/2026', hasta: '24/09/2026' }, pk)).error)

console.log('\nSeguridad: lista blanca de tablas y columnas')
check('la tabla cajeros (trae password_hash) NO está permitida', !('cajeros' in PARKING_TABLAS) && /no permitida/i.test((await consultarIwolpark({ tabla: 'cajeros' }, pk)).error || ''))
check('password_hash NO se puede pedir en ninguna tabla', Object.keys(PARKING_TABLAS).every(t => !PARKING_TABLAS[t].columnas.includes('password') && !PARKING_TABLAS[t].columnas.includes('nip_hash')))
check('codigo_acceso de pensiones NO se puede pedir', /no permitida/i.test((await consultarIwolpark({ tabla: 'pensiones', columnas: 'codigo_acceso' }, pk)).error || ''))
check('pedir una columna fuera de la lista → error', /no permitida/i.test((await consultarIwolpark({ tabla: 'tickets', columnas: 'password_hash' }, pk)).error || ''))
check('filtrar por una columna fuera de la lista → error', !!(await consultarIwolpark({ tabla: 'tickets', filtros: [{ columna: 'cliente_id', op: 'eq', valor: 'x' }] }, pk)).error)
check('una consulta normal a tickets sí funciona', !(await consultarIwolpark({ tabla: 'tickets', filtros: [{ columna: 'estatus', op: 'eq', valor: 'cobrado' }] }, pk)).error)
check('las herramientas no ofrecen escritura (solo lectura por diseño)', TOOLS_PARKING.every(t => !/insert|update|delete|crear|borrar/i.test(t.description)))

console.log('\nIwolPark real (solo lectura, semana del 18 al 24 de septiembre): la función contra una suma independiente')
const toml = fs.readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
const URL_ = toml.match(/VITE_PARKING_URL\s*=\s*"([^"]+)"/)[1], KEY = toml.match(/VITE_PARKING_ANON_KEY\s*=\s*"([^"]+)"/)[1]
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY }
let suma = 0, n = 0
for (let i = 0; ; i += 1000) {
  const rows = await fetch(`${URL_}/rest/v1/tickets?select=importe,estatus&fecha_op=gte.2026-09-18&fecha_op=lte.2026-09-24&estatus=in.(cobrado,perdido)&order=id&limit=1000&offset=${i}`, { headers: H }).then(x => x.json())
  for (const t of rows) suma += Number(t.importe) || 0
  n += rows.length
  if (rows.length < 1000) break
}
const real = await resumenEstacionamiento(base({ estacionamiento_diario: [] }), { desde: '2026-09-18', hasta: '2026-09-24' })
console.log(`  (suma independiente por REST: $${suma.toFixed(2)} en ${n} tickets cobrados/perdidos · la función: $${real.total_ingreso})`)
check('la función coincide con la suma independiente', !real.error && Math.abs(real.total_ingreso - suma) < 0.01, real.error || `${real.total_ingreso} vs ${suma}`)
check('trae los 7 días de la semana', real.por_dia?.length === 7)
check('no expone ningún dato de cajeros más que su nombre de pila y totales', real.por_cajero_de_salida?.every(c => Object.keys(c).sort().join() === 'cajero,importe,tickets'))

console.log(`\n${total - fallas}/${total} pruebas correctas${fallas ? ` — ${fallas} FALLARON` : ''}`)
process.exit(fallas ? 1 : 0)
