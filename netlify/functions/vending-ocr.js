// vending-ocr.js — OCR para reporte de inventario/ventas de vending
// Input:  { image_base64, media_type, productos: [{id, producto}] }
// Output: { ventas: [{producto_nombre, cantidad}], raw }

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { image_base64, media_type = 'image/jpeg', productos = [] } = JSON.parse(event.body || '{}')
    if (!image_base64) return { statusCode: 400, body: JSON.stringify({ error: 'Se requiere image_base64' }) }

    const listaProd = productos.map(p => `- ${p.producto}`).join('\n')

    const PROMPT = `Esta es una hoja de reporte de inventario/ventas de una máquina vending.
Extrae las unidades VENDIDAS por producto.

Catálogo de productos disponibles en el sistema:
${listaProd}

Instrucciones:
- La hoja puede mostrar inventario inicial y final — las ventas son la diferencia (ini - fin), o puede tener una columna de "vendidas" directamente
- Si hay cuentas escritas a mano (ej: "25+4+4+4=53"), el resultado (53) es el inventario final
- Devuelve SOLO un JSON con este formato exacto (sin markdown, sin explicaciones):
{
  "ventas": [
    { "producto": "nombre exacto del producto", "cantidad": número }
  ]
}
- Solo incluye productos con cantidad > 0
- Usa los nombres del catálogo de arriba (el más parecido)
- Si no puedes leer un producto, omítelo`

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
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type, data: image_base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: await res.text() }) }

    const data = await res.json()
    let text = data.content?.[0]?.text || '{}'
    // Limpiar markdown
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(text)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ventas: parsed.ventas || [], raw: text }),
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
