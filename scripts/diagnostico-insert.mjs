import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Verificar triggers en ingresos y aplicaciones_pago
const trg = await c.query(`
  SELECT event_object_table AS tbl, trigger_name, event_manipulation, action_timing
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table IN ('ingresos', 'aplicaciones_pago', 'cargos_programados')
  ORDER BY tbl, trigger_name
`)
console.log('\n=== Triggers relevantes ===')
trg.rows.forEach(r => console.log(`  ${r.tbl.padEnd(20)} ${r.trigger_name.padEnd(45)} ${r.action_timing} ${r.event_manipulation}`))

// Verificar constraints en ingresos
const cons = await c.query(`
  SELECT constraint_name, constraint_type
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'ingresos'
`)
console.log('\n=== Constraints en ingresos ===')
cons.rows.forEach(r => console.log(`  ${r.constraint_type.padEnd(15)} ${r.constraint_name}`))

// FK de ingresos.cobro_id — ¿a qué tabla apunta?
const fk = await c.query(`
  SELECT
    kcu.column_name,
    ccu.table_name AS ref_table,
    ccu.column_name AS ref_column
  FROM information_schema.key_column_usage kcu
  JOIN information_schema.referential_constraints rc ON rc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
  WHERE kcu.table_schema = 'public' AND kcu.table_name = 'ingresos'
`)
console.log('\n=== FKs en ingresos ===')
fk.rows.forEach(r => console.log(`  ${r.column_name} → ${r.ref_table}.${r.ref_column}`))

// Probar un insert individual de un cargo PAGADO para ver si falla
const sample = await c.query(`SELECT * FROM cargos_programados WHERE estado='PAGADO' LIMIT 1`)
const cp = sample.rows[0]
console.log('\n=== Prueba insert individual ===')
console.log('Cargo a insertar:', JSON.stringify({id: cp.id, contrato_id: cp.contrato_id, importe: cp.importe}))

try {
  await c.query('BEGIN')
  const ins = await c.query(`
    INSERT INTO ingresos (contrato_id, tipo, mes, anio, fecha, importe, cobro_id, origen, concepto_origen, estatus_validacion, clasificacion, clasificacion_manual)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'TRANSFERENCIA BBVA','TEST','VALIDADO',$2,false)
    RETURNING id
  `, [cp.contrato_id, cp.concepto, cp.periodo_mes, cp.periodo_anio, cp.fecha_vencimiento, cp.importe, cp.id])
  console.log('Insert exitoso, nuevo ingreso id:', ins.rows[0].id)
  await c.query('ROLLBACK')
} catch(e) {
  console.log('ERROR en insert individual:', e.message)
  await c.query('ROLLBACK')
}

await c.end()
