import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'
import { Database, Search, RefreshCw, Download, ChevronDown, ChevronUp, Filter, Table2, X, ChevronRight } from 'lucide-react'

// ── Tablas disponibles ────────────────────────────────────────────────────────
const TABLAS = [
  { schema: 'public', table: 'prp_gastos',                    label: 'Gastos Operativos',       grupo: 'Operación' },
  { schema: 'public', table: 'prp_cobros',                    label: 'Cobros Programados',      grupo: 'Operación' },
  { schema: 'public', table: 'prp_movimientos_bancarios',     label: 'Movimientos Bancarios',   grupo: 'Operación' },
  { schema: 'public', table: 'prp_fondos_revolventes',        label: 'Fondos Revolventes',      grupo: 'Operación' },
  { schema: 'public', table: 'prp_fondo_revolvente_cierres',  label: 'Cierres Fondo Rev.',      grupo: 'Operación' },
  { schema: 'public', table: 'vending_productos',             label: 'Productos Vending',       grupo: 'Operación' },
  { schema: 'public', table: 'prp_vending_semanas',           label: 'Cierres Vending',         grupo: 'Operación' },
  { schema: 'public', table: 'prp_contratos',                 label: 'Contratos',               grupo: 'Contratos' },
  { schema: 'public', table: 'prp_arrendatarios',             label: 'Arrendatarios',           grupo: 'Contratos' },
  { schema: 'public', table: 'prp_unidades',                  label: 'Unidades / Locales',      grupo: 'Contratos' },
  { schema: 'public', table: 'prp_inmuebles',                 label: 'Inmuebles',               grupo: 'Contratos' },
  { schema: 'public', table: 'prp_adendums',                  label: 'Addendums',               grupo: 'Contratos' },
  { schema: 'public', table: 'prp_notas_contrato',            label: 'Notas Contrato',          grupo: 'Contratos' },
  { schema: 'public', table: 'rh_empleados',                  label: 'Empleados',               grupo: 'RH' },
  { schema: 'public', table: 'rh_contratos',                  label: 'Contratos RH',            grupo: 'RH' },
  { schema: 'public', table: 'rh_vacantes',                   label: 'Vacantes',                grupo: 'RH' },
  { schema: 'public', table: 'rh_candidatos',                 label: 'Candidatos',              grupo: 'RH' },
  { schema: 'public', table: 'rh_asistencia',                 label: 'Asistencia',              grupo: 'RH' },
  { schema: 'public', table: 'nomina_periodos',               label: 'Períodos Nómina',         grupo: 'RH' },
  { schema: 'public', table: 'prp_estacionamiento',           label: 'Accesos Estacionamiento', grupo: 'Estacionamiento' },
  { schema: 'public', table: 'prp_cajones_estacionamiento',   label: 'Cajones',                 grupo: 'Estacionamiento' },
  { schema: 'public', table: 'prp_pensiones_estacionamiento', label: 'Pensiones',               grupo: 'Estacionamiento' },
  { schema: 'public', table: 'prp_estacionamiento_mensual',   label: 'Resumen Mensual',         grupo: 'Estacionamiento' },
  { schema: 'public', table: 'prp_cat_grupo_gasto',           label: 'Cat. Grupos Gasto',       grupo: 'Catálogos' },
  { schema: 'public', table: 'prp_cat_estado_general',        label: 'Cat. Estados',            grupo: 'Catálogos' },
  { schema: 'public', table: 'prp_proveedores',               label: 'Proveedores',             grupo: 'Catálogos' },
  { schema: 'public', table: 'irp_roles',                     label: 'Roles IRP',               grupo: 'Catálogos' },
  { schema: 'public', table: 'irp_usuarios',                  label: 'Usuarios IRP',            grupo: 'Catálogos' },
  { schema: 'public', table: 'prp_bitacora',                  label: 'Bitácora',                grupo: 'Sistema' },
]

const GRUPOS = [...new Set(TABLAS.map(t => t.grupo))]

