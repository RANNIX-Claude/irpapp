import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Los 5 contratos sin cobro Sep/2026
const CONTRATOS = ['IWOL-2024-L0607','IWOL-2024-L14','IWOL-2024-L35','IWOL-2025-L17','IWOL-2025-L13']

// Ver importe del último cobro de cada uno
const info = await c.query(`
  SELECT ct.id, ct.numero_contrato, ct.locales_display,
    cp.importe, cp.concepto, cp.periodo_mes, cp.periodo_anio,
    cp.fecha_vencimiento
  FROM contratos ct
  JOIN cargos_programados cp ON cp.contrato_id = ct.id
  WHERE ct.numero_contrato = ANY($1)
    AND cp.periodo_anio * 100 + cp.periodo_mes = (
      SELECT MAX(cp2.periodo_anio * 100 + cp2.periodo_mes)
      FROM cargos_programados cp2 WHERE cp2.contrato_id = ct.id
    )
  ORDER BY ct.fecha_inicio
`, [CONTRATOS])

console.log('\nCobros que se van a generar para Sep/2026:')
console.log(`${'Contrato'.padEnd(22)} ${'Local'.padEnd(14)} ${'Concepto'.padEnd(12)} ${'Importe'.padStart(12)}`)
console.log('─'.repeat(65))
let total = 0
for (const r of info.rows) {
  total += parseFloat(r.importe)
  console.log(`${r.numero_contrato.padEnd(22)} ${(r.locales_display||'—').padEnd(14)} ${r.concepto.padEnd(12)} ${Number(r.importe).toLocaleString('es-MX',{style:'currency',currency:'MXN'}).padStart(12)}`)
}
console.log('─'.repeat(65))
console.log(`${'TOTAL'.padEnd(50)} ${total.toLocaleString('es-MX',{style:'currency',currency:'MXN'}).padStart(12)}`)

// Generar cobros Sep/2026 + ingresos + aplicaciones
await c.query('BEGIN')
try {
  for (const r of info.rows) {
    // Fecha vencimiento Sep/2026: usar día igual al del último cobro
    const diaVenc = r.fecha_vencimiento.getDate()
    const fechaVenc = `2026-09-${String(diaVenc).padStart(2,'0')}`

    // Insertar cargo Sep/2026
    const cargo = await c.query(`
      INSERT INTO cargos_programados (contrato_id, concepto, importe, periodo_mes, periodo_anio, fecha_vencimiento, estado)
      VALUES ($1, $2, $3, 9, 2026, $4::date, 'PAGADO')
      RETURNING id, importe
    `, [r.id, r.concepto, r.importe, fechaVenc])
    const cargoId = cargo.rows[0].id

    // Insertar ingreso
    const ingreso = await c.query(`
      INSERT INTO ingresos (contrato_id, tipo, mes, anio, fecha, importe, cobro_id,
        origen, concepto_origen, estatus_validacion, clasificacion, clasificacion_manual)
      VALUES ($1, $2, 9, 2026, $3::date, $4, $5,
        'TRANSFERENCIA BBVA', $6, 'VALIDADO', $2, false)
      RETURNING id
    `, [r.id, r.concepto, fechaVenc, r.importe, cargoId, r.concepto + ' 9/2026'])
    const ingresoId = ingreso.rows[0].id

    // Insertar aplicacion
    await c.query(`
      INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
      VALUES ($1, $2, $3, CURRENT_DATE)
    `, [ingresoId, cargoId, r.importe])

    console.log(`\n✓ ${r.numero_contrato} — cargo ${cargoId}, ingreso ${ingresoId}, importe ${r.importe}`)
  }

  await c.query('COMMIT')
  console.log('\n✓ COMMIT — 5 cobros Sep/2026 generados')

  // Verificar total Sep/2026
  const tot = await c.query(`
    SELECT COUNT(*) AS cobros, SUM(importe) AS total
    FROM cargos_programados WHERE periodo_mes=9 AND periodo_anio=2026
  `)
  const t = tot.rows[0]
  console.log(`\nSep/2026 final: ${t.cobros} cobros, total ${Number(t.total).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}`)

} catch(e) {
  await c.query('ROLLBACK')
  console.error('✗ ROLLBACK:', e.message)
  process.exit(1)
}

await c.end()
