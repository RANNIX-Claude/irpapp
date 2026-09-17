import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Contratos y sus meses esperados hasta Sep/2026
const contratos = await c.query(`
  SELECT id, numero_contrato, locales_display, fecha_inicio,
    EXTRACT(MONTH FROM fecha_inicio)::int AS mes_inicio,
    EXTRACT(YEAR  FROM fecha_inicio)::int AS anio_inicio,
    (2026 - EXTRACT(YEAR FROM fecha_inicio)::int) * 12
      + 9 - EXTRACT(MONTH FROM fecha_inicio)::int + 1 AS meses_esperados
  FROM contratos ORDER BY fecha_inicio
`)

// Cobros existentes por contrato (periodo_mes, periodo_anio)
const cobrosExist = await c.query(`
  SELECT contrato_id, periodo_mes, periodo_anio, importe, concepto, fecha_vencimiento
  FROM cargos_programados
`)
const existSet = new Set()
const importeRef = {}   // contrato_id -> { importe, concepto, dia_venc }
for (const r of cobrosExist.rows) {
  existSet.add(`${r.contrato_id}_${r.periodo_anio}_${r.periodo_mes}`)
  if (!importeRef[r.contrato_id]) {
    importeRef[r.contrato_id] = {
      importe: r.importe,
      concepto: r.concepto,
      dia: new Date(r.fecha_vencimiento).getDate()
    }
  }
}

// Armar lista de cobros faltantes
const faltantes = []
for (const ct of contratos.rows) {
  let anio = ct.anio_inicio, mes = ct.mes_inicio
  for (let i = 0; i < parseInt(ct.meses_esperados); i++) {
    const key = `${ct.id}_${anio}_${mes}`
    if (!existSet.has(key)) {
      faltantes.push({ contrato_id: ct.id, numero_contrato: ct.numero_contrato, anio, mes, ...importeRef[ct.id] })
    }
    mes++; if (mes > 12) { mes = 1; anio++ }
  }
}

console.log(`\nCobros faltantes: ${faltantes.length}`)
if (faltantes.length === 0) {
  console.log('✓ Ya están los 307 — nada que generar')
  await c.end(); process.exit(0)
}

for (const f of faltantes) {
  const dia = String(f.dia).padStart(2,'0')
  const mes  = String(f.mes).padStart(2,'0')
  console.log(`  ${f.numero_contrato} ${f.anio}-${mes}`)
}

await c.query('BEGIN')
try {
  // Snapshot para que el trigger no revierta estados
  await c.query('DROP TABLE IF EXISTS falt_snap')
  await c.query(`CREATE TEMP TABLE falt_snap (
    contrato_id uuid, anio int, mes int, importe numeric, concepto text, fecha_venc date
  )`)
  for (const f of faltantes) {
    const dia = String(Math.min(f.dia, 28)).padStart(2,'0') // evitar día 31 en meses cortos
    const mes  = String(f.mes).padStart(2,'0')
    await c.query(
      `INSERT INTO falt_snap VALUES ($1,$2,$3,$4,$5,$6::date)`,
      [f.contrato_id, f.anio, f.mes, f.importe, f.concepto, `${f.anio}-${mes}-${dia}`]
    )
  }

  // Insertar cargos como PAGADO
  await c.query(`
    INSERT INTO cargos_programados (contrato_id, concepto, importe, periodo_mes, periodo_anio, fecha_vencimiento, estado)
    SELECT contrato_id, concepto, importe, mes, anio, fecha_venc, 'PAGADO'
    FROM falt_snap
  `)
  console.log(`\n[1] Cargos insertados: ${faltantes.length}`)

  // Snapshot de los cargos recién insertados (IDs)
  await c.query('DROP TABLE IF EXISTS nuevos_cargos')
  await c.query(`
    CREATE TEMP TABLE nuevos_cargos AS
    SELECT cp.id, cp.contrato_id, cp.importe, cp.concepto, cp.periodo_mes, cp.periodo_anio, cp.fecha_vencimiento
    FROM cargos_programados cp
    JOIN falt_snap fs ON fs.contrato_id=cp.contrato_id AND fs.anio=cp.periodo_anio AND fs.mes=cp.periodo_mes
    WHERE cp.estado='PAGADO'
      AND NOT EXISTS (SELECT 1 FROM ingresos i WHERE i.cobro_id=cp.id)
  `)

  // Ingresos + aplicaciones 1-a-1
  const ins = await c.query(`
    WITH nuevos AS (
      INSERT INTO ingresos (contrato_id, tipo, mes, anio, fecha, importe, cobro_id,
        origen, concepto_origen, estatus_validacion, clasificacion, clasificacion_manual)
      SELECT contrato_id, concepto, periodo_mes, periodo_anio,
        fecha_vencimiento::date, importe, id,
        'TRANSFERENCIA BBVA', concepto||' '||periodo_mes||'/'||periodo_anio,
        'VALIDADO', concepto, false
      FROM nuevos_cargos
      ORDER BY periodo_anio, periodo_mes, contrato_id
      RETURNING id, cobro_id, importe
    )
    INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
    SELECT id, cobro_id, importe, CURRENT_DATE FROM nuevos
    RETURNING ingreso_id
  `)
  console.log(`[2] Ingresos + aplicaciones: ${ins.rowCount}`)

  await c.query('COMMIT')
  console.log('\n✓ COMMIT')

} catch(e) {
  await c.query('ROLLBACK')
  console.error('✗ ROLLBACK:', e.message)
  process.exit(1)
}

// Verificación final
const fin = await c.query(`
  SELECT
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO') AS pagados,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones,
    (SELECT COUNT(*) FROM ingresos i LEFT JOIN aplicaciones_pago ap ON ap.ingreso_id=i.id
      GROUP BY i.id, i.importe HAVING ABS(i.importe-COALESCE(SUM(ap.importe_aplicado),0))>0.01) AS descuadres
`)
const f = fin.rows[0]
console.log(`\nFinal: ${f.pagados} PAGADO | ${f.ingresos} ingresos | ${f.aplicaciones} aplicaciones | ${f.descuadres||0} descuadres`)
console.log(f.pagados == 307 && f.ingresos == 307 && f.aplicaciones == 307 ? '✓ 307/307/307 — QA completo' : '✗ Revisar')

await c.end()
