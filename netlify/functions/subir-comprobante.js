// Netlify Function: subir-comprobante
// Usa fetch directo a Supabase REST (evita supabase-js + problema WebSocket Node 20)
// Sube archivos a Storage con service_role key y opcionalmente actualiza ingresos.comprobante_url

const SUPABASE_URL = 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_BUCKETS = ['facturas-cfdi', 'tickets-gastos', 'vending-reportes', 'comprobantes-pago']

const HEADERS_JSON = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS_JSON, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  let body
  try { body = JSON.parse(event.body) } catch {
    return { statusCode: 400, headers: HEADERS_JSON, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { bucket, path: filePath, file_base64, mime_type, ingreso_id } = body
  const targetBucket = bucket || 'facturas-cfdi'

  if (!ALLOWED_BUCKETS.includes(targetBucket)) {
    return { statusCode: 400, headers: HEADERS_JSON, body: JSON.stringify({ error: 'Bucket no permitido' }) }
  }
  if (!filePath || !file_base64 || !mime_type) {
    return { statusCode: 400, headers: HEADERS_JSON, body: JSON.stringify({ error: 'Faltan campos requeridos' }) }
  }
  if (!SERVICE_KEY) {
    return { statusCode: 500, headers: HEADERS_JSON, body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' }) }
  }

  // Convertir base64 a buffer
  const buffer = Buffer.from(file_base64, 'base64')

  // Subir a Supabase Storage via REST
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/${targetBucket}/${filePath}`
  const upRes = await fetch(storageUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': mime_type,
      'x-upsert': 'true',
    },
    body: buffer,
  })

  if (!upRes.ok) {
    const errText = await upRes.text()
    return { statusCode: 500, headers: HEADERS_JSON, body: JSON.stringify({ error: `Storage error ${upRes.status}: ${errText}` }) }
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${filePath}`

  // Actualizar comprobante_url en ingresos si se pasa ingreso_id
  if (ingreso_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/ingresos?id=eq.${ingreso_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ comprobante_url: publicUrl }),
    })
  }

  return {
    statusCode: 200,
    headers: HEADERS_JSON,
    body: JSON.stringify({ url: publicUrl }),
  }
}
