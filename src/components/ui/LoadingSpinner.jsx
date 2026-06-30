export default function LoadingSpinner({ size = 32, label = 'Cargando...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '12px' }}>
      <div style={{
        width: size, height: size, border: '3px solid var(--color-neutral)',
        borderTopColor: 'var(--color-primary)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: '13px', color: 'var(--color-text-light)' }}>{label}</span>
    </div>
  )
}
