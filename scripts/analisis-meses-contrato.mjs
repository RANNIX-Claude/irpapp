// Analiza cuantos meses debio generar cada contrato hasta Sep/2026
// (mes de corte = el mes que va a la mitad de Sep/2026)
import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Mes de corte: septiembre 2026 (inclusive)
const CORTE_ANIO = 2026
const CORTE_MES  = 9

const res = await c.query(`
  SELECT
    c.numero_contrato,
    c.fecha_inicio,
    c.fecha_fin,
    -- meses desde inicio hasta Sep/2026 (o fin de contrato si antes)
    LEAST(
      (CORTE_ANIO - DATE_PART('year', c.fecha_inicio)) * 12
        + CORTE_MES - DATE_PART('month', c.fecha_inicio) + 1,
      (DATE_PART('year', c.fecha_fin) - DATE_PART('year', c.fecha_inicio)) * 12
        + DATE_PART('month', c.fecha_fin) - DATE_PART('month', c.fecha_inicio) + 1
    )::int AS meses_hasta_sep26,
    COUNT(cp.id) AS cargos_generados,
    COUNT(cp.id) FILTER (WHERE cp.periodo_anio < 2026 OR (cp.periodo_anio = 2026 AND cp.periodo_mes <= 9)) AS cargos_hasta_sep26,
    COUNT(cp.id) FILTER (WHERE cp.estado = 'PAGADO') AS cargos_pagado_actual
  FROM contratos c
  LEFT JOIN cargos_programados cp ON cp.contrato_id = c.id
  GROUP BY c.numero_contrato, c.fecha_inicio, c.fecha_fin
  ORDER BY c.fecha_inicio
`.replace('CORTE_ANIO', CORTE_ANIO).replace('CORTE_MES', CORTE_MES)
 .replace('CORTE_ANIO', CORTE_ANIO).replace('CORTE_MES', CORTE_MES)
 .replace('CORTE_ANIO', CORTE_ANIO).replace('CORTE_MES', CORTE_MES))

console.log(`\n=== Meses por contrato hasta Sep/2026 ===`)
console.log(`${'Contrato'.padEnd(20)} ${'Inicio'.padEnd(12)} ${'Fin'.padEnd(12)} ${'Meses→Sep26'.padEnd(13)} ${'Cargos generados'.padEnd(18)} ${'Cargos→Sep26'.padEnd(14)} ${'PAGADO actual'}`)
console.log('─'.repeat(120))

let sumMeses = 0, sumGen = 0, sumSep = 0, sumPagado = 0
for (const r of res.rows) {
  const inicio = r.fecha_inicio.toISOString().slice(0,10)
  const fin    = r.fecha_fin.toISOString().slice(0,10)
  const m = r.meses_hasta_sep26
  const gen = parseInt(r.cargos_generados)
  const sep = parseInt(r.cargos_hasta_sep26)
  const pag = parseInt(r.cargos_pagado_actual)
  const ok  = gen === m ? '✓' : '✗ FALTAN'
  sumMeses += m; sumGen += gen; sumSep += sep; sumPagado += pag
  console.log(
    `${(r.numero_contrato||'—').padEnd(20)} ${inicio.padEnd(12)} ${fin.padEnd(12)} ${String(m).padEnd(13)} ${String(gen).padEnd(18)} ${String(sep).padEnd(14)} ${pag}  ${gen !== m ? `← generados=${gen} esperados=${m}` : ''}`
  )
}
console.log('─'.repeat(120))
console.log(`${'TOTAL'.padEnd(20)} ${''.padEnd(12)} ${''.padEnd(12)} ${String(sumMeses).padEnd(13)} ${String(sumGen).padEnd(18)} ${String(sumSep).padEnd(14)} ${sumPagado}`)

// Estados actuales post-desastre
const est = await c.query(`SELECT estado, COUNT(*) FROM cargos_programados GROUP BY estado ORDER BY estado`)
console.log('\n=== Estados actuales (post-reset) ===')
est.rows.forEach(r => console.log(`  ${r.estado}: ${r.count}`))

await c.end()
