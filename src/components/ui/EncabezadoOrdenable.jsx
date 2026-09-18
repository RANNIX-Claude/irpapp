import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ArrowUp, ArrowDown, Filter, Search, X } from 'lucide-react'

/**
 * Orden y filtro por columna, al estilo Excel.
 *
 * Cada columna se describe una vez:
 *   { key, label, valor: (fila, ctx) => string, orden: (fila, ctx) => number|string|null, align? }
 * `valor` es lo que se lista en el filtro (y con lo que se compara); `orden` es
 * la llave de ordenamiento — puede diferir (un mes se lista como "Sep/2026" pero
 * se ordena por año*12+mes). Los vacíos (`null`) siempre van al final.
 *
 * Clic en el nombre de la columna: alterna ascendente → descendente → sin orden.
 * Clic en el embudo: abre la lista de valores con casillas para filtrar. Las
 * opciones de cada columna respetan los filtros de las demás, como en Excel.
 */

const cmp = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { numeric: true })
}

export function useOrdenFiltro(columnas) {
  const [orden, setOrden] = useState(null)      // { key, dir: 'asc' | 'desc' } | null
  const [filtros, setFiltros] = useState({})    // key -> Set de valores permitidos
  const porKey = useMemo(() => Object.fromEntries(columnas.map(c => [c.key, c])), [columnas])

  const filtrar = useCallback((filas, ctx, excepto) => {
    const activos = Object.entries(filtros).filter(([k]) => k !== excepto)
    if (!activos.length) return filas
    return filas.filter(r => activos.every(([k, set]) => set.has(porKey[k].valor(r, ctx))))
  }, [filtros, porKey])

  const aplicar = useCallback((filas, ctx) => {
    const f = filtrar(filas, ctx)
    if (!orden) return f
    const col = porKey[orden.key]
    const signo = orden.dir === 'asc' ? 1 : -1
    // sort es estable: a igual valor se conserva el orden con que llegaron las filas.
    return [...f].sort((a, b) => {
      const x = col.orden(a, ctx), y = col.orden(b, ctx)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return signo * cmp(x, y)
    })
  }, [filtrar, orden, porKey])

  const alternarOrden = useCallback(key => {
    setOrden(o => (!o || o.key !== key ? { key, dir: 'asc' } : o.dir === 'asc' ? { key, dir: 'desc' } : null))
  }, [])
  const fijarOrden = useCallback((key, dir) => setOrden(dir ? { key, dir } : null), [])
  const fijarFiltro = useCallback((key, set) => {
    setFiltros(f => {
      const n = { ...f }
      if (set) n[key] = set; else delete n[key]
      return n
    })
  }, [])
  const limpiar = useCallback(() => { setOrden(null); setFiltros({}) }, [])

  return {
    columnas, orden, filtros, filtrar, aplicar, alternarOrden, fijarOrden, fijarFiltro, limpiar,
    nFiltros: Object.keys(filtros).length,
    hayCambios: !!orden || Object.keys(filtros).length > 0,
  }
}

/** Botón "Limpiar orden y filtros" para la barra de herramientas de la tabla. */
export function LimpiarTabla({ tabla }) {
  if (!tabla.hayCambios) return null
  const partes = []
  if (tabla.nFiltros) partes.push(`${tabla.nFiltros} ${tabla.nFiltros === 1 ? 'filtro' : 'filtros'}`)
  if (tabla.orden) partes.push('orden')
  return (
    <button onClick={tabla.limpiar} title="Quitar el orden y los filtros de columna"
      style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'7px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'1.5px solid #BFDBFE', background:'#EFF6FF', color:'#0A66C2' }}>
      <X size={12} /> Limpiar columnas ({partes.join(' · ')})
    </button>
  )
}

const ANCHO_MENU = 264

