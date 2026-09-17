import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

const res = await c.query(`
  SELECT
    ct.numero_contrato, ct.locales_display, ct.fecha_inicio,
    EXTRACT(MONTH FROM ct.fecha_inicio)::int AS mes_inicio,
    EXTRACT(YEAR  FROM ct.fecha_inicio)::int AS anio_inicio,
    (2026 - EXTRACT(YEAR FROM ct.fecha_inicio)::int) * 12
      + 9 - EXTRACT(MONTH FROM ct.fecha_inicio)::int + 1 AS esperados,
    COUNT(cp.id) AS en_bd,
    COUNT(cp.id) - (
      (2026 - EXTRACT(YEAR FROM ct.fecha_inicio)::int) * 12
      + 9 - EXTRACT(MONTH FROM ct.fecha_inicio)::int + 1
    ) AS diferencia,
    MIN(cp.periodo_anio * 100 + cp.periodo_mes) AS primer_cobro,
    MAX(cp.periodo_anio * 100 + cp.periodo_mes) AS ultimo_cobro
  FROM contratos ct
  LEFT JOIN cargos_programados cp ON cp.contrato_id = ct.id
  GROUP BY ct.id, ct.numero_contrato, ct.locales_display, ct.fecha_inicio
  HAVING COUNT(cp.id) != (
    (2026 - EXTRACT(YEAR FROM ct.fecha_inicio)::int) * 12
    + 9 - EXTRACT(MONTH FROM ct.fecha_inicio)::int + 1
  )
  ORDER BY diferencia DESC
`)

console.log(`\nContratos con diferencia vs fórmula:`)
console.log(`${'Contrato'.padEnd(22)} ${'Inicio'.padEnd(12)} ${'Esperado'.padStart(9)} ${'En BD'.padStart(7)} ${'Diff'.padStart(6)} ${'Primer'.padStart(8)} ${'Ultimo'.padStart(8)}`)
console.log('─'.repeat(80))
for (const r of res.rows) {
  console.log(`${r.numero_contrato.padEnd(22)} ${r.fecha_inicio.toISOString().slice(0,10).padEnd(12)} ${String(r.esperados).padStart(9)} ${String(r.en_bd).padStart(7)} ${String(r.diferencia).padStart(6)} ${String(r.primer_cobro).padStart(8)} ${String(r.ultimo_cobro).padStart(8)}`)
}

// Total general
const tot = await c.query(`SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO'`)
console.log(`\nTotal PAGADO en BD: ${tot.rows[0].count}  |  Fórmula dice: 307`)

await c.end()
