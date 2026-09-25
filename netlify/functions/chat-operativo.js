/**
 * chat-operativo.js — Agente Operativo IRP · RANNIX Consulting 2026
 *
 * Proxy seguro para Claude API con acceso de LECTURA a los datos reales del
 * sistema mediante tool use. Claude decide qué vista consultar; la función
 * ejecuta la consulta contra Supabase con el JWT del usuario que pregunta, de
 * modo que aplica exactamente la misma RLS que ve en pantalla (staff ve todo,
 * un locatario solo su contrato). Nunca se usa la service_role key aquí.
 *
 * Solo se permiten las vistas prp_* de la lista blanca, solo SELECT y con tope
 * de filas. No hay SQL libre.
 *
 * Escritura: el agente solo PROPONE (proponer_accion). Esta función valida y
 * devuelve la propuesta; quien ejecuta es el navegador, con la sesión del
 * usuario, tras un clic en Confirmar. Ver ACCIONES y src/lib/agentActions.js.
 */

const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY

const MAX_FILAS = 50
const MAX_VUELTAS = 6   // llamadas a herramientas por pregunta

// Vista → columnas donde busca `texto` (ilike). La descripción va al modelo.
const VISTAS = {
  prp_contratos: {
    buscar: ['arrendatario_nombre', 'nombre_negocio', 'folio', 'locales_display', 'giro_autorizado', 'arrendatario_rfc'],
    columnas: 'id, folio, arrendatario_id, arrendatario_nombre, nombre_negocio, arrendatario_rfc, arrendatario_email, arrendatario_telefono, tipo_persona, representante_legal, tipo_contrato, giro_autorizado, fecha_inicio, fecha_fin, renta_mensual, renta_sin_iva, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, pagares_cantidad, contrato_anterior_id, estatus (VIGENTE|VENCIDO|RENOVADO|RESCISION|CANCELADO), estatus_proceso (EN_CONTRATACION|EN_RENOVACION|EN_EJECUCION|TERMINADO|SUSPENDIDO), locales_display, semaforo_vencimiento, dias_restantes, unidad_numero, m2_totales, inmueble_nombre, notas',
  },
  prp_cartera: {
    buscar: ['arrendatario_nombre', 'contrato_folio', 'concepto', 'locales_display'],
    columnas: 'id, contrato_id, contrato_folio, arrendatario_nombre, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, total_aplicado, saldo, renta_mensual, inmueble_nombre, locales_display',
  },
  prp_expediente_arrendatario: {
    buscar: ['nombre_completo', 'rfc', 'email', 'numero_local'],
    columnas: 'arrendatario_id, nombre_completo, rfc, telefono, email, tipo_persona, activo, contrato_id, fecha_inicio, fecha_fin, renta_mensual, contrato_estatus, giro_autorizado, numero_local, inmueble_nombre, total_pagado, total_pendiente, total_mora, cobros_pagados, cobros_pendientes, cobros_mora',
  },
  prp_ingresos: {
    buscar: ['arrendatario_nombre', 'folio', 'concepto_origen', 'nota', 'locales_display'],
    columnas: 'id, fecha, tipo, mes, anio, importe, factura, nota, origen, concepto_origen, contrato_id, folio, arrendatario_nombre, locales_display, estatus_validacion, clasificacion',
  },
  prp_gastos: {
    buscar: ['descripcion', 'grupo_gasto', 'proveedor_txt', 'proveedor_nombre'],
    columnas: 'id, fecha, semana, anio, mes, grupo_gasto, descripcion, monto, ticket_total, proveedor_nombre, proveedor_cat',
  },
  prp_unidades: {
    buscar: ['numero_local', 'tipo_unidad', 'estado_id'],
    columnas: 'id, inmueble_id, numero_local, tipo_unidad, m2_totales, renta_base, estado_id, notas',
  },
  prp_inmuebles: {
    buscar: ['nombre', 'ciudad', 'tipo_inmueble'],
    columnas: 'id, nombre, tipo_inmueble, ciudad, estado, m2_totales',
  },
  prp_empleados: {
    buscar: ['nombre_completo', 'puesto', 'area', 'departamento', 'numero_empleado'],
    columnas: 'id, numero_empleado, nombre_completo, puesto, area, departamento, fecha_ingreso, salario_diario, salario_mensual, estado_id, horario_trabajo, dia_descanso, tipo_contratacion, contrato_inicio, contrato_fin, semaforo_contrato, dias_antiguedad',
  },
  prp_incidencias: {
    buscar: ['nombre_completo', 'tipo', 'descripcion'],
    columnas: 'id, empleado_id, nombre_completo, numero_empleado, puesto, fecha, tipo, descripcion, afecta_nomina, semana_inicio',
  },
  prp_vacantes: {
    buscar: ['titulo', 'area', 'departamento', 'status'],
    columnas: 'id, titulo, area, departamento, num_plazas, salario_min, salario_max, fecha_apertura, fecha_cierre, status',
  },
  prp_proveedores: {
    buscar: ['nombre', 'rfc', 'categoria'],
    columnas: 'id, nombre, rfc, email, telefono, categoria, activo',
  },
  prp_prospectos: {
    buscar: ['nombre_completo', 'email', 'giro_solicitado', 'estatus'],
    columnas: 'id, nombre_completo, email, telefono, giro_solicitado, monto_ofertado, fecha_visita, estatus, motivo_rechazo, unidad_interes, inmueble_nombre, created_at',
  },
  prp_pensiones_estacionamiento: {
    buscar: ['nombre', 'placa', 'marca_auto'],
    columnas: 'id, nombre, telefono, placa, marca_auto, cajon_id, monto_mensual, fecha_inicio, fecha_fin, activo',
  },
  prp_estacionamiento_mensual: {
    buscar: [],
    columnas: 'anio, mes, dias_registrados, total_mes, promedio_dia, min_dia, max_dia',
  },
}

