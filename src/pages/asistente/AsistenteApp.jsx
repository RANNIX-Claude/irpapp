import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MessageCircle, FileText, Users, Hammer, Receipt, Wallet, LogOut } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { signOut } from '../../lib/auth'
import ChatOperativo from '../../components/agents/ChatOperativo'
import Consulta, { dinero, fecha, Etiqueta } from './Consulta'

// ── Contenido de cada consulta ───────────────────────────────────────────────
const colorEstatus = { VIGENTE: '#057642', VENCIDO: '#B24020', RENOVADO: '#6D28D9', RESCISION: '#D97706', CANCELADO: '#6B7280' }
const colorSemaforo = { ROJO: '#B24020', AMARILLO: '#D97706', VERDE: '#057642' }

const Contratos = () => (
  <Consulta titulo="Contratos" vista="asistente_contratos"
    buscar={['arrendatario_nombre', 'nombre_negocio', 'folio', 'locales_display', 'giro_autorizado']}
    orden={{ col: 'dias_restantes', asc: true }}
    filtros={[
      { id: 'vigentes', label: 'Vigentes', aplicar: q => q.eq('estatus', 'VIGENTE') },
      { id: 'porvencer', label: 'Por vencer (90 d)', aplicar: q => q.eq('estatus', 'VIGENTE').gte('dias_restantes', 0).lte('dias_restantes', 90) },
      { id: 'todos', label: 'Todos', aplicar: q => q },
    ]}
    tarjeta={c => ({
      titulo: c.arrendatario_nombre, subtitulo: `${c.locales_display || '—'} · ${c.folio}`, derecha: dinero(c.renta_mensual),
      etiqueta: { texto: c.estatus, color: colorEstatus[c.estatus] },
      linea: c.fecha_fin ? `vence ${fecha(c.fecha_fin)}${c.dias_restantes != null ? ` (${c.dias_restantes} d)` : ''}` : null,
    })}
    detalle={[
      ['Folio', c => c.folio], ['Arrendatario', c => c.arrendatario_nombre], ['Negocio', c => c.nombre_negocio],
      ['Local(es)', c => c.locales_display], ['Inmueble', c => c.inmueble_nombre], ['Giro', c => c.giro_autorizado],
      ['Vigencia', c => `${fecha(c.fecha_inicio)} → ${fecha(c.fecha_fin)}`], ['Días restantes', c => c.dias_restantes],
      ['Renta mensual', c => dinero(c.renta_mensual)], ['Depósito', c => dinero(c.deposito_garantia)],
      ['Día de pago', c => c.dia_pago], ['Penalización', c => c.penalizacion_pct != null ? `${c.penalizacion_pct}%` : null],
      ['Incremento anual', c => c.incremento_anual_pct != null ? `${c.incremento_anual_pct}%` : null],
      ['Fiador', c => c.fiador_nombre], ['Pagarés', c => c.pagares_cantidad],
      ['Estatus', c => c.estatus], ['Proceso', c => c.estatus_proceso], ['RFC', c => c.arrendatario_rfc],
      ['Correo', c => c.arrendatario_email], ['Teléfono', c => c.arrendatario_telefono], ['Notas', c => c.notas],
    ]} />
)

