// Diagnóstico de entradas/salidas del checador. SOLO LECTURA: no escribe nada.
//
//   node scripts/diagnostico-asistencia.mjs <qa|prod> [ruta-del-archivo-del-checador]
//
// 1. Con archivo: lo lee, reconoce a cada persona y muestra, día por día, qué operación (ENTRADA /
//    SALIDA) decide la lógica nueva y con qué método, frente a la alternancia simple que se usaba.
// 2. Siempre: audita lo YA GUARDADO en rh_checadas con la misma lógica y cuenta los marcajes cuya
//    operación estaría invertida (un solo marcaje faltante voltea todos los siguientes).
import fs from 'fs'
import pg from 'pg'
import { parsearChecador, resolverMarcajes, asignarOperaciones } from '../src/lib/checador.js'

const [, , ambiente = 'prod', archivo] = process.argv
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

const emps = await q(`select id, numero_empleado, nombre_completo from public.prp_empleados`)
const extra = await q(`select id, horario_trabajo, hora_entrada_prog::text hora_entrada_prog, hora_salida_prog::text hora_salida_prog, cruza_medianoche from public.rh_empleados`)
const rotaFilas = await q(`select fecha::text fecha, empleado_id from public.rh_turnos_guardia`)
const extras = new Map(extra.map(x => [x.id, x]))
const guardias = extra.filter(x => x.cruza_medianoche).map(x => x.id)
const rota = new Map(rotaFilas.map(x => [x.fecha, x.empleado_id]))
const nombre = id => emps.find(e => e.id === id)?.nombre_completo || id
const dow = f => ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(f + 'T12:00:00').getDay()]

console.log(`\nAmbiente: ${ambiente.toUpperCase()} · ${emps.length} empleados · rol de guardia: ${rotaFilas.length} días (${rotaFilas.map(r => r.fecha).sort()[0] || '—'} → ${rotaFilas.map(r => r.fecha).sort().at(-1) || '—'})`)

// ── 1. El archivo, día por día ──────────────────────────────────────────────
if (archivo) {
  const ev = parsearChecador(fs.readFileSync(archivo, 'utf8'))
  const r = resolverMarcajes(emps, ev, {}, { extras, rota, guardias })
  const fechas = ev.map(e => e.fecha).sort()
  console.log(`\n══ ARCHIVO ${archivo.split(/[\\/]/).pop()} — ${ev.length} marcajes · ${fechas[0]} → ${fechas.at(-1)}`)
  console.log(`Reconocidos ${r.grupos.length}/${new Set(ev.map(e => e.numero)).size} · sin reconocer ${r.sinReconocer.length} · operaciones que cambian vs. la alternancia simple: ${r.reasignadas} · dudosos: ${r.dudosos.length}`)
  for (const g of r.grupos) console.log(`  #${g.numero} ${g.nombre.padEnd(10)} → ${g.empleado}${g.guardia ? '  [GUARDIA 24 h]' : ''}  [${g.via}]${g.choque ? '  · en el catálogo ese número es de ' + g.choque : ''}`)
  r.sinReconocer.forEach(s => console.log(`  ✗ #${s.numero} ${s.nombre}: ${s.motivo}`))

  // día por día por persona: marcajes con la operación decidida
  const porPersona = new Map()
  for (const f of r.filas) (porPersona.get(f.empleado_id) || porPersona.set(f.empleado_id, []).get(f.empleado_id)).push(f)
  const provisional = new Map()   // (numero|fecha hora) -> operación que daba la alternancia
  for (const e of ev) provisional.set(`${e.numero}|${e.fecha} ${e.hora}:00`, e.operacion)
  for (const [id, filas] of porPersona) {
    console.log(`\n── ${nombre(id)}${extras.get(id)?.cruza_medianoche ? '  (guardia 24 h)' : `  · ${extras.get(id)?.horario_trabajo || 'sin horario'}`}`)
    const dias = new Map()
    for (const f of filas) (dias.get(f.fecha_hora.slice(0, 10)) || dias.set(f.fecha_hora.slice(0, 10), []).get(f.fecha_hora.slice(0, 10))).push(f)
    for (const [dia, fs_] of dias) {
      const txt = fs_.map(f => { const antes = provisional.get(`${f.numero_empleado_ext}|${f.fecha_hora}`); return `${f.operacion === 'ENTRADA' ? 'E' : 'S'} ${f.fecha_hora.slice(11, 16)}${antes && antes !== f.operacion ? ' ⚠(alternancia decía ' + (antes === 'ENTRADA' ? 'E' : 'S') + ')' : ''}` }).join('   ')
      console.log(`   ${dia} ${dow(dia)}  ${txt}`)
    }
  }
  if (r.dudosos.length) { console.log('\nMarcajes DUDOSOS (conviene revisarlos):'); r.dudosos.forEach(d => console.log(`   ${d.empleado.split(' ')[0]} ${d.fecha} ${d.hora} → ${d.operacion}  · ${d.metodo}`)) }
}

// ── 2. Auditoría de lo ya guardado ──────────────────────────────────────────
const guardado = await q(`select id, empleado_id, to_char(fecha_hora,'YYYY-MM-DD') fecha, to_char(fecha_hora,'HH24:MI') hora, operacion from public.rh_checadas order by empleado_id, fecha_hora`)
const porEmp = new Map()
for (const g of guardado) (porEmp.get(g.empleado_id) || porEmp.set(g.empleado_id, []).get(g.empleado_id)).push({ ...g, inferida: true })
console.log(`\n══ AUDITORÍA DE LO YA GUARDADO — ${guardado.length} marcajes`)
const filasResumen = []
const detalle = new Map()
for (const [id, evs] of porEmp) {
  const dec = asignarOperaciones(evs, { id, ...(extras.get(id) || {}) }, rota, guardias)
  const malos = dec.filter(d => d.cambio)
  const dudosos = dec.filter(d => d.dudoso).length
  filasResumen.push({ empleado: nombre(id), marcajes: evs.length, 'a corregir': malos.length, dudosos, 'días afectados': new Set(malos.map(m => m.fecha)).size })
  detalle.set(id, malos)
}
console.table(filasResumen)
const [pidCarmen] = [...porEmp.keys()].filter(id => /CARMEN/i.test(nombre(id)))
if (pidCarmen) {
  console.log(`Detalle — ${nombre(pidCarmen)} (lo guardado vs. lo correcto):`)
  const dec = asignarOperaciones(porEmp.get(pidCarmen), { id: pidCarmen, ...(extras.get(pidCarmen) || {}) }, rota, guardias)
  const dias = new Map()
  for (const d of dec) (dias.get(d.fecha) || dias.set(d.fecha, []).get(d.fecha)).push(d)
  for (const [dia, ds] of dias) console.log(`   ${dia} ${dow(dia)}  ` + ds.map(d => `${d.hora} guardado=${d.inferida ? '' : ''}${porEmp.get(pidCarmen).find(x => x.fecha === d.fecha && x.hora === d.hora)?.operacion?.[0]} correcto=${d.operacion[0]}${d.cambio ? ' ✗' : ''}`).join('   '))
}
await c.query('ROLLBACK'); await c.end()
