import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/**
 * URL firmada de vida corta para un archivo de Storage.
 * Sustituye a getPublicUrl(): los buckets son privados desde la migración
 * 20260829120000_storage_privado_urls_firmadas.sql.
 *
 * Requiere sesión autenticada. El portal de prospectos (anónimo) obtiene su
 * URL desde la Netlify Function portal-prospecto.
 *
 * @param {string} bucket
 * @param {string} path
 * @param {number} expiraEnSegundos  por defecto 1 hora
 * @returns {Promise<string|null>} null si el archivo no existe o no hay permiso
 */
export async function urlFirmada(bucket, path, expiraEnSegundos = 3600) {
  if (!path) return null
  // Tolera filas viejas que guardaron la URL pública completa en vez de la ruta.
  const ruta = path.startsWith('http')
    ? (path.split(`/object/public/${bucket}/`)[1] ?? path)
    : path
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(ruta, expiraEnSegundos)
  if (error) {
    console.error(`[storage] no se pudo firmar ${bucket}/${path}:`, error.message)
    return null
  }
  return data?.signedUrl ?? null
}
