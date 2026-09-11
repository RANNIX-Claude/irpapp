import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, CreditCard, Users,
  UserCheck, Car,
  BarChart3, Settings,
  ShoppingBag, TrendingUp, CalendarRange, Receipt, ClipboardList, Database,
  UserPlus, ArrowRightLeft, RotateCcw, UtensilsCrossed, FolderOpen,
  ClipboardCheck, Calculator,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { label: 'Dashboard', path: '/edr', icon: LayoutDashboard },
    ]
  },
  {
    // Prospecto → Contrato → Renovación
    label: 'LOCALES',
    items: [
      { label: 'Prospectos',   path: '/prospectos',                        icon: UserPlus  },
      { label: 'Contratos',    path: '/contratos',                         icon: FileText  },
      { label: 'Renovaciones', path: '/renovaciones',                      icon: RotateCcw },
    ]
  },
  {
    // Gestión diaria de cartera activa
    label: 'CARTERA',
    items: [
      { label: 'Cobranza',      path: '/cobranza',      icon: CreditCard    },
      { label: 'Conciliación',  path: '/conciliacion',  icon: ArrowRightLeft, disabled: true },
      { label: 'Ingresos',      path: '/ingresos',      icon: TrendingUp    },
    ]
  },
  {
    label: 'OPERACIÓN',
    items: [
      { label: 'Resumen Semanal', path: '/resumen-semanal', icon: CalendarRange },
      { label: 'Estacionamiento', path: '/estacionamiento', icon: Car },
      { label: 'Gastos Operativos', path: '/gastos-operativos', icon: Receipt },
      { label: 'Vending', path: '/vending', icon: ShoppingBag },
    ]
  },
  {
    label: 'RESTAURANTE',
    items: [
      { label: 'Gastos', path: '/restaurante/gastos', icon: UtensilsCrossed },
    ]
  },
  {
    label: 'ARRENDATARIO',
    items: [
      { label: 'Arrendatarios', path: '/arrendatarios', icon: Users    },
      { label: 'Expedientes',   path: '/contratos',     icon: FolderOpen },
    ]
  },
  {
    label: 'RECURSOS HUMANOS',
    items: [
      { label: 'RH / Nómina', path: '/rh', icon: UserCheck },
    ]
  },
  {
    label: 'ANÁLISIS',
    items: [
      { label: 'Reportes', path: '/reportes', icon: BarChart3 },
    ]
  },
  {
    label: null,
    items: [
      { label: 'Bitácora', path: '/bitacora', icon: ClipboardList },
      { label: 'Configuración', path: '/config', icon: Settings },
    ]
  },
  {
    // El integrador se explica a sí mismo: de dónde sale cada número y en
    // qué quedó cada prueba. Consultar la base es una utilería más, no el
    // nombre de la sección.
    label: 'UTILERÍAS',
    items: [
      { label: 'Cálculos del Sistema', path: '/calculos', icon: Calculator },
      { label: 'Validación', path: '/validacion', icon: ClipboardCheck },
      { label: 'Consulta a Base de Datos', path: '/utilidades', icon: Database },
    ]
  },
]

// Rol restaurante: solo ve su sección
const SECTIONS_RESTAURANTE = ['RESTAURANTE']

export default function Sidebar() {
  const { sidebarOpen, perfil, user } = useApp()
  const location = useLocation()

  // Checa perfil de BD y también metadata del JWT como fallback inmediato
  const rolId = perfil?.rol_id || user?.user_metadata?.rol_id
  const esRestaurante = rolId === 'restaurante'
  const sections = esRestaurante
    ? NAV_SECTIONS.filter(s => SECTIONS_RESTAURANTE.includes(s.label))
    : NAV_SECTIONS

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
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && sidebarOpen && (
              <div style={{
                padding: '10px 16px 4px',
                fontSize: '9px', fontWeight: 800,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                borderTop: si > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                marginTop: si > 0 ? '4px' : '0',
              }}>{section.label}</div>
            )}
            {section.label && !sidebarOpen && si > 0 && (
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '6px 8px' }} />
            )}
            {section.items.map(({ label, path, icon: Icon, disabled }) => {
              const [basePath, qs] = path.split('?')
              const isActive = qs
                ? location.pathname === basePath && location.search.includes(qs.split('=')[1])
                : location.pathname === basePath && !location.search

              if (disabled) {
                return (
                  <div key={path} title="Deshabilitado" style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 16px',
                    color: 'rgba(255,255,255,0.28)',
                    borderLeft: '3px solid transparent',
                    fontSize: '13px', fontWeight: 400,
                    whiteSpace: 'nowrap', cursor: 'not-allowed',
                    margin: '1px 8px 1px 0',
                  }}>
                    <Icon size={17} style={{ flexShrink: 0, marginLeft: '1px' }} />
                    {sidebarOpen && <span>{label}</span>}
                  </div>
                )
              }

              return (
                <NavLink key={path} to={path} end style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 16px', textDecoration: 'none',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #E8A020' : '3px solid transparent',
                  fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                  borderRadius: '0 6px 6px 0', margin: '1px 8px 1px 0',
                }}>
                  <Icon size={17} style={{ flexShrink: 0, marginLeft: '1px' }} />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
