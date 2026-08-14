import { useState, useMemo } from 'react'
import { useModuleAudit } from '../hooks/useAudit'
import { usePRP } from '../hooks/usePRP'
import { Search, Download, RefreshCw, Filter } from 'lucide-react'

// ── Catálogo de colores por acción ─────────────────────────────────────────────
const ACCION_STYLE = {
  VISITA:            { bg: '#EFF6FF', color: '#1D4ED8', label: '👁️ Vista de pantalla' },
  PAGO_REGISTRADO:   { bg: '#D1FAE5', color: '#057642', label: '💵 Pago registrado' },
  AUTO_CONCILIADO:   { bg: '#D1FAE5', color: '#065F46', label: '🤖 Auto-conciliado' },
  COBROS_DESMARCADOS:{ bg: '#FEF3C7', color: '#92400E', label: '↩️ Cobros desmarcados' },
  CONTRATO_CREADO:   { bg: '#EDE9FE', color: '#5B21B6', label: '📋 Contrato creado' },
  EMPLEADO_CREADO:   { bg: '#FCE7F3', color: '#831843', label: '👤 Empleado creado' },
  ASISTENCIA_IMPORTADA:{ bg: '#E0F2FE', color: '#075985', label: '📋 Asistencia importada' },
}

function getStyle(accion) {
  return ACCION_STYLE[accion] || { bg: '#F3F4F6', color: '#374151', label: accion }
}

function fmt(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const MODULOS = ['Todos', 'Conciliacion', 'Contratos', 'RH', 'Cobranza', 'GastosOperativos', 'Vending', 'Estacionamiento', 'FondoRevolvente', 'Agua']

export default function Bitacora() {
  useModuleAudit('Bitacora')

  const [refresh, setRefresh] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [modulo, setModulo] = useState('Todos')
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: rows, loading, error } = usePRP('prp_bitacora', {
    order: { col: 'created_at', asc: false },
    limit: 500,
    refreshKey: refresh,
  })

  const lista = useMemo(() => {
    if (!rows) return []
    return rows.filter(r => {
      const fecha = r.created_at?.slice(0, 10) || ''
      if (fecha < desde || fecha > hasta) return false
      if (modulo !== 'Todos' && r.modulo !== modulo) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        return (
          r.accion?.toLowerCase().includes(q) ||
          r.descripcion?.toLowerCase().includes(q) ||
          r.usuario_email?.toLowerCase().includes(q) ||
          r.modulo?.toLowerCase().includes(q) ||
          r.entidad?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [rows, desde, hasta, modulo, busqueda])

  const exportCSV = () => {
    const header = ['Fecha y hora', 'Módulo', 'Acción', 'Descripción', 'Entidad', 'Usuario', 'IP']
    const filas = lista.map(r => [
      fmt(r.created_at), r.modulo, r.accion,
      `"${(r.descripcion || '').replace(/"/g, '""')}"`,
      r.entidad || '',
      r.usuario_email || '',
      r.ip || '',
    ])
    const csv = [header, ...filas].map(f => f.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `bitacora_${desde}_${hasta}.csv`; a.click()
  }

  const s = {
    page: { padding: '24px 28px', fontFamily: 'system-ui, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '22px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: 0 },
    subtitle: { fontSize: '13px', color: 'var(--color-text-light)', marginTop: '3px' },
    toolbar: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' },
    inp: { padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', outline: 'none' },
    btn: (bg, color) => ({ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: bg, color }),
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light)', borderBottom: '2px solid #F3F4F6', background: '#F9FAFB' },
    td: { padding: '10px 12px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' },
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Bitácora de Operaciones</h1>
          <p style={s.subtitle}>Registro de todas las acciones realizadas en el sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btn('#F3F4F6', '#374151')} onClick={() => setRefresh(r => r + 1)}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button style={s.btn('var(--color-primary)', 'white')} onClick={exportCSV} disabled={!lista.length}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={s.toolbar}>
          <Filter size={14} color="var(--color-text-light)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '7px 12px', flex: 1, minWidth: '200px' }}>
            <Search size={14} color="var(--color-text-light)" />
            <input
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por acción, descripción, usuario..."
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
            />
          </div>
          <select value={modulo} onChange={e => setModulo(e.target.value)} style={s.inp}>
            {MODULOS.map(m => <option key={m} value={m}>{m === 'Todos' ? 'Todos los módulos' : m}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Desde</span>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={s.inp} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={s.inp} />
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
          {lista.length} {lista.length === 1 ? 'registro' : 'registros'}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)' }}>Cargando bitácora...</div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-danger)', fontSize: '13px' }}>{error}</div>
        ) : !lista.length ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '14px' }}>
            No hay registros en el período seleccionado
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Fecha y hora</th>
                  <th style={s.th}>Usuario</th>
                  <th style={s.th}>Módulo</th>
                  <th style={s.th}>Acción</th>
                  <th style={s.th}>Detalle</th>
                  <th style={s.th}>IP</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r, i) => {
                  const st = getStyle(r.accion)
                  return (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ ...s.td, color: 'var(--color-text-light)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {String(r.id).slice(-6).toUpperCase()}
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', color: '#374151' }}>
                        {fmt(r.created_at)}
                      </td>
                      <td style={{ ...s.td, color: '#374151', fontWeight: 500 }}>
                        {r.usuario_email || <span style={{ color: 'var(--color-text-light)' }}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ background: '#EFF6FF', color: 'var(--color-primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {r.modulo}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ ...s.td, maxWidth: '340px', color: '#4B5563', lineHeight: '1.4' }}>
                        {r.descripcion || <span style={{ color: 'var(--color-text-light)' }}>—</span>}
                        {r.entidad && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '2px' }}>
                            {r.entidad}{r.entidad_id ? ` · ${String(r.entidad_id).slice(-8)}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ ...s.td, fontSize: '11px', color: 'var(--color-text-light)', fontFamily: 'monospace' }}>
                        {r.ip || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
