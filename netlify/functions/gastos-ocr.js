// gastos-ocr.js — extrae datos de ticket con Claude Vision o texto libre
// Input: { image_base64, media_type } | { texto_libre }
// Output: { total, proveedor, lineas: [{descripcion, cantidad, precio_unit, codigo_proveedor}] }

const JSON_FORMAT = `{
  "proveedor": "nombre del establecimiento",
  "fecha": "YYYY-MM-DD o null si no se ve",
  "total": número con centavos (ej: 3387.00),
  "lineas": [
    {
      "codigo_proveedor": "código numérico del producto o null",
      "descripcion": "nombre del producto",
      "cantidad": número,
      "precio_unit": número
    }
  ]
}`

const PROMPT_IMAGEN = `Analiza este ticket/nota de compra y extrae los datos en JSON con exactamente este formato:
${JSON_FORMAT}

Reglas especiales para tickets de Sam's Club y similares:
- Cada línea comienza con un código numérico (ej: 332944, 980025248) seguido del nombre del producto — extrae ese código en "codigo_proveedor"
- Si la línea tiene "2 X $270.07" significa cantidad=2 y precio_unit=270.07
- El total es el campo TOTAL del ticket (después de descuentos), NO el subtotal
- Si un campo no es legible, usa null
- cantidad por defecto es 1 si no se especifica
- precio_unit es el precio por unidad (no el subtotal de la línea)
- Ignora líneas de descuento, IVA, IEPS, subtotal — solo productos
- Responde SOLO el JSON, sin markdown ni explicaciones`

const PROMPT_TEXTO = (texto) => `A partir del siguiente texto (puede ser una descripción de compra, lista de productos, mensaje de WhatsApp, etc.)
extrae los datos de la compra en JSON con exactamente este formato:
${JSON_FORMAT}

- Si el texto menciona un nombre de tienda, ponlo en "proveedor"
- Si menciona una fecha, ponla en "fecha" formato YYYY-MM-DD
- Si menciona un total, ponlo en "total"
- Extrae cada artículo como una línea con descripcion, cantidad y precio_unit
- Si no hay precio individual pero sí total, puedes aproximarlo dividiendo
- Responde SOLO el JSON, sin markdown ni explicaciones

TEXTO:
${texto}`

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const body = JSON.parse(event.body || '{}')
    const { image_base64, media_type = 'image/jpeg', texto_libre } = body

    if (!image_base64 && !texto_libre) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Se requiere image_base64 o texto_libre' }) }
    }

    let messageContent
    if (texto_libre) {
      messageContent = [{ type: 'text', text: PROMPT_TEXTO(texto_libre) }]
    } else {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
        { type: 'text', text: PROMPT_IMAGEN },
      ]
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { statusCode: 502, body: JSON.stringify({ error: err }) }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'

    // Limpiar posible markdown wrapper
    const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
