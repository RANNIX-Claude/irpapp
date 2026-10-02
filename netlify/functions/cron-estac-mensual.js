// netlify/functions/cron-estac-mensual.js
// Scheduled Function — actualiza er_mensual.real_estac_mes y real_pension_mes
// usando hora_salida_at de la base de tickets de estacionamiento.
// Corre diariamente a las 02:00 hora México (08:00 UTC invierno / 07:00 UTC verano)
// Schedule conservador (CST): "0 8 * * *"

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

export const config = { schedule: '0 8 * * *' }

export const handler = async () => {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { realtime: { transport: ws } }
    )
    const parking = createClient(
      process.env.VITE_PARKING_URL,
      process.env.VITE_PARKING_ANON_KEY,
      { auth: { persistSession: false } }
    )

    // Mes actual en horario México
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
    const anio = ahora.getFullYear()
    const mes  = ahora.getMonth() + 1

    // Rango del mes: [ini, finExcl) con lt para capturar todos los milisegundos
    const pad = n => String(n).padStart(2, '0')
    const ini = `${anio}-${pad(mes)}-01`
    const nextMes  = mes === 12 ? 1 : mes + 1
    const nextAnio = mes === 12 ? anio + 1 : anio
    const finExcl  = `${nextAnio}-${pad(nextMes)}-01`

    // ── Verificar que existe el renglón en er_mensual (no crea meses nuevos) ──
    const { data: fila } = await supabase
      .from('er_mensual').select('id').eq('anio', anio).eq('mes', mes).maybeSingle()
    if (!fila) {
      console.log(`[cron-estac-mensual] Sin renglón er_mensual ${mes}/${anio} — skip`)
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) }
    }

    // ── Estacionamiento: tickets cobrados/perdidos con hora_salida_at en el mes ──
    let totalEstac = 0, offset = 0
    while (true) {
      const { data, error } = await parking
        .from('tickets').select('importe')
        .gte('hora_salida_at', ini).lt('hora_salida_at', finExcl)
        .not('hora_salida_at', 'is', null)
        .in('estatus', ['cobrado', 'perdido'])
        .range(offset, offset + 999)
      if (error) { console.error('[cron-estac-mensual] tickets:', error.message); break }
      if (!data || data.length === 0) break
      totalEstac += data.reduce((s, r) => s + (parseFloat(r.importe) || 0), 0)
      if (data.length < 1000) break
      offset += 1000
    }

    // ── Pensiones: pagos validados cuyo periodo cae en el mes ──────────────────
    const { data: pensiones, error: errPension } = await parking
      .from('pagos_pension').select('monto_pagado')
      .eq('periodo_mes', mes).eq('periodo_año', anio).eq('estado', 'validado')
    if (errPension) throw errPension
    const totalPension = (pensiones || []).reduce((s, r) => s + (parseFloat(r.monto_pagado) || 0), 0)

    // ── Actualizar er_mensual (Postgres recalcula calc_* al instante) ──────────
    const { error: errUpd } = await supabase
      .from('er_mensual')
      .update({ real_estac_mes: totalEstac, real_pension_mes: totalPension })
      .eq('anio', anio).eq('mes', mes)
    if (errUpd) throw errUpd

    console.log(
      `[cron-estac-mensual] ${mes}/${anio} — ` +
      `estac $${totalEstac.toFixed(2)} (${offset > 0 ? offset + '+' : ''}tickets) | ` +
      `pension $${totalPension.toFixed(2)}`
    )
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, anio, mes, totalEstac, totalPension }),
    }
  } catch (err) {
    console.error('[cron-estac-mensual] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
