/**
 * Ejecutores de las acciones del Agente Operativo — código compartido.
 *
 * Lo importan DOS sitios y por eso no toca `window`, ni `import.meta.env`, ni el
 * cliente de Supabase del navegador: todo entra por `ctx`.
 *   · src/lib/agentActions.js  → navegador, con la sesión del usuario (RLS normal).
 *     Lo usa el personal.
 *   · netlify/functions/ejecutar-accion.js → servidor, con la service_role key, tras
 *     validar una propuesta firmada y una matriz rol × acción. Lo usa el rol
 *     `asistente`, que no tiene permisos de escritura directos en la base.
 *
 * ctx = {
 *   db,                                       cliente de supabase-js
 *   rpc(nombre, args) → {data, error},        por omisión db.rpc
 *   ficha(id) → {base64, mime, ext} | null,   imagen adjunta por su id ("F1")
 *   consumirFicha(id),                        la olvida tras usarla
 *   subirArchivo(bucket, path, ficha) → path, sube a Storage (lanza si falla)
 *   subirComprobante(ingresoId, ficha),       comprobante de un ingreso
 *   audit({ modulo, accion, entidad, entidad_id, descripcion }),
 * }
 *
 * Cada ejecutor recibe `params` (los que armó `preparar` en chat-operativo.js) y
 * devuelve { texto, ruta }.
 */

// ─── Utilidades compartidas con src/lib/compras.js ──────────────────────────
// Misma normalización que proveedor_norm() en la base.
export const normNombre = (s) => (s || '')
  .toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z0-9]/g, '')

// Clave obligatoria y única para un proveedor dado de alta desde un ticket.
export const claveProveedor = (nombre) =>
  normNombre(nombre).slice(0, 16) + '_' + Date.now().toString(36).slice(-4).toUpperCase()

// Columnas derivadas de la fecha que lleva gastos_operativos.
export function datosFechaGasto(fecha) {
  const dt = new Date(fecha + 'T12:00:00')
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return { anio: dt.getFullYear(), mes: MESES[dt.getMonth()], dia_semana: DIAS[dt.getDay()], semana: `S${Math.ceil(dt.getDate() / 7)}` }
}

/** Busca el proveedor por RFC; si no existe, lo da de alta. Devuelve su id o null. */
export async function asegurarProveedor(db, { nombre, rfc, razon_social }) {
  const n = (nombre || razon_social || '').trim()
  if (!n) return null
  if (rfc) {
    const { data } = await db.from('cat_proveedores').select('id').eq('rfc', rfc.toUpperCase()).limit(1)
    if (data?.[0]) return data[0].id
  }
  const { data, error } = await db.from('cat_proveedores').insert({
    nombre: n, clave: claveProveedor(n), activo: true,
    rfc: rfc ? rfc.toUpperCase() : null, razon_social: razon_social || null,
  }).select('id').single()
  return error ? null : data.id
}

/**
 * Líneas de categoría VENDING de un ticket → compras en la semana de vending
 * abierta (movimiento + acumulados). Solo aplica a productos que ya existen en
 * vending_productos (por código de proveedor o por nombre); los demás se omiten.
 */
export async function integrarVending(db, { lineas, fecha, proveedor, descripcion }) {
  const lineasVending = lineas.filter(l => l.categoria === 'VENDING' && l.descripcion && l.precio_unit)
  if (!lineasVending.length) return { aplicadas: 0, omitidas: 0 }

  const { data: semana } = await db
    .from('vending_semanas').select('id').eq('estado', 'ABIERTA')
    .order('semana_inicio', { ascending: false }).limit(1).single()
  if (!semana) return { aplicadas: 0, omitidas: lineasVending.length, sinSemana: true }

  let aplicadas = 0
  for (const linea of lineasVending) {
    let vprod = null
    if (linea.codigo_proveedor) {
      const { data: porCodigo } = await db.from('vending_productos')
        .select('id,nombre,precio_compra_default').eq('codigo_proveedor', linea.codigo_proveedor).eq('activo', true).limit(1)
      vprod = porCodigo?.[0] || null
    }
    if (!vprod) {
      const { data: porNombre } = await db.from('vending_productos')
        .select('id,nombre,precio_compra_default').ilike('nombre', `%${linea.descripcion.trim()}%`).eq('activo', true).limit(1)
      vprod = porNombre?.[0] || null
    }
    if (!vprod) continue

    const cant   = parseFloat(linea.cantidad) || 1
    const precio = parseFloat(linea.precio_unit) || vprod.precio_compra_default || 0

    let { data: sp } = await db.from('vending_semana_producto')
      .select('id,qty_compras,importe_compras').eq('semana_id', semana.id).eq('producto_id', vprod.id).single()

    if (!sp) {
      const { data: nuevo } = await db.from('vending_semana_producto')
        .insert({ semana_id: semana.id, producto_id: vprod.id, qty_inicial: 0, qty_compras: 0, qty_ventas: 0, precio_compra_semana: precio, precio_venta_semana: 0, importe_compras: 0, importe_ventas: 0 })
        .select('*').single()
      sp = nuevo
    }
    if (!sp) continue

    await db.from('vending_movimientos').insert({
      semana_id: semana.id, producto_id: vprod.id, fecha, tipo: 'COMPRA',
      cantidad: cant, precio_unitario: precio,
      proveedor: proveedor || null,
      nota: `Desde ticket gastos: ${descripcion || ''}`.trim(),
    })

    await db.from('vending_semana_producto').update({
      qty_compras:     (parseFloat(sp.qty_compras) || 0) + cant,
      importe_compras: (parseFloat(sp.importe_compras) || 0) + cant * precio,
      precio_compra_semana: precio,
    }).eq('id', sp.id)
    aplicadas++
  }
  return { aplicadas, omitidas: lineasVending.length - aplicadas }
}

