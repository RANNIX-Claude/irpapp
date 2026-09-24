import { useState } from 'react'
import { ArrowLeft, ChevronRight, Printer, FileText, ChevronsUpDown, ChevronUp, ChevronDown, Eye, Pencil, X } from 'lucide-react'

/**
 * Piezas visuales de los expedientes (mismo diseño que ExpedienteEmpleado):
 * barra superior con migas, encabezado con banda degradada y avatar, pestañas,
 * tarjetas, secciones y columna lateral. Las usan Proveedor y Producto.
 */

export const C = {
  primary: '#7B5EA7', dark: '#5A4080', gold: '#E8A020',
  success: '#057642', warning: '#F59E0B', danger: '#B24020', blue: '#0A66C2',
  bg: '#F0F4F8', surface: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', muted: '#64748B', light: '#F8FAFC',
}

export function Badge({ label, color = C.primary, bg }) {
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg || color + '15', color, letterSpacing: '.2px' }}>{label}</span>
}

export function Campo({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? C.text : C.muted, fontWeight: 500, fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</div>
    </div>
  )
}

export function Card({ children, padding = '20px' }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding }}>{children}</div>
}

export function Section({ title, icon: Icon, children, action }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} color={C.primary} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Empty({ icon: Icon = FileText, msg, color = C.muted }) {
  return (
    <div style={{ padding: '36px 0', textAlign: 'center', color }}>
      <Icon size={30} style={{ marginBottom: 8, opacity: .35 }} />
      <div style={{ fontSize: 13, color: C.muted }}>{msg}</div>
    </div>
  )
}

export function BtnSecondary({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: C.light, border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: C.muted }}>
      {children}
    </button>
  )
}

