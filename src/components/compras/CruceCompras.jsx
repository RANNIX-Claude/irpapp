import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AMBITOS, pesos, pesos2, fecha, traerVista } from '../../lib/compras'

const th = { padding: '6px 10px', fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }
const td = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #F3F4F6' }
const titulo = { fontSize: 11, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '.4px', margin: '18px 0 8px' }

const Tile = ({ label, val, color = '#111827' }) => (
  <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '8px 12px' }}>
    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
  </div>
)

// Agrupa filas de prp_compras_productos por una llave.
function agrupar(rows, llave, nombre) {
  const m = new Map()
  for (const r of rows) {
    const k = r[llave] || 'sin:' + r[nombre]
    const a = m.get(k) || { k, nombre: r[nombre] || '—', imagen: r.imagen_url, compras: 0, cantidad: 0, total: 0, ultima: null, ultimoPrecio: null, min: Infinity, max: -Infinity }
    a.compras++
    a.cantidad += Number(r.cantidad) || 0
    a.total += Number(r.subtotal) || 0
    const pu = Number(r.precio_unit) || 0
    a.min = Math.min(a.min, pu); a.max = Math.max(a.max, pu)
    if (!a.ultima || r.fecha > a.ultima) { a.ultima = r.fecha; a.ultimoPrecio = pu }
    m.set(k, a)
  }
  return [...m.values()].sort((x, y) => y.total - x.total)
}

