import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Hoja, Vacio, Cargando, ErrorCaja, COLOR } from './kit'

const PAGINA = 24

/**
 * Consulta móvil: buscador, chips de filtro, resultados en lista o mosaico y detalle en hoja inferior.
 * Lee de una vista `prp_*` (nunca de la tabla base). Solo consulta; no escribe.
 *
 * @param {string}   vista      vista a leer
 * @param {string}   titulo     para el placeholder del buscador
 * @param {string[]} buscar     columnas donde busca el texto
 * @param {object}   orden      { col, asc }
 * @param {Array}    filtros    [{ id, label, aplicar: q => q }]
 * @param {number}   columnas   1 (lista) o 2 (mosaico)
 * @param {Function} tarjeta    (fila, abrir) → nodo de cada resultado
 * @param {Function} detalle    (fila, cerrar, recargar) → { titulo, subtitulo, contenido }
 * @param {Function} enriquecer async (filas) → filas con campos extra (p. ej. logos)
 * @param {string}   select     columnas a pedir (por defecto *)
 * @param {Function} resumen    (filas, total) → nodo sobre los resultados (opcional)
 */
export default function Lista({ vista, titulo, buscar = [], orden, filtros = [], filtroInicial, columnas = 1, tarjeta, detalle, enriquecer, select = '*', resumen }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState(filtroInicial || filtros[0]?.id)
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [limite, setLimite] = useState(PAGINA)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [sel, setSel] = useState(null)
  const [ver, setVer] = useState(0)   // sube al guardar algo desde el detalle → vuelve a consultar
  const seq = useRef(0)

  useEffect(() => { setLimite(PAGINA) }, [q, filtro])

  useEffect(() => {
    const mi = ++seq.current
    setCargando(true)
    const t = setTimeout(async () => {
      let consulta = supabase.from(vista).select(select, { count: 'exact' })
      const texto = q.replace(/[%,()]/g, ' ').trim()
      if (texto && buscar.length) consulta = consulta.or(buscar.map(c => `${c}.ilike.%${texto}%`).join(','))
      const f = filtros.find(x => x.id === filtro)
      if (f) consulta = f.aplicar(consulta)
      if (orden) consulta = consulta.order(orden.col, { ascending: !!orden.asc, nullsFirst: false })
      const { data, error: err, count } = await consulta.range(0, limite - 1)
      if (mi !== seq.current) return
      if (err) { setError(err.message); setFilas([]); setCargando(false); return }
      const base = data || []
      const final = enriquecer ? await enriquecer(base).catch(() => base) : base
      if (mi !== seq.current) return
      setError(null); setFilas(final); setTotal(count ?? 0); setCargando(false)
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, filtro, limite, vista, ver])   // eslint-disable-line react-hooks/exhaustive-deps

  const d = sel ? detalle(sel, () => setSel(null), () => setVer(v => v + 1)) : null

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, padding: '10px 12px 8px', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 13 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar en ${titulo.toLowerCase()}…`}
            style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 40px 0 38px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 16, outline: 'none' }} />
          {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 6, top: 6, width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}><X size={16} color={COLOR.gris} /></button>}
        </div>
        {filtros.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {filtros.map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)}
                style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid var(--color-primary)', background: filtro === f.id ? 'var(--color-primary)' : 'white', color: filtro === f.id ? 'white' : 'var(--color-primary)' }}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 12 }}>
        {error && <ErrorCaja mensaje={error} />}
        {!error && resumen && filas.length > 0 && resumen(filas, total)}
        {!error && filas.length > 0 && <div style={{ fontSize: 12, color: COLOR.gris, margin: '0 2px 8px' }}>{total} {total === 1 ? 'resultado' : 'resultados'}</div>}
        {!error && !cargando && filas.length === 0 && <Vacio />}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`, gap: 10 }}>
          {filas.map((f, i) => <div key={f.id ?? i} style={{ minWidth: 0 }}>{tarjeta(f, () => setSel(f))}</div>)}
        </div>
        {filas.length < total && (
          <button onClick={() => setLimite(l => l + PAGINA)} disabled={cargando}
            style={{ width: '100%', marginTop: 12, height: 46, borderRadius: 12, border: '1.5px solid var(--color-primary)', background: 'white', color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            {cargando ? 'Cargando…' : `Ver más (${total - filas.length})`}
          </button>
        )}
        {cargando && filas.length === 0 && <Cargando />}
      </div>

      {d && <Hoja titulo={d.titulo} subtitulo={d.subtitulo} onCerrar={() => setSel(null)}>{d.contenido}</Hoja>}
    </div>
  )
}

/** Tarjeta base de lista: foto/logo a la izquierda, texto, importe y etiqueta. */
export function TarjetaFila({ onClick, izquierda, titulo, subtitulo, derecha, etiqueta, linea }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '10px 12px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', minHeight: 68 }}>
      {izquierda}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo || '—'}</span>
          {derecha && <span style={{ fontSize: 14, fontWeight: 800, color: COLOR.azulOscuro, flexShrink: 0 }}>{derecha}</span>}
        </div>
        {subtitulo && <div style={{ fontSize: 13, color: COLOR.gris, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitulo}</div>}
        {(etiqueta || linea) && <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>{etiqueta}{linea && <span style={{ fontSize: 12, color: COLOR.gris }}>{linea}</span>}</div>}
      </div>
    </button>
  )
}
