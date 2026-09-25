import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, X, Bot } from 'lucide-react'
import ChatOperativo from './ChatOperativo'

// Chat flotante del escritorio. La lógica vive en ChatOperativo, que también usa la
// pantalla completa del rol asistente (celular).
export default function AgenteOperativo() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

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
        width: '380px', height: '520px', background: 'white',
        borderRadius: '14px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        flexDirection: 'column', overflow: 'hidden', border: '1px solid #E5E7EB',
      }}>
        <div style={{ background: 'var(--color-primary)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={20} color="white" />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Agente Operativo</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>IRP — RANNIX Consulting</div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatOperativo onAbrirRuta={ruta => { setOpen(false); navigate(ruta) }} />
        </div>
      </div>
    </>
  )
}