const Personal = () => (
  <Consulta titulo="Personal" vista="asistente_personal"
    buscar={['nombre_completo', 'puesto', 'area', 'departamento', 'numero_empleado']}
    orden={{ col: 'nombre_completo', asc: true }}
    filtros={[
      { id: 'activos', label: 'Activos', aplicar: q => q.eq('estado_id', 'ACTIVO') },
      { id: 'todos', label: 'Todos', aplicar: q => q },
    ]}
    tarjeta={e => ({
      titulo: e.nombre_completo, subtitulo: [e.puesto, e.area].filter(Boolean).join(' · ') || '—',
      derecha: e.salario_diario != null ? `${dinero(e.salario_diario)}/día` : null,
      etiqueta: e.semaforo_contrato ? { texto: e.tipo_contratacion || e.semaforo_contrato, color: colorSemaforo[e.semaforo_contrato] || '#6B7280' } : (e.tipo_contratacion ? { texto: e.tipo_contratacion } : null),
      linea: e.contrato_fin ? `contrato vence ${fecha(e.contrato_fin)}` : null,
    })}
    detalle={[
      ['No. empleado', e => e.numero_empleado], ['Puesto', e => e.puesto], ['Área', e => e.area], ['Departamento', e => e.departamento],
      ['Ingreso', e => fecha(e.fecha_ingreso)], ['Antigüedad', e => e.dias_antiguedad != null ? `${e.dias_antiguedad} días` : null],
      ['Sueldo diario', e => dinero(e.salario_diario)], ['Sueldo mensual', e => dinero(e.salario_mensual)],
      ['Horario', e => e.horario_trabajo], ['Descanso', e => e.dia_descanso], ['Contratación', e => e.tipo_contratacion],
      ['Contrato vence', e => e.contrato_fin ? fecha(e.contrato_fin) : null], ['Correo', e => e.email], ['Celular', e => e.celular],
    ]} />
)

const Proyectos = () => (
  <Consulta titulo="Proyectos" vista="asistente_proyectos"
    buscar={['nombre', 'descripcion', 'proveedor_nombre', 'estado']}
    orden={{ col: 'created_at', asc: false }}
    tarjeta={p => ({
      titulo: p.nombre, subtitulo: p.proveedor_nombre || p.descripcion, derecha: p.presupuesto_total != null ? dinero(p.presupuesto_total) : null,
      etiqueta: p.estado ? { texto: p.estado, color: '#0A66C2' } : null,
      linea: p.fecha_fin_estimada ? `fin estimado ${fecha(p.fecha_fin_estimada)}` : null,
    })}
    detalle={[
      ['Proyecto', p => p.nombre], ['Descripción', p => p.descripcion], ['Proveedor', p => p.proveedor_nombre], ['Estado', p => p.estado],
      ['Inicio', p => p.fecha_inicio ? fecha(p.fecha_inicio) : null], ['Fin estimado', p => p.fecha_fin_estimada ? fecha(p.fecha_fin_estimada) : null],
      ['Fin real', p => p.fecha_fin_real ? fecha(p.fecha_fin_real) : null], ['Presupuesto', p => p.presupuesto_total != null ? dinero(p.presupuesto_total) : null], ['Notas', p => p.notas],
    ]} />
)

const Gastos = () => {
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  return (
    <Consulta titulo="Gastos" vista="asistente_gastos"
      buscar={['descripcion', 'grupo_gasto', 'proveedor_nombre']}
      orden={{ col: 'fecha', asc: false }}
      filtros={[
        { id: '30d', label: 'Últimos 30 días', aplicar: q => q.gte('fecha', hace30) },
        { id: 'todos', label: 'Todos', aplicar: q => q },
      ]}
      tarjeta={g => ({
        titulo: g.proveedor_nombre || g.descripcion, subtitulo: `${fecha(g.fecha)} · ${g.grupo_gasto || '—'}`, derecha: dinero(g.monto ?? g.ticket_total),
        linea: g.num_lineas ? `${g.num_lineas} partidas` : null,
      })}
      detalle={[
        ['Fecha', g => fecha(g.fecha)], ['Proveedor', g => g.proveedor_nombre], ['Categoría prov.', g => g.proveedor_cat], ['Grupo', g => g.grupo_gasto],
        ['Descripción', g => g.descripcion], ['Monto', g => dinero(g.monto)], ['Total ticket', g => dinero(g.ticket_total)],
        ['Partidas', g => g.num_lineas], ['Semana', g => g.semana],
      ]} />
  )
}

