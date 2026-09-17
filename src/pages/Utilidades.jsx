import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'
import { Database, Search, RefreshCw, Download, ChevronDown, ChevronUp, Filter, Table2, X, ChevronRight, BarChart2, Rows3, Plus, SlidersHorizontal, Settings, Zap, Eye, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

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

// Detecta el tipo semántico de una columna
function tipoColumna(data, col) {
  const vals = data.map(r => r[col]).filter(v => v !== null && v !== undefined)
  if (!vals.length) return 'text'
  const sample = vals[0]
  if (typeof sample === 'boolean') return 'boolean'
  if (typeof sample === 'number')  return 'numeric'
  if (typeof sample === 'string' && sample.match(/^\d{4}-\d{2}-\d{2}/)) return 'date'
  const uniq = new Set(vals.map(String)).size
  if (uniq <= 25) return 'categorical'
  return 'text'
}

// Aplica un filtro de columna a un valor
function matchFilter(v, filter) {
  if (!filter || !filter.type) return true
  const { type, value, min, max, from, to, values } = filter
  if (type === 'null')    return v === null || v === undefined || v === ''
  if (type === 'notnull') return v !== null && v !== undefined && v !== ''
  // Multi-value (categorical)
  if (type === 'in') return values && values.includes(String(v ?? ''))
  // Numeric range
  if (type === 'numrange') {
    const nv = parseFloat(v)
    if (isNaN(nv)) return false
    if (min !== '' && min !== undefined && nv < parseFloat(min)) return false
    if (max !== '' && max !== undefined && nv > parseFloat(max)) return false
    return true
  }
  // Date range
  if (type === 'daterange') {
    const dv = String(v ?? '').slice(0, 10)
    if (from && dv < from) return false
    if (to   && dv > to)   return false
    return true
  }
  const sv = String(v ?? '').toLowerCase()
  const fv = String(value ?? '').toLowerCase()
  if (type === 'contains')    return sv.includes(fv)
  if (type === 'notcontains') return !sv.includes(fv)
  if (type === 'eq')          return sv === fv
  if (type === 'starts')      return sv.startsWith(fv)
  const nv = parseFloat(v); const nf = parseFloat(value)
  if (type === 'gt')  return !isNaN(nv) && !isNaN(nf) && nv > nf
  if (type === 'gte') return !isNaN(nv) && !isNaN(nf) && nv >= nf
  if (type === 'lt')  return !isNaN(nv) && !isNaN(nf) && nv < nf
  if (type === 'lte') return !isNaN(nv) && !isNaN(nf) && nv <= nf
  return true
}

// ── Panel de filtros inteligente ──────────────────────────────────────────────
function FilterBar({ cols, data, colFilters, setColFilter, clearAllFilters }) {
  const [open, setOpen] = useState(false)
  const [addCol, setAddCol] = useState('')
  const popRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const activeFilters = Object.entries(colFilters).filter(([, f]) => f)

  const filterLabel = (col, f) => {
    if (f.type === 'null')      return `${col}: vacío`
    if (f.type === 'notnull')   return `${col}: no vacío`
    if (f.type === 'in')        return `${col}: ${f.values?.join(', ')}`
    if (f.type === 'numrange')  return `${col}: ${f.min ?? ''}–${f.max ?? ''}`
    if (f.type === 'daterange') return `${col}: ${f.from ?? ''}→${f.to ?? ''}`
    if (f.type === 'contains')  return `${col} ~ "${f.value}"`
    return `${col}: ${f.value}`
  }

  const chipColor = { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' }

  // Sub-componente inline para construir el filtro según tipo
  function FilterBuilder({ col }) {
    const tipo = useMemo(() => tipoColumna(data, col), [col])
    const uniqueVals = useMemo(() => {
      if (!['categorical', 'boolean'].includes(tipo)) return []
      const s = new Set(); data.forEach(r => { if (r[col] !== null && r[col] !== undefined) s.add(String(r[col])) })
      return [...s].sort()
    }, [col, tipo])

    const current = colFilters[col]
    const [selected, setSelected] = useState(current?.type === 'in' ? current.values : [])
    const [numMin, setNumMin]     = useState(current?.type === 'numrange' ? (current.min ?? '') : '')
    const [numMax, setNumMax]     = useState(current?.type === 'numrange' ? (current.max ?? '') : '')
    const [dateFrom, setDateFrom] = useState(current?.type === 'daterange' ? (current.from ?? '') : '')
    const [dateTo, setDateTo]     = useState(current?.type === 'daterange' ? (current.to ?? '')   : '')
    const [textVal, setTextVal]   = useState(current?.type === 'contains'  ? current.value : '')

    const apply = () => {
      if (tipo === 'categorical' || tipo === 'boolean') {
        if (selected.length) setColFilter(col, { type: 'in', values: selected })
        else setColFilter(col, null)
      } else if (tipo === 'numeric') {
        if (numMin !== '' || numMax !== '') setColFilter(col, { type: 'numrange', min: numMin, max: numMax })
        else setColFilter(col, null)
      } else if (tipo === 'date') {
        if (dateFrom || dateTo) setColFilter(col, { type: 'daterange', from: dateFrom, to: dateTo })
        else setColFilter(col, null)
      } else {
        if (textVal) setColFilter(col, { type: 'contains', value: textVal })
        else setColFilter(col, null)
      }
      setOpen(false); setAddCol('')
    }
    const clear = () => { setColFilter(col, null); setOpen(false); setAddCol('') }

    const inp = { padding: '5px 8px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%' }
    const applyBtn = { padding: '6px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }

    return (
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {col} <span style={{ color: '#C7D2FE', fontWeight: 400 }}>({tipo})</span>
        </div>

        {(tipo === 'categorical' || tipo === 'boolean') && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {uniqueVals.map(v => {
                const on = selected.includes(v)
                return (
                  <button key={v} onClick={() => setSelected(s => on ? s.filter(x => x !== v) : [...s, v])}
                    style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1.5px solid',
                      borderColor: on ? 'var(--color-primary)' : '#D1D5DB',
                      background: on ? '#EFF6FF' : 'white', color: on ? 'var(--color-primary)' : '#374151', fontWeight: on ? 700 : 400 }}
                  >{v}</button>
                )
              })}
            </div>
          </div>
        )}
        {tipo === 'numeric' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
            <input type="number" placeholder="Mín" value={numMin} onChange={e => setNumMin(e.target.value)} style={{ ...inp, width: '50%' }} />
            <span style={{ color: '#9CA3AF', fontSize: 11 }}>–</span>
            <input type="number" placeholder="Máx" value={numMax} onChange={e => setNumMax(e.target.value)} style={{ ...inp, width: '50%' }} />
          </div>
        )}
        {tipo === 'date' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6B7280', width: 32 }}>De:</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6B7280', width: 32 }}>A:</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
            </div>
          </div>
        )}
        {tipo === 'text' && (
          <input placeholder="Contiene…" value={textVal} onChange={e => setTextVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
            style={{ ...inp, marginBottom: 10 }} autoFocus />
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={apply} style={applyBtn}>Aplicar</button>
          {current && <button onClick={clear} style={{ ...applyBtn, background: 'none', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>Quitar</button>}
        </div>
      </div>
    )
  }

  if (!cols.length) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderBottom: '1px solid #E5E7EB', background: 'white', flexWrap: 'wrap', minHeight: 40 }}>
      <SlidersHorizontal size={13} color="#6B7280" />
      <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>Filtros</span>

      {/* Chips de filtros activos */}
      {activeFilters.map(([col, f]) => (
        <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: chipColor.bg, border: `1px solid ${chipColor.border}`, borderRadius: 20, fontSize: 11, color: chipColor.text, fontWeight: 600, maxWidth: 220, overflow: 'hidden' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={filterLabel(col, f)}>{filterLabel(col, f)}</span>
          <button onClick={() => setColFilter(col, null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', display: 'flex', alignItems: 'center' }}>
            <X size={11} color="#1E40AF" />
          </button>
        </div>
      ))}

      {/* Botón + Agregar filtro */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setOpen(o => !o); setAddCol('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', border: '1.5px dashed #D1D5DB', borderRadius: 20, background: 'none', cursor: 'pointer', fontSize: 11, color: '#6B7280', fontWeight: 600 }}
        >
          <Plus size={11} /> Agregar filtro
        </button>
        {open && (
          <div ref={popRef} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 280, background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.13)', zIndex: 9999, overflow: 'hidden' }}>
            {!addCol ? (
              <div style={{ padding: '8px 0', maxHeight: 260, overflowY: 'auto' }}>
                <div style={{ padding: '4px 14px 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Selecciona columna
                </div>
                {cols.map(c => {
                  const tipo = tipoColumna(data, c)
                  const iconMap = { numeric: '🔢', date: '📅', categorical: '🏷', boolean: '☑', text: '🔤' }
                  const hasFilter = !!colFilters[c]
                  return (
                    <button key={c} onClick={() => setAddCol(c)}
                      style={{ width: '100%', textAlign: 'left', padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                        background: hasFilter ? '#EFF6FF' : 'none', color: hasFilter ? 'var(--color-primary)' : '#374151', fontWeight: hasFilter ? 700 : 400 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = hasFilter ? '#EFF6FF' : 'none'}
                    >
                      <span style={{ fontSize: 13 }}>{iconMap[tipo] || '🔤'}</span>
                      <span style={{ flex: 1 }}>{c}</span>
                      {hasFilter && <span style={{ fontSize: 10, background: 'var(--color-primary)', color: 'white', borderRadius: 10, padding: '1px 6px' }}>activo</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setAddCol('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#6B7280', fontSize: 16, lineHeight: 1 }}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#374151' }}>{addCol}</span>
                </div>
                <FilterBuilder col={addCol} />
              </>
            )}
          </div>
        )}
      </div>

      {activeFilters.length > 1 && (
        <button onClick={clearAllFilters} style={{ fontSize: 11, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 4px' }}>
          Limpiar todos
        </button>
      )}
    </div>
  )
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

// ── Pivot table component ─────────────────────────────────────────────────────
function PivotTable({ filas, cols, pivotCol, pivotSumCols, onDrillDown }) {
  const numFmt = (v) => typeof v === 'number' ? v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'

  const rows = useMemo(() => {
    if (!pivotCol || !filas.length) return []
    const groups = {}
    filas.forEach(row => {
      const key = String(row[pivotCol] ?? '(vacío)')
      if (!groups[key]) {
        groups[key] = { _val: key, _count: 0 }
        pivotSumCols.forEach(sc => { groups[key][sc] = 0 })
      }
      groups[key]._count++
      pivotSumCols.forEach(sc => { if (typeof row[sc] === 'number') groups[key][sc] += row[sc] })
    })
    const arr = Object.values(groups).sort((a, b) => b._count - a._count)
    const total = arr.reduce((s, g) => s + g._count, 0)
    arr.forEach(g => { g._pct = total ? ((g._count / total) * 100).toFixed(1) : '0.0' })
    return arr
  }, [filas, pivotCol, pivotSumCols])

  if (!pivotCol) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#9CA3AF' }}>
      <BarChart2 size={40} strokeWidth={1} />
      <div style={{ fontSize: '14px', fontWeight: 600 }}>Selecciona una columna para agrupar</div>
      <div style={{ fontSize: '12px' }}>Usa el selector "Agrupar por" en la barra de herramientas</div>
    </div>
  )

  if (!rows.length) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Sin datos</div>

  const totalCount = rows.reduce((s, r) => s + r._count, 0)
  const thS = { padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B7280', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap' }
  const tdS = (extra) => ({ padding: '8px 12px', borderBottom: '1px solid #F3F4F6', fontSize: '13px', ...extra })
  const maxCount = Math.max(...rows.map(r => r._count))

  return (
    <div style={{ overflowAuto: 'auto', height: '100%', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={thS}>{pivotCol}</th>
            <th style={{ ...thS, textAlign: 'right' }}>Registros</th>
            <th style={{ ...thS, textAlign: 'right' }}>%</th>
            <th style={{ ...thS, minWidth: 120 }}>Distribución</th>
            {pivotSumCols.map(sc => <th key={sc} style={{ ...thS, textAlign: 'right' }}>Σ {sc}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._val}
              style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA', cursor: 'pointer' }}
              onClick={() => onDrillDown(pivotCol, r._val)}
              onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFAFA'}
              title={`Filtrar por ${pivotCol} = "${r._val}"`}
            >
              <td style={tdS({ fontWeight: 600, color: '#1E40AF', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} title={r._val}>
                {r._val}
              </td>
              <td style={tdS({ textAlign: 'right', fontWeight: 700, color: '#111827' })}>{r._count.toLocaleString('es-MX')}</td>
              <td style={tdS({ textAlign: 'right', color: '#6B7280' })}>{r._pct}%</td>
              <td style={tdS({ minWidth: 120 })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 4, width: `${(r._count / maxCount) * 100}%`, opacity: 0.8 }} />
                  </div>
                </div>
              </td>
              {pivotSumCols.map(sc => (
                <td key={sc} style={tdS({ textAlign: 'right', color: '#057642', fontWeight: 600 })}>{numFmt(r[sc])}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
            <td style={{ ...tdS({ fontWeight: 700, color: '#374151' }) }}>TOTAL ({rows.length} grupos)</td>
            <td style={{ ...tdS({ textAlign: 'right', fontWeight: 800, color: '#111827' }) }}>{totalCount.toLocaleString('es-MX')}</td>
            <td style={{ ...tdS({ textAlign: 'right', color: '#6B7280', fontWeight: 700 }) }}>100%</td>
            <td />
            {pivotSumCols.map(sc => (
              <td key={sc} style={{ ...tdS({ textAlign: 'right', fontWeight: 800, color: '#057642' }) }}>
                {numFmt(rows.reduce((s, r) => s + (r[sc] || 0), 0))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── HerramientasPanel ─────────────────────────────────────────────────────────
function HerramientasPanel() {
  const [tab, setTab] = useState('cargos')
  const [contratos, setContratos] = useState([])
  const [loadingContratos, setLoadingContratos] = useState(false)

  // Cargos
  const [hastaFecha, setHastaFecha] = useState('2026-09-30')
  const [respetarFechaFin, setRespetarFechaFin] = useState(false)
  const [preview, setPreview] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [progresoCargos, setProgresoCargos] = useState(null)
  const [resultadoCargos, setResultadoCargos] = useState(null)
  const [errorCargos, setErrorCargos] = useState(null)

  // Ingresos
  const [generandoIngresos, setGenerandoIngresos] = useState(false)
  const [progresoIngresos, setProgresoIngresos] = useState(null)
  const [resultadoIngresos, setResultadoIngresos] = useState(null)
  const [errorIngresos, setErrorIngresos] = useState(null)

  // Resumen
  const [resumen, setResumen] = useState(null)
  const [cargandoResumen, setCargandoResumen] = useState(false)
  const [filtroAnio, setFiltroAnio] = useState('todos')

  useEffect(() => { cargarContratos() }, [])

  async function cargarContratos() {
    setLoadingContratos(true)
    const { data } = await supabase
      .from('prp_contratos')
      .select('id, folio, arrendatario_nombre, locales_referencia, locales_display, locales_ids, fecha_inicio, fecha_fin, renta_mensual, dia_pago, estatus')
      .not('estatus', 'eq', 'CANCELADO')
      .order('fecha_inicio')
    setContratos(data || [])
    setLoadingContratos(false)
  }

  function calcularPreview() {
    const hasta = new Date(hastaFecha + 'T12:00:00')
    const rows = contratos
      .filter(c => c.fecha_inicio && c.renta_mensual > 0)
      .map(c => {
        const inicio = new Date(c.fecha_inicio + 'T12:00:00')
        let fin = new Date(hasta)
        if (respetarFechaFin && c.fecha_fin) {
          const ff = new Date(c.fecha_fin + 'T12:00:00')
          if (ff < fin) fin = ff
        }
        let meses = 0
        let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
        const finMes = new Date(fin.getFullYear(), fin.getMonth(), 1)
        while (d <= finMes) { meses++; d = new Date(d.getFullYear(), d.getMonth() + 1, 1) }
        return {
          contrato_id: c.id,
          folio: c.folio || c.locales_referencia || '—',
          arrendatario: c.arrendatario_nombre || '—',
          locales: c.locales_display || c.locales_referencia || '—',
          renta: c.renta_mensual,
          inicio: c.fecha_inicio,
          fin_real: c.fecha_fin,
          fin_efectivo: fin.toISOString().slice(0, 10),
          meses,
          total: meses * c.renta_mensual,
          dia_pago: c.dia_pago || 10,
        }
      })
    setPreview(rows)
  }

  async function generarCargos() {
    setGenerando(true); setErrorCargos(null); setResultadoCargos(null)
    try {
      setProgresoCargos({ texto: 'Verificando cargos existentes…', pct: 5 })
      const { data: existentes, error: e0 } = await supabase
        .from('cargos_programados')
        .select('contrato_id, periodo_mes, periodo_anio')
        .eq('concepto', 'RENTA')
      if (e0) throw e0
      const existSet = new Set((existentes || []).map(e => `${e.contrato_id}_${e.periodo_mes}_${e.periodo_anio}`))
      setProgresoCargos({ texto: 'Calculando registros a insertar…', pct: 15 })
      const hasta = new Date(hastaFecha + 'T12:00:00')
      const lote = []; let omitidos = 0
      for (const c of contratos) {
        if (!c.fecha_inicio || !c.renta_mensual) continue
        const inicio = new Date(c.fecha_inicio + 'T12:00:00')
        let fin = new Date(hasta)
        if (respetarFechaFin && c.fecha_fin) {
          const ff = new Date(c.fecha_fin + 'T12:00:00')
          if (ff < fin) fin = ff
        }
        let d = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
        const finMes = new Date(fin.getFullYear(), fin.getMonth(), 1)
        while (d <= finMes) {
          const mes = d.getMonth() + 1; const anio = d.getFullYear()
          const key = `${c.id}_${mes}_${anio}`
          if (existSet.has(key)) { omitidos++ }
          else {
            const dia = c.dia_pago || 10
            const diaFinal = Math.min(dia, new Date(anio, mes, 0).getDate())
            lote.push({
              contrato_id: c.id,
              concepto: 'RENTA',
              descripcion: `Renta ${c.locales_display || c.locales_referencia || ''} ${mes}/${anio}`.trim(),
              periodo_mes: mes, periodo_anio: anio,
              importe: c.renta_mensual,
              fecha_vencimiento: `${anio}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`,
              estado: 'PAGADO',
              generado_auto: true,
            })
          }
          d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        }
      }
      const total = lote.length; let insertados = 0
      for (let i = 0; i < lote.length; i += 100) {
        const chunk = lote.slice(i, i + 100)
        const { error: err } = await supabase.from('cargos_programados').insert(chunk)
        if (err) throw err
        insertados += chunk.length
        setProgresoCargos({ texto: `Insertando cargos… ${insertados.toLocaleString('es-MX')} / ${total.toLocaleString('es-MX')}`, pct: 15 + Math.round((insertados / total) * 80) })
      }
      setResultadoCargos({ generados: total, omitidos })
    } catch (err) { setErrorCargos(err.message) }
    finally { setGenerando(false); setProgresoCargos(null) }
  }

  async function generarIngresos() {
    setGenerandoIngresos(true); setErrorIngresos(null); setResultadoIngresos(null)
    try {
      setProgresoIngresos({ texto: 'Cargando cargos generados…', pct: 5 })
      const { data: cargos, error: e1 } = await supabase
        .from('cargos_programados')
        .select('id, contrato_id, periodo_mes, periodo_anio, importe, fecha_vencimiento')
        .eq('concepto', 'RENTA').eq('generado_auto', true).eq('estado', 'PAGADO')
      if (e1) throw e1
      setProgresoIngresos({ texto: 'Verificando ingresos existentes…', pct: 15 })
      const { data: aplExist } = await supabase.from('aplicaciones_pago').select('cargo_id')
      const cargosConIngreso = new Set((aplExist || []).map(a => a.cargo_id))
      const pendientes = (cargos || []).filter(c => !cargosConIngreso.has(c.id))
      if (!pendientes.length) {
        setResultadoIngresos({ generados: 0, omitidos: (cargos || []).length })
        setGenerandoIngresos(false); setProgresoIngresos(null); return
      }
      setProgresoIngresos({ texto: 'Cargando info de contratos…', pct: 20 })
      const contratoIds = [...new Set(pendientes.map(c => c.contrato_id))]
      const { data: cInfo } = await supabase
        .from('contratos').select('id, locales_referencia, locales_display').in('id', contratoIds)
      const cMap = Object.fromEntries((cInfo || []).map(c => [c.id, c]))
      const total = pendientes.length; let generados = 0
      for (let i = 0; i < pendientes.length; i += 50) {
        const chunk = pendientes.slice(i, i + 50)
        const ingRows = chunk.map(cargo => {
          const info = cMap[cargo.contrato_id] || {}
          return {
            fecha: cargo.fecha_vencimiento,
            id_contrato: info.locales_referencia || info.locales_display || '',
            tipo: 'RENTA', mes: cargo.periodo_mes, anio: cargo.periodo_anio,
            importe: cargo.importe, contrato_id: cargo.contrato_id,
            origen: 'GENERADO_AUTO', creado_por: 'SISTEMA',
          }
        })
        const { data: ingresosCreados, error: e2 } = await supabase.from('ingresos').insert(ingRows).select('id')
        if (e2) throw e2
        const aplRows = (ingresosCreados || []).map((ing, j) => ({
          ingreso_id: ing.id, cargo_id: chunk[j].id,
          importe_aplicado: chunk[j].importe, fecha_aplicacion: chunk[j].fecha_vencimiento,
        }))
        const { error: e3 } = await supabase.from('aplicaciones_pago').insert(aplRows)
        if (e3) throw e3
        generados += chunk.length
        setProgresoIngresos({ texto: `Generando ingresos… ${generados.toLocaleString('es-MX')} / ${total.toLocaleString('es-MX')}`, pct: 20 + Math.round((generados / total) * 75) })
      }
      setResultadoIngresos({ generados, omitidos: cargosConIngreso.size })
    } catch (err) { setErrorIngresos(err.message) }
    finally { setGenerandoIngresos(false); setProgresoIngresos(null) }
  }

  async function cargarResumen() {
    setCargandoResumen(true)
    const [{ data: cargosData }, { data: contratosData }] = await Promise.all([
      supabase.from('cargos_programados')
        .select('contrato_id, periodo_mes, periodo_anio, importe, estado')
        .eq('concepto', 'RENTA').eq('generado_auto', true),
      supabase.from('prp_contratos')
        .select('id, folio, arrendatario_nombre, locales_display, locales_referencia'),
    ])
    const cMap = Object.fromEntries((contratosData || []).map(c => [c.id, c]))
    const agg = {}
    for (const cargo of (cargosData || [])) {
      if (!agg[cargo.contrato_id]) {
        const info = cMap[cargo.contrato_id] || {}
        agg[cargo.contrato_id] = {
          folio: info.folio || '—', arrendatario: info.arrendatario_nombre || '—',
          locales: info.locales_display || info.locales_referencia || '—',
          years: {}, total: 0, count: 0, pagados: 0, pendientes: 0,
        }
      }
      const entry = agg[cargo.contrato_id]
      if (!entry.years[cargo.periodo_anio]) entry.years[cargo.periodo_anio] = 0
      entry.years[cargo.periodo_anio] += Number(cargo.importe)
      entry.total += Number(cargo.importe); entry.count++
      if (cargo.estado === 'PAGADO') entry.pagados++; else entry.pendientes++
    }
    const rows = Object.values(agg).sort((a, b) => b.total - a.total)
    const allYears = [...new Set((cargosData || []).map(c => c.periodo_anio))].sort()
    setResumen({ rows, years: allYears })
    setCargandoResumen(false)
  }

  const numFmt = v => (v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })
  const tabSt = id => ({
    padding: '9px 18px', border: 'none',
    borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
    marginBottom: -1, background: 'none', cursor: 'pointer', fontSize: '13px',
    fontWeight: tab === id ? 700 : 400, color: tab === id ? 'var(--color-primary)' : '#6B7280',
    display: 'flex', alignItems: 'center', gap: 6,
  })
  const card = { background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 20, marginBottom: 16 }
  const thSt = (right) => ({ padding: '8px 10px', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', fontWeight: 700, fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: right ? 'right' : 'left' })
  const tdSt = (extra) => ({ padding: '7px 10px', borderBottom: '1px solid #F3F4F6', ...extra })

  const ProgressBar = ({ progreso }) => progreso ? (
    <div style={{ ...card, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Loader2 size={15} color="var(--color-primary)" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>{progreso.texto}</span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>{progreso.pct}%</span>
      </div>
      <div style={{ height: 6, background: '#DBEAFE', borderRadius: 3 }}>
        <div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 3, width: `${progreso.pct}%`, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  ) : null

  const ErrorCard = ({ msg }) => msg ? (
    <div style={{ ...card, background: '#FEF2F2', border: '1px solid #FECACA' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertCircle size={16} color="#B24020" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#B24020' }}>Error</div>
          <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: 3, fontFamily: 'monospace' }}>{msg}</div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: '#F9FAFB' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={16} /> Herramientas de Datos
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6B7280' }}>
            Generadores para poblar la base de datos desde contratos
            {loadingContratos
              ? <span style={{ marginLeft: 8, color: '#9CA3AF' }}>Cargando contratos…</span>
              : <span style={{ marginLeft: 8, background: '#DCFCE7', color: '#057642', padding: '1px 8px', borderRadius: 10, fontSize: '12px', fontWeight: 700 }}>{contratos.length} contratos cargados</span>
            }
          </p>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: 'white', borderRadius: '8px 8px 0 0', paddingLeft: 8, marginBottom: 20 }}>
          <button style={tabSt('cargos')} onClick={() => setTab('cargos')}>
            <Zap size={13} /> 1. Generar Cargos
          </button>
          <button style={tabSt('ingresos')} onClick={() => setTab('ingresos')}>
            <Database size={13} /> 2. Generar Ingresos
          </button>
          <button style={tabSt('resumen')} onClick={() => setTab('resumen')}>
            <BarChart2 size={13} /> Resumen
          </button>
        </div>

        {/* ── TAB 1: CARGOS ──────────────────────────────────────────────── */}
        {tab === 'cargos' && (
          <>
            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>Configuración</h3>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Generar hasta (inclusive)
                  </label>
                  <input type="date" value={hastaFecha}
                    onChange={e => { setHastaFecha(e.target.value); setPreview(null) }}
                    style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px', color: '#374151', paddingBottom: 4 }}>
                  <input type="checkbox" checked={respetarFechaFin}
                    onChange={e => { setRespetarFechaFin(e.target.checked); setPreview(null) }}
                    style={{ width: 15, height: 15 }}
                  />
                  Respetar fecha_fin del contrato
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>(contratos vencidos se detienen en su fecha fin)</span>
                </label>
                <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
                  <button onClick={calcularPreview} disabled={loadingContratos || contratos.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#F3F4F6', border: '1.5px solid #E5E7EB', borderRadius: 7, cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#374151' }}
                  >
                    <Eye size={14} /> Ver Preview
                  </button>
                  {preview && (
                    <button onClick={generarCargos} disabled={generando}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--color-primary)', border: 'none', borderRadius: 7, cursor: generando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, color: 'white', opacity: generando ? 0.7 : 1 }}
                    >
                      <Zap size={14} /> Generar {preview.reduce((s, r) => s + r.meses, 0).toLocaleString('es-MX')} Cargos
                    </button>
                  )}
                </div>
              </div>
            </div>

            <ProgressBar progreso={progresoCargos} />
            <ErrorCard msg={errorCargos} />

            {resultadoCargos && (
              <div style={{ ...card, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <CheckCircle size={20} color="#057642" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#057642' }}>
                      {resultadoCargos.generados.toLocaleString('es-MX')} cargos insertados
                    </div>
                    {resultadoCargos.omitidos > 0 && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: 2 }}>
                        {resultadoCargos.omitidos.toLocaleString('es-MX')} omitidos (ya existían)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {preview && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                    Preview — {preview.length} contratos · {preview.reduce((s, r) => s + r.meses, 0).toLocaleString('es-MX')} cargos a insertar
                  </h3>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#057642' }}>
                    {numFmt(preview.reduce((s, r) => s + r.total, 0))} total renta
                  </span>
                </div>
                <div style={{ overflow: 'auto', maxHeight: 440 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {['Folio', 'Arrendatario', 'Locales', 'Inicio', 'Fin contrato', 'Fin efectivo', 'Día pago', 'Meses', 'Renta', 'Total'].map(h => (
                          <th key={h} style={thSt(h === 'Meses' || h === 'Total' || h === 'Renta' || h === 'Día pago')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={r.contrato_id} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                          <td style={tdSt({ fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' })}>{r.folio}</td>
                          <td style={tdSt({ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{r.arrendatario}</td>
                          <td style={tdSt({ color: '#6B7280', whiteSpace: 'nowrap' })}>{r.locales}</td>
                          <td style={tdSt({ whiteSpace: 'nowrap' })}>{r.inicio}</td>
                          <td style={tdSt({ whiteSpace: 'nowrap', color: '#6B7280' })}>{r.fin_real || '—'}</td>
                          <td style={tdSt({ whiteSpace: 'nowrap', color: r.fin_efectivo !== r.fin_real ? 'var(--color-warning)' : '#374151' })}>{r.fin_efectivo}</td>
                          <td style={tdSt({ textAlign: 'right' })}>{r.dia_pago}</td>
                          <td style={tdSt({ textAlign: 'right', fontWeight: 700 })}>{r.meses}</td>
                          <td style={tdSt({ textAlign: 'right' })}>{numFmt(r.renta)}</td>
                          <td style={tdSt({ textAlign: 'right', fontWeight: 700, color: '#057642' })}>{numFmt(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
                        <td colSpan={7} style={{ padding: '8px 10px', fontWeight: 700, fontSize: '12px' }}>TOTAL</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{preview.reduce((s, r) => s + r.meses, 0).toLocaleString('es-MX')}</td>
                        <td />
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#057642' }}>{numFmt(preview.reduce((s, r) => s + r.total, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: INGRESOS ────────────────────────────────────────────── */}
        {tab === 'ingresos' && (
          <>
            <div style={card}>
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700 }}>Generar Ingresos desde Cargos</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
                Para cada cargo <strong>PAGADO / generado_auto</strong> sin ingreso vinculado: crea un registro en <code style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 3 }}>ingresos</code> y su <code style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 3 }}>aplicacion_pago</code> correspondiente.<br />
                La operación es idempotente — los cargos que ya tienen aplicación se omiten.
              </p>
              <button onClick={generarIngresos} disabled={generandoIngresos}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--color-primary)', border: 'none', borderRadius: 7, cursor: generandoIngresos ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, color: 'white', opacity: generandoIngresos ? 0.7 : 1 }}
              >
                <Zap size={14} /> Generar Ingresos y Aplicaciones
              </button>
            </div>
            <ProgressBar progreso={progresoIngresos} />
            <ErrorCard msg={errorIngresos} />
            {resultadoIngresos && (
              <div style={{ ...card, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <CheckCircle size={20} color="#057642" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#057642' }}>
                      {resultadoIngresos.generados.toLocaleString('es-MX')} ingresos generados
                    </div>
                    {resultadoIngresos.omitidos > 0 && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: 2 }}>
                        {resultadoIngresos.omitidos.toLocaleString('es-MX')} cargos ya tenían ingreso vinculado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB 3: RESUMEN ─────────────────────────────────────────────── */}
        {tab === 'resumen' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={cargarResumen} disabled={cargandoResumen}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--color-primary)', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'white', opacity: cargandoResumen ? 0.7 : 1 }}
              >
                <RefreshCw size={14} /> {cargandoResumen ? 'Cargando…' : resumen ? 'Recargar' : 'Cargar Resumen'}
              </button>
              {resumen && (
                <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 7, fontSize: '13px', outline: 'none' }}
                >
                  <option value="todos">Todos los años</option>
                  {resumen.years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {resumen && (
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  {resumen.rows.length} contratos · {resumen.rows.reduce((s, r) => s + r.count, 0).toLocaleString('es-MX')} cargos
                  · {numFmt(resumen.rows.reduce((s, r) => s + r.total, 0))} total
                </span>
              )}
            </div>

            {resumen && (() => {
              const rowsFiltradas = resumen.rows.filter(r => filtroAnio === 'todos' || r.years[filtroAnio])
              const totalFiltrado = rowsFiltradas.reduce((s, r) => s + (filtroAnio === 'todos' ? r.total : (r.years[filtroAnio] || 0)), 0)
              return (
                <div style={card}>
                  <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={thSt(false)}>Folio</th>
                          <th style={thSt(false)}>Arrendatario</th>
                          <th style={thSt(false)}>Locales</th>
                          {filtroAnio === 'todos' && resumen.years.map(y => (
                            <th key={y} style={thSt(true)}>{y}</th>
                          ))}
                          <th style={thSt(true)}>{filtroAnio === 'todos' ? 'Total' : filtroAnio}</th>
                          <th style={thSt(true)}>Meses</th>
                          <th style={thSt(true)}>Pagados</th>
                          <th style={thSt(true)}>Pend.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowsFiltradas.map((r, i) => {
                          const monto = filtroAnio === 'todos' ? r.total : (r.years[filtroAnio] || 0)
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                              <td style={tdSt({ fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' })}>{r.folio}</td>
                              <td style={tdSt({ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{r.arrendatario}</td>
                              <td style={tdSt({ color: '#6B7280', whiteSpace: 'nowrap' })}>{r.locales}</td>
                              {filtroAnio === 'todos' && resumen.years.map(y => (
                                <td key={y} style={tdSt({ textAlign: 'right', color: r.years[y] ? '#374151' : '#E5E7EB', fontSize: '11px' })}>
                                  {r.years[y] ? numFmt(r.years[y]) : '—'}
                                </td>
                              ))}
                              <td style={tdSt({ textAlign: 'right', fontWeight: 700, color: '#057642' })}>{numFmt(monto)}</td>
                              <td style={tdSt({ textAlign: 'right' })}>{r.count}</td>
                              <td style={tdSt({ textAlign: 'right' })}>
                                <span style={{ background: '#DCFCE7', color: '#057642', padding: '1px 7px', borderRadius: 10, fontSize: '11px', fontWeight: 700 }}>{r.pagados}</span>
                              </td>
                              <td style={tdSt({ textAlign: 'right' })}>
                                {r.pendientes > 0
                                  ? <span style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 7px', borderRadius: 10, fontSize: '11px', fontWeight: 700 }}>{r.pendientes}</span>
                                  : <span style={{ color: '#D1D5DB', fontSize: '11px' }}>0</span>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
                          <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 700, fontSize: '12px' }}>
                            TOTAL ({rowsFiltradas.length} contratos)
                          </td>
                          {filtroAnio === 'todos' && resumen.years.map(y => (
                            <td key={y} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#374151', fontSize: '12px' }}>
                              {numFmt(resumen.rows.reduce((s, r) => s + (r.years[y] || 0), 0))}
                            </td>
                          ))}
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#057642' }}>{numFmt(totalFiltrado)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>
                            {rowsFiltradas.reduce((s, r) => s + r.count, 0).toLocaleString('es-MX')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#057642' }}>
                            {rowsFiltradas.reduce((s, r) => s + r.pagados, 0).toLocaleString('es-MX')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#92400E' }}>
                            {rowsFiltradas.reduce((s, r) => s + r.pendientes, 0).toLocaleString('es-MX')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
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
  // Pivot state
  const [modo, setModo] = useState('tabla') // 'tabla' | 'pivot'
  const [pivotCol, setPivotCol] = useState(null)
  const [pivotSumCols, setPivotSumCols] = useState([])
  const [vistaPanel, setVistaPanel] = useState('explorador')

  useEffect(() => {
    if (!tablaActiva) return
    setLoading(true); setError(null); setData([]); setCols([])
    setPivotCol(null); setPivotSumCols([])
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

  const numCols = useMemo(() => cols.filter(c => esNumerico(data, c)), [data, cols])

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

  const drillDown = useCallback((col, val) => {
    setModo('tabla')
    setColFilters(prev => ({ ...prev, [col]: { type: val === '(vacío)' ? 'null' : 'eq', value: val } }))
  }, [])

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
    <div style={{ ...s.page, flexDirection: 'column' }}>
      {/* ── Tabs vista ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: 'white', paddingLeft: 16, flexShrink: 0 }}>
        {[
          { id: 'explorador', icon: <Database size={13} />, label: 'Explorador DB' },
          { id: 'herramientas', icon: <Settings size={13} />, label: 'Herramientas' },
        ].map(t => (
          <button key={t.id} onClick={() => setVistaPanel(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', borderBottom: vistaPanel === t.id ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -1, background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: vistaPanel === t.id ? 700 : 400, color: vistaPanel === t.id ? 'var(--color-primary)' : '#6B7280' }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {vistaPanel === 'herramientas' && <HerramientasPanel />}
      {vistaPanel === 'explorador' && <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} onClick={() => filterMenu && setFilterMenu(null)}>
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
                {tablaActiva.label}
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

              {/* ── Toggle Tabla / Agrupar ── */}
              <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: '7px', overflow: 'hidden' }}>
                {[
                  { id: 'tabla',  icon: <Rows3 size={13} />,     label: 'Tabla' },
                  { id: 'pivot',  icon: <BarChart2 size={13} />,  label: 'Agrupar' },
                ].map(m => (
                  <button key={m.id} onClick={() => setModo(m.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: modo === m.id ? 700 : 400,
                      background: modo === m.id ? 'var(--color-primary)' : 'white',
                      color: modo === m.id ? 'white' : '#6B7280' }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {modo === 'tabla' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '7px', padding: '6px 10px' }}>
                  <Search size={13} color="#9CA3AF" />
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar en resultados..."
                    style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '180px' }}
                  />
                  {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={13} color="#9CA3AF" /></button>}
                </div>
              )}

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

        {/* ── Controles de Pivot ── */}
        {tablaActiva && modo === 'pivot' && cols.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderBottom: '1px solid #E5E7EB', background: '#F8FAFF', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>Agrupar por:</span>
            <select
              value={pivotCol || ''}
              onChange={e => setPivotCol(e.target.value || null)}
              style={{ padding: '5px 8px', border: '1.5px solid #C7D2FE', borderRadius: '6px', fontSize: '12px', outline: 'none', background: 'white', color: '#1E40AF', fontWeight: 600, minWidth: 160 }}
            >
              <option value="">— selecciona columna —</option>
              {cols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {numCols.length > 0 && (
              <>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap', marginLeft: 8 }}>Sumar:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {numCols.map(nc => {
                    const active = pivotSumCols.includes(nc)
                    return (
                      <button key={nc} onClick={() => setPivotSumCols(prev => active ? prev.filter(x => x !== nc) : [...prev, nc])}
                        style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                          borderColor: active ? 'var(--color-success)' : '#D1D5DB',
                          background: active ? '#ECFDF5' : 'white',
                          color: active ? 'var(--color-success)' : '#6B7280' }}
                      >
                        {active ? '✓ ' : ''}{nc}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            {pivotCol && (
              <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: 'auto' }}>
                💡 Clic en una fila para filtrar la vista Tabla
              </span>
            )}
          </div>
        )}

        {/* ── FilterBar ── */}
        {tablaActiva && !loading && cols.length > 0 && (
          <FilterBar cols={cols} data={data} colFilters={colFilters} setColFilter={setColFilter} clearAllFilters={clearAllFilters} />
        )}

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
          {tablaActiva && !loading && !error && data.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>Tabla vacía</div>
          )}

          {/* ── Modo Agrupar ── */}
          {tablaActiva && !loading && !error && data.length > 0 && modo === 'pivot' && (
            <PivotTable filas={filas} cols={cols} pivotCol={pivotCol} pivotSumCols={pivotSumCols} onDrillDown={drillDown} />
          )}

          {/* ── Modo Tabla ── */}
          {tablaActiva && !loading && !error && modo === 'tabla' && (
            <>
              {filas.length === 0 && data.length > 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                  Sin resultados para los filtros aplicados
                  <br />
                  <button onClick={clearAllFilters} style={{ marginTop: '12px', padding: '6px 14px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                    Limpiar filtros
                  </button>
                </div>
              )}
              {filas.length > 0 && (
                <table style={s.table}>
                  <thead>
                    <tr>
                      {cols.map(col => {
                        const hasFilter = !!colFilters[col]
                        const isSort = sort.col === col
                        return (
                          <th key={col} style={s.th}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
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
                              <button
                                onClick={e => openFilter(e, col)}
                                title={hasFilter ? `Filtro activo: ${colFilters[col]?.type} "${colFilters[col]?.value ?? ''}"` : 'Filtrar columna'}
                                style={{ padding: '6px 8px 6px 4px', background: hasFilter ? '#EFF6FF' : 'none', border: 'none', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                              >
                                <ChevronDown size={13} color={hasFilter ? 'var(--color-primary)' : '#9CA3AF'} strokeWidth={hasFilter ? 2.5 : 1.5} />
                              </button>
                            </div>
                            {hasFilter && <div style={{ height: 2, background: 'var(--color-primary)', marginTop: -2 }} />}
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
            </>
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
      </div>}
    </div>
  )
}
