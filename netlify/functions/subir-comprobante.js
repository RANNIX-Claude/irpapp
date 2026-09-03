// Netlify Function: subir-comprobante
// Sube archivos a Supabase Storage usando service_role key (evita problemas de RLS en frontend)
// Soporta cualquier bucket de la lista permitida

const { createClient } = require('@supabase/supabase-js')

const ALLOWED_BUCKETS = ['facturas-cfdi', 'tickets-gastos', 'vending-reportes', 'comprobantes-pago']

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://kusuoxwzdxfuybvyiakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { bucket, path, file_base64, mime_type, ingreso_id } = body

  const targetBucket = bucket || 'facturas-cfdi'
  if (!ALLOWED_BUCKETS.includes(targetBucket)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bucket no permitido: ' + targetBucket }) }
  }
  if (!path || !file_base64 || !mime_type) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltan campos: path, file_base64, mime_type' }) }
  }

  const buffer = Buffer.from(file_base64, 'base64')

  const { error: upErr } = await supabase.storage
    .from(targetBucket)
    .upload(path, buffer, { contentType: mime_type, upsert: true })

  if (upErr) {
    return { statusCode: 500, body: JSON.stringify({ error: upErr.message }) }
  }

  const { data: urlData } = supabase.storage.from(targetBucket).getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  // Opcional: guardar URL en tabla ingresos si se pasa ingreso_id
  if (ingreso_id) {
    await supabase.from('ingresos').update({ comprobante_url: publicUrl }).eq('id', ingreso_id)
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: publicUrl }),
  }
}
