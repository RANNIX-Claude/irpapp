// Prueba de punta a punta de netlify/functions/ejecutar-accion.js contra QA (no usa el modelo).
//
//   node scripts/test-ejecutar-accion.mjs <correo-asistente> <contraseña>
//
// Arma propuestas reales con las funciones `preparar` de chat-operativo.js, las FIRMA como lo
// haría el servidor, las manda a ejecutar-accion con la sesión del asistente y comprueba en la
// base lo que quedó escrito. Al final BORRA lo que creó y restaura el contrato que renueva.
// Solo corre contra QA (usa QA_SUPABASE_SERVICE_ROLE_KEY de .env.local).
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { parsearChecador } from '../src/lib/checador.js'

const [, , EMAIL, PASSWORD] = process.argv
if (!EMAIL || !PASSWORD) { console.error('Uso: node scripts/test-ejecutar-accion.mjs <correo-asistente> <contraseña>'); process.exit(1) }

const env = { ...process.env }
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL_ = 'https://wijcjdbmdbxzmwpdxoal.supabase.co'
const SERVICE = env.QA_SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) { console.error('Falta QA_SUPABASE_SERVICE_ROLE_KEY en .env.local'); process.exit(1) }

// La anon key es pública: va dentro del bundle del sitio de QA.
const sitio = await fetch('https://irpapp-qa.netlify.app/').then(r => r.text())
const bundle = await fetch('https://irpapp-qa.netlify.app/' + sitio.match(/assets\/index-[A-Za-z0-9_-]+\.js/)[0]).then(r => r.text())
const ANON = (bundle.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g) || []).find(t => { try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString()); return p.ref === 'wijcjdbmdbxzmwpdxoal' && p.role === 'anon' } catch { return false } })

// La function y chat-operativo leen su configuración del entorno.
process.env.VITE_SUPABASE_URL = URL_
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE
process.env.VITE_SUPABASE_ANON_KEY = ANON

// chat-operativo.js no exporta ACCIONES ni firmar: se saca de una copia temporal.
fs.mkdirSync(new URL('../netlify/_tmp/', import.meta.url), { recursive: true })
const tmp = new URL('../netlify/_tmp/chat_tmp.cjs', import.meta.url)
fs.writeFileSync(tmp, fs.readFileSync(new URL('../netlify/functions/chat-operativo.js', import.meta.url), 'utf8') + '\nexports.__t = { ACCIONES, firmar }\n')
const { ACCIONES, firmar } = (await import(tmp.href)).default.__t   // firma de chat-operativo: la que debe aceptar ejecutar-accion
const { handler, firmar: firmarEjec } = await import('../netlify/functions/ejecutar-accion.js')

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false }, realtime: { transport: ws } })
const auth = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then(r => r.json())
if (!auth.access_token) { console.error('No se pudo iniciar sesión:', JSON.stringify(auth).slice(0, 120)); fs.unlinkSync(tmp); fs.rmdirSync(new URL('../netlify/_tmp/', import.meta.url)); process.exit(1) }
const UID = auth.user.id, JWT = auth.access_token

let fallas = 0, total = 0
const check = (label, ok, detalle = '') => { total++; if (!ok) fallas++; console.log(`  ${ok ? '✓' : '✗'} ${label}${detalle ? '  → ' + String(detalle).slice(0, 110) : ''}`) }
const llamar = async (accion, params, extra = {}) => {
  const emitida = extra.emitida ?? Date.now()
  const r = await handler({ httpMethod: 'POST', headers: { authorization: `Bearer ${extra.jwt ?? JWT}` }, body: JSON.stringify({ accion, params, emitida, firma: extra.firma ?? firmar(UID, accion, emitida, params), fichas: extra.fichas ?? {} }) })
  return { status: r.statusCode, ...JSON.parse(r.body) }
}
const JPG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
const imagen = { base64: JPG, mime: 'image/jpeg' }
const nuevo = { reservado: {}, fichas: {} }
const limpiar = []   // funciones async de limpieza

