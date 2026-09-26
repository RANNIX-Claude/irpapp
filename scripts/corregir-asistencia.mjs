// Corrige la asistencia YA guardada en rh_checadas: entrada/salida invertida y persona equivocada.
// Por omisión SOLO SIMULA (no escribe nada). Con --aplicar guarda un respaldo, escribe en UNA
// transacción, deja un archivo de reversa y registra en la bitácora. NO borra marcajes: si detecta
// COPIAS del mismo marcaje (mismo número del reloj y misma hora) las REPORTA y se niega a aplicar hasta
// que se decida qué hacer con ellas.
//
//   node scripts/corregir-asistencia.mjs <qa|prod> --archivo "<checador.txt>" [--aplicar]
//
// 1) PERSONAS. El archivo del checador (con nombres) dice quién es cada número del reloj. Un número
//    solo se aplica a los marcajes ya guardados si esa persona es la MAYORÍA (>= 60 %) de los marcajes
//    guardados con ese número. Se reasignan los que no tienen persona o tienen otra.
// 2) ENTRADA/SALIDA. Con el mismo código que usan el modal de RH y el agente (src/lib/checador.js):
//    horario de cada persona y rol de guardia. NO toca los días con un solo marcaje (dudosos).
import fs from 'fs'
import pg from 'pg'
import { parsearChecador, resolverMarcajes, asignarOperaciones } from '../src/lib/checador.js'

const args = process.argv.slice(2)
const ambiente = args[0] || 'prod'
const archivo = args[args.indexOf('--archivo') + 1]
const aplicar = args.includes('--aplicar')
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

// ── Lo guardado ─────────────────────────────────────────────────────────────
const guardado = (await q(`select id, empleado_id, numero_empleado_ext numero, to_char(fecha_hora,'YYYY-MM-DD') fecha, to_char(fecha_hora,'HH24:MI') hora, fecha_hora::text fh, operacion from public.rh_checadas order by fecha_hora, id`))
const original = new Map(guardado.map(g => [g.id, { empleado_id: g.empleado_id, operacion: g.operacion }]))
const estado = guardado.map(g => ({ ...g }))            // estado simulado

// 0) COPIAS (solo se REPORTAN; este script no borra nada)
const grupos = new Map()
for (const g of estado) (grupos.get(`${g.numero}|${g.fh}`) || grupos.set(`${g.numero}|${g.fh}`, []).get(`${g.numero}|${g.fh}`)).push(g)
const copias = [...grupos.values()].filter(a => a.length > 1)
const filasCopias = Object.entries(copias.reduce((a, arr) => { const k = `#${arr[0].numero}`; a[k] = a[k] || { horas: 0, marcajes: 0 }; a[k].horas++; a[k].marcajes += arr.length; return a }, {})).map(([numero, v]) => ({ numero, 'horas con copias': v.horas, 'marcajes en esas horas': v.marcajes, 'copias sobrantes': v.marcajes - v.horas }))
console.log(`\n0) COPIAS del mismo marcaje (mismo número y hora exacta): ${copias.length} horas repetidas`)
if (filasCopias.length) console.table(filasCopias)

// 1) Personas
console.log('1) PERSONAS — quién es cada número del reloj frente a lo guardado')
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
console.table(filasP)

// 2) Entrada / salida por persona con lo ya reasignado
console.log('2) ENTRADA/SALIDA — recalculadas con horario y rol de guardia (no se tocan los días con un solo marcaje)')
const porEmp = new Map()
for (const g of estado) if (g.empleado_id) (porEmp.get(g.empleado_id) || porEmp.set(g.empleado_id, []).get(g.empleado_id)).push({ id: g.id, fecha: g.fecha, hora: g.hora, operacion: g.operacion, inferida: true })
const filasO = []
let extendidos = 0
for (const [id, evs] of porEmp) {
  const dec = asignarOperaciones(evs, { id, ...(extras.get(id) || {}) }, rota, guardias)
  const malos = dec.filter(d => d.cambio && !d.dudoso)
  for (const d of malos) { estado.find(g => g.id === d.id).operacion = d.operacion }
  extendidos += malos.filter(d => /extendido/.test(d.metodo)).length
  const dud = dec.filter(d => d.cambio && d.dudoso).length
  filasO.push({ persona: corto(id), marcajes: evs.length, 'se corrigen': malos.length, 'días': new Set(malos.map(m => m.fecha)).size, 'dudosos (no se tocan)': dud })
}
console.table(filasO)
if (extendidos) console.log(`   (${extendidos} correcciones de guardia se apoyan en el rol de guardia extendido; el rol capturado llega hasta ${[...rota.keys()].sort().slice(-1)[0]})`)

