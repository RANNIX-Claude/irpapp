import {
  MessageCircle, LayoutDashboard, CreditCard, FileText, Users, Building2,
  TrendingUp, Landmark, Stamp, Receipt, Wrench, ClipboardCheck, HardHat,
  UserCheck, Rss, FileBarChart2, CalendarRange, FolderOpen, UtensilsCrossed, LogOut,
} from 'lucide-react'

// Menú inferior de la versión móvil, por rol. `tabs` van siempre visibles abajo (máx. 5);
// `mas` aparece en la hoja del botón «Más» (solo si el rol tiene más módulos de los que caben).
// `chat: true` → la ruta `/` es el Asistente Operativo a pantalla completa (casa del administrador).
// `accion: 'salir'` → pestaña que cierra la sesión (roles con una sola pantalla).

// Solo lo que tiene pantalla móvil (src/mobile/). Lo demás (altas, catálogos, reportes en tabla…)
// se hace pidiéndoselo al asistente o desde el escritorio.
const MAS_ADMIN = [
  { label: 'Resumen', items: [
    { label: 'Feed de la plaza', path: '/feed', icon: Rss },
    { label: 'Resultados del mes', path: '/edr', icon: LayoutDashboard },
    { label: 'Resumen semanal', path: '/resumen-semanal', icon: CalendarRange },
  ] },
  { label: 'Locales', items: [
    { label: 'Mapa de locales', path: '/mapa-locales', icon: Building2 },
    { label: 'Arrendatarios', path: '/arrendatarios', icon: Users },
  ] },
  { label: 'Dinero', items: [
    { label: 'Ingresos', path: '/ingresos', icon: TrendingUp },
    { label: 'Validar depósitos', path: '/finanzas', icon: Landmark },
    { label: 'Facturación', path: '/facturacion', icon: Stamp },
    { label: 'Gastos', path: '/gastos-operativos', icon: Receipt },
  ] },
  { label: 'Operación', items: [
    { label: 'Mantenimiento', path: '/mantenimiento', icon: Wrench },
    { label: 'Por autorizar', path: '/mantenimiento?vista=autorizacion', icon: ClipboardCheck },
    { label: 'Proyectos', path: '/proyectos', icon: HardHat },
    { label: 'Personal', path: '/rh', icon: UserCheck },
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
      { label: 'Personal', path: '/rh', icon: UserCheck },
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
      { label: 'Personal', path: '/rh', icon: UserCheck },
    ] }],
  },
  finanzas: {
    tabs: [
      { label: 'Validar Pago', path: '/finanzas',  icon: Landmark   },
      { label: 'Cobros',       path: '/cobranza',  icon: CreditCard },
      { label: 'Pagos',        path: '/ingresos',  icon: TrendingUp },
      { label: 'Contratos',    path: '/contratos', icon: FileText   },
    ],
    mas: [
      { label: 'Resumen', items: [
        { label: 'Feed de la plaza',  path: '/feed',            icon: Rss           },
        { label: 'Resultados del mes',path: '/edr',             icon: LayoutDashboard },
        { label: 'Resumen semanal',   path: '/resumen-semanal', icon: CalendarRange },
      ] },
      { label: 'Locales', items: [
        { label: 'Mapa de locales', path: '/mapa-locales',  icon: Building2 },
        { label: 'Arrendatarios',   path: '/arrendatarios', icon: Users     },
      ] },
      { label: 'Dinero', items: [
        { label: 'Facturación', path: '/facturacion',   icon: Stamp   },
        { label: 'Gastos',      path: '/gastos-operativos', icon: Receipt },
      ] },
      { label: 'Operación', items: [
        { label: 'Proyectos', path: '/proyectos', icon: HardHat  },
        { label: 'Personal',  path: '/rh',        icon: UserCheck },
      ] },
    ],
  },
  facturador: { tabs: [{ label: 'Facturación', path: '/facturacion', icon: Stamp }, SALIR], mas: [] },
  restaurante: { tabs: [{ label: 'Gastos', path: '/restaurante/gastos', icon: UtensilsCrossed }, SALIR], mas: [] },
}

export function menuMovil(rolId, perfil) {
  if (rolId === 'locatario') {
    return { tabs: [{ label: 'Mi expediente', path: `/contratos/${perfil?.contrato_id || ''}`, icon: FolderOpen }, SALIR], mas: [] }
  }
  return MENUS[rolId] || ADMIN
}

