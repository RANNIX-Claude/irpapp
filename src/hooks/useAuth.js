import { useApp } from '../context/AppContext'
export const useAuth = () => {
  const { user, loading } = useApp()
  return { user, loading, isAuthenticated: !!user }
}
