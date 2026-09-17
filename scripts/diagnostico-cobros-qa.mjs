import pg from 'pg'
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

// Contratos con sus fechas y cargos
const res = await client.query(`
  SELECT
    c.id,
    c.numero_contrato,
    a.nombre_razon_social AS arrendatario,
    c.fecha_inicio,
    c.fecha_fin,
    (DATE_PART('year', c.fecha_fin) - DATE_PART('year', c.fecha_inicio)) * 12
    + DATE_PART('month', c.fecha_fin) - DATE_PART('month', c.fecha_inicio) + 1 AS meses_contrato,
    COUNT(cp.id) AS cargos_total,
    COUNT(cp.id) FILTER (WHERE cp.estado = 'PAGADO') AS cargos_pagados,
    COUNT(cp.id) FILTER (WHERE cp.estado = 'PENDIENTE') AS cargos_pendientes
  FROM contratos c
  LEFT JOIN arrendatarios a ON a.id = c.arrendatario_id
  LEFT JOIN cargos_programados cp ON cp.contrato_id = c.id
  GROUP BY c.id, c.numero_contrato, a.nombre_razon_social, c.fecha_inicio, c.fecha_fin
  ORDER BY c.fecha_inicio
`)

console.log('\n=== Contratos y cobros por contrato ===')
console.log(`${'Num.Contrato'.padEnd(15)} ${'Arrendatario'.padEnd(30)} ${'Inicio'.padEnd(12)} ${'Fin'.padEnd(12)} ${'Meses'.padEnd(7)} ${'Total'.padEnd(7)} ${'PAGADO'.padEnd(8)} PEND`)
console.log('─'.repeat(110))

let sumMeses = 0, sumTotal = 0, sumPagado = 0, sumPend = 0
for (const r of res.rows) {
  const inicio = r.fecha_inicio ? r.fecha_inicio.toISOString().slice(0,10) : '—'
  const fin    = r.fecha_fin    ? r.fecha_fin.toISOString().slice(0,10)    : '—'
  const meses  = r.meses_contrato ? parseInt(r.meses_contrato) : 0
  sumMeses  += meses
  sumTotal  += parseInt(r.cargos_total)
  sumPagado += parseInt(r.cargos_pagados)
  sumPend   += parseInt(r.cargos_pendientes)
  console.log(
    `${(r.numero_contrato||'—').padEnd(15)} ${(r.arrendatario||'—').slice(0,29).padEnd(30)} ${inicio.padEnd(12)} ${fin.padEnd(12)} ${String(meses).padEnd(7)} ${String(r.cargos_total).padEnd(7)} ${String(r.cargos_pagados).padEnd(8)} ${r.cargos_pendientes}`
  )
}
console.log('─'.repeat(110))
console.log(`${'TOTAL'.padEnd(15)} ${String(res.rows.length)+' contratos'.padEnd(30)} ${''.padEnd(12)} ${''.padEnd(12)} ${String(sumMeses).padEnd(7)} ${String(sumTotal).padEnd(7)} ${String(sumPagado).padEnd(8)} ${sumPend}`)

// Estados distintos en cargos
const estados = await client.query(`SELECT estado, COUNT(*) FROM cargos_programados GROUP BY estado ORDER BY estado`)
console.log('\n=== Estados en cargos_programados ===')
estados.rows.forEach(r => console.log(`  ${r.estado}: ${r.count}`))

await client.end()
