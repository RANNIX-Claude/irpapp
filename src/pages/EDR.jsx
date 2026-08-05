import { useModuleAudit } from '../hooks/useAudit'
import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, X, ChevronRight, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePRP } from '../hooks/usePRP'

function fmt(n) { return '$' + (parseFloat(n)||0).toLocaleString('es-MX', {minimumFractionDigits:0}) }
function fmtK(n) { return '$' + (parseFloat(n)/1000).toFixed(1) + 'K' }
function pct(a, b) { if (!b) return '—'; return ((a/b)*100).toFixed(1) + '%' }

const MES_NOMBRES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Categorías de gastos para agrupación
const CATEGORIA_GRUPOS = {
  LIMPIEZA: 'Servicios',
  VENDING: 'Comercial',
  SERVICIOS: 'Servicios',
  COMPRAS: 'Operativo',
  PAPELERIA: 'Administrativo',
  FERRETERIA: 'Mantenimiento',
  MEDICO: 'Bienestar',
  BANCARIOS: 'Financiero',
  OTROS: 'Otros',
}

// ── Drawer de detalle transacciones ───────────────────────────────────────────
function DetalleDrawer({ titulo, items, tipo, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: 'white', width: '440px', maxWidth: '95vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{tipo === 'ingreso' ? 'Ingresos' : 'Gastos'} — Detalle</div>
            <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700 }}>{titulo}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '40px 0', fontSize: '13px' }}>Sin transacciones en este período.</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', padding: '10px 12px', background: '#F9FAFB', borderRadius: '8px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.arrendatario_nombre || item.proveedor_nombre || item.descripcion || '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '1px' }}>
                      {item.fecha_pago_real || item.fecha || item.semana_inicio || '—'}
                      {item.forma_pago ? ` · ${item.forma_pago}` : ''}
                      {item.referencia_pago ? ` · ${item.referencia_pago}` : ''}
                      {item.grupo_nombre ? ` · ${item.grupo_nombre}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)', textAlign: 'right' }}>
                    {tipo === 'ingreso' ? '+' : '-'}{fmt(item.monto_pagado || 0)}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '2px solid #E5E7EB', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px' }}>
                <span>Total</span>
                <span style={{ color: tipo === 'ingreso' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {tipo === 'ingreso' ? '+' : '-'}{fmt(items.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Fila de P&L ───────────────────────────────────────────────────────────────
function PLRow({ label, monto, total, color, items, tipo, onDrill }) {
  const pctVal = total ? ((Math.abs(monto) / total) * 100).toFixed(1) : 0
  return (
    <div onClick={() => onDrill(label, items, tipo)}
      style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px 100px', gap: '12px', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', borderRadius: '6px', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ fontSize: '13px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {label}
        <ChevronRight size={12} color="#9CA3AF" />
      </div>
      <div style={{ position: 'relative', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(pctVal, 100)}%`, background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-light)', textAlign: 'right' }}>{pctVal}%</div>
      <div style={{ fontWeight: 700, fontSize: '14px', color, textAlign: 'right' }}>{fmt(monto)}</div>
    </div>
  )
}

