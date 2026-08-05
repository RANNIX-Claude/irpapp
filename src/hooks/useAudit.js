import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Registra un evento en la bitácora de forma silenciosa (nunca bloquea)
export async function logAudit({ modulo, accion, entidad, entidad_id, descripcion }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('bitacora').insert({
      modulo,
      accion,
      entidad: entidad || null,
      entidad_id: entidad_id || null,
      descripcion: descripcion || null,
      usuario_id: user?.id || null,
      usuario_email: user?.email || null,
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
