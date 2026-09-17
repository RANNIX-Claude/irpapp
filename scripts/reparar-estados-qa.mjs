// reparar-estados-qa.mjs
// 1. Revisa cuántos PENDIENTE tienen fecha_vencimiento pasada (deberían ser PAGADO)
// 2. Los marca de nuevo como PAGADO
// 3. Corre el reset 1-a-1 corregido
import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()
console.log('Conectado a QA')

// Diagnóstico
const diag = await c.query(`
  SELECT
    estado,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE fecha_vencimiento < CURRENT_DATE) AS vencidos
  FROM cargos_programados
  GROUP BY estado ORDER BY estado
`)
console.log('\n=== Diagnóstico antes de reparar ===')
diag.rows.forEach(r => console.log(`  ${r.estado}: ${r.total} total, ${r.vencidos} con fecha pasada`))

// Reparar: todos los PENDIENTE con fecha_vencimiento < hoy → PAGADO
const rep = await c.query(`
  UPDATE cargos_programados
  SET estado = 'PAGADO', updated_at = now()
  WHERE estado = 'PENDIENTE'
    AND fecha_vencimiento < CURRENT_DATE
  RETURNING id
`)
console.log(`\n[1] Reparados: ${rep.rowCount} cargos vueltos a PAGADO`)

// Verificar
const ver = await c.query(`SELECT estado, COUNT(*) FROM cargos_programados GROUP BY estado ORDER BY estado`)
console.log('\n=== Estados después de reparar ===')
ver.rows.forEach(r => console.log(`  ${r.estado}: ${r.count}`))

await c.end()
console.log('\nAhora corre: node scripts/reset-ingresos-1a1.mjs')
