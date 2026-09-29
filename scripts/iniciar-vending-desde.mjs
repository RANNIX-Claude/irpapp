// Arranca el control de inventario de vending desde una semana: borra el DETALLE de inventario anterior
// (vending_semana_producto y sus movimientos), toma el inicial de esa semana como conteo físico confirmado y
// encadena las semanas siguientes. NO borra vending_semanas: sus totales (venta_pesos/utilidad) alimentan
// Resumen Semanal y EDR.
//   node scripts/iniciar-vending-desde.mjs <qa|prod> <YYYY-MM-DD>            simula
//   node scripts/iniciar-vending-desde.mjs <qa|prod> <YYYY-MM-DD> --aplicar  respalda, borra, ancla y encadena
// Decisión del usuario (2026-09-29): el módulo no se usaba antes; se arranca en la semana del 2026-09-12.
// Respaldo y reversa quedan en supabase/backups/ (solo local).
import fs from 'fs'
import pg from 'pg'

const [, , ambiente = 'prod', desde, ...flags] = process.argv
if (!/^\d{4}-\d{2}-\d{2}$/.test(desde || '')) { console.error('uso: node scripts/iniciar-vending-desde.mjs <qa|prod> <YYYY-MM-DD> [--aplicar]'); process.exit(2) }
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

const semanas = await q(`select id, fecha_inicio::text ini, estado from public.vending_semanas where fecha_inicio >= $1 order by fecha_inicio`, [desde])
if (!semanas.length || semanas[0].ini !== desde) { console.error(`No existe la semana ${desde}`); process.exit(1) }
console.log(`Ambiente ${ambiente.toUpperCase()} · arranque en ${desde} · semanas desde ahí: ${semanas.map(s => `${s.ini}(${s.estado})`).join(', ')}`)

const [{ n_det }] = await q(`select count(*)::int n_det from public.vending_semana_producto d join public.vending_semanas s on s.id=d.semana_id where s.fecha_inicio < $1`, [desde])
const [{ n_mov }] = await q(`select count(*)::int n_mov from public.vending_movimientos m join public.vending_semanas s on s.id=m.semana_id where s.fecha_inicio < $1`, [desde])
const [{ n_sem }] = await q(`select count(*)::int n_sem from public.vending_semanas where fecha_inicio < $1`, [desde])
console.log(`A borrar: ${n_det} filas de detalle por producto · ${n_mov} movimientos (${n_sem} encabezados de semana se CONSERVAN)`)
const ancla = await q(`select p.producto, d.qty_inicial::float ini from public.vending_semana_producto d join public.vending_productos p on p.id=d.producto_id join public.vending_semanas s on s.id=d.semana_id where s.fecha_inicio=$1 order by 1`, [desde])
console.log(`Ancla ${desde}: ${ancla.map(a => `${a.producto} ${a.ini}`).join(' · ')}`)
const conMov = await q(`select s.fecha_inicio::text ini, count(*)::int n from public.vending_semana_producto d join public.vending_semanas s on s.id=d.semana_id where s.fecha_inicio > $1 and (d.qty_ventas<>0 or d.qty_compras<>0) group by 1 order by 1`, [desde])
console.log(`Semanas posteriores con ventas/compras (no se tocan sus cantidades): ${conMov.map(x => `${x.ini}:${x.n}`).join(', ') || 'ninguna'}`)

if (!aplicar) { console.log('\n(simulación: no se escribió nada; usa --aplicar)'); await c.end(); process.exit(0) }

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
const dir = new URL('../supabase/backups/', import.meta.url)
const base = `vending-arranque-${ambiente}-${stamp}`
const detalle = await q(`select d.* from public.vending_semana_producto d`)
const movs = await q(`select m.* from public.vending_movimientos m`)
fs.writeFileSync(new URL(`${base}.json`, dir), JSON.stringify({ detalle, movimientos: movs }, null, 2))
console.log(`\nRespaldo completo (detalle + movimientos): supabase/backups/${base}.json`)

