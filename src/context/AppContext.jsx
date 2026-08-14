import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [perfil, setPerfil]     = useState(null)   // { rol_id, nombre, apellido }
  const [loading, setLoading]   = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Carga el perfil + rol desde irp_usuarios
  const cargarPerfil = async (userId) => {
    const { data } = await supabase
      .from('irp_usuarios')
      .select('rol_id, nombre, apellido, activo')
      .eq('id', userId)
      .single()
    setPerfil(data || null)
  }

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) cargarPerfil(session.user.id)
      setLoading(false)
    })

    // Cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        cargarPerfil(session.user.id)
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
