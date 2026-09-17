/**
 * clonar-qa-a-nuevo.mjs
 * Clona el ambiente QA completo al nuevo proyecto Supabase hfyoqbtjujhwqyrhikla
 *
 * Pasos:
 *   1. Aplicar schema (tablas, vistas, funciones, RLS, triggers)
 *   2. Copiar datos de QA tabla por tabla
 *   3. Copiar usuarios de auth (mismo email/password)
 *   4. Otorgar permisos API (anon, authenticated, service_role)
 *   5. Copiar imágenes de Storage (logos + fotos empleados)
 *
 * Uso:
 *   node scripts/clonar-qa-a-nuevo.mjs            # todos los pasos
 *   node scripts/clonar-qa-a-nuevo.mjs schema     # solo schema
 *   node scripts/clonar-qa-a-nuevo.mjs data       # solo datos
 *   node scripts/clonar-qa-a-nuevo.mjs auth       # solo auth
 *   node scripts/clonar-qa-a-nuevo.mjs grants     # solo permisos
 *   node scripts/clonar-qa-a-nuevo.mjs storage    # solo Storage
 */

import fs from 'fs'
import pg from 'pg'
// fetch es global en Node 18+ (sin import necesario)

// ── leer .env.local ───────────────────────────────────────────────────────────
const envText = fs.readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local', 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

// ── origen: QA ────────────────────────────────────────────────────────────────
const QA_HOST     = 'db.wijcjdbmdbxzmwpdxoal.supabase.co'
const QA_URL      = env.QA_SUPABASE_URL || 'https://wijcjdbmdbxzmwpdxoal.supabase.co'
const QA_DB_PASS  = env.QA_SUPABASE_DB_PASSWORD
const QA_SVC_KEY  = env.QA_SUPABASE_SERVICE_ROLE_KEY

// ── destino: nuevo proyecto ───────────────────────────────────────────────────
const NEW_HOST    = 'db.hfyoqbtjujhwqyrhikla.supabase.co'
const NEW_URL     = 'https://hfyoqbtjujhwqyrhikla.supabase.co'
const NEW_DB_PASS = env.NEW_SUPABASE_DB_PASSWORD
const NEW_SVC_KEY = env.NEW_SUPABASE_SERVICE_ROLE_KEY

if (!QA_DB_PASS)  { console.error('❌  Falta QA_SUPABASE_DB_PASSWORD');  process.exit(1) }
if (!NEW_DB_PASS) { console.error('❌  Falta NEW_SUPABASE_DB_PASSWORD'); process.exit(1) }

const modo = process.argv[2] // schema | data | auth | grants | storage | undefined

// ── helpers de conexión ───────────────────────────────────────────────────────
function makeClient(host, pass) {
  return new pg.Client({
    host, port: 5432, database: 'postgres', user: 'postgres',
    password: pass, ssl: { rejectUnauthorized: false },
  })
}

// ── PASO 1: SCHEMA ────────────────────────────────────────────────────────────
async function aplicarSchema() {
  console.log('\n📐  PASO 1 — Schema')
  console.log('─'.repeat(50))
  const sql = fs.readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\supabase\\qa-bootstrap\\schema.sql', 'utf8')
  const db = makeClient(NEW_HOST, NEW_DB_PASS)
  await db.connect()
  try {
    await db.query(sql)
    console.log('  ✅  Schema aplicado correctamente')
  } catch (err) {
    // Errores de "ya existe" son esperables si el schema estaba parcialmente aplicado
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log('  ⚠️   Algunas partes ya existían — continuando:', err.message.split('\n')[0])
    } else {
      throw err
    }
  } finally { await db.end() }
}

