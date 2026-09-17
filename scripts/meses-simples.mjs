import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

const res = await c.query(`
  SELECT
    numero_contrato,
    locales_display,
    fecha_inicio,
    (2026 - EXTRACT(YEAR FROM fecha_inicio)::int) * 12
      + 9 - EXTRACT(MONTH FROM fecha_inicio)::int + 1  AS meses
  FROM contratos
  ORDER BY fecha_inicio
`)

console.log(`\n${'Contrato'.padEnd(22)} ${'Local'.padEnd(14)} ${'Inicio'.padEnd(12)} Meses`)
console.log('─'.repeat(55))
let total = 0
for (const r of res.rows) {
  const m = parseInt(r.meses)
  total += m
  console.log(`${r.numero_contrato.padEnd(22)} ${(r.locales_display||'—').padEnd(14)} ${r.fecha_inicio.toISOString().slice(0,10).padEnd(12)} ${m}`)
}
console.log('─'.repeat(55))
console.log(`${'TOTAL'.padEnd(48)} ${total}`)

await c.end()
