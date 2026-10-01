/**
 * admin-usuarios.js — IRP · RANNIX Consulting 2026
 *
 * CRUD de cuentas de usuario vía Supabase Auth Admin API.
 * Requiere SUPABASE_SERVICE_ROLE_KEY (solo en Netlify env vars, nunca en frontend).
 * Solo accesible para staff autenticado (rol no vetado, activo).
 *
 * Operaciones (campo `accion` en el body):
 *   listar        — lista auth.users + perfil irp_usuarios
 *   crear         — crea cuenta en auth + inserta irp_usuarios
 *   cambiar_pass  — actualiza contraseña
 *   cambiar_rol   — actualiza rol_id y nombre/apellido
 *   desactivar    — pone activo = false
 *   activar       — pone activo = true
 */

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

const ROLES_VETADOS = ['arrendatario', 'prospecto', 'restaurante', 'locatario']

function corsOrigin(event) {
  const origin = event.headers.origin || event.headers.Origin || ''
  const ok = /^https:\/\/([a-z0-9-]+--)?irpapp/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)
  return ok ? origin : 'https://irpapp.netlify.app'
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  corsOrigin(event),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }
  const ok  = (obj)          => ({ statusCode: 200, headers, body: JSON.stringify(obj) })
  const err = (code, msg)    => ({ statusCode: code, headers, body: JSON.stringify({ error: msg }) })

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST')    return err(405, 'Método no permitido')
  if (!SERVICE_KEY)                   return err(500, 'SUPABASE_SERVICE_ROLE_KEY no configurada')

  try {
    // ── Autenticación del llamante ─────────────────────────────────────────
    const jwt = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return err(401, 'No autorizado')

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
      realtime: { transport: ws },
    })

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(jwt)
    if (authErr || !caller) return err(401, 'Sesión inválida')

    const { data: perfil } = await admin
      .from('irp_usuarios').select('rol_id, activo').eq('id', caller.id).single()
    if (!perfil?.activo || ROLES_VETADOS.includes(perfil.rol_id)) return err(403, 'Acceso denegado')

    // ── Body ──────────────────────────────────────────────────────────────
    let body
    try { body = JSON.parse(event.body) } catch { return err(400, 'JSON inválido') }
    const { accion } = body

    // ── LISTAR ────────────────────────────────────────────────────────────
    if (accion === 'listar') {
      const { data: authList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 500 })
      if (listErr) return err(500, listErr.message)

      const { data: perfiles } = await admin
        .from('irp_usuarios').select('id, nombre, apellido, rol_id, activo, contrato_id')
      const { data: roles } = await admin
        .from('irp_roles').select('id, nombre, nivel').order('nivel')

      const perfilMap = {}
      ;(perfiles || []).forEach(p => { perfilMap[p.id] = p })

      const usuarios = authList.users.map(u => ({
        id:        u.id,
        email:     u.email,
        creado_en: u.created_at,
        ultimo_acceso: u.last_sign_in_at,
        ...(perfilMap[u.id] || { nombre: null, apellido: null, rol_id: null, activo: false }),
      }))

      return ok({ usuarios, roles: roles || [] })
    }

    // ── CREAR ─────────────────────────────────────────────────────────────
    if (accion === 'crear') {
      const { email, password, nombre, apellido, rol_id, contrato_id } = body
      if (!email || !password || !rol_id) return err(400, 'email, password y rol_id son obligatorios')
      if (password.length < 8) return err(400, 'La contraseña debe tener al menos 8 caracteres')

      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (createErr) return err(400, createErr.message)

      const { error: insertErr } = await admin.from('irp_usuarios').insert({
        id: newUser.user.id,
        nombre: nombre || '',
        apellido: apellido || '',
        rol_id,
        activo: true,
        ...(contrato_id ? { contrato_id } : {}),
      })
      if (insertErr) {
        await admin.auth.admin.deleteUser(newUser.user.id)
        return err(500, 'Usuario auth creado pero perfil falló: ' + insertErr.message)
      }

      return ok({ id: newUser.user.id, email: newUser.user.email })
    }

    // ── CAMBIAR CONTRASEÑA ────────────────────────────────────────────────
    if (accion === 'cambiar_pass') {
      const { usuario_id, password } = body
      if (!usuario_id || !password) return err(400, 'usuario_id y password son obligatorios')
      if (password.length < 8) return err(400, 'La contraseña debe tener al menos 8 caracteres')

      const { error: updErr } = await admin.auth.admin.updateUserById(usuario_id, { password })
      if (updErr) return err(400, updErr.message)
      return ok({ ok: true })
    }

    // ── CAMBIAR ROL / DATOS PERFIL ────────────────────────────────────────
    if (accion === 'cambiar_rol') {
      const { usuario_id, rol_id, nombre, apellido, contrato_id } = body
      if (!usuario_id) return err(400, 'usuario_id es obligatorio')

      const patch = {}
      if (rol_id   !== undefined) patch.rol_id   = rol_id
      if (nombre   !== undefined) patch.nombre   = nombre
      if (apellido !== undefined) patch.apellido = apellido
      if (contrato_id !== undefined) patch.contrato_id = contrato_id || null

      const { error: updErr } = await admin.from('irp_usuarios').update(patch).eq('id', usuario_id)
      if (updErr) return err(500, updErr.message)
      return ok({ ok: true })
    }

    // ── DESACTIVAR / ACTIVAR ──────────────────────────────────────────────
    if (accion === 'desactivar' || accion === 'activar') {
      const { usuario_id } = body
      if (!usuario_id) return err(400, 'usuario_id es obligatorio')
      const { error: updErr } = await admin.from('irp_usuarios')
        .update({ activo: accion === 'activar' }).eq('id', usuario_id)
      if (updErr) return err(500, updErr.message)
      return ok({ ok: true })
    }

    return err(400, `Acción desconocida: ${accion}`)

  } catch (e) {
    console.error('admin-usuarios error', e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
