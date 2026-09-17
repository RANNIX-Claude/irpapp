// reset-prod-completo.mjs — PRODUCCIÓN
// Igual que QA: borra todo y reconstruye 307 cobros PAGADO + ingresos + aplicaciones 1-a-1
// Usa contratos.renta_mensual como importe
import pg from 'pg'
const { Client } = pg

const CONTRATOS_RENOVACION = ['IWOL-2024-L14-R26', 'IWOL-2024-L14-R26-4227', 'IWOL-2025-L17-R26']

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
    (SELECT COUNT(*) FROM cargos_programados) AS cargos,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones
`)
const a = antes.rows[0]
console.log(`\nAntes: ${a.contratos} contratos | ${a.cargos} cargos | ${a.ingresos} ingresos | ${a.aplicaciones} aplicaciones`)

await client.query('BEGIN')
try {
  // ── 1. Eliminar contratos de renovación (con todos sus hijos) ────────────
  for (const num of CONTRATOS_RENOVACION) {
    const { rows } = await client.query(`SELECT id FROM contratos WHERE numero_contrato=$1`, [num])
    if (!rows.length) { console.log(`\n[1] ${num}: no encontrado, skip`); continue }
    const cid = rows[0].id
    const ingRes = await client.query(`SELECT id FROM ingresos WHERE contrato_id=$1`, [cid])
    const ingIds = ingRes.rows.map(r => r.id)
    if (ingIds.length) {
      await client.query(`DELETE FROM aplicaciones_pago WHERE ingreso_id=ANY($1)`, [ingIds])
      await client.query(`DELETE FROM ingresos WHERE id=ANY($1)`, [ingIds])
    }
    await client.query(`DELETE FROM cargos_programados WHERE contrato_id=$1`, [cid])
    await client.query(`DELETE FROM contratos WHERE id=$1`, [cid])
    console.log(`[1] Eliminado: ${num}`)
  }

  // ── 2. Borrar todas las aplicaciones, ingresos y cargos restantes ────────
  const d1 = await client.query('DELETE FROM aplicaciones_pago')
  const d2 = await client.query('DELETE FROM ingresos')
  const d3 = await client.query('DELETE FROM cargos_programados')
  console.log(`[2] DELETE aplicaciones_pago: ${d1.rowCount}`)
  console.log(`[3] DELETE ingresos: ${d2.rowCount}`)
  console.log(`[4] DELETE cargos_programados: ${d3.rowCount}`)

  // ── 3. Contratos restantes con fórmula ───────────────────────────────────
  const contratos = await client.query(`
    SELECT id, numero_contrato,
      EXTRACT(MONTH FROM fecha_inicio)::int AS mes_ini,
      EXTRACT(YEAR  FROM fecha_inicio)::int AS anio_ini,
      (2026 - EXTRACT(YEAR FROM fecha_inicio)::int) * 12
        + 9 - EXTRACT(MONTH FROM fecha_inicio)::int + 1 AS meses,
      renta_mensual AS importe
    FROM contratos
    ORDER BY fecha_inicio
  `)

  let totalMeses = 0
  for (const ct of contratos.rows) totalMeses += parseInt(ct.meses)
  console.log(`\n[5] ${contratos.rows.length} contratos → ${totalMeses} cobros a generar`)

  // ── 4. Crear temp table con todos los cobros a insertar ──────────────────
  await client.query('DROP TABLE IF EXISTS cargos_nuevos')
  await client.query(`CREATE TEMP TABLE cargos_nuevos (
    contrato_id uuid, periodo_mes int, periodo_anio int, importe numeric, fecha_venc date
  )`)

  for (const ct of contratos.rows) {
    let anio = ct.anio_ini, mes = ct.mes_ini
    for (let i = 0; i < parseInt(ct.meses); i++) {
      const mesStr = String(mes).padStart(2,'0')
      const dia = String(Math.min(ct.dia_pago || 1, 28)).padStart(2,'0')
      await client.query(
        `INSERT INTO cargos_nuevos VALUES ($1,$2,$3,$4,$5::date)`,
        [ct.id, mes, anio, ct.importe, `${anio}-${mesStr}-01`]
      )
      mes++; if (mes > 12) { mes = 1; anio++ }
    }
  }

  // ── 5. Insertar cargos como PAGADO ───────────────────────────────────────
  await client.query(`
    INSERT INTO cargos_programados (contrato_id, concepto, importe, periodo_mes, periodo_anio, fecha_vencimiento, estado)
    SELECT contrato_id, 'RENTA', importe, periodo_mes, periodo_anio, fecha_venc, 'PAGADO'
    FROM cargos_nuevos
  `)
  console.log(`[6] Cargos PAGADO insertados: ${totalMeses}`)

  // ── 6. Snapshot de IDs recién insertados ─────────────────────────────────
  await client.query('DROP TABLE IF EXISTS snap_ids')
  await client.query(`
    CREATE TEMP TABLE snap_ids AS
    SELECT cp.id, cp.contrato_id, cp.importe, cp.concepto, cp.periodo_mes, cp.periodo_anio, cp.fecha_vencimiento
    FROM cargos_programados cp
  `)

  // ── 7. Ingresos + aplicaciones 1-a-1 ────────────────────────────────────
  const ins = await client.query(`
    WITH nuevos AS (
      INSERT INTO ingresos (
        contrato_id, tipo, mes, anio, fecha, importe, cobro_id,
        origen, concepto_origen, estatus_validacion, clasificacion, clasificacion_manual
      )
      SELECT contrato_id, concepto, periodo_mes, periodo_anio,
        fecha_vencimiento::date, importe, id,
        'TRANSFERENCIA BBVA', 'RENTA '||periodo_mes||'/'||periodo_anio,
        'VALIDADO', concepto, false
      FROM snap_ids
      ORDER BY periodo_anio, periodo_mes, contrato_id
      RETURNING id, cobro_id, importe
    )
    INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
    SELECT id, cobro_id, importe, CURRENT_DATE FROM nuevos
    RETURNING ingreso_id
  `)
  console.log(`[7] Ingresos + aplicaciones: ${ins.rowCount} pares`)

  await client.query('COMMIT')
  console.log('\n✓ COMMIT')

} catch(e) {
  await client.query('ROLLBACK')
  console.error('\n✗ ROLLBACK:', e.message)
  process.exit(1)
}

// ── Verificación final ────────────────────────────────────────────────────
const desc = await client.query(`
  SELECT COUNT(*) AS n FROM (
    SELECT i.id FROM ingresos i
    LEFT JOIN aplicaciones_pago ap ON ap.ingreso_id=i.id
    GROUP BY i.id, i.importe
    HAVING ABS(i.importe - COALESCE(SUM(ap.importe_aplicado),0)) > 0.01
  ) x
`)
const fin = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM contratos) AS contratos,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO') AS pagados,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones
`)
const f = fin.rows[0]
console.log(`\nDespués: ${f.contratos} contratos | ${f.pagados} PAGADO | ${f.ingresos} ingresos | ${f.aplicaciones} aplicaciones | ${desc.rows[0].n} descuadres`)
const ok = f.pagados==307 && f.ingresos==307 && f.aplicaciones==307 && desc.rows[0].n==0
console.log(ok ? '✓ 307/307/307 — PRODUCCIÓN completa' : `✗ Esperado 307, hay ${f.pagados}/${f.ingresos}/${f.aplicaciones}`)

await client.end()
