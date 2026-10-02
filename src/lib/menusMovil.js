import {
  MessageCircle, LayoutDashboard, CreditCard, FileText, Users, UserPlus, RotateCcw, Building2,
  TrendingUp, Landmark, Stamp, Receipt, ShoppingBag, Wrench, ClipboardCheck, HardHat, CalendarDays,
  Truck, Package, UserCheck, BarChart3, ClipboardList, UserCog, Settings, Rss, Sun, FileBarChart2,
  CalendarRange, FolderOpen, UtensilsCrossed, LogOut, Car,
} from 'lucide-react'

// Menú inferior de la versión móvil, por rol. `tabs` van siempre visibles abajo (máx. 5);
// `mas` aparece en la hoja del botón «Más» (solo si el rol tiene más módulos de los que caben).
// `chat: true` → la ruta `/` es el Asistente Operativo a pantalla completa (casa del administrador).
// `accion: 'salir'` → pestaña que cierra la sesión (roles con una sola pantalla).

const MAS_ADMIN = [
  { label: 'Resumen', items: [
    { label: 'Feed ejecutivo', path: '/feed', icon: Rss },
    { label: 'Foto del día', path: '/foto-del-dia', icon: Sun },
    { label: 'Estado de resultados', path: '/edr', icon: LayoutDashboard },
    { label: 'Informe propietario', path: '/informe', icon: FileBarChart2 },
    { label: 'Resumen semanal', path: '/resumen-semanal', icon: CalendarRange },
    { label: 'Eventos', path: '/eventos', icon: CalendarDays },
  ] },
  { label: 'Locales', items: [
    { label: 'Locales', path: '/inmuebles', icon: Building2 },
    { label: 'Arrendatarios', path: '/arrendatarios', icon: Users },
    { label: 'Prospectos', path: '/prospectos', icon: UserPlus },
    { label: 'Renovaciones', path: '/renovaciones', icon: RotateCcw },
  ] },
  { label: 'Dinero', items: [
    { label: 'Ingresos', path: '/ingresos', icon: TrendingUp },
    { label: 'Finanzas', path: '/finanzas', icon: Landmark },
    { label: 'Facturación', path: '/facturacion', icon: Stamp },
    { label: 'Gastos operativos', path: '/gastos-operativos', icon: Receipt },
  ] },
  { label: 'Operación', items: [
    { label: 'Solicitudes', path: '/mantenimiento?vista=solicitud', icon: Wrench },
    { label: 'Autorización', path: '/mantenimiento?vista=autorizacion', icon: ClipboardCheck },
    { label: 'Proyectos', path: '/proyectos', icon: HardHat },
    { label: 'Vending', path: '/vending', icon: ShoppingBag },
    { label: 'Proveedores', path: '/proveedores', icon: Truck },
    { label: 'Productos', path: '/productos', icon: Package },
  ] },
  { label: 'Personal y análisis', items: [
    { label: 'RH / Nómina', path: '/rh', icon: UserCheck },
    { label: 'Reportes', path: '/reportes', icon: BarChart3 },
  ] },
  { label: 'Sistema', items: [
    { label: 'Bitácora', path: '/bitacora', icon: ClipboardList },
    { label: 'Usuarios', path: '/usuarios', icon: UserCog },
    { label: 'Configuración', path: '/config', icon: Settings },
  ] },
]

const SALIR = { label: 'Salir', accion: 'salir', icon: LogOut }

const ADMIN = {
  chat: true,
  tabs: [
    { label: 'Asistente', path: '/', icon: MessageCircle },
    { label: 'Tablero', path: '/tablero', icon: LayoutDashboard },
    { label: 'Cobranza', path: '/cobranza', icon: CreditCard },
    { label: 'Contratos', path: '/contratos', icon: FileText },
  ],
  mas: MAS_ADMIN,
}

const MENUS = {
  propietario: {
    tabs: [
      { label: 'Informe', path: '/informe', icon: FileBarChart2 },
      { label: 'Feed', path: '/feed', icon: Rss },
      { label: 'Resultados', path: '/edr', icon: LayoutDashboard },
      { label: 'Contratos', path: '/contratos', icon: FileText },
    ],
    mas: [{ label: 'Más', items: [
      { label: 'Resumen semanal', path: '/resumen-semanal', icon: CalendarRange },
      { label: 'RH / Nómina', path: '/rh', icon: UserCheck },
      { label: 'Reportes', path: '/reportes', icon: BarChart3 },
    ] }],
  },
  corporativo: {
    tabs: [
      { label: 'Feed', path: '/feed', icon: Rss },
      { label: 'Resultados', path: '/edr', icon: LayoutDashboard },
      { label: 'Autorizar', path: '/mantenimiento?vista=autorizacion', icon: ClipboardCheck },
      { label: 'Contratos', path: '/contratos', icon: FileText },
    ],
    mas: [{ label: 'Más', items: [
      { label: 'Resumen semanal', path: '/resumen-semanal', icon: CalendarRange },
      { label: 'RH / Nómina', path: '/rh', icon: UserCheck },
      { label: 'Reportes', path: '/reportes', icon: BarChart3 },
    ] }],
  },
  finanzas: { tabs: [{ label: 'Finanzas', path: '/finanzas', icon: Landmark }, SALIR], mas: [] },
  facturador: { tabs: [{ label: 'Facturación', path: '/facturacion', icon: Stamp }, SALIR], mas: [] },
  restaurante: { tabs: [{ label: 'Gastos', path: '/restaurante/gastos', icon: UtensilsCrossed }, SALIR], mas: [] },
}

export function menuMovil(rolId, perfil) {
  if (rolId === 'locatario') {
    return { tabs: [{ label: 'Mi expediente', path: `/contratos/${perfil?.contrato_id || ''}`, icon: FolderOpen }, SALIR], mas: [] }
  }
  return MENUS[rolId] || ADMIN
}

export { Car }
