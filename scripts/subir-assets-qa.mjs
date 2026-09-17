/**
 * subir-assets-qa.mjs
 * Genera logos SVG para los 22 arrendatarios y fotos reales para los 8 empleados
 * y los sube a Supabase Storage QA.
 *
 * Requiere en .env.local:
 *   QA_SUPABASE_URL=https://wijcjdbmdbxzmwpdxoal.supabase.co
 *   QA_SUPABASE_DB_PASSWORD=...
 *   QA_SUPABASE_SERVICE_ROLE_KEY=...   ← copiar de Netlify irpapp-qa → Env vars
 *
 * Uso:
 *   node scripts/subir-assets-qa.mjs logos      # solo logos de arrendatarios
 *   node scripts/subir-assets-qa.mjs fotos      # solo fotos de empleados
 *   node scripts/subir-assets-qa.mjs            # ambos
 */

import pg from 'pg'
import { readFileSync } from 'fs'

// ── leer .env.local (misma técnica que los demás scripts del proyecto) ────────
const envText = readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local', 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

// ── configuración ─────────────────────────────────────────────────────────────

const QA_URL      = env.QA_SUPABASE_URL      || 'https://wijcjdbmdbxzmwpdxoal.supabase.co'
const QA_DB_PASS  = env.QA_SUPABASE_DB_PASSWORD
const QA_SVC_KEY  = env.QA_SUPABASE_SERVICE_ROLE_KEY

if (!QA_DB_PASS)  { console.error('❌  Falta QA_SUPABASE_DB_PASSWORD en .env.local'); process.exit(1) }
if (!QA_SVC_KEY)  {
  console.error('❌  Falta QA_SUPABASE_SERVICE_ROLE_KEY en .env.local')
  console.error('   Consíguela en Netlify → irpapp-qa → Site configuration → Env variables')
  process.exit(1)
}

const STORAGE_BASE = `${QA_URL}/storage/v1/object`

const db = new pg.Client({
  host: 'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: QA_DB_PASS,
  ssl: { rejectUnauthorized: false },
})
await db.connect()

// ── helpers generales ─────────────────────────────────────────────────────────

async function uploadBuffer(bucket, filePath, buffer, contentType) {
  const url = `${STORAGE_BASE}/${bucket}/${filePath}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QA_SVC_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Storage upload ${filePath}: ${res.status} ${txt}`)
  }
  return `${QA_URL}/storage/v1/object/public/${bucket}/${filePath}`
}

// ── 1. LOGOS SVG PARA ARRENDATARIOS ──────────────────────────────────────────