const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is']

// ─── Acciones de escritura ─────────────────────────────────────────────────
// Esta función NUNCA escribe. `preparar` valida contra los datos reales (con la
// RLS del usuario) y devuelve los parámetros completos + un resumen legible; el
// navegador los muestra en una tarjeta y, solo si el usuario confirma, los
// ejecuta con su sesión (src/lib/agentActions.js). Agregar una acción = una
// entrada aquí (validar/resumir) y otra allá (ejecutar).
const ISO = /^\d{4}-\d{2}-\d{2}$/
const mxn = n => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
const sumarDias = (iso, d) => { const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10) }
const mismoDiaAnioSig = iso => { const t = new Date(iso + 'T00:00:00Z'); t.setUTCFullYear(t.getUTCFullYear() + 1); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10) }

const ACCIONES = {
  renovar_contrato: {
    descripcion: 'Renueva un contrato VIGENTE: el original pasa a RENOVADO y se crea el nuevo. Parámetros: contrato_id (uuid, obligatorio); opcionales fecha_inicio (YYYY-MM-DD, por omisión el día siguiente al fin del actual), fecha_fin (por omisión +1 año), renta_mensual, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, notas.',
    async preparar(db, p, _ctx) {
      if (!p.contrato_id) return { error: 'Falta contrato_id. Consúltalo en prp_contratos.' }
      const { data: c, error } = await db.from('prp_contratos')
        .select('id, folio, arrendatario_id, arrendatario_nombre, unidad_id, tipo_contrato, fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, locales_display, estatus')
        .eq('id', p.contrato_id).maybeSingle()
      if (error) return { error: error.message }
      if (!c) return { error: 'Contrato no encontrado.' }
      if (c.estatus !== 'VIGENTE') return { error: `El contrato ${c.folio} está ${c.estatus}; solo se renuevan los VIGENTES.` }
      const { count } = await db.from('prp_contratos').select('id', { count: 'exact', head: true }).eq('contrato_anterior_id', c.id)
      if (count > 0) return { error: `El contrato ${c.folio} ya tiene una renovación registrada.` }

      const inicio = p.fecha_inicio || (c.fecha_fin ? sumarDias(c.fecha_fin, 1) : new Date().toISOString().slice(0, 10))
      const fin = p.fecha_fin || mismoDiaAnioSig(inicio)
      if (!ISO.test(inicio) || !ISO.test(fin)) return { error: 'Las fechas deben ir en formato YYYY-MM-DD.' }
      if (fin <= inicio) return { error: 'La fecha de fin debe ser posterior a la de inicio.' }
      const renta = Number(p.renta_mensual ?? c.renta_mensual)
      if (!(renta > 0)) return { error: 'La renta mensual debe ser mayor a 0.' }

      const params = {
        contrato_id: c.id, folio_base: c.folio, arrendatario_id: c.arrendatario_id, unidad_id: c.unidad_id, tipo_contrato: c.tipo_contrato,
        fecha_inicio: inicio, fecha_fin: fin, renta_mensual: renta,
        deposito_garantia: Number(p.deposito_garantia ?? c.deposito_garantia ?? 0),
        dia_pago: Number(p.dia_pago ?? c.dia_pago ?? 1),
        penalizacion_pct: Number(p.penalizacion_pct ?? c.penalizacion_pct ?? 5),
        incremento_anual_pct: Number(p.incremento_anual_pct ?? c.incremento_anual_pct ?? 0),
        fiador_nombre: p.fiador_nombre ?? c.fiador_nombre ?? null,
        notas: p.notas ?? null,
      }
      const cambio = (a, b) => a === b ? '' : ` (antes ${b})`
      return {
        params,
        titulo: `Renovar contrato ${c.folio}`,
        confirmar: 'Renovar contrato',
        resumen: [
          ['Arrendatario', c.arrendatario_nombre],
          ['Local', c.locales_display],
          ['Vigencia', `${inicio} → ${fin}`],
          ['Renta mensual', mxn(renta) + (renta !== Number(c.renta_mensual) ? ` (antes ${mxn(c.renta_mensual)})` : '')],
          ['Depósito', mxn(params.deposito_garantia)],
          ['Día de pago', `${params.dia_pago}${cambio(params.dia_pago, c.dia_pago)}`],
          ['Penalización', `${params.penalizacion_pct}%`],
          ['Fiador', params.fiador_nombre || '—'],
        ],
        aviso: `El contrato ${c.folio} pasará a RENOVADO y se creará el nuevo como VIGENTE (EN_RENOVACION).`,
      }
    },
  },

  aplicar_pago: {
    descripcion: 'Registra un depósito/ficha de pago de un arrendatario y lo aplica a sus cargos pendientes, del más antiguo al más nuevo. Si el depósito no alcanza, el último cargo queda PARCIAL; si sobra, el excedente queda como saldo a favor. El depósito queda POR_VALIDAR hasta conciliarlo con el banco. Parámetros: contrato_id (uuid), importe (número), fecha (YYYY-MM-DD), referencia (clave de rastreo/folio; evita duplicados), forma_pago (TRANSFERENCIA|DEPOSITO|EFECTIVO|CHEQUE), ficha (id de la imagen adjunta, p. ej. "F1"), banco, ordenante, nota; opcional cargo_ids (array) para aplicar solo a esos cargos en lugar de todos los pendientes.',
    async preparar(db, p, ctx) {
      if (!p.contrato_id) return { error: 'Falta contrato_id. Ubícalo por el número de local con consultar_datos en prp_contratos (estatus VIGENTE).' }
      const importe = Number(p.importe)
      if (!(importe > 0)) return { error: 'El importe debe ser mayor a 0.' }
      if (!p.fecha || !ISO.test(p.fecha)) return { error: 'La fecha del depósito debe ir en formato YYYY-MM-DD.' }
      const forma = String(p.forma_pago || 'TRANSFERENCIA').toUpperCase()
      if (!['TRANSFERENCIA', 'DEPOSITO', 'EFECTIVO', 'CHEQUE'].includes(forma)) return { error: 'forma_pago no válida.' }
      const ref = p.referencia ? String(p.referencia).trim() : null

      const { data: c, error: e1 } = await db.from('prp_contratos')
        .select('id, folio, arrendatario_nombre, locales_display, estatus').eq('id', p.contrato_id).maybeSingle()
      if (e1) return { error: e1.message }
      if (!c) return { error: 'Contrato no encontrado.' }

      // Duplicado: la misma clave de rastreo no se aplica dos veces.
      if (ref) {
        const { data: dup } = await db.from('ingresos').select('id, fecha, importe').eq('referencia_banco', ref).limit(1)
        if (dup?.length) return { error: `La referencia ${ref} ya está registrada (ingreso #${dup[0].id} del ${dup[0].fecha} por ${mxn(dup[0].importe)}). No se aplicó dos veces.` }
      }
      const { data: mismo } = await db.from('ingresos').select('id').eq('contrato_id', c.id).eq('fecha', p.fecha).eq('importe', importe).limit(1)

      let q = db.from('prp_cartera')
        .select('id, concepto, periodo_mes, periodo_anio, importe, saldo, fecha_vencimiento, estado')
        .eq('contrato_id', c.id).in('estado', ['PENDIENTE', 'PARCIAL']).gt('saldo', 0.01)
        .order('fecha_vencimiento', { ascending: true })
      if (Array.isArray(p.cargo_ids) && p.cargo_ids.length) q = q.in('id', p.cargo_ids)
      const { data: cargos, error: e2 } = await q
      if (e2) return { error: e2.message }

      // Varias fichas del mismo contrato en un turno: no repartir dos veces el mismo saldo.
      let resto = importe
      const distribucion = []
      for (const cg of cargos || []) {
        if (resto <= 0.009) break
        const libre = Math.round((Number(cg.saldo) - (ctx.reservado[cg.id] || 0)) * 100) / 100
        if (libre <= 0.009) continue
        const aplicar = Math.min(resto, libre)
        distribucion.push({ cargo_id: cg.id, etiqueta: `${cg.concepto} ${String(cg.periodo_mes || '').padStart(2, '0')}/${cg.periodo_anio || ''}`.trim(), saldo_antes: libre, aplicar: Math.round(aplicar * 100) / 100 })
        ctx.reservado[cg.id] = (ctx.reservado[cg.id] || 0) + aplicar
        resto = Math.round((resto - aplicar) * 100) / 100
      }
      const excedente = resto > 0.009 ? resto : 0

      const resumen = [
        ['Arrendatario', c.arrendatario_nombre],
        ['Local', `${c.locales_display} · ${c.folio}`],
        ['Depósito', `${mxn(importe)} · ${p.fecha} · ${forma}`],
        ['Referencia', ref || 'sin referencia'],
        ...distribucion.map(d => [d.etiqueta, d.aplicar >= d.saldo_antes - 0.01 ? `${mxn(d.aplicar)} (liquida)` : `${mxn(d.aplicar)} (PARCIAL, queda ${mxn(d.saldo_antes - d.aplicar)})`]),
      ]
      if (excedente) resumen.push(['Saldo a favor', `${mxn(excedente)} para el inquilino`])
      if (!distribucion.length) resumen.push(['Cargos', 'sin cargos pendientes: todo queda como saldo a favor'])

      const avisos = ['Queda POR_VALIDAR hasta conciliarlo con el banco; la factura sale hasta entonces.']
      if (mismo?.length) avisos.push(`Ojo: ya hay un ingreso de este contrato con la misma fecha e importe (#${mismo[0].id}). Verifica que no sea el mismo depósito.`)
      if (c.estatus !== 'VIGENTE') avisos.push(`El contrato está ${c.estatus}.`)

      return {
        params: {
          contrato_id: c.id, folio: c.folio, importe, fecha: p.fecha, forma_pago: forma, referencia: ref,
          banco: p.banco || null, ordenante: p.ordenante || null, nota: p.nota || null, ficha: p.ficha || null,
          distribucion: distribucion.map(({ cargo_id, aplicar }) => ({ cargo_id, aplicar })),
          // ingresos_tipo_check solo admite estos cuatro valores
          tipo: ['RENTA', 'SANCION', 'AGUA'].includes(distribucion[0] && cargos.find(x => x.id === distribucion[0].cargo_id)?.concepto)
            ? cargos.find(x => x.id === distribucion[0].cargo_id).concepto
            : (distribucion.length ? 'OTRO' : 'RENTA'),
          excedente,
        },
        titulo: `Aplicar pago de ${mxn(importe)} — ${c.arrendatario_nombre}`,
        confirmar: 'Aplicar pago',
        resumen,
        aviso: avisos.join(' '),
      }
    },
  },
}

