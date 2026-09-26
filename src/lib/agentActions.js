/**
 * Ejecutores de las acciones que el Agente Operativo propone.
 *
 * chat-operativo.js valida y arma la propuesta; aquí se ejecuta solo después de que
 * el usuario hace clic en Confirmar. El personal ejecuta en el navegador con su sesión
 * (mismos RPC, RLS y `es_staff()` que la pantalla normal, y la bitácora registra al
 * usuario real); el rol asistente lo hace por la function ejecutar-accion. Lo que hace
 * cada acción está en agenteEjecutores.js. Cada ejecutor devuelve un texto corto con el
 * resultado (se le pasa al agente como mensaje [Sistema]).
 */
import { supabase, llamarFuncion } from './supabase'
import { logAudit } from '../hooks/useAudit'
import { crearEjecutores } from './agenteEjecutores'
import { parsearChecador } from './checador'

// ─── Fichas de depósito adjuntas ─────────────────────────────────────────────
// La imagen NO viaja al agente: aquí se lee con la function de OCR y al chat
// solo pasa el texto extraído. El archivo se queda en memoria hasta que el
// usuario confirma la acción; entonces se sube como comprobante del ingreso.
const fichas = new Map()   // 'F1' → { base64, mime, ext }
let fichaSeq = 0

// Reduce a 1600 px máx. en JPEG: una foto de celular pesa MB y el OCR no lo necesita.
function comprimir(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen')) }
    img.src = url
  })
}

/** Datos leídos de las fichas vivas (sin imágenes): el servidor los usa para armar la vista previa. */
export const datosFichas = () => Object.fromEntries([...fichas].map(([id, f]) => [id, f.datos]).filter(([, d]) => d))

/** Lee una ficha (ticket o comprobante de pago) con una sola pasada de OCR.
 *  Devuelve { id, miniatura, texto } listo para el mensaje al agente. */
