import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

await c.query('BEGIN')
try {
  // Snapshot de los PENDIENTE antes de actualizarlos
  await c.query('DROP TABLE IF EXISTS pendientes_snap')
  await c.query(`
    CREATE TEMP TABLE pendientes_snap AS
    SELECT id, contrato_id, importe, concepto, periodo_mes, periodo_anio, fecha_vencimiento
    FROM cargos_programados WHERE estado = 'PENDIENTE'
  `)
  const cnt = await c.query('SELECT COUNT(*) FROM pendientes_snap')
  console.log('Cargos PENDIENTE a simular como pagados:', cnt.rows[0].count)

  // Marcar como PAGADO (el trigger trg_actualizar_cargo_estado los marcará PAGADO al insertar la aplicacion,
  // pero lo hacemos explícito también para coherencia)
  await c.query(`UPDATE cargos_programados SET estado='PAGADO', updated_at=now() WHERE estado='PENDIENTE'`)

  // Crear ingresos + aplicaciones 1-a-1 para los que estaban PENDIENTE
  const ins = await c.query(`
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
      FROM pendientes_snap
      ORDER BY periodo_anio, periodo_mes, contrato_id
      RETURNING id, cobro_id, importe
    )
    INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
    SELECT id, cobro_id, importe, CURRENT_DATE FROM nuevos
    RETURNING ingreso_id
  `)
  console.log('Ingresos + aplicaciones creados:', ins.rowCount)

  await c.query('COMMIT')
  console.log('✓ COMMIT')
} catch(e) {
  await c.query('ROLLBACK')
  console.error('✗ ROLLBACK:', e.message)
  process.exit(1)
}

const fin = await c.query(`
  SELECT
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado = 'PAGADO') AS pagados,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado = 'PENDIENTE') AS pendientes
`)
const f = fin.rows[0]
console.log(`\nFinal: ${f.ingresos} ingresos | ${f.aplicaciones} aplicaciones | ${f.pagados} PAGADO | ${f.pendientes} PENDIENTE`)

await c.end()
