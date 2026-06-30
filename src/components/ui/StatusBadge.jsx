const STATUS_COLORS = {
  VIGENTE:     { bg: '#DCFCE7', text: '#166534' },
  DISPONIBLE:  { bg: '#DBEAFE', text: '#1e40af' },
  VENCIDO:     { bg: '#FEE2E2', text: '#991b1b' },
  EN_MORA:     { bg: '#FEF3C7', text: '#92400e' },
  PENDIENTE:   { bg: '#FEF3C7', text: '#92400e' },
  COMPLETADO:  { bg: '#DCFCE7', text: '#166534' },
  CANCELADO:   { bg: '#F3F4F6', text: '#374151' },
  EN_PROCESO:  { bg: '#EFF6FF', text: '#1d4ed8' },
  MANTENIMIENTO: { bg: '#F3F4F6', text: '#4B5563' },
  ACTIVO:      { bg: '#DCFCE7', text: '#166534' },
  INACTIVO:    { bg: '#F3F4F6', text: '#6B7280' },
}

export default function StatusBadge({ status, label }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F3F4F6', text: '#374151' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
      background: colors.bg, color: colors.text,
    }}>
      {label ?? status}
    </span>
  )
}