// 8 plantillas (misma paleta que el preview)
const TEMPLATES = [
  // 0 — Azul médico / Cruz
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1B6DBF"/><stop offset="100%" stop-color="#0C3A70"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <ellipse cx="100" cy="90" rx="60" ry="38" transform="rotate(-20 100 90)" fill="rgba(255,255,255,.1)"/>
    <rect x="94" y="127" width="112" height="46" rx="22" fill="rgba(255,255,255,.94)"/>
    <rect x="127" y="94" width="46" height="112" rx="22" fill="rgba(255,255,255,.94)"/>
    <circle cx="150" cy="150" r="16" fill="rgba(10,50,100,.5)"/>
    <circle cx="150" cy="150" r="10" fill="rgba(255,255,255,.9)"/>`,

  // 1 — Naranja / Hexágono + flecha
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#E06010"/><stop offset="100%" stop-color="#8C3A06"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <polygon points="150,40 248,95 248,205 150,260 52,205 52,95" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="14"/>
    <polygon points="150,72 222,113 222,187 150,228 78,187 78,113" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="6"/>
    <polygon points="132,215 132,170 112,170 150,110 188,170 168,170 168,215" fill="rgba(255,255,255,.93)"/>
    <ellipse cx="100" cy="88" rx="55" ry="34" transform="rotate(-20 100 88)" fill="rgba(255,255,255,.1)"/>`,

  // 2 — Rojo / Arco (portal)
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#B82A1A"/><stop offset="100%" stop-color="#6E1610"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <path d="M75,220 L75,148 A75,75 0 0,1 225,148 L225,220" fill="none" stroke="rgba(255,255,255,.92)" stroke-width="10" stroke-linecap="round"/>
    <path d="M100,220 L100,162 A50,50 0 0,1 200,162 L200,220" fill="none" stroke="#F0A030" stroke-width="5" stroke-linecap="round"/>
    <circle cx="122" cy="234" r="7" fill="#F0A030"/>
    <circle cx="150" cy="238" r="7" fill="#F0A030"/>
    <circle cx="178" cy="234" r="7" fill="#F0A030"/>
    <ellipse cx="100" cy="88" rx="58" ry="34" transform="rotate(-18 100 88)" fill="rgba(255,255,255,.08)"/>`,

  // 3 — Negro / V rosa
  (nombre, letra) => `
    <rect width="300" height="300" fill="#0C0C18"/>
    <circle cx="150" cy="180" r="130" fill="rgba(233,64,96,.1)"/>
    <line x1="40" y1="70" x2="260" y2="70" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/>
    <polyline points="85,100 150,215 215,100" fill="none" stroke="#E94060" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline points="85,100 150,215 215,100" fill="none" stroke="rgba(233,64,96,.22)" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="150" cy="215" r="8" fill="#E94060"/>
    <line x1="40" y1="230" x2="260" y2="230" stroke="rgba(255,255,255,.1)" stroke-width="1.5"/>`,

  // 4 — Verde / Cruz de pétalos
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#1E8A48"/><stop offset="100%" stop-color="#0B4A26"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <circle cx="150" cy="150" r="118" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/>
    <ellipse cx="150" cy="95"  rx="28" ry="46" fill="rgba(255,255,255,.92)"/>
    <ellipse cx="205" cy="150" rx="46" ry="28" fill="rgba(255,255,255,.80)"/>
    <ellipse cx="150" cy="205" rx="28" ry="46" fill="rgba(255,255,255,.92)"/>
    <ellipse cx="95"  cy="150" rx="46" ry="28" fill="rgba(255,255,255,.80)"/>
    <circle cx="150" cy="150" r="26" fill="rgba(255,255,255,.96)"/>
    <circle cx="150" cy="150" r="14" fill="#1E8A48"/>
    <ellipse cx="100" cy="88" rx="58" ry="34" transform="rotate(-20 100 88)" fill="rgba(255,255,255,.1)"/>`,

  // 5 — Violeta / Luna + estrella
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#6A32A0"/><stop offset="100%" stop-color="#2E1050"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <circle cx="150" cy="150" r="114" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="2"/>
    <circle cx="138" cy="140" r="80" fill="rgba(255,255,255,.93)"/>
    <circle cx="170" cy="128" r="66" fill="#6A32A0"/>
    <circle cx="162" cy="122" r="58" fill="url(#g)"/>
    <polygon points="210,188 218,212 244,212 224,227 231,251 210,236 189,251 196,227 176,212 202,212" fill="#F2C040"/>
    <ellipse cx="100" cy="88" rx="56" ry="32" transform="rotate(-22 100 88)" fill="rgba(255,255,255,.1)"/>`,

  // 6 — Navy + cian / Dos círculos (lente)
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0E3255"/><stop offset="100%" stop-color="#1060A0"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <ellipse cx="100" cy="88" rx="58" ry="34" transform="rotate(-20 100 88)" fill="rgba(255,255,255,.12)"/>
    <circle cx="131" cy="150" r="68" fill="rgba(28,95,160,.88)"/>
    <circle cx="169" cy="150" r="68" fill="rgba(58,168,216,.88)"/>
    <circle cx="150" cy="132" r="40" fill="rgba(100,200,255,.2)"/>
    <circle cx="150" cy="150" r="20" fill="rgba(255,255,255,.96)"/>
    <circle cx="150" cy="150" r="11" fill="#0E3255"/>
    <circle cx="144" cy="144" r="4"  fill="rgba(255,255,255,.6)"/>`,

  // 7 — Oscuro dorado / Monograma
  (nombre, letra) => `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#2A2010"/><stop offset="100%" stop-color="#0E0A04"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <circle cx="150" cy="150" r="118" fill="none" stroke="rgba(212,168,50,.25)" stroke-width="2"/>
    <circle cx="150" cy="150" r="100" fill="none" stroke="rgba(212,168,50,.12)" stroke-width="1"/>
    <text x="150" y="178" text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif"
          font-size="110" font-weight="800" fill="none"
          stroke="rgba(212,168,50,.85)" stroke-width="3">${letra}</text>
    <ellipse cx="100" cy="88" rx="55" ry="32" transform="rotate(-20 100 88)" fill="rgba(212,168,50,.08)"/>`,
]

function generarSVG(nombre, index) {
  const letra = nombre.trim()[0].toUpperCase()
  const tpl = TEMPLATES[index % TEMPLATES.length]
  return `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">${tpl(nombre, letra)}</svg>`
}

