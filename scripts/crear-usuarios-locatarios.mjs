/**
 * Da de alta (o vincula) un usuario Supabase Auth por cada contrato VIGENTE,
 * con rol_id = 'locatario' y su irp_usuarios.contrato_id apuntando a su
 * propio contrato — así el Sidebar/App.jsx lo mandan directo a su expediente.
 *
 * Username/email: se deriva del primer local del contrato (locales_display,
 * ej. "L16" o "L37, L38" -> L37) como L{2 dígitos}@iwol.mx. Contratos sin
 * locales_display (sin local asignado todavía) se listan al final para
 * darlos de alta a mano.
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local (Supabase -> Settings ->
 * API -> service_role). Password para todos, por ahora: 123456.
 *
 *   node scripts/crear-usuarios-locatarios.mjs           # aplica los cambios
 *   node scripts/crear-usuarios-locatarios.mjs --dry      # solo muestra qué haría
 *
 * .env.local está en .gitignore — la llave no llega al repo.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

function cargarEnv() {
  const env = { ...process.env }
  try {
    for (const linea of readFileSync(resolve('.env.local'), 'utf-8').split('\n')) {
      const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* sin .env.local, se usa solo el entorno */ }
  return env
}

const env = cargarEnv()
const dryRun = process.argv.includes('--dry')
const PASSWORD = '123456'

if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`
Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.

  1. Supabase -> Settings -> API -> Project API keys -> service_role
  2. Agrégala a .env.local:

     SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

.env.local está en .gitignore, no se sube al repo.`)
  process.exit(1)
}

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Primer local de "L37, L38" -> "L37"; de "L16" -> "L16".
function primerLocal(localesDisplay) {
  const primero = (localesDisplay || '').split(',')[0].trim()
  const m = primero.match(/(\d+)/)
  return m ? m[1].padStart(2, '0') : null
}

const { data: contratos, error: errContratos } = await admin
  .from('prp_contratos')
  .select('id, locales_display, arrendatario_nombre')
  .eq('estatus', 'VIGENTE')
  .order('locales_display', { ascending: true, nullsFirst: false })

if (errContratos) { console.error('No se pudieron leer los contratos:', errContratos.message); process.exit(1) }

const sinLocal = contratos.filter(c => !primerLocal(c.locales_display))
const conLocal = contratos.filter(c => primerLocal(c.locales_display))

console.log(`${conLocal.length} contrato(s) con local detectado, ${sinLocal.length} sin local (se listan al final).\n`)
if (dryRun) console.log('*** MODO --dry: no se escribe nada ***\n')

const { data: existentes } = await admin.auth.admin.listUsers({ perPage: 1000 })
const porEmail = new Map((existentes?.users ?? []).map(u => [u.email, u]))

const resumen = []

for (const c of conLocal) {
  const num = primerLocal(c.locales_display)
  const username = `L${num}`
  const email = `l${num}@iwol.mx`

  let authUserId
  const existente = porEmail.get(email)

  if (dryRun) {
    resumen.push({ local: c.locales_display, username, email, arrendatario: c.arrendatario_nombre, accion: existente ? 'actualizaría' : 'crearía' })
    continue
  }

  if (existente) {
    const { error } = await admin.auth.admin.updateUserById(existente.id, {
      password: PASSWORD,
      user_metadata: { rol_id: 'locatario', username },
    })
    if (error) { console.error(`✗ ${email}: ${error.message}`); continue }
    authUserId = existente.id
  } else {
    const { data: nuevo, error } = await admin.auth.admin.createUser({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { rol_id: 'locatario', username },
    })
    if (error) { console.error(`✗ ${email}: ${error.message}`); continue }
    authUserId = nuevo.user.id
  }

  const { error: perfilErr } = await admin.from('irp_usuarios').upsert({
    id: authUserId,
    rol_id: 'locatario',
    nombre: c.arrendatario_nombre,
    contrato_id: c.id,
    activo: true,
  }, { onConflict: 'id' })
  if (perfilErr) { console.error(`✗ ${email} (perfil): ${perfilErr.message}`); continue }

  resumen.push({ local: c.locales_display, username, email, arrendatario: c.arrendatario_nombre, accion: existente ? 'actualizado' : 'creado' })
}

console.table(resumen)

if (sinLocal.length) {
  console.log('\nSin local asignado (dar de alta a mano si aplica):')
  console.table(sinLocal.map(c => ({ contrato_id: c.id, arrendatario: c.arrendatario_nombre })))
}

console.log(`\nContraseña para todos: ${PASSWORD}`)
