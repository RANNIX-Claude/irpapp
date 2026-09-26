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
const tmp = new URL('../_chat_tmp.cjs', import.meta.url)
fs.writeFileSync(tmp, fs.readFileSync(new URL('../netlify/functions/chat-operativo.js', import.meta.url), 'utf8') + '\nexports.__t = { ACCIONES, firmar }\n')
const { ACCIONES, firmar } = (await import(tmp.href)).default.__t   // firma de chat-operativo: la que debe aceptar ejecutar-accion
const { handler, firmar: firmarEjec } = await import('../netlify/functions/ejecutar-accion.js')

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false }, realtime: { transport: ws } })
const auth = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then(r => r.json())
if (!auth.access_token) { console.error('No se pudo iniciar sesión:', JSON.stringify(auth).slice(0, 120)); fs.unlinkSync(tmp); process.exit(1) }
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
  fs.unlinkSync(tmp)
  console.log('  QA restaurado')
}
console.log(`\n${total - fallas}/${total} comprobaciones correctas${fallas ? ` — ${fallas} FALLARON` : ''}`)
process.exit(fallas ? 1 : 0)
