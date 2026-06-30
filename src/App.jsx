import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import Footer from './components/layout/Footer'
import AgenteOperativo from './components/agents/AgenteOperativo'
import LoadingSpinner from './components/ui/LoadingSpinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ComingSoon from './pages/ComingSoon'
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
          <Route path="/inmuebles" element={<ComingSoon modulo="Inmuebles y Unidades" />} />
          <Route path="/contratos" element={<ComingSoon modulo="Contratos de Arrendamiento" />} />
          <Route path="/cobranza" element={<ComingSoon modulo="Cobranza y Conciliacion Bancaria" />} />
          <Route path="/arrendatarios" element={<ComingSoon modulo="Arrendatarios" />} />
          <Route path="/mantenimiento" element={<ComingSoon modulo="Mantenimiento y Ordenes de Trabajo" />} />
          <Route path="/proyectos" element={<ComingSoon modulo="Proyectos y Obras" />} />
          <Route path="/proveedores" element={<ComingSoon modulo="Proveedores" />} />
          <Route path="/rh" element={<ComingSoon modulo="RH y Nomina" />} />
          <Route path="/estacionamiento" element={<ComingSoon modulo="Estacionamiento" />} />
          <Route path="/prospectos" element={<ComingSoon modulo="Prospectos y CRM" />} />
          <Route path="/reportes" element={<ComingSoon modulo="Reportes y BI" />} />
          <Route path="/config" element={<ComingSoon modulo="Configuracion" />} />
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
