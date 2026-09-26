/**
 * ejecutar-accion.js — IRP · RANNIX Consulting 2026
 *
 * Ejecuta en el servidor una acción que el Agente Operativo propuso y que el usuario
 * confirmó. Existe para el rol `asistente`, que NO tiene permisos de escritura directos
 * en la base: escribir solo es posible por aquí, con la service_role key, y solo lo que
 * cumple TODO esto:
 *   1. Sesión válida (JWT) de un usuario activo.
 *   2. Su rol tiene la acción en la matriz PERMISOS (rol × acción).
 *   3. La propuesta viene FIRMADA por chat-operativo para ese usuario (HMAC) y no ha
 *      caducado: los parámetros son exactamente los que `preparar` validó contra los
 *      datos reales. Alterarlos en el navegador invalida la firma.
 * El personal no pasa por aquí: ejecuta en el navegador con su propia sesión.
 *
 * La lógica de cada acción es la misma del navegador (src/lib/agenteEjecutores.js).
 */
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import crypto from 'crypto'
import { crearEjecutores } from '../../src/lib/agenteEjecutores.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY

const CADUCA_MS = 2 * 60 * 60 * 1000   // una propuesta sin confirmar vale 2 horas

// Matriz rol × acción. Agregar un rol o una acción aquí es una decisión de seguridad.
export const PERMISOS = {
  asistente: ['aplicar_pago', 'registrar_gasto', 'alta_empleado', 'alta_arrendatario', 'renovar_contrato', 'importar_asistencia', 'corregir_asistencia'],
}

const MIMES = ['image/jpeg', 'image/png', 'image/webp']

// ── Firma: la misma que chat-operativo.js (mantener idénticas) ───────────────
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : (v && typeof v === 'object') ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  : JSON.stringify(v)
const secreto = () => crypto.createHash('sha256').update('agente-firma:' + SERVICE_KEY).digest()
export const firmar = (uid, accion, emitida, params) =>
  crypto.createHmac('sha256', secreto()).update(`${uid}|${accion}|${emitida}|${canon(params)}`).digest('hex')

const iguales = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

function corsOrigin(event) {
  const origin = event.headers.origin || event.headers.Origin || ''
  const ok = /^https:\/\/([a-z0-9-]+--)?irpapp(-qa)?\.netlify\.app$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)
  return ok ? origin : 'https://irpapp.netlify.app'
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin(event),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }
  const responder = (statusCode, obj) => ({ statusCode, headers, body: JSON.stringify(obj) })
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' })
  if (!SERVICE_KEY) return responder(500, { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' })

  try {
    // ── 1. Sesión ────────────────────────────────────────────────────────
    const jwt = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return responder(401, { error: 'No autorizado' })
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false }, realtime: { transport: ws } })
    const { data: { user }, error: authErr } = await admin.auth.getUser(jwt)
    if (authErr || !user) return responder(401, { error: 'Sesión inválida' })
    const { data: perfil } = await admin.from('irp_usuarios').select('rol_id, activo').eq('id', user.id).maybeSingle()
    if (!perfil?.activo) return responder(403, { error: 'Cuenta inactiva' })

    // ── 2. Rol × acción ──────────────────────────────────────────────────
    let body
    try { body = JSON.parse(event.body || '{}') } catch { return responder(400, { error: 'JSON inválido' }) }
    const { accion, params, firma, emitida, fichas = {} } = body
    if (!(PERMISOS[perfil.rol_id] || []).includes(accion)) {
      console.warn('[ejecutar-accion] denegado', perfil.rol_id, accion, user.id)
      return responder(403, { error: `Tu rol (${perfil.rol_id}) no puede ejecutar la acción ${accion}.` })
    }

    // ── 3. Firma y caducidad ─────────────────────────────────────────────
    if (!params || typeof params !== 'object' || !firma || !emitida) return responder(400, { error: 'Propuesta incompleta' })
    if (!iguales(firma, firmar(user.id, accion, emitida, params))) {
      console.warn('[ejecutar-accion] firma inválida', accion, user.id)
      return responder(403, { error: 'La propuesta no es válida (firma). Pídela de nuevo.' })
    }
    if (Date.now() - Number(emitida) > CADUCA_MS) return responder(410, { error: 'La propuesta caducó. Pídela de nuevo.' })

    // Imágenes: solo las que la propuesta menciona, tipo imagen y de tamaño razonable.
    const mencionadas = new Set([params.ficha, ...Object.values(params.fichas || {})].filter(Boolean))
    const imagenes = {}
    for (const [id, f] of Object.entries(fichas)) {
      if (!mencionadas.has(id)) continue
      if (!f?.base64 || !MIMES.includes(f.mime) || f.base64.length > 6 * 1024 * 1024) continue
      imagenes[id] = { base64: f.base64, mime: f.mime, ext: f.mime === 'image/png' ? 'png' : f.mime === 'image/webp' ? 'webp' : 'jpg' }
    }

    // ── 4. Ejecutar ──────────────────────────────────────────────────────
    // La bitácora se escribe con la sesión del usuario para que quede su identidad.
    const comoUsuario = ANON_KEY
      ? createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false }, realtime: { transport: ws } })
      : null
    const subir = async (bucket, path, f) => {
      const { data, error } = await admin.storage.from(bucket).upload(path, Buffer.from(f.base64, 'base64'), { contentType: f.mime, upsert: true })
      if (error) throw error
      return data?.path || path
    }
    const ejecutores = crearEjecutores({
      db: admin,
      ficha: id => imagenes[id] || null,
      consumirFicha: () => {},
      subirArchivo: subir,
      async subirComprobante(ingresoId, f) {
        const path = await subir('facturas-cfdi', `comprobantes/${ingresoId}/comp.${f.ext}`, f)
        await admin.from('ingresos').update({ comprobante_url: `${SUPABASE_URL}/storage/v1/object/public/facturas-cfdi/${path}` }).eq('id', ingresoId)
      },
      async audit(e) {
        try {
          await comoUsuario?.rpc('log_bitacora', {
            p_modulo: e.modulo, p_accion: e.accion, p_entidad: e.entidad || null,
            p_entidad_id: /^[0-9a-f-]{36}$/i.test(String(e.entidad_id || '')) ? e.entidad_id : null,
            p_descripcion: e.descripcion || null,
          })
        } catch { /* la bitácora nunca bloquea */ }
      },
    })
    const resultado = await ejecutores[accion](params)
    console.log('[ejecutar-accion] ok', perfil.rol_id, accion, user.id)
    return responder(200, { texto: resultado.texto, ruta: resultado.ruta })
  } catch (err) {
    console.error('[ejecutar-accion] error', err)
    return responder(422, { error: err?.message || String(err) })
  }
}