const TOOLS = [{
  name: 'consultar_datos',
  description: `Consulta de solo lectura a una vista del sistema IRP. Devuelve las filas (máximo ${MAX_FILAS}) y el conteo total que cumple los filtros. Úsala siempre que la pregunta sea sobre datos concretos del negocio (contratos, arrendatarios, cobranza, ingresos, gastos, locales, empleados, prospectos…). Puedes llamarla varias veces para cruzar información.`,
  input_schema: {
    type: 'object',
    properties: {
      vista:  { type: 'string', enum: Object.keys(VISTAS), description: 'Vista a consultar' },
      texto:  { type: 'string', description: 'Búsqueda libre (parcial, sin distinguir mayúsculas) sobre las columnas de nombre/folio/descripción de la vista. Usa una palabra clave, p. ej. "vorwerk" en vez del nombre completo.' },
      filtros: {
        type: 'array',
        description: 'Filtros exactos por columna',
        items: {
          type: 'object',
          properties: {
            columna: { type: 'string' },
            op:      { type: 'string', enum: OPS },
            valor:   { type: ['string', 'number', 'boolean', 'null'] },
          },
          required: ['columna', 'op', 'valor'],
        },
      },
      columnas: { type: 'string', description: 'Columnas a devolver separadas por coma. Por omisión todas.' },
      orden:    { type: 'string', description: 'Columna para ordenar' },
      descendente: { type: 'boolean' },
      limite:   { type: 'integer', minimum: 1, maximum: MAX_FILAS },
    },
    required: ['vista'],
  },
}, {
  name: 'proponer_accion',
  description: 'Propone una operación que MODIFICA datos del sistema. NO la ejecuta: el usuario ve una tarjeta con el resumen y decide con Confirmar/Cancelar. Consulta primero (consultar_datos) para obtener el id del registro. Los parámetros que no envíes se toman del registro actual, así que propón de inmediato con lo que el usuario ya dijo en vez de interrogarlo campo por campo. Acciones: ' +
    Object.entries(ACCIONES).map(([k, a]) => `${k} — ${a.descripcion}`).join(' | '),
  input_schema: {
    type: 'object',
    properties: {
      accion:     { type: 'string', enum: Object.keys(ACCIONES) },
      parametros: { type: 'object', description: 'Parámetros de la acción (ver descripción de cada acción)' },
    },
    required: ['accion', 'parametros'],
  },
}]

