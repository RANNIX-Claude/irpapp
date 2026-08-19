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
  "nombre_completo": "apellido paterno apellido materno nombre(s) — exactamente como aparece",
  "curp": "18 caracteres en mayúsculas",
  "fecha_nacimiento": "YYYY-MM-DD",
  "sexo": "H o M",
  "calle": "nombre de la calle sin número — solo el nombre",
  "no_ext": "número exterior (ej: 1234, 45-A)",
  "no_int": "número interior o departamento o null",
  "colonia_ine": "colonia tal como aparece",
  "municipio_ine": "municipio o alcaldía",
  "estado_ine": "entidad federativa",
  "cp_ine": "código postal de 5 dígitos",
  "clave_elector": "18 caracteres alfanuméricos en mayúsculas",
  "vigencia": "año de vigencia (4 dígitos) o null"
}
La dirección completa en la INE está en una sola línea como 'CALLE NUMERO COL COLONIA' — separa CALLE de NÚMERO.
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

  COMPROBANTE_PAGO: `Extrae de este comprobante de pago (transferencia bancaria, depósito, SPEI, recibo de pago, etc.) los datos en JSON exacto:
{
  "fecha_pago": "YYYY-MM-DD o null",
  "monto": número sin comas (ej: 37234.00) o null,
  "banco": "nombre del banco o institución emisora",
  "referencia": "número de operación, folio, clave de rastreo o referencia",
  "forma_pago": "Transferencia, SPEI, Depósito en ventanilla, Efectivo, etc.",
  "concepto": "texto del campo Concepto o Descripción (puede indicar número de local, mes, etc.)",
  "nombre_emisor": "nombre de quien realiza el pago o null",
  "cuenta_origen": "últimos 4 dígitos de la cuenta/tarjeta de origen o null",
  "cuenta_destino": "últimos 4 dígitos o nombre de la cuenta destino o null"
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

// Prompt para extraer datos de texto libre pegado
const PROMPT_TEXTO = `Analiza el siguiente texto (puede ser un texto pegado de una credencial, documento, o datos escritos a mano)
y extrae todos los datos de identificación personal que encuentres. Devuelve JSON con EXACTAMENTE estas claves
(pon null si no está presente):
{
  "nombre_completo": null,
  "curp": null,
  "rfc": null,
  "fecha_nacimiento": "YYYY-MM-DD o null",
  "sexo": "H o M o null",
  "clave_elector": null,
  "vigencia": null,
  "calle": null,
  "no_ext": null,
  "no_int": null,
  "colonia": null,
  "municipio": null,
  "estado": null,
  "cp": null,
  "tel_casa": null,
  "celular": null,
  "correo": null,
  "estado_civil": null,
  "empresa": null,
  "puesto": null,
  "ingreso_mensual": null,
  "antiguedad": null
}
TEXTO A ANALIZAR:
`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Método no permitido' }) }

  try {
    const { url, tipo_doc = 'DEFAULT', image_base64, media_type, texto_libre } = JSON.parse(event.body || '{}')

    if (!url && !image_base64 && !texto_libre) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Se requiere url, image_base64 o texto_libre' }) }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'API key no configurada' }) }

    let messageContent
    let prompt

    if (texto_libre) {
      // Extracción desde texto pegado — sin imagen
      messageContent = [{ type: 'text', text: PROMPT_TEXTO + texto_libre }]
      prompt = PROMPT_TEXTO
    } else {
      // Obtener imagen: base64 directo o URL de Supabase Storage
      let b64, resolvedMediaType
      if (image_base64) {
        b64 = image_base64
        resolvedMediaType = media_type || 'image/jpeg'
      } else {
        const imgResp = await fetch(url)
        if (!imgResp.ok) throw new Error(`No se pudo obtener el documento: ${imgResp.status}`)
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
        if (!contentType.startsWith('image/')) {
          return { statusCode: 422, headers: HEADERS, body: JSON.stringify({ error: 'El documento debe ser una imagen (JPG, PNG, WebP).' }) }
        }
        resolvedMediaType = contentType.split(';')[0].trim()
        const buffer = await imgResp.arrayBuffer()
        b64 = Buffer.from(buffer).toString('base64')
      }
      prompt = PROMPTS[tipo_doc] || PROMPTS.DEFAULT
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: resolvedMediaType, data: b64 } },
        { type: 'text', text: prompt },
      ]
    }

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
        messages: [{ role: 'user', content: messageContent }],
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