async function subirLogos() {
  console.log('\n🏪  LOGOS DE ARRENDATARIOS')
  console.log('─'.repeat(50))

  const { rows } = await db.query(`
    SELECT id, nombre_negocio AS nombre
    FROM public.arrendatarios
    ORDER BY id
  `)

  if (rows.length === 0) {
    console.log('⚠️   No se encontraron arrendatarios en QA')
    return
  }

  let ok = 0
  for (let i = 0; i < rows.length; i++) {
    const { id, nombre } = rows[i]
    try {
      const svg = generarSVG(nombre, i)
      const buf = Buffer.from(svg, 'utf8')
      const path = `qa/${id}.svg`
      const url  = await uploadBuffer('logos-arrendatarios', path, buf, 'image/svg+xml')
      await db.query('UPDATE public.arrendatarios SET logo_url = $1 WHERE id = $2', [url, id])
      console.log(`  ✓ [${String(i+1).padStart(2)}] ${nombre.padEnd(35)} → ${path}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${nombre}: ${err.message}`)
    }
  }
  console.log(`\n  ✅  ${ok}/${rows.length} logos subidos`)
}

// ── 2. FOTOS REALES DE EMPLEADOS (randomuser.me) ──────────────────────────────

async function subirFotos() {
  console.log('\n👤  FOTOS DE EMPLEADOS')
  console.log('─'.repeat(50))

  // Leer empleados (con sexo para asignar género en la foto)
  const { rows: emps } = await db.query(`
    SELECT id, nombre || ' ' || apellido_pat AS nombre_completo, sexo
    FROM rh_empleados
    ORDER BY id
  `)

  if (emps.length === 0) { console.log('⚠️   No se encontraron empleados en QA'); return }

  const hombres = emps.filter(e => !['F','FEMENINO','MUJER'].includes(String(e.sexo).toUpperCase()))
  const mujeres = emps.filter(e =>  ['F','FEMENINO','MUJER'].includes(String(e.sexo).toUpperCase()))

  console.log(`  ${emps.length} empleados (${hombres.length} H · ${mujeres.length} M)`)
  console.log('  Descargando fotos de randomuser.me …')

  // Pedir a randomuser.me fotos por género (nat=mx para rasgos latinoamericanos)
  async function fetchPhotos(gender, count) {
    if (count === 0) return []
    const url = `https://randomuser.me/api/?results=${count}&gender=${gender}&nat=mx&inc=login,picture`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`randomuser.me error: ${res.status}`)
    const json = await res.json()
    return json.results.map(r => ({ photo: r.picture.large, uuid: r.login.uuid }))
  }

  const fotosH = await fetchPhotos('male',   hombres.length)
  const fotosM = await fetchPhotos('female',  mujeres.length)

  // Distribuir fotos
  const fotoMap = new Map()
  hombres.forEach((e, i) => fotoMap.set(e.id, fotosH[i]))
  mujeres.forEach((e, i) => fotoMap.set(e.id, fotosM[i]))

  let ok = 0
  for (const emp of emps) {
    const entry = fotoMap.get(emp.id)
    if (!entry) { console.log(`  ⚠️  Sin foto para ${emp.nombre_completo}`); continue }
    try {
      // Descargar imagen
      const imgRes = await fetch(entry.photo)
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
      const buf = Buffer.from(await imgRes.arrayBuffer())

      const path = `empleados/${emp.id}.jpg`
      const url  = await uploadBuffer('avatars', path, buf, 'image/jpeg')
      await db.query('UPDATE rh_empleados SET foto_url = $1 WHERE id = $2', [url, emp.id])
      const genero = ['F','FEMENINO','MUJER'].includes(String(emp.sexo).toUpperCase()) ? '♀' : '♂'
      console.log(`  ✓ ${genero} ${emp.nombre_completo.padEnd(30)} → empleados/${emp.id}.jpg`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${emp.nombre_completo}: ${err.message}`)
    }
  }
  console.log(`\n  ✅  ${ok}/${emps.length} fotos subidas`)
}

// ── main ──────────────────────────────────────────────────────────────────────

const modo = process.argv[2] // 'logos' | 'fotos' | undefined (ambos)

try {
  if (!modo || modo === 'logos') await subirLogos()
  if (!modo || modo === 'fotos') await subirFotos()
} finally {
  await db.end()
}
console.log('\n🏁  Listo.')
