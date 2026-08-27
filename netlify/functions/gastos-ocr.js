// gastos-ocr.js — extrae datos de ticket con Claude Vision o texto libre
// Output: { proveedor:{...}, ticket:{...}, lineas:[...] }

const JSON_FORMAT = `{
  "proveedor": {
    "nombre_comercial": "nombre visible del establecimiento",
    "razon_social": "razón social si aparece, si no null",
    "rfc": "RFC si aparece, si no null",
    "regimen_fiscal": "clave o descripción si aparece, si no null",
    "domicilio_fiscal": "dirección de la empresa si aparece, si no null",
    "domicilio_sucursal": "dirección de la sucursal si difiere, si no null",
    "nombre_sucursal": "nombre o número de sucursal si aparece, si no null"
  },
  "ticket": {
    "fecha": "YYYY-MM-DD o null",
    "hora": "HH:MM:SS o null",
    "folio": "folio, número de ticket, terminal, operador — todo en un string, o null",
    "cajero": "nombre del cajero si aparece, si no null",
    "subtotal": número o null,
    "descuentos": número (positivo) o 0 si no hay,
    "iva_base": número o null,
    "iva_monto": número o null,
    "ieps_base": número o null,
    "ieps_monto": número o null,
    "total": número o null,
    "forma_pago": "Efectivo | Tarjeta | Mixto | otro, o null",
    "efectivo": número o null,
    "cambio": número o null,
    "articulos_count": número total de artículos o null,
    "validacion": "ok si subtotal-descuentos+impuestos coincide con total, o discrepancia:[detalle]"
  },
  "lineas": [
    {
      "sku": "código del producto o null",
      "descripcion": "nombre del artículo",
      "cantidad": número,
      "precio_unit": número,
      "subtotal_linea": número o null,
      "tasa_impuesto": "letra o código que aparezca junto al precio (A/B/C/etc.) o null"
    }
  ]
}`

const PROMPT_IMAGEN = `Analiza este ticket/nota de compra y extrae los datos en JSON con EXACTAMENTE este formato:
${JSON_FORMAT}

Reglas:
- Extrae TODOS los datos que aparezcan en el ticket — proveedor, ticket financiero y artículos
- Para Sam's Club: cada línea comienza con código numérico → sku; "2 X $270.07" → cantidad=2, precio_unit=270.07
- Las letras junto al precio (A, B, C) indican tasa de impuesto — extráelas en "tasa_impuesto"
- El "total" es el campo TOTAL final (después de descuentos), NO el subtotal
- Valida: si subtotal - descuentos + IVA + IEPS ≈ total → validacion="ok"; si no → "discrepancia:[diferencia]"
- Si un campo no es legible, usa null — NUNCA inventes datos
- Para Novemedic dentro de Sam's: el proveedor es Novemedic, no Sam's Club
- Responde SOLO el JSON, sin markdown ni explicaciones`

const PROMPT_TEXTO = (texto) => `A partir del siguiente texto extrae los datos de la compra en JSON con EXACTAMENTE este formato:
${JSON_FORMAT}

- Extrae todo lo que puedas identificar del texto
- Si no hay dato, usa null
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
        max_tokens: 2048,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { statusCode: 502, body: JSON.stringify({ error: err }) }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || '{}'

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proveedor: null, ticket: null, lineas: [], raw: text }),
    }
    const parsed = JSON.parse(match[0])

    // Backward compat: si el modelo devuelve la forma antigua, normalizar
    if (!parsed.ticket && parsed.total !== undefined) {
      parsed.ticket = { total: parsed.total, fecha: parsed.fecha }
    }
    if (!parsed.proveedor && parsed.proveedor !== null) {
      parsed.proveedor = { nombre_comercial: parsed.proveedor || null }
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
