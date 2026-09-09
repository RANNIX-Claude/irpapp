/**
 * Valida contra la base real que una relación y sus columnas existan.
 * Herramienta de auditoría: responde lo que `vite build` no puede saber.
 *
 *   node scripts/check-schema.mjs prp_empleados
 *   node scripts/check-schema.mjs prp_asistencia empleado_id fecha estado
 *   node scripts/check-schema.mjs --filas prp_cobros
 *   node scripts/check-schema.mjs --valores prp_contratos estatus
 *
 * Requiere SUPABASE_DB_PASSWORD en el entorno o en .env.local.
 */
import { readFileSync } from 'fs'
import pg from 'pg'

const env = { ...process.env }
try {
  for (const l of readFileSync('.env.local', 'utf-8').split('\n')) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {}

const ref = (env.VITE_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (!ref || !env.SUPABASE_DB_PASSWORD) {
  console.error('Falta VITE_SUPABASE_URL o SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const args = process.argv.slice(2)
const modo = args[0]?.startsWith('--') ? args.shift() : null
const [relacion, ...columnas] = args

if (!relacion) {
  console.error('Uso: node scripts/check-schema.mjs [--filas|--valores] <relacion> [columna...]')
  process.exit(1)
}

const c = new pg.Client({
  host: 'aws-1-us-west-2.pooler.supabase.com', port: 5432,
  user: `postgres.${ref}`, password: env.SUPABASE_DB_PASSWORD,
  database: 'postgres', ssl: { rejectUnauthorized: false },
})
await c.connect()

try {
  const existe = await c.query(
    `select table_type from information_schema.tables
      where table_schema='public' and table_name=$1`, [relacion])

  if (!existe.rowCount) {
    console.log(`✗ NO EXISTE: ${relacion}`)
    process.exit(1)
  }
  const tipo = existe.rows[0].table_type === 'VIEW' ? 'vista' : 'tabla'

  const cols = await c.query(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name=$1 order by ordinal_position`, [relacion])
  const disponibles = cols.rows.map(r => r.column_name)

  if (modo === '--filas') {
    const n = await c.query(`select count(*)::int n from public.${relacion}`)
    console.log(`${relacion} (${tipo}): ${n.rows[0].n} filas`)
  } else if (modo === '--valores') {
    const col = columnas[0]
    const v = await c.query(
      `select ${col}::text valor, count(*)::int n from public.${relacion}
        group by 1 order by n desc limit 25`)
    console.log(`${relacion}.${col} — valores reales:`)
    for (const r of v.rows) console.log(`   ${JSON.stringify(r.valor)}: ${r.n}`)
  } else if (columnas.length) {
    console.log(`${relacion} (${tipo}):`)
    for (const col of columnas) {
      console.log(`   ${disponibles.includes(col) ? '✓' : '✗ NO EXISTE'}  ${col}`)
    }
    const faltan = columnas.filter(x => !disponibles.includes(x))
    if (faltan.length) process.exitCode = 1
  } else {
    console.log(`${relacion} (${tipo}) — ${disponibles.length} columnas:`)
    console.log('   ' + disponibles.join(', '))
  }

  // Aviso útil: una vista sobre el esquema `prp` es otro modelo de datos.
  if (tipo === 'vista') {
    const def = await c.query(`select pg_get_viewdef($1::regclass, true) d`, [`public.${relacion}`])
    if (/\bprp\./.test(def.rows[0].d)) {
      console.log('   ⚠ esta vista lee del esquema prp (modelo distinto a public)')
    }
  }
} finally {
  await c.end()
}
