import { useModuleAudit } from '../hooks/useAudit'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, Download, FileSpreadsheet, ExternalLink } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { traerVista } from '../lib/compras'

// Catálogos del sistema. Se leen tal cual (tabla o vista prp_*); donde hay una
// pantalla para editarlos, `editar` lleva a ella.
const CATALOGOS = [
  { tabla: 'cat_proveedores',            nombre: 'Proveedores',                grupo: 'Compras',      editar: '/proveedores' },
  { tabla: 'cat_productos',              nombre: 'Productos',                  grupo: 'Compras',      editar: '/productos' },
  { tabla: 'cat_clasificacion_producto', nombre: 'Clasificación de productos', grupo: 'Compras',      editar: '/productos' },
  { tabla: 'prp_cat_grupo_gasto',        nombre: 'Grupos de gasto',            grupo: 'Compras' },
  { tabla: 'vending_productos',          nombre: 'Productos de vending',       grupo: 'Vending',      editar: '/vending' },
  { tabla: 'cat_categoria_mantenimiento', nombre: 'Categorías de mantenimiento', grupo: 'Operación', editar: '/mantenimiento' },
  { tabla: 'cat_locales',                nombre: 'Locales',                    grupo: 'Inmobiliario', editar: '/mapa-locales' },
  { tabla: 'cat_despachos',              nombre: 'Despachos',                  grupo: 'Inmobiliario', editar: '/despachos' },
  { tabla: 'prp_tipos_incidencia',       nombre: 'Tipos de incidencia',        grupo: 'RH',           editar: '/rh' },
  { tabla: 'cat_tipo_percepcion',        nombre: 'Tipos de percepción (SAT)',  grupo: 'RH' },
  { tabla: 'cat_tipo_deduccion',         nombre: 'Tipos de deducción (SAT)',   grupo: 'RH' },
  { tabla: 'cat_tipo_otro_pago',         nombre: 'Otros pagos (SAT)',          grupo: 'RH' },
  { tabla: 'prp_cat_estado_general',     nombre: 'Estados generales',          grupo: 'Sistema' },
  { tabla: 'cat_parametros',             nombre: 'Parámetros',                 grupo: 'Sistema',      editar: '/config' },
  { tabla: 'irp_roles',                  nombre: 'Roles de usuario',           grupo: 'Sistema' },
]

// Columnas que casi nunca sirven para consultar valores; se pueden mostrar.
const esTecnica = (col) => col === 'id' || col === 'created_at' || col === 'updated_at' || col.endsWith('_id') || col.endsWith('_url')