export function Th({ children, right }) {
  return <th style={{ padding: '9px 12px', textAlign: right ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap', background: C.light }}>{children}</th>
}

export function Td({ children, mono, blue, bold, small, right, muted }) {
  return <td style={{ padding: '10px 12px', fontSize: small ? 11 : 13, fontFamily: mono ? 'monospace' : undefined, color: blue ? C.primary : muted ? C.muted : C.text, fontWeight: bold ? 700 : 400, textAlign: right ? 'right' : 'left', fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${C.border}` }}>{children}</td>
}

// Fila clicable de tabla con hover.
export function TrLink({ onClick, children }) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = C.light }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      {children}
    </tr>
  )
}

/**
 * Rejilla de los expedientes — mismo formato que "Historial de pagos" del
 * expediente de contrato: encabezados ordenables, fila de filtros de texto y
 * botones Ver / Editar / Eliminar por renglón.
 *
 * columnas: [{ key, label, orden?: fila => valor, filtro?: fila => texto,
 *              placeholder?, render: fila => nodo, align?, mono?, icono? }]
 *   - `orden` hace clicable el encabezado; `filtro` agrega la caja "Filtrar".
 *   - `icono` pinta un ícono en lugar del texto del encabezado (p. ej. la foto).
 * acciones: { onVer?, onEditar?, onEliminar?, titulos?: { ver, editar, eliminar } }
 */
export function GridExpediente({ filas, columnas, ordenInicial, acciones = {}, rowKey = 'id', vacio = 'Sin registros', resaltar }) {
  const [sortCol, setSortCol] = useState(ordenInicial?.key || null)
  const [sortDir, setSortDir] = useState(ordenInicial?.dir || 'desc')
  const [filtros, setFiltros] = useState({})
  const { onVer, onEditar, onEliminar, titulos = {} } = acciones
  const hayAcciones = onVer || onEditar || onEliminar
  const hayFiltros = columnas.some(c => c.filtro)

  const toggleSort = key => { setSortDir(sortCol === key && sortDir === 'asc' ? 'desc' : 'asc'); setSortCol(key) }

  let vistas = filas.filter(r => columnas.every(c => {
    const f = filtros[c.key]
    return !f || !c.filtro || String(c.filtro(r) ?? '').toLowerCase().includes(f.toLowerCase())
  }))
  const col = columnas.find(c => c.key === sortCol)
  if (col?.orden) {
    vistas = [...vistas].sort((a, b) => {
      const x = col.orden(a), y = col.orden(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true })
      return sortDir === 'asc' ? r : -r
    })
  }

  const thStyle = (c) => ({
    padding: '10px 12px', textAlign: c?.align || 'left', fontSize: 11, fontWeight: 700,
    color: c && sortCol === c.key ? C.primary : C.muted,
    textTransform: 'uppercase', letterSpacing: '.5px',
    cursor: c?.orden ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
    borderBottom: `2px solid ${C.border}`, background: C.light,
  })
  const SortIcon = ({ c }) => {
    if (!c.orden) return null
    if (sortCol !== c.key) return <ChevronsUpDown size={10} style={{ color: '#D1D5DB', marginLeft: 3 }} />
    return sortDir === 'asc' ? <ChevronUp size={11} style={{ color: C.primary, marginLeft: 3 }} /> : <ChevronDown size={11} style={{ color: C.primary, marginLeft: 3 }} />
  }
  const inputF = { width: '100%', minWidth: 60, padding: '4px 7px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11, boxSizing: 'border-box' }
  const btn = (color, borde = C.border, fondo = C.surface) => ({ padding: '5px 7px', border: `1px solid ${borde}`, borderRadius: 6, background: fondo, cursor: 'pointer', color, display: 'flex', alignItems: 'center' })

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {columnas.map(c => (
              <th key={c.key} style={thStyle(c)} onClick={() => c.orden && toggleSort(c.key)}>
                {c.icono
                  ? <c.icono size={13} />
                  : <span style={{ display: 'inline-flex', alignItems: 'center' }}>{c.label}<SortIcon c={c} /></span>}
              </th>
            ))}
            {hayAcciones && <th style={thStyle(null)} />}
          </tr>
          {hayFiltros && (
            <tr style={{ background: '#F9FAFB' }}>
              {columnas.map(c => (
                <th key={c.key} style={{ padding: c.filtro ? '6px 12px' : 0, borderBottom: `1px solid ${C.border}` }}>
                  {c.filtro && <input value={filtros[c.key] || ''} onChange={e => setFiltros(f => ({ ...f, [c.key]: e.target.value }))} placeholder={c.placeholder || 'Filtrar'} style={inputF} />}
                </th>
              ))}
              {hayAcciones && <th style={{ borderBottom: `1px solid ${C.border}` }} />}
            </tr>
          )}
        </thead>
        <tbody>
          {!vistas.length ? (
            <tr><td colSpan={columnas.length + (hayAcciones ? 1 : 0)} style={{ padding: '28px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>{vacio}</td></tr>
          ) : vistas.map(r => (
            <tr key={r[rowKey]} style={{ borderTop: `1px solid ${C.border}`, background: resaltar?.(r) ? '#F0FDF4' : undefined }}>
              {columnas.map(c => (
                <td key={c.key} style={{ padding: '10px 12px', textAlign: c.align || 'left', fontFamily: c.mono ? 'monospace' : undefined, fontWeight: c.mono ? 600 : undefined, color: C.text, whiteSpace: c.nowrap ? 'nowrap' : undefined }}>
                  {c.render(r)}
                </td>
              ))}
              {hayAcciones && (
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {onVer && <button onClick={() => onVer(r)} title={titulos.ver || 'Ver'} style={btn(C.primary)}><Eye size={13} /></button>}
                    {onEditar && <button onClick={() => onEditar(r)} title={titulos.editar || 'Editar'} style={btn(C.dark)}><Pencil size={13} /></button>}
                    {onEliminar && <button onClick={() => onEliminar(r)} title={titulos.eliminar || 'Eliminar'} style={btn(C.danger, '#FECACA', '#FFF5F5')}><X size={13} /></button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Etiqueta tipo "RENTA" del grid de pagos. */
export function Etiqueta({ children, color = C.primary }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: color + '14', color }}>{children}</span>
}

/** Anillo de avance (como la completitud del expediente del empleado). */
export function Anillo({ pct, titulo, detalle }) {
  const color = pct >= 80 ? C.success : pct >= 40 ? C.warning : C.danger
  const r = 22, stroke = 4, circ = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round" transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
        <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', lineHeight: 1.3 }}>{titulo}<br />{detalle}</div>
    </div>
  )
}

/** Tarjeta de 4 indicadores en rejilla (Resumen). items: [Icon, label, valor, sub, color] */
export function Indicadores({ items }) {
  return (
    <Card>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: C.border, borderRadius: 8, overflow: 'hidden' }}>
        {items.map(([Icon, label, val, sub, color]) => (
          <div key={label} style={{ background: C.surface, padding: '18px 20px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon size={15} color={color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Lista clave-valor a dos columnas (como "Información laboral"). */
export function ListaDatos({ filas }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
      {filas.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.muted, minWidth: 130 }}>{k}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

/** Tarjeta de la columna lateral con título y "Ver todos". */
export function SideCard({ titulo, onVerTodos, children }) {
  return (
    <Card padding="16px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{titulo}</span>
        {onVerTodos && <button onClick={onVerTodos} style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Ver todos</button>}
      </div>
      {children}
    </Card>
  )
}

export function SideItem({ icono: Icon, color = C.primary, titulo, sub, derecha, onClick, primero }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: primero ? undefined : `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
        {sub && <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>}
      </div>
      {derecha && <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{derecha}</div>}
    </div>
  )
}

export function Acciones({ items }) {
  return (
    <Card padding="16px">
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Acciones rápidas</div>
      <div style={{ display: 'grid', gap: 7 }}>
        {items.filter(Boolean).map(([Icon, label, fn]) => (
          <button key={label} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7, background: C.light, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: C.text, width: '100%', textAlign: 'left' }}>
            <Icon size={13} color={C.primary} /> {label}
          </button>
        ))}
      </div>
    </Card>
  )
}

/**
 * Página completa del expediente.
 * migas: [{ label, onClick }] — la primera lleva flecha de regreso.
 */
export function PaginaExpediente({ migas, estado, avatar, titulo, badge, subtitulo, meta = [], derecha, tabs, tab, setTab, children, lateral }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Barra superior */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap' }}>
        {migas.map((m, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {i > 0 && <ChevronRight size={13} color={C.muted} />}
            {i === 0 ? (
              <button onClick={m.onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', color: C.muted, fontSize: 13 }}>
                <ArrowLeft size={13} /> {m.label}
              </button>
            ) : (
              <span onClick={m.onClick} style={{ fontSize: 13, fontWeight: 600, color: m.onClick ? C.primary : C.text, cursor: m.onClick ? 'pointer' : 'default' }}>{m.label}</span>
            )}
          </span>
        ))}
        <div style={{ flex: 1 }} />
        {estado}
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, color: C.muted }}>
          <Printer size={13} /> Imprimir
        </button>
      </div>

      {/* Encabezado */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 90, background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 60%, ${C.primary}99 100%)`, borderRadius: '0 0 12px 12px', marginBottom: '-28px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 8px 16px' }}>
            <div style={{ borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,.15)', border: `3px solid ${C.surface}`, background: C.surface, flexShrink: 0 }}>{avatar}</div>
            <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: -20, marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,.35)' }}>{titulo}</h1>
                {badge}
              </div>
              <div style={{ fontSize: 14, color: C.primary, fontWeight: 600, marginTop: 2 }}>{subtitulo}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                {meta.filter(m => m && m[1]).map(([Icon, txt], i) => (
                  <span key={i} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Icon size={12} />{txt}</span>
                ))}
              </div>
            </div>
            {derecha && <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>{derecha}</div>}
          </div>
          {/* Pestañas */}
          <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? `2.5px solid ${C.primary}` : '2.5px solid transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.primary : C.muted, whiteSpace: 'nowrap', transition: 'all .15s' }}>
                <t.icon size={13} /> {t.label}{t.n != null && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '0 6px', borderRadius: 10, background: tab === t.id ? C.primary + '18' : C.border, color: tab === t.id ? C.primary : C.muted }}>{t.n}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>{children}</div>
        <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 60 }}>{lateral}</div>
      </div>
    </div>
  )
}

// ── Formularios y modales (mismo estilo que ExpedienteEmpleado) ─────────────
export const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }
export const inputStyle = { display: 'block', width: '100%', padding: '8px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', background: C.surface }

export function Modal({ title, icon: Icon, onClose, children, width = 520 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 14, width, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.surface, zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={16} color={C.primary} /> {title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export function ModalFooter({ onClose, onSave, saving, label, color = C.primary }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
      <button onClick={onClose} style={{ padding: '8px 18px', border: `1.5px solid ${C.border}`, borderRadius: 7, background: 'none', cursor: 'pointer', fontSize: 13, color: C.muted }}>Cancelar</button>
      <button onClick={onSave} disabled={saving} style={{ padding: '8px 20px', background: color, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? .6 : 1 }}>
        {saving ? 'Guardando…' : label}
      </button>
    </div>
  )
}

export function Campo2({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: '1/-1' } : {}}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}
