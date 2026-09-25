// Crea (o reutiliza) un usuario con rol `asistente` en QA.
//
//   node scripts/crear-usuario-asistente-qa.mjs <correo> <contraseña> [nombre]
//
// La contraseña va por argumento a propósito: no se guarda en el repositorio.
// Requiere QA_SUPABASE_SERVICE_ROLE_KEY y QA_SUPABASE_DB_PASSWORD en .env.local, y que la
// migración 20260925210000_rol_asistente.sql ya esté aplicada en QA.

import fs from 'fs'
import pg from 'pg'

const [, , EMAIL, PASSWORD, NOMBRE = 'Asistente'] = process.argv
if (!EMAIL || !PASSWORD) { console.error('Uso: node scripts/crear-usuario-asistente-qa.mjs <correo> <contraseña> [nombre]'); process.exit(1) }

const env = { ...process.env }
try {
  for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* CI */ }

const SUPA_URL = 'https://wijcjdbmdbxzmwpdxoal.supabase.co'
const SERVICE_KEY = env.QA_SUPABASE_SERVICE_ROLE_KEY
const DB_PASSWORD = env.QA_SUPABASE_DB_PASSWORD
if (!SERVICE_KEY || !DB_PASSWORD) { console.error('Faltan QA_SUPABASE_SERVICE_ROLE_KEY o QA_SUPABASE_DB_PASSWORD en .env.local'); process.exit(1) }

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

// 1. Auth
let userId
const res = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { nombre: NOMBRE, rol_id: 'asistente' } }),
})
const data = await res.json()
if (res.ok) { userId = data.id; console.log(`Auth: usuario creado (${userId})`) }
else if (data.error_code === 'email_exists' || data.msg?.includes('already')) {
  const lista = await fetch(`${SUPA_URL}/auth/v1/admin/users?per_page=1000`, { headers: H }).then(r => r.json())
  const ya = (lista.users ?? []).find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())
  if (!ya) { console.error('El correo existe pero no se pudo localizar.'); process.exit(1) }
  userId = ya.id
  // Ya existía: se fija la contraseña indicada para que el acceso quede como se pidió.
  const up = await fetch(`${SUPA_URL}/auth/v1/admin/users/${userId}`, { method: 'PUT', headers: H, body: JSON.stringify({ password: PASSWORD, email_confirm: true }) })
  if (!up.ok) { console.error('No se pudo actualizar la contraseña:', await up.text()); process.exit(1) }
  console.log(`Auth: el usuario ya existía (${userId}); contraseña actualizada`)
} else { console.error('Error creando el usuario:', JSON.stringify(data)); process.exit(1) }

// 2. Perfil con rol asistente
const c = new pg.Client({ host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co', user: 'postgres', password: DB_PASSWORD, port: 5432, database: 'postgres', ssl: { rejectUnauthorized: false } })
await c.connect()
const rol = await c.query(`select 1 from public.irp_roles where id = 'asistente'`)
if (!rol.rowCount) { console.error("El rol 'asistente' no existe en QA: aplica primero la migración 20260925210000_rol_asistente.sql"); process.exit(1) }
await c.query(
  `insert into public.irp_usuarios (id, rol_id, nombre, activo) values ($1, 'asistente', $2, true)
   on conflict (id) do update set rol_id = 'asistente', nombre = excluded.nombre, activo = true`,
  [userId, NOMBRE],
)
const v = await c.query(`select rol_id, nombre, activo from public.irp_usuarios where id = $1`, [userId])
console.log('Perfil:', v.rows[0])
await c.end()