export default function EDR() {
  useModuleAudit('EDR')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [drawer, setDrawer] = useState(null) // { titulo, items, tipo }

  const { data: cobros, loading: loadCobros } = usePRP('prp_cobros')
  const { data: gastos, loading: loadGastos } = usePRP('prp_gastos')

  const loading = loadCobros || loadGastos

  // Filtrar por mes/año
  const ingresos = (cobros || []).filter(c =>
    c.estatus === 'PAGADO' && c.mes === mes && c.anio === anio
  )
  const gastosDelMes = (gastos || []).filter(g => {
    if (!g.fecha && !g.semana_inicio) return false
    const fecha = new Date(g.fecha || g.semana_inicio)
    return fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio
  })

  // Totales
  const totalIngresos = ingresos.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const totalGastos = gastosDelMes.reduce((a, b) => a + (parseFloat(b.monto_pagado) || 0), 0)
  const resultado = totalIngresos - totalGastos
  const margen = totalIngresos ? (resultado / totalIngresos * 100).toFixed(1) : 0

  // Agrupar ingresos por arrendatario
  const ingresosPorArrendatario = {}
  ingresos.forEach(c => {
    const key = c.arrendatario_nombre || 'Sin nombre'
    if (!ingresosPorArrendatario[key]) ingresosPorArrendatario[key] = []
    ingresosPorArrendatario[key].push(c)
  })

  // Agrupar gastos por categoría
  const gastosPorCategoria = {}
  gastosDelMes.forEach(g => {
    const key = g.grupo_nombre || g.grupo_clave || 'Otros'
    if (!gastosPorCategoria[key]) gastosPorCategoria[key] = []
    gastosPorCategoria[key].push(g)
  })

  const openDrill = (titulo, items, tipo) => setDrawer({ titulo, items, tipo })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={22} color="var(--color-primary)" /> Estado de Resultados
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', margin: 0 }}>P&L mensual — cada cifra es clickeable para ver el detalle</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={mes} onChange={e => setMes(+e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}>
            {MES_NOMBRES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(+e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px' }}>
            {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><LoadingSpinner /></div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '28px' }}>
            <div onClick={() => openDrill('Todos los ingresos', ingresos, 'ingreso')}
              style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #E5E7EB', padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Ingresos</span>
                <ArrowUpRight size={16} color="var(--color-success)" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-success)' }}>{fmtK(totalIngresos)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>{ingresos.length} cobros · clic para detallar</div>
            </div>

            <div onClick={() => openDrill('Todos los gastos', gastosDelMes, 'gasto')}
              style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #E5E7EB', padding: '18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Gastos</span>
                <ArrowDownRight size={16} color="var(--color-danger)" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-danger)' }}>{fmtK(totalGastos)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>{gastosDelMes.length} registros · clic para detallar</div>
            </div>

            <div style={{ background: resultado >= 0 ? '#F0FDF4' : '#FEF2F2', borderRadius: '10px', border: `1.5px solid ${resultado >= 0 ? '#BBF7D0' : '#FCA5A5'}`, padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Resultado</span>
                <DollarSign size={16} color={resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {resultado >= 0 ? '+' : ''}{fmtK(resultado)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
                {resultado >= 0 ? 'Superávit' : 'Déficit'} del mes
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '10px', border: '1.5px solid #E5E7EB', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Margen</span>
                <Percent size={16} color="var(--color-primary)" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>{margen}%</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>Resultado / Ingresos</div>
            </div>
          </div>

          {/* P&L detallado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Ingresos por arrendatario */}
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-success)' }}>▲ Ingresos</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{MES_NOMBRES[mes]} {anio}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--color-success)' }}>{fmt(totalIngresos)}</div>
              </div>
              <div style={{ padding: '8px 4px' }}>
                {Object.entries(ingresosPorArrendatario).length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '24px', fontSize: '13px' }}>Sin ingresos registrados</div>
                ) : (
                  Object.entries(ingresosPorArrendatario)
                    .sort((a, b) => b[1].reduce((s, c) => s + (parseFloat(c.monto_pagado)||0), 0) - a[1].reduce((s, c) => s + (parseFloat(c.monto_pagado)||0), 0))
                    .map(([nombre, items]) => {
                      const monto = items.reduce((s, c) => s + (parseFloat(c.monto_pagado)||0), 0)
                      return <PLRow key={nombre} label={nombre} monto={monto} total={totalIngresos} color="var(--color-success)" items={items} tipo="ingreso" onDrill={openDrill} />
                    })
                )}
              </div>
            </div>

            {/* Gastos por categoría */}
            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-danger)' }}>▼ Gastos</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>{MES_NOMBRES[mes]} {anio}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--color-danger)' }}>{fmt(totalGastos)}</div>
              </div>
              <div style={{ padding: '8px 4px' }}>
                {Object.entries(gastosPorCategoria).length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '24px', fontSize: '13px' }}>Sin gastos registrados</div>
                ) : (
                  Object.entries(gastosPorCategoria)
                    .sort((a, b) => b[1].reduce((s, g) => s + (parseFloat(g.monto_pagado)||0), 0) - a[1].reduce((s, g) => s + (parseFloat(g.monto_pagado)||0), 0))
                    .map(([cat, items]) => {
                      const monto = items.reduce((s, g) => s + (parseFloat(g.monto_pagado)||0), 0)
                      return <PLRow key={cat} label={cat} monto={monto} total={totalGastos} color="var(--color-danger)" items={items} tipo="gasto" onDrill={openDrill} />
                    })
                )}
              </div>
            </div>
          </div>

          {/* Resultado final */}
          <div style={{ marginTop: '20px', background: resultado >= 0 ? '#F0FDF4' : '#FEF2F2', border: `1.5px solid ${resultado >= 0 ? '#86EFAC' : '#FCA5A5'}`, borderRadius: '10px', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>= Resultado del período</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: resultado >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{fmt(resultado)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Margen operativo</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{margen}%</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Mes</div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{MES_NOMBRES[mes]} {anio}</div>
            </div>
          </div>
        </>
      )}

      {drawer && <DetalleDrawer titulo={drawer.titulo} items={drawer.items} tipo={drawer.tipo} onClose={() => setDrawer(null)} />}
    </div>
  )
}
