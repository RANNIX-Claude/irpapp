/**
 * Ejecutores de las acciones que el Agente Operativo propone.
 *
 * chat-operativo.js valida y arma la propuesta; aquí se ejecuta, en el
 * navegador y con la sesión del usuario, solo después de que hace clic en
 * Confirmar. Así aplican los mismos RPC, RLS y `es_staff()` que en la pantalla
 * normal, y la bitácora registra al usuario real. Cada ejecutor devuelve un
 * texto corto con el resultado (se le pasa al agente como mensaje [Sistema]).
 */
import { supabase, llamarFuncion } from './supabase'
import { logAudit } from '../hooks/useAudit'

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

/** Lee una ficha con OCR. Devuelve { id, miniatura, texto } listo para el mensaje al agente. */
export async function leerFicha(file) {
  const id = `F${++fichaSeq}`
  const dataUrl = await comprimir(file)
  fichas.set(id, { base64: dataUrl.split(',')[1], mime: 'image/jpeg', ext: 'jpg' })
  try {
    const resp = await fetch('/.netlify/functions/extraer-documento', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_base64: dataUrl.split(',')[1], media_type: 'image/jpeg', tipo_doc: 'COMPROBANTE_PAGO' }),
    })
    const j = await resp.json()
    if (!resp.ok || !j.datos) throw new Error(j.error || 'Sin datos')
    const d = j.datos
    const partes = [
      d.monto != null && `importe ${d.monto}`, d.fecha_pago && `fecha ${d.fecha_pago}`, d.banco && `banco ${d.banco}`,
      d.referencia && `referencia ${d.referencia}`, d.forma_pago && `forma ${d.forma_pago}`,
      d.concepto && `concepto "${d.concepto}"`, d.nombre_emisor && `ordenante "${d.nombre_emisor}"`,
    ].filter(Boolean)
    return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: ${partes.join(', ') || 'sin datos legibles'}]` }
  } catch (e) {
    console.error('[leerFicha]', e)
    return { id, miniatura: dataUrl, texto: `[Ficha ${id} adjunta: no se pudo leer la imagen]` }
  }
}

const redondear = n => Math.round(n * 100) / 100

const EJECUTORES = {
  async renovar_contrato(p) {
    // Mismo criterio de folio que ModalRenovacion en Contratos.jsx
    const base = (p.folio_base || 'CA').replace(/-R\d{2}(-\d+)?$/, '')
    const candidato = `${base}-R${new Date().getFullYear().toString().slice(-2)}`
    const { data: existe } = await supabase.from('contratos').select('id').eq('numero_contrato', candidato).maybeSingle()
    const folio = existe ? `${candidato}-${Date.now().toString().slice(-4)}` : candidato

    const { data: nuevoId, error } = await supabase.rpc('renovar_contrato', {
      p_contrato_id:       p.contrato_id,
      p_folio:             folio,
      p_arrendatario_id:   p.arrendatario_id,
      p_unidad_id:         p.unidad_id,
      p_tipo_contrato:     p.tipo_contrato,
      p_fecha_inicio:      p.fecha_inicio,
      p_fecha_fin:         p.fecha_fin || null,
      p_renta_mensual:     p.renta_mensual,
      p_cuota_mant:        0,
      p_deposito_garantia: p.deposito_garantia || 0,
      p_dia_cobro:         p.dia_pago || 1,
      p_penalizacion_mora: p.penalizacion_pct ?? 5,
      p_incremento_anual:  p.incremento_anual_pct || 0,
      p_fiador_nombre:     p.fiador_nombre || null,
      p_fiador_rfc:        null,
      p_fiador_domicilio:  null,
      p_notas:             p.notas || null,
    })
    if (error) throw error
    await logAudit({
      modulo: 'Contratos', accion: 'RENOVAR', entidad: 'contratos', entidad_id: nuevoId,
      descripcion: `Renovación ${p.folio_base} → ${folio} (vía Agente Operativo)`,
    })
    return { texto: `Contrato renovado. Nuevo folio ${folio}, vigencia ${p.fecha_inicio} → ${p.fecha_fin}, renta ${p.renta_mensual}.`, ruta: `/contratos/${nuevoId}` }
  },

  // Mismo circuito que Ingresos.jsx: ingreso + aplicaciones_pago. prp_cartera
  // deriva PARCIAL/PAGADO y el saldo a partir de las aplicaciones.
  async aplicar_pago(p) {
    // El mundo pudo cambiar entre la propuesta y el clic: se revalida todo.
    if (p.referencia) {
      const { data: dup } = await supabase.from('ingresos').select('id').eq('referencia_banco', p.referencia).limit(1)
      if (dup?.length) throw new Error(`La referencia ${p.referencia} ya está registrada (ingreso #${dup[0].id}).`)
    }
    const ids = p.distribucion.map(d => d.cargo_id)
    if (ids.length) {
      const { data: vivos, error } = await supabase.from('prp_cartera').select('id, saldo').in('id', ids)
      if (error) throw error
      for (const d of p.distribucion) {
        const v = vivos.find(x => x.id === d.cargo_id)
        if (!v || Number(v.saldo) + 0.01 < d.aplicar) throw new Error('El saldo de un cargo cambió desde la propuesta. Pídeme la propuesta de nuevo.')
      }
    }

    const [anio, mes] = p.fecha.split('-').map(Number)
    const nota = ['Vía Agente Operativo', p.banco && `Banco: ${p.banco}`, p.ordenante && `Ordenante: ${p.ordenante}`, p.nota].filter(Boolean).join(' · ')
    const { data: ing, error: eIng } = await supabase.from('ingresos').insert({
      contrato_id: p.contrato_id, fecha: p.fecha, mes, anio,
      importe: p.importe, importe_total: p.importe,
      forma_pago: p.forma_pago, referencia_banco: p.referencia || null,
      tipo: p.tipo, tipo_concepto: p.tipo,
      origen: p.forma_pago === 'EFECTIVO' ? 'EFECTIVO' : 'TRANSFERENCIA',
      nota, estatus_validacion: 'POR_VALIDAR',
    }).select('id').single()
    if (eIng) throw eIng

    if (p.distribucion.length) {
      const { error: eAp } = await supabase.from('aplicaciones_pago').insert(
        p.distribucion.map(d => ({ ingreso_id: ing.id, cargo_id: d.cargo_id, importe_aplicado: d.aplicar })),
      )
      if (eAp) {
        // No dejar un depósito sin aplicar por un fallo a medias: se deshace.
        await supabase.from('ingresos').delete().eq('id', ing.id)
        throw new Error('No se pudo aplicar a los cargos: ' + eAp.message)
      }
    }

    // El comprobante es soporte, no condición: si falla, el pago igual queda.
    let avisoComp = ''
    const f = p.ficha && fichas.get(p.ficha)
    if (f) {
      try {
        const r = await llamarFuncion('subir-comprobante', {
          bucket: 'facturas-cfdi', path: `comprobantes/${ing.id}/comp.${f.ext}`,
          file_base64: f.base64, mime_type: f.mime, ingreso_id: ing.id,
        })
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status)
        fichas.delete(p.ficha)
      } catch (e) { avisoComp = ` (el comprobante no se pudo subir: ${e.message})` }
    }

    await logAudit({
      modulo: 'Ingresos', accion: 'APLICAR_PAGO', entidad: 'ingresos', entidad_id: String(ing.id),
      descripcion: `Depósito ${p.importe} ${p.folio} ref ${p.referencia || '—'} (vía Agente Operativo)`,
    })
    const aplicado = redondear(p.distribucion.reduce((s, d) => s + d.aplicar, 0))
    const favor = redondear(p.importe - aplicado)
    return { texto: `Ingreso #${ing.id} registrado (POR_VALIDAR): aplicado ${aplicado} a ${p.distribucion.length} cargo(s)${favor > 0 ? `, saldo a favor ${favor}` : ''}${avisoComp}.`, ruta: '/ingresos' }
  },
}

export async function ejecutarAccion(propuesta) {
  const fn = EJECUTORES[propuesta.accion]
  if (!fn) throw new Error('Acción no disponible')
  return fn(propuesta.params)
}
