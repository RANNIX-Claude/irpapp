// Agente Analitico IRP — Data Warehouse y metricas
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
    const { messages = [], data_summary = {} } = JSON.parse(event.body || '{}')

    const systemPrompt = `Eres el Agente Analitico de IRP (Inmueble Resource Planning), plataforma de administracion de inmuebles comerciales de RANNIX Consulting.

Tienes acceso al Data Warehouse del sistema con estas dimensiones:
- dw.dim_tiempo_dia / mes / trimestre / semestre / anio (rango 2020-2030)
- Dimensiones del negocio: inmuebles, unidades, arrendatarios, contratos, conceptos de pago

Metricas clave del sistema inmobiliario:
- Tasa de ocupacion: unidades rentadas / total de unidades
- Cartera vencida: rentas no cobradas despues de fecha limite
- % Morosidad: arrendatarios con mora / total arrendatarios
- NOI (Net Operating Income): ingresos totales - gastos operativos
- OER (Operating Expense Ratio): gastos / ingresos
- Rentabilidad por unidad: (renta - gastos directos) / renta
- Dias promedio de retraso en pago
- Tasa de renovacion de contratos
- Tiempo promedio de desocupacion

Por cada respuesta sigue este formato:
DATO: [numero o metrica exacta]
INTERPRETACION: [que significa para el negocio en 1-2 oraciones]
RECOMENDACION: [accion concreta que puede tomar el administrador]

Si no tienes datos especificos, usa los datos del resumen proporcionado o indica que se necesita conectar mas datos al DW.

Responde siempre en espanol. Se conciso y preciso.

Resumen de datos disponibles: ${JSON.stringify(data_summary, null, 2)}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
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
    console.error('chat-analitico error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del Agente Analitico', detail: error.message }),
    }
  }
}
