import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LogOut, MoreHorizontal, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { signOut } from '../../lib/auth'
import { menuMovil } from '../../lib/menusMovil'
import { claveIcono } from '../../lib/pwa'
import ChatOperativo from '../agents/ChatOperativo'
import RutasMovil from '../../mobile/Rutas'

// ¿Está activa esta pestaña? Soporta rutas con query (/mantenimiento?vista=autorizacion).
function activa(path, loc) {
  const [base, qs] = path.split('?')
  if (base === '/') return loc.pathname === '/'
  if (qs) return loc.pathname === base && loc.search.includes(qs.split('=')[1])
  return loc.pathname === base || loc.pathname.startsWith(base + '/')
}

const estiloTab = (on) => ({
  flex: 1, minWidth: 0, padding: '8px 2px 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  textDecoration: 'none', color: on ? 'var(--color-primary)' : '#6B7280', fontSize: 10, fontWeight: on ? 800 : 600,
  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
})

/**
 * Versión móvil de la aplicación (todos los roles): barra superior compacta, contenido y
 * menú inferior. Para el administrador, la pestaña «Asistente» (ruta `/`) es el chat operativo
 * a pantalla completa y queda montado al cambiar de pestaña para no perder la conversación.
 */
export default function MobileShell() {
  const { perfil, user } = useApp()
  const loc = useLocation()
  const navigate = useNavigate()
  const [masAbierto, setMasAbierto] = useState(false)

  const rolId = perfil?.rol_id || user?.user_metadata?.rol_id
  const { tabs, mas, chat } = menuMovil(rolId, perfil)
  const enChat = !!chat && loc.pathname === '/'
  const hayMas = mas.length > 0
  const masActivo = mas.some(s => s.items.some(i => activa(i.path, loc)))
  const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || user?.email?.split('@')[0] || ''

  const ir = (path) => { setMasAbierto(false); navigate(path) }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)', overflow: 'hidden' }}>
      <header style={{ flexShrink: 0, background: 'var(--color-primary)', color: 'white', padding: 'calc(8px + env(safe-area-inset-top)) 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img src={`/icons/${claveIcono(rolId)}-192.png`} alt="" width={32} height={32} style={{ borderRadius: 8, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              IRP
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(232,160,32,0.3)', color: '#F5C26B' }}>
                {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''}
              </span>
              {import.meta.env.VITE_AMBIENTE === 'QA' && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#7C3AED' }}>QA</span>}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</div>
          </div>
        </div>
        <button onClick={() => signOut()} title="Salir" style={{ width: 38, height: 38, border: 'none', borderRadius: 12, background: 'rgba(255,255,255,0.18)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LogOut size={17} />
        </button>
      </header>

      <main style={{ flex: 1, minHeight: 0, overflowY: enChat ? 'hidden' : 'auto', WebkitOverflowScrolling: 'touch' }}>
        {chat && (
          <div style={{ display: enChat ? 'block' : 'none', height: '100%' }}>
            <ChatOperativo movil pathname={loc.pathname} onAbrirRuta={ir}
              saludo="¡Hola! Soy tu asistente de IRP. Mándame tickets, fichas de depósito, INE, contratos o comprobantes (con la cámara o desde tus archivos) y me encargo del alta, el cobro o el registro. También pregúntame por cobranza, contratos, gastos, personal o cualquier tablero." />
          </div>
        )}
        {!enChat && <RutasMovil rolId={rolId} perfil={perfil} />}
      </main>

      <nav style={{ flexShrink: 0, display: 'flex', background: 'white', borderTop: '1px solid #E5E7EB', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(({ label, path, icon: Icono, accion }) => accion === 'salir' ? (
          <button key={label} onClick={() => signOut()} style={estiloTab(false)}>
            <Icono size={22} /><span>{label}</span>
          </button>
        ) : (
          <NavLink key={label} to={path} style={estiloTab(activa(path, loc))}>
            <Icono size={22} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{label}</span>
          </NavLink>
        ))}
        {hayMas && (
          <button onClick={() => setMasAbierto(true)} style={estiloTab(masActivo || masAbierto)}>
            <MoreHorizontal size={22} /><span>Más</span>
          </button>
        )}
      </nav>

      {masAbierto && (
        <div onClick={() => setMasAbierto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '82dvh', overflowY: 'auto', background: 'white', borderRadius: '18px 18px 0 0', padding: '14px 14px calc(14px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong style={{ fontSize: 16 }}>Todos los módulos</strong>
              <button onClick={() => setMasAbierto(false)} style={{ border: 'none', background: '#F3F4F6', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {mas.map(sec => (
              <div key={sec.label}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', margin: '12px 2px 6px' }}>{sec.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {sec.items.map(({ label, path, icon: Icono }) => {
                    const on = activa(path, loc)
                    return (
                      <button key={path} onClick={() => ir(path)} style={{ minHeight: 76, padding: '10px 4px', border: `1.5px solid ${on ? 'var(--color-primary)' : '#E5E7EB'}`, background: on ? 'rgba(10,102,194,0.08)' : 'white', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: on ? 'var(--color-primary)' : '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Icono size={22} /><span style={{ textAlign: 'center', lineHeight: 1.15 }}>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <button onClick={() => signOut()} style={{ marginTop: 16, width: '100%', minHeight: 46, border: '1.5px solid #FECACA', background: '#FEF2F2', color: 'var(--color-danger)', borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  )
}
