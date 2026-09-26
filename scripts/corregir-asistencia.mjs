// Corrige la asistencia YA guardada en rh_checadas: copias del mismo marcaje, persona equivocada o
// faltante, y entrada/salida invertida. Por omisión SOLO SIMULA (no escribe nada). Con --aplicar guarda
// un respaldo (incluidas las filas que borra), escribe en UNA transacción, se VERIFICA a sí mismo antes
// de confirmar (si algo no cuadra, revierte), deja un archivo de reversa y registra en la bitácora.
//
//   node scripts/corregir-asistencia.mjs <qa|prod> --archivo "<checador.txt>" [--aplicar]
//
// 0) COPIAS. Un marcaje se identifica por número del reloj + hora exacta. El mismo archivo se cargó
//    varias veces (unas sin persona, otras asignadas a una o a otra persona): son copias. Se deja UNA
//    (la que ya está con la persona correcta; si ninguna, cualquiera con persona; si ninguna, la más
//    antigua) y se borran las demás. No se pierde ningún marcaje distinto.
// 1) PERSONAS. El archivo del checador (con nombres) dice quién es cada número del reloj. Un número solo
//    se aplica si esa persona es la MAYORÍA (>= 60 %) de los marcajes guardados con ese número.
// 2) ENTRADA/SALIDA. Con el mismo código que usan el modal de RH y el agente (src/lib/checador.js):
//    horario de cada persona y rol de guardia. NO toca los días con un solo marcaje (dudosos).
import fs from 'fs'
import pg from 'pg'
import { parsearChecador, resolverMarcajes, asignarOperaciones } from '../src/lib/checador.js'

const args = process.argv.slice(2)
const ambiente = args[0] || 'prod'
const archivo = args[args.indexOf('--archivo') + 1]
const aplicar = args.includes('--aplicar')
const incluirDudosos = args.includes('--incluir-dudosos')
if (!archivo || archivo.startsWith('--')) { console.error('Uso: node scripts/corregir-asistencia.mjs <qa|prod> --archivo "<checador.txt>" [--aplicar]'); process.exit(1) }

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
await c.query(aplicar ? 'BEGIN' : 'BEGIN READ ONLY')

const emps = await q(`select id, numero_empleado, nombre_completo from public.prp_empleados`)
const extra = await q(`select id, horario_trabajo, hora_entrada_prog::text hora_entrada_prog, hora_salida_prog::text hora_salida_prog, cruza_medianoche from public.rh_empleados`)
const extras = new Map(extra.map(x => [x.id, x]))
const guardias = extra.filter(x => x.cruza_medianoche).map(x => x.id)
const rota = new Map((await q(`select fecha::text f, empleado_id from public.rh_turnos_guardia`)).map(x => [x.f, x.empleado_id]))
const nombre = id => id ? (emps.find(e => e.id === id)?.nombre_completo || id) : '(sin persona)'
const corto = id => nombre(id).split(' ').slice(0, 2).join(' ')

// ── Quién es cada número del reloj (según el archivo) ───────────────────────
const ev = parsearChecador(fs.readFileSync(archivo, 'utf8'))
const res = resolverMarcajes(emps, ev, {}, { extras, rota, guardias })
const mapa = new Map(res.grupos.map(g => [g.numero, g.empleado_id]))
console.log(`\nAmbiente ${ambiente.toUpperCase()} · archivo con ${ev.length} marcajes · ${mapa.size} números reconocidos${res.sinReconocer.length ? ` · SIN reconocer: ${res.sinReconocer.map(s => s.numero).join(',')}` : ''}`)

