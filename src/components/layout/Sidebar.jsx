import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, FileText, CreditCard, Users,
  Wrench, HardHat, Truck, UserCheck, Car, PortalIcon,
  Search, BarChart3, Settings, ChevronRight, BriefcaseBusiness
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Inmuebles', path: '/inmuebles', icon: Building2 },
  { label: 'Contratos', path: '/contratos', icon: FileText },
  { label: 'Cobranza', path: '/cobranza', icon: CreditCard },
  { label: 'Arrendatarios', path: '/arrendatarios', icon: Users },
  { label: 'Mantenimiento', path: '/mantenimiento', icon: Wrench },
  { label: 'Proyectos', path: '/proyectos', icon: HardHat },
  { label: 'Proveedores', path: '/proveedores', icon: Truck },
  { label: 'RH / Nómina', path: '/rh', icon: UserCheck },
  { label: 'Estacionamiento', path: '/estacionamiento', icon: Car },
  { label: 'Prospectos', path: '/prospectos', icon: Search },
  { label: 'Reportes', path: '/reportes', icon: BarChart3 },
  { label: 'Configuración', path: '/config', icon: Settings },
]

export default function Sidebar() {
  const { sidebarOpen } = useApp()

  return (
    <aside style={{
      position: 'fixed', top: 'var(--header-height)', left: 0, bottom: 0,
      width: sidebarOpen ? '220px' : '60px',
      background: 'var(--color-primary-dark)',
      transition: 'width 0.2s ease',
      overflowX: 'hidden', overflowY: 'auto',
      zIndex: 40,
      borderRight: '1px solid rgba(255,255,255,0.08)',
    }}>
      <nav style={{ padding: '8px 0' }}>
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px', textDecoration: 'none',
            color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
            background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
            borderLeft: isActive ? '3px solid #E8A020' : '3px solid transparent',
            fontSize: '13px', fontWeight: isActive ? 600 : 400,
            whiteSpace: 'nowrap', transition: 'all 0.15s',
            borderRadius: '0 6px 6px 0', margin: '1px 8px 1px 0',
          })}>
            <Icon size={17} style={{ flexShrink: 0, marginLeft: isActive ? '0' : '1px' }} />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
