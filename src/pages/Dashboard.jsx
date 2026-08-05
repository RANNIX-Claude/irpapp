import { useState } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { Building2, FileText, CreditCard, Users, TrendingUp, AlertTriangle, X, Car } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import AgenteAnalitico from '../components/agents/AgenteAnalitico'
import { usePRP } from '../hooks/usePRP'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

function AlertaContrato({ c }) {
  const dias = c.dias_restantes
  const color = dias <= 30 ? 'var(--color-danger)' : 'var(--color-warning)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.arrendatario_nombre}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre} · {c.unidad_numero}</div>
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color, flexShrink: 0 }}>
        {dias <= 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d`}
      </div>
    </div>
  )
}

function DrillDrawer({ titulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ width: '440px', maxWidth: '95vw', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', padding: '4px' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '16px 20px', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}

function DrillOcupacion({ onClose }) {
  const { data, loading } = usePRP('prp_unidades')
  const lista = data ?? []
  const ocupadas = lista.filter(u => u.estatus === 'OCUPADO' || u.estatus === 'RENTADO' || u.estatus === 'VIGENTE')
  const disponibles = lista.filter(u => u.estatus === 'DISPONIBLE' || u.estatus === 'LIBRE')
  return (
    <DrillDrawer titulo={`Ocupación — ${lista.length} unidades`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, padding: '10px', background: '#EFF6FF', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{ocupadas.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Ocupadas</div>
            </div>
            <div style={{ flex: 1, padding: '10px', background: '#F0FDF4', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)' }}>{disponibles.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>Disponibles</div>
            </div>
          </div>
          {lista.map(u => (
            <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.numero_local || u.numero || u.id}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{u.inmueble_nombre || u.inmueble} · {u.tipo || 'Local'}</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                background: u.estatus === 'DISPONIBLE' || u.estatus === 'LIBRE' ? '#F0FDF4' : '#EFF6FF',
                color: u.estatus === 'DISPONIBLE' || u.estatus === 'LIBRE' ? 'var(--color-success)' : 'var(--color-primary)' }}>
                {u.estatus}
              </span>
            </div>
          ))}
          {lista.length === 0 && <div style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>Sin datos</div>}
        </>
      )}
    </DrillDrawer>
  )
}

function DrillCobranza({ onClose }) {
  const { data, loading } = usePRP('prp_cobros', {
    filters: [['estatus', 'eq', 'PENDIENTE']],
    order: { col: 'fecha_limite_pago', asc: true },
    limit: 30,
  })
  const lista = data ?? []
  const total = lista.reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)
  return (
    <DrillDrawer titulo={`Cobros Pendientes (${lista.length})`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : (
        <>
          <div style={{ padding: '12px', background: '#FFF7ED', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-light)' }}>Total pendiente</span>
            <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{fmt(total)}</span>
          </div>
          {lista.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.arrendatario_nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre} · {c.mes}/{c.anio}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-warning)' }}>{fmt(c.monto_total)}</div>
            </div>
          ))}
          {lista.length === 0 && <div style={{ color: 'var(--color-success)', fontSize: '13px' }}>✓ Sin cobros pendientes</div>}
        </>
      )}
    </DrillDrawer>
  )
}

function DrillMora({ onClose }) {
  const { data, loading } = usePRP('prp_cobros', {
    filters: [['estatus', 'eq', 'VENCIDO']],
    order: { col: 'fecha_limite_pago', asc: true },
    limit: 30,
  })
  const lista = data ?? []
  const total = lista.reduce((a, b) => a + (parseFloat(b.monto_total) || 0), 0)
  return (
    <DrillDrawer titulo={`Cartera en Mora (${lista.length})`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : (
        <>
          <div style={{ padding: '12px', background: '#FEF2F2', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-light)' }}>Total vencido</span>
            <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{fmt(total)}</span>
          </div>
          {lista.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.arrendatario_nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{c.inmueble_nombre} · vto {c.fecha_limite_pago}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-danger)' }}>{fmt(c.monto_total)}</div>
            </div>
          ))}
          {lista.length === 0 && <div style={{ color: 'var(--color-success)', fontSize: '13px' }}>✓ Sin mora</div>}
        </>
      )}
    </DrillDrawer>
  )
}

function DrillOTs({ onClose }) {
  const { data, loading } = usePRP('prp_mantenimiento', {
    filters: [['estatus', 'neq', 'COMPLETADO']],
    order: { col: 'fecha_reporte', asc: true },
    limit: 30,
  })
  const lista = data ?? []
  const PRIO_COLOR = { URGENTE: 'var(--color-danger)', ALTA: 'var(--color-warning)', MEDIA: 'var(--color-primary)', BAJA: '#9CA3AF' }
  return (
    <DrillDrawer titulo={`OT Pendientes (${lista.length})`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : lista.map(o => (
        <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{o.descripcion || o.titulo}</div>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px',
              background: (PRIO_COLOR[o.prioridad] || '#E5E7EB') + '20',
              color: PRIO_COLOR[o.prioridad] || '#9CA3AF' }}>{o.prioridad}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{o.inmueble_nombre} · {o.numero_local} · {o.estatus}</div>
        </div>
      ))}
      {lista.length === 0 && <div style={{ color: 'var(--color-success)', fontSize: '13px' }}>✓ Sin OTs pendientes</div>}
    </DrillDrawer>
  )
}

function DrillEmpleados({ onClose }) {
  const { data, loading } = usePRP('prp_empleados', {
    filters: [['estatus', 'eq', 'ACTIVO']],
    order: { col: 'nombre_completo', asc: true },
  })
  const lista = data ?? []
  return (
    <DrillDrawer titulo={`Empleados Activos (${lista.length})`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : lista.map(e => (
        <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{e.nombre_completo}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{e.puesto} · {e.departamento}</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700 }}>{fmt(e.salario_neto || e.salario_mensual)}</div>
        </div>
      ))}
      {lista.length === 0 && <div style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>Sin empleados</div>}
    </DrillDrawer>
  )
}

function DrillCajones({ onClose }) {
  const { data, loading } = usePRP('prp_estacionamiento', {
    filters: [['estatus', 'eq', 'DISPONIBLE']],
  })
  const lista = data ?? []
  return (
    <DrillDrawer titulo={`Cajones Disponibles (${lista.length})`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {lista.map(c => (
            <div key={c.id} style={{ padding: '10px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-success)' }}>#{c.numero_cajon}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>{c.tipo || 'General'}</div>
            </div>
          ))}
        </div>
      )}
      {lista.length === 0 && <div style={{ color: 'var(--color-text-light)', fontSize: '13px' }}>Sin cajones disponibles</div>}
    </DrillDrawer>
  )
}

const DRILLS = {
  ocupacion: DrillOcupacion,
  cobranza: DrillCobranza,
  mora: DrillMora,
  ots: DrillOTs,
  empleados: DrillEmpleados,
  cajones: DrillCajones,
}

export default function Dashboard() {
  useModuleAudit('DASHBOARD')
  const [drill, setDrill] = useState(null)
  const { data: kpis, loading: kLoading } = usePRP('prp_kpis', { single: true })
  const { data: alertas } = usePRP('prp_contratos', {
    filters: [['semaforo_vencimiento', 'in', '("CRITICO","ALERTA","VENCIDO")']],
    order: { col: 'dias_restantes', asc: true },
    limit: 8,
  })

  const dataSummary = {
    sistema: 'IRP — Inmueble Resource Planning',
    modulos: ['Inmuebles', 'Contratos', 'Cobranza', 'RH', 'Estacionamiento'],
    descripcion: 'Plataforma SaaS para administración de plazas comerciales en México',
    kpis: kpis ?? {},
  }

  if (kLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  const k = kpis ?? {}
  const DrillComponent = drill ? DRILLS[drill] : null

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Panel General</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-light)' }}>Haz clic en cualquier KPI para ver el detalle</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div onClick={() => setDrill('ocupacion')} style={{ cursor: 'pointer' }}>
            <KPICard title="Ocupación" value={k.pct_ocupacion ? `${parseFloat(k.pct_ocupacion).toFixed(0)}%` : '--'} subtitle="Clic para ver unidades" icon={TrendingUp} color="var(--color-success)" />
          </div>
          <div onClick={() => setDrill('cobranza')} style={{ cursor: 'pointer' }}>
            <KPICard title="Ingresos Renta" value={k.ingresos_renta_mes ? `$${(parseFloat(k.ingresos_renta_mes)/1000).toFixed(0)}K` : '--'} subtitle="Clic para ver cobros" icon={CreditCard} color="var(--color-secondary)" />
          </div>
          <div onClick={() => setDrill('empleados')} style={{ cursor: 'pointer' }}>
            <KPICard title="Empleados Activos" value={k.total_empleados_activos ?? '--'} subtitle="Clic para ver RH" icon={Users} color="var(--color-primary)" />
          </div>
          <div onClick={() => setDrill('mora')} style={{ cursor: 'pointer' }}>
            <KPICard title="Cartera Mora" value={k.cartera_mora ? `$${parseFloat(k.cartera_mora).toLocaleString()}` : '$0'} subtitle="Clic para ver vencidos" icon={AlertTriangle} color="var(--color-danger)" />
          </div>
          <div onClick={() => setDrill('ots')} style={{ cursor: 'pointer' }}>
            <KPICard title="OT Pendientes" value={k.ot_pendientes ?? '--'} subtitle="Clic para ver OTs" icon={FileText} color="var(--color-warning)" />
          </div>
          <div onClick={() => setDrill('cajones')} style={{ cursor: 'pointer' }}>
            <KPICard title="Cajones Libres" value={k.cajones_disponibles ?? '--'} subtitle="Clic para ver disponibles" icon={Car} color="var(--color-primary-dark)" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        <AgenteAnalitico dataSummary={dataSummary} />
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Contratos por Vencer</h3>
            <AlertTriangle size={16} color="var(--color-warning)" />
          </div>
          {!alertas || alertas.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-light)', textAlign: 'center', padding: '20px 0' }}>Sin alertas</div>
          ) : (
            alertas.map(c => <AlertaContrato key={c.id} c={c} />)
          )}
        </div>
      </div>

      {DrillComponent && <DrillComponent onClose={() => setDrill(null)} />}
    </div>
  )
}
