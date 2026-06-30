import { PackageOpen } from 'lucide-react'
export default function EmptyState({ title = 'Sin registros', description = 'No hay datos para mostrar', action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', gap: '12px', color: 'var(--color-text-light)' }}>
      <PackageOpen size={48} style={{ opacity: 0.3 }} />
      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '300px' }}>{description}</div>
      {action}
    </div>
  )
}
