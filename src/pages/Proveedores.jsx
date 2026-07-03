import { useState } from 'react'
import { Truck, Plus, Search, Star, Phone, Mail, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import StatusBadge from '../components/ui/StatusBadge'

const PROVEEDORES = [
  { id: 'PRV-001', nombre: 'Servicios Eléctricos del Noroeste SA', contacto: 'Ing. Pérez Rueda', telefono: '667-123-4567', email: 'contacto@senoreste.mx', categoria: 'Eléctrico', calificacion: 4.8, contratos_activos: 3, monto_anual: 285000, estado: 'ACTIVO', rfc: 'SEN920314KL2' },
  { id: 'PRV-002', nombre: 'Limpieza Industrial Sinaloa SC', contacto: 'Lic. Torres Medina', telefono: '668-234-5678', email: 'ventas@limpsin.mx', categoria: 'Limpieza', calificacion: 4.5, contratos_activos: 1, monto_anual: 96000, estado: 'ACTIVO', rfc: 'LIS050819AB3' },
  { id: 'PRV-003', nombre: 'Fontanería y Plomería del Pacífico', contacto: 'Sr. Ramírez López', telefono: '669-345-6789', email: 'fppacifico@gmail.com', categoria: 'Plomería', calificacion: 4.2, contratos_activos: 2, monto_anual: 54000, estado: 'ACTIVO', rfc: 'RPL780901FG4' },
  { id: 'PRV-004', nombre: 'Seguridad Privada GAMA SA de CV', contacto: 'Lic. Soto Carrillo', telefono: '667-456-7890', email: 'operaciones@gama-seg.mx', categoria: 'Seguridad', calificacion: 3.9, contratos_activos: 1, monto_anual: 420000, estado: 'ACTIVO', rfc: 'SGA991210HJ5' },
  { id: 'PRV-005', nombre: 'Materiales de Construcción Hernández', contacto: 'Sr. Hernández Vega', telefono: '668-567-8901', email: 'ventas@mchernandez.mx', categoria: 'Materiales', calificacion: 4.0, contratos_activos: 0, monto_anual: 0, estado: 'INACTIVO', rfc: 'HVE650715MN6' },
  { id: 'PRV-006', nombre: 'Clima y Refrigeración Norte', contacto: 'Ing. Acosta Ruiz', telefono: '667-678-9012', email: 'clima@crn.mx', categoria: 'HVAC', calificacion: 4.6, contratos_activos: 2, monto_anual: 180000, estado: 'ACTIVO', rfc: 'CRN110420OP7' },
]

const CATS = ['Todos', 'Eléctrico', 'Limpieza', 'Plomería', 'Seguridad', 'Materiales', 'HVAC']
const CAT_COLORS = { Eléctrico: '#FEF9C3', Limpieza: '#DCFCE7', Plomería: '#DBEAFE', Seguridad: '#FEE2E2', Materiales: '#F3E8FF', HVAC: '#E0F2FE' }
const CAT_TEXT = { Eléctrico: '#854D0E', Limpieza: '#166534', Plomería: '#1E40AF', Seguridad: '#991B1B', Materiales: '#6B21A8', HVAC: '#0C4A6E' }

export default function Proveedores() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Todos')
  const [selected, setSelected] = useState(null)

  const filtrados = PROVEEDORES.filter(p => {
    const q = search.toLowerCase()
    const match = p.nombre.toLowerCase().includes(q) || p.rfc.toLowerCase().includes(q)
    const c = cat === 'Todos' || p.categoria === cat
    return match && c
  })

  const activos = PROVEEDORES.filter(p => p.estado === 'ACTIVO').length
  const montoTotal = PROVEEDORES.reduce((a, b) => a + b.monto_anual, 0)
  const contratos = PROVEEDORES.reduce((a, b) => a + b.contratos_activos, 0)

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Proveedores</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>{PROVEEDORES.length} proveedores registrados</p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Proveedores Activos" value={activos} icon={Truck} color="var(--color-primary)" />
        <KPICard title="Contratos Vigentes" value={contratos} icon={FileText} color="var(--color-success)" />
        <KPICard title="Monto Anual" value={`$${(montoTotal / 1000).toFixed(0)}K`} icon={CheckCircle} color="var(--color-secondary)" />
        <KPICard title="Calificación Promedio" value="4.4★" icon={Star} color="var(--color-warning)" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor o RFC..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
              borderColor: cat === c ? 'var(--color-primary)' : '#E5E7EB',
              background: cat === c ? 'var(--color-primary)' : 'white',
              color: cat === c ? 'white' : 'var(--color-text-light)',
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
        {filtrados.map(p => (
          <div key={p.id} onClick={() => setSelected(p)} style={{ background: 'white', borderRadius: '10px', border: '1.5px solid', borderColor: selected?.id === p.id ? 'var(--color-primary)' : '#E5E7EB', padding: '18px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{p.nombre}</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-light)' }}>{p.rfc}</div>
              </div>
              <StatusBadge status={p.estado} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '20px', background: CAT_COLORS[p.categoria] || '#F3F4F6', color: CAT_TEXT[p.categoria] || 'var(--color-text)', fontSize: '11px', fontWeight: 700 }}>{p.categoria}</span>
              <span style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700 }}>{'★'.repeat(Math.floor(p.calificacion))} {p.calificacion}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} />{p.telefono}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} />{p.email}</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary)' }}>{p.contratos_activos}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Contratos</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-success)' }}>${p.monto_anual.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Monto anual</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-light)' }}>{p.contacto}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Contacto</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '500px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{selected.nombre}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-text-light)' }}>{selected.rfc}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            {[['Categoría', selected.categoria], ['Contacto', selected.contacto], ['Teléfono', selected.telefono], ['Email', selected.email], ['Calificación', `${selected.calificacion} / 5.0`], ['Contratos activos', selected.contratos_activos], ['Monto anual', `$${selected.monto_anual.toLocaleString()}`]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-text-light)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {['Ver contratos', 'Nueva OT', 'Evaluar'].map(label => (
                <button key={label} style={{ flex: 1, padding: '9px', border: '1.5px solid var(--color-primary)', borderRadius: '8px', color: 'var(--color-primary)', background: 'white', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
