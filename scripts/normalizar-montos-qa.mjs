/**
 * normalizar-montos-qa.mjs
 * Normaliza los montos en QA para facilitar pruebas de suma:
 *   - contratos.renta_mensual       → $10,000
 *   - contratos.deposito_garantia   → $20,000 (2 meses)
 *   - cargos_programados.monto      → $10,000 (los ya existentes)
 *   - gastos_operativos.monto       → $100
 *
 * Uso: node scripts/normalizar-montos-qa.mjs
 */

import fs from 'fs'
import pg from 'pg'

const envText = fs.readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local', 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const db = new pg.Client({
  host:     'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: env.QA_SUPABASE_DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
})

await db.connect()

// ── 1. contratos ────────────────────────────────────────────────────────────
const { rowCount: rc1 } = await db.query(`
  UPDATE public.contratos
  SET    renta_mensual     = 10000,
         deposito_garantia = 20000
  WHERE  estatus NOT IN ('CANCELADO','RESCISION')
`)
console.log(`contratos actualizados          : ${rc1}`)

// ── 2. cargos_programados (columna: importe) ────────────────────────────────
const { rowCount: rc2 } = await db.query(`
  UPDATE public.cargos_programados
  SET    importe = 10000
  WHERE  concepto ILIKE '%renta%'
     OR  concepto ILIKE '%mensualidad%'
     OR  concepto ILIKE '%cargo%'
`)
console.log(`cargos_programados actualizados  : ${rc2}`)

// ── 3. gastos_operativos — todas las columnas de dinero a $100 ───────────────
//   · cantidad        = IMPORTE visible en Resumen Semanal / Gastos Operativos
//   · ticket_total    = monto del comprobante escaneado
//   · monto_pagado    = lo que se pagó
//   · monto_comprobante = monto del ticket adjunto
const { rowCount: rc3 } = await db.query(`
  UPDATE public.gastos_operativos
  SET    cantidad          = 100,
         ticket_total      = 100,
         monto_pagado      = 100,
         monto_comprobante = 100
`)
console.log(`gastos_operativos actualizados   : ${rc3}`)

// ── 3b. gasto_detalle — 10 líneas × $10 por gasto ───────────────────────────
//   precio_unit = $10, cantidad = 1, subtotal = $10
//   Así cada línea es exactamente $10 y el total del gasto sigue siendo $100
// subtotal es columna generada (precio_unit * cantidad) — solo tocar las base
const { rowCount: rc3b } = await db.query(`
  UPDATE public.gasto_detalle
  SET    precio_unit = 10,
         cantidad    = 1
`)
console.log(`gasto_detalle normalizado        : ${rc3b} líneas → $10 c/u (subtotal generado auto)`)

// ── 4. aplicaciones_pago PRIMERO — el trigger en ingresos valida que
//       importe >= suma(importe_aplicado), así que hay que bajar aplicaciones
//       antes de bajar ingresos, no al revés.
const { rowCount: rc4 } = await db.query(`
  UPDATE public.aplicaciones_pago ap
  SET    importe_aplicado = 10000
  FROM   public.ingresos i
  WHERE  ap.ingreso_id = i.id
    AND  i.tipo = 'RENTA'
`)
console.log(`aplicaciones_pago normalizadas   : ${rc4}`)

// ── 5. ingresos (columna: importe) — ahora sí, sin violar el trigger ─────────
const { rowCount: rc5 } = await db.query(`
  UPDATE public.ingresos
  SET    importe = 10000
  WHERE  tipo = 'RENTA'
`)
console.log(`ingresos RENTA normalizados      : ${rc5}`)

// ── 6. resumen de verificación ──────────────────────────────────────────────
const { rows: resumen } = await db.query(`
  SELECT
    (SELECT COUNT(*) FROM public.contratos WHERE estatus NOT IN ('CANCELADO','RESCISION'))           AS contratos_activos,
    (SELECT SUM(renta_mensual) FROM public.contratos WHERE estatus NOT IN ('CANCELADO','RESCISION')) AS suma_rentas,
    (SELECT COUNT(*) FROM public.cargos_programados WHERE importe = 10000)                           AS cargos_en_10k,
    (SELECT COUNT(*) FROM public.ingresos WHERE tipo='RENTA')                                        AS ingresos_renta,
    (SELECT SUM(importe) FROM public.ingresos WHERE tipo='RENTA')                                    AS suma_cobrado,
    (SELECT COUNT(*) FROM public.aplicaciones_pago)                                                  AS total_aplicaciones,
    (SELECT SUM(importe_aplicado) FROM public.aplicaciones_pago)                                     AS suma_aplicado,
    (SELECT COUNT(*) FROM public.gastos_operativos)                                                  AS total_tickets,
    (SELECT SUM(cantidad) FROM public.gastos_operativos)                                             AS suma_importe_gasto,
    (SELECT SUM(ticket_total) FROM public.gastos_operativos)                                         AS suma_tickets,
    (SELECT COUNT(*) FROM public.gasto_detalle)                                                      AS total_detalle,
    (SELECT SUM(subtotal) FROM public.gasto_detalle)                                                 AS suma_detalle
`)
const r = resumen[0]
const nContratos     = Number(r.contratos_activos)
const nIngresosRenta = Number(r.ingresos_renta)
const nAplicaciones  = Number(r.total_aplicaciones)
const nTickets       = Number(r.total_tickets)

