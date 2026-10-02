import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Monitor, MessageCircle } from 'lucide-react'
import { menuMovil } from '../lib/menusMovil'
import { Pantalla, botonGrande, COLOR } from './kit'
import Tablero from './Tablero'
import Resultados, { ResumenSemanal } from './Resultados'
import { Contratos, Locales, Arrendatarios, Ingresos, Gastos, Cobranza } from './Consultas'
import { Personal, Mantenimiento, Proyectos, Feed } from './Operacion'
import { FinanzasMovil, FacturacionMovil, RestauranteMovil, ExpedienteMovil } from './Roles'

// Pantallas que SÍ tienen versión móvil. Lo demás (formularios largos, catálogos, reportes
// en tabla…) se opera desde el escritorio o pidiéndoselo al asistente: no se muestra la
// pantalla de escritorio apretada en el celular.
const COMUNES = {
  '/tablero': Tablero, '/informe': Tablero, '/edr': Resultados, '/resumen-semanal': ResumenSemanal,
  '/cobranza': Cobranza, '/contratos': Contratos, '/contratos/:id': ExpedienteMovil,
  '/inmuebles': Locales, '/mapa-locales': Locales, '/arrendatarios': Arrendatarios,
  '/ingresos': Ingresos, '/gastos-operativos': Gastos, '/rh': Personal,
  '/mantenimiento': Mantenimiento, '/proyectos': Proyectos, '/feed': Feed,
  '/finanzas': FinanzasMovil, '/facturacion': FacturacionMovil, '/restaurante/gastos': RestauranteMovil,
}

// Qué rutas ve cada rol (el resto de roles de personal ve todas) y a dónde aterriza.
const PERMITIDAS = {
  propietario: ['/informe', '/feed', '/edr', '/contratos', '/contratos/:id', '/resumen-semanal', '/rh'],
  corporativo: ['/feed', '/edr', '/mantenimiento', '/contratos', '/contratos/:id', '/resumen-semanal', '/rh'],
  finanzas: ['/finanzas'],
  facturador: ['/facturacion'],
  restaurante: ['/restaurante/gastos'],
  locatario: ['/contratos/:id'],
}
const ATERRIZAJE = { propietario: '/informe', corporativo: '/edr', finanzas: '/finanzas', facturador: '/facturacion', restaurante: '/restaurante/gastos' }

function SoloEscritorio() {
  const navigate = useNavigate()
  return (
    <Pantalla>
      <div style={{ textAlign: 'center', padding: '40px 16px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 18, marginTop: 20 }}>
        <Monitor size={40} color={COLOR.gris} />
        <h2 style={{ margin: '12px 0 6px', fontSize: 18 }}>Esta pantalla es para escritorio</h2>
        <p style={{ margin: '0 0 16px', color: COLOR.gris, fontSize: 14, lineHeight: 1.5 }}>
          Tiene formularios largos que no caben bien en el celular. Desde aquí puedes consultar el resto de la plaza o pedirle al asistente que lo haga por ti.
        </p>
        <button onClick={() => navigate('/')} style={botonGrande()}><MessageCircle size={16} style={{ verticalAlign: -3 }} /> Pedírselo al asistente</button>
      </div>
    </Pantalla>
  )
}

export default function RutasMovil({ rolId, perfil }) {
  const { chat } = menuMovil(rolId, perfil)
  const permitidas = PERMITIDAS[rolId]
  const inicio = rolId === 'locatario' ? `/contratos/${perfil?.contrato_id}` : (ATERRIZAJE[rolId] || '/tablero')
  const rutas = Object.entries(COMUNES).filter(([p]) => !permitidas || permitidas.includes(p))
  return (
    <Routes>
      {rutas.map(([path, Pagina]) => <Route key={path} path={path} element={<Pagina />} />)}
      <Route path="*" element={!permitidas && chat ? <SoloEscritorio /> : <Navigate to={inicio} replace />} />
    </Routes>
  )
}
