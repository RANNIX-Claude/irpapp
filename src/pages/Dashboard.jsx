import { useModuleAudit } from '../hooks/useAudit'
import { Building2, FileText, CreditCard, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import AgenteAnalitico from '../components/agents/AgenteAnalitico'
import { usePRP } from '../hooks/usePRP'

function AlertaContrato({ c }) {
  const dias = c.dias_restantes
  const color = dias <= 30 ? 'var(--color-danger)' : 'var(--color-warning)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.arrendatario_nombre}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
          {c.inmueble_nombre} · {c.unidad_numero}
        </div>
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color, flexShrink: 0 }}>
        {dias <= 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d`}
      </div>
    </div>
  )
}

export default function Dashboard() {
  useModuleAudit('DASHBOARD')
  const { data: kpis, loading: kLoading } = usePRP('prp_kpis', { single: true })
  const { data: alertas } = usePRP('prp_contratos', {
    filters: [['semaforo_vencimiento', 'in', '("CRITICO","ALERTA","VENCIDO")']],
    order: { col: 'dias_restantes', asc: true },
    limit: 8,
  })
  const { data: arrendatarios } = usePRP('prp_arrendatarios', {
    filters: [['estado_id', 'neq', 'INACTIVO']],
    limit: 1,
    select: 'id',
  })

  const dataSummary = {
    sistema: 'PRP — Property Resource Planning',
    modulos: ['Inmuebles', 'Contratos', 'Cobranza', 'RH', 'Estacionamiento'],
    descripcion: 'Plataforma SaaS para administracion de plazas comerciales en México',
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

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPIs */}
      <div>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
          Panel General
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <KPICard title="Ocupación" value={k.pct_ocupacion ? `${parseFloat(k.pct_ocupacion).toFixed(0)}%` : '--'} subtitle="Unidades rentadas / total" icon={TrendingUp} color="var(--color-success)" />
          <KPICard title="Ingresos Renta" value={k.ingresos_renta_mes ? `$${(parseFloat(k.ingresos_renta_mes)/1000).toFixed(0)}K` : '--'} subtitle="Este mes" icon={CreditCard} color="var(--color-secondary)" />
          <KPICard title="Empleados Activos" value={k.total_empleados_activos ?? '--'} subtitle="RH activos" icon={Users} color="var(--color-primary)" />
          <KPICard title="Cartera Mora" value={k.cartera_mora ? `$${parseFloat(k.cartera_mora).toLocaleString()}` : '$0'} subtitle="Saldo vencido" icon={AlertTriangle} color="var(--color-danger)" />
          <KPICard title="OT Pendientes" value={k.ot_pendientes ?? '--'} subtitle="Órdenes de trabajo" icon={FileText} color="var(--color-warning)" />
          <KPICard title="Cajones Libres" value={k.cajones_disponibles ?? '--'} subtitle="Estacionamiento" icon={Building2} color="var(--color-primary-dark)" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        {/* Agente Analítico */}
        <AgenteAnalitico dataSummary={dataSummary} />

        {/* Alertas contratos */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Contratos por Vencer</h3>
            <AlertTriangle size={16} color="var(--color-warning)" />
          </div>
          {!alertas || alertas.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-light)', textAlign: 'center', padding: '20px 0' }}>
              Sin alertas
            </div>
          ) : (
            alertas.map(c => <AlertaContrato key={c.id} c={c} />)
          )}
        </div>
      </div>
    </div>
  )
}