function MenuColumna({ col, tabla, filasBase, ctx, ancla, onCerrar }) {
  const ref = useRef(null)
  const [texto, setTexto] = useState('')

  useEffect(() => {
    const fuera = e => { if (ref.current && !ref.current.contains(e.target)) onCerrar() }
    const tecla = e => { if (e.key === 'Escape') onCerrar() }
    // El menú es fixed: si la página o la tabla se desplazan, se desalinearía.
    // El scroll de la propia lista de valores no cuenta.
    const desplazo = e => { if (!ref.current || !ref.current.contains(e.target)) onCerrar() }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', desplazo, true)
    window.addEventListener('resize', onCerrar)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', desplazo, true)
      window.removeEventListener('resize', onCerrar)
    }
  }, [onCerrar])

  // Valores posibles de esta columna con los demás filtros ya puestos.
  const opciones = useMemo(() => {
    const filas = tabla.filtrar(filasBase, ctx, col.key)
    const m = new Map()
    for (const r of filas) {
      const v = col.valor(r, ctx)
      const e = m.get(v)
      if (e) e.n++
      else m.set(v, { v, n: 1, o: col.orden(r, ctx) })
    }
    return [...m.values()].sort((a, b) => {
      if (a.o == null && b.o == null) return 0
      if (a.o == null) return 1
      if (b.o == null) return -1
      return cmp(a.o, b.o)
    })
  }, [tabla, filasBase, ctx, col])

  const permitidos = tabla.filtros[col.key]
  const marcado = v => !permitidos || permitidos.has(v)
  const visibles = opciones.filter(o => !texto || o.v.toLowerCase().includes(texto.toLowerCase()))
  const todasVisiblesMarcadas = visibles.length > 0 && visibles.every(o => marcado(o.v))

  const fijar = set => {
    // Si quedan marcadas todas las opciones, es lo mismo que no filtrar.
    const todas = opciones.every(o => set.has(o.v))
    tabla.fijarFiltro(col.key, todas ? null : set)
  }
  const alternar = v => {
    const set = new Set(permitidos ?? opciones.map(o => o.v))
    if (set.has(v)) set.delete(v); else set.add(v)
    fijar(set)
  }
  const alternarVisibles = () => {
    const set = new Set(permitidos ?? opciones.map(o => o.v))
    for (const o of visibles) { if (todasVisiblesMarcadas) set.delete(o.v); else set.add(o.v) }
    fijar(set)
  }

  const left = Math.max(8, Math.min(ancla.left, window.innerWidth - ANCHO_MENU - 8))
  const activoOrden = tabla.orden?.key === col.key ? tabla.orden.dir : null
  const btnOrden = (dir, texto, Icono) => (
    <button onClick={() => tabla.fijarOrden(col.key, activoOrden === dir ? null : dir)}
      style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'7px 12px', border:'none', cursor:'pointer', fontSize:'12.5px', textAlign:'left',
        background: activoOrden === dir ? '#EFF6FF' : 'transparent', color: activoOrden === dir ? '#0A66C2' : '#374151', fontWeight: activoOrden === dir ? 700 : 500 }}>
      <Icono size={13} /> {texto}
    </button>
  )

  return (
    <div ref={ref} role="dialog" aria-label={`Orden y filtro de ${col.label}`}
      style={{ position:'fixed', top: ancla.bottom + 4, left, width: ANCHO_MENU, zIndex: 300, background:'white', border:'1px solid #E5E7EB', borderRadius:'10px', boxShadow:'0 10px 30px rgba(0,0,0,0.15)', textTransform:'none', letterSpacing:0, fontWeight:400 }}>
      <div style={{ padding:'4px 0', borderBottom:'1px solid #F3F4F6' }}>
        {btnOrden('asc', 'Ordenar ascendente', ArrowUp)}
        {btnOrden('desc', 'Ordenar descendente', ArrowDown)}
      </div>
      <div style={{ padding:'8px 10px 4px' }}>
        <div style={{ position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <input autoFocus value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar valor…"
            style={{ width:'100%', boxSizing:'border-box', padding:'6px 8px 6px 26px', border:'1.5px solid #E5E7EB', borderRadius:'6px', fontSize:'12.5px' }} />
        </div>
      </div>
      <div style={{ maxHeight:'230px', overflowY:'auto', padding:'2px 0' }}>
        {visibles.length === 0
          ? <div style={{ padding:'10px 14px', fontSize:'12px', color:'#9CA3AF' }}>Sin coincidencias</div>
          : (
            <>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 14px', fontSize:'12.5px', fontWeight:700, cursor:'pointer', borderBottom:'1px solid #F3F4F6' }}>
                <input type="checkbox" checked={todasVisiblesMarcadas} onChange={alternarVisibles} />
                (Seleccionar todo)
              </label>
              {visibles.map(o => (
                <label key={o.v} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 14px', fontSize:'12.5px', cursor:'pointer', color:'#111827' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <input type="checkbox" checked={marcado(o.v)} onChange={() => alternar(o.v)} />
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={o.v}>{o.v}</span>
                  <span style={{ fontSize:'11px', color:'#9CA3AF', fontVariantNumeric:'tabular-nums' }}>{o.n}</span>
                </label>
              ))}
            </>
          )}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', borderTop:'1px solid #F3F4F6' }}>
        <button onClick={() => tabla.fijarFiltro(col.key, null)} disabled={!permitidos}
          style={{ border:'none', background:'transparent', fontSize:'12px', fontWeight:600, cursor: permitidos ? 'pointer' : 'default', color: permitidos ? '#0A66C2' : '#D1D5DB' }}>
          Limpiar filtro
        </button>
        <button onClick={onCerrar}
          style={{ border:'none', background:'#0A66C2', color:'white', fontSize:'12px', fontWeight:700, padding:'5px 14px', borderRadius:'6px', cursor:'pointer' }}>
          Listo
        </button>
      </div>
    </div>
  )
}

/**
 * <th> con orden por clic y menú de filtro. `filasBase` son las filas antes de
 * aplicar los filtros de columna (para listar los valores posibles).
 */
export function ThOrdenable({ col, tabla, filasBase, ctx, style }) {
  const [ancla, setAncla] = useState(null)
  const cerrar = useCallback(() => setAncla(null), [])
  const dir = tabla.orden?.key === col.key ? tabla.orden.dir : null
  const filtrada = !!tabla.filtros[col.key]
  const derecha = col.align === 'right'
  const centro = col.align === 'center'

  return (
    <th aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
      style={{ padding:'10px 14px', fontSize:'11px', fontWeight:700, color: dir || filtrada ? '#0A66C2' : 'var(--color-text-light)', textAlign: derecha ? 'right' : centro ? 'center' : 'left', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', userSelect:'none', ...style }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', flexDirection: derecha ? 'row-reverse' : 'row' }}>
        <button onClick={() => tabla.alternarOrden(col.key)} title={`Ordenar por ${col.label}`}
          style={{ display:'inline-flex', alignItems:'center', gap:'3px', border:'none', background:'transparent', cursor:'pointer', padding:0, font:'inherit', color:'inherit', textTransform:'inherit', letterSpacing:'inherit' }}>
          {col.label}
          {dir === 'asc' && <ArrowUp size={12} />}
          {dir === 'desc' && <ArrowDown size={12} />}
        </button>
        <button onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setAncla(a => (a ? null : { left: r.left, bottom: r.bottom })) }}
          title={filtrada ? `Filtrando ${col.label}` : `Filtrar ${col.label}`} aria-label={`Filtrar ${col.label}`}
          style={{ display:'inline-flex', alignItems:'center', border:'none', cursor:'pointer', padding:'3px', borderRadius:'4px',
            background: filtrada ? '#DBEAFE' : 'transparent', color: filtrada ? '#0A66C2' : '#9CA3AF' }}>
          <Filter size={12} fill={filtrada ? 'currentColor' : 'none'} />
        </button>
      </span>
      {ancla && <MenuColumna col={col} tabla={tabla} filasBase={filasBase} ctx={ctx} ancla={ancla} onCerrar={cerrar} />}
    </th>
  )
}
