import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

const res = await c.query(`
  SELECT
    ct.numero_contrato,
    ct.locales_display,
    ct.fecha_inicio,
    ct.fecha_fin,
    (SELECT COUNT(*) FROM cargos_programados cp
      WHERE cp.contrato_id = ct.id AND cp.periodo_mes = 9 AND cp.periodo_anio = 2026
    ) AS cobros_sep26,
    (SELECT MIN(cp.periodo_anio * 100 + cp.periodo_mes)
      FROM cargos_programados cp WHERE cp.contrato_id = ct.id
    ) AS primer_periodo,
    (SELECT MAX(cp.periodo_anio * 100 + cp.periodo_mes)
      FROM cargos_programados cp WHERE cp.contrato_id = ct.id
    ) AS ultimo_periodo,
    (SELECT COUNT(*) FROM cargos_programados cp WHERE cp.contrato_id = ct.id) AS total_cobros
  FROM contratos ct
  ORDER BY ct.fecha_inicio
`)

console.log(`\n${'Local'.padEnd(14)} ${'Contrato'.padEnd(22)} ${'Inicio'.padEnd(12)} ${'Fin'.padEnd(12)} ${'Sep/26?'.padEnd(9)} ${'PrimerCobro'.padEnd(13)} ${'UltimoCobro'.padEnd(13)} Total`)
console.log('─'.repeat(105))

let conSep = 0, sinSep = 0
for (const r of res.rows) {
  const tiene = parseInt(r.cobros_sep26) > 0
  if (tiene) conSep++; else sinSep++
  const marca = tiene ? '✓' : '✗ FALTA'
  const local = (r.locales_display || '—').padEnd(14)
  const contrato = (r.numero_contrato || '').padEnd(22)
  const inicio = r.fecha_inicio.toISOString().slice(0,10).padEnd(12)
  const fin = r.fecha_fin.toISOString().slice(0,10).padEnd(12)
  const primer = r.primer_periodo ? String(r.primer_periodo) : '—'
  const ultimo = r.ultimo_periodo ? String(r.ultimo_periodo) : '—'
  console.log(`${local} ${contrato} ${inicio} ${fin} ${marca.padEnd(9)} ${primer.padEnd(13)} ${ultimo.padEnd(13)} ${r.total_cobros}`)
}
console.log('─'.repeat(105))
console.log(`Con Sep/26: ${conSep}   Sin Sep/26: ${sinSep}`)

await c.end()