const Ingresos = () => (
  <Consulta titulo="Ingresos" vista="asistente_ingresos"
    buscar={['arrendatario_nombre', 'folio', 'concepto_origen', 'nota', 'locales_display']}
    orden={{ col: 'fecha', asc: false }}
    filtros={[
      { id: 'todos', label: 'Todos', aplicar: q => q },
      { id: 'porvalidar', label: 'Por validar', aplicar: q => q.eq('estatus_validacion', 'POR_VALIDAR') },
    ]}
    tarjeta={i => ({
      titulo: i.arrendatario_nombre || i.concepto_origen || i.tipo, subtitulo: `${fecha(i.fecha)} · ${i.locales_display || i.tipo || '—'}`, derecha: dinero(i.importe),
      etiqueta: { texto: i.estatus_validacion === 'POR_VALIDAR' ? 'Por validar' : (i.estatus_validacion === 'VALIDADO' ? 'Validado' : i.estatus_validacion), color: i.estatus_validacion === 'VALIDADO' ? '#057642' : '#D97706' },
    })}
    detalle={[
      ['Fecha', i => fecha(i.fecha)], ['Arrendatario', i => i.arrendatario_nombre], ['Local(es)', i => i.locales_display], ['Contrato', i => i.folio],
      ['Importe', i => dinero(i.importe)], ['Tipo', i => i.tipo], ['Origen', i => i.origen], ['Concepto', i => i.concepto_origen],
      ['Estatus', i => i.estatus_validacion], ['Clasificación', i => i.clasificacion], ['Factura', i => i.factura], ['Nota', i => i.nota],
    ]} />
)

// ── Cascarón: barra superior, contenido y barra inferior ─────────────────────
const TABS = [
  { to: '/', label: 'Asistente', icono: MessageCircle, end: true },
  { to: '/contratos', label: 'Contratos', icono: FileText },
  { to: '/personal', label: 'Personal', icono: Users },
  { to: '/proyectos', label: 'Proyectos', icono: Hammer },
  { to: '/gastos', label: 'Gastos', icono: Receipt },
  { to: '/ingresos', label: 'Ingresos', icono: Wallet },
]

export default function AsistenteApp() {
  const { perfil } = useApp()
  const navigate = useNavigate()
  const enChat = useLocation().pathname === '/'

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)', overflow: 'hidden' }}>
      {/* Barra superior */}
      <header style={{ flexShrink: 0, background: 'var(--color-primary)', color: 'white', padding: 'calc(10px + env(safe-area-inset-top)) 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>IRP · Asistente</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{[perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'RANNIX Consulting'}</div>
        </div>
        <button onClick={() => signOut()} title="Salir" style={{ width: 40, height: 40, border: 'none', borderRadius: 12, background: 'rgba(255,255,255,0.18)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={18} />
        </button>
      </header>

      <main style={{ flex: 1, minHeight: 0 }}>
        {/* El chat queda montado al cambiar de pestaña: si no, se perdería la conversación y las fichas. */}
        <div style={{ display: enChat ? 'block' : 'none', height: '100%' }}>
          <ChatOperativo movil saludo="¡Hola! Soy tu asistente de IRP. Mándame tickets, fichas de depósito, INE o comprobantes y me encargo, o pregúntame lo que necesites. Con la cámara puedes fotografiar los documentos." onAbrirRuta={() => navigate('/')} />
        </div>
        {!enChat && (
          <Routes>
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/proyectos" element={<Proyectos />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/ingresos" element={<Ingresos />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      {/* Barra inferior */}
      <nav style={{ flexShrink: 0, display: 'flex', background: 'white', borderTop: '1px solid #E5E7EB', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(({ to, label, icono: Icono, end }) => (
          <NavLink key={to} to={to} end={end}
            style={({ isActive }) => ({ flex: 1, minWidth: 0, padding: '8px 2px 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', color: isActive ? 'var(--color-primary)' : '#6B7280', fontSize: 10, fontWeight: isActive ? 800 : 600 })}>
            <Icono size={22} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Toaster position="top-center" />
    </div>
  )
}
