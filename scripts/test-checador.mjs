// Pruebas de la lógica del checador (src/lib/checador.js). Sin red ni base de datos.
//   node scripts/test-checador.mjs
// Cada caso sale de un problema real de la asistencia (ver docs del commit): un marcaje faltante
// que volteaba entradas y salidas, veladores de 24 h, acentos que impedían reconocer a Verónica y
// a René, y un reloj cuya numeración no es la del catálogo.
import { parsearChecador, asignarOperaciones, horarioDelDia, resolverMarcajes } from '../src/lib/checador.js'

let total = 0, fallas = 0
const check = (nombre, ok, detalle = '') => { total++; if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${nombre}${!ok && detalle ? '  → ' + detalle : ''}`) }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

console.log('\nHorario programado (texto libre de rh_empleados.horario_trabajo)')
check('"Lunes a Sábado 8-16 horas" → 08:00-16:00', eq(horarioDelDia('Lunes a Sábado 8-16 horas', '2026-09-21') && (({ entrada, salida }) => [entrada, salida])(horarioDelDia('Lunes a Sábado 8-16 horas', '2026-09-21')), [480, 960]))
const fer = t => { const h = horarioDelDia('Lunes a Viernes 9-17 hrs / Domingo 9-14 horas', t); return h && [h.entrada, h.salida] }
check('Fernando en domingo → 9-14 (segmento del domingo)', eq(fer('2026-09-20'), [540, 840]), JSON.stringify(fer('2026-09-20')))
check('Fernando en lunes → 9-17', eq(fer('2026-09-21'), [540, 1020]), JSON.stringify(fer('2026-09-21')))
const jor = horarioDelDia('Lunes-Viernes 10-6', '2026-09-21')
check('"10-6" = 10:00 a 18:00 (6 es de la tarde)', eq([jor.entrada, jor.salida], [600, 1080]), JSON.stringify(jor))
const jua = horarioDelDia('Lunes a Domingo 14:30-21:30 hrs', '2026-09-21')
check('"14:30-21:30" con minutos', eq([jua.entrada, jua.salida], [870, 1290]), JSON.stringify(jua))
check('guardia "24h trabajo × 24h descanso" no inventa un horario', horarioDelDia('Lunes a Domingo 24h trabajo × 24h descanso', '2026-09-21') === null)

console.log('\nUn marcaje faltante NO voltea los días siguientes (caso Carmen)')
const mk = (fecha, hora) => ({ fecha, hora, operacion: 'ENTRADA', inferida: true })
const dias = [['2026-09-08', '07:33', '14:48'], ['2026-09-09', '07:46', null], ['2026-09-10', '07:36', '15:09'], ['2026-09-11', '07:37', '15:02']]
const carmen = dias.flatMap(([f, e, s]) => [mk(f, e), ...(s ? [mk(f, s)] : [])])
// tal como las dejaba la alternancia: al faltar la salida del 09, todo lo demás queda al revés
carmen.forEach((e, i) => { e.operacion = i % 2 === 0 ? 'ENTRADA' : 'SALIDA' })
const dec = asignarOperaciones(carmen, { id: 'C', horario_trabajo: 'Lunes a Domingo 8-15 hrs' })
const op = (f, h) => dec.find(d => d.fecha === f && d.hora === h)?.operacion
check('día completo antes del faltante: E 07:33 / S 14:48', op('2026-09-08', '07:33') === 'ENTRADA' && op('2026-09-08', '14:48') === 'SALIDA')
check('día del faltante: solo E 07:46 (y dudoso)', op('2026-09-09', '07:46') === 'ENTRADA' && dec.find(d => d.hora === '07:46').dudoso)
check('DESPUÉS del faltante: 07:36 = ENTRADA y 15:09 = SALIDA (antes quedaban al revés)', op('2026-09-10', '07:36') === 'ENTRADA' && op('2026-09-10', '15:09') === 'SALIDA', `${op('2026-09-10', '07:36')} / ${op('2026-09-10', '15:09')}`)
check('y el día siguiente igual', op('2026-09-11', '07:37') === 'ENTRADA' && op('2026-09-11', '15:02') === 'SALIDA')

console.log('\nUn solo marcaje en el día: se decide por cercanía al horario (Fernando el domingo)')
const f1 = asignarOperaciones([mk('2026-09-20', '14:05')], { id: 'F', horario_trabajo: 'Lunes a Viernes 9-17 hrs / Domingo 9-14 horas' })
check('14:05 el domingo (turno 9-14) = SALIDA, no ENTRADA', f1[0].operacion === 'SALIDA' && f1[0].dudoso, f1[0].operacion)
const f2 = asignarOperaciones([mk('2026-09-21', '09:11')], { id: 'F', horario_trabajo: 'Lunes a Viernes 9-17 hrs / Domingo 9-14 horas' })
check('09:11 el lunes (turno 9-17) = ENTRADA', f2[0].operacion === 'ENTRADA')
const f3 = asignarOperaciones([mk('2026-09-25', '13:05')], { id: 'R', horario_trabajo: 'Lunes a Domingo 13-21 horas' })
check('René 13:05 (turno 13-21) = ENTRADA', f3[0].operacion === 'ENTRADA')

console.log('\nDía con comida (4 marcajes) y con 3 marcajes')
const cuatro = asignarOperaciones([mk('2026-09-08', '08:00'), mk('2026-09-08', '13:00'), mk('2026-09-08', '14:00'), mk('2026-09-08', '16:00')], { id: 'V', horario_trabajo: '8-16' })
check('E 08:00, S 13:00, E 14:00, S 16:00', eq(cuatro.map(d => d.operacion[0]), ['E', 'S', 'E', 'S']))
const tres = asignarOperaciones([mk('2026-09-08', '08:00'), mk('2026-09-08', '13:00'), mk('2026-09-08', '16:00')], { id: 'V', horario_trabajo: '8-16' })
check('con 3: primero ENTRADA, último SALIDA, y se marca dudoso', tres[0].operacion === 'ENTRADA' && tres[2].operacion === 'SALIDA' && tres.some(d => d.dudoso))

console.log('\nVeladores de 24 h con el rol de guardia (Humberto y Demetrio)')
const H = 'H', D = 'D'
const rota = new Map([['2026-09-19', D], ['2026-09-20', H]])          // el rol capturado llega hasta el 20
const guardias = [D, H]
const eH = (f, h) => ({ fecha: f, hora: h, operacion: 'ENTRADA', inferida: true })
const humberto = asignarOperaciones([eH('2026-09-19', '08:53'), eH('2026-09-22', '09:27'), eH('2026-09-23', '08:53'), eH('2026-09-24', '09:23'), eH('2026-09-25', '08:53')], { id: H, cruza_medianoche: true }, rota, guardias)
check('Humberto: 19 SALIDA (terminó su guardia del 18), 22 ENTRADA, 23 SALIDA, 24 ENTRADA, 25 SALIDA', eq(humberto.map(d => d.operacion[0]), ['S', 'E', 'S', 'E', 'S']), humberto.map(d => d.operacion[0]).join(''))
const demetrio = asignarOperaciones([eH('2026-09-19', '09:12'), eH('2026-09-22', '09:01'), eH('2026-09-24', '09:01'), eH('2026-09-25', '09:12')], { id: D, cruza_medianoche: true }, rota, guardias)
check('Demetrio: 19 ENTRADA (su guardia), 22 SALIDA, 24 SALIDA, 25 ENTRADA', eq(demetrio.map(d => d.operacion[0]), ['E', 'S', 'S', 'E']), demetrio.map(d => d.operacion[0]).join(''))
check('el rol que va más allá de lo capturado se marca como extendido', humberto.some(d => /extendido/.test(d.metodo)) && humberto[0].metodo === 'rol de guardia (extendido)' || humberto.some(d => /extendido/.test(d.metodo)))
check('con el rol completo NO se marca extendido', asignarOperaciones([eH('2026-09-19', '09:12')], { id: D, cruza_medianoche: true }, new Map([['2026-09-18', H], ['2026-09-19', D]]), guardias)[0].metodo === 'rol de guardia')

// El rol solo se extiende unos días: 8 meses después no se adivina
const lejos = asignarOperaciones([eH('2027-05-20', '09:00')], { id: H, cruza_medianoche: true }, rota, guardias)
check('muy lejos del rol capturado: no se adivina (dudoso, se conserva la operación)', lejos[0].dudoso && /sin rol de guardia/.test(lejos[0].metodo), lejos[0].metodo)
const dosMarcajes = asignarOperaciones([eH('2026-09-19', '08:53'), eH('2026-09-19', '15:00')], { id: H, cruza_medianoche: true }, rota, guardias)
check('un velador con DOS marcajes el mismo día de relevo: ambos dudosos', dosMarcajes.every(d => d.dudoso))

console.log('\nLo que el archivo SÍ etiquetó se respeta')
const explicit = asignarOperaciones([{ fecha: '2026-09-08', hora: '15:00', operacion: 'ENTRADA', inferida: false }], { id: 'X', horario_trabajo: '8-16' })
check('formato con estatus: no se toca', explicit[0].operacion === 'ENTRADA' && explicit[0].metodo === 'archivo')

console.log('\nReconocimiento de personas: acentos y numeración del reloj (Verónica y René)')
const catalogo = [
  { id: 'v', numero_empleado: 'E001', nombre_completo: 'VERÓNICA NAVA MARTÍNEZ' }, { id: 'l', numero_empleado: 'E002', nombre_completo: 'LUIS FERNANDO VELÁZQUEZ ESCOBAR' },
  { id: 'h', numero_empleado: 'E003', nombre_completo: 'HUMBERTO ROMERO HERNANDEZ' }, { id: 'r', numero_empleado: 'E006', nombre_completo: 'RENÉ SÁNCHEZ DEGOLLADO' },
  { id: 'j', numero_empleado: 'E007', nombre_completo: 'JUAN CARRILLO SANTANA' },
]
const archivo = parsearChecador(['ID.\tNombre\tDepart.\tTiempo\tID del dispositivo',
  '7\tveronica\tNot Set1\t 2026-09-19     08:01:48\t1', '7\tveronica\tNot Set1\t 2026-09-19     16:00:46\t1',
  '3\trene\tNot Set1\t 2026-09-21     13:20:23\t1', '3\trene\tNot Set1\t 2026-09-21     21:02:06\t1'].join(String.fromCharCode(10)))
check('el lector entiende el formato de reloj real (fecha y hora juntas, primer nombre, minúsculas)', archivo.length === 4, String(archivo.length))
const res = resolverMarcajes(catalogo, archivo, {}, {})
check('"veronica" (número 7 del reloj, que en el catálogo es Juan) → VERÓNICA, sin intervención manual', res.grupos.find(g => g.numero === '7')?.empleado === 'VERÓNICA NAVA MARTÍNEZ', JSON.stringify(res.grupos.find(g => g.numero === '7')))
check('"rene" (número 3, que en el catálogo es Humberto) → RENÉ, sin intervención manual', res.grupos.find(g => g.numero === '3')?.empleado === 'RENÉ SÁNCHEZ DEGOLLADO')
check('y se avisa que el número del reloj no es el del catálogo', !!res.grupos.find(g => g.numero === '7')?.choque)
check('nadie queda sin reconocer', res.sinReconocer.length === 0, JSON.stringify(res.sinReconocer))
check('las operaciones salen bien: E 08:01 / S 16:00', res.filas.filter(f => f.empleado_id === 'v').map(f => f.operacion[0]).join('') === 'ES')
const ambiguo = resolverMarcajes([...catalogo, { id: 'v2', numero_empleado: 'E009', nombre_completo: 'VERONICA LOPEZ RUIZ' }], archivo.filter(e => e.numero === '7'), {}, {})
check('con DOS Verónicas no adivina: queda sin reconocer con el motivo', ambiguo.sinReconocer.length === 1 && /coincide con 2 empleados/.test(ambiguo.sinReconocer[0].motivo), JSON.stringify(ambiguo.sinReconocer))
const asignado = resolverMarcajes([...catalogo, { id: 'v2', numero_empleado: 'E009', nombre_completo: 'VERONICA LOPEZ RUIZ' }], archivo.filter(e => e.numero === '7'), { 7: 'E001' }, {})
check('...y con una asignación explícita sí se importa', asignado.grupos[0]?.empleado_id === 'v')

console.log(`\n${total - fallas}/${total} pruebas correctas${fallas ? ` — ${fallas} FALLARON` : ''}`)
process.exit(fallas ? 1 : 0)
