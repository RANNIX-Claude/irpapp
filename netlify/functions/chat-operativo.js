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
 * de filas. No hay forma de escribir ni de ejecutar SQL libre.
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

Estilo de respuesta:
- Español, directo y breve. Primero el dato, luego el detalle relevante (folios, locales, fechas, montos).
- Texto plano con saltos de línea y viñetas con "•". Sin encabezados markdown, sin tablas, sin emojis.
- Si ves algo accionable (contrato vencido, saldo en mora, renovación pendiente), menciónalo en una línea.
- Cuando aplique, cita normativa SAT, IMSS, LFT o LFPDPPP.
${context ? `\nContexto de la pantalla actual: ${context}` : ''}`

    const conv = messages.map(m => ({ role: m.role, content: m.content }))
    let respuesta = ''

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
          tools: db ? TOOLS : undefined,
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
        try { out = await consultar(db, u.input) } catch (e) { out = { error: e.message } }
        console.log('[chat-operativo] consulta', JSON.stringify(u.input), '→', out.error || `${out.total} filas`)
        resultados.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) })
      }
      conv.push({ role: 'user', content: resultados })

      if (vuelta === MAX_VUELTAS) respuesta = texto || 'No pude completar la consulta; intenta con una pregunta más específica.'
    }

    return { statusCode: 200, headers, body: JSON.stringify({ content: respuesta }) }
  } catch (error) {
    console.error('chat-operativo error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del Agente Operativo', detail: error.message }),
    }
  }
}
