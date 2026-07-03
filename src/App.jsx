import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import Footer from './components/layout/Footer'
import AgenteOperativo from './components/agents/AgenteOperativo.jsx'
import LoadingSpinner from './components/ui/LoadingSpinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inmuebles from './pages/Inmuebles.jsx'
import Contratos from './pages/Contratos.jsx'
import Cobranza from './pages/Cobranza.jsx'
import Arrendatarios from './pages/Arrendatarios.jsx'
import Mantenimiento from './pages/Mantenimiento.jsx'
import Proyectos from './pages/Proyectos.jsx'
import Proveedores from './pages/Proveedores.jsx'
import RH from './pages/RH.jsx'
import Estacionamiento from './pages/Estacionamiento.jsx'
import Prospectos from './pages/Prospectos.jsx'
import Reportes from './pages/Reportes.jsx'
import Configuracion from './pages/Configuracion.jsx'
import './styles/theme.css'

function AppLayout() {
  const { user, loading, sidebarOpen } = useApp()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary-dark)' }}>
      <div style={{ color: 'white', textAlign: 'center' }}>
        <LoadingSpinner label="Iniciando IRP..." />
      </div>
    </div>
  )

  if (!user) return <Login />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <Header />
      <Sidebar />
      <main style={{
        marginLeft: sidebarOpen ? '220px' : '60px',
        marginTop: 'var(--header-height)',
        minHeight: 'calc(100vh - var(--header-height) - 48px)',
        transition: 'margin-left 0.2s ease',
      }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inmuebles" element={<Inmuebles />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/cobranza" element={<Cobranza />} />
          <Route path="/arrendatarios" element={<Arrendatarios />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/rh" element={<RH />} />
          <Route path="/estacionamiento" element={<Estacionamiento />} />
          <Route path="/prospectos" element={<Prospectos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/config" element={<Configuracion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </main>
      <AgenteOperativo />
      <Toaster position="top-right" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  )
}