const redondear = n => Math.round(n * 100) / 100

// ─── Ejecutores ─────────────────────────────────────────────────────────────
export function crearEjecutores(ctx) {
  const { db, ficha, consumirFicha, subirArchivo, subirComprobante, audit } = ctx
  const rpc = ctx.rpc || ((n, a) => db.rpc(n, a))

  return {
    async renovar_contrato(p) {
      // Mismo criterio de folio que ModalRenovacion en Contratos.jsx
      const base = (p.folio_base || 'CA').replace(/-R\d{2}(-\d+)?$/, '')
      const candidato = `${base}-R${new Date().getFullYear().toString().slice(-2)}`
      const { data: existe } = await db.from('contratos').select('id').eq('numero_contrato', candidato).maybeSingle()
      const folio = existe ? `${candidato}-${Date.now().toString().slice(-4)}` : candidato

      const { data: nuevoId, error } = await rpc('renovar_contrato', {
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
      await audit({
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
        const { data: dup } = await db.from('ingresos').select('id').eq('referencia_banco', p.referencia).limit(1)
        if (dup?.length) throw new Error(`La referencia ${p.referencia} ya está registrada (ingreso #${dup[0].id}).`)
      }
      const ids = p.distribucion.map(d => d.cargo_id)
      if (ids.length) {
        const { data: vivos, error } = await db.from('prp_cartera').select('id, saldo').in('id', ids)
        if (error) throw error
        for (const d of p.distribucion) {
          const v = vivos.find(x => x.id === d.cargo_id)
          if (!v || Number(v.saldo) + 0.01 < d.aplicar) throw new Error('El saldo de un cargo cambió desde la propuesta. Pídeme la propuesta de nuevo.')
        }
      }

      const [anio, mes] = p.fecha.split('-').map(Number)
      const nota = ['Vía Agente Operativo', p.banco && `Banco: ${p.banco}`, p.ordenante && `Ordenante: ${p.ordenante}`, p.nota].filter(Boolean).join(' · ')
      const { data: ing, error: eIng } = await db.from('ingresos').insert({
        contrato_id: p.contrato_id, fecha: p.fecha, mes, anio,
        importe: p.importe, importe_total: p.importe,
        forma_pago: p.forma_pago, referencia_banco: p.referencia || null,
        tipo: p.tipo, tipo_concepto: p.tipo,
        origen: p.forma_pago === 'EFECTIVO' ? 'EFECTIVO' : 'TRANSFERENCIA',
        nota, estatus_validacion: 'POR_VALIDAR',
      }).select('id').single()
      if (eIng) throw eIng

      if (p.distribucion.length) {
        const { error: eAp } = await db.from('aplicaciones_pago').insert(
          p.distribucion.map(d => ({ ingreso_id: ing.id, cargo_id: d.cargo_id, importe_aplicado: d.aplicar })),
        )
        if (eAp) {
          // No dejar un depósito sin aplicar por un fallo a medias: se deshace.
          await db.from('ingresos').delete().eq('id', ing.id)
          throw new Error('No se pudo aplicar a los cargos: ' + eAp.message)
        }
      }

      // El comprobante es soporte, no condición: si falla, el pago igual queda.
      let avisoComp = ''
      const f = p.ficha && ficha(p.ficha)
      if (f) {
        try { await subirComprobante(ing.id, f); consumirFicha(p.ficha) }
        catch (e) { avisoComp = ` (el comprobante no se pudo subir: ${e.message})` }
      }

      await audit({
        modulo: 'Ingresos', accion: 'APLICAR_PAGO', entidad: 'ingresos', entidad_id: String(ing.id),
        descripcion: `Depósito ${p.importe} ${p.folio} ref ${p.referencia || '—'} (vía Agente Operativo)`,
      })
      const aplicado = redondear(p.distribucion.reduce((s, d) => s + d.aplicar, 0))
      const favor = redondear(p.importe - aplicado)
      return { texto: `Ingreso #${ing.id} registrado (POR_VALIDAR): aplicado ${aplicado} a ${p.distribucion.length} cargo(s)${favor > 0 ? `, saldo a favor ${favor}` : ''}${avisoComp}.`, ruta: '/ingresos', id: ing.id }
    },

    // Mismo resultado que TicketModal: proveedor, gastos_operativos, gasto_detalle,
    // foto en tickets-gastos y, si aplica, compras de vending.
    async registrar_gasto(p) {
      let provId = p.proveedor.id
      if (!provId) {
        const { data: provs } = await db.from('cat_proveedores').select('id, nombre').eq('activo', true)
        provId = provs?.find(x => normNombre(x.nombre) === normNombre(p.proveedor.nombre))?.id
          || await asegurarProveedor(db, { nombre: p.proveedor.nombre, rfc: p.proveedor.rfc, razon_social: p.proveedor.razon_social })
      }

      const { data: g, error: eG } = await db.from('gastos_operativos').insert({
        fecha: p.fecha, proveedor: p.proveedor.nombre, proveedor_id: provId || null,
        grupo_gasto: p.grupo_gasto, descripcion: p.descripcion || (p.folio ? `Ticket ${p.folio}` : null),
        cantidad: p.total, ticket_total: p.total, ...datosFechaGasto(p.fecha),
      }).select('id').single()
      if (eG) throw eG

      if (p.lineas.length) {
        const { error: eD } = await db.from('gasto_detalle').insert(
          p.lineas.filter(l => l.descripcion && l.precio_unit >= 0).map(l => ({
            gasto_id: g.id, descripcion: l.descripcion, categoria: l.categoria || null,
            cantidad: l.cantidad, precio_unit: l.precio_unit, codigo_proveedor: l.codigo_proveedor || null,
          })),
        )
        if (eD) {
          await db.from('gastos_operativos').delete().eq('id', g.id)
          throw new Error('No se pudieron guardar las partidas: ' + eD.message)
        }
      }

      // Foto y vending son complementos: si fallan, el gasto ya quedó bien registrado.
      const avisos = []
      const f = p.ficha && ficha(p.ficha)
      if (f) {
        try {
          const path = await subirArchivo('tickets-gastos', `${p.fecha.slice(0, 7)}/${g.id}.${f.ext}`, f)
          await db.from('gastos_operativos').update({ ticket_url: path }).eq('id', g.id)
          consumirFicha(p.ficha)
        } catch (e) { avisos.push(`la foto no se guardó (${e.message})`) }
      }
      if (p.categoria_lineas === 'VENDING') {
        try {
          const v = await integrarVending(db, { lineas: p.lineas, fecha: p.fecha, proveedor: p.proveedor.nombre, descripcion: p.descripcion })
          avisos.push(v.sinSemana ? 'no hay semana de vending abierta, no se cargó a vending'
            : `vending: ${v.aplicadas} producto(s) cargados${v.omitidas ? `, ${v.omitidas} sin coincidencia en el catálogo de vending` : ''}`)
        } catch (e) { avisos.push(`vending no se pudo cargar (${e.message})`) }
      }

      await audit({
        modulo: 'Gastos', accion: 'REGISTRAR_TICKET', entidad: 'gastos_operativos', entidad_id: g.id,
        descripcion: `Ticket ${p.proveedor.nombre} ${p.total} ${p.fecha} (vía Agente Operativo)`,
      })
      return { texto: `Gasto registrado: ${p.proveedor.nombre} $${p.total} · ${p.grupo_gasto}, ${p.lineas.length} partida(s)${avisos.length ? '; ' + avisos.join('; ') : ''}.`, ruta: '/gastos-operativos', id: g.id }
    },

    // Mismo resultado que RH → Nuevo empleado + documentos del expediente.
    async alta_empleado(p) {
      if (p.curp) {
        const { data: ya } = await db.from('rh_empleados').select('id').eq('curp', p.curp).limit(1)
        if (ya?.length) throw new Error('Ya existe un empleado con esa CURP.')
      }
      const { data: id, error } = await rpc('crear_empleado', {
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
        const { error: eD } = await db.from('rh_empleados').update(p.domicilio).eq('id', id)
        if (eD) avisos.push(`el domicilio no se guardó (${eD.message})`)
      }
      // Documentos al expediente (bucket privado expedientes-docs, tabla rh_expediente_documentos).
      const docs = [
        ['ine', 'INE', 'INE (frente)', p.ine_vence], ['ine_reverso', 'INE', 'INE (reverso)', null],
        ['domicilio', 'COMPROBANTE_DOM', 'Comprobante de domicilio', null],
      ]
      for (const [clave, tipo, nombre, vence] of docs) {
        const fichaId = p.fichas?.[clave]
        const f = fichaId && ficha(fichaId)
        if (!f) continue
        try {
          const path = await subirArchivo('expedientes-docs', `expedientes/${id}/${Date.now()}_${clave}.${f.ext}`, f)
          const { error: eDoc } = await db.from('rh_expediente_documentos').insert({
            empleado_id: id, tipo, nombre, archivo_path: path, tamano_kb: Math.round(f.base64.length * 0.75 / 1024),
            formato: f.ext.toUpperCase(), fecha_doc: p.fecha_ingreso, vence: vence || null,
          })
          if (eDoc) throw eDoc
          consumirFicha(fichaId)
        } catch (e) { avisos.push(`${nombre} no se archivó (${e.message})`) }
      }

      await audit({
        modulo: 'RH', accion: 'ALTA_EMPLEADO', entidad: 'rh_empleados', entidad_id: id,
        descripcion: `Alta ${p.nombre} ${p.apellido_pat} (vía Agente Operativo, desde INE)`,
      })
      return { texto: `Empleado dado de alta: ${p.nombre} ${p.apellido_pat}${avisos.length ? '; ' + avisos.join('; ') : ''}.`, ruta: `/rh/empleado/${id}`, id }
    },

    // Mismo resultado que Arrendatarios → Nuevo + documentos del expediente (tabla documentos).
    async alta_arrendatario(p) {
      if (p.rfc) {
        const { data: ya } = await db.from('arrendatarios').select('id').eq('rfc', p.rfc).limit(1)
        if (ya?.length) throw new Error(`Ya existe un arrendatario con el RFC ${p.rfc}.`)
      }
      const { data: a, error } = await db.from('arrendatarios').insert({
        locatario: p.locatario, nombre_negocio: p.nombre_negocio, rfc: p.rfc, tipo_persona: p.tipo_persona,
        telefono: p.telefono, email: p.email, domicilio: p.domicilio, estatus: 'ACTIVO',
      }).select('id').single()
      if (error) throw error

      const avisos = []
      const docs = [['ine', 'INE_FRENTE'], ['ine_reverso', 'INE_REVERSO'], ['domicilio', 'COMPROBANTE_DOMICILIO']]
      for (const [clave, tipoDoc] of docs) {
        const fichaId = p.fichas?.[clave]
        const f = fichaId && ficha(fichaId)
        if (!f) continue
        try {
          const path = await subirArchivo('expedientes-docs', `arrendatario/${a.id}/${tipoDoc}.${f.ext}`, f)
          const { error: eDoc } = await db.from('documentos').insert({
            entidad_tipo: 'ARRENDATARIO', entidad_id: a.id, tipo_doc: tipoDoc, url: path,
            nombre_archivo: `${tipoDoc}.${f.ext}`, estatus: 'PENDIENTE',
          })
          if (eDoc) throw eDoc
          consumirFicha(fichaId)
        } catch (e) { avisos.push(`${tipoDoc} no se archivó (${e.message})`) }
      }

      await audit({
        modulo: 'ARRENDATARIOS', accion: 'CREAR', entidad: 'ARRENDATARIO', entidad_id: a.id,
        descripcion: `Nuevo: ${p.locatario} (vía Agente Operativo, desde INE)`,
      })
      return { texto: `Arrendatario dado de alta: ${p.locatario}${avisos.length ? '; ' + avisos.join('; ') : ''}. Los documentos quedan PENDIENTES de aprobación.`, ruta: '/arrendatarios', id: a.id }
    },
  }
}
