// extraer-documento.js — OCR con IA para documentos de prospectos
// Recibe: { url, tipo_doc } → devuelve campos extraídos del documento
// ANTHROPIC_API_KEY solo en Netlify Environment Variables

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

const PROMPTS = {
  INE_FRENTE: `Extrae del frente de esta INE (Credencial para Votar) los siguientes datos en JSON exacto:
{
  "nombre_completo": "...",
  "curp": "...",
  "fecha_nacimiento": "YYYY-MM-DD o null",
  "sexo": "H o M o null",
  "domicilio_ine": "...",
  "colonia_ine": "...",
  "municipio_ine": "...",
  "estado_ine": "...",
  "cp_ine": "...",
  "clave_elector": "...",
  "vigencia": "año de vigencia o null"
}
Si no puedes leer algún campo con certeza escribe null. Responde ÚNICAMENTE el JSON, sin texto adicional.`,

  INE_REVERSO: `Extrae del reverso de esta INE los siguientes datos en JSON exacto:
{
  "curp": "...",
  "anio_registro": "...",
  "seccion": "...",
  "municipio_registro": "...",
  "estado_registro": "..."
}
Si no puedes leer algún campo con certeza escribe null. Responde ÚNICAMENTE el JSON, sin texto adicional.`,

  COMPROBANTE_DOMICILIO: `Extrae de este comprobante de domicilio los datos en JSON exacto:
{
  "nombre_titular": "...",
  "calle": "...",
  "no_ext": "...",
  "no_int": "...",
  "colonia": "...",
  "municipio": "...",
  "estado": "...",
  "cp": "...",
  "tipo_servicio": "CFE, AGUA, TELMEX, etc.",
  "periodo": "mes/año del comprobante"
}
Si no puedes leer algún campo con certeza escribe null. Responde ÚNICAMENTE el JSON, sin texto adicional.`,

  COMPROBANTE_INGRESOS_1: `Extrae de este comprobante de ingresos (recibo de nómina, estado de cuenta, carta trabajo, etc.) los datos en JSON exacto:
{
  "nombre_titular": "...",
  "empresa_patron": "...",
  "rfc_empresa": "...",
  "puesto": "...",
  "ingreso_mensual_neto": número o null,
  "ingreso_mensual_bruto": número o null,
  "periodo": "mes/año",
  "tipo_documento": "NOMINA, ESTADO_CUENTA, CARTA_TRABAJO, etc."
}
Si no puedes leer algún campo con certeza escribe null. Responde ÚNICAMENTE el JSON, sin texto adicional.`,

  ESCRITURA_INMUEBLE: `Extrae de esta escritura notarial o título de propiedad los datos en JSON exacto:
{
  "propietario": "...",
  "ubicacion_inmueble": "dirección completa del inmueble",
  "colonia": "...",
  "municipio": "...",
  "estado": "...",
  "superficie_m2": número o null,
  "numero_escritura": "...",
  "notario": "...",
  "fecha_escritura": "YYYY-MM-DD o null",
  "folio_real": "..."
}
Si no puedes leer algún campo con certeza escribe null. Responde ÚNICAMENTE el JSON, sin texto adicional.`,

  DEFAULT: `Extrae de este documento todos los datos relevantes de identificación personal, domicilio e ingresos que encuentres, en JSON:
{
  "nombre_completo": "...",
  "curp": "...",
  "rfc": "...",
  "domicilio": "...",
  "colonia": "...",
  "municipio": "...",
  "estado": "...",
  "cp": "...",
  "ingreso_mensual": número o null,
  "otros": {}
}
Si no puedes leer algún campo con certeza escribe null. Responde ÚNICAMENTE el JSON, sin texto adicional.`,
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) }

  try {
    const { url, tipo_doc = 'DEFAULT' } = JSON.parse(event.body || '{}')

    if (!url) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Se requiere la URL del documento' }) }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'API key no configurada' }) }

    // Descargar imagen del Storage de Supabase
    const imgResp = await fetch(url)
    if (!imgResp.ok) throw new Error(`No se pudo obtener el documento: ${imgResp.status}`)

    const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
    const isImage = contentType.startsWith('image/')
    if (!isImage) {
      return { statusCode: 422, headers: HEADERS, body: JSON.stringify({ error: 'El documento debe ser una imagen (JPG, PNG, WebP). Los PDF no son soportados aún.' }) }
    }

    const mediaType = contentType.split(';')[0].trim()
    const buffer = await imgResp.arrayBuffer()
    const b64 = Buffer.from(buffer).toString('base64')

    const prompt = PROMPTS[tipo_doc] || PROMPTS.DEFAULT

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`Claude API error ${resp.status}: ${err}`)
    }

    const result = await resp.json()
    const texto = result.content?.[0]?.text || '{}'

    // Extraer JSON de la respuesta (a veces viene con backticks)
    const match = texto.match(/\{[\s\S]*\}/)
    const datos = match ? JSON.parse(match[0]) : {}

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, datos, tipo_doc }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