/** Calcula el plan sobre lo que haya guardado en este momento. */
async function planificar(imprimir) {
  const guardado = await q(`select id, empleado_id, numero_empleado_ext numero, to_char(fecha_hora,'YYYY-MM-DD') fecha, to_char(fecha_hora,'HH24:MI') hora, fecha_hora::text fh, operacion, origen, notas, created_at::text creado from public.rh_checadas order by fecha_hora, created_at, id`)
  const original = new Map(guardado.map(g => [g.id, { empleado_id: g.empleado_id, operacion: g.operacion }]))
  let estado = guardado.map(g => ({ ...g }))
  const log = (...a) => { if (imprimir) console.log(...a) }
  const tabla = t => { if (imprimir) console.table(t) }

  // 0) Copias
  const grupos = new Map()
  for (const g of estado) { const k = `${g.numero}|${g.fh}`; (grupos.get(k) || grupos.set(k, []).get(k)).push(g) }
  const eliminar = []
  for (const arr of grupos.values()) {
    if (arr.length < 2) continue
    const objetivo = mapa.get(arr[0].numero)
    const quedar = arr.find(g => objetivo && g.empleado_id === objetivo) || arr.find(g => g.empleado_id) || arr[0]
    for (const g of arr) if (g !== quedar) eliminar.push(g)
  }
  const ids = new Set(eliminar.map(g => g.id))
  log(`\n0) COPIAS — ${eliminar.length} marcajes son copias del mismo marcaje (mismo número y hora) y se eliminan; queda una por marcaje`)
  tabla(Object.entries(eliminar.reduce((a, g) => { const k = `#${g.numero} · ${g.empleado_id ? 'asignada a ' + corto(g.empleado_id) : 'sin persona'}`; a[k] = (a[k] || 0) + 1; return a }, {})).map(([copia, n]) => ({ copia, cantidad: n })))
  estado = estado.filter(g => !ids.has(g.id))

  // 1) Personas
  log('1) PERSONAS — quién es cada número del reloj frente a lo guardado (ya sin copias)')
  const filasP = []
  for (const [numero, empId] of mapa) {
    const suyos = estado.filter(g => g.numero === numero)
    if (!suyos.length) continue
    const dist = new Map(); for (const g of suyos) dist.set(g.empleado_id, (dist.get(g.empleado_id) || 0) + 1)
    const conPersona = suyos.filter(g => g.empleado_id).length
    const delMapa = dist.get(empId) || 0
    const mayoria = conPersona ? delMapa / conPersona : 0
    const cambian = suyos.filter(g => g.empleado_id !== empId)
    const ok = mayoria >= 0.6
    filasP.push({ 'número': numero, 'según el archivo': corto(empId), guardados: suyos.length, 'ya con esa persona': delMapa, 'sin persona': dist.get(null) || 0, 'con otra': suyos.length - delMapa - (dist.get(null) || 0), 'mayoría': `${Math.round(mayoria * 100)}%`, decisión: cambian.length === 0 ? 'sin cambios' : ok ? `REASIGNAR ${cambian.length}` : 'NO (mayoría dudosa)' })
    if (ok) for (const g of cambian) g.empleado_id = empId
  }
  tabla(filasP)

  // 2) Entrada / salida
  log('2) ENTRADA/SALIDA — recalculadas con horario y rol de guardia (no se tocan los días con un solo marcaje)')
  const porEmp = new Map()
  for (const g of estado) if (g.empleado_id) (porEmp.get(g.empleado_id) || porEmp.set(g.empleado_id, []).get(g.empleado_id)).push({ id: g.id, fecha: g.fecha, hora: g.hora, operacion: g.operacion, inferida: true })
  const filasO = []
  let extendidos = 0
  for (const [id, evs] of porEmp) {
    const dec = asignarOperaciones(evs, { id, ...(extras.get(id) || {}) }, rota, guardias)
    // Los días con un solo marcaje (dudosos) solo se tocan con --incluir-dudosos: se decide por cercanía al horario.
    const malos = dec.filter(d => d.cambio && (incluirDudosos || !d.dudoso))
    for (const d of malos) estado.find(g => g.id === d.id).operacion = d.operacion
    extendidos += malos.filter(d => /extendido/.test(d.metodo)).length
    filasO.push({ persona: corto(id), marcajes: evs.length, 'se corrigen': malos.length, 'días': new Set(malos.map(m => m.fecha)).size, 'dudosos (no se tocan)': dec.filter(d => d.cambio && d.dudoso).length })
  }
  tabla(filasO)
  if (extendidos) log(`   (${extendidos} correcciones de guardia se apoyan en el rol de guardia extendido; el rol capturado llega hasta ${[...rota.keys()].sort().slice(-1)[0]})`)

  // Verificación del estado resultante
  const cambios = estado.filter(g => { const o = original.get(g.id); return o.empleado_id !== g.empleado_id || o.operacion !== g.operacion })
  const claves = new Map(); const choques = []
  for (const g of estado) { const k = `${g.empleado_id}|${g.fh}|${g.operacion}`; if (g.empleado_id && claves.has(k)) choques.push(k); claves.set(k, g.id) }
  const invertidos = []
  for (const [id] of porEmp) {
    if (extras.get(id)?.cruza_medianoche) continue
    const porDia = new Map(); for (const g of estado.filter(x => x.empleado_id === id)) (porDia.get(g.fecha) || porDia.set(g.fecha, []).get(g.fecha)).push(g)
    for (const [d, gs] of porDia) { const e = gs.filter(x => x.operacion === 'ENTRADA').map(x => x.hora).sort()[0], s = gs.filter(x => x.operacion === 'SALIDA').map(x => x.hora).sort().slice(-1)[0]; if (e && s && s < e) invertidos.push(`${corto(id)} ${d}`) }
  }
  const sinPersona = estado.filter(g => !g.empleado_id).length
  log(`\nRESULTADO: ${eliminar.length} copias se eliminan · ${cambios.length} marcajes cambian (${cambios.filter(g => original.get(g.id).empleado_id !== g.empleado_id).length} de persona, ${cambios.filter(g => original.get(g.id).operacion !== g.operacion).length} de operación) · quedan ${estado.length} de ${guardado.length}`)
  log(`  · choques con el índice único (empleado, hora, operación): ${choques.length}${choques.length ? '  ⚠ ' + choques.slice(0, 2).join(' ; ') : ''}`)
  log(`  · días de horario diurno con la salida antes que la entrada después de corregir: ${invertidos.length}${invertidos.length ? '  ⚠ ' + invertidos.slice(0, 5).join(', ') : ''}`)
  log(`  · marcajes que quedan sin persona: ${sinPersona}`)
  return { guardado, original, estado, eliminar, cambios, choques, invertidos, sinPersona }
}