// ── PASO 2: DATOS ─────────────────────────────────────────────────────────────
const TABLAS_ORDEN = [
  // catálogos primero (sin dependencias) — irp_usuarios va al final porque depende de contratos
  'public.cat_parametros','public.irp_roles',
  'public.cat_locales','public.cat_proveedores','public.cat_productos',
  // prp schema base
  'prp.arrendatarios','prp.contratos_arrendamiento','prp.contratos_locales_arr',
  'prp.empleados','prp.incidencias','prp.historial_sueldo',
  'prp.documentos','prp.prospectos','prp.prospecto_personas','prp.prospecto_documentos',
  'prp.proveedores','prp.fondos_revolventes','prp.fondo_semana',
  'prp.fondo_revolvente_cierres','prp.bitacora',
  'prp.estacionamiento_diario','prp.estacionamiento_pensiones',
  'prp.cajones_estacionamiento',
  // public schema principal
  'public.arrendatarios','public.contratos','public.contratos_locales',
  'public.cargos_programados','public.comprobantes_pago','public.aplicaciones_pago',
  'public.ingresos','public.gastos_operativos','public.gasto_detalle',
  'public.ordenes_trabajo','public.er_mensual',
  'public.movimientos_banco',
  'public.rh_empleados','public.rh_incidencias','public.rh_historial_sueldo',
  'public.rh_historial_nombre','public.rh_historial_cambios',
  'public.rh_expediente_documentos','public.rh_beneficios',
  'public.rh_capacitacion','public.rh_evaluaciones',
  'public.rh_asistencia','public.rh_checadas',
  'public.rh_tipos_incidencia','public.rh_vacaciones_anio','public.rh_vacaciones_detalle',
  'public.validacion_puntos','public.validacion_revisiones',
  'public.validacion_reportes','public.validacion_adjuntos',
  'public.vending_productos','public.vending_semanas','public.vending_semana_producto',
  'public.vending_movimientos',
  'public.restaurante_gastos','public.restaurante_gasto_detalle',
  'public.estacionamiento_diario','public.estacionamiento_pensiones',
  'public.irp_usuarios',   // al final: contrato_id → public.contratos
]

// Devuelve columnas insertables (excluye generadas/computed) de una tabla en el DESTINO
async function colsInsertables(db, schema, table) {
  const { rows } = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
      AND is_generated = 'NEVER'
      AND column_default NOT LIKE 'generated%' OR column_default IS NULL
    ORDER BY ordinal_position
  `, [schema, table])
  return rows.map(r => r.column_name)
}

async function copiarDatos() {
  console.log('\n📦  PASO 2 — Datos')
  console.log('─'.repeat(50))
  const src = makeClient(QA_HOST, QA_DB_PASS)
  const dst = makeClient(NEW_HOST, NEW_DB_PASS)
  await src.connect(); await dst.connect()

  await dst.query("SET session_replication_role = replica")

  const { rows: tablasExistentes } = await src.query(`
    SELECT table_schema || '.' || table_name AS t
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema IN ('public','prp')
    ORDER BY table_schema, table_name
  `)
  const existSet = new Set(tablasExistentes.map(r => r.t))

  // Columnas generadas en destino (para excluirlas)
  const { rows: genCols } = await dst.query(`
    SELECT table_schema || '.' || table_name AS t, column_name
    FROM information_schema.columns
    WHERE table_schema IN ('public','prp')
      AND is_generated = 'ALWAYS'
  `)
  const generadas = new Map()
  for (const r of genCols) {
    if (!generadas.has(r.t)) generadas.set(r.t, new Set())
    generadas.get(r.t).add(r.column_name)
  }

  let ok = 0, skip = 0, vacio = 0

  for (const tabla of TABLAS_ORDEN) {
    if (!existSet.has(tabla)) { skip++; continue }
    const [schema, name] = tabla.split('.')
    try {
      const { rows } = await src.query(`SELECT * FROM ${tabla}`)
      if (rows.length === 0) { vacio++; continue }

      await dst.query(`DELETE FROM ${tabla}`)   // DELETE respeta session_replication_role=replica (no dispara FK triggers)

      // Excluir columnas generadas del destino
      const excluir = generadas.get(tabla) || new Set()
      const cols = Object.keys(rows[0]).filter(c => !excluir.has(c))

      // También excluir columnas que no existen en destino
      const { rows: dstCols } = await dst.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`,
        [schema, name]
      )
      const dstColSet = new Set(dstCols.map(r => r.column_name))
      const colsFinal = cols.filter(c => dstColSet.has(c))

      // Insertar en lotes de 200 filas para evitar límite de parámetros
      const BATCH = 200
      for (let i = 0; i < rows.length; i += BATCH) {
        const lote = rows.slice(i, i + BATCH)
        const placeholders = lote.map((_, ri) =>
          '(' + colsFinal.map((_, ci) => `$${ri * colsFinal.length + ci + 1}`).join(',') + ')'
        ).join(',')
        const vals = lote.flatMap(r => colsFinal.map(c => r[c]))
        await dst.query(`INSERT INTO ${tabla} (${colsFinal.map(c=>`"${c}"`).join(',')}) VALUES ${placeholders}`, vals)
      }
      console.log(`  ✓ ${tabla.padEnd(45)} ${String(rows.length).padStart(5)} filas`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${tabla}: ${err.message.split('\n')[0]}`)
    }
  }

  // Reajustar secuencias
  await dst.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT schemaname, tablename, attname, seqname
        FROM (
          SELECT n.nspname AS schemaname, t.relname AS tablename, a.attname,
                 pg_get_serial_sequence(n.nspname||'.'||t.relname, a.attname) AS seqname
          FROM pg_attribute a
          JOIN pg_class t ON a.attrelid = t.oid
          JOIN pg_namespace n ON t.relnamespace = n.oid
          WHERE a.attnum > 0 AND NOT a.attisdropped
            AND n.nspname IN ('public','prp')
            AND pg_get_serial_sequence(n.nspname||'.'||t.relname, a.attname) IS NOT NULL
        ) s
      LOOP
        EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1))',
          r.seqname, r.attname, r.schemaname, r.tablename);
      END LOOP;
    END $$;
  `)

  await dst.query("SET session_replication_role = DEFAULT")
  await src.end(); await dst.end()
  console.log(`\n  ✅  ${ok} tablas copiadas · ${vacio} vacías · ${skip} no encontradas`)
}

