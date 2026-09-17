// reset-ingresos-prod.mjs
// Reconstruye ingresos + aplicaciones_pago 1-a-1 por cada cargo PAGADO en PRODUCCIÓN
// No toca contratos, no toca PENDIENTE/PARCIAL
import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'db.kusuoxwzdxfuybvyiakg.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'Tetonapo00!!', ssl: { rejectUnauthorized: false }
})
await client.connect()
console.log('Conectado a PRODUCCIÓN')

const antes = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM contratos) AS contratos,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO') AS pagados,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PENDIENTE') AS pendientes,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PARCIAL') AS parciales,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones
`)
const a = antes.rows[0]
console.log(`\nAntes: ${a.contratos} contratos | PAGADO ${a.pagados} | PENDIENTE ${a.pendientes} | PARCIAL ${a.parciales} | ingresos ${a.ingresos} | aplicaciones ${a.aplicaciones}`)

await client.query('BEGIN')
try {
  // Snapshot de PAGADO antes de borrar aplicaciones (el trigger los revertiría)
  await client.query('DROP TABLE IF EXISTS prod_snap')
  await client.query(`
    CREATE TEMP TABLE prod_snap AS
    SELECT id, contrato_id, importe, concepto, periodo_mes, periodo_anio, fecha_vencimiento
    FROM cargos_programados WHERE estado = 'PAGADO'
  `)
  const snap = await client.query('SELECT COUNT(*) FROM prod_snap')
  console.log(`[1] Snapshot: ${snap.rows[0].count} cargos PAGADO`)

  // Borrar aplicaciones e ingresos
  const d1 = await client.query('DELETE FROM aplicaciones_pago')
  console.log(`[2] DELETE aplicaciones_pago: ${d1.rowCount}`)
  const d2 = await client.query('DELETE FROM ingresos')
  console.log(`[3] DELETE ingresos: ${d2.rowCount}`)

  // Reconstruir 1-a-1
  const ins = await client.query(`
    WITH nuevos AS (
      INSERT INTO ingresos (
        contrato_id, tipo, mes, anio, fecha, importe, cobro_id,
        origen, concepto_origen, estatus_validacion, clasificacion, clasificacion_manual
      )
      SELECT
        contrato_id, concepto, periodo_mes, periodo_anio,
        fecha_vencimiento::date, importe, id,
        'TRANSFERENCIA BBVA',
        concepto || ' ' || periodo_mes || '/' || periodo_anio,
        'VALIDADO', concepto, false
      FROM prod_snap
      ORDER BY periodo_anio, periodo_mes, contrato_id
      RETURNING id, cobro_id, importe
    )
    INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
    SELECT id, cobro_id, importe, CURRENT_DATE FROM nuevos
    RETURNING ingreso_id
  `)
  console.log(`[4] INSERT ingresos + aplicaciones: ${ins.rowCount} pares`)

  await client.query('COMMIT')
  console.log('\n✓ COMMIT')
} catch(e) {
  await client.query('ROLLBACK')
  console.error('\n✗ ROLLBACK:', e.message)
  process.exit(1)
}

// Verificación final
const desc = await client.query(`
  SELECT COUNT(*) AS n FROM (
    SELECT i.id FROM ingresos i
    LEFT JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
    GROUP BY i.id, i.importe
    HAVING ABS(i.importe - COALESCE(SUM(ap.importe_aplicado),0)) > 0.01
  ) x
`)
const fin = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO') AS pagados,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PENDIENTE') AS pendientes,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PARCIAL') AS parciales
`)
const f = fin.rows[0]
console.log(`\nDespués: PAGADO ${f.pagados} | PENDIENTE ${f.pendientes} | PARCIAL ${f.parciales} | ingresos ${f.ingresos} | aplicaciones ${f.aplicaciones}`)
console.log(`Descuadres: ${desc.rows[0].n}`)
console.log(
  f.ingresos == f.pagados && f.aplicaciones == f.pagados && desc.rows[0].n == 0
    ? `✓ ${f.pagados} ingresos = ${f.pagados} aplicaciones = ${f.pagados} PAGADO — producción limpia`
    : '✗ Revisar'
)

await client.end()
