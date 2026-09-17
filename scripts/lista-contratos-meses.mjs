import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Corte: Sep/2026 = mes 9, año 2026
const CORTE_MES = 9, CORTE_ANIO = 2026

const res = await c.query(`
  SELECT
    c.numero_contrato,
    c.locales_display,
    c.fecha_inicio,
    c.fecha_fin,
    c.estatus,
    (SELECT numero_contrato FROM contratos r WHERE r.contrato_anterior_id = c.id LIMIT 1) AS sucesor,
    -- Meses desde inicio hasta Sep/2026, sin pasar de fecha_fin si tiene sucesor
    CASE
      WHEN (SELECT 1 FROM contratos r WHERE r.contrato_anterior_id = c.id LIMIT 1) IS NOT NULL
        -- tiene sucesor: cap en fecha_fin
        THEN (DATE_PART('year', LEAST(MAKE_DATE($1,$2,1), c.fecha_fin)) - DATE_PART('year', c.fecha_inicio)) * 12
          + DATE_PART('month', LEAST(MAKE_DATE($1,$2,1), c.fecha_fin)) - DATE_PART('month', c.fecha_inicio) + 1
      ELSE
        -- sin sucesor: cap en Sep/2026
        (($1::int - DATE_PART('year', c.fecha_inicio)) * 12
          + $2::int - DATE_PART('month', c.fecha_inicio) + 1)
    END AS meses_sep26
  FROM contratos c
  ORDER BY c.fecha_inicio, c.locales_display
`, [CORTE_ANIO, CORTE_MES])

console.log(`\n${'Local'.padEnd(16)} ${'Contrato'.padEnd(22)} ${'Inicio'.padEnd(12)} ${'Fin'.padEnd(12)} ${'Estatus'.padEnd(12)} ${'Meses→Sep/26'}`)
console.log('─'.repeat(90))
let total = 0
for (const r of res.rows) {
  const m = parseInt(r.meses_sep26)
  total += m
  const local = (r.locales_display || '—').padEnd(16)
  const contrato = (r.numero_contrato || '').padEnd(22)
  const inicio = r.fecha_inicio.toISOString().slice(0,10).padEnd(12)
  const fin    = r.fecha_fin.toISOString().slice(0,10).padEnd(12)
  const estatus = (r.estatus || '').padEnd(12)
  const sufijo = r.sucesor ? ` (→${r.sucesor})` : ''
  console.log(`${local} ${contrato} ${inicio} ${fin} ${estatus} ${m}${sufijo}`)
}
console.log('─'.repeat(90))
console.log(`${''.padEnd(16)} ${'TOTAL'.padEnd(22)} ${''.padEnd(12)} ${''.padEnd(12)} ${''.padEnd(12)} ${total}`)

await c.end()
