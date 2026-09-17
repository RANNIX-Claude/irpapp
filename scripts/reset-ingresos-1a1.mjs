// reset-ingresos-1a1.mjs — v3
// 1. Elimina contratos de renovación vacíos (0 cobros, 0 ingresos)
// 2. Borra todos los ingresos y aplicaciones_pago
// 3. Reconstruye ingresos + aplicaciones 1-a-1 por cada cargo PAGADO
import pg from 'pg'
const { Client } = pg

const CONTRATOS_ELIMINAR = ['IWOL-2024-L14-R26', 'IWOL-2025-L17-R26']

const client = new Client({
  host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Tetonapo00!!',
  ssl: { rejectUnauthorized: false }
})

await client.connect()
console.log('Conectado a QA')

const antes = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM contratos) AS contratos,
    (SELECT COUNT(*) FROM cargos_programados) AS cargos,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado = 'PAGADO') AS pagados,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones
`)
const a = antes.rows[0]
console.log(`\nAntes: ${a.contratos} contratos | ${a.cargos} cargos (${a.pagados} PAGADO) | ${a.ingresos} ingresos | ${a.aplicaciones} aplicaciones`)

await client.query('BEGIN')

try {
  // ── 1. Eliminar contratos de renovación vacíos ──────────────────────────
  for (const num of CONTRATOS_ELIMINAR) {
    const { rows } = await client.query(
      `SELECT id FROM contratos WHERE numero_contrato = $1`, [num]
    )
    if (!rows.length) { console.log(`\n[1] ${num}: no encontrado, skip`); continue }
    const id = rows[0].id
    // Verificar que no tiene hijos
    const chk = await client.query(
      `SELECT COUNT(*) FROM cargos_programados WHERE contrato_id = $1`, [id]
    )
    if (parseInt(chk.rows[0].count) > 0) {
      throw new Error(`${num} tiene ${chk.rows[0].count} cargos — no se puede eliminar`)
    }
    await client.query(`DELETE FROM contratos WHERE id = $1`, [id])
    console.log(`\n[1] Eliminado contrato: ${num}`)
  }

  // ── 2. Snapshot de cargos PAGADO antes de tocar aplicaciones ───────────
  await client.query(`DROP TABLE IF EXISTS cargos_snapshot`)
  await client.query(`
    CREATE TEMP TABLE cargos_snapshot AS
    SELECT id, contrato_id, importe, concepto, periodo_mes, periodo_anio, fecha_vencimiento
    FROM cargos_programados WHERE estado = 'PAGADO'
  `)
  const snap = await client.query('SELECT COUNT(*) FROM cargos_snapshot')
  console.log(`[2] Snapshot: ${snap.rows[0].count} cargos PAGADO`)

  // ── 3. Limpiar aplicaciones e ingresos ──────────────────────────────────
  const d1 = await client.query('DELETE FROM aplicaciones_pago')
  console.log(`[3] DELETE aplicaciones_pago: ${d1.rowCount}`)
  const d2 = await client.query('DELETE FROM ingresos')
  console.log(`[4] DELETE ingresos: ${d2.rowCount}`)

  // ── 4. Insertar ingresos + aplicaciones 1-a-1 ──────────────────────────
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
      FROM cargos_snapshot
      ORDER BY periodo_anio, periodo_mes, contrato_id
      RETURNING id, cobro_id, importe
    )
    INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
    SELECT id, cobro_id, importe, CURRENT_DATE FROM nuevos
    RETURNING ingreso_id
  `)
  console.log(`[5] INSERT ingresos + aplicaciones: ${ins.rowCount} pares`)

  // ── 5. Estado de cargos post-insert ────────────────────────────────────
  const est = await client.query(
    `SELECT estado, COUNT(*) FROM cargos_programados GROUP BY estado ORDER BY estado`
  )
  console.log('\n[6] Estado de cargos:')
  est.rows.forEach(r => console.log(`     ${r.estado}: ${r.count}`))

  await client.query('COMMIT')
  console.log('\n✓ COMMIT')

} catch (err) {
  await client.query('ROLLBACK')
  console.error('\n✗ ROLLBACK:', err.message)
  process.exit(1)
}

// ── Verificación final ───────────────────────────────────────────────────
const desc = await client.query(`
  SELECT COUNT(*) AS n
  FROM ingresos i
  LEFT JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
  GROUP BY i.id, i.importe
  HAVING ABS(i.importe - COALESCE(SUM(ap.importe_aplicado),0)) > 0.01
`)
const fin = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM contratos) AS contratos,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO') AS pagados
`)
const f = fin.rows[0]
console.log(`\nDespués: ${f.contratos} contratos | ${f.ingresos} ingresos | ${f.aplicaciones} aplicaciones | ${f.pagados} PAGADO`)
console.log(desc.rows.length === 0
  ? '✓ Todos los ingresos cuadran 1-a-1'
  : `✗ ${desc.rows.length} ingresos descuadrados`)

await client.end()