const COL = /^[a-z_][a-z0-9_]*$/

async function consultar(db, input) {
  const def = VISTAS[input.vista]
  if (!def) return { error: `Vista no permitida: ${input.vista}` }
  const columnas = (input.columnas || '*').split(',').map(s => s.trim()).filter(Boolean)
  if (columnas.some(c => c !== '*' && !COL.test(c))) return { error: 'Nombre de columna inválido' }

  let q = db.from(input.vista).select(columnas.join(','), { count: 'exact' })
  if (input.texto && def.buscar.length) {
    const t = String(input.texto).replace(/[%,()]/g, ' ').trim()
    if (t) q = q.or(def.buscar.map(c => `${c}.ilike.%${t}%`).join(','))
  }
  for (const f of input.filtros || []) {
    if (!COL.test(f.columna || '') || !OPS.includes(f.op)) return { error: `Filtro inválido: ${JSON.stringify(f)}` }
    const v = f.op === 'ilike' ? `%${String(f.valor).replace(/[%,()]/g, ' ')}%` : f.valor
    q = q[f.op](f.columna, v)
  }
  if (input.orden && COL.test(input.orden)) q = q.order(input.orden, { ascending: !input.descendente })
  q = q.limit(Math.min(MAX_FILAS, input.limite || MAX_FILAS))

  const { data, error, count } = await q
  if (error) return { error: error.message }
  return { total: count, mostradas: data.length, filas: data }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo no permitido' }) }

  try {
    const { messages = [], context = '' } = JSON.parse(event.body || '{}')

    // Sesión del usuario: sin JWT no hay datos (pero sí conversación general).
    const auth = event.headers.authorization || event.headers.Authorization || ''
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null
    // realtime.transport: sin esto, supabase-js truena al crear el cliente en el
    // runtime de Netlify Functions (Node 20 sin WebSocket nativo expuesto).
    const db = (jwt && ANON_KEY)
      ? createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false }, realtime: { transport: ws } })
      : null

    // Solo el personal puede proponer escrituras (un locatario solo consulta lo suyo).
    let puedeEscribir = false
    if (db) { const { data } = await db.rpc('es_staff'); puedeEscribir = data === true }
    const herramientas = puedeEscribir ? TOOLS : TOOLS.filter(t => t.name === 'consultar_datos')

    const hoy = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'long', day: 'numeric' })

    const catalogo = Object.entries(VISTAS).map(([v, d]) => `- ${v}: ${d.columnas}`).join('\n')

    const systemPrompt = `Eres el Agente Operativo de IRP (IWOL Resource Planning), la plataforma de RANNIX Consulting para la administración de inmuebles comerciales en México. Hoy es ${hoy}.

${db
  ? `TIENES ACCESO DIRECTO A LOS DATOS REALES del sistema mediante la herramienta consultar_datos. Cuando el usuario pregunte por cifras, contratos, arrendatarios, locales, cobranza, ingresos, gastos, empleados o prospectos, CONSULTA los datos antes de responder; nunca digas que no tienes acceso ni pidas que revise la pantalla. Si una búsqueda no da resultados, intenta con otra palabra clave más corta (p. ej. solo el apellido o la primera palabra de la razón social) antes de concluir que no existe.`
  : `En esta sesión no hay usuario autenticado, así que no puedes consultar datos; responde con orientación general.`}

Vistas disponibles y sus columnas:
${catalogo}

Notas sobre los datos:
- Un arrendatario puede tener varios contratos (renovaciones: el anterior queda RENOVADO y el nuevo VIGENTE con contrato_anterior_id).
- estatus es la vigencia legal; estatus_proceso es la etapa operativa. En /contratos solo se listan EN_EJECUCION; los EN_RENOVACION viven en /renovaciones.
- dias_restantes negativo = vencido. Montos en pesos mexicanos.
- prp_cartera es la cobranza real (estado PENDIENTE/PAGADO/VENCIDO, saldo).

${db && puedeEscribir ? `Operaciones que modifican datos (herramienta proponer_accion):
- Hoy disponibles: ${Object.keys(ACCIONES).join(', ')}.
- Fichas de depósito: el usuario puede adjuntar imágenes; llegan ya leídas como "[Ficha F1 adjunta: importe…, fecha…, referencia…, concepto…]". Por cada ficha: (1) ubica el contrato por el número de local que traiga (concepto/referencia) buscando con consultar_datos en prp_contratos con estatus VIGENTE, y contrasta el ordenante con el arrendatario; (2) llama proponer_accion aplicar_pago con importe, fecha, referencia, forma_pago, banco, ordenante y ficha="F1" copiados TAL CUAL de la ficha, sin redondear. Si no hay local legible, si hay más de un contrato posible o el ordenante no coincide con el arrendatario, NO propongas: pregunta. Con varias fichas, una llamada por ficha en el mismo turno. Si la ficha dice que no se pudo leer, pide al usuario los datos.
- Reglas de aplicación (ya las hace el sistema): el pago cubre primero el cargo pendiente más antiguo; si no alcanza queda PARCIAL; el excedente es saldo a favor del inquilino; el depósito queda POR_VALIDAR hasta la conciliación bancaria. Si la propuesta falla por referencia duplicada, díselo al usuario. Para cualquier otra modificación (cobros, gastos, altas, cambios de datos) di con franqueza que todavía no puedes hacerla desde el chat e indica el módulo donde se hace.
- NUNCA ejecutas nada tú: proponer_accion solo muestra una tarjeta y el usuario confirma con un botón. Jamás afirmes que algo "ya quedó registrado" hasta que el usuario te lo confirme en un mensaje de sistema.
- No hagas cuestionarios. Consulta el registro, arma la propuesta con lo que el usuario ya dijo y los valores actuales como defecto, y deja que la tarjeta muestre el detalle. Pregunta solo si falta algo que no puedas deducir o si la solicitud es ambigua (varios contratos posibles).
- Si el usuario cambia un dato después de ver la tarjeta, vuelve a llamar proponer_accion con el valor corregido.
- Si un mensaje empieza con "[Sistema]" es el resultado real de una acción confirmada o cancelada por el usuario: repórtalo tal cual, sin inventar detalles.

