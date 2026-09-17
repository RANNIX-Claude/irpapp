import fs from 'fs'
import pg from 'pg'

const envText = fs.readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local', 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const db = new pg.Client({
  host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: env.QA_SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
})
await db.connect()

const {rows} = await db.query(`
  SELECT table_schema, column_name
  FROM information_schema.columns
  WHERE table_name = 'arrendatarios'
  ORDER BY table_schema, ordinal_position
`)
console.log('arrendatarios:', rows.map(r => `${r.table_schema}.${r.column_name}`).join(', '))

const {rows: r2} = await db.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'rh_empleados' ORDER BY ordinal_position
`)
console.log('rh_empleados:', r2.map(r => r.column_name).join(', '))

await db.end()