// Detecta si un valor de columna parece numérico basado en los datos
function esNumerico(data, col) {
  const sample = data.find(r => r[col] !== null && r[col] !== undefined)
  return sample && typeof sample[col] === 'number'
}

function fmt(v) {
  if (v === null || v === undefined) return <span style={{ color: '#D1D5DB', fontStyle: 'italic', fontSize: '11px' }}>NULL</span>
  if (typeof v === 'boolean') return <span style={{ color: v ? '#057642' : '#B24020', fontWeight: 600 }}>{v ? 'TRUE' : 'FALSE'}</span>
  if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
    return v.length > 10 ? new Date(v).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : v
  }
  if (typeof v === 'number') return v.toLocaleString('es-MX')
  if (typeof v === 'string' && v.length > 80) return <span title={v}>{v.substring(0, 80)}…</span>
  return String(v)
}

// Aplica un filtro de columna a un valor
function matchFilter(v, filter) {
  if (!filter || !filter.type) return true
  const { type, value } = filter
  if (type === 'null')    return v === null || v === undefined || v === ''
  if (type === 'notnull') return v !== null && v !== undefined && v !== ''
  const sv = String(v ?? '').toLowerCase()
  const fv = String(value ?? '').toLowerCase()
  if (type === 'contains')   return sv.includes(fv)
  if (type === 'notcontains') return !sv.includes(fv)
  if (type === 'eq')         return sv === fv
  if (type === 'starts')     return sv.startsWith(fv)
  const nv = parseFloat(v); const nf = parseFloat(value)
  if (type === 'gt')  return !isNaN(nv) && !isNaN(nf) && nv > nf
  if (type === 'gte') return !isNaN(nv) && !isNaN(nf) && nv >= nf
  if (type === 'lt')  return !isNaN(nv) && !isNaN(nf) && nv < nf
  if (type === 'lte') return !isNaN(nv) && !isNaN(nf) && nv <= nf
  return true
}

