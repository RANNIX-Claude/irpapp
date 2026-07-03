import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

// DEMO MODE — sin autenticación, usuario mock para visualización
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'roberto.aguilar.cota@gmail.com',
  user_metadata: { full_name: 'Roberto Aguilar Cota' },
}

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <AppContext.Provider value={{ user: DEMO_USER, loading: false, sidebarOpen, setSidebarOpen }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
