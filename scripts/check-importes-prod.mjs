import pg from 'pg'
const { Client } = pg
const c = new Client({ host:'db.kusuoxwzdxfuybvyiakg.supabase.co', port:5432, database:'postgres', user:'postgres', password:'Tetonapo00!!', ssl:{rejectUnauthorized:false} })
await c.connect()

// Columnas de importe en contratos
const cols = await c.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='contratos'
  ORDER BY ordinal_position
`)
console.log('Columnas contratos:', cols.rows.map(r=>r.column_name).join(', '))

// Importe más reciente por contrato + variación
const res = await c.query(`
  SELECT ct.numero_contrato,
    COUNT(DISTINCT cp.importe) AS importes_distintos,
    MIN(cp.importe) AS min_importe,
    MAX(cp.importe) AS max_importe,
    (SELECT cp2.importe FROM cargos_programados cp2
      WHERE cp2.contrato_id=ct.id ORDER BY cp2.periodo_anio DESC, cp2.periodo_mes DESC LIMIT 1
    ) AS ultimo_importe
  FROM contratos ct
  JOIN cargos_programados cp ON cp.contrato_id=ct.id
  WHERE ct.numero_contrato NOT IN ('IWOL-2024-L14-R26','IWOL-2024-L14-R26-4227','IWOL-2025-L17-R26')
  GROUP BY ct.id, ct.numero_contrato
  ORDER BY ct.fecha_inicio
`)

console.log(`\n${'Contrato'.padEnd(22)} ${'Distintos'.padStart(10)} ${'Min'.padStart(12)} ${'Max'.padStart(12)} ${'Último'.padStart(12)}`)
console.log('─'.repeat(72))
for (const r of res.rows) {
  const variacion = parseInt(r.importes_distintos) > 1 ? ' ← VARÍA' : ''
  console.log(`${r.numero_contrato.padEnd(22)} ${String(r.importes_distintos).padStart(10)} ${Number(r.min_importe).toLocaleString('es-MX',{minimumFractionDigits:2}).padStart(12)} ${Number(r.max_importe).toLocaleString('es-MX',{minimumFractionDigits:2}).padStart(12)} ${Number(r.ultimo_importe).toLocaleString('es-MX',{minimumFractionDigits:2}).padStart(12)}${variacion}`)
}

await c.end()