// ── Dropdown de filtro por columna ────────────────────────────────────────────
function FilterMenu({ col, data, filter, onChange, onClose, anchorRect }) {
  const ref = useRef(null)
  const isNum = esNumerico(data, col)

  // Valores únicos de la columna (hasta 20 para mostrar como opciones rápidas)
  const uniqueVals = useMemo(() => {
    const s = new Set()
    data.forEach(r => { if (r[col] !== null && r[col] !== undefined) s.add(String(r[col])) })
    return [...s].sort().slice(0, 20)
  }, [data, col])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const [localType, setLocalType] = useState(filter?.type ?? 'contains')
  const [localVal, setLocalVal] = useState(filter?.value ?? '')

  const apply = (type, value) => {
    onChange(col, { type, value })
    onClose()
  }
  const applyLocal = () => apply(localType, localVal)
  const clear = () => { onChange(col, null); onClose() }

  // Posicionamiento: debajo del header
  const style = {
    position: 'fixed',
    top: (anchorRect?.bottom ?? 100) + 2,
    left: Math.min(anchorRect?.left ?? 0, window.innerWidth - 280),
    width: 270,
    background: 'white',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
    zIndex: 9999,
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
  }

  const btnRow = (label, type, value = '') => (
    <button
      key={type + value}
      onClick={() => apply(type, value)}
      style={{
        width: '100%', textAlign: 'left', padding: '7px 14px', border: 'none',
        cursor: 'pointer', fontSize: 12, color: '#374151',
        fontWeight: filter?.type === type ? 700 : 400,
        background: filter?.type === type ? '#EFF6FF' : 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
      onMouseLeave={e => e.currentTarget.style.background = filter?.type === type ? '#EFF6FF' : 'none'}
    >
      {label}
    </button>
  )

  return (
    <div ref={ref} style={style}>
      {/* Header del menú */}
      <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Filtrar: {col}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <X size={14} color="#9CA3AF" />
        </button>
      </div>

      {/* Accesos rápidos */}
      <div style={{ padding: '6px 0 2px' }}>
        {btnRow('🚫  Es vacío (NULL)', 'null')}
        {btnRow('✅  No es vacío', 'notnull')}
      </div>

      <div style={{ height: 1, background: '#F3F4F6', margin: '2px 0' }} />

      {/* Filtro de texto / número personalizado */}
      <div style={{ padding: '8px 14px' }}>
        <select
          value={localType}
          onChange={e => setLocalType(e.target.value)}
          style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 12, marginBottom: 6, outline: 'none' }}
        >
          <option value="contains">Contiene</option>
          <option value="notcontains">No contiene</option>
          <option value="eq">Es igual a</option>
          <option value="starts">Empieza con</option>
          {isNum && <option value="gt">Mayor que</option>}
          {isNum && <option value="gte">Mayor o igual que</option>}
          {isNum && <option value="lt">Menor que</option>}
          {isNum && <option value="lte">Menor o igual que</option>}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyLocal()}
            placeholder="Valor…"
            autoFocus
            type={isNum && ['gt','gte','lt','lte'].includes(localType) ? 'number' : 'text'}
            style={{ flex: 1, padding: '5px 8px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={applyLocal}
            style={{ padding: '5px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            OK
          </button>
        </div>
      </div>

      {/* Valores únicos de la columna */}
      {uniqueVals.length > 0 && uniqueVals.length <= 20 && (
        <>
          <div style={{ height: 1, background: '#F3F4F6', margin: '2px 0' }} />
          <div style={{ padding: '4px 0', maxHeight: 160, overflowY: 'auto' }}>
            <div style={{ padding: '4px 14px 2px', fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Valores únicos
            </div>
            {uniqueVals.map(v => (
              <button
                key={v}
                onClick={() => apply('eq', v)}
                style={{
                  width: '100%', textAlign: 'left', padding: '5px 14px', border: 'none',
                  background: filter?.type === 'eq' && String(filter?.value) === v ? '#EFF6FF' : 'none',
                  cursor: 'pointer', fontSize: 12, color: '#374151',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = filter?.type === 'eq' && String(filter?.value) === v ? '#EFF6FF' : 'none'}
                title={v}
              >
                {v.length > 32 ? v.substring(0, 32) + '…' : v}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Limpiar filtro */}
      {filter && (
        <>
          <div style={{ height: 1, background: '#F3F4F6', margin: '2px 0' }} />
          <button
            onClick={clear}
            style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, textAlign: 'left' }}
          >
            ✕  Limpiar filtro
          </button>
        </>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Utilidades() {
  useModuleAudit('Utilidades')

  const [tablaActiva, setTablaActiva] = useState(null)
  const [data, setData] = useState([])
  const [cols, setCols] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [limite, setLimite] = useState(100)
  const [sort, setSort] = useState({ col: null, asc: true })
  const [colFilters, setColFilters] = useState({})  // { colName: { type, value } }
  const [filterMenu, setFilterMenu] = useState(null) // { col, rect }
  const [grupoAbierto, setGrupoAbierto] = useState('Operación')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!tablaActiva) return
    setLoading(true); setError(null); setData([]); setCols([])
    const { schema, table } = tablaActiva
    ;(async () => {
      try {
        const q = supabase.from(table).select('*').limit(limite)
        const { data: rows, error: err } = await q
        if (err) throw err
        setData(rows || [])
        if (rows?.length) setCols(Object.keys(rows[0]))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [tablaActiva, limite, refresh])

  // Filtrado y ordenamiento — aplica busqueda global + filtros por columna
  const filas = useMemo(() => {
    let list = [...data]

    // Búsqueda global
    if (busqueda) {
      const q = busqueda.toLowerCase()
      list = list.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)))
    }

    // Filtros por columna
    const activeFilters = Object.entries(colFilters).filter(([, f]) => f)
    if (activeFilters.length) {
      list = list.filter(r => activeFilters.every(([col, filter]) => matchFilter(r[col], filter)))
    }

    // Ordenamiento
    if (sort.col) {
      list.sort((a, b) => {
        const va = a[sort.col] ?? ''; const vb = b[sort.col] ?? ''
        return sort.asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
      })
    }
    return list
  }, [data, busqueda, colFilters, sort])

  const toggleSort = (col) => setSort(s => s.col === col ? { col, asc: !s.asc } : { col, asc: true })

  const openFilter = useCallback((e, col) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterMenu(prev => prev?.col === col ? null : { col, rect })
  }, [])

  const setColFilter = useCallback((col, filter) => {
    setColFilters(prev => ({ ...prev, [col]: filter }))
  }, [])

  const clearAllFilters = () => { setColFilters({}); setBusqueda('') }

  const activeFilterCount = Object.values(colFilters).filter(Boolean).length

  const exportCSV = () => {
    if (!filas.length) return
    const header = cols.join(',')
    const rows = filas.map(r => cols.map(c => {
      const v = r[c]; const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${tablaActiva?.table}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const s = {
    page:    { display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' },
    sidebar: { width: '230px', flexShrink: 0, background: '#F9FAFB', borderRight: '1px solid #E5E7EB', overflowY: 'auto', padding: '12px 0' },
    main:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    toolbar: { display: 'flex', gap: '8px', padding: '12px 16px', borderBottom: '1px solid #E5E7EB', alignItems: 'center', flexWrap: 'wrap', background: 'white' },
    table:   { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th:      { padding: '0', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B7280', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap', userSelect: 'none', position: 'sticky', top: 0, zIndex: 10 },
    td:      { padding: '7px 10px', borderBottom: '1px solid #F3F4F6', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' },
    inp:     { padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none' },
  }

  return (
    <div style={s.page} onClick={() => filterMenu && setFilterMenu(null)}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div style={s.sidebar}>
        <div style={{ padding: '4px 12px 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>
          <Database size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Tablas DB
        </div>
        {GRUPOS.map(grupo => (
          <div key={grupo}>
            <button
              onClick={() => setGrupoAbierto(g => g === grupo ? null : grupo)}
              style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}
            >
              {grupo}
              {grupoAbierto === grupo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {grupoAbierto === grupo && TABLAS.filter(t => t.grupo === grupo).map(t => (
              <button
                key={`${t.schema}.${t.table}`}
                onClick={() => { setTablaActiva(t); setBusqueda(''); setSort({ col: null, asc: true }); setColFilters({}); setFilterMenu(null) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 16px 6px 20px',
                  background: tablaActiva?.table === t.table ? '#EFF6FF' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: '12px',
                  color: tablaActiva?.table === t.table ? 'var(--color-primary)' : '#374151',
                  fontWeight: tablaActiva?.table === t.table ? 700 : 400,
                  borderLeft: tablaActiva?.table === t.table ? '3px solid var(--color-primary)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Table2 size={11} />
                {t.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Panel principal ──────────────────────────────────────────────── */}
      <div style={s.main}>
        {/* Toolbar */}
        <div style={s.toolbar}>
          {tablaActiva ? (
            <>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-dark)', marginRight: '4px' }}>
                {tablaActiva.schema}.{tablaActiva.table}
              </div>
              <span style={{ fontSize: '12px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: '5px' }}>
                {filas.length}{filas.length < data.length ? ` / ${data.length}` : ''} filas
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#92400E', fontWeight: 600 }}
                >
                  <Filter size={11} />
                  {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}
                  <X size={11} />
                </button>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '7px', padding: '6px 10px' }}>
                <Search size={13} color="#9CA3AF" />
                <input
                  value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar en resultados..."
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '180px' }}
                />
                {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={13} color="#9CA3AF" /></button>}
              </div>
              <select value={limite} onChange={e => setLimite(Number(e.target.value))} style={s.inp}>
                <option value={50}>50 filas</option>
                <option value={100}>100 filas</option>
                <option value={250}>250 filas</option>
                <option value={500}>500 filas</option>
                <option value={1000}>1,000 filas</option>
              </select>
              <button onClick={() => setRefresh(r => r + 1)} title="Recargar" style={{ padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', background: 'white', cursor: 'pointer' }}>
                <RefreshCw size={14} color="#6B7280" />
              </button>
              <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: 'none', borderRadius: '7px', background: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                <Download size={13} /> CSV
              </button>
            </>
          ) : (
            <span style={{ fontSize: '14px', color: '#9CA3AF' }}>← Selecciona una tabla del panel izquierdo</span>
          )}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          {!tablaActiva && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#9CA3AF' }}>
              <Database size={48} strokeWidth={1} />
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Browser de Base de Datos</div>
              <div style={{ fontSize: '13px' }}>Selecciona una tabla del panel izquierdo para ver su contenido</div>
            </div>
          )}
          {tablaActiva && loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Cargando…</div>
          )}
          {tablaActiva && error && (
            <div style={{ padding: '20px', color: 'var(--color-danger)', fontSize: '13px', background: '#FEF2F2', margin: '16px', borderRadius: '8px' }}>
              ⚠️ {error}
            </div>
          )}
          {tablaActiva && !loading && !error && filas.length === 0 && data.length > 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
              Sin resultados para los filtros aplicados
              <br />
              <button onClick={clearAllFilters} style={{ marginTop: '12px', padding: '6px 14px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                Limpiar filtros
              </button>
            </div>
          )}
          {tablaActiva && !loading && !error && data.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>Tabla vacía</div>
          )}
          {tablaActiva && !loading && filas.length > 0 && (
            <table style={s.table}>
              <thead>
                <tr>
                  {cols.map(col => {
                    const hasFilter = !!colFilters[col]
                    const isSort = sort.col === col
                    return (
                      <th key={col} style={s.th}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                          {/* Área de ordenamiento: clic en nombre */}
                          <div
                            onClick={() => toggleSort(col)}
                            style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '8px 4px 8px 10px', flex: 1, cursor: 'pointer', minWidth: 0 }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: isSort ? 'var(--color-primary)' : '#6B7280' }}>
                              {col}
                            </span>
                            {isSort
                              ? (sort.asc ? <ChevronUp size={11} color="var(--color-primary)" /> : <ChevronDown size={11} color="var(--color-primary)" />)
                              : <span style={{ width: 11, display: 'inline-block' }} />
                            }
                          </div>
                          {/* Botón de filtro */}
                          <button
                            onClick={e => openFilter(e, col)}
                            title={hasFilter ? `Filtro activo: ${colFilters[col]?.type} "${colFilters[col]?.value ?? ''}"` : 'Filtrar columna'}
                            style={{
                              padding: '6px 8px 6px 4px',
                              background: hasFilter ? '#EFF6FF' : 'none',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <ChevronDown
                              size={13}
                              color={hasFilter ? 'var(--color-primary)' : '#9CA3AF'}
                              strokeWidth={hasFilter ? 2.5 : 1.5}
                            />
                          </button>
                        </div>
                        {/* Indicador de filtro activo */}
                        {hasFilter && (
                          <div style={{ height: 2, background: 'var(--color-primary)', marginTop: -2 }} />
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filas.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFAFA'}
                  >
                    {cols.map(col => (
                      <td key={col} style={{ ...s.td, background: colFilters[col] ? 'rgba(10,102,194,0.04)' : 'inherit' }} title={String(row[col] ?? '')}>
                        {fmt(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Filter dropdown (portal-style fixed) ─────────────────────────── */}
      {filterMenu && (
        <FilterMenu
          col={filterMenu.col}
          data={data}
          filter={colFilters[filterMenu.col]}
          onChange={setColFilter}
          onClose={() => setFilterMenu(null)}
          anchorRect={filterMenu.rect}
        />
      )}
    </div>
  )
}
