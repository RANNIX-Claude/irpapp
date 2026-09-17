import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.wijcjdbmdbxzmwpdxoal.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Identificar cuáles contratos tienen un sucesor (fueron renovados con nuevo número)
// contrato_anterior_id en el nuevo contrato apunta al anterior
const res = await c.query(`
  SELECT
    c.id,
    c.numero_contrato,
    c.fecha_inicio,
    c.fecha_fin,
    c.estatus,
    c.contrato_anterior_id,
    -- ¿Tiene sucesor? (alguien apunta a este como anterior)
    (SELECT numero_contrato FROM contratos r WHERE r.contrato_anterior_id = c.id LIMIT 1) AS renovado_en,
    -- Meses desde inicio hasta HOY (sin cap)
    (DATE_PART('year', CURRENT_DATE) - DATE_PART('year', c.fecha_inicio)) * 12
    + DATE_PART('month', CURRENT_DATE) - DATE_PART('month', c.fecha_inicio) + 1 AS meses_sin_cap,
    -- Meses desde inicio hasta MIN(hoy, fecha_fin)
    (DATE_PART('year', LEAST(CURRENT_DATE, c.fecha_fin)) - DATE_PART('year', c.fecha_inicio)) * 12
    + DATE_PART('month', LEAST(CURRENT_DATE, c.fecha_fin)) - DATE_PART('month', c.fecha_inicio) + 1 AS meses_con_cap,
    (SELECT COUNT(*) FROM cargos_programados cp WHERE cp.contrato_id = c.id) AS cargos_bd
  FROM contratos c
  ORDER BY c.fecha_inicio
`)

console.log('\nFecha de hoy: 2026-09-17\n')
console.log(`${'Contrato'.padEnd(22)} ${'Inicio'.padEnd(12)} ${'Fin'.padEnd(12)} ${'Estatus'.padEnd(12)} ${'Sucesor'.padEnd(18)} ${'Meses(hoy)'.padEnd(12)} ${'En BD'.padEnd(7)} Diff`)
console.log('─'.repeat(110))

let totalMeses = 0, totalBD = 0
for (const r of res.rows) {
  // Si tiene sucesor: usar meses_con_cap (el sucesor cubre el resto)
  // Si no tiene sucesor: usar meses_sin_cap (el inquilino sigue pagando bajo este contrato)
  const tieneSucesor = !!r.renovado_en
  const meses = tieneSucesor ? parseInt(r.meses_con_cap) : parseInt(r.meses_sin_cap)
  const bd    = parseInt(r.cargos_bd)
  const diff  = bd - meses
  totalMeses += meses
  totalBD    += bd
  const flag = diff === 0 ? '✓' : diff > 0 ? `+${diff}` : `FALTAN ${Math.abs(diff)}`
  console.log(
    `${(r.numero_contrato||'').padEnd(22)} ${r.fecha_inicio.toISOString().slice(0,10).padEnd(12)} ${r.fecha_fin.toISOString().slice(0,10).padEnd(12)} ${(r.estatus||'').padEnd(12)} ${(r.renovado_en||'—').padEnd(18)} ${String(meses).padEnd(12)} ${String(bd).padEnd(7)} ${flag}`
  )
}
console.log('─'.repeat(110))
console.log(`${'TOTAL'.padEnd(22)} ${''.padEnd(48)} ${String(totalMeses).padEnd(12)} ${String(totalBD).padEnd(7)} ${totalBD - totalMeses >= 0 ? '+' : ''}${totalBD - totalMeses}`)

await c.end()
