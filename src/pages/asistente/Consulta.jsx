import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Lista de consulta de solo lectura pensada para el celular: búsqueda arriba, chips de
// filtro, tarjetas grandes y detalle en una hoja inferior. Lee siempre de una vista
// asistente_* (las tablas base no le son legibles a este rol).

export const dinero = n => n == null || n === '' ? '—' : '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const fecha = f => f ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const PAGINA = 25

function Etiqueta({ texto, color = '#6B7280' }) {
  if (!texto) return null
  return <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color, whiteSpace: 'nowrap' }}>{texto}</span>
}
export { Etiqueta }

/**
 * @param {string}   vista       vista asistente_* a consultar
 * @param {string[]} buscar      columnas donde busca el texto
 * @param {object}   orden       { col, asc }
 * @param {Array}    filtros     [{ id, label, aplicar: q => q }]
 * @param {(fila)=>object} tarjeta  { titulo, subtitulo, derecha, etiqueta:{texto,color}, linea }
 * @param {Array}    detalle     [[etiqueta, fila => valor]]
 */
export default function Consulta({ titulo, vista, buscar = [], orden, filtros = [], tarjeta, detalle }) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState(filtros[0]?.id)
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [limite, setLimite] = useState(PAGINA)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [sel, setSel] = useState(null)
  const seq = useRef(0)

  // Nueva búsqueda o filtro → vuelve a la primera página.
  useEffect(() => { setLimite(PAGINA) }, [q, filtro])

  useEffect(() => {
    const mi = ++seq.current
    setCargando(true)
    const t = setTimeout(async () => {
      let consulta = supabase.from(vista).select('*', { count: 'exact' })
      const t2 = q.replace(/[%,()]/g, ' ').trim()
      if (t2 && buscar.length) consulta = consulta.or(buscar.map(c => `${c}.ilike.%${t2}%`).join(','))
      const f = filtros.find(x => x.id === filtro)
      if (f) consulta = f.aplicar(consulta)
      if (orden) consulta = consulta.order(orden.col, { ascending: !!orden.asc, nullsFirst: false })
      const { data, error: err, count } = await consulta.range(0, limite - 1)
      if (mi !== seq.current) return   // llegó tarde una respuesta vieja
      if (err) { setError(err.message); setFilas([]) } else { setError(null); setFilas(data || []); setTotal(count ?? 0) }
      setCargando(false)
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, filtro, limite, vista])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-background)' }}>
      <div style={{ padding: '12px 12px 8px', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 13 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar en ${titulo.toLowerCase()}…`}
            style={{ width: '100%', boxSizing: 'border-box', height: 44, padding: '0 40px 0 38px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 16, outline: 'none' }} />
          {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 6, top: 6, width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }}><X size={16} color="#6B7280" /></button>}
        </div>
        {filtros.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {filtros.map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)}
                style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1.5px solid var(--color-primary)', background: filtro === f.id ? 'var(--color-primary)' : 'white', color: filtro === f.id ? 'white' : 'var(--color-primary)' }}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, WebkitOverflowScrolling: 'touch' }}>
        {error && <div style={{ padding: 14, background: '#FEE2E2', color: '#B24020', borderRadius: 10, fontSize: 13 }}>No se pudo consultar: {error}</div>}
        {!error && !cargando && filas.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-light)', fontSize: 14 }}>Sin resultados</div>}
        {!error && filas.length > 0 && <div style={{ fontSize: 12, color: 'var(--color-text-light)', margin: '0 2px 8px' }}>{total} {total === 1 ? 'resultado' : 'resultados'}</div>}
        <div style={{ display: 'grid', gap: 10 }}>
          {filas.map((f, i) => {
            const t = tarjeta(f)
            return (
              <button key={f.id ?? i} onClick={() => setSel(f)}
                style={{ textAlign: 'left', background: 'white', border: '1px solid #E5E7EB', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', minHeight: 64 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo || '—'}</span>
                    {t.derecha && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary-dark)', flexShrink: 0 }}>{t.derecha}</span>}
                  </div>
                  {t.subtitulo && <div style={{ fontSize: 13, color: 'var(--color-text-light)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subtitulo}</div>}
                  {(t.etiqueta || t.linea) && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                      {t.etiqueta && <Etiqueta {...t.etiqueta} />}
                      {t.linea && <span style={{ fontSize: 12, color: 'var(--color-text-light)' }}>{t.linea}</span>}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} color="#D1D5DB" />
              </button>
            )
          })}
        </div>
        {filas.length < total && (
          <button onClick={() => setLimite(l => l + PAGINA)} disabled={cargando}
            style={{ width: '100%', marginTop: 12, height: 46, borderRadius: 12, border: '1.5px solid var(--color-primary)', background: 'white', color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {cargando ? 'Cargando…' : `Ver más (${total - filas.length})`}
          </button>
        )}
        {cargando && filas.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-light)', fontSize: 14 }}>Cargando…</div>}
      </div>

      {/* Detalle: hoja inferior */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxHeight: '86dvh', borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary-dark)' }}>{tarjeta(sel).titulo}</div>
              <button onClick={() => setSel(null)} style={{ width: 40, height: 40, border: 'none', background: '#F3F4F6', borderRadius: 12, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 16px calc(16px + env(safe-area-inset-bottom))' }}>
              {detalle.map(([k, fn]) => {
                const v = fn(sel)
                if (v == null || v === '' || v === '—') return null
                return (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, padding: '9px 0', borderBottom: '1px solid #F3F4F6', fontSize: 14 }}>
                    <span style={{ color: 'var(--color-text-light)' }}>{k}</span>
                    <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{v}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
