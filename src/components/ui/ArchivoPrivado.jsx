import { useState, useEffect } from 'react'
import { urlFirmada } from '../../lib/supabase'

/**
 * Resuelve una URL firmada de vida corta para un archivo de Storage.
 *
 * `valor` puede ser la ruta dentro del bucket o —en filas viejas— la URL
 * pública completa: urlFirmada() extrae la ruta en ese caso. Devuelve null
 * mientras resuelve, si no hay archivo, o si el usuario no tiene permiso.
 *
 * Firmar exige sesión y política SELECT sobre el bucket. Los buckets que hoy
 * siguen públicos también se firman sin problema, así que este hook sirve
 * antes y después de cerrarlos.
 */
export function useUrlFirmada(bucket, valor) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!valor) { setUrl(null); return }
    let cancelado = false
    urlFirmada(bucket, valor).then(u => { if (!cancelado) setUrl(u) })
    return () => { cancelado = true }
  }, [bucket, valor])

  return url
}

/** <img> cuyo src se resuelve firmado. Mientras carga muestra un placeholder. */
export function ImagenPrivada({ bucket, valor, alt = '', style, onClick, placeholder = 'Cargando…' }) {
  const url = useUrlFirmada(bucket, valor)

  if (!url) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6,
        color: '#94A3B8', fontSize: 11, minHeight: 80, ...style,
      }}>
        {valor ? placeholder : 'Sin archivo'}
      </div>
    )
  }
  return <img src={url} alt={alt} style={style} onClick={onClick ? () => onClick(url) : undefined} />
}

/**
 * Enlace que abre un archivo privado. Firma al hacer clic —no al pintar— para
 * no gastar una firma por cada fila de una tabla.
 */
export function EnlacePrivado({ bucket, valor, children, style, title, descargar }) {
  const [abriendo, setAbriendo] = useState(false)

  const abrir = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!valor || abriendo) return
    setAbriendo(true)
    const url = await urlFirmada(bucket, valor)
    setAbriendo(false)
    if (!url) return
    if (descargar) {
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      a.click()
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <a href="#" onClick={abrir} title={title} style={{ ...style, opacity: abriendo ? 0.6 : undefined }}>
      {children}
    </a>
  )
}