// ── PASO 3: AUTH ──────────────────────────────────────────────────────────────
async function copiarAuth() {
  console.log('\n🔑  PASO 3 — Auth (usuarios)')
  console.log('─'.repeat(50))
  const src = makeClient(QA_HOST, QA_DB_PASS)
  const dst = makeClient(NEW_HOST, NEW_DB_PASS)
  await src.connect(); await dst.connect()

  // Copiar auth.users
  const { rows: users } = await src.query(`SELECT * FROM auth.users`)
  if (users.length === 0) { console.log('  ⚠️   No hay usuarios en QA'); await src.end(); await dst.end(); return }

  await dst.query('TRUNCATE auth.identities CASCADE')
  await dst.query('TRUNCATE auth.users CASCADE')

  // Columnas generadas en auth.users del destino
  const { rows: genAuthUsers } = await dst.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='auth' AND table_name='users' AND is_generated='ALWAYS'
  `)
  const genAuthSet = new Set(genAuthUsers.map(r => r.column_name))

  // Columnas existentes en destino auth.users
  const { rows: dstAuthCols } = await dst.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='auth' AND table_name='users'
  `)
  const dstAuthSet = new Set(dstAuthCols.map(r => r.column_name))

  let usersOk = 0
  for (const u of users) {
    const cols = Object.keys(u).filter(c => !genAuthSet.has(c) && dstAuthSet.has(c))
    const ph   = cols.map((_, i) => `$${i+1}`).join(',')
    try {
      await dst.query(
        `INSERT INTO auth.users (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`,
        cols.map(c => u[c])
      )
      usersOk++
    } catch (err) { console.error(`  ✗ usuario ${u.email}: ${err.message.split('\n')[0]}`) }
  }
  console.log(`  ✓ ${usersOk}/${users.length} usuarios copiados`)

  // Copiar auth.identities
  const { rows: idents } = await src.query(`SELECT * FROM auth.identities`)
  const { rows: genIdentCols } = await dst.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='auth' AND table_name='identities' AND is_generated='ALWAYS'
  `)
  const genIdentSet = new Set(genIdentCols.map(r => r.column_name))
  const { rows: dstIdentCols } = await dst.query(`
    SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='identities'
  `)
  const dstIdentSet = new Set(dstIdentCols.map(r => r.column_name))

  let identsOk = 0
  for (const id of idents) {
    const cols = Object.keys(id).filter(c => !genIdentSet.has(c) && dstIdentSet.has(c))
    const ph   = cols.map((_, i) => `$${i+1}`).join(',')
    try {
      await dst.query(
        `INSERT INTO auth.identities (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT DO NOTHING`,
        cols.map(c => id[c])
      )
      identsOk++
    } catch(err) { console.error(`  ✗ identity: ${err.message.split('\n')[0]}`) }
  }
  console.log(`  ✓ ${identsOk}/${idents.length} identidades copiadas`)

  await src.end(); await dst.end()
}

// ── PASO 4: GRANTS ────────────────────────────────────────────────────────────
async function otorgarGrants() {
  console.log('\n🔐  PASO 4 — Permisos API')
  console.log('─'.repeat(50))
  const db = makeClient(NEW_HOST, NEW_DB_PASS)
  await db.connect()

  const sql = `
    -- Esquemas
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA prp   TO anon, authenticated, service_role;

    -- Tablas public
    GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

    -- Tablas prp
    GRANT ALL ON ALL TABLES    IN SCHEMA prp TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA prp TO anon, authenticated, service_role;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA prp TO anon, authenticated, service_role;

    -- Defaults para objetos futuros
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA prp    GRANT ALL ON TABLES    TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA prp    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  `
  await db.query(sql)
  console.log('  ✅  Grants aplicados (anon, authenticated, service_role)')
  await db.end()
}

// ── PASO 5: STORAGE ───────────────────────────────────────────────────────────
async function copiarStorage() {
  if (!QA_SVC_KEY || !NEW_SVC_KEY) {
    console.log('\n⏭️   Storage: faltan service role keys, se omite')
    return
  }
  console.log('\n🗄️   PASO 5 — Storage')
  console.log('─'.repeat(50))

  const BUCKETS = [
    { id: 'logos-arrendatarios', public: true  },
    { id: 'avatars',             public: true  },
  ]

  for (const bucket of BUCKETS) {
    // Crear bucket en destino
    const cr = await fetch(`${NEW_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NEW_SVC_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bucket.id, name: bucket.id, public: bucket.public }),
    })
    const crBody = await cr.json()
    if (cr.ok || crBody.code === 'BucketAlreadyExists') {
      console.log(`  bucket ${bucket.id}: ${cr.ok ? 'creado' : 'ya existía'}`)
    } else {
      console.error(`  ✗ crear bucket ${bucket.id}: ${JSON.stringify(crBody)}`)
      continue
    }

    // Listar recursivamente todos los archivos del bucket
    async function listarArchivos(prefix) {
      const res = await fetch(`${QA_URL}/storage/v1/object/list/${bucket.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${QA_SVC_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1000, offset: 0, prefix }),
      })
      const items = await res.json()
      if (!Array.isArray(items)) return []
      const archivos = []
      for (const item of items) {
        if (!item.name) continue
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name
        if (item.id) {
          // es un archivo real (tiene id)
          archivos.push(fullPath)
        } else {
          // es una carpeta — recursar
          const sub = await listarArchivos(fullPath)
          archivos.push(...sub)
        }
      }
      return archivos
    }

    const archivos = await listarArchivos('')
    let ok = 0
    for (const path of archivos) {
      try {
        const dlRes = await fetch(`${QA_URL}/storage/v1/object/${bucket.id}/${path}`, {
          headers: { 'Authorization': `Bearer ${QA_SVC_KEY}` }
        })
        if (!dlRes.ok) { console.error(`  ✗ dl ${path}: ${dlRes.status}`); continue }
        const buf = Buffer.from(await dlRes.arrayBuffer())
        const ct  = dlRes.headers.get('content-type') || 'application/octet-stream'

        const upRes = await fetch(`${NEW_URL}/storage/v1/object/${bucket.id}/${path}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${NEW_SVC_KEY}`, 'Content-Type': ct, 'x-upsert': 'true' },
          body: buf,
        })
        if (!upRes.ok) { const t = await upRes.text(); console.error(`  ✗ up ${path}: ${t}`); continue }
        ok++
      } catch (err) { console.error(`  ✗ ${path}: ${err.message}`) }
    }
    console.log(`  ✅  ${bucket.id}: ${ok}/${archivos.length} archivos copiados`)
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
const PASOS = { schema: aplicarSchema, data: copiarDatos, auth: copiarAuth, grants: otorgarGrants, storage: copiarStorage }

console.log(`\n🚀  Clonando QA → hfyoqbtjujhwqyrhikla`)
console.log(`    Origen : ${QA_HOST}`)
console.log(`    Destino: ${NEW_HOST}`)

try {
  if (modo && PASOS[modo]) {
    await PASOS[modo]()
  } else if (!modo) {
    await aplicarSchema()
    await copiarDatos()
    await copiarAuth()
    await otorgarGrants()
    await copiarStorage()
  } else {
    console.error(`Modo desconocido: ${modo}. Opciones: schema | data | auth | grants | storage`)
    process.exit(1)
  }
} catch (err) {
  console.error('\n❌  Error fatal:', err.message)
  process.exit(1)
}

console.log('\n🏁  Clonación completada.')