export async function leerFicha(file) {
  const id = `F${++fichaSeq}`
  const dataUrl = await comprimir(file)
  const f = { base64: dataUrl.split(',')[1], mime: 'image/jpeg', ext: 'jpg', datos: null }
  fichas.set(id, f)
  try {
    const resp = await fetch('/.netlify/functions/gastos-ocr', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_base64: f.base64, media_type: 'image/jpeg' }),
    })
    const d = await resp.json()
    if (!resp.ok || d.error) throw new Error(d.error || 'Sin datos')
    f.datos = d

    if (d.tipo_documento === 'COMPROBANTE_PAGO' && d.comprobante_pago) {
      const c = d.comprobante_pago
      const partes = [
        c.monto != null && `importe ${c.monto}`, c.fecha_pago && `fecha ${c.fecha_pago}`, c.banco && `banco ${c.banco}`,
        c.referencia && `referencia ${c.referencia}`, c.forma_pago && `forma ${c.forma_pago}`,
        c.concepto && `concepto "${c.concepto}"`, c.nombre_emisor && `ordenante "${c.nombre_emisor}"`,
      ].filter(Boolean)
      return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: COMPROBANTE DE PAGO — ${partes.join(', ')}]` }
    }
    if (d.tipo_documento === 'TICKET_COMPRA' || d.lineas?.length) {
      const t = d.ticket || {}, p = d.proveedor || {}
      const desc = (d.lineas || []).slice(0, 30).map(l => l.descripcion).filter(Boolean).join('; ')
      const partes = [
        p.nombre_comercial && `proveedor "${p.nombre_comercial}"`, p.rfc && `RFC ${p.rfc}`,
        t.fecha && `fecha ${t.fecha}`, t.folio && `folio ${t.folio}`, t.total != null && `total ${t.total}`,
        `${d.lineas?.length || 0} artículos`, t.validacion && t.validacion !== 'ok' && `ojo: ${t.validacion}`,
        desc && `artículos: ${desc}`,
      ].filter(Boolean)
      return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: TICKET DE COMPRA — ${partes.join(', ')}]` }
    }
    if (['INE_FRENTE', 'INE_REVERSO', 'COMPROBANTE_DOMICILIO'].includes(d.tipo_documento)) {
      // Documento de identidad: segunda pasada con el prompt específico (extraer-documento).
      const r2 = await fetch('/.netlify/functions/extraer-documento', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_base64: f.base64, media_type: 'image/jpeg', tipo_doc: d.tipo_documento }),
      })
      const j = await r2.json()
      if (!r2.ok || !j.datos) throw new Error(j.error || 'Sin datos')
      const x = j.datos
      f.datos = { tipo_documento: d.tipo_documento, identidad: x }
      const dir = d.tipo_documento === 'COMPROBANTE_DOMICILIO'
        ? [x.calle && `calle ${x.calle}`, x.no_ext && `no. ${x.no_ext}`, x.no_int && `int. ${x.no_int}`, x.colonia && `colonia ${x.colonia}`, x.municipio && `municipio ${x.municipio}`, x.estado && `estado ${x.estado}`, x.cp && `CP ${x.cp}`]
        : [x.calle && `calle ${x.calle}`, x.no_ext && `no. ${x.no_ext}`, x.colonia_ine && `colonia ${x.colonia_ine}`, x.municipio_ine && `municipio ${x.municipio_ine}`, x.estado_ine && `estado ${x.estado_ine}`, x.cp_ine && `CP ${x.cp_ine}`]
      const partes = d.tipo_documento === 'COMPROBANTE_DOMICILIO'
        ? [x.nombre_titular && `titular "${x.nombre_titular}"`, x.tipo_servicio && `servicio ${x.tipo_servicio}`, x.periodo && `periodo ${x.periodo}`, ...dir]
        : d.tipo_documento === 'INE_FRENTE'
          ? [x.nombre_completo && `nombre "${x.nombre_completo}"`, x.curp && `CURP ${x.curp}`, x.fecha_nacimiento && `nacimiento ${x.fecha_nacimiento}`, x.sexo && `sexo ${x.sexo}`, x.vigencia && `vigencia ${x.vigencia}`, ...dir]
          : [x.curp && `CURP ${x.curp}`, x.seccion && `sección ${x.seccion}`]
      const et = { INE_FRENTE: 'INE (frente)', INE_REVERSO: 'INE (reverso)', COMPROBANTE_DOMICILIO: 'COMPROBANTE DE DOMICILIO' }[d.tipo_documento]
      return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: ${et} — ${partes.filter(Boolean).join(', ') || 'sin datos legibles'}]` }
    }
    return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: documento no reconocido (ni ticket, ni comprobante de pago, ni INE, ni comprobante de domicilio)]` }
  } catch (e) {
    console.error('[leerFicha]', e)
    return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: no se pudo leer la imagen]` }
  }
}

// ─── Ejecución ──────────────────────────────────────────────────────────────
// El personal ejecuta aquí, en el navegador y con su sesión (RLS y es_staff() normales).
// Lo que hace cada acción vive en agenteEjecutores.js, compartido con el servidor.
// ─── Archivo de asistencia del checador ─────────────────────────────────────
// Se lee aquí (CSV, TXT, DAT o Excel) y al agente solo pasa un resumen: los marcajes ya
// leídos viajan como datos de la ficha para que el servidor arme la vista previa.
export async function leerArchivoChecador(file) {
  let texto
  if (/\.(xlsx?|xlsm)$/i.test(file.name)) {
    // Excel: la primera hoja se vuelve CSV y pasa por el mismo lector. Se importa al vuelo para
    // no cargar la librería en toda la app.
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
    texto = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { dateNF: 'yyyy-mm-dd hh:mm:ss' })
  } else {
    texto = await file.text()
  }
  const eventos = parsearChecador(texto)
  if (!eventos.length) throw new Error('no reconocí el formato del archivo (si es Excel, expórtalo como CSV o TXT)')
  const id = `F${++fichaSeq}`
  fichas.set(id, { base64: null, datos: { tipo_documento: 'ARCHIVO_CHECADOR', nombre_archivo: file.name, eventos } })
  const fechas = eventos.map(e => e.fecha).sort()
  const personas = new Set(eventos.map(e => e.numero)).size
  return {
    id, miniatura: null, archivo: file.name,
    texto: `[Ficha ${id} adjunta: ARCHIVO DE ASISTENCIA (checador) "${file.name}" — ${eventos.length} marcajes de ${personas} persona(s), del ${fechas[0]} al ${fechas[fechas.length - 1]}]`,
  }
}

const EJECUTORES = crearEjecutores({
  db: supabase,
  ficha: id => fichas.get(id) || null,
  consumirFicha: id => fichas.delete(id),
  async subirArchivo(bucket, path, f) {
    const bytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0))
    const { data, error } = await supabase.storage.from(bucket).upload(path, new Blob([bytes], { type: f.mime }), { upsert: true })
    if (error) throw error
    return data?.path || path
  },
  async subirComprobante(ingresoId, f) {
    const r = await llamarFuncion('subir-comprobante', {
      bucket: 'facturas-cfdi', path: `comprobantes/${ingresoId}/comp.${f.ext}`,
      file_base64: f.base64, mime_type: f.mime, ingreso_id: ingresoId,
    })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status)
  },
  audit: logAudit,
})

// El rol `asistente` no tiene permisos de escritura en la base: sus propuestas vienen
// marcadas `via: 'servidor'` y firmadas por chat-operativo, y las ejecuta la function
// ejecutar-accion con la service_role key. Aquí solo se manda la propuesta y las imágenes.
async function ejecutarRemoto(propuesta) {
  const ids = [propuesta.params.ficha, ...Object.values(propuesta.params.fichas || {})].filter(Boolean)
  const imagenes = {}
  for (const id of ids) { const f = fichas.get(id); if (f?.base64) imagenes[id] = { base64: f.base64, mime: f.mime, ext: f.ext } }
  const r = await llamarFuncion('ejecutar-accion', {
    accion: propuesta.accion, params: propuesta.params, firma: propuesta.firma, emitida: propuesta.emitida, fichas: imagenes,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`)
  ids.forEach(id => fichas.delete(id))
  return { texto: j.texto, ruta: j.ruta }
}

export async function ejecutarAccion(propuesta) {
  if (propuesta.via === 'servidor') return ejecutarRemoto(propuesta)
  const fn = EJECUTORES[propuesta.accion]
  if (!fn) throw new Error('Acción no disponible')
  return fn(propuesta.params)
}
