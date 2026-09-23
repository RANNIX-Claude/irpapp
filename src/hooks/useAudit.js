import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Captura la IP del cliente una sola vez por sesión de la app
let _cachedIp = null
async function getClientIp() {
  if (_cachedIp) return _cachedIp
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
    const j = await r.json()
    _cachedIp = j.ip || null
  } catch (_) {
    _cachedIp = null
  }
  return _cachedIp
}

// Registra un evento en la bitácora de forma silenciosa (nunca bloquea)
// descripcion puede ser string o un objeto/array — se serializa automáticamente a JSON
export async function logAudit({ modulo, accion, entidad, entidad_id, descripcion }) {
  try {
    const ip = await getClientIp()
    const desc = descripcion && typeof descripcion === 'object'
      ? JSON.stringify(descripcion)
      : (descripcion || null)
    await supabase.rpc('log_bitacora', {
      p_modulo:      modulo,
      p_accion:      accion,
      p_entidad:     entidad || null,
      p_entidad_id:  entidad_id || null,
      p_descripcion: desc,
      p_ip:          ip,
    })
  } catch (_) {
    // silencioso — nunca debe interrumpir el flujo del usuario
  }
}

// Hook: registra automáticamente la visita a un módulo al montarse
export function useModuleAudit(modulo) {
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current) return
    logged.current = true
    logAudit({ modulo, accion: 'VISITA', descripcion: `Acceso al módulo ${modulo}` })
  }, [modulo])
}