` : ''}Estilo de respuesta:
- Español, directo y breve. Primero el dato, luego el detalle relevante (folios, locales, fechas, montos).
- Texto plano con saltos de línea y viñetas con "•". Sin encabezados markdown, sin tablas, sin emojis.
- Si ves algo accionable (contrato vencido, saldo en mora, renovación pendiente), menciónalo en una línea.
- Cuando aplique, cita normativa SAT, IMSS, LFT o LFPDPPP.
${context ? `\nContexto de la pantalla actual: ${context}` : ''}`

    const conv = messages.map(m => ({ role: m.role, content: m.content }))
    let respuesta = ''
    const propuestas = []
    const ctx = { reservado: {} }   // saldo ya asignado por propuestas de este turno

    for (let vuelta = 0; vuelta <= MAX_VUELTAS; vuelta++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemPrompt,
          tools: db ? herramientas : undefined,
          messages: conv,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error?.message || 'Error en Claude API')

      const usos = data.content.filter(b => b.type === 'tool_use')
      const texto = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')

      if (data.stop_reason !== 'tool_use' || !usos.length || !db) {
        respuesta = texto
        break
      }

      conv.push({ role: 'assistant', content: data.content })
      const resultados = []
      for (const u of usos) {
        let out
        try {
          if (u.name === 'proponer_accion') {
            const def = ACCIONES[u.input.accion]
            const prep = def ? await def.preparar(db, u.input.parametros || {}, ctx) : { error: 'Acción no disponible.' }
            if (prep.error) out = { error: prep.error }
            else {
              propuestas.push({ id: u.id, accion: u.input.accion, ...prep })
              out = { estado: 'PENDIENTE_DE_CONFIRMACION', nota: 'Aún NO se ejecuta. El usuario verá una tarjeta con el resumen y los botones Confirmar/Cancelar. Responde en 1-2 líneas qué propones y que espere su confirmación; no repitas el resumen completo.' }
            }
          } else out = await consultar(db, u.input)
        } catch (e) { out = { error: e.message } }
        console.log('[chat-operativo]', u.name, JSON.stringify(u.input), '→', out.error || out.estado || `${out.total} filas`)
        resultados.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) })
      }
      conv.push({ role: 'user', content: resultados })

      if (vuelta === MAX_VUELTAS) respuesta = texto || 'No pude completar la consulta; intenta con una pregunta más específica.'
    }

    return { statusCode: 200, headers, body: JSON.stringify({ content: respuesta, propuestas }) }
  } catch (error) {
    console.error('chat-operativo error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del Agente Operativo', detail: error.message }),
    }
  }
}
