import pg from 'pg'
import fs from 'fs'

const { Client } = pg

const client = new Client({
  host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Tetonapo00!!',
  ssl: { rejectUnauthorized: false }
})

await client.connect()

const cols = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'cargos_programados'
  ORDER BY ordinal_position
`)
console.log('\n=== cargos_programados columns ===')
cols.rows.forEach(r => console.log(`  ${r.column_name.padEnd(30)} ${r.data_type}`))

const counts = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones,
    (SELECT COUNT(*) FROM cargos_programados) AS cargos_total,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado = 'PAGADO') AS cargos_pagados
`)
const r = counts.rows[0]
console.log('\n=== Conteos actuales en QA ===')
console.log(`  ingresos:       ${r.ingresos}`)
console.log(`  aplicaciones:   ${r.aplicaciones}`)
console.log(`  cargos total:   ${r.cargos_total}`)
console.log(`  cargos PAGADO:  ${r.cargos_pagados}`)

const sample = await client.query(`
  SELECT id, contrato_id, importe, concepto, periodo_mes, periodo_anio, estado,
         fecha_vencimiento
  FROM cargos_programados WHERE estado = 'PAGADO' LIMIT 3
`)
console.log('\n=== Muestra cargos PAGADO ===')
sample.rows.forEach(r => console.log(JSON.stringify(r)))

await client.end()
