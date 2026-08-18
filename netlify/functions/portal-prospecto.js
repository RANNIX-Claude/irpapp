// Netlify Function: portal-prospecto
// Valida magic link y devuelve datos del prospecto + todas las personas y docs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const token = event.queryStringParameters?.token
  if (!token) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Token requerido' }) }

  if (!SUPABASE_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Configuración incompleta en el servidor' }) }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 1. Validar magic link
  const { data: link, error: linkErr } = await supabase
    .from('prospecto_magic_links')
    .select('id, persona_id, expira_at, activo, usado_at, prospecto_personas(prospecto_id)')
    .eq('token', token)
    .eq('activo', true)
    .single()

  if (linkErr || !link) {
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Link inválido o no encontrado' }) }
  }

  if (new Date(link.expira_at) < new Date()) {
    return { statusCode: 410, headers: CORS, body: JSON.stringify({ error: 'Este link ha expirado. Solicita uno nuevo al administrador.' }) }
  }

  // 2. Registrar primer uso
  if (!link.usado_at) {
    await supabase.from('prospecto_magic_links').update({ usado_at: new Date().toISOString() }).eq('id', link.id)
  }

  const prospectoId = link.prospecto_personas?.prospecto_id
  if (!prospectoId) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'No se encontró el prospecto asociado' }) }
  }

  // 3. Datos del prospecto
  const { data: prospecto } = await supabase
    .from('prospectos')
    .select('id, nombre_negocio, renta_propuesta')
    .eq('id', prospectoId)
    .single()

  // 4. Todas las personas del prospecto
  const { data: personas } = await supabase
    .from('prospecto_personas')
    .select('*')
    .eq('prospecto_id', prospectoId)
    .order('tipo')

  // 5. Todos los documentos de todas las personas
  const personaIds = (personas || []).map(p => p.id)
  const { data: docs } = personaIds.length
    ? await supabase.from('prospecto_documentos').select('*').in('persona_id', personaIds).order('tipo_doc')
    : { data: [] }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      prospecto_id: prospectoId,
      nombre_negocio: prospecto?.nombre_negocio,
      renta_propuesta: prospecto?.renta_propuesta,
      personas: (personas || []).map(p => ({
        id: p.id, tipo: p.tipo, nombre_completo: p.nombre_completo,
        email: p.email, cel: p.cel, rfc: p.rfc, curp: p.curp,
        calle: p.calle, no_ext: p.no_ext, no_int: p.no_int,
        colonia: p.colonia, municipio: p.municipio, estado_domicilio: p.estado_domicilio, cp: p.cp,
        empresa: p.empresa, puesto: p.puesto, ingreso_mensual: p.ingreso_mensual,
        garantia_calle: p.garantia_calle, garantia_colonia: p.garantia_colonia,
        garantia_municipio: p.garantia_municipio, garantia_estado: p.garantia_estado,
        escritura_no: p.escritura_no, escritura_notario: p.escritura_notario, escritura_fecha: p.escritura_fecha,
      })),
      docs: docs || [],
      link_expira: link.expira_at,
    }),
  }
}
