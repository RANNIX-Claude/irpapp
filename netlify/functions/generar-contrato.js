const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  let body
  try { body = JSON.parse(event.body) } catch { return { statusCode: 400, body: 'Invalid JSON' } }

  const { tipo, arrendatario, unidad, condiciones } = body

  if (!tipo || !arrendatario || !unidad) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos obligatorios' }) }
  }

  const prompt = `Eres un experto en derecho inmobiliario mexicano especializado en contratos de arrendamiento comercial.

Genera un contrato de arrendamiento ${tipo} completo y profesional en español con los siguientes datos:

**ARRENDATARIO:**
- Nombre/Razón Social: ${arrendatario.nombre}
- RFC: ${arrendatario.rfc || 'Por definir'}
- Domicilio: ${arrendatario.domicilio || 'Por definir'}
- Teléfono: ${arrendatario.telefono || ''}
- Tipo de persona: ${arrendatario.tipo_persona || 'FISICA'}

**INMUEBLE:**
- Nombre del inmueble: ${unidad.inmueble_nombre}
- Local/Unidad: ${unidad.numero_local}
- Tipo: ${unidad.tipo_unidad || 'Local comercial'}
- Superficie: ${unidad.metros_cuadrados || 'Por definir'} m²
- Giro autorizado: ${condiciones?.giro || 'Comercio en general'}

**CONDICIONES ECONÓMICAS:**
- Renta mensual: $${condiciones?.renta_mensual?.toLocaleString('es-MX') || 'Por definir'} MXN
- Depósito en garantía: $${condiciones?.deposito || (condiciones?.renta_mensual * 2)?.toLocaleString('es-MX') || 'Por definir'} MXN (2 meses)
- Cuota de mantenimiento: $${condiciones?.cuota_mant?.toLocaleString('es-MX') || '0'} MXN mensual
- Día límite de pago: ${condiciones?.dia_limite || '5'} de cada mes
- Penalización por mora: ${condiciones?.mora_pct || '5'}% mensual
- Cuenta BBVA: ${condiciones?.cuenta_banco || 'Por definir'}
- CLABE: ${condiciones?.clabe || 'Por definir'}

**VIGENCIA:**
- Fecha de inicio: ${condiciones?.fecha_inicio || 'Por definir'}
- Fecha de vencimiento: ${condiciones?.fecha_fin || 'Por definir'}
- Tipo de contrato: ${tipo}
- Cancelación anticipada: ${condiciones?.cancelacion_anticipada || '2'} meses de aviso

**FIADOR (si aplica):**
- Nombre: ${condiciones?.fiador_nombre || 'No aplica'}
- RFC: ${condiciones?.fiador_rfc || ''}

El contrato debe incluir:
1. Encabezado con ciudad, fecha y partes
2. Antecedentes y declaraciones
3. Objeto del contrato
4. Vigencia y renovación
5. Precio y forma de pago (con referencia de pago CP-YYYY-MM-LXX)
6. Depósito en garantía
7. Uso del inmueble y giro autorizado
8. Obligaciones del arrendatario
9. Obligaciones del arrendador
10. Causas de rescisión
11. Fiador y obligado solidario (si aplica)
12. Disposiciones generales (fuero de Metepec, Edo. de México)
13. Firmas

Formato: Markdown con encabezados ##, texto justificado, artículos numerados. Usa lenguaje formal mexicano.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const texto = response.content[0].text

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ contrato: texto, tokens: response.usage })
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    }
  }
}
