// Corre la misma lógica que cron-estac-mensual pero desde local.
// Uso: node scripts/actualizar-estac-er-mensual.mjs [mes] [anio]
// Ejemplo: node scripts/actualizar-estac-er-mensual.mjs 9 2026
// Sin argumentos: usa el mes/año actual de México.

import fs from 'fs'

// ── Leer .env.local ──────────────────────────────────────────────────────────
const env = {}
for (const line of fs.readFileSync('C:/Users/asus/OneDrive/work/IRPAPP/DEv/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim()
}
const SUPA_URL   = env.VITE_SUPABASE_URL
const SUPA_KEY   = env.SUPABASE_SERVICE_ROLE_KEY
const PARK_URL   = env.VITE_PARKING_URL
const PARK_KEY   = env.VITE_PARKING_ANON_KEY

if (!SUPA_URL || !SUPA_KEY) { console.error('Falta VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'); process.exit(1) }
if (!PARK_URL || !PARK_KEY) { console.error('Falta VITE_PARKING_URL o VITE_PARKING_ANON_KEY en .env.local');    process.exit(1) }

// ── Mes/año objetivo ─────────────────────────────────────────────────────────
let mes, anio
if (process.argv[2] && process.argv[3]) {
  mes  = parseInt(process.argv[2])
  anio = parseInt(process.argv[3])
} else {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
  mes  = ahora.getMonth() + 1
  anio = ahora.getFullYear()
}
const pad = n => String(n).padStart(2, '0')
const ini     = `${anio}-${pad(mes)}-01`
const lastDay = `${anio}-${pad(mes)}-${pad(new Date(anio, mes, 0).getDate())}`

console.log(`\n[actualizar-estac] Objetivo: ${mes}/${anio}  rango: ${ini} → ${lastDay}\n`)

// ── Verificar renglón en er_mensual ──────────────────────────────────────────
const chkRes = await fetch(
  `${SUPA_URL}/rest/v1/er_mensual?select=id,anio,mes,real_estac_mes,real_pension_mes&anio=eq.${anio}&mes=eq.${mes}`,
  { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
)
const filas = await chkRes.json()
if (!Array.isArray(filas) || filas.length === 0) {
  console.log(`No existe er_mensual para ${mes}/${anio}. Nada que actualizar.`)
  process.exit(0)
}
console.log(`er_mensual actual → real_estac_mes: $${filas[0].real_estac_mes || 0}  real_pension_mes: $${filas[0].real_pension_mes || 0}`)

// ── Sumar tickets del parking (paginado) ─────────────────────────────────────
let totalEstac = 0, offset = 0, paginas = 0
while (true) {
  const url = `${PARK_URL}/rest/v1/tickets?select=importe` +
    `&fecha_op=gte.${ini}&fecha_op=lte.${lastDay}` +
    `&estatus=in.(cobrado,perdido)` +
    `&limit=1000&offset=${offset}`
  const r = await fetch(url, { headers: { apikey: PARK_KEY, Authorization: `Bearer ${PARK_KEY}`, Prefer: 'count=none' } })
  const rows = await r.json()
  if (!Array.isArray(rows) || rows.length === 0) break
  totalEstac += rows.reduce((s, t) => s + (parseFloat(t.importe) || 0), 0)
  paginas++
  console.log(`  Página ${paginas}: ${rows.length} tickets, subtotal $${totalEstac.toFixed(2)}`)
  if (rows.length < 1000) break
  offset += 1000
}
console.log(`→ Total estacionamiento: $${totalEstac.toFixed(2)} (${offset + (paginas > 0 ? 0 : 0)} tickets aprox)\n`)

// ── Sumar pensiones del mes ───────────────────────────────────────────────────
const penUrl = `${PARK_URL}/rest/v1/pagos_pension?select=monto_pagado` +
  `&periodo_mes=eq.${mes}&periodo_año=eq.${anio}&estado=eq.validado`
const penRes  = await fetch(penUrl, { headers: { apikey: PARK_KEY, Authorization: `Bearer ${PARK_KEY}` } })
const pensiones = await penRes.json()
const totalPension = Array.isArray(pensiones)
  ? pensiones.reduce((s, r) => s + (parseFloat(r.monto_pagado) || 0), 0)
  : 0
console.log(`→ Total pensiones:       $${totalPension.toFixed(2)}\n`)

// ── Actualizar er_mensual ────────────────────────────────────────────────────
const updRes = await fetch(
  `${SUPA_URL}/rest/v1/er_mensual?anio=eq.${anio}&mes=eq.${mes}`,
  {
    method: 'PATCH',
    headers: {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify({ real_estac_mes: totalEstac, real_pension_mes: totalPension }),
  }
)
if (!updRes.ok) {
  const txt = await updRes.text()
  console.error(`Error al actualizar er_mensual (${updRes.status}):`, txt)
  process.exit(1)
}
const updated = await updRes.json()
const upd = updated[0]
console.log(`✓ er_mensual actualizado:`)
console.log(`  real_estac_mes:   $${upd?.real_estac_mes || totalEstac}`)
console.log(`  real_pension_mes: $${upd?.real_pension_mes || totalPension}`)
console.log(`  calc_real_total_estac:   $${upd?.calc_real_total_estac || '(recalculado por Postgres)'}`)
console.log(`  calc_real_total_pension: $${upd?.calc_real_total_pension || '(recalculado por Postgres)'}`)
console.log('\nListo.')
