// Diagnóstico del arrastre de inventario de vending. SOLO LECTURA: no escribe nada.
//   node scripts/diagnostico-vending.mjs <qa|prod>
// Recorre todas las semanas en orden y verifica:
//   1. cada fila cumple final = inicial + compras − ventas
//   2. el inicial de la semana N+1 = el final de la semana N (por producto)  ← el arrastre
//   3. huecos, semanas repetidas y semanas sin detalle
//   4. compras/ventas de la fila contra los movimientos registrados
import fs from 'fs'
import pg from 'pg'

const [, , ambiente = 'prod'] = process.argv
const env = { ...process.env }
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const cfg = ambiente === 'qa'
  ? { host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co', user: 'postgres', password: env.QA_SUPABASE_DB_PASSWORD }
  : { host: 'aws-1-us-west-2.pooler.supabase.com', user: 'postgres.kusuoxwzdxfuybvyiakg', password: env.SUPABASE_DB_PASSWORD }
const c = new pg.Client({ ...cfg, port: 5432, database: 'postgres', ssl: { rejectUnauthorized: false } })
await c.connect(); await c.query('BEGIN READ ONLY')
const q = async (s, a) => (await c.query(s, a)).rows

const gen = await q(`select column_name from information_schema.columns where table_name='vending_semana_producto' and is_generated='ALWAYS'`)
console.log('columnas generadas en vending_semana_producto:', gen.map(x => x.column_name).join(', ') || 'ninguna')

const sems = await q(`select id, fecha_inicio::text ini, fecha_fin::text fin, estado, created_at from public.vending_semanas order by fecha_inicio, created_at`)
const dets = await q(`select d.*, p.producto nombre from public.vending_semana_producto d join public.vending_productos p on p.id = d.producto_id`)
const movs = await q(`select semana_id, producto_id, tipo, sum(cantidad)::float cant, count(*)::int n from public.vending_movimientos group by 1,2,3`)

console.log(`\n${sems.length} encabezados de semana · ${dets.length} filas de detalle · estados:`, JSON.stringify(sems.reduce((a, s) => (a[s.estado] = (a[s.estado] || 0) + 1, a), {})))
console.log('primera semana:', sems[0]?.ini, '· última:', sems.at(-1)?.ini)

const rep = {}; sems.forEach(s => { (rep[s.ini] = rep[s.ini] || []).push(s) })
const repetidas = Object.entries(rep).filter(([, v]) => v.length > 1)
console.log('\nsemanas con fecha_inicio repetida:', repetidas.length ? repetidas.map(([k, v]) => `${k} ×${v.length}`).join(', ') : 'ninguna')

const nDet = new Map(); dets.forEach(d => nDet.set(d.semana_id, (nDet.get(d.semana_id) || 0) + 1))
console.log('semanas SIN detalle por producto:', sems.filter(s => !nDet.get(s.id)).map(s => `${s.ini}(${s.estado})`).join(', ') || 'ninguna')

const ord = [...new Map(sems.map(s => [s.ini, s])).values()]
const saltos = []
for (let i = 1; i < ord.length; i++) { const d = (new Date(ord[i].ini) - new Date(ord[i - 1].ini)) / 864e5; if (d !== 7) saltos.push(`${ord[i - 1].ini} → ${ord[i].ini} (${d} días)`) }
console.log('saltos distintos de 7 días entre semanas:', saltos.join(' | ') || 'ninguno')

// 1. fórmula interna
const malF = []
for (const d of dets) {
  const esp = (+d.qty_inicial) + (+d.qty_compras) - (+d.qty_ventas)
  if (Math.abs(esp - (+d.qty_final)) > 0.001) malF.push({ sem: sems.find(s => s.id === d.semana_id)?.ini, prod: d.nombre, ini: +d.qty_inicial, comp: +d.qty_compras, vent: +d.qty_ventas, fin: +d.qty_final, esperado: esp })
}
console.log(`\n[1] filas donde final ≠ inicial + compras − ventas: ${malF.length}`)
malF.slice(0, 25).forEach(x => console.log('   ', JSON.stringify(x)))

// 4. movimientos vs fila
const mv = new Map(); movs.forEach(m => mv.set(`${m.semana_id}|${m.producto_id}|${m.tipo}`, m))
console.log('\n[4] tipos de movimiento registrados:', JSON.stringify(movs.reduce((a, m) => (a[m.tipo] = (a[m.tipo] || 0) + m.n, a), {})))
const dif4 = []
for (const d of dets) {
  const compras = [...mv.values()].filter(m => m.semana_id === d.semana_id && m.producto_id === d.producto_id && /compra/i.test(m.tipo)).reduce((a, m) => a + m.cant, 0)
  const ventas = [...mv.values()].filter(m => m.semana_id === d.semana_id && m.producto_id === d.producto_id && /venta/i.test(m.tipo)).reduce((a, m) => a + m.cant, 0)
  if ((compras && Math.abs(compras - +d.qty_compras) > 0.001) || (ventas && Math.abs(ventas - +d.qty_ventas) > 0.001))
    dif4.push({ sem: sems.find(s => s.id === d.semana_id)?.ini, prod: d.nombre, fila_compras: +d.qty_compras, mov_compras: compras, fila_ventas: +d.qty_ventas, mov_ventas: ventas })
}
console.log(`    filas cuyos movimientos no cuadran con la fila: ${dif4.length}`)
dif4.slice(0, 15).forEach(x => console.log('   ', JSON.stringify(x)))

// 2. arrastre
const byS = new Map(); dets.forEach(d => { if (!byS.has(d.semana_id)) byS.set(d.semana_id, new Map()); const m = byS.get(d.semana_id); m.set(d.producto_id, (m.get(d.producto_id) || []).concat(d)) })
const rotos = []; let ok = 0, nuevos0 = 0, sinPar = 0
for (let i = 1; i < ord.length; i++) {
  const a = byS.get(ord[i - 1].id), b = byS.get(ord[i].id)
  if (!a || !b) { sinPar++; continue }
  for (const [pid, filasB] of b) {
    const B = filasB[0], fa = a.get(pid)
    if (!fa) { if (+B.qty_inicial !== 0) rotos.push({ prev: ord[i - 1].ini, sem: ord[i].ini, prod: B.nombre, nota: 'sin fila en la semana anterior', inicial: +B.qty_inicial }); else nuevos0++; continue }
    const fin = +fa[0].qty_final, ini = +B.qty_inicial
    if (Math.abs(fin - ini) < 0.001) ok++
    else rotos.push({ prev: ord[i - 1].ini, sem: ord[i].ini, prod: B.nombre, final_prev: fin, inicial: ini, dif: ini - fin, estado_prev: ord[i - 1].estado, estado_sem: ord[i].estado, sem_creada: String(B.created_at).slice(0, 16), prev_creada: String(fa[0].created_at).slice(0, 16) })
  }
}
console.log(`\n[2] ARRASTRE semana a semana: ${ok} correctos · ${nuevos0} productos nuevos en 0 · ${sinPar} pares sin detalle · ${rotos.length} QUE NO CUADRAN`)
const porSem = {}; rotos.forEach(r => { (porSem[r.sem] = porSem[r.sem] || []).push(r) })
for (const [s, v] of Object.entries(porSem)) { console.log(`  semana ${s}: ${v.length} productos`); v.slice(0, 20).forEach(r => console.log('     ', JSON.stringify(r))) }

await c.end()