await c.query('BEGIN')
try {
  // 1. Borrar el detalle anterior.
  await c.query(`delete from public.vending_movimientos m using public.vending_semanas s where s.id=m.semana_id and s.fecha_inicio < $1`, [desde])
  await c.query(`delete from public.vending_semana_producto d using public.vending_semanas s where s.id=d.semana_id and s.fecha_inicio < $1`, [desde])

  // 2. Ancla: el inicial de la semana de arranque es conteo físico confirmado (sin teórico previo).
  await c.query(`
    update public.vending_semana_producto d
       set qty_inicial_confirmado = true, qty_ajuste_inicial = 0,
           motivo_ajuste = 'Conteo inicial de arranque del módulo'
      from public.vending_semanas s
     where s.id = d.semana_id and s.fecha_inicio = $1`, [desde])

  // 3. Encadenar semana a semana. Primero se PROTEGE (marca como conteo confirmado) el inicial capturado a
  //    mano de las semanas posteriores para que el trigger de arrastre no lo pise; después se repara la
  //    inmediata siguiente (la que quedó con inicial viejo).
  for (let i = semanas.length - 1; i >= 1; i--) {
    const prev = semanas[i - 1].ini, cur = semanas[i].ini
    if (semanas[i].estado === 'ABIERTA') {
      await c.query(`
        update public.vending_semana_producto d
           set qty_inicial_confirmado = true,
               qty_ajuste_inicial = d.qty_inicial - a.qty_final,
               motivo_ajuste = coalesce(d.motivo_ajuste, 'Inicial capturado a mano antes del arranque')
          from public.vending_semanas s, public.vending_semanas sp, public.vending_semana_producto a
         where s.id = d.semana_id and s.fecha_inicio = $1::date and not d.qty_inicial_confirmado
           and sp.fecha_inicio = $2::date and a.semana_id = sp.id and a.producto_id = d.producto_id`, [cur, prev])
    }
  }
  for (let i = 1; i < semanas.length; i++) {
    if (semanas[i].estado === 'ABIERTA') continue
    await c.query(`
      update public.vending_semana_producto d
         set qty_inicial = a.qty_final
        from public.vending_semanas s, public.vending_semanas sp, public.vending_semana_producto a
       where s.id = d.semana_id and s.fecha_inicio = $1::date and sp.fecha_inicio = $2::date
         and a.semana_id = sp.id and a.producto_id = d.producto_id and not d.qty_inicial_confirmado`, [semanas[i].ini, semanas[i - 1].ini])
  }

  // 4. Verificación: solo las filas confirmadas pueden diferir del final anterior.
  const malas = await q(`
    select s.fecha_inicio::text sem, p.producto, d.qty_inicial::float ini, a.qty_final::float debe
      from public.vending_semana_producto d
      join public.vending_semanas s on s.id=d.semana_id and s.fecha_inicio > $1::date
      join public.vending_productos p on p.id=d.producto_id
      join public.vending_semanas sp on sp.fecha_inicio = s.fecha_inicio - 7
      join public.vending_semana_producto a on a.semana_id = sp.id and a.producto_id = d.producto_id
     where d.qty_inicial is distinct from a.qty_final and not d.qty_inicial_confirmado`, [desde])
  if (malas.length) throw new Error(`quedaron ${malas.length} filas sin cuadrar: ${JSON.stringify(malas.slice(0, 3))}`)
  const [{ restan }] = await q(`select count(*)::int restan from public.vending_semana_producto d join public.vending_semanas s on s.id=d.semana_id where s.fecha_inicio < $1`, [desde])
  if (restan) throw new Error(`aún quedan ${restan} filas anteriores`)

  await c.query('COMMIT')
  console.log(`Listo. Detalle anterior a ${desde} eliminado; arrastre encadenado desde el ancla.`)
} catch (e) {
  await c.query('ROLLBACK'); console.error('ERROR, se deshizo todo:', e.message); process.exit(1)
} finally { await c.end() }