/** Ficha de proveedor: cuánto se le ha comprado, en qué ámbitos y qué productos. */
export function ComprasDeProveedor({ proveedorId }) {
  const [res, setRes] = useState(null)
  const [prods, setProds] = useState([])
  const [ultimas, setUltimas] = useState([])

  useEffect(() => {
    if (!proveedorId) return
    traerVista('prp_compras_resumen', q => q.eq('proveedor_id', proveedorId)).then(setRes).catch(() => setRes([]))
    traerVista('prp_compras_productos', q => q.eq('proveedor_id', proveedorId)).then(r => setProds(agrupar(r, 'producto_id', 'producto'))).catch(() => {})
    supabase.from('prp_compras').select('fecha,ambito,grupo,concepto,monto').eq('proveedor_id', proveedorId)
      .order('fecha', { ascending: false }).limit(10).then(({ data }) => setUltimas(data || []))
  }, [proveedorId])

  if (!res) return <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>Cargando compras…</div>
  if (!res.length) return <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>Sin compras registradas a este proveedor.</div>

  const total = res.reduce((s, r) => s + Number(r.monto || 0), 0)
  const compras = res.reduce((s, r) => s + r.compras, 0)
  const ultima = res.reduce((u, r) => !u || r.ultima_fecha > u ? r.ultima_fecha : u, null)
  const porAmbito = AMBITOS.map(a => ({ ...a, monto: res.filter(r => r.ambito === a.id).reduce((s, r) => s + Number(r.monto || 0), 0) })).filter(a => a.monto)
  const porAnio = Object.entries(res.reduce((m, r) => ({ ...m, [r.anio]: (m[r.anio] || 0) + Number(r.monto || 0) }), {})).sort((a, b) => b[0] - a[0])

  return (
    <div>
      <div style={titulo}>Compras</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Tile label="Total comprado" val={pesos(total)} color="#0A66C2" />
        <Tile label="Compras" val={compras} />
        <Tile label="Última compra" val={fecha(ultima)} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {porAmbito.map(a => (
          <span key={a.id} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: a.color + '18', color: a.color }}>{a.label}: {pesos(a.monto)}</span>
        ))}
        {porAnio.map(([anio, m]) => (
          <span key={anio} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#F3F4F6', color: '#374151' }}>{anio}: {pesos(m)}</span>
        ))}
      </div>

      {prods.length > 0 && (
        <>
          <div style={titulo}>Productos que se le compran ({prods.length})</div>
          <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #F3F4F6', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#F9FAFB' }}>
                <th style={{ ...th, textAlign: 'left' }}>Producto</th><th style={{ ...th, textAlign: 'right' }}>Cant.</th>
                <th style={{ ...th, textAlign: 'right' }}>Último precio</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>{prods.map(p => (
                <tr key={p.k}>
                  <td style={td}>{p.nombre}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{p.cantidad.toLocaleString('es-MX')}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{pesos2(p.ultimoPrecio)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(p.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      <div style={titulo}>Últimas compras</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>{ultimas.map((u, i) => (
          <tr key={i}>
            <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280' }}>{fecha(u.fecha)}</td>
            <td style={td}>{u.grupo || '—'}{u.concepto ? <span style={{ color: '#9CA3AF' }}> · {u.concepto}</span> : null}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(u.monto)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

/** Ficha de producto: a qué proveedores se le compra y a qué precio. */
export function ComprasDeProducto({ productoId }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!productoId) return
    traerVista('prp_compras_productos', q => q.eq('producto_id', productoId).order('fecha', { ascending: false }))
      .then(setRows).catch(() => setRows([]))
  }, [productoId])

  if (!rows) return <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>Cargando compras…</div>
  if (!rows.length) return <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16, padding: 12, background: '#F8FAFC', borderRadius: 8 }}>Todavía no aparece en ningún ticket.</div>

  const provs = agrupar(rows, 'proveedor_id', 'proveedor')
  const total = rows.reduce((s, r) => s + Number(r.subtotal || 0), 0)
  const cant = rows.reduce((s, r) => s + Number(r.cantidad || 0), 0)
  const mejor = provs.filter(p => p.ultimoPrecio > 0).sort((a, b) => a.ultimoPrecio - b.ultimoPrecio)[0]

  return (
    <div>
      <div style={titulo}>Compras</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Tile label="Total" val={pesos(total)} color="#0A66C2" />
        <Tile label="Cantidad" val={cant.toLocaleString('es-MX')} />
        <Tile label="Último precio" val={pesos2(rows[0].precio_unit)} />
        <Tile label="Más barato" val={mejor ? mejor.nombre : '—'} color="#057642" />
      </div>

      <div style={titulo}>Proveedores ({provs.length})</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #F3F4F6' }}>
        <thead><tr style={{ background: '#F9FAFB' }}>
          <th style={{ ...th, textAlign: 'left' }}>Proveedor</th><th style={{ ...th, textAlign: 'right' }}>Veces</th>
          <th style={{ ...th, textAlign: 'right' }}>Precio mín–máx</th><th style={{ ...th, textAlign: 'right' }}>Último</th>
          <th style={{ ...th, textAlign: 'right' }}>Total</th>
        </tr></thead>
        <tbody>{provs.map(p => (
          <tr key={p.k}>
            <td style={{ ...td, fontWeight: 600 }}>{p.nombre}</td>
            <td style={{ ...td, textAlign: 'right' }}>{p.compras}</td>
            <td style={{ ...td, textAlign: 'right', color: '#6B7280' }}>{pesos2(p.min)} – {pesos2(p.max)}</td>
            <td style={{ ...td, textAlign: 'right' }}>{pesos2(p.ultimoPrecio)} <span style={{ color: '#9CA3AF', fontSize: 10 }}>{fecha(p.ultima)}</span></td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(p.total)}</td>
          </tr>
        ))}</tbody>
      </table>

      <div style={titulo}>Historial</div>
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>{rows.slice(0, 50).map(r => (
            <tr key={r.detalle_id}>
              <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280' }}>{fecha(r.fecha)}</td>
              <td style={td}>{r.proveedor}<span style={{ color: '#9CA3AF' }}> · {r.descripcion}</span></td>
              <td style={{ ...td, textAlign: 'right' }}>{Number(r.cantidad).toLocaleString('es-MX')} × {pesos2(r.precio_unit)}</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pesos2(r.subtotal)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
