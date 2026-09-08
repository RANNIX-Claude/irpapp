import { useState } from 'react'
import { Sparkles, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

// Documentos de los que la IA puede sacar datos de la ficha del empleado.
// El valor es el prompt que espera netlify/functions/extraer-documento.
export const OCR_POR_TIPO = {
  INE: 'INE_FRENTE',
  COMPROBANTE_DOM: 'COMPROBANTE_DOMICILIO',
}

export const ETIQUETA_DOC = {
  INE: 'INE / Credencial para votar',
  COMPROBANTE_DOM: 'Comprobante de domicilio',
}

export const ETIQUETA_CAMPO = {
  curp: 'CURP', fecha_nacimiento: 'Fecha de nacimiento', sexo: 'Sexo',
  calle: 'Calle', numero_ext: 'Número ext.', numero_int: 'Número int.',
  colonia: 'Colonia', municipio: 'Municipio', estado_domicilio: 'Estado',
  codigo_postal: 'Código postal',
}

/**
 * Traduce lo que devuelve el OCR a columnas de rh_empleados. Descarta nulos y
 * cadenas vacías para que el documento no pise con huecos lo ya capturado.
 */
export function mapearAEmpleado(datos, tipo) {
  if (!datos) return {}
  const m = tipo === 'INE'
    ? {
        curp: datos.curp,
        fecha_nacimiento: datos.fecha_nacimiento,
        // En la INE el sexo viene H/M; aquí se guarda M/F.
        sexo: datos.sexo === 'H' ? 'M' : datos.sexo === 'M' ? 'F' : null,
        calle: datos.calle,
        numero_ext: datos.no_ext,
        numero_int: datos.no_int,
        colonia: datos.colonia_ine,
        municipio: datos.municipio_ine,
        estado_domicilio: datos.estado_ine,
        codigo_postal: datos.cp_ine,
      }
    : {
        calle: datos.calle,
        numero_ext: datos.no_ext,
        numero_int: datos.no_int,
        colonia: datos.colonia,
        municipio: datos.municipio,
        estado_domicilio: datos.estado,
        codigo_postal: datos.cp,
      }
  return Object.fromEntries(
    Object.entries(m).filter(([, v]) => v != null && String(v).trim() !== '')
  )
}

const C = { primary: '#0A66C2', text: '#1E293B', muted: '#64748B', border: '#E2E8F0' }

/**
 * Banda para llenar una ficha a partir de una INE o un comprobante de
 * domicilio. No guarda nada: entrega los campos ya mapeados en `onAplicar`
 * para que quien lo use decida si rellena un formulario o escribe en la base.
 *
 * @param {(cambios: object, tipo: string, archivo: File) => void|Promise} onAplicar
 * @param {string}  etiquetaAplicar  texto del botón de confirmación
 * @param {boolean} compacto         sin marco, para meterlo dentro de otro panel
 */
export default function ImportadorDocumento({ onAplicar, etiquetaAplicar = 'Aplicar', compacto = false }) {
  const [tipo, setTipo] = useState('INE')
  const [file, setFile] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const [datos, setDatos] = useState(null)
  const [aplicando, setAplicando] = useState(false)

  const cambios = datos ? mapearAEmpleado(datos, tipo) : {}

  const leer = async () => {
    if (!file) return toast.error('Selecciona primero el archivo')
    setLeyendo(true); setDatos(null)
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const resp = await fetch('/.netlify/functions/extraer-documento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: b64, media_type: file.type, tipo_doc: OCR_POR_TIPO[tipo] }),
      })
      const j = await resp.json()
      if (!resp.ok || !j.datos) throw new Error(j.error || 'No se pudieron leer los datos')
      setDatos(j.datos)
      toast.success('Datos leídos — revísalos antes de aplicar')
    } catch (e) {
      toast.error('No se pudo leer: ' + e.message)
    } finally { setLeyendo(false) }
  }

  const aplicar = async () => {
    if (!Object.keys(cambios).length) return toast.error('No hay datos aprovechables')
    setAplicando(true)
    try { await onAplicar(cambios, tipo, file) } finally { setAplicando(false) }
    setDatos(null); setFile(null)
  }

  const marco = compacto
    ? {}
    : { background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: '12px 14px' }

  return (
    <div style={marco}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sparkles size={15} color={C.primary} />
        <span style={{ fontSize: 12, fontWeight: 800, color: C.primary }}>
          Llenar desde un documento
        </span>
        <span style={{ fontSize: 11, color: C.muted }}>
          — evita teclear CURP y domicilio
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={tipo} onChange={e => { setTipo(e.target.value); setDatos(null) }}
          style={{ padding: '7px 10px', border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12, background: 'white' }}>
          {Object.keys(OCR_POR_TIPO).map(t => <option key={t} value={t}>{ETIQUETA_DOC[t]}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: `1.5px dashed ${C.border}`, borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'white', color: file ? C.text : C.muted, maxWidth: 240 }}>
          <Upload size={13} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file ? file.name : 'Elegir foto o PDF'}
          </span>
          <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files[0]); setDatos(null) }} />
        </label>

        <button type="button" onClick={leer} disabled={!file || leyendo}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: 'none', borderRadius: 7, background: file ? C.primary : '#CBD5E1', color: 'white', fontSize: 12, fontWeight: 700, cursor: file ? 'pointer' : 'default' }}>
          {leyendo ? 'Leyendo…' : 'Leer datos'}
        </button>
      </div>

      {datos && (
        <div style={{ marginTop: 12, background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            {Object.keys(cambios).length} campos leídos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {Object.entries(cambios).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: C.muted }}>{ETIQUETA_CAMPO[k] || k}</div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{String(v)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setDatos(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: `1.5px solid ${C.border}`, borderRadius: 7, background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: C.muted }}>
              <X size={12} /> Descartar
            </button>
            <button type="button" onClick={aplicar} disabled={aplicando}
              style={{ padding: '6px 14px', border: 'none', borderRadius: 7, background: '#057642', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {aplicando ? 'Aplicando…' : etiquetaAplicar}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
