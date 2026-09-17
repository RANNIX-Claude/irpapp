import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.kusuoxwzdxfuybvyiakg.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

const r = await c.query(`
  SELECT
    (SELECT COUNT(*) FROM contratos) AS contratos,
    (SELECT COUNT(*) FROM cargos_programados) AS cargos,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PAGADO') AS pagados,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PENDIENTE') AS pendientes,
    (SELECT COUNT(*) FROM cargos_programados WHERE estado='PARCIAL') AS parciales,
    (SELECT COUNT(*) FROM ingresos) AS ingresos,
    (SELECT COUNT(*) FROM aplicaciones_pago) AS aplicaciones,
    (SELECT COUNT(*) FROM (
      SELECT i.id FROM ingresos i
      LEFT JOIN aplicaciones_pago ap ON ap.ingreso_id=i.id
      GROUP BY i.id, i.importe
      HAVING ABS(i.importe - COALESCE(SUM(ap.importe_aplicado),0)) > 0.01
    ) x) AS descuadres
`)
const f = r.rows[0]
console.log('\n=== PRODUCCIÓN ===')
console.log(`Contratos:    ${f.contratos}`)
console.log(`Cargos total: ${f.cargos}  (PAGADO: ${f.pagados} | PENDIENTE: ${f.pendientes} | PARCIAL: ${f.parciales})`)
console.log(`Ingresos:     ${f.ingresos}`)
console.log(`Aplicaciones: ${f.aplicaciones}`)
console.log(`Descuadres:   ${f.descuadres}`)

// Contratos y su estado de cobros
const ct = await c.query(`
  SELECT ct.numero_contrato, ct.locales_display, ct.fecha_inicio,
    COUNT(cp.id) AS total,
    SUM(CASE WHEN cp.estado='PAGADO' THEN 1 ELSE 0 END) AS pagados,
    SUM(CASE WHEN cp.estado='PENDIENTE' THEN 1 ELSE 0 END) AS pendientes,
    (2026 - EXTRACT(YEAR FROM ct.fecha_inicio)::int) * 12
      + 9 - EXTRACT(MONTH FROM ct.fecha_inicio)::int + 1 AS esperados
  FROM contratos ct
  LEFT JOIN cargos_programados cp ON cp.contrato_id=ct.id
  GROUP BY ct.id, ct.numero_contrato, ct.locales_display, ct.fecha_inicio
  ORDER BY ct.fecha_inicio
`)

console.log(`\n${'Contrato'.padEnd(22)} ${'Local'.padEnd(12)} ${'Total'.padStart(7)} ${'PAGADO'.padStart(8)} ${'PENDIENTE'.padStart(10)} ${'Sep/26'.padStart(8)}`)
console.log('─'.repeat(72))
for (const r of ct.rows) {
  console.log(`${r.numero_contrato.padEnd(22)} ${(r.locales_display||'—').padEnd(12)} ${String(r.total).padStart(7)} ${String(r.pagados).padStart(8)} ${String(r.pendientes).padStart(10)} ${String(r.esperados).padStart(8)}`)
}

await c.end()
