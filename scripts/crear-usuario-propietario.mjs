// Crea el usuario propietario en producción:
//   1. Inserta el rol 'propietario' en irp_roles (si no existe)
//   2. Crea la cuenta en Supabase Auth
//   3. Inserta en irp_usuarios con rol_id = 'propietario'
//
// Uso: node scripts/crear-usuario-propietario.mjs

import fs from 'fs'
import pg from 'pg'

// Leer .env.local
const env = { ...process.env }
try {
  for (const line of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* CI */ }

const SUPA_URL        = env.VITE_SUPABASE_URL
const SERVICE_KEY     = env.SUPABASE_SERVICE_ROLE_KEY
const DB_PASSWORD     = env.SUPABASE_DB_PASSWORD

if (!SUPA_URL || !SERVICE_KEY || !DB_PASSWORD) {
  console.error('Faltan VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_DB_PASSWORD en .env.local')
  process.exit(1)
}

const EMAIL    = 'DG@iwol.click'
const NOMBRE   = 'DG Propietario'
const PASSWORD = 'Iwol2026!'   // contraseña inicial — cámbiala después

// ── 1. Crear usuario en Supabase Auth ────────────────────────────────────────
console.log(`\n[1/3] Creando usuario Auth: ${EMAIL} …`)
const authRes = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey:          SERVICE_KEY,
    Authorization:   `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
  },
  body: JSON.stringify({
    email:            EMAIL,
    password:         PASSWORD,
    email_confirm:    true,
    user_metadata:    { nombre: NOMBRE, rol_id: 'propietario' },
  }),
})
const authData = await authRes.json()
if (!authRes.ok) {
  if (authData.error_code === 'email_exists' || authData.msg?.includes('already')) {
    console.log('  → El usuario ya existe en Auth, buscando su ID…')
    const listRes  = await fetch(`${SUPA_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    const listData = await listRes.json()
    const existing = (listData.users ?? []).find(u => u.email?.toLowerCase() === EMAIL.toLowerCase())
    if (!existing) { console.error('No se encontró el usuario existente.'); process.exit(1) }
    authData.id = existing.id
    console.log(`  → ID encontrado: ${authData.id}`)
  } else {
    console.error('Error creando usuario Auth:', JSON.stringify(authData))
    process.exit(1)
  }
} else {
  console.log(`  → Usuario creado. ID: ${authData.id}`)
}

const userId = authData.id
if (!userId) { console.error('No se obtuvo el user_id'); process.exit(1) }

// ── 2. Conectar a la BD y registrar en irp_roles + irp_usuarios ───────────────
console.log('\n[2/3] Aplicando migración de rol propietario en irp_roles …')
const client = new pg.Client({
  host:     'aws-1-us-west-2.pooler.supabase.com',
  user:     'postgres.kusuoxwzdxfuybvyiakg',
  password: DB_PASSWORD,
  port:     5432,
  database: 'postgres',
  ssl:      { rejectUnauthorized: false },
})
await client.connect()

await client.query(`
  INSERT INTO irp_roles (id, nombre, descripcion)
  VALUES ('propietario', 'Propietario', 'Vista ejecutiva: informe semanal, EDR, contratos, RH y reportes')
  ON CONFLICT (id) DO NOTHING;
`)
console.log('  → Rol propietario OK')

// ── 3. Insertar en irp_usuarios ───────────────────────────────────────────────
console.log('\n[3/3] Registrando en irp_usuarios …')
await client.query(`
  INSERT INTO irp_usuarios (id, rol_id, nombre)
  VALUES ($1, 'propietario', $2)
  ON CONFLICT (id) DO UPDATE SET rol_id = 'propietario', nombre = $2;
`, [userId, NOMBRE])
console.log('  → irp_usuarios OK')

await client.query(`NOTIFY pgrst, 'reload schema';`)
await client.end()

console.log(`
✅ Listo. Usuario propietario creado:
   Email:      ${EMAIL}
   Password:   ${PASSWORD}   ← cámbiala en Supabase Auth después
   URL de entrada: https://irpapp.netlify.app/informe
   Instalable como PWA desde Safari (iOS) o Chrome (Android)
`)
