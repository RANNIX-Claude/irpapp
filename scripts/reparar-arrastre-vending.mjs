// Repara el arrastre roto entre dos semanas de vending: el inicial de la semana N+1 = final de la N.
//   node scripts/reparar-arrastre-vending.mjs <qa|prod> <fecha_inicio_semana_a_reparar>            simula
//   node scripts/reparar-arrastre-vending.mjs <qa|prod> <fecha_inicio_semana_a_reparar> --aplicar  respalda y repara
//
// Caso 2026-09-29: la semana 2026-09-19 (cerrada, sin ventas) conservó inicial viejo porque se creó cuando la
// anterior aún tenía valores previos a su corrección y el arrastre solo actualiza semanas ABIERTAS.
//
// Seguridad: la semana ABIERTA siguiente puede traer inicial capturado a mano (Ajustar inicial). Antes de
// mover la reparada se marcan esas filas como conteo confirmado y se guarda la diferencia, para que el trigger
// de arrastre NO las pise. Respaldo y reversa quedan en supabase/backups/ (solo local).
import fs from 'fs'
import pg from 'pg'

const [, , ambiente = 'prod', semana, ...flags] = process.argv
if (!semana) { console.error('uso: node scripts/reparar-arrastre-vending.mjs <qa|prod> <YYYY-MM-DD> [--aplicar]'); process.exit(2) }
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

const [sem] = await q(`select id, estado from public.vending_semanas where fecha_inicio = $1 limit 1`, [semana])
if (!sem) { console.error('No existe esa semana'); process.exit(1) }
console.log(`Ambiente ${ambiente.toUpperCase()} · semana ${semana} (${sem.estado})`)

const filas = () => q(`
  select d.id, p.producto, d.qty_inicial::float ini, a.qty_final::float debe_ser
    from public.vending_semana_producto d
    join public.vending_productos p on p.id = d.producto_id
    join public.vending_semanas sp on sp.fecha_inicio = $1::date - 7
    join public.vending_semana_producto a on a.semana_id = sp.id and a.producto_id = d.producto_id
   where d.semana_id = $2 and d.qty_inicial is distinct from a.qty_final
   order by p.producto`, [semana, sem.id])

const aRep = await filas()
const [{ n_ventas }] = await q(`select count(*)::int n_ventas from public.vending_semana_producto where semana_id=$1 and (qty_ventas<>0 or qty_compras<>0)`, [sem.id])
console.log(`Filas a reparar: ${aRep.length} · filas de esa semana con ventas/compras: ${n_ventas}`)
aRep.forEach(r => console.log(`  ${r.producto.padEnd(16)} inicial ${String(r.ini).padStart(6)} → ${String(r.debe_ser).padStart(6)}`))

const sig = await q(`
  select d.id, d.producto_id, p.producto, d.qty_inicial::float ini, d.qty_inicial_confirmado conf, s.estado
    from public.vending_semana_producto d
    join public.vending_semanas s on s.id = d.semana_id and s.fecha_inicio = $1::date + 7
    join public.vending_productos p on p.id = d.producto_id`, [semana])
console.log(`Semana siguiente (${sig[0]?.estado ?? 'no existe'}): ${sig.length} filas; se protegen como conteo confirmado las no confirmadas`)

if (!aplicar) { console.log('\n(simulación: no se escribió nada; usa --aplicar)'); await c.end(); process.exit(0) }
if (n_ventas > 0) { console.error('La semana tiene ventas/compras: no se repara automáticamente.'); await c.end(); process.exit(1) }

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
const dir = new URL('../supabase/backups/', import.meta.url)
const base = `vending-arrastre-${ambiente}-${stamp}`
const snap = await q(`select d.* from public.vending_semana_producto d join public.vending_semanas s on s.id = d.semana_id where s.fecha_inicio in ($1::date, $1::date + 7)`, [semana])
fs.writeFileSync(new URL(`${base}.json`, dir), JSON.stringify(snap, null, 2))
fs.writeFileSync(new URL(`rollback-${base}.sql`, dir),
  `-- Reversa del ${stamp}: restaura qty_inicial y banderas de conteo de las semanas ${semana} y +7\nBEGIN;\n` +
  snap.map(r => `UPDATE public.vending_semana_producto SET qty_inicial=${r.qty_inicial}, qty_inicial_confirmado=${r.qty_inicial_confirmado}, qty_ajuste_inicial=${r.qty_ajuste_inicial}, motivo_ajuste=${r.motivo_ajuste === null ? 'NULL' : `'${String(r.motivo_ajuste).replace(/'/g, "''")}'`} WHERE id='${r.id}';`).join('\n') + '\nCOMMIT;\n')
console.log(`\nRespaldo: supabase/backups/${base}.json (+ rollback-${base}.sql)`)

await c.query('BEGIN')
try {
  // 1. Proteger el inicial capturado a mano de la semana siguiente. Como la semana reparada no tiene
  //    movimientos, su final nuevo = final de la anterior; la diferencia contra ese teórico queda registrada.
  await c.query(`
    update public.vending_semana_producto d
       set qty_inicial_confirmado = true,
           qty_ajuste_inicial = d.qty_inicial - coalesce(a.qty_final, 0),
           motivo_ajuste = coalesce(d.motivo_ajuste, 'Inicial capturado a mano antes de reparar el arrastre')
      from public.vending_semanas s, public.vending_semanas sp, public.vending_semana_producto a
     where s.id = d.semana_id and s.fecha_inicio = $1::date + 7 and not d.qty_inicial_confirmado
       and sp.fecha_inicio = $1::date - 7 and a.semana_id = sp.id and a.producto_id = d.producto_id`, [semana])
  // 2. Reparar la semana: inicial = final de la anterior.
  await c.query(`
    update public.vending_semana_producto d
       set qty_inicial = a.qty_final
      from public.vending_semanas sp
      join public.vending_semana_producto a on a.semana_id = sp.id
     where sp.fecha_inicio = $1::date - 7 and d.semana_id = $2 and d.producto_id = a.producto_id
       and d.qty_inicial is distinct from a.qty_final`, [semana, sem.id])
  const rest = await filas()
  if (rest.length) throw new Error(`quedaron ${rest.length} filas sin cuadrar`)
  await c.query('COMMIT')
  console.log('Reparada. Semana', semana, 'cuadra con el final de la anterior.')
} catch (e) {
  await c.query('ROLLBACK'); console.error('ERROR, se deshizo todo:', e.message); process.exit(1)
} finally { await c.end() }
