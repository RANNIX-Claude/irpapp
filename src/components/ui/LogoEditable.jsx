import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const MAX_MB = 2

/**
 * Imagen de un registro de catálogo (logo de proveedor o arrendatario, foto de
 * producto), editable con un clic.
 *
 * Sube al bucket indicado —público, para poder pintarla directo en listados de
 * muchas tarjetas sin firmar una URL por cada una— y actualiza la columna de la
 * tabla. Si no hay imagen muestra las iniciales del nombre.
 *
 * @param {string} bucket    bucket de destino (p. ej. 'catalogos')
 * @param {string} prefijo   carpeta dentro del bucket (p. ej. 'proveedores')
 * @param {string} tabla     tabla a actualizar (p. ej. 'cat_proveedores')
 * @param {string} columna   columna donde se guarda la URL
 * @param {string} registroId  id del registro
 * @param {string} url       URL actual, o null
 * @param {string} nombre    para las iniciales de respaldo
 * @param {(url: string) => void} onSubido  avisa al padre la URL nueva
 * @param {boolean} soloLectura  desactiva la edición
 */
export default function LogoEditable({
  bucket = 'catalogos', prefijo, tabla, columna = 'logo_url', registroId,
  url, nombre = '', size = 62, redondo = true, onSubido, soloLectura = false,
}) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const ini = (nombre || 'NN').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const subir = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`La imagen no debe pasar de ${MAX_MB} MB`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (!registroId) {
      toast.error('El registro no tiene id: guárdalo antes de agregar la imagen')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setSubiendo(true)
    try {
      // Extensión saneada: si el archivo viene sin extensión o con una rara,
      // se deduce del mime; el path nunca lleva caracteres del nombre original.
      const porMime = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
      const extBruta = (file.name.split('.').pop() || '').toLowerCase()
      const ext = /^[a-z0-9]{2,5}$/.test(extBruta) ? extBruta : (porMime[file.type] || 'png')
      const path = `${prefijo}/${registroId}_${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(bucket).upload(path, file, { contentType: file.type || porMime[ext], upsert: true })
      if (upErr) {
        // El mensaje corto de supabase-js oculta la causa; se arma uno completo.
        const detalle = [upErr.statusCode, upErr.error, upErr.message].filter(Boolean).join(' · ')
        console.error('[LogoEditable] fallo la subida', { bucket, path, tipo: file.type, tamano: file.size, upErr })
        throw new Error(detalle || 'error desconocido al subir')
      }

      const nueva = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
      const { error } = await supabase.from(tabla).update({ [columna]: nueva }).eq('id', registroId)
      if (error) {
        console.error('[LogoEditable] subio el archivo pero fallo el update', { tabla, columna, registroId, error })
        throw new Error(`archivo subido, pero no se guardó en ${tabla}: ${error.message}`)
      }

      onSubido?.(nueva)
      toast.success('Imagen actualizada')
    } catch (err) {
      toast.error('No se pudo subir: ' + err.message)
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const editable = !soloLectura && registroId

  return (
    <div
      onClick={() => editable && inputRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={editable ? (url ? 'Clic para cambiar la imagen' : 'Clic para agregar la imagen') : undefined}
      style={{
        width: size, height: size, flexShrink: 0, position: 'relative', overflow: 'hidden',
        borderRadius: redondo ? '50%' : 12, background: 'white',
        border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: editable ? 'pointer' : 'default',
      }}>
      {url
        ? <img src={url} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ fontSize: size * 0.3, fontWeight: 800, color: '#CBD5E1' }}>{ini}</span>}

      {editable && (hover || subiendo) && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: size < 60 ? 9 : 10, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.15, padding: 3,
        }}>
          {subiendo ? 'Subiendo…' : (url ? 'Cambiar' : 'Agregar imagen')}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onClick={e => e.stopPropagation()} onChange={subir} />
    </div>
  )
}
