import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [perfil, setPerfil]     = useState(null)   // { rol_id, nombre, apellido }
  const [loading, setLoading]   = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Carga el perfil + rol desde irp_usuarios; fallback a user_metadata del JWT
  const cargarPerfil = async (userId, userMeta) => {
    const { data } = await supabase
      .from('irp_usuarios')
      .select('rol_id, nombre, apellido, activo')
      .eq('id', userId)
      .single()
    if (data) {
      setPerfil(data)
    } else if (userMeta?.rol_id) {
      // Fallback: rol embebido en raw_user_meta_data del token
      setPerfil({ rol_id: userMeta.rol_id, nombre: userMeta.nombre || '', apellido: '', activo: true })
    } else {
      setPerfil(null)
    }
  }

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id, session.user.user_metadata)
      setLoading(false)
    })

    // Cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id, session.user.user_metadata)
      } else {
        setPerfil(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppContext.Provider value={{ user, perfil, loading, sidebarOpen, setSidebarOpen }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
