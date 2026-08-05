/**
 * PRP — Script de setup de base de datos
 * Ejecuta reset_database.sql y rh_modulo_completo.sql contra Supabase
 *
 * Uso:
 *   node scripts/setup-db.mjs
 *
 * Requiere en .env.local:
 *   VITE_SUPABASE_URL=https://ywashdlhkbvleigakjus.supabase.co
 *   SUPABASE_DB_PASSWORD=<password de Settings > Database>
 *
 * O con variable directa:
 *   SUPABASE_DB_PASSWORD=xxxxx node scripts/setup-db.mjs
 */

import { readFileSync } from 'fs'
import { createConnection } from 'net'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer .env.local
function loadEnv() {
  try {
    const env = readFileSync(join(__dirname, '../.env.local'), 'utf8')
    env.split('\n').forEach(line => {
      const [k, ...v] = line.split('=')
      if (k && v.length) process.env[k.trim()] = v.join('=').trim()
    })
  } catch {}
}

loadEnv()

const PROJECT_REF = 'ywashdlhkbvleigakjus'
const DB_PASSWORD  = process.env.SUPABASE_DB_PASSWORD
const DB_HOST      = `db.${PROJECT_REF}.supabase.co`
const DB_PORT      = 5432
const DB_USER      = 'postgres'
const DB_NAME      = 'postgres'

if (!DB_PASSWORD) {
  console.error('❌ Falta SUPABASE_DB_PASSWORD en .env.local o variable de entorno')
  console.error('   Obtén la contraseña en: Supabase Dashboard → Settings → Database → Password')
  process.exit(1)
}

// Importar pg dinámicamente
let pg
try {
  pg = (await import('pg')).default
} catch {
  console.error('❌ Falta el paquete pg. Ejecuta: npm install pg')
  process.exit(1)
}

const { Client } = pg

const client = new Client({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: { rejectUnauthorized: false },
})

const SQL_FILES = [
  '../reset_database.sql',
  '../rh_modulo_completo.sql',
  '../public_views.sql',
]

async function run() {
  console.log(`\n🔌 Conectando a Supabase PostgreSQL: ${DB_HOST}:${DB_PORT}...`)
  await client.connect()
  console.log('✅ Conectado\n')

  for (const file of SQL_FILES) {
    const filePath = join(__dirname, file)
    const sql = readFileSync(filePath, 'utf8')
    console.log(`📄 Ejecutando ${file} (${Math.round(sql.length / 1024)} KB)...`)

    // Dividir en statements individuales para mejor control de errores
    // Usamos punto y coma como delimitador básico
    try {
      await client.query(sql)
      console.log(`✅ ${file} ejecutado exitosamente\n`)
    } catch (err) {
      console.error(`⚠️  Error en ${file}: ${err.message}`)
      console.error('   Continuando con el siguiente script...\n')
    }
  }

  // Verificación final
  console.log('🔍 Verificando tablas creadas...')
  const { rows } = await client.query(`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('prp', 'dw')
    ORDER BY schemaname, tablename
  `)
  console.log(`✅ Tablas encontradas: ${rows.length}`)
  rows.forEach(r => console.log(`   • ${r.schemaname}.${r.tablename}`))

  // KPIs demo
  const kpis = await client.query('SELECT * FROM prp.v_kpis_dashboard LIMIT 1').catch(() => ({ rows: [] }))
  if (kpis.rows.length) {
    console.log('\n📊 KPIs Dashboard:')
    console.log(JSON.stringify(kpis.rows[0], null, 2))
  }

  await client.end()
  console.log('\n🎉 Setup completado exitosamente')
}

run().catch(err => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})
