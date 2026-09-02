// netlify/functions/generar-sanciones.js
// Scheduled function — corre cada noche a las 23:55 MX time
// Schedule: "55 5 * * *" (UTC equivale a 23:55 CST)

const { createClient } = require('@supabase/supabase-js')

const schedule = "55 5 * * *"

exports.handler = async (event) => {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { data, error } = await supabase.rpc('fn_generar_sanciones', {
      p_pct_default: 0.10
    })

    if (error) throw error

    const resultado = data?.[0] || { sanciones_creadas: 0 }
    console.log(`[generar-sanciones] Sanciones generadas: ${resultado.sanciones_creadas}`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        sanciones_creadas: resultado.sanciones_creadas,
        fecha: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('[generar-sanciones] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    }
  }
}
