import { supabase } from './supabase'

export const ESTATUS = {
  SOLICITADO: { label: 'Solicitado', color: '#0A66C2', bg: '#DBEAFE' },
  AUTORIZADO: { label: 'Autorizado', color: '#7B5EA7', bg: '#EDE9FE' },
  EN_PROCESO: { label: 'En proceso', color: '#B45309', bg: '#FEF3C7' },
  CERRADO:    { label: 'Cerrado',    color: '#057642', bg: '#DCFCE7' },
  RECHAZADO:  { label: 'Rechazado',  color: '#B24020', bg: '#FEE2E2' },
}
export const FLUJO = ['SOLICITADO', 'AUTORIZADO', 'EN_PROCESO', 'CERRADO']

export const TIPOS = {
  URGENTE:     { label: 'Urgente',     color: '#B24020' },
  PROGRAMADO:  { label: 'Programado',  color: '#0A66C2' },
  NO_PLANEADO: { label: 'No planeado', color: '#B45309' },
}

// Debe coincidir con puede_autorizar_mantenimiento() en la base.
export const ROLES_AUTORIZAN = ['super_admin', 'admin_inmobiliaria', 'gerente_plaza', 'supervisor_operaciones', 'corporativo']

export const MAX_FOTO_MB = 10

/** Sube fotos al bucket privado ot-evidencias y devuelve sus descriptores. */
export async function subirFotos(solicitudId, etapa, files) {
  const subidas = []
  const errores = []
  for (const f of Array.from(files || [])) {
    if (f.size > MAX_FOTO_MB * 1024 * 1024) { errores.push(`${f.name} pasa de ${MAX_FOTO_MB} MB`); continue }
    const path = `mantenimiento/${solicitudId}/${etapa}/${Date.now()}_${f.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await supabase.storage.from('ot-evidencias').upload(path, f, { contentType: f.type, upsert: false })
    if (error) { errores.push(`${f.name}: ${error.message}`); continue }
    subidas.push({ path, nombre: f.name, tipo: f.type, tamano_kb: Math.round(f.size / 1024), fecha: new Date().toISOString().slice(0, 10) })
  }
  return { subidas, errores }
}
