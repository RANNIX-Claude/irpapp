import { Construction } from 'lucide-react'

export default function ComingSoon({ modulo }) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-light)' }}>
      <Construction size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>
        Modulo: {modulo}
      </h2>
      <p style={{ fontSize: '14px', margin: 0 }}>
        Este modulo esta en construccion. Disponible en el siguiente sprint.
      </p>
    </div>
  )
}
