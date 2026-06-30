// Agente Operativo IRP — proxy seguro para Claude API
// ANTHROPIC_API_KEY configurada en Netlify Environment Variables

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo no permitido' }) }

  try {
    const { messages = [], context = '' } = JSON.parse(event.body || '{}')

    const systemPrompt = `Eres el Agente Operativo de IRP (Inmueble Resource Planning), la plataforma SaaS de RANNIX Consulting para administracion integral de inmuebles comerciales en Mexico.

Tu rol: ayudar a los administradores de inmuebles (plazas comerciales, edificios de oficinas, consultorios, bodegas) a gestionar su operacion diaria.

Puedes ayudar con:
- Gestion de inmuebles y unidades (locales, oficinas, consultorios, naves)
- Contratos de arrendamiento: creacion, renovacion, addendas, cancelacion
- Cobranza: generacion de cargos, recordatorios, conciliacion bancaria
- CFDI 4.0 y REP (Complemento de Pago) — facturacion fiscal mexicana
- Arrendatarios: expedientes, documentos, portal de acceso
- Prospectos: flujo de solicitud, revision de documentos, aprobacion
- Mantenimiento: ordenes de trabajo, areas comunes, proyectos
- RH y Nomina: empleados, asistencia, nomina quincenal
- Estacionamiento: cajones, tickets, ingresos
- Proveedores: directorio, ordenes de compra
- KPIs y reportes: ocupacion, cartera vencida, ingresos vs gastos

Reglas:
- Responde siempre en espanol, de forma clara y profesional
- Da respuestas practicas y orientadas al negocio inmobiliario mexicano
- Cuando aplique, menciona la normativa SAT, IMSS, LFT o LFPDPPP relevante
- Contexto adicional: ${context}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Error en Claude API')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: data.content[0].text }),
    }
  } catch (error) {
    console.error('chat-operativo error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del Agente Operativo', detail: error.message }),
    }
  }
}
