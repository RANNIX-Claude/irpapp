export default function KPICard({ title, value, subtitle, icon: Icon, color = 'var(--color-primary)', trend }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--border-radius)',
      boxShadow: 'var(--shadow-sm)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
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
    </div>
  )
}
