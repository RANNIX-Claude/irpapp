// netlify/functions/generar-cargos-mes.js
// Scheduled Function — corre el día 1 de cada mes a las 06:00 hora México
// Schedule UTC: "0 12 1 * *"  = 6am CST / 7am CDT

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

export const config = { schedule: '0 12 1 * *' }

export const handler = async () => {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { realtime: { transport: ws } }
    )

    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
    const mes  = ahora.getMonth() + 1
    const anio = ahora.getFullYear()

    const { data, error } = await supabase.rpc('fn_generar_cargos_mes', { p_mes: mes, p_anio: anio })
    if (error) throw error

    const r = data?.[0] || { cargos_creados: 0, contratos_procesados: 0 }
    console.log(`[generar-cargos-mes] ${mes}/${anio} — ${r.cargos_creados} cargos / ${r.contratos_procesados} contratos`)

    return { statusCode: 200, body: JSON.stringify({ ok: true, mes, anio, ...r }) }
  } catch (err) {
    console.error('[generar-cargos-mes] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
