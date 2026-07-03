import { useState } from 'react'
import { BarChart2, TrendingUp, DollarSign, Users, FileText, Download, Calendar, Filter } from 'lucide-react'
import KPICard from '../components/ui/KPICard'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const COBRANZA_MENSUAL = [185000, 192000, 178000, 205000, 198000, 215000, 0, 0, 0, 0, 0, 0]
const OCUPACION_MENSUAL = [82, 85, 83, 88, 87, 90, 0, 0, 0, 0, 0, 0]

const REPORTES_CAT = [
  {
    categoria: 'Financieros',
    reportes: [
      { nombre: 'Estado de Cuenta por Arrendatario', desc: 'Movimientos, saldo, facturas y pagos por arrendatario', formatos: ['PDF', 'Excel'] },
      { nombre: 'Cobranza Mensual', desc: 'Reporte de cargos, pagos y saldos del mes', formatos: ['PDF', 'Excel'] },
      { nombre: 'Flujo de Efectivo Proyectado', desc: 'Ingresos esperados vs cobrado por periodo', formatos: ['Excel'] },
      { nombre: 'Cartera Vencida', desc: 'Arrendatarios con pagos pendientes mayores a 30 días', formatos: ['PDF', 'Excel'] },
    ]
  },
  {
    categoria: 'Operativos',
    reportes: [
      { nombre: 'Ocupación por Inmueble', desc: 'Unidades ocupadas, disponibles y en mantenimiento', formatos: ['PDF', 'Excel'] },
      { nombre: 'Vencimiento de Contratos', desc: 'Contratos que vencen en los próximos 90 días', formatos: ['PDF'] },
      { nombre: 'Órdenes de Trabajo', desc: 'OT por estado, prioridad, tipo y proveedor', formatos: ['PDF', 'Excel'] },
      { nombre: 'Avance de Proyectos', desc: 'Progreso físico y presupuestal de obras en curso', formatos: ['PDF', 'Excel'] },
    ]
  },
  {
    categoria: 'Fiscales',
    reportes: [
      { nombre: 'CFDI Emitidos', desc: 'Facturas emitidas con UUID, complemento de pago y status SAT', formatos: ['PDF', 'Excel', 'XML'] },
      { nombre: 'Retenciones ISR / IVA', desc: 'Resumen de retenciones por arrendatario y periodo', formatos: ['Excel'] },
      { nombre: 'Declaración Anual Arrendamiento', desc: 'Ingresos acumulados por inmueble para declaración fiscal', formatos: ['Excel'] },
    ]
  },
  {
    categoria: 'RH y Nómina',
    reportes: [
      { nombre: 'Nómina Quincenal', desc: 'Percepciones, deducciones y neto por empleado', formatos: ['PDF', 'Excel'] },
      { nombre: 'Incidencias y Asistencia', desc: 'Faltas, retardos, vacaciones y horas extra', formatos: ['Excel'] },
    ]
  },
]

const maxCobranza = Math.max(...COBRANZA_MENSUAL.filter(v => v > 0))

export default function Reportes() {
  const [tab, setTab] = useState('dashboard')
  const [year, setYear] = useState('2026')

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Reportes y BI</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>Inteligencia de negocio e informes gerenciales</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '9px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none', background: 'white' }}>
            {['2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title="Ingresos Jun 2026" value="$215K" icon={DollarSign} color="var(--color-success)" />
        <KPICard title="Ocupación Promedio" value="87%" icon={BarChart2} color="var(--color-primary)" />
        <KPICard title="Arrendatarios Activos" value="24" icon={Users} color="var(--color-secondary)" />
        <KPICard title="CFDI Emitidos" value="48" icon={FileText} color="var(--color-warning)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #E5E7EB' }}>
        {[['dashboard', 'Dashboard Ejecutivo'], ['catalogo', 'Catálogo de Reportes']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            color: tab === id ? 'var(--color-primary)' : 'var(--color-text-light)',
            borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-2px',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Cobranza mensual */}
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>Cobranza Mensual {year}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
              {MESES.map((mes, i) => {
                const val = COBRANZA_MENSUAL[i]
                const h = val ? Math.round((val / maxCobranza) * 120) : 0
                return (
                  <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600 }}>
                      {val ? `$${(val / 1000).toFixed(0)}K` : ''}
                    </div>
                    <div style={{ width: '100%', height: `${h}px`, background: val ? 'var(--color-primary)' : '#F3F4F6', borderRadius: '4px 4px 0 0', minHeight: '4px' }} />
                    <div style={{ fontSize: '10px', color: 'var(--color-text-light)' }}>{mes}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ocupación y top arrendatarios */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>Ocupación mensual {year}</div>
              {MESES.slice(0, 6).map((mes, i) => (
                <div key={mes} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>{mes}</span><span style={{ fontWeight: 700 }}>{OCUPACION_MENSUAL[i]}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '4px' }}>
                    <div style={{ height: '100%', width: `${OCUPACION_MENSUAL[i]}%`, background: 'var(--color-primary)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>Top Arrendatarios por Ingreso</div>
              {[['Tacos El Norteño', 42000], ['Farmacia Similares', 38500], ['Banco Azteca', 35000], ['Tiendas 3B', 28000], ['Óptica Devlyn', 22000]].map(([nombre, monto], i) => (
                <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>{nombre}</div>
                    <div style={{ height: '5px', background: '#F3F4F6', borderRadius: '4px' }}>
                      <div style={{ height: '100%', width: `${(monto / 42000) * 100}%`, background: 'var(--color-secondary)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)' }}>${(monto / 1000).toFixed(0)}K</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'catalogo' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {REPORTES_CAT.map(cat => (
            <div key={cat.categoria}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '3px', height: '18px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                {cat.categoria}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                {cat.reportes.map(r => (
                  <div key={r.nombre} style={{ background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '14px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{r.nombre}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '12px' }}>{r.desc}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {r.formatos.map(fmt => (
                        <button key={fmt} style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                          borderColor: fmt === 'PDF' ? '#FEE2E2' : fmt === 'XML' ? '#DCFCE7' : '#EFF6FF',
                          background: fmt === 'PDF' ? '#FFF5F5' : fmt === 'XML' ? '#F0FDF4' : '#EFF6FF',
                          color: fmt === 'PDF' ? 'var(--color-danger)' : fmt === 'XML' ? 'var(--color-success)' : 'var(--color-primary)',
                        }}>
                          <Download size={10} />{fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
