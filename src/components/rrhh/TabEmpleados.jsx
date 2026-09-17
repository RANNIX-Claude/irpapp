import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, Plus, AlertTriangle, TrendingUp, UserCheck, FileText, LayoutGrid, LayoutList } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import { supabase } from '../../lib/supabase'
import { Avatar, SemaforoContrato, fmt$ } from './rh-helpers'
import MedidorExpediente from './MedidorExpediente'
import { DetalleEmpleado } from './DetalleEmpleado'

// ── Tab Empleados ───────────────────────────────────────────────────────────
function TabEmpleados({ onNuevo }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroArea, setFiltroArea] = useState('Todos')
  const [vistaGrid, setVistaGrid] = useState(true)
  const [sortCol, setSortCol] = useState('nombre_completo')
  const [sortDir, setSortDir] = useState('asc')
  // Documentos de todos los empleados, en una consulta, para el medidor de
  // cada tarjeta sin pedirlos uno por uno.
  const [docsPorEmpleado, setDocsPorEmpleado] = useState({})
  useEffect(() => {
    supabase.from('rh_expediente_documentos').select('empleado_id,tipo').then(({ data }) => {
      const m = {}
      for (const d of data ?? []) (m[d.empleado_id] ||= []).push(d)
      setDocsPorEmpleado(m)
    })
  }, [])
  const [selected, setSelected] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading } = usePRP('prp_empleados', { order: { col: sortCol, dir: sortDir }, refreshKey })

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const lista = data ?? []
  const activos = lista.filter(e => e.estado_id === 'ACTIVO')
  const areas = ['Todos', ...new Set(activos.map(e => e.area).filter(Boolean))]

  const filtrados = activos.filter(e => {
    const q = search.toLowerCase()
    return (!q || [e.nombre_completo, e.numero_empleado, e.puesto].some(v => (v||'').toLowerCase().includes(q)))
      && (filtroArea === 'Todos' || e.area === filtroArea)
  })

  const nomina = activos.reduce((s, e) => s + (parseFloat(e.salario_mensual) || 0), 0)
  const alertas = activos.filter(e => ['VENCIDO','CRITICO','ALERTA'].includes(e.semaforo_contrato)).length
  const indefinidos = activos.filter(e => e.semaforo_contrato === 'INDETERMINADO').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {[[activos.length, 'Activos', '#7B5EA7', Users], [fmt$(nomina), 'Nómina Mensual', '#057642', TrendingUp], [alertas, 'Alertas Contrato', '#F59E0B', AlertTriangle], [indefinidos, 'Tiempo Indefinido', '#5A4080', UserCheck]].map(([v, t, c, Icon]) => (
          <div key={t} style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{t}</span>
              <Icon size={16} color={c} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado, # o puesto..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {areas.slice(0, 7).map(a => (
            <button key={a} onClick={() => setFiltroArea(a)}
              style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid', borderColor: filtroArea===a ? '#7B5EA7' : '#E5E7EB', background: filtroArea===a ? '#7B5EA7' : 'white', color: filtroArea===a ? 'white' : 'var(--color-text-light)' }}>
              {a}
            </button>
          ))}
        </div>
        {/* Toggle vista */}
        <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setVistaGrid(true)} title="Vista tarjetas"
            style={{ padding: '7px 11px', background: vistaGrid ? '#7B5EA7' : 'white', color: vistaGrid ? 'white' : '#6B7280', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setVistaGrid(false)} title="Vista tabla"
            style={{ padding: '7px 11px', background: !vistaGrid ? '#7B5EA7' : 'white', color: !vistaGrid ? 'white' : '#6B7280', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LayoutList size={16} />
          </button>
        </div>
        <button onClick={onNuevo} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#7B5EA7', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Cargando…</div>
      ) : vistaGrid ? (
        /* ── Vista Grid tipo LinkedIn ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {filtrados.map(e => {
            const ini = (e.nombre_completo || 'NN').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase()
            const colores = ['#0A66C2','#057642','#E8A020','#B24020','#6B21A8','#0F766E']
            const col = colores[(e.nombre_completo||'').charCodeAt(0) % colores.length]
            const antAnios = e.fecha_ingreso ? Math.floor((new Date()-new Date(e.fecha_ingreso+'T12:00:00'))/(1000*60*60*24*365)) : null
            return (
              <div key={e.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 4px rgba(0,0,0,.06)', transition: 'box-shadow .15s' }}
                onMouseEnter={ev => ev.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'}
                onMouseLeave={ev => ev.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.06)'}>
                {/* Banner */}
                <div style={{ height: 56, background: `linear-gradient(135deg, #5A4080 0%, #7B5EA7 100%)`, position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 6, right: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: 'white', padding: '2px 8px', borderRadius: 10, letterSpacing: '.5px', textTransform: 'uppercase' }}>Expediente</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)' }}>
                    {e.foto_url
                      ? <img src={e.foto_url} alt={e.nombre_completo} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }} />
                      : <div style={{ width: 56, height: 56, borderRadius: '50%', background: col+'20', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: col, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>{ini}</div>
                    }
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: '36px 16px 14px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>{e.nombre_completo}</div>
                  <div style={{ fontSize: 12, color: '#7B5EA7', fontWeight: 600 }}>{e.puesto || '—'}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{e.area || e.departamento || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: e.estado_id==='ACTIVO' ? '#dcfce7' : '#fee2e2', color: e.estado_id==='ACTIVO' ? '#166534' : '#991b1b' }}>{e.estado_id}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#F3F4F6', color: '#374151', fontWeight: 600 }}>{e.numero_empleado}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{e.salario_mensual ? '$'+Math.round(e.salario_mensual/1000)+'K' : '—'}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>Mensual</div>
                    </div>
                    {antAnios != null && <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{antAnios}a</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>Antigüedad</div>
                    </div>}
                    <MedidorExpediente docs={docsPorEmpleado[e.id]} />
                  </div>
                </div>
                {/* Acciones */}
                <div style={{ borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => navigate(`/rh/empleado/${e.id}`)}
                    style={{ width: '100%', padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#7B5EA7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <FileText size={13} /> Expediente
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {[
                    { col: 'nombre_completo', label: 'Empleado' },
                    { col: 'numero_empleado', label: '# Emp' },
                    { col: 'puesto', label: 'Puesto / Área' },
                    { col: null, label: 'Horario' },
                    { col: null, label: 'Descanso' },
                    { col: null, label: 'Forma Pago' },
                    { col: 'salario_mensual', label: 'Salario Mensual' },
                    { col: null, label: 'Salario Semanal' },
                    { col: null, label: 'Tipo Contrato' },
                    { col: null, label: 'Vencimiento' },
                    { col: 'estado_id', label: 'Estado' },
                    { col: null, label: '' }
                  ].map(h => (
                    <th key={h.label} onClick={() => h.col && toggleSort(h.col)}
                      style={{
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        color: 'var(--color-text-light)',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                        letterSpacing: '.5px',
                        cursor: h.col ? 'pointer' : 'default',
                        background: sortCol === h.col ? '#E5E7EB' : 'transparent',
                        transition: 'background .15s'
                      }}>
                      {h.label}{h.col && (sortCol === h.col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelected(e)}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar nombre={e.nombre_completo} foto={e.foto_url} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{e.nombre_completo}</div>
                          {e.nss && <div style={{ fontSize: 11, color: 'var(--color-text-light)', fontFamily: 'monospace' }}>NSS: {e.nss}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#7B5EA7' }}>{e.numero_empleado}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 500 }}>{e.puesto}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-light)' }}>{e.area ?? '—'}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-light)' }} title={e.horario_trabajo}>
                      {e.horario_trabajo ?? '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12 }}>
                      {e.dia_descanso ?? '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, fontWeight: 600,
                        background: e.forma_pago === 'TRANSFERENCIA' ? '#EFF6FF' : e.forma_pago === 'EFECTIVO' ? '#F0FDF4' : '#FFFBEB',
                        color: e.forma_pago === 'TRANSFERENCIA' ? '#1D4ED8' : e.forma_pago === 'EFECTIVO' ? '#166534' : '#92400E' }}>
                        {e.forma_pago === 'TRANSFERENCIA' ? '🏦 Transfer' : e.forma_pago === 'EFECTIVO' ? '💵 Efectivo' : e.forma_pago === 'MIXTO' ? '↕ Mixto' : e.forma_pago ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{e.salario_mensual ? fmt$(e.salario_mensual) : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-light)' }}>{e.salario_diario ? fmt$(e.salario_diario) + '/día' : ''}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{e.salario_mensual ? fmt$(Math.round(e.salario_mensual / 4.33)) : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-light)' }}>aprox./semana</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 12, padding: '3px 8px', background: '#F3F4F6', borderRadius: 12 }}>{e.tipo_contrato_nombre ?? '—'}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <SemaforoContrato valor={e.semaforo_contrato} fechaFin={e.contrato_fin} />
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: e.estado_id==='ACTIVO' ? '#dcfce7' : '#fee2e2', color: e.estado_id==='ACTIVO' ? '#166534' : '#991b1b' }}>{e.estado_id}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }} onClick={ev => ev.stopPropagation()}>
                      <button onClick={() => navigate(`/rh/empleado/${e.id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#7B5EA7', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>
                        <FileText size={12} /> Expediente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <DetalleEmpleado emp={selected} onClose={() => setSelected(null)} onRefresh={() => setRefreshKey(k => k+1)} />
      )}
    </div>
  )
}

export default TabEmpleados