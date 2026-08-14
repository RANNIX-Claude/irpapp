import { useState, useEffect, useMemo } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { supabase } from '../lib/supabase'
import { Database, Search, RefreshCw, Download, ChevronDown, ChevronUp, Filter, Table2 } from 'lucide-react'

// ── Tablas disponibles con sus columnas de filtro sugeridas ──────────────────
// Todas las tablas usan schema 'public' — las prp.* se exponen como vistas public.prp_*
const TABLAS = [
  // OPERACIÓN
  { schema: 'public', table: 'prp_gastos',                    label: 'Gastos Operativos',       grupo: 'Operación',       filtros: ['fecha', 'proveedor_nombre', 'descripcion'] },
  { schema: 'public', table: 'prp_cobros',                    label: 'Cobros Programados',      grupo: 'Operación',       filtros: ['referencia_pago', 'estatus', 'mes', 'anio'] },
  { schema: 'public', table: 'prp_movimientos_bancarios',     label: 'Movimientos Bancarios',   grupo: 'Operación',       filtros: ['fecha_movimiento', 'referencia_banco', 'descripcion'] },
  { schema: 'public', table: 'prp_fondos_revolventes',        label: 'Fondos Revolventes',      grupo: 'Operación',       filtros: ['nombre', 'estatus'] },
  { schema: 'public', table: 'prp_fondo_revolvente_cierres',  label: 'Cierres Fondo Rev.',      grupo: 'Operación',       filtros: ['fecha_cierre'] },
  { schema: 'public', table: 'vending_productos',             label: 'Productos Vending',       grupo: 'Operación',       filtros: ['nombre', 'categoria'] },
  { schema: 'public', table: 'prp_vending_semanas',           label: 'Cierres Vending',         grupo: 'Operación',       filtros: ['fecha_inicio'] },
  // CONTRATOS
  { schema: 'public', table: 'prp_contratos',                 label: 'Contratos',               grupo: 'Contratos',       filtros: ['folio_contrato', 'estatus'] },
  { schema: 'public', table: 'prp_arrendatarios',             label: 'Arrendatarios',           grupo: 'Contratos',       filtros: ['nombre', 'apellidos', 'rfc'] },
  { schema: 'public', table: 'prp_unidades',                  label: 'Unidades / Locales',      grupo: 'Contratos',       filtros: ['numero_local', 'estatus'] },
  { schema: 'public', table: 'prp_inmuebles',                 label: 'Inmuebles',               grupo: 'Contratos',       filtros: ['nombre'] },
  { schema: 'public', table: 'prp_adendums',                  label: 'Addendums',               grupo: 'Contratos',       filtros: [] },
  { schema: 'public', table: 'prp_notas_contrato',            label: 'Notas Contrato',          grupo: 'Contratos',       filtros: [] },
  // RH
  { schema: 'public', table: 'rh_empleados',                  label: 'Empleados',               grupo: 'RH',              filtros: ['numero_empleado', 'puesto', 'area'] },
  { schema: 'public', table: 'rh_contratos',                  label: 'Contratos RH',            grupo: 'RH',              filtros: ['tipo_contrato'] },
  { schema: 'public', table: 'rh_vacantes',                   label: 'Vacantes',                grupo: 'RH',              filtros: ['puesto', 'area', 'estatus'] },
  { schema: 'public', table: 'rh_candidatos',                 label: 'Candidatos',              grupo: 'RH',              filtros: ['nombre', 'etapa'] },
  { schema: 'public', table: 'rh_asistencia',                 label: 'Asistencia',              grupo: 'RH',              filtros: ['fecha'] },
  { schema: 'public', table: 'nomina_periodos',               label: 'Períodos Nómina',         grupo: 'RH',              filtros: ['periodicidad', 'estado'] },
  // ESTACIONAMIENTO
  { schema: 'public', table: 'prp_estacionamiento',           label: 'Accesos Estacionamiento', grupo: 'Estacionamiento', filtros: ['fecha_hora_entrada', 'tipo_acceso'] },
  { schema: 'public', table: 'prp_cajones_estacionamiento',   label: 'Cajones',                 grupo: 'Estacionamiento', filtros: ['numero_cajon', 'tipo'] },
  { schema: 'public', table: 'prp_pensiones_estacionamiento', label: 'Pensiones',               grupo: 'Estacionamiento', filtros: ['estatus'] },
  { schema: 'public', table: 'prp_estacionamiento_mensual',   label: 'Resumen Mensual',         grupo: 'Estacionamiento', filtros: ['mes', 'anio'] },
  // CATÁLOGOS
  { schema: 'public', table: 'prp_cat_grupo_gasto',           label: 'Cat. Grupos Gasto',       grupo: 'Catálogos',       filtros: ['clave'] },
  { schema: 'public', table: 'prp_cat_estado_general',        label: 'Cat. Estados',            grupo: 'Catálogos',       filtros: ['clave'] },
  { schema: 'public', table: 'prp_proveedores',               label: 'Proveedores',             grupo: 'Catálogos',       filtros: ['nombre', 'rfc'] },
  { schema: 'public', table: 'irp_roles',                     label: 'Roles IRP',               grupo: 'Catálogos',       filtros: ['id', 'nombre'] },
  { schema: 'public', table: 'irp_usuarios',                  label: 'Usuarios IRP',            grupo: 'Catálogos',       filtros: ['rol_id', 'nombre'] },
  // SISTEMA
  { schema: 'public', table: 'prp_bitacora',                  label: 'Bitácora',                grupo: 'Sistema',         filtros: ['modulo', 'accion', 'usuario_email'] },
]

