import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, X, Bot, Maximize2, Minimize2 } from 'lucide-react'
import ChatOperativo from './ChatOperativo'

const TAMANO = {
  normal:   { width: '380px', height: '520px' },
  ampliado: { width: '640px', height: '760px' },
}

// Chat flotante del escritorio. La lógica vive en ChatOperativo, que también usa la
// pantalla completa del rol asistente (celular).
export default function AgenteOperativo() {
  const [open, setOpen] = useState(false)
  const [ampliado, setAmpliado] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tam = ampliado ? TAMANO.ampliado : TAMANO.normal

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--color-primary)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(10,102,194,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(10,102,194,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(10,102,194,0.4)' }}
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
      </button>

      {/* Panel. Se mantiene montado al cerrarlo para no perder la conversación. */}
      <div style={{
        display: open ? 'flex' : 'none',
        position: 'fixed', bottom: '92px', right: '24px', zIndex: 199,
        width: tam.width, height: tam.height, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 116px)',
        background: 'white', borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        flexDirection: 'column', overflow: 'hidden', border: '1px solid #E5E7EB',
        transition: 'width 0.18s ease, height 0.18s ease',
      }}>
        <div style={{ background: 'var(--color-primary)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={20} color="white" />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Agente Operativo</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>IRP — RANNIX Consulting</div>
          </div>
          <button onClick={() => setAmpliado(a => !a)} title={ampliado ? 'Reducir ventana' : 'Ampliar ventana'}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '7px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            {ampliado ? <Minimize2 size={14} color="white" /> : <Maximize2 size={14} color="white" />}
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatOperativo ampliado={ampliado} pathname={pathname} onAbrirRuta={ruta => { setOpen(false); navigate(ruta) }} />
        </div>
      </div>
    </>
  )
}