// ── Verificación del estado simulado ────────────────────────────────────────
const cambios = estado.filter(g => { const o = original.get(g.id); return o.empleado_id !== g.empleado_id || o.operacion !== g.operacion })
const claves = new Map(); const choques = []
for (const g of estado) { const k = `${g.empleado_id}|${g.fh}|${g.operacion}`; if (g.empleado_id && claves.has(k)) choques.push(k); claves.set(k, g.id) }
const invertidosDespues = []
for (const [id] of porEmp) {
  if (extras.get(id)?.cruza_medianoche) continue
  const porDia = new Map(); for (const g of estado.filter(x => x.empleado_id === id)) (porDia.get(g.fecha) || porDia.set(g.fecha, []).get(g.fecha)).push(g)
  for (const [d, gs] of porDia) { const e = gs.filter(x => x.operacion === 'ENTRADA').map(x => x.hora).sort()[0], s = gs.filter(x => x.operacion === 'SALIDA').map(x => x.hora).sort().slice(-1)[0]; if (e && s && s < e) invertidosDespues.push(`${corto(id)} ${d}`) }
}
console.log(`\nRESULTADO SIMULADO: ${cambios.length} marcajes cambian (${cambios.filter(g => original.get(g.id).empleado_id !== g.empleado_id).length} de persona, ${cambios.filter(g => original.get(g.id).operacion !== g.operacion).length} de operación)`)
console.log(`  · choques con el índice único (empleado, hora, operación): ${choques.length}${choques.length ? '  ⚠ (son las copias del mismo marcaje) ' + choques.slice(0, 2).join(' ; ') : ''}`)
console.log(`  · días de horario diurno con la salida antes que la entrada DESPUÉS de corregir: ${invertidosDespues.length}${invertidosDespues.length ? '  ⚠ ' + invertidosDespues.slice(0, 5).join(', ') : ''}`)
console.log(`  · marcajes que siguen sin persona: ${estado.filter(g => !g.empleado_id).length}`)
const nominas = await q(`select * from public.nomina_periodos where fecha_fin >= '2026-09-01' order by fecha_inicio`).catch(() => [])
console.log(`  · periodos de nómina que tocan septiembre: ${nominas.length ? nominas.map(n => `${n.folio} ${String(n.fecha_inicio).slice(0, 10)}→${String(n.fecha_fin).slice(0, 10)} [${n.estatus || n.estado || '?'}]`).join(' | ') : 'ninguno'}`)

if (copias.length || choques.length || invertidosDespues.length) {
  console.log(`\n${aplicar ? 'NO SE APLICA' : 'Simulación terminada'}: hay ${copias.length} horas con copias del mismo marcaje. Corregir persona y operación con copias presentes choca con el índice único; decidir primero qué hacer con las copias.`)
  await c.query('ROLLBACK'); await c.end(); process.exit(aplicar ? 2 : 0)
}
if (!aplicar) { console.log('\nSimulación terminada. No se escribió nada. Para aplicar: agrega --aplicar'); await c.query('ROLLBACK'); await c.end(); process.exit(0) }

// ── Aplicar (solo actualiza persona y operación; no borra nada) ─────────────
const sello = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
const dir = new URL('../supabase/backups/', import.meta.url); fs.mkdirSync(dir, { recursive: true })
const respaldo = cambios.map(g => ({ id: g.id, numero: g.numero, fecha_hora: g.fh, era: original.get(g.id), queda: { empleado_id: g.empleado_id, operacion: g.operacion } }))
fs.writeFileSync(new URL(`asistencia-${ambiente}-${sello}.json`, dir), JSON.stringify(respaldo, null, 1))
const rb = respaldo.map(r => `UPDATE public.rh_checadas SET empleado_id = ${r.era.empleado_id ? `'${r.era.empleado_id}'` : 'NULL'}, operacion = '${r.era.operacion}' WHERE id = '${r.id}';`)
fs.writeFileSync(new URL(`rollback-asistencia-${ambiente}-${sello}.sql`, dir), `-- Reversa de la corrección de asistencia del ${sello} (${respaldo.length} marcajes)\nBEGIN;\n${rb.join('\n')}\nCOMMIT;\n`)
console.log(`\nRespaldo: supabase/backups/asistencia-${ambiente}-${sello}.json · reversa: rollback-asistencia-${ambiente}-${sello}.sql`)
let hechos = 0
for (const g of cambios) {
  const r = await c.query(`update public.rh_checadas set empleado_id = $1, operacion = $2 where id = $3`, [g.empleado_id, g.operacion, g.id])
  hechos += r.rowCount
}
if (hechos !== cambios.length) { console.error(`Se esperaban ${cambios.length} cambios y se hicieron ${hechos}: se cancela.`); await c.query('ROLLBACK'); await c.end(); process.exit(3) }
await c.query(`insert into prp.bitacora (modulo, accion, entidad, descripcion, usuario_email, created_at) values ('RH', 'CORREGIR_ASISTENCIA', 'rh_checadas', $1, 'claude-code (script corregir-asistencia)', now())`,
  [`${cambios.length} marcajes corregidos (persona y entrada/salida); respaldo asistencia-${ambiente}-${sello}.json`]).catch(() => {})
await c.query('COMMIT')
console.log(`APLICADO: ${hechos} marcajes corregidos.`)
await c.end()