const GRUPOS = [...new Set(TABLAS.map(t => t.grupo))]

function fmt(v) {
  if (v === null || v === undefined) return <span style={{ color: '#D1D5DB' }}>NULL</span>
  if (typeof v === 'boolean') return <span style={{ color: v ? '#057642' : '#B24020', fontWeight: 600 }}>{v ? 'TRUE' : 'FALSE'}</span>
  if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
    return v.length > 10 ? new Date(v).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : v
  }
  if (typeof v === 'number') return v.toLocaleString('es-MX')
  if (typeof v === 'string' && v.length > 80) return <span title={v}>{v.substring(0, 80)}…</span>
  return String(v)
}

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
  const [grupoAbierto, setGrupoAbierto] = useState('Operación')
  const [refresh, setRefresh] = useState(0)

  // Cargar datos cuando se selecciona una tabla
  useEffect(() => {
    if (!tablaActiva) return
    setLoading(true); setError(null); setData([]); setCols([])
    const { schema, table } = tablaActiva
    ;(async () => {
      try {
        let q = schema === 'public'
          ? supabase.from(table).select('*').limit(limite)
          : supabase.schema(schema).from(table).select('*').limit(limite)
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

  // Filtrado y ordenamiento local
  const filas = useMemo(() => {
    let list = [...data]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      list = list.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)))
    }
    if (sort.col) {
      list.sort((a, b) => {
        const va = a[sort.col] ?? ''; const vb = b[sort.col] ?? ''
        return sort.asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
      })
    }
    return list
  }, [data, busqueda, sort])

  const toggleSort = (col) => setSort(s => s.col === col ? { col, asc: !s.asc } : { col, asc: true })

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
    a.download = `${tablaActiva?.table}_${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  const s = {
    page: { display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' },
    sidebar: { width: '230px', flexShrink: 0, background: '#F9FAFB', borderRight: '1px solid #E5E7EB', overflowY: 'auto', padding: '12px 0' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    toolbar: { display: 'flex', gap: '8px', padding: '12px 16px', borderBottom: '1px solid #E5E7EB', alignItems: 'center', flexWrap: 'wrap', background: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th: { padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6B7280', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' },
    td: { padding: '7px 10px', borderBottom: '1px solid #F3F4F6', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' },
    inp: { padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: '7px', fontSize: '13px', outline: 'none' },
  }

  return (
    <div style={s.page}>
      {/* ── Sidebar: lista de tablas ────────────────────────────────────── */}
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
                onClick={() => { setTablaActiva(t); setBusqueda(''); setSort({ col: null, asc: true }) }}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 16px 6px 20px',
                  background: tablaActiva?.table === t.table && tablaActiva?.schema === t.schema ? '#EFF6FF' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: '12px',
                  color: tablaActiva?.table === t.table && tablaActiva?.schema === t.schema ? 'var(--color-primary)' : '#374151',
                  fontWeight: tablaActiva?.table === t.table && tablaActiva?.schema === t.schema ? 700 : 400,
                  borderLeft: tablaActiva?.table === t.table && tablaActiva?.schema === t.schema ? '3px solid var(--color-primary)' : '3px solid transparent',
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

      {/* ── Panel principal ─────────────────────────────────────────────── */}
      <div style={s.main}>
        {/* Toolbar */}
        <div style={s.toolbar}>
          {tablaActiva ? (
            <>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-primary-dark)', marginRight: '4px' }}>
                {tablaActiva.schema}.{tablaActiva.table}
              </div>
              <span style={{ fontSize: '12px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: '5px' }}>
                {filas.length} filas
              </span>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '7px', padding: '6px 10px' }}>
                <Search size={13} color="#9CA3AF" />
                <input
                  value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar en resultados..."
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '180px' }}
                />
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
        <div style={{ flex: 1, overflow: 'auto' }}>
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
          {tablaActiva && !loading && !error && filas.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>Tabla vacía o sin resultados</div>
          )}
          {tablaActiva && !loading && filas.length > 0 && (
            <table style={s.table}>
              <thead>
                <tr>
                  {cols.map(col => (
                    <th key={col} style={s.th} onClick={() => toggleSort(col)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {col}
                        {sort.col === col && (sort.asc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    {cols.map(col => (
                      <td key={col} style={s.td} title={String(row[col] ?? '')}>
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
    </div>
  )
}