const texto = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export default function Catalogos() {
  useModuleAudit('CATALOGOS')
  const [conteos, setConteos] = useState({})
  const [sel, setSel] = useState(CATALOGOS[0])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [tecnicas, setTecnicas] = useState(false)

  useEffect(() => {
    CATALOGOS.forEach(c => {
      supabase.from(c.tabla).select('*', { count: 'exact', head: true })
        .then(({ count, error: e }) => setConteos(m => ({ ...m, [c.tabla]: e ? '!' : count })))
    })
  }, [])

  useEffect(() => {
    setLoading(true); setError(null); setBusca('')
    traerVista(sel.tabla)
      .then(setRows)
      .catch(e => { setRows([]); setError(e.message) })
      .finally(() => setLoading(false))
  }, [sel])

  const columnas = useMemo(() => {
    const todas = [...new Set(rows.flatMap(r => Object.keys(r)))]
    return tecnicas ? todas : todas.filter(c => !esTecnica(c))
  }, [rows, tecnicas])

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase()
    return !q ? rows : rows.filter(r => Object.values(r).some(v => texto(v).toLowerCase().includes(q)))
  }, [rows, busca])

  const nombreArchivo = `catalogo_${sel.tabla.replace(/^prp_/, '')}`

  const exportarCSV = () => {
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]
    const esc = (v) => { const s = texto(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const csv = [cols.join(','), ...filtradas.map(r => cols.map(c => esc(r[c])).join(','))].join('\r\n')
    // BOM para que Excel abra bien los acentos
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = nombreArchivo + '.csv'; a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportarExcel = () => {
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]
    const datos = filtradas.map(r => Object.fromEntries(cols.map(c => [c, Array.isArray(r[c]) || (r[c] && typeof r[c] === 'object') ? texto(r[c]) : r[c]])))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos), sel.nombre.slice(0, 31))
    XLSX.writeFile(wb, nombreArchivo + '.xlsx')
  }

  const exportarTodo = async () => {
    const t = toast.loading('Armando libro con todos los catálogos…')
    const wb = XLSX.utils.book_new()
    for (const c of CATALOGOS) {
      try {
        const d = await traerVista(c.tabla)
        const plano = d.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) || (v && typeof v === 'object') ? texto(v) : v])))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plano.length ? plano : [{ '(vacío)': '' }]), c.nombre.replace(/[\\/?*[\]:]/g, '').slice(0, 31))
      } catch { /* sin acceso a ese catálogo: se omite */ }
    }
    XLSX.writeFile(wb, 'catalogos_irp.xlsx')
    toast.success('Listo', { id: t })
  }

  const grupos = [...new Set(CATALOGOS.map(c => c.grupo))]
  const btn = (color) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: 'white', color, border: `1.5px solid ${color}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' })

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={22} color="#0A66C2" />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A66C2' }}>Catálogos</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Valores de los catálogos del sistema · consulta y exportación</p>
          </div>
        </div>
        <button onClick={exportarTodo} style={btn('#1A3C5E')}><FileSpreadsheet size={14} /> Todos a Excel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: 16, alignItems: 'start' }}>
        {/* Lista de catálogos */}
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          {grupos.map(g => (
            <div key={g}>
              <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px', background: '#F9FAFB' }}>{g}</div>
              {CATALOGOS.filter(c => c.grupo === g).map(c => (
                <div key={c.tabla} onClick={() => setSel(c)} style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: sel.tabla === c.tabla ? '#EFF6FF' : 'white', borderLeft: `3px solid ${sel.tabla === c.tabla ? '#0A66C2' : 'transparent'}`, fontWeight: sel.tabla === c.tabla ? 700 : 500, color: sel.tabla === c.tabla ? '#0A66C2' : '#374151' }}>
                  <span>{c.nombre}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{conteos[c.tabla] ?? '…'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Valores */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{sel.nombre}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{sel.tabla} · {filtradas.length} de {rows.length}</div>
            </div>
            <div style={{ flex: 1 }} />
            {sel.editar && (
              <Link to={sel.editar} style={{ ...btn('#0A66C2'), textDecoration: 'none' }}><ExternalLink size={14} /> Editar en su módulo</Link>
            )}
            <button onClick={exportarCSV} disabled={!rows.length} style={btn('#6B7280')}><Download size={14} /> CSV</button>
            <button onClick={exportarExcel} disabled={!rows.length} style={btn('#057642')}><Download size={14} /> Excel</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar en cualquier columna…" style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={tecnicas} onChange={e => setTecnicas(e.target.checked)} /> Columnas técnicas
            </label>
          </div>

          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
            ) : error ? (
              <div style={{ padding: 24, color: '#B24020', fontSize: 13 }}>No se pudo leer el catálogo: {error}</div>
            ) : !filtradas.length ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Sin valores</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#F9FAFB' }}>
                    {columnas.map(c => (
                      <th key={c} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>{c.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((r, i) => (
                    <tr key={r.id || r.clave || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {columnas.map(c => {
                        const v = texto(r[c])
                        const color = /^#[0-9a-f]{6}$/i.test(v) ? v : null
                        return (
                          <td key={c} title={v.length > 60 ? v : undefined} style={{ padding: '7px 12px', color: v ? '#111827' : '#D1D5DB', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {color && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: color, marginRight: 6, verticalAlign: 'middle' }} />}
                            {v || '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
