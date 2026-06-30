import { Building2, FileText, CreditCard, Users, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import DummyTable from '../components/dummy/DummyTable'
import AgenteAnalitico from '../components/agents/AgenteAnalitico'

export default function Dashboard() {
  const dataSummary = {
    sistema: 'IRP - Inmueble Resource Planning',
    modulos: ['Inmuebles', 'Contratos', 'Cobranza', 'RH', 'Estacionamiento'],
    descripcion: 'Plataforma SaaS para administracion de inmuebles comerciales en Mexico',
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPIs */}
      <div>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
          Panel General
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <KPICard title="Unidades Totales" value="--" subtitle="Inmuebles registrados" icon={Building2} color="var(--color-primary)" />
          <KPICard title="Contratos Activos" value="--" subtitle="Vigentes este mes" icon={FileText} color="var(--color-success)" />
          <KPICard title="Cobranza del Mes" value="--" subtitle="Pendiente de cobrar" icon={CreditCard} color="var(--color-secondary)" />
          <KPICard title="Arrendatarios" value="--" subtitle="Activos en el sistema" icon={Users} color="var(--color-primary-dark)" />
          <KPICard title="Ocupacion" value="--%" subtitle="Unidades rentadas / total" icon={TrendingUp} color="var(--color-success)" />
          <KPICard title="Alertas" value="--" subtitle="Contratos por vencer" icon={AlertTriangle} color="var(--color-warning)" />
        </div>
      </div>

      {/* Estado de la plataforma */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Estado de la Plataforma</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            { label: 'React + Vite', ok: true },
            { label: 'Supabase conectado', ok: true },
            { label: 'Netlify Functions', ok: true },
            { label: 'Claude API (Agentes IA)', ok: true },
            { label: 'Google OAuth', ok: true },
            { label: 'Data Warehouse (dw.*)', ok: true },
            { label: 'Identidad visual RANNIX', ok: true },
            { label: 'PWA / Mobile first', ok: true },
          ].map(({ label, ok }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              {ok
                ? <CheckCircle size={15} color="var(--color-success)" />
                : <Clock size={15} color="var(--color-warning)" />}
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Agente Analitico */}
      <AgenteAnalitico dataSummary={dataSummary} />

      {/* Tabla dummy - prueba conexion */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600 }}>Verificacion de Conexion</h3>
        <DummyTable />
      </div>
    </div>
  )
}
