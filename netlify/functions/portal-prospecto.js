// Netlify Function: portal-prospecto
// Usa fetch directo a Supabase REST (evita supabase-js + problema WebSocket Node 20)

const SUPABASE_URL = 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

function rest(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  }).then(r => r.json())
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  const token = event.queryStringParameters?.token
  if (!token) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Token requerido' }) }

  if (!SUPABASE_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Configuración incompleta en el servidor' }) }
  }

  // 1. Validar magic link
  const links = await rest('prospecto_magic_links', {
    select: 'id,persona_id,expira_at,activo,usado_at',
    token: `eq.${token}`,
    activo: 'eq.true',
    limit: '1',
  })

  if (!Array.isArray(links) || links.length === 0) {
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Link inválido o no encontrado' }) }
  }

  const link = links[0]

  if (new Date(link.expira_at) < new Date()) {
    return { statusCode: 410, headers: CORS, body: JSON.stringify({ error: 'Este link ha expirado. Solicita uno nuevo al administrador.' }) }
  }

  // 2. Obtener prospecto_id desde persona
  const personas_link = await rest('prospecto_personas', {
    select: 'prospecto_id',
    id: `eq.${link.persona_id}`,
    limit: '1',
  })

  if (!Array.isArray(personas_link) || personas_link.length === 0) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'No se encontró el prospecto asociado' }) }
  }

  const prospectoId = personas_link[0].prospecto_id

  // 3. Registrar primer uso
  if (!link.usado_at) {
    await fetch(`${SUPABASE_URL}/rest/v1/prospecto_magic_links?id=eq.${link.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ usado_at: new Date().toISOString() }),
    })
  }

  // 4. Datos del prospecto
  const prospectos = await rest('prospectos', {
    select: 'id,nombre_negocio,renta_propuesta',
    id: `eq.${prospectoId}`,
    limit: '1',
  })
  const prospecto = prospectos?.[0]

  // 5. Todas las personas del prospecto
  const personas = await rest('prospecto_personas', {
    select: '*',
    prospecto_id: `eq.${prospectoId}`,
    order: 'tipo',
  })

  // 6. Todos los documentos de todas las personas
  const personaIds = (personas || []).map(p => p.id)
  let docs = []
  if (personaIds.length > 0) {
    docs = await rest('prospecto_documentos', {
      select: '*',
      persona_id: `in.(${personaIds.join(',')})`,
      order: 'tipo_doc',
    })
  }

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