const plan = await planificar(true)
const nominas = await q(`select * from public.nomina_periodos where fecha_fin >= '2026-09-01' order by fecha_inicio`).catch(() => [])
console.log(`  · periodos de nómina que tocan septiembre: ${nominas.length ? nominas.map(n => `${n.folio} ${String(n.fecha_inicio).slice(0, 10)}→${String(n.fecha_fin).slice(0, 10)} [${n.estatus || n.estado || '?'}]`).join(' | ') : 'ninguno'} (este script NO recalcula nómina)`)

if (plan.choques.length || plan.invertidos.length || plan.sinPersona) {
  console.log(`\n${aplicar ? 'NO SE APLICA' : 'Simulación terminada'}: el resultado tendría advertencias (choques, días invertidos o marcajes sin persona).`)
  await c.query('ROLLBACK'); await c.end(); process.exit(aplicar ? 2 : 0)
}
if (!aplicar) { console.log('\nSimulación terminada. No se escribió nada. Para aplicar: agrega --aplicar'); await c.query('ROLLBACK'); await c.end(); process.exit(0) }

// ── Aplicar ─────────────────────────────────────────────────────────────────
const { original, estado, eliminar, cambios, guardado } = plan
const sello = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
const dir = new URL('../supabase/backups/', import.meta.url); fs.mkdirSync(dir, { recursive: true })
const respaldo = cambios.map(g => ({ id: g.id, numero: g.numero, fecha_hora: g.fh, era: original.get(g.id), queda: { empleado_id: g.empleado_id, operacion: g.operacion } }))
const respaldoEliminados = eliminar.map(g => ({ id: g.id, empleado_id: g.empleado_id, numero_empleado_ext: g.numero, operacion: g.operacion, fecha_hora: g.fh, origen: g.origen, notas: g.notas, created_at: g.creado }))
fs.writeFileSync(new URL(`asistencia-${ambiente}-${sello}.json`, dir), JSON.stringify({ cambiados: respaldo, eliminados: respaldoEliminados }, null, 1))
const lit = v => (v === null || v === undefined) ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'"
const NL = String.fromCharCode(10)
const rbUpd = respaldo.map(r => `UPDATE public.rh_checadas SET empleado_id = ${lit(r.era.empleado_id)}, operacion = ${lit(r.era.operacion)} WHERE id = ${lit(r.id)};`)
const rbIns = respaldoEliminados.map(r => `INSERT INTO public.rh_checadas (id, empleado_id, numero_empleado_ext, operacion, fecha_hora, origen, notas, created_at) VALUES (${lit(r.id)}, ${lit(r.empleado_id)}, ${lit(r.numero_empleado_ext)}, ${lit(r.operacion)}, ${lit(r.fecha_hora)}, ${lit(r.origen)}, ${lit(r.notas)}, ${lit(r.created_at)});`)
fs.writeFileSync(new URL(`rollback-asistencia-${ambiente}-${sello}.sql`, dir),
  `-- Reversa de la corrección de asistencia del ${sello}: restaura ${respaldo.length} marcajes y vuelve a insertar ${respaldoEliminados.length} copias eliminadas${NL}BEGIN;${NL}${rbUpd.join(NL)}${NL}${rbIns.join(NL)}${NL}COMMIT;${NL}`)
