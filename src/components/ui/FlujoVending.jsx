// Flujo de inventario de vending: la semana elegida y las 2 anteriores en una sola tabla.
// Inicial · Compras · Ventas · Final por producto; el Final de una semana es el Inicial de la siguiente.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const INICIO_CONTROL = '2026-09-12'   // el módulo se usa desde esta semana; antes no hay detalle
const fmtN = n => (parseFloat(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })
const COLS = [['Ini', 'qty_inicial'], ['Comp', 'qty_compras'], ['Vta', 'qty_ventas'], ['Final', 'qty_final']]

export default function FlujoVending({ semanas, refreshKey }) {
  // semanas: [{ ini, fin, label }] de la más nueva a la más vieja; solo se ofrecen las del control de inventario
  const elegibles = semanas.filter(s => s.ini >= INICIO_CONTROL)
  const hoy = new Date().toISOString().slice(0, 10)
  const [fin, setFin] = useState(() => (elegibles.find(s => s.ini <= hoy) || elegibles[0])?.ini)
  const [datos, setDatos] = useState({})     // producto → { [ini]: fila }
  const [loading, setLoading] = useState(true)

  const idx = Math.max(0, elegibles.findIndex(s => s.ini === fin))
  // 3 semanas terminando en la elegida, de la más vieja a la más nueva
  const tres = [2, 1, 0].map(k => {
    const ini = new Date(fin + 'T12:00:00'); ini.setDate(ini.getDate() - 7 * k)
    const iso = ini.toISOString().slice(0, 10)
    return semanas.find(s => s.ini === iso) || { ini: iso, label: iso }
  })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoading(true)
      const { data: sems } = await supabase.from('vending_semanas').select('id, fecha_inicio').in('fecha_inicio', tres.map(s => s.ini))
      const porId = Object.fromEntries((sems || []).map(s => [s.id, s.fecha_inicio]))
      const ids = Object.keys(porId)
      const { data: det } = ids.length
        ? await supabase.from('vending_semana_producto')
            .select('semana_id, qty_inicial, qty_compras, qty_ventas, qty_final, qty_inicial_confirmado, vending_productos(producto)')
            .in('semana_id', ids)
        : { data: [] }
      const m = {}
      ;(det || []).forEach(r => {
        const p = r.vending_productos?.producto || '—'
        ;(m[p] ??= {})[porId[r.semana_id]] = r
      })
      if (vivo) { setDatos(m); setLoading(false) }
    })()
    return () => { vivo = false }
  }, [fin, refreshKey])

  const productos = Object.keys(datos).sort((a, b) => a.localeCompare(b, 'es'))
  const tot = tres.map(s => COLS.map(([, k]) => productos.reduce((t, p) => t + (parseFloat(datos[p]?.[s.ini]?.[k]) || 0), 0)))

  const th = (extra = {}) => ({ padding: '7px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap', ...extra })
  const sep = { borderLeft: '2px solid #CBD5E1' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280' }}>Hasta la semana</label>
        <select value={fin} onChange={e => setFin(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid var(--color-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, background: 'white', cursor: 'pointer' }}>
          {elegibles.map(s => <option key={s.ini} value={s.ini}>{s.label}</option>)}
        </select>
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Se muestran esa semana y las 2 anteriores. El Final de una semana es el Ini de la siguiente.</span>
      </div>

      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#9CA3AF' }}>Cargando…</div>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#9CA3AF' }}>Sin detalle de inventario en estas semanas.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th rowSpan={2} style={th({ textAlign: 'left', padding: '8px 12px', verticalAlign: 'bottom' })}>Producto</th>
                  {tres.map((s, k) => (
                    <th key={s.ini} colSpan={4} style={{ ...th({ textAlign: 'center', color: k === 2 ? '#0A66C2' : '#374151', borderBottom: '1px solid #E5E7EB' }), ...sep }}>{s.label}</th>
                  ))}
                </tr>
                <tr style={{ background: '#F9FAFB' }}>
                  {tres.map(s => COLS.map(([h], j) => (
                    <th key={s.ini + h} style={{ ...th({ color: h === 'Final' ? '#374151' : '#9CA3AF' }), ...(j === 0 ? sep : {}) }}>{h}</th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={p} style={{ background: i % 2 ? '#FAFAFA' : 'white', borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{p}</td>
                    {tres.map(s => {
                      const r = datos[p]?.[s.ini]
                      if (!r) return COLS.map(([h], j) => <td key={s.ini + h} style={{ ...th({ textTransform: 'none', fontWeight: 400, borderBottom: 'none', color: '#D1D5DB' }), ...(j === 0 ? sep : {}) }}>—</td>)
                      return COLS.map(([h, k], j) => {
                        const v = parseFloat(r[k]) || 0
                        const neg = h === 'Final' && v < 0
                        return (
                          <td key={s.ini + h} title={h === 'Ini' && r.qty_inicial_confirmado ? 'Contado físicamente' : undefined}
                            style={{ padding: '8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(j === 0 ? sep : {}),
                              fontWeight: h === 'Final' ? 800 : 500,
                              color: neg ? 'var(--color-danger)' : h === 'Comp' ? '#0A66C2' : h === 'Final' ? '#111827' : '#6B7280',
                              background: neg ? '#FEE2E2' : undefined }}>
                            {h === 'Ini' && r.qty_inicial_confirmado && <span style={{ color: '#057642', marginRight: '3px' }}>✓</span>}{fmtN(v)}
                          </td>
                        )
                      })
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F3F4F6', borderTop: '2px solid #E5E7EB', fontWeight: 800 }}>
                  <td style={{ padding: '9px 12px' }}>TOTAL</td>
                  {tot.map((t, k) => t.map((v, j) => (
                    <td key={k + '-' + j} style={{ padding: '9px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(j === 0 ? sep : {}) }}>{fmtN(v)}</td>
                  )))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
