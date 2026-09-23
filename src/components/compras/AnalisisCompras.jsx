import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { Search, ChevronDown, Link2, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { AMBITOS, pesos, pesos2, fecha, traerVista } from '../../lib/compras'
import VincularNombreModal from './VincularNombreModal'

const ambitoInfo = (id) => AMBITOS.find(a => a.id === id) || { label: id, color: '#6B7280' }

// Detalle de un renglón: las compras que lo forman.
function DetalleCompras({ fila, anio, ambito }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let q = supabase.from('prp_compras').select('fecha,ambito,grupo,concepto,monto,proveedor_texto,tiene_factura')
    q = fila.proveedor_id ? q.eq('proveedor_id', fila.proveedor_id) : q.is('proveedor_id', null).eq('texto_norm', fila.texto_norm)
    if (anio !== 'Todos') q = q.eq('anio', anio)
    if (ambito !== 'TODOS') q = q.eq('ambito', ambito)
    q.order('fecha', { ascending: false }).limit(200).then(({ data }) => setRows(data || []))
  }, [fila, anio, ambito])

  if (!rows) return <div style={{ padding: 14, fontSize: 12, color: '#9CA3AF' }}>Cargando compras…</div>
  return (
    <div style={{ maxHeight: 320, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            {['Fecha', 'Ámbito', 'Grupo / proyecto', 'Concepto', 'Capturado como', 'Monto'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Monto' ? 'right' : 'left', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{fecha(r.fecha)}</td>
              <td style={{ padding: '6px 10px', color: ambitoInfo(r.ambito).color, fontWeight: 700 }}>{ambitoInfo(r.ambito).label}</td>
              <td style={{ padding: '6px 10px' }}>{r.grupo || '—'}</td>
              <td style={{ padding: '6px 10px', color: '#6B7280' }}>{r.concepto || '—'}</td>
              <td style={{ padding: '6px 10px', color: '#9CA3AF' }}>{r.proveedor_texto || '—'}</td>
              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{pesos2(r.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 200 && <div style={{ padding: 8, fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Se muestran las 200 más recientes</div>}
    </div>
  )
}

export default function AnalisisCompras({ proveedores, onVerProveedor, onCatalogoCambio }) {
  const anioActual = new Date().getFullYear()
  const [anio, setAnio] = useState(anioActual)
  const [ambito, setAmbito] = useState('TODOS')
  const [soloSueltos, setSoloSueltos] = useState(false)
  const [busca, setBusca] = useState('')
  const [rows, setRows] = useState([])
  const [anios, setAnios] = useState([anioActual])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState(null)
  const [vincular, setVincular] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await traerVista('prp_compras_resumen', q => anio === 'Todos' ? q : q.eq('anio', anio))
      setRows(data)
    } catch (e) { toast.error('No se pudo cargar el análisis: ' + e.message) }
    setLoading(false)
  }, [anio])

  useEffect(() => { cargar() }, [cargar])

  // Años con compras, para el selector.
  useEffect(() => {
    traerVista('prp_compras_resumen', q => q, 'anio').then(d => {
      const s = [...new Set(d.map(r => r.anio).filter(Boolean))].sort((a, b) => b - a)
      if (s.length) setAnios(s)
    }).catch(() => {})
  }, [])

  const provPorId = useMemo(() => Object.fromEntries(proveedores.map(p => [p.id, p])), [proveedores])

  // Un renglón por proveedor del catálogo, o por nombre suelto normalizado.
  const agregados = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      if (ambito !== 'TODOS' && r.ambito !== ambito) continue
      const key = r.proveedor_id || 'txt:' + r.texto_norm
      let a = m.get(key)
      if (!a) {
        a = { key, proveedor_id: r.proveedor_id, texto_norm: r.texto_norm, nombre: r.proveedor_id ? (provPorId[r.proveedor_id]?.nombre || r.proveedor) : r.proveedor, total: 0, compras: 0, ultima: null, porAmbito: {} }
        m.set(key, a)
      }
      const monto = Number(r.monto) || 0
      a.total += monto
      a.compras += r.compras
      a.porAmbito[r.ambito] = (a.porAmbito[r.ambito] || 0) + monto
      if (!a.ultima || r.ultima_fecha > a.ultima) a.ultima = r.ultima_fecha
    }
    return [...m.values()].sort((x, y) => y.total - x.total)
  }, [rows, ambito, provPorId])

  const total = agregados.reduce((s, a) => s + a.total, 0)
  const ligado = agregados.filter(a => a.proveedor_id).reduce((s, a) => s + a.total, 0)
  const nCompras = agregados.reduce((s, a) => s + a.compras, 0)
  const sueltos = agregados.filter(a => !a.proveedor_id)

  const visibles = agregados.filter(a =>
    (!soloSueltos || !a.proveedor_id) &&
    (!busca || a.nombre.toLowerCase().includes(busca.toLowerCase())))

  const top = agregados.slice(0, 10).map(a => ({ nombre: a.nombre.length > 22 ? a.nombre.slice(0, 21) + '…' : a.nombre, total: Math.round(a.total), ligado: !!a.proveedor_id }))

  const exportar = () => {
    const datos = visibles.map(a => ({
      Proveedor: a.nombre,
      'En catálogo': a.proveedor_id ? 'Sí' : 'No',
      ...Object.fromEntries(AMBITOS.map(x => [x.label, Math.round((a.porAmbito[x.id] || 0) * 100) / 100])),
      Total: Math.round(a.total * 100) / 100,
      Compras: a.compras,
      '% del total': total ? Math.round(a.total / total * 1000) / 10 : 0,
      'Última compra': a.ultima,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos), 'Compras por proveedor')
    XLSX.writeFile(wb, `compras_proveedores_${anio}.xlsx`)
  }

  const kpi = (label, val, color, sub) => (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  )

  const chip = (id, label, color = '#0A66C2') => (
    <button key={id} onClick={() => setAmbito(id)} style={{ padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${color}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: ambito === id ? color : 'white', color: ambito === id ? 'white' : color }}>{label}</button>
  )

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={anio} onChange={e => setAnio(e.target.value === 'Todos' ? 'Todos' : Number(e.target.value))} style={{ padding: '7px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'white' }}>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
          <option value="Todos">Todos los años</option>
        </select>
        {chip('TODOS', 'Todos')}
        {AMBITOS.map(a => chip(a.id, a.label, a.color))}
        <div style={{ flex: 1 }} />
        <button onClick={exportar} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'white', color: '#057642', border: '1.5px solid #057642', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Download size={14} /> Excel
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {kpi('Total comprado', pesos(total), '#0A66C2', `${nCompras.toLocaleString('es-MX')} compras`)}
        {kpi('Proveedores', agregados.length - sueltos.length, '#057642', 'del catálogo con compras')}
        {kpi('Nombres sin catálogo', sueltos.length, '#B24020', pesos(total - ligado))}
        {kpi('Monto ligado al catálogo', total ? Math.round(ligado / total * 100) + '%' : '—', '#E8A020', 'la meta es 100%')}
      </div>

      {/* Top 10 */}
      {top.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px 6px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6 }}>Top 10 proveedores</div>
          <ResponsiveContainer width="100%" height={Math.max(160, top.length * 28)}>
            <BarChart data={top} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tickFormatter={v => pesos(v)} fontSize={11} />
              <YAxis type="category" dataKey="nombre" width={170} fontSize={11} />
              <Tooltip formatter={v => pesos(v)} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {top.map((t, i) => <Cell key={i} fill={t.ligado ? '#0A66C2' : '#B24020'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: '#9CA3AF', paddingBottom: 6 }}>Azul: en catálogo · Rojo: nombre suelto, sin ligar</div>
        </div>
      )}

      {/* Tabla */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar proveedor…" style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#B24020', fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloSueltos} onChange={e => setSoloSueltos(e.target.checked)} />
          Solo sin catálogo ({sueltos.length})
        </label>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
        ) : visibles.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Sin compras con estos filtros</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                {['Proveedor', ...AMBITOS.map(a => a.label), 'Total', '%', 'Compras', 'Última', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Proveedor' || h === '' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map(a => (
                <Fragment key={a.key}>
                  <tr style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: abierto === a.key ? '#F8FAFC' : 'white' }}
                    onClick={() => setAbierto(abierto === a.key ? null : a.key)}>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChevronDown size={13} color="#9CA3AF" style={{ transform: abierto === a.key ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }} />
                        {a.proveedor_id ? (
                          <span onClick={e => { e.stopPropagation(); onVerProveedor(provPorId[a.proveedor_id]) }} style={{ fontWeight: 700, fontSize: 13, color: '#0A66C2', textDecoration: 'underline dotted' }}>{a.nombre}</span>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{a.nombre}</span>
                        )}
                      </div>
                    </td>
                    {AMBITOS.map(x => (
                      <td key={x.id} style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12.5, color: a.porAmbito[x.id] ? '#111827' : '#D1D5DB' }}>{a.porAmbito[x.id] ? pesos(a.porAmbito[x.id]) : '—'}</td>
                    ))}
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, fontSize: 13 }}>{pesos(a.total)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12, color: '#6B7280' }}>{total ? (a.total / total * 100).toFixed(1) : 0}%</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12.5 }}>{a.compras}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{fecha(a.ultima)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      {!a.proveedor_id && a.texto_norm && (
                        <button onClick={e => { e.stopPropagation(); setVincular(a) }} title="Ligar al catálogo" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#FEF2F2', color: '#B24020', border: '1px solid #FECACA', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <Link2 size={12} /> Ligar
                        </button>
                      )}
                    </td>
                  </tr>
                  {abierto === a.key && (
                    <tr><td colSpan={AMBITOS.length + 6} style={{ padding: 0, background: '#F8FAFC', borderBottom: '2px solid #E5E7EB' }}>
                      <DetalleCompras fila={a} anio={anio} ambito={ambito} />
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {vincular && (
        <VincularNombreModal
          nombre={vincular.nombre} monto={vincular.total} compras={vincular.compras}
          proveedores={proveedores}
          onClose={() => setVincular(null)}
          onHecho={() => { setVincular(null); cargar(); onCatalogoCambio?.() }}
        />
      )}
    </div>
  )
}
