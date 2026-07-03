import { useState } from 'react'
import { UserPlus, Plus, Search, Phone, Mail, Building2, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'

const PROSPECTOS = [
  { id: 'PROS-001', nombre: 'Cervecería del Pacífico SA', contacto: 'Lic. Morales Espinoza', telefono: '667-111-2222', email: 'arrendamiento@cervpac.mx', giro: 'Alimentos y Bebidas', unidad_interes: 'Local L-08 (120m²)', etapa: 'Negociación', origen: 'Referido', fecha_contacto: '2026-05-15', probabilidad: 75, renta_esperada: 24000 },
  { id: 'PROS-002', nombre: 'Clínica Dental Sonrisa SA', contacto: 'Dr. Gómez Leyva', telefono: '668-222-3333', email: 'clinica.sonrisa@gmail.com', giro: 'Salud', unidad_interes: 'Consultorio C-03 (45m²)', etapa: 'Propuesta enviada', origen: 'Web', fecha_contacto: '2026-06-02', probabilidad: 60, renta_esperada: 12000 },
  { id: 'PROS-003', nombre: 'Gym Fit Zone SC', contacto: 'Sr. Valenzuela Cruz', telefono: '669-333-4444', email: 'fitzone@gmail.com', giro: 'Deportes', unidad_interes: 'Local L-12 (200m²)', etapa: 'Primer contacto', origen: 'Visita directa', fecha_contacto: '2026-06-18', probabilidad: 40, renta_esperada: 38000 },
  { id: 'PROS-004', nombre: 'Notaría Pública No. 42', contacto: 'Lic. Rodríguez Bernal', telefono: '667-444-5555', email: 'notaria42@outlook.com', giro: 'Servicios Legales', unidad_interes: 'Oficina OF-07 (80m²)', etapa: 'Visita agendada', origen: 'Referido', fecha_contacto: '2026-06-25', probabilidad: 85, renta_esperada: 18000 },
  { id: 'PROS-005', nombre: 'Tienda de Ropa Mirage', contacto: 'Sra. Espinoza Tapia', telefono: '668-555-6666', email: 'mirage.moda@gmail.com', giro: 'Moda', unidad_interes: 'Local L-04 (90m²)', etapa: 'Cerrado — Ganado', origen: 'Redes sociales', fecha_contacto: '2026-04-10', probabilidad: 100, renta_esperada: 20000 },
  { id: 'PROS-006', nombre: 'Ferretería El Constructor', contacto: 'Sr. Tapia Mendoza', telefono: '669-666-7777', email: 'constructor@ferreteria.mx', giro: 'Ferretería', unidad_interes: 'Bodega B-02 (300m²)', etapa: 'Cerrado — Perdido', origen: 'Campaña email', fecha_contacto: '2026-03-20', probabilidad: 0, renta_esperada: 45000 },
]

const ETAPA_COLORS = {
  'Primer contacto': '#EFF6FF', 'Visita agendada': '#FFF7ED', 'Propuesta enviada': '#F0FDF4',
  'Negociación': '#FEF9C3', 'Cerrado — Ganado': '#DCFCE7', 'Cerrado — Perdido': '#FEE2E2',
}
const ETAPA_TEXT = {
  'Primer contacto': '#1E40AF', 'Visita agendada': '#9A3412', 'Propuesta enviada': '#166534',
  'Negociación': '#854D0E', 'Cerrado — Ganado': '#166534', 'Cerrado — Perdido': '#991B1B',
}
const ETAPAS = ['Todas', 'Primer contacto', 'Visita agendada', 'Propuesta enviada', 'Negociación', 'Cerrado — Ganado', 'Cerrado — Perdido']

export default function Prospectos() {
  const [search, setSearch] = useState('')
  const [etapa, setEtapa] = useState('Todas')
  const [selected, setSelected] = useState(null)

  const filtrados = PROSPECTOS.filter(p => {
    const q = search.toLowerCase()
    const match = p.nombre.toLowerCase().includes(q) || p.giro.toLowerCase().includes(q)
    const e = etapa === 'Todas' || p.etapa === etapa
    return match && e
  })

  const activos = PROSPECTOS.filter(p => !p.etapa.startsWith('Cerrado')).length
  const ganados = PROSPECTOS.filter(p => p.etapa === 'Cerrado — Ganado').length
  const valPipeline = PROSPECTOS.filter(p => !p.etapa.startsWith('Cerrado')).reduce((a, b) => a + b.renta_esperada, 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Prospectos y CRM</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{PROSPECTOS.length} prospectos registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Prospecto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Prospectos Activos" value={activos} icon={UserPlus} color="var(--color-primary)" />
        <KPICard title="Cierres del Mes" value={ganados} icon={CheckCircle} color="var(--color-success)" />
        <KPICard title="Pipeline Mensual" value={`$${(valPipeline / 1000).toFixed(0)}K`} icon={TrendingUp} color="var(--color-secondary)" />
        <KPICard title="Visitas Agendadas" value="2" icon={Clock} color="var(--color-warning)" />
      </div>

      {/* Pipeline visual */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Pipeline de ventas</div>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'stretch' }}>
          {['Primer contacto', 'Visita agendada', 'Propuesta enviada', 'Negociación'].map((etapaNombre, i) => {
            const count = PROSPECTOS.filter(p => p.etapa === etapaNombre).length
            return (
              <div key={etapaNombre} style={{ flex: 1, padding: '10px 12px', background: ETAPA_COLORS[etapaNombre], borderRadius: '6px', borderLeft: i > 0 ? '2px solid white' : 'none' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: ETAPA_TEXT[etapaNombre], textTransform: 'uppercase', marginBottom: '4px' }}>{etapaNombre}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: ETAPA_TEXT[etapaNombre] }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar prospecto o giro..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={etapa} onChange={e => setEtapa(e.target.value)} style={{ padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', background: 'white' }}>
          {ETAPAS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
        {filtrados.map(p => (
          <div key={p.id} onClick={() => setSelected(p)} style={{ background: 'white', borderRadius: '10px', border: '1.5px solid', borderColor: selected?.id === p.id ? 'var(--color-primary)' : '#E5E7EB', padding: '18px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.nombre}</div>
              <span style={{ padding: '2px 8px', borderRadius: '20px', background: ETAPA_COLORS[p.etapa], color: ETAPA_TEXT[p.etapa], fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.etapa}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '10px' }}>
              <div style={{ marginBottom: '4px' }}><Building2 size={11} style={{ display: 'inline', marginRight: '5px' }} />{p.giro} · {p.unidad_interes}</div>
              <div style={{ marginBottom: '4px' }}><Phone size={11} style={{ display: 'inline', marginRight: '5px' }} />{p.contacto} — {p.telefono}</div>
              <div><Mail size={11} style={{ display: 'inline', marginRight: '5px' }} />{p.email}</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-success)' }}>${p.renta_esperada.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-light)' }}>Renta esperada</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Probabilidad</span><span style={{ fontWeight: 700 }}>{p.probabilidad}%</span>
                </div>
                <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${p.probabilidad}%`, background: p.probabilidad >= 80 ? 'var(--color-success)' : p.probabilidad >= 50 ? 'var(--color-warning)' : 'var(--color-danger)', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
