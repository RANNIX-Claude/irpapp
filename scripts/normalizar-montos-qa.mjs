/**
 * normalizar-montos-qa.mjs
 * Normaliza los montos en QA para facilitar pruebas de suma:
 *   - contratos.renta_mensual       → $10,000
 *   - contratos.deposito_garantia   → $20,000 (2 meses)
 *   - cargos_programados.monto      → $10,000 (los ya existentes)
 *   - gastos_operativos.monto       → $100
 *
 * Uso: node scripts/normalizar-montos-qa.mjs
 */

import fs from 'fs'
import pg from 'pg'

const envText = fs.readFileSync('C:\\Users\\asus\\OneDrive\\work\\IRPAPP\\DEv\\.env.local', 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const db = new pg.Client({
  host:     'db.wijcjdbmdbxzmwpdxoal.supabase.co',
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: env.QA_SUPABASE_DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
})

await db.connect()

// ── 1. contratos ────────────────────────────────────────────────────────────
const { rowCount: rc1 } = await db.query(`
  UPDATE public.contratos
  SET    renta_mensual     = 10000,
         deposito_garantia = 20000
  WHERE  estatus NOT IN ('CANCELADO','RESCISION')
`)
console.log(`contratos actualizados          : ${rc1}`)

// ── 2. cargos_programados (columna: importe) ────────────────────────────────
const { rowCount: rc2 } = await db.query(`
  UPDATE public.cargos_programados
  SET    importe = 10000
  WHERE  concepto ILIKE '%renta%'
     OR  concepto ILIKE '%mensualidad%'
     OR  concepto ILIKE '%cargo%'
`)
console.log(`cargos_programados actualizados  : ${rc2}`)

// ── 3. gastos_operativos (columnas: ticket_total, monto_pagado) ─────────────
const { rowCount: rc3 } = await db.query(`
  UPDATE public.gastos_operativos
  SET    ticket_total     = 100,
         monto_pagado     = 100,
         monto_comprobante = 100
`)
console.log(`gastos_operativos actualizados   : ${rc3}`)

// ── 4. resumen de verificación ──────────────────────────────────────────────
const { rows: resumen } = await db.query(`
  SELECT
    (SELECT COUNT(*) FROM public.contratos WHERE estatus NOT IN ('CANCELADO','RESCISION'))                AS contratos_activos,
    (SELECT SUM(renta_mensual) FROM public.contratos WHERE estatus NOT IN ('CANCELADO','RESCISION'))      AS suma_rentas,
    (SELECT COUNT(*) FROM public.cargos_programados WHERE importe = 10000)                                AS cargos_en_10k,
    (SELECT COUNT(*) FROM public.gastos_operativos)                                                       AS total_tickets,
    (SELECT SUM(ticket_total) FROM public.gastos_operativos)                                              AS suma_tickets
`)
const r = resumen[0]
console.log('\n── Verificación ────────────────────────────────────────────')
console.log(`Contratos activos           : ${r.contratos_activos}`)
console.log(`Suma rentas mensuales       : $${Number(r.suma_rentas).toLocaleString('es-MX')}`)
console.log(`  → esperado: ${r.contratos_activos} × $10,000 = $${(r.contratos_activos * 10000).toLocaleString('es-MX')}`)
console.log(`Cargos programados a $10k   : ${r.cargos_en_10k}`)
console.log(`Total tickets de gasto      : ${r.total_tickets}`)
console.log(`Suma tickets                : $${Number(r.suma_tickets).toLocaleString('es-MX')}`)
console.log(`  → esperado: ${r.total_tickets} × $100 = $${(Number(r.total_tickets) * 100).toLocaleString('es-MX')}`)

await db.end()
