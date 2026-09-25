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
import { asegurarProveedor, normNombre, integrarVending, datosFechaGasto } from './compras'

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

  // Mismo resultado que TicketModal: proveedor, gastos_operativos, gasto_detalle,
  // foto en tickets-gastos y, si aplica, compras de vending.
  async registrar_gasto(p) {
    let provId = p.proveedor.id
    if (!provId) {
      const { data: provs } = await supabase.from('cat_proveedores').select('id, nombre').eq('activo', true)
      provId = provs?.find(x => normNombre(x.nombre) === normNombre(p.proveedor.nombre))?.id
        || await asegurarProveedor({ nombre: p.proveedor.nombre, rfc: p.proveedor.rfc, razon_social: p.proveedor.razon_social })
    }

    const { data: g, error: eG } = await supabase.from('gastos_operativos').insert({
      fecha: p.fecha, proveedor: p.proveedor.nombre, proveedor_id: provId || null,
      grupo_gasto: p.grupo_gasto, descripcion: p.descripcion || (p.folio ? `Ticket ${p.folio}` : null),
      cantidad: p.total, ticket_total: p.total, ...datosFechaGasto(p.fecha),
    }).select('id').single()
    if (eG) throw eG

    if (p.lineas.length) {
      const { error: eD } = await supabase.from('gasto_detalle').insert(
        p.lineas.filter(l => l.descripcion && l.precio_unit >= 0).map(l => ({
          gasto_id: g.id, descripcion: l.descripcion, categoria: l.categoria || null,
          cantidad: l.cantidad, precio_unit: l.precio_unit, codigo_proveedor: l.codigo_proveedor || null,
        })),
      )
      if (eD) {
        await supabase.from('gastos_operativos').delete().eq('id', g.id)
        throw new Error('No se pudieron guardar las partidas: ' + eD.message)
      }
    }

    // Foto y vending son complementos: si fallan, el gasto ya quedó bien registrado.
    const avisos = []
    const f = p.ficha && fichas.get(p.ficha)
    if (f) {
      try {
        const bytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0))
        const path = `${p.fecha.slice(0, 7)}/${g.id}.${f.ext}`
        const { data: up, error: eUp } = await supabase.storage.from('tickets-gastos').upload(path, new Blob([bytes], { type: f.mime }), { upsert: true })
        if (eUp) throw eUp
        await supabase.from('gastos_operativos').update({ ticket_url: up.fullPath || up.path }).eq('id', g.id)
        fichas.delete(p.ficha)
      } catch (e) { avisos.push(`la foto no se guardó (${e.message})`) }
    }
    if (p.categoria_lineas === 'VENDING') {
      try {
        const v = await integrarVending({ lineas: p.lineas, fecha: p.fecha, proveedor: p.proveedor.nombre, descripcion: p.descripcion })
        avisos.push(v.sinSemana ? 'no hay semana de vending abierta, no se cargó a vending'
          : `vending: ${v.aplicadas} producto(s) cargados${v.omitidas ? `, ${v.omitidas} sin coincidencia en el catálogo de vending` : ''}`)
      } catch (e) { avisos.push(`vending no se pudo cargar (${e.message})`) }
    }

    await logAudit({
      modulo: 'Gastos', accion: 'REGISTRAR_TICKET', entidad: 'gastos_operativos', entidad_id: g.id,
      descripcion: `Ticket ${p.proveedor.nombre} ${p.total} ${p.fecha} (vía Agente Operativo)`,
    })
    return { texto: `Gasto registrado: ${p.proveedor.nombre} $${p.total} · ${p.grupo_gasto}, ${p.lineas.length} partida(s)${avisos.length ? '; ' + avisos.join('; ') : ''}.`, ruta: '/gastos-operativos' }
  },

  // Mismo resultado que RH → Nuevo empleado + documentos del expediente.
  async alta_empleado(p) {
    if (p.curp) {
      const { data: ya } = await supabase.from('rh_empleados').select('id').eq('curp', p.curp).limit(1)
      if (ya?.length) throw new Error('Ya existe un empleado con esa CURP.')
    }
    const { data: id, error } = await supabase.rpc('crear_empleado', {
      p_nombre: p.nombre, p_apellido_pat: p.apellido_pat, p_apellido_mat: p.apellido_mat || '',
      p_sexo: p.sexo, p_rfc: p.rfc, p_curp: p.curp, p_nss: p.nss, p_fecha_nacimiento: p.fecha_nacimiento,
      p_fecha_ingreso: p.fecha_ingreso, p_puesto: p.puesto, p_area: p.area, p_departamento: p.departamento,
      p_salario_diario: p.salario_diario, p_email: p.email, p_celular: p.celular,
      p_tipo_contrato: p.tipo_contrato, p_fecha_fin_contrato: p.fecha_fin_contrato,
      p_horario_trabajo: p.horario_trabajo, p_dia_descanso: p.dia_descanso, p_forma_pago: p.forma_pago,
    })
    if (error) throw error

    const avisos = []
    // El RPC no recibe domicilio: va en un UPDATE aparte (como hace el expediente).
    if (Object.keys(p.domicilio || {}).length) {
      const { error: eD } = await supabase.from('rh_empleados').update(p.domicilio).eq('id', id)
      if (eD) avisos.push(`el domicilio no se guardó (${eD.message})`)
    }
    // Documentos al expediente (bucket privado expedientes-docs, tabla rh_expediente_documentos).
    const docs = [
      ['ine', 'INE', 'INE (frente)', p.ine_vence], ['ine_reverso', 'INE', 'INE (reverso)', null],
      ['domicilio', 'COMPROBANTE_DOM', 'Comprobante de domicilio', null],
    ]
    for (const [clave, tipo, nombre, vence] of docs) {
      const fichaId = p.fichas?.[clave]
      const f = fichaId && fichas.get(fichaId)
      if (!f) continue
      try {
        const path = `expedientes/${id}/${Date.now()}_${clave}.${f.ext}`
        await subirBase64('expedientes-docs', path, f)
        const { error: eDoc } = await supabase.from('rh_expediente_documentos').insert({
          empleado_id: id, tipo, nombre, archivo_path: path, tamano_kb: Math.round(f.base64.length * 0.75 / 1024),
          formato: f.ext.toUpperCase(), fecha_doc: p.fecha_ingreso, vence: vence || null,
        })
        if (eDoc) throw eDoc
        fichas.delete(fichaId)
      } catch (e) { avisos.push(`${nombre} no se archivó (${e.message})`) }
    }

    await logAudit({
      modulo: 'RH', accion: 'ALTA_EMPLEADO', entidad: 'rh_empleados', entidad_id: id,
      descripcion: `Alta ${p.nombre} ${p.apellido_pat} (vía Agente Operativo, desde INE)`,
    })
    return { texto: `Empleado dado de alta: ${p.nombre} ${p.apellido_pat}${avisos.length ? '; ' + avisos.join('; ') : ''}.`, ruta: `/rh/empleado/${id}` }
  },

  // Mismo resultado que Arrendatarios → Nuevo + documentos del expediente (tabla documentos).
  async alta_arrendatario(p) {
    if (p.rfc) {
      const { data: ya } = await supabase.from('arrendatarios').select('id').eq('rfc', p.rfc).limit(1)
      if (ya?.length) throw new Error(`Ya existe un arrendatario con el RFC ${p.rfc}.`)
    }
    const { data: a, error } = await supabase.from('arrendatarios').insert({
      locatario: p.locatario, nombre_negocio: p.nombre_negocio, rfc: p.rfc, tipo_persona: p.tipo_persona,
      telefono: p.telefono, email: p.email, domicilio: p.domicilio, estatus: 'ACTIVO',
    }).select('id').single()
    if (error) throw error

    const avisos = []
    const docs = [['ine', 'INE_FRENTE'], ['ine_reverso', 'INE_REVERSO'], ['domicilio', 'COMPROBANTE_DOMICILIO']]
    for (const [clave, tipoDoc] of docs) {
      const fichaId = p.fichas?.[clave]
      const f = fichaId && fichas.get(fichaId)
      if (!f) continue
      try {
        const path = `arrendatario/${a.id}/${tipoDoc}.${f.ext}`
        await subirBase64('expedientes-docs', path, f)
        const { error: eDoc } = await supabase.from('documentos').insert({
          entidad_tipo: 'ARRENDATARIO', entidad_id: a.id, tipo_doc: tipoDoc, url: path,
          nombre_archivo: `${tipoDoc}.${f.ext}`, estatus: 'PENDIENTE',
        })
        if (eDoc) throw eDoc
        fichas.delete(fichaId)
      } catch (e) { avisos.push(`${tipoDoc} no se archivó (${e.message})`) }
    }

    await logAudit({
      modulo: 'ARRENDATARIOS', accion: 'CREAR', entidad: 'ARRENDATARIO', entidad_id: a.id,
      descripcion: `Nuevo: ${p.locatario} (vía Agente Operativo, desde INE)`,
    })
    return { texto: `Arrendatario dado de alta: ${p.locatario}${avisos.length ? '; ' + avisos.join('; ') : ''}. Los documentos quedan PENDIENTES de aprobación.`, ruta: '/arrendatarios' }
  },
}

async function subirBase64(bucket, path, f) {
  const bytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0))
  const { error } = await supabase.storage.from(bucket).upload(path, new Blob([bytes], { type: f.mime }), { upsert: true })
  if (error) throw error
}

export async function ejecutarAccion(propuesta) {
  const fn = EJECUTORES[propuesta.accion]
  if (!fn) throw new Error('Acción no disponible')
  return fn(propuesta.params)
}
