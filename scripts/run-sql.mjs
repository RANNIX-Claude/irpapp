/**
 * Ejecuta archivos .sql contra la base de Supabase del proyecto.
 *
 *   node scripts/run-sql.mjs supabase/migrations/20260909200000_fix_recursion_irp_usuarios.sql
 *   node scripts/run-sql.mjs archivo1.sql archivo2.sql
 *   node scripts/run-sql.mjs --check          # solo prueba la conexión
 *
 * Requiere SUPABASE_DB_PASSWORD en .env.local (o en el entorno):
 *   Supabase -> Settings -> Database -> Database password
 *
 * .env.local está en .gitignore, así que la contraseña no llega al repo.
 *
 * Cada archivo corre dentro de una transacción: si algo falla, no queda nada
 * a medias. Los que ya son idempotentes pueden repetirse sin problema.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

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
const password = env.SUPABASE_DB_PASSWORD
const ref = (env.VITE_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]

if (!ref) {
  console.error('No se pudo deducir el proyecto: falta VITE_SUPABASE_URL en .env.local')
  process.exit(1)
}
if (!password) {
  console.error(`
Falta SUPABASE_DB_PASSWORD.

  1. Supabase -> Settings -> Database -> Database password
     (si no la recuerdas, ahí mismo se puede regenerar)
  2. Agrégala a .env.local:

     SUPABASE_DB_PASSWORD=tu_password

.env.local está en .gitignore, no se sube al repo.`)
  process.exit(1)
}

// Pooler en modo session: admite transacciones y DDL.
const cliente = new pg.Client({
  host: 'aws-1-us-west-2.pooler.supabase.com',
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const archivos = process.argv.slice(2).filter(a => a !== '--check')
const soloCheck = process.argv.includes('--check')

try {
  await cliente.connect()
  const { rows } = await cliente.query('select current_database() db, current_user usr')
  console.log(`Conectado a ${rows[0].db} como ${rows[0].usr} (proyecto ${ref})`)
} catch (e) {
  console.error('No se pudo conectar:', e.message)
  process.exit(1)
}

if (soloCheck || !archivos.length) {
  if (!archivos.length && !soloCheck) console.log('\nUso: node scripts/run-sql.mjs <archivo.sql> [...]')
  await cliente.end()
  process.exit(0)
}

let fallos = 0
for (const archivo of archivos) {
  const sql = readFileSync(resolve(archivo), 'utf-8')
  process.stdout.write(`\n→ ${archivo}\n`)
  try {
    await cliente.query('begin')
    await cliente.query(sql)
    await cliente.query('commit')
    console.log('  ✓ aplicado')
  } catch (e) {
    await cliente.query('rollback').catch(() => {})
    fallos++
    console.error(`  ✗ ${e.message}`)
    if (e.position) {
      const hasta = sql.slice(0, Number(e.position))
      console.error(`    línea ${hasta.split('\n').length}`)
    }
  }
}

await cliente.end()
console.log(fallos ? `\n${fallos} archivo(s) con error.` : '\nListo.')
process.exit(fallos ? 1 : 0)
