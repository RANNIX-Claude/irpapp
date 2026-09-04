/**
 * crear-acceso-inquilino.js — IRP · RANNIX Consulting 2026
 *
 * Crea (o restablece) la cuenta Supabase Auth del inquilino y la vincula
 * a su arrendatario_id en la BD.
 *
 * POST body:
 *   { arrendatario_id, numero_local, password }
 *
 * El email interno generado sigue el formato:  loc{pad(numero_local)}@plazaiwol.mx
 * Ej: local "01" → "loc01@plazaiwol.mx"
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) }

  // ── Verificar que quien llama es un admin autenticado ────────────────
  const authHeader = event.headers['authorization'] || ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Verificar que el llamante tiene un perfil en irp_usuarios (es admin)
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(jwt)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  const { data: perfilAdmin } = await supabaseAdmin
    .from('irp_usuarios')
    .select('rol_id, activo')
    .eq('id', caller.id)
    .single()

  if (!perfilAdmin?.activo) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acceso denegado' }) }
  }

  // ── Parsear body ────────────────────────────────────────────────────
  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) } }

  const { arrendatario_id, numero_local, password } = body
  if (!arrendatario_id || !numero_local || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos: arrendatario_id, numero_local, password' }) }
  }
  if (password.length < 8) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }) }
  }

  // ── Generar email interno LOC-formato ───────────────────────────────
  // numero_local puede ser "L-01", "L06", "01", etc. — extraemos solo los dígitos
  const numDigits = String(numero_local).replace(/\D/g, '').padStart(2, '0')
  const email     = `loc${numDigits}@plazaiwol.mx`
  const username  = `LOC${numDigits}`

  // ── Verificar si ya existe un usuario con ese email ─────────────────
  const { data: existingList } = await supabaseAdmin.auth.admin.listUsers()
  const existing = existingList?.users?.find(u => u.email === email)

  let authUserId

  if (existing) {
    // Actualizar contraseña del existente
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { rol_id: 'arrendatario', username, numero_local: username },
    })
    if (updErr) return { statusCode: 500, headers, body: JSON.stringify({ error: updErr.message }) }
    authUserId = existing.id
  } else {
    // Crear nuevo usuario
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // no requiere verificación de correo
      user_metadata: { rol_id: 'arrendatario', username, numero_local: username },
    })
    if (createErr) return { statusCode: 500, headers, body: JSON.stringify({ error: createErr.message }) }
    authUserId = newUser.user.id
  }

  // ── Vincular usuario → arrendatario ────────────────────────────────
  const { error: vinculoErr } = await supabaseAdmin.rpc('vincular_usuario_arrendatario', {
    p_arrendatario_id: arrendatario_id,
    p_auth_user_id:    authUserId,
  })
  if (vinculoErr) return { statusCode: 500, headers, body: JSON.stringify({ error: vinculoErr.message }) }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      usuario:  username,
      email,
      mensaje:  existing
        ? `Contraseña restablecida para ${username}`
        : `Usuario ${username} creado correctamente`,
    }),
  }
}
