import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import Renovaciones from './pages/Renovaciones.jsx'
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
import FondoRevolvente from './pages/FondoRevolvente.jsx'
import GastosOperativos from './pages/GastosOperativos.jsx'
import Conciliacion from './pages/Conciliacion.jsx'
import Agua from './pages/Agua.jsx'
import Vending from './pages/Vending.jsx'
import EDR from './pages/EDR.jsx'
import ResumenSemanal from './pages/ResumenSemanal.jsx'
import Bitacora from './pages/Bitacora.jsx'
import Utilidades from './pages/Utilidades.jsx'
import PortalProspecto from './pages/PortalProspecto.jsx'
import PortalArrendatario from './pages/PortalArrendatario.jsx'
import MapaLocales from './pages/MapaLocales.jsx'
import Ingresos from './pages/Ingresos.jsx'
import Despachos from './pages/Despachos.jsx'
import './styles/theme.css'

// Roles que NO son admin (van al portal arrendatario/externo)
const ROLES_PORTAL = ['arrendatario', 'prospecto']

function AppLayout() {
  const { user, perfil, loading, sidebarOpen } = useApp()
  const location = useLocation()

  // Rutas públicas — sin layout admin (portal prospecto / arrendatario)
  if (location.pathname.startsWith('/portal/')) {
    return (
      <Routes>
        <Route path="/portal/prospecto/:token" element={<PortalProspecto />} />
        <Route path="/portal/arrendatario"      element={<PortalArrendatario />} />
      </Routes>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary-dark)' }}>
      <div style={{ color: 'white', textAlign: 'center' }}>
        <LoadingSpinner label="Iniciando IRP..." />
      </div>
    </div>
  )

  if (!user) return <Login />

  // Arrendatario logueado → redirigir a su portal (no al admin)
  if (perfil && ROLES_PORTAL.includes(perfil.rol_id)) {
    return (
      <Routes>
        <Route path="*" element={<PortalArrendatario embedded />} />
      </Routes>
    )
  }

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
          <Route path="/renovaciones" element={<Renovaciones />} />
          <Route path="/cobranza" element={<Cobranza />} />
          <Route path="/arrendatarios" element={<Arrendatarios />} />
          <Route path="/mantenimiento" element={<Mantenimiento />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/rh" element={<RH />} />
          <Route path="/estacionamiento" element={<Estacionamiento />} />
          <Route path="/prospectos" element={<Prospectos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/fondo-revolvente" element={<FondoRevolvente />} />
          <Route path="/gastos-operativos" element={<GastosOperativos />} />
          <Route path="/conciliacion" element={<Conciliacion />} />
          <Route path="/agua" element={<Agua />} />
          <Route path="/vending" element={<Vending />} />
          <Route path="/edr" element={<EDR />} />
          <Route path="/resumen-semanal" element={<ResumenSemanal />} />
          <Route path="/bitacora" element={<Bitacora />} />
          <Route path="/utilidades" element={<Utilidades />} />
          <Route path="/mapa-locales" element={<MapaLocales />} />
          <Route path="/ingresos" element={<Ingresos />} />
          <Route path="/despachos" element={<Despachos />} />
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