console.log('\n── Verificación ─────────────────────────────────────────────────────')
console.log(`Contratos activos                : ${nContratos}`)
console.log(`Suma rentas mensuales            : $${Number(r.suma_rentas).toLocaleString('es-MX')}`)
console.log(`  → esperado: N × $10,000`)
console.log(`Cargos programados a $10k        : ${r.cargos_en_10k}`)
console.log(`Ingresos RENTA normalizados      : ${nIngresosRenta}`)
console.log(`Suma cobrado (ingresos RENTA)    : $${Number(r.suma_cobrado).toLocaleString('es-MX')}`)
console.log(`  → esperado: ${nIngresosRenta} × $10,000 = $${(nIngresosRenta * 10000).toLocaleString('es-MX')}`)
console.log(`  → ¿cuadra? ${Number(r.suma_cobrado) === nIngresosRenta * 10000 ? '✅ SÍ' : '❌ NO'}`)
console.log(`Aplicaciones de pago             : ${nAplicaciones}`)
console.log(`Suma importe_aplicado            : $${Number(r.suma_aplicado).toLocaleString('es-MX')}`)
console.log(`  → ¿cuadra cobrado vs aplicado? ${Number(r.suma_cobrado) === Number(r.suma_aplicado) ? '✅ SÍ' : '⚠ difieren (hay SANCION u otros)'}`)
console.log(`Total tickets de gasto           : ${nTickets}`)
console.log(`Suma IMPORTE (cantidad)          : $${Number(r.suma_importe_gasto).toLocaleString('es-MX')}`)
console.log(`  → ¿cuadra? ${Number(r.suma_importe_gasto) === nTickets * 100 ? '✅ SÍ' : '❌ NO'}`)
console.log(`Suma tickets (ticket_total)      : $${Number(r.suma_tickets).toLocaleString('es-MX')}`)
console.log(`  → esperado: ${nTickets} × $100 = $${(nTickets * 100).toLocaleString('es-MX')}`)
console.log(`  → ¿cuadra? ${Number(r.suma_tickets) === nTickets * 100 ? '✅ SÍ' : '❌ NO'}`)
const nDetalle = Number(r.total_detalle)
console.log(`Líneas gasto_detalle             : ${nDetalle}`)
console.log(`Suma subtotales detalle          : $${Number(r.suma_detalle).toLocaleString('es-MX')}`)
console.log(`  → esperado: ${nDetalle} × $10 = $${(nDetalle * 10).toLocaleString('es-MX')}`)
console.log(`  → ¿cuadra? ${Number(r.suma_detalle) === nDetalle * 10 ? '✅ SÍ' : '❌ NO'}`)

// ── Cierre semanal: ¿los ingresos son múltiplo de $10,000? ──────────────────
const { rows: semanas } = await db.query(`
  SELECT TO_CHAR(fecha, 'IYYY-IW') AS semana,
         COUNT(*)                   AS n_pagos,
         SUM(importe)               AS total
  FROM   public.ingresos
  WHERE  tipo = 'RENTA'
  GROUP  BY semana
  ORDER  BY semana DESC
  LIMIT  8
`)
console.log('\n── Cierres semanales (últimas 8 semanas) ────────────────────────────')
console.log('Semana       | Pagos | Total       | ¿Múlt $10k?')
for (const s of semanas) {
  const total = Number(s.total)
  const ok = total % 10000 === 0
  console.log(`${s.semana}    |  ${String(s.n_pagos).padStart(3)}  | $${total.toLocaleString('es-MX').padStart(10)} | ${ok ? '✅' : '❌'} ${!ok ? `(${total} mod 10000 = ${total % 10000})` : ''}`)
}

await db.end()