try {
  // ── Empaquetado ────────────────────────────────────────────────────────
  // Node local sí puede hacer require() de un archivo ESM, pero la function desplegada en Netlify
  // no: falla con "Unexpected token 'export'". Esta prueba no lo detecta ejecutando; lo vigila.
  console.log('\nEmpaquetado (Netlify)')
  const fuenteChat = fs.readFileSync(new URL('../netlify/functions/chat-operativo.js', import.meta.url), 'utf8')
  check('chat-operativo (CommonJS) no requiere archivos ESM de src/', !/require\(['"]\.\.\/\.\.\/src\//.test(fuenteChat))

  // ── Seguridad ──────────────────────────────────────────────────────────
  console.log('\nSeguridad')
  const pGasto = { ficha: 'F1', fecha: '2026-07-03', total: 100 }
  const okParams = { x: 1 }
  let r = await handler({ httpMethod: 'POST', headers: {}, body: '{}' })
  check('sin sesión → 401', r.statusCode === 401, r.statusCode)
  r = await llamar('aplicar_pago', okParams, { firma: 'deadbeef' })
  check('firma inválida → 403', r.status === 403, `${r.status} ${r.error}`)
  const emitidaVieja = Date.now() - 3 * 60 * 60 * 1000
  r = await llamar('alta_empleado', okParams, { emitida: emitidaVieja, firma: firmar(UID, 'alta_empleado', emitidaVieja, okParams) })
  check('propuesta caducada → 410', r.status === 410, `${r.status} ${r.error}`)
  r = await llamar('generar_reporte_secreto', okParams)
  check('acción fuera de la matriz → 403', r.status === 403, `${r.status} ${r.error}`)
  r = await llamar('alta_empleado', okParams, { jwt: 'no.es.un.jwt' })
  check('JWT inválido → 401', r.status === 401, r.status)
  r = await llamar('alta_arrendatario', { locatario: 'X', tipo_persona: 'FISICA' }, { firma: firmar('otro-usuario', 'alta_arrendatario', Date.now(), { locatario: 'X', tipo_persona: 'FISICA' }) })
  check('firma de otro usuario → 403', r.status === 403, `${r.status}`)

  // ── alta_arrendatario ──────────────────────────────────────────────────
  console.log('\nalta_arrendatario (INE + comprobante de domicilio)')
  const ctxArr = { ...nuevo, fichas: {
    F1: { tipo_documento: 'INE_FRENTE', identidad: { nombre_completo: 'PRUEBA EJECUTOR ASISTENTE', curp: 'PEEA800101HMCRJS09', calle: 'AV PRUEBA', no_ext: '100', colonia_ine: 'CENTRO', municipio_ine: 'METEPEC', estado_ine: 'MEXICO', cp_ine: '52140' } },
    F2: { tipo_documento: 'COMPROBANTE_DOMICILIO', identidad: { nombre_titular: 'PRUEBA EJECUTOR ASISTENTE', calle: 'Av. Prueba', no_ext: '100', colonia: 'Centro', municipio: 'Metepec', estado: 'México', cp: '52140' } } } }
  let prep = await ACCIONES.alta_arrendatario.preparar(admin, { ficha_ine: 'F1', ficha_domicilio: 'F2', telefono: '5550000000' }, ctxArr)
  check('preparar arma la propuesta', !prep.error, prep.error || prep.titulo)
  r = await llamar('alta_arrendatario', prep.params, { fichas: { F1: imagen, F2: imagen } })
  check('ejecuta y responde 200', r.status === 200, r.texto || r.error)
  const { data: arr } = await admin.from('arrendatarios').select('id, locatario, telefono, domicilio, estatus').eq('locatario', 'Asistente Prueba Ejecutor')
  check('arrendatario creado', arr?.length === 1, arr?.[0]?.domicilio)
  if (arr?.[0]) {
    const id = arr[0].id
    limpiar.push(async () => { await admin.from('documentos').delete().eq('entidad_id', id); await admin.from('arrendatarios').delete().eq('id', id) })
    const { data: docs } = await admin.from('documentos').select('tipo_doc, url, estatus').eq('entidad_id', id)
    check('2 documentos PENDIENTES', docs?.length === 2 && docs.every(d => d.estatus === 'PENDIENTE'), JSON.stringify(docs?.map(d => d.tipo_doc)))
    const { data: st } = await admin.storage.from('expedientes-docs').list(`arrendatario/${id}`)
    check('archivos en Storage', st?.length === 2, st?.map(x => x.name).join(','))
  }
  r = await llamar('alta_arrendatario', prep.params, { fichas: {} })
  // Segunda vez: el nombre ya existe → preparar lo habría rechazado; el ejecutor no revalida por nombre pero sí por RFC (sin RFC aquí)
  console.log('  (re-ejecución sin RFC: el bloqueo de duplicado por nombre vive en preparar, no en el ejecutor)')
  limpiar.push(async () => { const { data } = await admin.from('arrendatarios').select('id').eq('locatario', 'Asistente Prueba Ejecutor'); for (const x of data || []) { await admin.from('documentos').delete().eq('entidad_id', x.id); await admin.from('arrendatarios').delete().eq('id', x.id) } })

  // ── alta_empleado ──────────────────────────────────────────────────────
  console.log('\nalta_empleado (INE + comprobante de domicilio)')
  prep = await ACCIONES.alta_empleado.preparar(admin, { ficha_ine: 'F1', ficha_domicilio: 'F2', salario_diario: 400, puesto: 'Prueba', tipo_contrato: 'TEMPORAL_3SEM' }, ctxArr)
  check('preparar arma la propuesta', !prep.error, prep.error || prep.titulo)
  r = await llamar('alta_empleado', prep.params, { fichas: { F1: imagen, F2: imagen } })
  check('ejecuta y responde 200', r.status === 200, r.texto || r.error)
  const { data: emp } = await admin.from('rh_empleados').select('id, nombre, apellido_pat, curp, calle, colonia, salario_diario').eq('curp', 'PEEA800101HMCRJS09')
  check('empleado creado con domicilio y sueldo', emp?.length === 1 && emp[0].calle && Number(emp[0].salario_diario) === 400, JSON.stringify(emp?.[0]))
  if (emp?.[0]) {
    const id = emp[0].id
    limpiar.push(async () => { await admin.from('rh_expediente_documentos').delete().eq('empleado_id', id); await admin.from('rh_contratos').delete().eq('empleado_id', id); await admin.from('rh_empleados').delete().eq('id', id) })
    const { data: docs } = await admin.from('rh_expediente_documentos').select('tipo').eq('empleado_id', id)
    check('INE y comprobante en el expediente', docs?.length === 2, JSON.stringify(docs?.map(d => d.tipo)))
    const { data: con } = await admin.from('rh_contratos').select('tipo_contrato').eq('empleado_id', id)
    check('contrato laboral creado', con?.length === 1, con?.[0]?.tipo_contrato)
  }
  const dup = await ACCIONES.alta_empleado.preparar(admin, { ficha_ine: 'F1', salario_diario: 400 }, ctxArr)
  check('preparar rechaza CURP duplicada', !!dup.error, dup.error)

  // ── registrar_gasto ────────────────────────────────────────────────────
  console.log('\nregistrar_gasto (ticket de compra)')
  const ctxG = { ...nuevo, fichas: { F1: { tipo_documento: 'TICKET_COMPRA', proveedor: { nombre_comercial: 'PRUEBA EJECUTOR SA', rfc: null }, ticket: { fecha: '2026-07-03', folio: 'T-PRUEBA', total: 100 },
    lineas: Array.from({ length: 10 }, (_, i) => ({ sku: 'X' + i, descripcion: 'ARTICULO PRUEBA ' + i, cantidad: 1, precio_unit: 10 })) } } }
  prep = await ACCIONES.registrar_gasto.preparar(admin, { ficha: 'F1', grupo_gasto: 'Limpieza e higiene', categoria_lineas: 'OPERACION', descripcion: 'Prueba ejecutor' }, ctxG)
  check('preparar arma la propuesta', !prep.error, prep.error || prep.titulo)
  r = await llamar('registrar_gasto', prep.params, { fichas: { F1: imagen } })
  check('ejecuta y responde 200', r.status === 200, r.texto || r.error)
  const { data: gs } = await admin.from('gastos_operativos').select('id, proveedor, ticket_total, ticket_url, proveedor_id, grupo_gasto').eq('descripcion', 'Prueba ejecutor')
  check('gasto con proveedor y foto', gs?.length === 1 && gs[0].proveedor_id && gs[0].ticket_url, JSON.stringify(gs?.[0]))
  if (gs?.[0]) {
    const id = gs[0].id
    // la limpieza corre al revés: el proveedor se registra primero para borrarse DESPUÉS del gasto que lo usa
    limpiar.push(async () => { await admin.from('cat_proveedores').delete().eq('id', gs[0].proveedor_id) })
    limpiar.push(async () => { await admin.from('gasto_detalle').delete().eq('gasto_id', id); await admin.from('gastos_operativos').delete().eq('id', id); await admin.storage.from('tickets-gastos').remove([gs[0].ticket_url]) })
    const { count } = await admin.from('gasto_detalle').select('id', { count: 'exact', head: true }).eq('gasto_id', id)
    check('10 partidas', count === 10, count)
    const { data: sg } = await admin.storage.from('tickets-gastos').createSignedUrl(gs[0].ticket_url, 60)
    check('la foto se puede firmar (ruta relativa al bucket)', !!sg?.signedUrl, gs[0].ticket_url)
  }

  // ── aplicar_pago ───────────────────────────────────────────────────────
  console.log('\naplicar_pago (ficha de depósito)')
  const { data: pend } = await admin.from('prp_cartera').select('id, contrato_id, saldo, concepto').in('estado', ['PENDIENTE']).eq('concepto', 'RENTA').gt('saldo', 0).limit(1)
  if (!pend?.length) console.log('  (no hay cargos pendientes en QA: se omite)')
  else {
    const c = pend[0]
    const ref = 'TEST-EJEC-' + Date.now()
    const ctxP = { ...nuevo, fichas: { F1: { tipo_documento: 'COMPROBANTE_PAGO', comprobante_pago: { monto: Number(c.saldo), fecha_pago: '2026-09-25', referencia: ref, forma_pago: 'Transferencia', banco: 'Banco Prueba', nombre_emisor: 'PRUEBA' } } } }
    prep = await ACCIONES.aplicar_pago.preparar(admin, { contrato_id: c.contrato_id, ficha: 'F1' }, ctxP)
    check('preparar arma la propuesta', !prep.error, prep.error || prep.titulo)
    if (!prep.error) {
      r = await llamar('aplicar_pago', prep.params, { fichas: { F1: imagen } })
      check('ejecuta y responde 200', r.status === 200, r.texto || r.error)
      const { data: ing } = await admin.from('ingresos').select('id, importe, estatus_validacion, comprobante_url, referencia_banco').eq('referencia_banco', ref)
      check('ingreso POR_VALIDAR con comprobante', ing?.length === 1 && ing[0].estatus_validacion === 'POR_VALIDAR' && ing[0].comprobante_url, JSON.stringify(ing?.[0]))
      if (ing?.[0]) {
        const id = ing[0].id
        limpiar.push(async () => { await admin.from('aplicaciones_pago').delete().eq('ingreso_id', id); await admin.from('ingresos').delete().eq('id', id); await admin.storage.from('facturas-cfdi').remove([`comprobantes/${id}/comp.jpg`]) })
        const { data: cg } = await admin.from('prp_cartera').select('estado, saldo').eq('id', c.id).single()
        check('el cargo quedó PAGADO', cg?.estado === 'PAGADO', JSON.stringify(cg))
      }
      r = await llamar('aplicar_pago', prep.params, { fichas: {} })
      check('mismo depósito otra vez → rechazado por referencia', r.status === 422 && /ya está registrada/.test(r.error || ''), `${r.status} ${r.error}`)
    }
  }


  // ── importar_asistencia ────────────────────────────────────────────────
  console.log('\nimportar_asistencia (archivo del checador)')
  const { data: emps } = await admin.from('prp_empleados').select('id, numero_empleado, nombre_completo').order('numero_empleado')
  const [e1, e2, e3] = emps
  const jose = emps.filter(e => /^JOSE\b/i.test(e.nombre_completo.normalize('NFD').replace(/[̀-ͯ]/g, '')))
  const D1 = '2026-01-05', D2 = '2026-01-06'
  const { count: previos } = await admin.from('rh_checadas').select('id', { count: 'exact', head: true }).gte('fecha', D1).lte('fecha', D2)
  check('rango de prueba libre en QA (sin marcajes previos)', previos === 0, previos)
  // Formato estándar No,Nombre,Fecha,Hora,Status + una persona que no existe + un nombre ambiguo
  const archivo = [
    'No,Nombre,Fecha,Hora,Status',
    `${e1.numero_empleado},${e1.nombre_completo},${D1},08:00,0`, `${e1.numero_empleado},${e1.nombre_completo},${D1},16:00,1`,
    `${e1.numero_empleado},${e1.nombre_completo},${D2},08:05,0`, `${e1.numero_empleado},${e1.nombre_completo},${D2},16:01,1`,
    `${e2.numero_empleado},${e2.nombre_completo},${D1},09:00,0`, `${e2.numero_empleado},${e2.nombre_completo},${D1},17:00,1`,
    `999,FULANO DESCONOCIDO,${D1},08:00,0`, `999,FULANO DESCONOCIDO,${D1},16:00,1`,
    `777,JOSE,${D1},08:00,0`, `777,JOSE,${D1},16:00,1`,
  ].join('\n')
  const ev = parsearChecador(archivo)
  check('el lector entiende el formato estándar', ev.length === 10, ev.length)
  const reloj = parsearChecador('1\tJuan\tDepto\t2026-01-05  08:00:00\t1\n1\tJuan\tDepto\t2026-01-05  16:00:00\t1')
  check('el lector entiende el formato de reloj (entrada/salida por orden)', reloj.length === 2 && reloj[0].operacion === 'ENTRADA' && reloj[1].operacion === 'SALIDA', JSON.stringify(reloj.map(x => x.operacion)))
  const ctxA = { ...nuevo, fichas: { F1: { tipo_documento: 'ARCHIVO_CHECADOR', nombre_archivo: 'prueba.csv', eventos: ev } } }
  prep = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F1' }, ctxA)
  check('preparar arma la propuesta', !prep.error, prep.error || prep.titulo)
  const nFilas = prep.params?.filas?.length
  check('solo importa a quien reconoce (6 marcajes de 2 personas)', nFilas === 6, nFilas)
  check('lista a los no reconocidos y NO los importa', /999/.test(JSON.stringify(prep.resumen)) && !prep.params.filas.some(f => f.numero_empleado_ext === '999'), JSON.stringify(prep.resumen.find(r => r[0] === 'Sin reconocer')))
  if (jose.length > 1) check('nombre ambiguo (varios José) queda sin reconocer', /coincide con \d+ empleados/.test(JSON.stringify(prep.resumen)), jose.length + ' empleados con nombre José')
  // Mismo número que un empleado pero con un nombre que no se parece → NO se asigna en silencio
  const distinto = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F2' }, { ...nuevo, fichas: { F2: { tipo_documento: 'ARCHIVO_CHECADOR', nombre_archivo: 'otra-plaza.csv', eventos: parsearChecador(['No,Nombre,Fecha,Hora,Status', `${e1.numero_empleado},PERSONA TOTALMENTE DISTINTA,${D1},08:00,0`, `${e1.numero_empleado},PERSONA TOTALMENTE DISTINTA,${D1},16:00,1`].join(String.fromCharCode(10))) } } })
  check('número igual pero nombre distinto → no se importa (parecen personas distintas)', /parecen personas distintas/.test(distinto.error || ''), distinto.error)
  const conf = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F2', asignaciones: { [e1.numero_empleado]: e1.numero_empleado } }, { ...nuevo, fichas: { F2: { tipo_documento: 'ARCHIVO_CHECADOR', eventos: parsearChecador(['No,Nombre,Fecha,Hora,Status', `${e1.numero_empleado},PERSONA TOTALMENTE DISTINTA,${D1},08:00,0`].join(String.fromCharCode(10))) } } })
  const soloPila = (e1.nombre_completo.split(' ')[0] || '').toUpperCase()
  const pila = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F3' }, { ...nuevo, fichas: { F3: { tipo_documento: 'ARCHIVO_CHECADOR', eventos: parsearChecador(['No,Nombre,Fecha,Hora,Status', `${e1.numero_empleado},${soloPila} ZZQX WWVY,${D1},08:00,0`].join(String.fromCharCode(10))) } } })
  check('mismo número y solo el nombre de pila en común → tampoco se asigna', /parecen personas distintas/.test(pila.error || ''), pila.error)
  const reloj1 = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F4' }, { ...nuevo, fichas: { F4: { tipo_documento: 'ARCHIVO_CHECADOR', eventos: parsearChecador([String(parseInt(e1.numero_empleado.replace(/\D/g, ''), 10)), soloPila, 'Depto', '2026-01-05  08:00:00', '1'].join(String.fromCharCode(9))) } } })
  check('un reloj que solo trae el primer nombre sí se acepta con el número', !!reloj1.params?.filas?.length || /ya estaban/.test(reloj1.error || ''), reloj1.error || 'ok')
  // El reloj numera a su manera: el número de e2 con el primer nombre (único) de e1 → es e1, y se avisa del choque
  const numE2 = String(parseInt(e2.numero_empleado.replace(/\D/g, ''), 10))
  const choque = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F5' }, { ...nuevo, fichas: { F5: { tipo_documento: 'ARCHIVO_CHECADOR', eventos: parsearChecador([numE2, soloPila, 'Depto', '2026-01-05  08:00:00', '1'].join(String.fromCharCode(9))) } } })
  check('numeración del reloj distinta a la del catálogo: se reconoce por nombre único y avisa del choque', choque.params?.filas?.[0]?.empleado_id === e1.id && /ese número en el catálogo es de/.test(choque.aviso || ''), choque.error || choque.aviso)
  check('...salvo que el usuario lo confirme con una asignación explícita', !!conf.params?.filas?.length || /ya estaban/.test(conf.error || ''), conf.error || 'ok')
  limpiar.push(async () => { await admin.from('rh_checadas').delete().gte('fecha', D1).lte('fecha', D2).eq('origen', 'ZKTeco_CSV') })
  r = await llamar('importar_asistencia', prep.params)
  check('ejecuta y responde 200', r.status === 200, r.texto || r.error)
  const { count: guard } = await admin.from('rh_checadas').select('id', { count: 'exact', head: true }).gte('fecha', D1).lte('fecha', D2)
  check('6 marcajes en rh_checadas', guard === 6, guard)
  const { data: dia } = await admin.from('rh_asistencia').select('empleado_id, fecha, hora_entrada, hora_salida').eq('empleado_id', e1.id).eq('fecha', D1)
  check('la base consolidó el día en rh_asistencia (entrada y salida)', dia?.length === 1 && dia[0].hora_entrada && dia[0].hora_salida, JSON.stringify(dia?.[0]))
  const otra = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F1' }, ctxA)
  check('el mismo archivo otra vez → no hay nada nuevo', !!otra.error && /ya estaban registrados/.test(otra.error), otra.error)
  r = await llamar('importar_asistencia', prep.params)
  check('ejecutar dos veces la misma propuesta no duplica', r.status === 200 && /6 ya estaban/.test(r.texto || ''), r.texto || r.error)
  const { count: guard2 } = await admin.from('rh_checadas').select('id', { count: 'exact', head: true }).gte('fecha', D1).lte('fecha', D2)
  check('sigue habiendo 6 marcajes', guard2 === 6, guard2)
  // Asignación explícita de quien no se reconocía
  const conAsig = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F1', asignaciones: { 999: e3.numero_empleado } }, ctxA)
  check('con asignación, 999 se incluye como el empleado indicado', conAsig.params?.filas?.some(f => f.numero_empleado_ext === '999' && f.empleado_id === e3.id), conAsig.error || 'ok')
  const mala = await ACCIONES.importar_asistencia.preparar(admin, { ficha: 'F1', asignaciones: { 999: 'NO EXISTE' } }, ctxA)
  check('asignación a alguien inexistente no se adivina', !mala.params?.filas?.some(f => f.numero_empleado_ext === '999'), JSON.stringify(mala.resumen?.find(r => r[0] === 'Sin reconocer')))

  // ── renovar_contrato (se restaura) ─────────────────────────────────────
  console.log('\nrenovar_contrato (se restaura al terminar)')
  const { data: vig } = await admin.from('prp_contratos').select('id').eq('estatus', 'VIGENTE').limit(50)
  let cand = null
  for (const v of vig || []) { const { count } = await admin.from('prp_contratos').select('id', { count: 'exact', head: true }).eq('contrato_anterior_id', v.id); if (!count) { cand = v.id; break } }
  if (!cand) console.log('  (no hay contrato vigente sin renovar: se omite)')
  else {
    const { data: antes } = await admin.from('contratos').select('estatus, updated_at').eq('id', cand).single()
    const { data: cl } = await admin.from('contratos_locales').select('local_id').eq('contrato_id', cand)
    const { data: locBefore } = await admin.from('cat_locales').select('id_local, contrato_activo_id, estatus').in('id_local', (cl || []).map(x => x.local_id))
    prep = await ACCIONES.renovar_contrato.preparar(admin, { contrato_id: cand }, nuevo)
    check('preparar arma la propuesta', !prep.error, prep.error || prep.titulo)
    r = await llamar('renovar_contrato', prep.params)
    check('ejecuta y responde 200', r.status === 200, r.texto || r.error)
    const { data: hijos } = await admin.from('contratos').select('id, estatus, estatus_proceso').eq('contrato_anterior_id', cand)
    check('nuevo contrato VIGENTE / EN_RENOVACION', hijos?.length === 1 && hijos[0].estatus === 'VIGENTE' && hijos[0].estatus_proceso === 'EN_RENOVACION', JSON.stringify(hijos))
    const { data: orig } = await admin.from('contratos').select('estatus').eq('id', cand).single()
    check('el original pasó a RENOVADO', orig?.estatus === 'RENOVADO', orig?.estatus)
    limpiar.push(async () => {   // restaurar tal como estaba
      for (const h of hijos || []) { await admin.from('contratos_locales').delete().eq('contrato_id', h.id); await admin.from('contratos').delete().eq('id', h.id) }
      await admin.from('contratos').update({ estatus: antes.estatus, updated_at: antes.updated_at }).eq('id', cand)
      for (const l of locBefore || []) await admin.from('cat_locales').update({ contrato_activo_id: l.contrato_activo_id, estatus: l.estatus }).eq('id_local', l.id_local)
    })
  }
} finally {
  console.log('\nLimpieza')
  for (const f of limpiar.reverse()) { try { await f() } catch (e) { console.log('  aviso al limpiar:', e.message) } }
  fs.unlinkSync(tmp); fs.rmdirSync(new URL('../netlify/_tmp/', import.meta.url))
  console.log('  QA restaurado')
}
console.log(`\n${total - fallas}/${total} comprobaciones correctas${fallas ? ` — ${fallas} FALLARON` : ''}`)
process.exit(fallas ? 1 : 0)
