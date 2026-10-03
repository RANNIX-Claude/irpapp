import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

export default function KPICard({ title, value, subtitle, icon: Icon, color = 'var(--color-primary)', trend, onClick, activo, ayuda }) {
  const [verAyuda, setVerAyuda] = useState(false)
  const clickeable = !!onClick

  return (
    <div onClick={onClick} style={{
      background: 'var(--color-surface)', borderRadius: 'var(--border-radius)',
      boxShadow: activo ? `0 0 0 2px ${color}` : 'var(--shadow-sm)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      borderLeft: `4px solid ${color}`,
      cursor: clickeable ? 'pointer' : 'default',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {title}
            </div>
            {ayuda && (
              <button type="button"
                onClick={e => { e.stopPropagation(); setVerAyuda(v => !v) }}
                title="Cómo se calcula"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: '#9CA3AF', flexShrink: 0 }}>
                <HelpCircle size={13} />
              </button>
            )}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>
            {value}
          </div>
        </div>
        {Icon && (
          <div style={{
            background: color + '1A', borderRadius: '8px', padding: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color={color} />
          </div>
        )}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{subtitle}</div>
      )}
      {trend && (
        <div style={{ fontSize: '12px', color: trend > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
        </div>
      )}
      {clickeable && (
        <div style={{ fontSize: '10px', color: activo ? color : '#9CA3AF', fontWeight: 600 }}>
          {activo ? '● Filtro activo — clic para quitar' : 'Clic para filtrar'}
        </div>
      )}
      {verAyuda && ayuda && (
        <div onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 20, width: '260px', maxWidth: '80vw',
            background: '#1F2937', color: 'white', fontSize: '11.5px', lineHeight: 1.5, padding: '10px 12px',
            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          {ayuda}
        </div>
      )}
    </div>
  )
}
