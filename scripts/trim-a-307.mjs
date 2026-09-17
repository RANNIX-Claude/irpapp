import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Encontrar los cobros sobrantes: fuera del rango [mes_inicio..Sep/2026] o duplicados dentro del rango
const extras = await c.query(`
  WITH rango AS (
    SELECT id AS contrato_id,
      EXTRACT(YEAR FROM fecha_inicio)::int  AS anio_ini,
      EXTRACT(MONTH FROM fecha_inicio)::int AS mes_ini
    FROM contratos
  ),
  cobros_ranked AS (
    SELECT cp.id, cp.contrato_id, cp.periodo_anio, cp.periodo_mes,
      r.anio_ini, r.mes_ini,
      -- fuera del rango si es antes del mes de inicio
      (cp.periodo_anio * 100 + cp.periodo_mes) < (r.anio_ini * 100 + r.mes_ini) AS antes_inicio,
      -- posición dentro del período (para detectar duplicados)
      ROW_NUMBER() OVER (
        PARTITION BY cp.contrato_id, cp.periodo_anio, cp.periodo_mes
        ORDER BY cp.id
      ) AS rn
    FROM cargos_programados cp JOIN rango r ON r.contrato_id = cp.contrato_id
  )
  SELECT id, contrato_id, periodo_anio, periodo_mes, antes_inicio
  FROM cobros_ranked
  WHERE antes_inicio OR rn > 1
  ORDER BY contrato_id, periodo_anio, periodo_mes
`)

console.log(`\nCobros sobrantes a eliminar: ${extras.rows.length}`)
for (const r of extras.rows) {
  const motivo = r.antes_inicio ? 'antes de inicio' : 'duplicado'
  console.log(`  ${r.id}  ${r.periodo_anio}-${String(r.periodo_mes).padStart(2,'0')}  (${motivo})`)
}

if (extras.rows.length === 0) {
  console.log('✓ Sin sobrantes')
  await c.end(); process.exit(0)
}

const ids = extras.rows.map(r => r.id)

await c.query('BEGIN')
try {
  // Obtener ingresos vinculados a esos cobros
  const ings = await c.query(
    `SELECT id FROM ingresos WHERE cobro_id = ANY($1)`, [ids]
  )
  const ingIds = ings.rows.map(r => r.id)

  // Borrar aplicaciones → ingresos → cobros
  if (ingIds.length) {
    await c.query(`DELETE FROM aplicaciones_pago WHERE ingreso_id = ANY($1)`, [ingIds])
    await c.query(`DELETE FROM ingresos WHERE id = ANY($1)`, [ingIds])
  }
  await c.query(`DELETE FROM cargos_programados WHERE id = ANY($1)`, [ids])

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
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones
`)
const f = fin.rows[0]
console.log(`\nFinal: ${f.pagados} PAGADO | ${f.ingresos} ingresos | ${f.aplicaciones} aplicaciones`)
const ok = f.pagados == 307 && f.ingresos == 307 && f.aplicaciones == 307
console.log(ok ? '✓ 307/307/307 — QA completo' : `✗ Diferencia: esperado 307, hay ${f.pagados}/${f.ingresos}/${f.aplicaciones}`)

await c.end()
