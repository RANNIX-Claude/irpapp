import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { urlFirmada } from '../lib/supabase'

// Piezas visuales de la versión móvil: tarjetas grandes, mosaicos, fotos y hojas inferiores.
// Todo está pensado para dedo y pantalla de ~375 px: objetivos táctiles de 44 px o más,
// una o dos columnas, nada de tablas.

export const dinero = n => n == null || n === '' ? '—' : '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
export const dineroK = n => {
  const v = Number(n) || 0, a = Math.abs(v), s = v < 0 ? '-' : ''
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(0)}K`
  return s + '$' + a.toLocaleString('es-MX', { maximumFractionDigits: 0 })
}
export const fecha = f => f ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fechaCorta = f => f ? new Date(String(f).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const hoyISO = () => new Date().toISOString().slice(0, 10)
export const inicioSemanaISO = () => {
  const d = new Date(); const dia = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dia); return d.toISOString().slice(0, 10)
}

export const COLOR = { azul: '#0A66C2', azulOscuro: '#1A3C5E', verde: '#057642', rojo: '#B24020', ambar: '#D97706', gris: '#6B7280', morado: '#6D28D9' }

export const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

export function Etiqueta({ texto, color = COLOR.gris }) {
  if (!texto) return null
  return <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + '22', color, whiteSpace: 'nowrap' }}>{texto}</span>
}

/** Foto, logo o iniciales sobre fondo de color. `src` puede ser una URL pública. */
export function Avatar({ src, nombre, size = 52, radio = 16, color = COLOR.azul }) {
  const [falla, setFalla] = useState(false)
  useEffect(() => setFalla(false), [src])
  const base = { width: size, height: size, borderRadius: radio, flexShrink: 0, overflow: 'hidden' }
  if (src && !falla) return <img src={src} alt="" onError={() => setFalla(true)} style={{ ...base, objectFit: 'cover', background: '#F3F4F6' }} />
  return (
    <div style={{ ...base, background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.36 }}>
      {iniciales(nombre)}
    </div>
  )
}

/** Resuelve varias rutas de un bucket privado a URLs firmadas. */
export function useFirmadas(bucket, rutas) {
  const [urls, setUrls] = useState([])
  const clave = (rutas || []).join('|')
  useEffect(() => {
    let vivo = true
    if (!rutas?.length) { setUrls([]); return }
    Promise.all(rutas.map(r => urlFirmada(bucket, r))).then(u => { if (vivo) setUrls(u.filter(Boolean)) })
    return () => { vivo = false }
  }, [bucket, clave])   // eslint-disable-line react-hooks/exhaustive-deps
  return urls
}

/** Rejilla de fotos de un bucket privado; al tocar una se ve a pantalla completa. */
export function Galeria({ bucket, rutas, alto = 110 }) {
  const urls = useFirmadas(bucket, rutas)
  const [grande, setGrande] = useState(null)
  if (!rutas?.length) return null
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: urls.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 6 }}>
        {urls.map(u => <img key={u} src={u} alt="" onClick={() => setGrande(u)} style={{ width: '100%', height: urls.length === 1 ? 'auto' : alto, maxHeight: 320, objectFit: 'cover', borderRadius: 12, cursor: 'zoom-in' }} />)}
      </div>
      {grande && (
        <div onClick={() => setGrande(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <img src={grande} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </>
  )
}

/** Imagen única de un bucket privado (ticket, comprobante). */
export function FotoPrivada({ bucket, ruta, alto = 200 }) {
  return <Galeria bucket={bucket} rutas={ruta ? [ruta] : []} alto={alto} />
}

/** Cuadro de indicador: número grande, etiqueta y detalle. */
export function Kpi({ etiqueta, valor, sub, color = COLOR.azul, icono: Icono, onClick, alerta }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} style={{ textAlign: 'left', fontFamily: 'inherit', background: 'white', border: `1px solid ${alerta ? color : '#E5E7EB'}`, borderLeft: `4px solid ${color}`, borderRadius: 14, padding: '12px 12px 10px', cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 92, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: COLOR.gris }}>
        {Icono && <Icono size={14} color={color} />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etiqueta}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: COLOR.gris }}>{sub}</div>}
    </Tag>
  )
}

export const Rejilla = ({ cols = 2, gap = 10, children, style }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, ...style }}>{children}</div>
)

export function Seccion({ titulo, accion, onAccion, children }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 2px 8px' }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: COLOR.azulOscuro, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</h2>
        {accion && <button onClick={onAccion} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{accion}</button>}
      </div>
      {children}
    </section>
  )
}

export const Pantalla = ({ children }) => (
  <div style={{ padding: '12px 12px calc(16px + env(safe-area-inset-bottom))', maxWidth: 640, margin: '0 auto' }}>{children}</div>
)

export const Vacio = ({ texto = 'Sin resultados' }) => <div style={{ textAlign: 'center', padding: '36px 0', color: COLOR.gris, fontSize: 14 }}>{texto}</div>
export const Cargando = () => <Vacio texto="Cargando…" />
export const ErrorCaja = ({ mensaje }) => <div style={{ padding: 14, background: '#FEE2E2', color: COLOR.rojo, borderRadius: 10, fontSize: 13 }}>No se pudo consultar: {mensaje}</div>

/** Barra de avance (0–100). */
export const Barra = ({ pct, color = COLOR.azul, alto = 8 }) => (
  <div style={{ height: alto, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, height: '100%', background: color, borderRadius: 99 }} />
  </div>
)

/** Hoja inferior para el detalle de un renglón o mosaico. */
export function Hoja({ titulo, subtitulo, onCerrar, children }) {
  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxHeight: '90dvh', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: COLOR.azulOscuro, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 13, color: COLOR.gris, marginTop: 2 }}>{subtitulo}</div>}
          </div>
          <button onClick={onCerrar} style={{ width: 40, height: 40, border: 'none', background: '#F3F4F6', borderRadius: 12, cursor: 'pointer', flexShrink: 0 }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>{children}</div>
      </div>
    </div>
  )
}

/** Pares etiqueta/valor; omite los vacíos. `tel:` y `mailto:` se vuelven tocables. */
export function Filas({ filas }) {
  return filas.map(([k, v]) => {
    if (v == null || v === '' || v === '—') return null
    return (
      <div key={k} style={{ display: 'grid', gridTemplateColumns: '112px 1fr', gap: 10, padding: '9px 0', borderBottom: '1px solid #F3F4F6', fontSize: 14 }}>
        <span style={{ color: COLOR.gris }}>{k}</span>
        <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{v}</span>
      </div>
    )
  })
}

export const Llamar = ({ tel }) => tel ? <a href={`tel:${tel}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{tel}</a> : null
export const Correo = ({ mail }) => mail ? <a href={`mailto:${mail}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{mail}</a> : null

export const botonGrande = (color = COLOR.azul, lleno = true) => ({
  width: '100%', minHeight: 48, borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
  border: `1.5px solid ${color}`, background: lleno ? color : 'white', color: lleno ? 'white' : color,
})
