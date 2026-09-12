import { useModuleAudit } from '../hooks/useAudit'
import { useMemo, useState } from 'react'
import { BarChart2, DollarSign, Users, FileText, Download, Printer } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import { usePRP } from '../hooks/usePRP'

function fmt(n) { return '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 }) }

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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

function generarReportePDF(nombre, categoria) {
  const win = window.open('', '_blank')
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  win.document.write(`<!DOCTYPE html><html><head>
  <title>${nombre}</title>
  <style>
    body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1a1a1a}
    h1{color:#0A66C2;font-size:22px;margin-bottom:4px}
    .meta{font-size:12px;color:#666;margin-bottom:32px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#0A66C2;color:white;padding:10px 12px;text-align:left;font-size:12px}
    td{padding:9px 12px;border-bottom:1px solid #E5E7EB}
    tr:nth-child(even) td{background:#F9FAFB}
    .footer{margin-top:48px;font-size:11px;color:#999;border-top:1px solid #E5E7EB;padding-top:12px;display:flex;justify-content:space-between}
    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
    .ok{background:#D1FAE5;color:#057642}.warn{background:#FEF3C7;color:#92400E}.err{background:#FEE2E2;color:#991B1B}
  </style>
  </head><body>
  <h1>${nombre}</h1>
  <div class="meta">Categoría: ${categoria} &nbsp;·&nbsp; Generado el ${fecha} &nbsp;·&nbsp; IRP — Inmueble Resource Planning</div>
  <table>
    <tr><th>Concepto</th><th>Valor</th><th>Periodo</th><th>Estatus</th></tr>
    <tr><td>Renta Local L-01 — Tacos El Norteño</td><td>$18,000</td><td>Agosto 2026</td><td><span class="badge ok">PAGADO</span></td></tr>
    <tr><td>Renta Local L-02 — Farmacia Similares</td><td>$22,500</td><td>Agosto 2026</td><td><span class="badge ok">PAGADO</span></td></tr>
    <tr><td>Renta Local L-03 — Banco Azteca</td><td>$35,000</td><td>Agosto 2026</td><td><span class="badge warn">PENDIENTE</span></td></tr>
    <tr><td>Renta Local L-04 — Tiendas 3B</td><td>$28,000</td><td>Agosto 2026</td><td><span class="badge ok">PAGADO</span></td></tr>
    <tr><td>Renta Local L-05 — Óptica Devlyn</td><td>$15,500</td><td>Agosto 2026</td><td><span class="badge err">VENCIDO</span></td></tr>
    <tr><td colspan="4" style="font-weight:700;text-align:right;padding-top:14px">Total: $119,000</td></tr>
  </table>
  <div class="footer"><span>IRP · RANNIX Consulting 2026</span><span>${nombre}</span></div>
  </body></html>`)
  win.document.close()
  win.print()
}

export default function Reportes() {
  useModuleAudit('REPORTES')
  const [tab, setTab] = useState('dashboard')
  const [year, setYear] = useState('2026')

  // Todo el Dashboard Ejecutivo sale de estas tres vistas — nada de números
  // fijos: si no hay datos para el año elegido, los paneles simplemente
  // muestran cero/vacío en vez de una cifra inventada.
  const { data: ingresosData }  = usePRP('prp_ingresos')
  const { data: contratosData } = usePRP('prp_contratos')
  const { data: inmueblesData } = usePRP('prp_inmuebles')

  const ingresos   = ingresosData ?? []
  const contratos  = contratosData ?? []
  const inmuebles  = inmueblesData ?? []

  const ingresosDelAnio = useMemo(
    () => ingresos.filter(i => String(i.anio) === year),
    [ingresos, year]
  )

  const ingresosAcumulados = useMemo(
    () => ingresosDelAnio.reduce((a, b) => a + (parseFloat(b.importe) || 0), 0),
    [ingresosDelAnio]
  )

  const cobranzaMensual = useMemo(() => {
    const porMes = Array(12).fill(0)
    for (const i of ingresosDelAnio) {
      const m = parseInt(i.mes)
      if (m >= 1 && m <= 12) porMes[m - 1] += parseFloat(i.importe) || 0
    }
    return porMes
  }, [ingresosDelAnio])
  const maxCobranza = Math.max(1, ...cobranzaMensual)

  const totalUnidades = inmuebles.reduce((a, b) => a + (parseInt(b.unidades_total) || 0), 0)
  const totalOcupadas = inmuebles.reduce((a, b) => a + (parseInt(b.unidades_ocupadas) || 0), 0)
  const ocupacionPromedio = totalUnidades > 0 ? Math.round((totalOcupadas / totalUnidades) * 100) : 0

  const arrendatariosActivos = useMemo(
    () => new Set(contratos.filter(c => c.estatus === 'VIGENTE').map(c => c.arrendatario_id)).size,
    [contratos]
  )

  // No hay tabla de CFDI/timbrado conectada a este modelo todavía (la que
  // existe vive en un esquema `prp` legacy sin relación a estos contratos):
  // el proxy real disponible es el número de ingresos del año con folio de
  // factura capturado.
  const facturasDelAnio = useMemo(
    () => ingresosDelAnio.filter(i => (i.factura || '').trim() !== '').length,
    [ingresosDelAnio]
  )

  const topArrendatarios = useMemo(() => {
    const porArrendatario = {}
    for (const i of ingresosDelAnio) {
      const nombre = i.arrendatario_nombre || 'Sin nombre'
      porArrendatario[nombre] = (porArrendatario[nombre] || 0) + (parseFloat(i.importe) || 0)
    }
    return Object.entries(porArrendatario).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [ingresosDelAnio])
  const maxTop = Math.max(1, ...topArrendatarios.map(([, v]) => v))

  const fmtK = n => n > 0 ? `$${(n / 1000).toFixed(0)}K` : '$0'

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
          <button onClick={() => generarReportePDF('Dashboard Ejecutivo', 'Resumen')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14} /> Imprimir dashboard
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard title={`Ingresos ${year}`} value={fmtK(ingresosAcumulados)} icon={DollarSign} color="var(--color-success)" />
        <KPICard title="Ocupación Actual" value={`${ocupacionPromedio}%`} icon={BarChart2} color="var(--color-primary)" />
        <KPICard title="Arrendatarios Activos" value={String(arrendatariosActivos)} icon={Users} color="var(--color-secondary)" />
        <KPICard title="Facturas Registradas" value={String(facturasDelAnio)} icon={FileText} color="var(--color-warning)" />
      </div>

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
          <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>Cobranza Mensual {year}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
              {MESES.map((mes, i) => {
                const val = cobranzaMensual[i]
                const h = val ? Math.round((val / maxCobranza) * 120) : 0
                return (
                  <div key={mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-light)', fontWeight: 600 }}>{val ? `$${(val/1000).toFixed(0)}K` : ''}</div>
                    <div style={{ width: '100%', height: `${h}px`, background: val ? 'var(--color-primary)' : '#F3F4F6', borderRadius: '4px 4px 0 0', minHeight: '4px', cursor: val ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
                      title={val ? `${mes}: ${fmt(val)}` : ''}
                      onMouseEnter={e => { if (val) e.currentTarget.style.opacity = '0.75' }}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'} />
                    <div style={{ fontSize: '10px', color: 'var(--color-text-light)' }}>{mes}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>Ocupación por Inmueble</div>
              {/* No hay historial de ocupación por mes en la base — esta es la
                  ocupación real y actual de cada inmueble, no una tendencia. */}
              {inmuebles.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', textAlign: 'center', padding: '20px 0' }}>Sin inmuebles registrados</div>
              ) : inmuebles.map(inm => {
                const tot = parseInt(inm.unidades_total) || 0
                const ocu = parseInt(inm.unidades_ocupadas) || 0
                const pct = tot > 0 ? Math.round((ocu / tot) * 100) : 0
                return (
                  <div key={inm.id} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>{inm.nombre}</span><span style={{ fontWeight: 700 }}>{pct}% ({ocu}/{tot})</span>
                    </div>
                    <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '4px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: '4px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>Top Arrendatarios por Ingreso {year}</div>
              {topArrendatarios.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-light)', textAlign: 'center', padding: '20px 0' }}>Sin ingresos registrados en {year}</div>
              ) : topArrendatarios.map(([nombre, monto], i) => (
                <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>{nombre}</div>
                    <div style={{ height: '5px', background: '#F3F4F6', borderRadius: '4px' }}>
                      <div style={{ height: '100%', width: `${(monto / maxTop) * 100}%`, background: 'var(--color-secondary)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)' }}>{fmtK(monto)}</div>
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
                      {r.formatos.map(formato => (
                        <button key={formato} onClick={() => generarReportePDF(r.nombre, cat.categoria)} style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                          borderColor: formato === 'PDF' ? '#FEE2E2' : formato === 'XML' ? '#DCFCE7' : '#EFF6FF',
                          background: formato === 'PDF' ? '#FFF5F5' : formato === 'XML' ? '#F0FDF4' : '#EFF6FF',
                          color: formato === 'PDF' ? 'var(--color-danger)' : formato === 'XML' ? 'var(--color-success)' : 'var(--color-primary)',
                        }}>
                          <Download size={10} />{formato}
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
