// Corrige el arrastre de inventario de vending SOLO en las semanas ABIERTAS: qty_inicial = qty_final de la
// semana anterior (por producto). Las semanas CERRADAS no se tocan.
//   node scripts/corregir-vending.mjs <qa|prod>            simula (no escribe)
//   node scripts/corregir-vending.mjs <qa|prod> --aplicar  respalda, corrige y se autoverifica
// Respaldo y reversa quedan en supabase/backups/ (solo local: el repo es público).
import fs from 'fs'
import pg from 'pg'

const [, , ambiente = 'prod', ...flags] = process.argv
const aplicar = flags.includes('--aplicar')
const env = { ...process.env }
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const cfg = ambiente === 'qa'
  ? { host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co', user: 'postgres', password: env.QA_SUPABASE_DB_PASSWORD }
  : { host: 'aws-1-us-west-2.pooler.supabase.com', user: 'postgres.kusuoxwzdxfuybvyiakg', password: env.SUPABASE_DB_PASSWORD }
const c = new pg.Client({ ...cfg, port: 5432, database: 'postgres', ssl: { rejectUnauthorized: false } })
await c.connect()
const q = async (s, a) => (await c.query(s, a)).rows

const descuadres = () => q(`
  select d.id, s.fecha_inicio::text sem, p.producto, d.qty_inicial::float ini, a.qty_final::float debe_ser
    from public.vending_semana_producto d
    join public.vending_semanas s on s.id = d.semana_id and s.estado = 'ABIERTA'
    join public.vending_productos p on p.id = d.producto_id
    join public.vending_semanas sp on sp.fecha_inicio = s.fecha_inicio - 7
    join public.vending_semana_producto a on a.semana_id = sp.id and a.producto_id = d.producto_id
   where d.qty_inicial is distinct from a.qty_final
   order by s.fecha_inicio, p.producto`)

await c.query('BEGIN')
try {
  const antes = await descuadres()
  console.log(`Ambiente ${ambiente.toUpperCase()} · semanas abiertas con inicial ≠ final anterior: ${antes.length} productos-semana`)
  const porSem = {}; antes.forEach(r => { porSem[r.sem] = (porSem[r.sem] || 0) + 1 })
  console.log(' ', JSON.stringify(porSem))

  const ab = await q(`select id, fecha_inicio::text ini from public.vending_semanas where estado = 'ABIERTA' order by fecha_inicio`)
  const ids = ab.map(x => x.id)
  const respaldo = await q(`select id, semana_id, producto_id, qty_inicial::float qty_inicial from public.vending_semana_producto where semana_id = any($1)`, [ids])

  // Semana por semana, en orden: cada una toma el final YA corregido de la anterior.
  let cambios = 0
  for (const s of ab) {
    const r = await c.query(`
      update public.vending_semana_producto d
         set qty_inicial = a.qty_final
        from public.vending_semanas sp
        join public.vending_semana_producto a on a.semana_id = sp.id
       where d.semana_id = $1 and sp.fecha_inicio = $2::date - 7
         and a.producto_id = d.producto_id and d.qty_inicial is distinct from a.qty_final`, [s.id, s.ini])
    cambios += r.rowCount
  }
  const despues = await descuadres()
  const negativos = await q(`select s.fecha_inicio::text sem, p.producto, d.qty_final::float fin
    from public.vending_semana_producto d join public.vending_semanas s on s.id = d.semana_id and s.estado = 'ABIERTA'
    join public.vending_productos p on p.id = d.producto_id where d.qty_final < 0 order by 1, 2`)
  console.log(`Filas corregidas: ${cambios} · descuadres que quedan: ${despues.length}`)
  console.log(`Inventarios NEGATIVOS que quedan (falta registrar compras/entradas): ${negativos.length}`)
  negativos.forEach(n => console.log(`   ${n.sem} ${n.producto}: ${n.fin}`))
  if (despues.length) throw new Error('quedaron descuadres tras la corrección')

  if (!aplicar) { await c.query('ROLLBACK'); console.log('\nSimulación: nada se escribió. Con --aplicar se guarda.') }
  else {
    const sello = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    const base = new URL(`../supabase/backups/vending-${ambiente}-${sello}`, import.meta.url)
    fs.writeFileSync(base.pathname.replace(/^\/([A-Za-z]:)/, '$1') + '.json', JSON.stringify(respaldo))
    const rev = respaldo.map(r => `update public.vending_semana_producto set qty_inicial = ${r.qty_inicial} where id = '${r.id}';`).join('\n')
    fs.writeFileSync(base.pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/vending-/, 'rollback-vending-') + '.sql', rev + '\n')
    await c.query('COMMIT')
    console.log(`\nAPLICADO. Respaldo y reversa en supabase/backups/ (…vending-${ambiente}-${sello}.*)`)
  }
} catch (e) {
  await c.query('ROLLBACK').catch(() => {})
  console.error('ERROR, se revirtió todo:', e.message); process.exitCode = 1
}
await c.end()
