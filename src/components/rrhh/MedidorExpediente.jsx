import { fmt$ } from './rh-helpers'

// Documentos que cuentan para el porcentaje de expediente completo.
// FOTO y CONSTANCIA_MEDICA quedan fuera a proposito: se archivan si existen,
// pero no bloquean la completitud del expediente.
export const DOCS_OBLIGATORIOS = ['CONTRATO','INE','CURP','NSS','COMPROBANTE_DOM','ACTA_NAC','RFC']

// Mismo medidor que el encabezado del expediente, en tamaño de tarjeta.
export default function MedidorExpediente({ docs = [], size = 46 }) {
  const presentes = DOCS_OBLIGATORIOS.filter(t => docs.some(d => d.tipo === t)).length
  const pct = Math.round(presentes / DOCS_OBLIGATORIOS.length * 100)
  const color = pct === 100 ? '#057642' : pct >= 60 ? '#F59E0B' : '#B24020'
  const r = size / 2 - 4, circ = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ - (pct/100)*circ}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
        Expediente<br />{presentes}/{DOCS_OBLIGATORIOS.length} docs
      </div>
    </div>
  )
}
