// Helpers, constantes y micro-componentes compartidos del módulo RH
// Extraído de src/pages/RH.jsx — sin cambios de lógica

export function fmt$(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const AVATAR_COLORS = ['#0A66C2', '#057642', '#E8A020', '#B24020', '#6B21A8', '#0F766E', '#9D174D', '#92400E']
export function Avatar({ nombre, foto, size = 36 }) {
  if (foto) return <img src={foto} alt={nombre} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  const initials = (nombre || 'NN').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
  const color = AVATAR_COLORS[(nombre || '').charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33 + 'px', fontWeight: 700, color, flexShrink: 0, border: `1.5px solid ${color}44` }}>
      {initials}
    </div>
  )
}

export function SemaforoContrato({ valor, fechaFin }) {
  const MAP = { VENCIDO: ['var(--color-danger)', 'Vencido'], CRITICO: ['var(--color-danger)', 'Crítico'], ALERTA: ['var(--color-warning)', 'Alerta'], OK: ['var(--color-success)', ''], INDETERMINADO: ['#6B7280', 'Indefinido'] }
  const [color, label] = MAP[valor] || ['#6B7280', valor]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>
        {valor === 'INDETERMINADO' ? 'Indefinido' : (fechaFin ?? label)}
      </span>
    </div>
  )
}

export const TIPOS_DOC = ['INE', 'CURP', 'NSS', 'Comprobante domicilio', 'Foto', 'Contrato', 'Acta nacimiento', 'RFC', 'Carta no antecedentes']
export const TIPOS_CONTRATO = [
  { id: 'TEMPORAL_3SEM', label: 'Temporal 3 semanas' },
  { id: 'TEMPORAL_30D',  label: 'Temporal 30 días' },
  { id: 'PRUEBA_90',     label: 'Prueba 90 días' },
  { id: 'INDEFINIDO',    label: 'Tiempo indefinido' },
]
export const ETAPAS_CANDIDATO = ['NUEVO', 'DOCUMENTOS', 'ENTREVISTA', 'OFERTA', 'ACEPTADO', 'RECHAZADO']
export const ETAPA_COLOR = { NUEVO: '#6B7280', DOCUMENTOS: '#E8A020', ENTREVISTA: '#0A66C2', OFERTA: '#8B5CF6', ACEPTADO: '#057642', RECHAZADO: '#B24020' }
export const MOTIVOS_RECHAZO = ['No cumple perfil', 'No pasó entrevista', 'Documentos incompletos', 'No se presentó', 'Salario no acordado', 'Ya no está disponible', 'Otro']

export function FieldWrapper({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-light)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>
      {children}
    </div>
  )
}
export function NominaInput({ value, onChange }) {
  return (
    <input type="number" step="0.01" min="0"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{ width:72, padding:'4px 6px', border:'1px solid #E5E7EB', borderRadius:5, fontSize:12, textAlign:'right' }} />
  )
}