console.log(`\nRespaldo: supabase/backups/asistencia-${ambiente}-${sello}.json · reversa: rollback-asistencia-${ambiente}-${sello}.sql`)

// 1) borrar copias  2) actualizar persona y operación
if (eliminar.length) {
  const d = await c.query(`delete from public.rh_checadas where id = any($1::uuid[])`, [eliminar.map(g => g.id)])
  if (d.rowCount !== eliminar.length) { console.error(`Se esperaban ${eliminar.length} eliminaciones y hubo ${d.rowCount}: se cancela.`); await c.query('ROLLBACK'); await c.end(); process.exit(3) }
}
let hechos = 0
for (const g of cambios) {
  const r = await c.query(`update public.rh_checadas set empleado_id = $1, operacion = $2 where id = $3`, [g.empleado_id, g.operacion, g.id])
  hechos += r.rowCount
}
if (hechos !== cambios.length) { console.error(`Se esperaban ${cambios.length} cambios y se hicieron ${hechos}: se cancela.`); await c.query('ROLLBACK'); await c.end(); process.exit(3) }

// Autoverificación DENTRO de la transacción: si algo no cuadra, se revierte todo.
const despues = await q(`select count(*)::int n, count(*) filter (where empleado_id is null)::int sin_persona from public.rh_checadas`)
const copiasRestantes = await q(`select count(*)::int n from (select 1 from public.rh_checadas group by numero_empleado_ext, fecha_hora having count(*) > 1) t`)
const nuevoPlan = await planificar(false)
const ok = despues[0].n === guardado.length - eliminar.length && despues[0].sin_persona === 0 && copiasRestantes[0].n === 0 && nuevoPlan.cambios.length === 0 && nuevoPlan.eliminar.length === 0
console.log(`Verificación: ${despues[0].n} marcajes (esperados ${guardado.length - eliminar.length}) · sin persona ${despues[0].sin_persona} · horas con copias ${copiasRestantes[0].n} · cambios pendientes ${nuevoPlan.cambios.length}`)
if (!ok) { console.error('La verificación NO cuadra: se revierte todo.'); await c.query('ROLLBACK'); await c.end(); process.exit(4) }

await c.query(`insert into prp.bitacora (modulo, accion, entidad, descripcion, usuario_email, created_at) values ('RH', 'CORREGIR_ASISTENCIA', 'rh_checadas', $1, 'claude-code (script corregir-asistencia)', now())`,
  [`${eliminar.length} copias eliminadas y ${cambios.length} marcajes corregidos (persona y entrada/salida); respaldo asistencia-${ambiente}-${sello}.json`]).catch(() => {})
await c.query('COMMIT')
console.log(`APLICADO: ${eliminar.length} copias eliminadas y ${hechos} marcajes corregidos.`)
await c.end()
