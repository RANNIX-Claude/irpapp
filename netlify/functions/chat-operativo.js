/**
 * chat-operativo.js — Agente Operativo IRP · RANNIX Consulting 2026
 *
 * Proxy seguro para Claude API con acceso de LECTURA a los datos reales del
 * sistema mediante tool use. Claude decide qué vista consultar; la función
 * ejecuta la consulta contra Supabase con el JWT del usuario que pregunta, de
 * modo que aplica exactamente la misma RLS que ve en pantalla (staff ve todo,
 * un locatario solo su contrato). Nunca se usa la service_role key aquí.
 *
 * Solo se permiten las vistas prp_* de la lista blanca, solo SELECT y con tope
 * de filas. No hay SQL libre.
 *
 * Escritura: el agente solo PROPONE (proponer_accion). Esta función valida y
 * devuelve la propuesta; quien ejecuta es el navegador, con la sesión del
 * usuario, tras un clic en Confirmar. Ver ACCIONES y src/lib/agentActions.js.
 */

const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kusuoxwzdxfuybvyiakg.supabase.co'
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY

const MAX_FILAS = 50
const MAX_VUELTAS = 6   // llamadas a herramientas por pregunta

// Vista → columnas donde busca `texto` (ilike). La descripción va al modelo.
const VISTAS = {
  prp_contratos: {
    buscar: ['arrendatario_nombre', 'nombre_negocio', 'folio', 'locales_display', 'giro_autorizado', 'arrendatario_rfc'],
    columnas: 'id, folio, arrendatario_id, arrendatario_nombre, nombre_negocio, arrendatario_rfc, arrendatario_email, arrendatario_telefono, tipo_persona, representante_legal, tipo_contrato, giro_autorizado, fecha_inicio, fecha_fin, renta_mensual, renta_sin_iva, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, pagares_cantidad, contrato_anterior_id, estatus (VIGENTE|VENCIDO|RENOVADO|RESCISION|CANCELADO), estatus_proceso (EN_CONTRATACION|EN_RENOVACION|EN_EJECUCION|TERMINADO|SUSPENDIDO), locales_display, semaforo_vencimiento, dias_restantes, unidad_numero, m2_totales, inmueble_nombre, notas',
  },
  prp_cartera: {
    buscar: ['arrendatario_nombre', 'contrato_folio', 'concepto', 'locales_display'],
    columnas: 'id, contrato_id, contrato_folio, arrendatario_nombre, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, total_aplicado, saldo, renta_mensual, inmueble_nombre, locales_display',
  },
  prp_expediente_arrendatario: {
    buscar: ['nombre_completo', 'rfc', 'email', 'numero_local'],
    columnas: 'arrendatario_id, nombre_completo, rfc, telefono, email, tipo_persona, activo, contrato_id, fecha_inicio, fecha_fin, renta_mensual, contrato_estatus, giro_autorizado, numero_local, inmueble_nombre, total_pagado, total_pendiente, total_mora, cobros_pagados, cobros_pendientes, cobros_mora',
  },
  prp_ingresos: {
    buscar: ['arrendatario_nombre', 'folio', 'concepto_origen', 'nota', 'locales_display'],
    columnas: 'id, fecha, tipo, mes, anio, importe, factura, nota, origen, concepto_origen, contrato_id, folio, arrendatario_nombre, locales_display, estatus_validacion, clasificacion',
  },
  prp_gastos: {
    buscar: ['descripcion', 'grupo_gasto', 'proveedor_txt', 'proveedor_nombre'],
    columnas: 'id, fecha, semana, anio, mes, grupo_gasto, descripcion, monto, ticket_total, proveedor_nombre, proveedor_cat',
  },
  prp_unidades: {
    buscar: ['numero_local', 'tipo_unidad', 'estado_id'],
    columnas: 'id, inmueble_id, numero_local, tipo_unidad, m2_totales, renta_base, estado_id, notas',
  },
  prp_inmuebles: {
    buscar: ['nombre', 'ciudad', 'tipo_inmueble'],
    columnas: 'id, nombre, tipo_inmueble, ciudad, estado, m2_totales',
  },
  prp_empleados: {
    buscar: ['nombre_completo', 'puesto', 'area', 'departamento', 'numero_empleado'],
    columnas: 'id, numero_empleado, nombre_completo, puesto, area, departamento, fecha_ingreso, salario_diario, salario_mensual, estado_id, horario_trabajo, dia_descanso, tipo_contratacion, contrato_inicio, contrato_fin, semaforo_contrato, dias_antiguedad',
  },
  prp_incidencias: {
    buscar: ['nombre_completo', 'tipo', 'descripcion'],
    columnas: 'id, empleado_id, nombre_completo, numero_empleado, puesto, fecha, tipo, descripcion, afecta_nomina, semana_inicio',
  },
  prp_vacantes: {
    buscar: ['titulo', 'area', 'departamento', 'status'],
    columnas: 'id, titulo, area, departamento, num_plazas, salario_min, salario_max, fecha_apertura, fecha_cierre, status',
  },
  prp_proveedores: {
    buscar: ['nombre', 'rfc', 'categoria'],
    columnas: 'id, nombre, rfc, email, telefono, categoria, activo',
  },
  prp_prospectos: {
    buscar: ['nombre_completo', 'email', 'giro_solicitado', 'estatus'],
    columnas: 'id, nombre_completo, email, telefono, giro_solicitado, monto_ofertado, fecha_visita, estatus, motivo_rechazo, unidad_interes, inmueble_nombre, created_at',
  },
  prp_pensiones_estacionamiento: {
    buscar: ['nombre', 'placa', 'marca_auto'],
    columnas: 'id, nombre, telefono, placa, marca_auto, cajon_id, monto_mensual, fecha_inicio, fecha_fin, activo',
  },
  prp_estacionamiento_mensual: {
    buscar: [],
    columnas: 'anio, mes, dias_registrados, total_mes, promedio_dia, min_dia, max_dia',
  },
}

const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is']

// ─── Acciones de escritura ─────────────────────────────────────────────────
// Esta función NUNCA escribe. `preparar` valida contra los datos reales (con la
// RLS del usuario) y devuelve los parámetros completos + un resumen legible; el
// navegador los muestra en una tarjeta y, solo si el usuario confirma, los
// ejecuta con su sesión (src/lib/agentActions.js). Agregar una acción = una
// entrada aquí (validar/resumir) y otra allá (ejecutar).
// Copia de GRUPOS_GASTO en src/lib/compras.js (esta function no importa de src/)
const GRUPOS_GASTO = ['Ferretería y materiales', 'Limpieza e higiene', 'Papelería y oficina', 'Electricidad', 'Plomería', 'Herramienta y equipo', 'Servicios externos', 'Vending / Reabasto', 'Mantenimiento', 'Combustible', 'Seguridad', 'Alimentación', 'Nómina / Personal', 'Otros']
const ISO = /^\d{4}-\d{2}-\d{2}$/
const mxn = n => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

// "RENTA SEP 2026 L08" → { mes: 9, anio: 2026 }. Acepta mes en 3 letras o completo,
// con o sin acento; también "09/2026" o "2026-09". Sin periodo claro devuelve null.
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
function periodoDeTexto(t) {
  const s = String(t || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  let m = s.match(/\b(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SEPT|OCT|NOV|DIC)[A-Z]*\.?\s*(?:DE\s+|DEL\s+)?(20\d{2})\b/)
  if (m) return { mes: MESES.indexOf(m[1].slice(0, 3)) + 1, anio: Number(m[2]) }
  m = s.match(/\b(0?[1-9]|1[0-2])[\/-](20\d{2})\b/)
  if (m) return { mes: Number(m[1]), anio: Number(m[2]) }
  m = s.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/)
  if (m) return { mes: Number(m[2]), anio: Number(m[1]) }
  return null
}
const sumarDias = (iso, d) => { const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10) }
const mismoDiaAnioSig = iso => { const t = new Date(iso + 'T00:00:00Z'); t.setUTCFullYear(t.getUTCFullYear() + 1); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10) }

const ACCIONES = {
  renovar_contrato: {
    descripcion: 'Renueva un contrato VIGENTE: el original pasa a RENOVADO y se crea el nuevo. Parámetros: contrato_id (uuid, obligatorio); opcionales fecha_inicio (YYYY-MM-DD, por omisión el día siguiente al fin del actual), fecha_fin (por omisión +1 año), renta_mensual, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, notas.',
    async preparar(db, p, _ctx) {
      if (!p.contrato_id) return { error: 'Falta contrato_id. Consúltalo en prp_contratos.' }
      const { data: c, error } = await db.from('prp_contratos')
        .select('id, folio, arrendatario_id, arrendatario_nombre, unidad_id, tipo_contrato, fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, locales_display, estatus')
        .eq('id', p.contrato_id).maybeSingle()
      if (error) return { error: error.message }
      if (!c) return { error: 'Contrato no encontrado.' }
      if (c.estatus !== 'VIGENTE') return { error: `El contrato ${c.folio} está ${c.estatus}; solo se renuevan los VIGENTES.` }
      const { count } = await db.from('prp_contratos').select('id', { count: 'exact', head: true }).eq('contrato_anterior_id', c.id)
      if (count > 0) return { error: `El contrato ${c.folio} ya tiene una renovación registrada.` }

      const inicio = p.fecha_inicio || (c.fecha_fin ? sumarDias(c.fecha_fin, 1) : new Date().toISOString().slice(0, 10))
      const fin = p.fecha_fin || mismoDiaAnioSig(inicio)
      if (!ISO.test(inicio) || !ISO.test(fin)) return { error: 'Las fechas deben ir en formato YYYY-MM-DD.' }
      if (fin <= inicio) return { error: 'La fecha de fin debe ser posterior a la de inicio.' }
      const renta = Number(p.renta_mensual ?? c.renta_mensual)
      if (!(renta > 0)) return { error: 'La renta mensual debe ser mayor a 0.' }

      const params = {
        contrato_id: c.id, folio_base: c.folio, arrendatario_id: c.arrendatario_id, unidad_id: c.unidad_id, tipo_contrato: c.tipo_contrato,
        fecha_inicio: inicio, fecha_fin: fin, renta_mensual: renta,
        deposito_garantia: Number(p.deposito_garantia ?? c.deposito_garantia ?? 0),
        dia_pago: Number(p.dia_pago ?? c.dia_pago ?? 1),
        penalizacion_pct: Number(p.penalizacion_pct ?? c.penalizacion_pct ?? 5),
        incremento_anual_pct: Number(p.incremento_anual_pct ?? c.incremento_anual_pct ?? 0),
        fiador_nombre: p.fiador_nombre ?? c.fiador_nombre ?? null,
        notas: p.notas ?? null,
      }
      const cambio = (a, b) => a === b ? '' : ` (antes ${b})`
      return {
        params,
        titulo: `Renovar contrato ${c.folio}`,
        confirmar: 'Renovar contrato',
        resumen: [
          ['Arrendatario', c.arrendatario_nombre],
          ['Local', c.locales_display],
          ['Vigencia', `${inicio} → ${fin}`],
          ['Renta mensual', mxn(renta) + (renta !== Number(c.renta_mensual) ? ` (antes ${mxn(c.renta_mensual)})` : '')],
          ['Depósito', mxn(params.deposito_garantia)],
          ['Día de pago', `${params.dia_pago}${cambio(params.dia_pago, c.dia_pago)}`],
          ['Penalización', `${params.penalizacion_pct}%`],
          ['Fiador', params.fiador_nombre || '—'],
        ],
        aviso: `El contrato ${c.folio} pasará a RENOVADO y se creará el nuevo como VIGENTE (EN_RENOVACION).`,
      }
    },
  },

  aplicar_pago: {
    descripcion: 'Registra un depósito/ficha de pago de un arrendatario y lo aplica a sus cargos pendientes, del más antiguo al más nuevo. Si el depósito no alcanza, el último cargo queda PARCIAL; si sobra, el excedente queda como saldo a favor. El depósito queda POR_VALIDAR hasta conciliarlo con el banco. Parámetros: contrato_id (uuid) y ficha (id de la imagen adjunta, p. ej. "F1"). Con ficha, el sistema toma importe, fecha, referencia, banco y ordenante de la ficha: NO los copies, envíalos solo si el usuario los corrigió. Sin ficha (pago dicho de palabra) envía importe, fecha (YYYY-MM-DD), referencia, forma_pago (TRANSFERENCIA|DEPOSITO|EFECTIVO|CHEQUE). Opcionales: nota; cargo_ids (array) para aplicar solo a esos cargos.',
    async preparar(db, p0, ctx) {
      // Los datos de la ficha (OCR) mandan; el modelo solo los pasa si el usuario los corrigió.
      const cp = ctx.fichas?.[p0.ficha]?.comprobante_pago || {}
      const p = {
        importe: cp.monto, fecha: cp.fecha_pago, referencia: cp.referencia, forma_pago: cp.forma_pago, banco: cp.banco, ordenante: cp.nombre_emisor,
        ...Object.fromEntries(Object.entries(p0).filter(([, v]) => v != null && v !== '')),
      }
      if (/dep[oó]sito/i.test(p.forma_pago || '')) p.forma_pago = 'DEPOSITO'
      if (/transf|spei/i.test(p.forma_pago || '')) p.forma_pago = 'TRANSFERENCIA'
      if (!p.contrato_id) return { error: 'Falta contrato_id. Ubícalo por el número de local con consultar_datos en prp_contratos (estatus VIGENTE).' }
      const importe = Number(p.importe)
      if (!(importe > 0)) return { error: 'El importe debe ser mayor a 0.' }
      if (!p.fecha || !ISO.test(p.fecha)) return { error: 'La fecha del depósito debe ir en formato YYYY-MM-DD.' }
      const forma = String(p.forma_pago || 'TRANSFERENCIA').toUpperCase()
      if (!['TRANSFERENCIA', 'DEPOSITO', 'EFECTIVO', 'CHEQUE'].includes(forma)) return { error: 'forma_pago no válida.' }
      const ref = p.referencia ? String(p.referencia).trim() : null

      const { data: c, error: e1 } = await db.from('prp_contratos')
        .select('id, folio, arrendatario_nombre, locales_display, estatus').eq('id', p.contrato_id).maybeSingle()
      if (e1) return { error: e1.message }
      if (!c) return { error: 'Contrato no encontrado.' }

      // Duplicado: la misma clave de rastreo no se aplica dos veces.
      if (ref) {
        const { data: dup } = await db.from('ingresos').select('id, fecha, importe').eq('referencia_banco', ref).limit(1)
        if (dup?.length) return { error: `La referencia ${ref} ya está registrada (ingreso #${dup[0].id} del ${dup[0].fecha} por ${mxn(dup[0].importe)}). No se aplicó dos veces.` }
      }
      const { data: mismo } = await db.from('ingresos').select('id').eq('contrato_id', c.id).eq('fecha', p.fecha).eq('importe', importe).limit(1)

      // Periodo al que paga el depósito: lo dice el agente (periodo_mes/anio) o se
      // deduce del concepto de la ficha ("RENTA SEP 2026 L08"). Si se conoce, el pago
      // va a ESE cargo y no al más antiguo.
      const per = (Number(p.periodo_mes) && Number(p.periodo_anio))
        ? { mes: Number(p.periodo_mes), anio: Number(p.periodo_anio) }
        : periodoDeTexto([p.referencia, p.nota, p.concepto].filter(Boolean).join(' '))
      const usarPeriodo = per && !p.ignorar_periodo && !(Array.isArray(p.cargo_ids) && p.cargo_ids.length)

      const COLS = 'id, concepto, periodo_mes, periodo_anio, importe, saldo, fecha_vencimiento, estado'
      let cargos, otrosPendientes = []
      if (usarPeriodo) {
        const { data: delPeriodo, error: eP } = await db.from('prp_cartera').select(COLS)
          .eq('contrato_id', c.id).eq('periodo_mes', per.mes).eq('periodo_anio', per.anio).neq('estado', 'CANCELADO')
        if (eP) return { error: eP.message }
        const etiquetaPer = `${String(per.mes).padStart(2, '0')}/${per.anio}`
        if (!delPeriodo?.length) return { error: `El contrato ${c.folio} no tiene cargo del periodo ${etiquetaPer} que menciona la ficha. NO propongas: dile al usuario que no existe ese cargo y pregunta a qué periodo aplicarlo (o reintenta con ignorar_periodo=true si te pide aplicarlo al más antiguo).` }
        const pendientesPer = delPeriodo.filter(x => Number(x.saldo) > 0.01)
        if (!pendientesPer.length) {
          const { data: aps } = await db.from('aplicaciones_pago').select('ingreso_id, importe_aplicado').in('cargo_id', delPeriodo.map(x => x.id))
          const ids = [...new Set((aps || []).map(a => '#' + a.ingreso_id))].join(', ')
          return { error: `El periodo ${etiquetaPer} de ${c.folio} YA ESTÁ PAGADO${ids ? ` (ingreso ${ids})` : ''}. NO propongas: dile al usuario que este depósito podría ser un duplicado o un pago adelantado, y pregunta si lo registra como saldo a favor (reintenta con ignorar_periodo=true) o a otro periodo.` }
        }
        // Si el depósito dice RENTA, el cargo de renta va primero.
        cargos = pendientesPer.sort((a, b) => (b.concepto === 'RENTA') - (a.concepto === 'RENTA'))
        const { data: resto } = await db.from('prp_cartera').select(COLS)
          .eq('contrato_id', c.id).in('estado', ['PENDIENTE', 'PARCIAL']).gt('saldo', 0.01)
          .order('fecha_vencimiento', { ascending: true })
        otrosPendientes = (resto || []).filter(x => !cargos.some(y => y.id === x.id))
      } else {
        let q = db.from('prp_cartera').select(COLS)
          .eq('contrato_id', c.id).in('estado', ['PENDIENTE', 'PARCIAL']).gt('saldo', 0.01)
          .order('fecha_vencimiento', { ascending: true })
        if (Array.isArray(p.cargo_ids) && p.cargo_ids.length) q = q.in('id', p.cargo_ids)
        const { data, error: e2 } = await q
        if (e2) return { error: e2.message }
        cargos = data
      }

      // Varias fichas del mismo contrato en un turno: no repartir dos veces el mismo saldo.
      let resto = importe
      const distribucion = []
      for (const cg of cargos || []) {
        if (resto <= 0.009) break
        const libre = Math.round((Number(cg.saldo) - (ctx.reservado[cg.id] || 0)) * 100) / 100
        if (libre <= 0.009) continue
        const aplicar = Math.min(resto, libre)
        distribucion.push({ cargo_id: cg.id, etiqueta: `${cg.concepto} ${String(cg.periodo_mes || '').padStart(2, '0')}/${cg.periodo_anio || ''}`.trim(), saldo_antes: libre, aplicar: Math.round(aplicar * 100) / 100 })
        ctx.reservado[cg.id] = (ctx.reservado[cg.id] || 0) + aplicar
        resto = Math.round((resto - aplicar) * 100) / 100
      }
      const excedente = resto > 0.009 ? resto : 0

      const resumen = [
        ['Arrendatario', c.arrendatario_nombre],
        ['Local', `${c.locales_display} · ${c.folio}`],
        ['Depósito', `${mxn(importe)} · ${p.fecha} · ${forma}`],
        ['Referencia', ref || 'sin referencia'],
        ...distribucion.map(d => [d.etiqueta, d.aplicar >= d.saldo_antes - 0.01 ? `${mxn(d.aplicar)} (liquida)` : `${mxn(d.aplicar)} (PARCIAL, queda ${mxn(d.saldo_antes - d.aplicar)})`]),
      ]
      if (excedente) resumen.push(['Saldo a favor', `${mxn(excedente)} para el inquilino`])
      if (!distribucion.length) resumen.push(['Cargos', 'sin cargos pendientes: todo queda como saldo a favor'])

      const avisos = ['Queda POR_VALIDAR hasta conciliarlo con el banco; la factura sale hasta entonces.']
      if (mismo?.length) avisos.push(`Ojo: ya hay un ingreso de este contrato con la misma fecha e importe (#${mismo[0].id}). Verifica que no sea el mismo depósito.`)
      if (c.estatus !== 'VIGENTE') avisos.push(`El contrato está ${c.estatus}.`)
      if (otrosPendientes.length) {
        const lista = otrosPendientes.map(x => `${x.concepto} ${String(x.periodo_mes || '').padStart(2, '0')}/${x.periodo_anio || ''} (${mxn(x.saldo)})`).join(', ')
        avisos.push(`Este pago se aplica al periodo que indica la ficha. Siguen pendientes: ${lista}.`)
      }

      return {
        params: {
          contrato_id: c.id, folio: c.folio, importe, fecha: p.fecha, forma_pago: forma, referencia: ref,
          banco: p.banco || null, ordenante: p.ordenante || null, nota: p.nota || null, ficha: p.ficha || null,
          distribucion: distribucion.map(({ cargo_id, aplicar }) => ({ cargo_id, aplicar })),
          // ingresos_tipo_check solo admite estos cuatro valores
          tipo: ['RENTA', 'SANCION', 'AGUA'].includes(distribucion[0] && cargos.find(x => x.id === distribucion[0].cargo_id)?.concepto)
            ? cargos.find(x => x.id === distribucion[0].cargo_id).concepto
            : (distribucion.length ? 'OTRO' : 'RENTA'),
          excedente,
        },
        titulo: `Aplicar pago de ${mxn(importe)} — ${c.arrendatario_nombre}`,
        confirmar: 'Aplicar pago',
        resumen,
        aviso: avisos.join(' '),
      }
    },
  },

  registrar_gasto: {
    descripcion: 'Registra un ticket/nota de compra como gasto operativo, con proveedor, partidas y foto (mismo resultado que el módulo Compras/Gastos → Nuevo ticket). Parámetros: ficha (id de la imagen adjunta, p. ej. "F1"; de ahí salen fecha, total, proveedor y todas las partidas: NO las copies), grupo_gasto (obligatorio; uno de: ' + GRUPOS_GASTO.join(' | ') + '), categoria_lineas (VENDING si son productos para reventa en las máquinas, OPERACION si son consumibles del inmueble, MANTENIMIENTO si son materiales de reparación), descripcion (resumen breve del gasto). Solo si el usuario corrige algo o no hay imagen: fecha, total, proveedor. Elige grupo_gasto y categoria_lineas leyendo los artículos del ticket, no el nombre del proveedor.',
    async preparar(db, p, ctx) {
      const d = ctx.fichas?.[p.ficha] || null
      if (p.ficha && !d) return { error: `No tengo los datos de la ficha ${p.ficha}. Pide al usuario que la adjunte de nuevo.` }
      if (d && d.tipo_documento === 'COMPROBANTE_PAGO') return { error: `La ficha ${p.ficha} es un comprobante de pago, no un ticket de compra.` }
      const t = d?.ticket || {}, pv = d?.proveedor || {}

      const fecha = p.fecha || t.fecha
      const total = Number(p.total ?? t.total)
      const nombre = String(p.proveedor || pv.nombre_comercial || pv.razon_social || '').trim()
      if (!fecha || !ISO.test(fecha)) return { error: 'No pude leer la fecha del ticket (YYYY-MM-DD). Pídesela al usuario.' }
      if (!(total > 0)) return { error: 'No pude leer el total del ticket. Pídeselo al usuario.' }
      if (!nombre) return { error: 'No pude leer el proveedor del ticket. Pídeselo al usuario.' }
      if (!GRUPOS_GASTO.includes(p.grupo_gasto)) return { error: `grupo_gasto debe ser uno de: ${GRUPOS_GASTO.join(', ')}.` }
      const cat = p.categoria_lineas ? String(p.categoria_lineas).toUpperCase() : null
      if (cat && !['VENDING', 'OPERACION', 'MANTENIMIENTO'].includes(cat)) return { error: 'categoria_lineas debe ser VENDING, OPERACION o MANTENIMIENTO.' }

      const lineas = (d?.lineas || []).map(l => ({
        codigo_proveedor: l.sku || null, descripcion: String(l.descripcion || '').trim(),
        cantidad: Number(l.cantidad) || 1, precio_unit: Number(l.precio_unit), categoria: cat,
      })).filter(l => l.descripcion && l.precio_unit >= 0)
      const suma = Math.round(lineas.reduce((s, l) => s + l.cantidad * l.precio_unit, 0) * 100) / 100

      // ¿Ya es proveedor del catálogo? Mismo criterio que TicketModal (RFC o nombre normalizado).
      const norm = s => (s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '')
      const { data: provs } = await db.from('cat_proveedores').select('id, nombre, rfc').eq('activo', true)
      const rfc = (pv.rfc || '').toUpperCase() || null
      const prov = (provs || []).find(x => (rfc && x.rfc && x.rfc.toUpperCase() === rfc) || norm(x.nombre) === norm(nombre)) || null

      const { data: dup } = await db.from('gastos_operativos').select('id').eq('fecha', fecha).eq('ticket_total', total)
        .ilike('proveedor', `%${nombre.replace(/[%,()]/g, ' ').split(/\s+/)[0]}%`).limit(1)

      const avisos = []
      if (lineas.length && Math.abs(suma - total) > 0.02) avisos.push(`Las partidas suman ${mxn(suma)} y el ticket dice ${mxn(total)}; revisa el ticket.`)
      if (dup?.length) avisos.push('Ya hay un gasto del mismo proveedor, fecha y total (posible duplicado); confirma que es otro ticket.')
      if (cat === 'VENDING') avisos.push('Las partidas de vending se cargan a la semana de vending abierta solo si el producto ya existe en el catálogo de vending.')
      if (!d) avisos.push('Sin imagen: no se guardará foto del ticket.')

      const muestra = lineas.slice(0, 4).map(l => `${l.descripcion}${l.cantidad !== 1 ? ` ×${l.cantidad}` : ''}`).join(', ')
      return {
        params: {
          ficha: p.ficha || null, fecha, total, folio: t.folio || null,
          proveedor: { id: prov?.id || null, nombre: prov?.nombre || nombre, rfc, razon_social: pv.razon_social || null },
          grupo_gasto: p.grupo_gasto, descripcion: p.descripcion || null, categoria_lineas: cat, lineas,
        },
        titulo: `Registrar ticket de ${prov?.nombre || nombre} — ${mxn(total)}`,
        confirmar: 'Registrar gasto',
        resumen: [
          ['Proveedor', prov ? prov.nombre : `${nombre} (se dará de alta)`],
          ['Fecha', fecha + (t.folio ? ` · folio ${t.folio}` : '')],
          ['Total', mxn(total)],
          ['Grupo', p.grupo_gasto + (cat ? ` · líneas ${cat}` : '')],
          ['Artículos', lineas.length ? `${lineas.length}: ${muestra}${lineas.length > 4 ? ` y ${lineas.length - 4} más` : ''}` : 'sin partidas'],
        ],
        aviso: avisos.join(' ') || undefined,
      }
    },
  },

  alta_empleado: {
    descripcion: 'Da de alta un empleado en RH a partir de su INE y comprobante de domicilio adjuntos (mismo resultado que RH → Nuevo empleado + Expediente): nombre, CURP, sexo, nacimiento y domicilio salen de las fichas y los documentos se archivan en su expediente. Parámetros: ficha_ine (id de la ficha INE frente, obligatorio), ficha_ine_reverso, ficha_domicilio (ids opcionales), salario_diario (obligatorio; pregúntalo si el usuario no lo dio), puesto, area, departamento, fecha_ingreso (YYYY-MM-DD, por omisión hoy), tipo_contrato (TEMPORAL_3SEM | TEMPORAL_30D | PRUEBA_90 | INDEFINIDO; por omisión TEMPORAL_3SEM), fecha_fin_contrato, horario_trabajo, dia_descanso, forma_pago (TRANSFERENCIA|EFECTIVO|MIXTO), celular, email, rfc, nss. Solo si el usuario corrige el nombre: nombre, apellido_pat, apellido_mat.',
    async preparar(db, p, ctx) {
      const ine = ctx.fichas?.[p.ficha_ine]?.identidad
      const rev = ctx.fichas?.[p.ficha_ine_reverso]?.identidad
      const dom = ctx.fichas?.[p.ficha_domicilio]?.identidad
      if (!ine && !(p.nombre && p.apellido_pat)) return { error: 'Falta la ficha de la INE (frente). Pide al usuario que la adjunte.' }
      if (ctx.fichas?.[p.ficha_ine] && ctx.fichas[p.ficha_ine].tipo_documento !== 'INE_FRENTE') return { error: `La ficha ${p.ficha_ine} no es el frente de una INE.` }
      const salario = Number(p.salario_diario)
      if (!(salario > 0)) return { error: 'Falta el salario diario. Pregúntaselo al usuario (y de paso puesto y tipo de contrato si no los dio).' }

      const nombreLegal = separarNombre(ine?.nombre_completo)
      const nombre = String(p.nombre || nombreLegal.nombre || '').trim()
      const apellido_pat = String(p.apellido_pat || nombreLegal.pat || '').trim()
      const apellido_mat = String(p.apellido_mat ?? nombreLegal.mat ?? '').trim()
      if (!nombre || !apellido_pat) return { error: 'No pude separar nombre y apellidos de la INE. Pídeselos al usuario.' }

      const curp = String(ine?.curp || rev?.curp || '').toUpperCase().trim() || null
      const dir = domicilioDe(dom, ine)
      const fechaIng = p.fecha_ingreso && ISO.test(p.fecha_ingreso) ? p.fecha_ingreso : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
      const tipoContrato = ['TEMPORAL_3SEM', 'TEMPORAL_30D', 'PRUEBA_90', 'INDEFINIDO'].includes(p.tipo_contrato) ? p.tipo_contrato : 'TEMPORAL_3SEM'
      let fin = p.fecha_fin_contrato && ISO.test(p.fecha_fin_contrato) ? p.fecha_fin_contrato : null
      if (!fin && tipoContrato === 'TEMPORAL_3SEM') fin = sumarDias(fechaIng, 21)
      if (!fin && tipoContrato === 'TEMPORAL_30D') fin = sumarDias(fechaIng, 30)
      if (!fin && tipoContrato === 'PRUEBA_90') fin = sumarDias(fechaIng, 90)

      const avisos = []
      if (curp && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp)) avisos.push(`La CURP ${curp} no tiene formato válido: pudo leerse mal, revísala.`)
      if (curp) {
        const { data: ya } = await db.from('rh_empleados').select('id, numero_empleado, nombre, apellido_pat').eq('curp', curp).limit(1)
        if (ya?.length) return { error: `Ya existe un empleado con esa CURP: ${ya[0].nombre} ${ya[0].apellido_pat} (${ya[0].numero_empleado || ya[0].id}). No se duplicó.` }
      }
      const { data: homo } = await db.from('rh_empleados').select('numero_empleado, nombre, apellido_pat, apellido_mat').ilike('nombre', nombre).ilike('apellido_pat', apellido_pat).limit(1)
      if (homo?.length) avisos.push(`Ya hay un empleado con el mismo nombre (${homo[0].numero_empleado || 's/n'}); confirma que no es el mismo.`)
      if (!dom) avisos.push('Sin comprobante de domicilio: se usa el domicilio de la INE.')
      if (String(p.nombre || '') === '' && (ine?.nombre_completo || '').trim().split(/\s+/).length > 4) avisos.push('El nombre tiene varias partes: revisa cómo quedaron apellidos y nombres.')

      const vence = ine?.vigencia && /^\d{4}$/.test(String(ine.vigencia)) ? `${ine.vigencia}-12-31` : null
      return {
        params: {
          nombre, apellido_pat, apellido_mat, sexo: ine?.sexo === 'H' ? 'M' : ine?.sexo === 'M' ? 'F' : (p.sexo || 'M'),
          curp, fecha_nacimiento: ine?.fecha_nacimiento || null, rfc: p.rfc || null, nss: p.nss || null,
          fecha_ingreso: fechaIng, puesto: p.puesto || null, area: p.area || null, departamento: p.departamento || null,
          salario_diario: salario, email: p.email || null, celular: p.celular || null,
          tipo_contrato: tipoContrato, fecha_fin_contrato: fin, horario_trabajo: p.horario_trabajo || null,
          dia_descanso: p.dia_descanso || null, forma_pago: p.forma_pago || 'TRANSFERENCIA',
          domicilio: dir.campos, ine_vence: vence,
          fichas: { ine: p.ficha_ine || null, ine_reverso: p.ficha_ine_reverso || null, domicilio: p.ficha_domicilio || null },
        },
        titulo: `Alta de empleado — ${nombre} ${apellido_pat}`,
        confirmar: 'Dar de alta',
        resumen: [
          ['Nombre', `${nombre} · ${apellido_pat} · ${apellido_mat || '—'}`],
          ['CURP', curp || 'no legible'],
          ['Nacimiento', ine?.fecha_nacimiento || '—'],
          ['Domicilio', dir.texto || '—'],
          ['Puesto', [p.puesto, p.area, p.departamento].filter(Boolean).join(' · ') || '—'],
          ['Ingreso', `${fechaIng} · ${mxn(salario)} diarios`],
          ['Contrato', `${tipoContrato}${fin ? ` hasta ${fin}` : ''}`],
          ['Documentos', [p.ficha_ine && 'INE', p.ficha_ine_reverso && 'INE reverso', p.ficha_domicilio && 'comprobante de domicilio'].filter(Boolean).join(', ') || 'ninguno'],
        ],
        aviso: avisos.join(' ') || undefined,
      }
    },
  },

  alta_arrendatario: {
    descripcion: 'Da de alta un arrendatario (persona física) a partir de su INE y comprobante de domicilio adjuntos: nombre y domicilio salen de las fichas y los documentos quedan en su expediente. Parámetros: ficha_ine (obligatorio), ficha_ine_reverso, ficha_domicilio (opcionales), nombre_negocio, rfc, telefono, email. No crea contrato: eso se hace después con NuevoContrato. Solo si el usuario corrige el nombre: locatario.',
    async preparar(db, p, ctx) {
      const ine = ctx.fichas?.[p.ficha_ine]?.identidad
      const dom = ctx.fichas?.[p.ficha_domicilio]?.identidad
      if (!ine && !p.locatario) return { error: 'Falta la ficha de la INE (frente). Pide al usuario que la adjunte.' }
      if (ctx.fichas?.[p.ficha_ine] && ctx.fichas[p.ficha_ine].tipo_documento !== 'INE_FRENTE') return { error: `La ficha ${p.ficha_ine} no es el frente de una INE.` }

      const n = separarNombre(ine?.nombre_completo)
      const locatario = String(p.locatario || [n.nombre, n.pat, n.mat].filter(Boolean).join(' ')).trim().replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
      if (!locatario) return { error: 'No pude leer el nombre de la INE. Pídeselo al usuario.' }
      const dir = domicilioDe(dom, ine)
      const rfc = p.rfc ? String(p.rfc).trim().toUpperCase() : null

      const avisos = []
      if (rfc) {
        const { data: ya } = await db.from('arrendatarios').select('id, locatario').eq('rfc', rfc).limit(1)
        if (ya?.length) return { error: `Ya existe un arrendatario con el RFC ${rfc}: ${ya[0].locatario}. No se duplicó.` }
      }
      const norm = s => (s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '')
      const { data: nombres } = await db.from('arrendatarios').select('id, locatario')
      const parecido = (nombres || []).find(x => norm(x.locatario) === norm(locatario))
      if (parecido) return { error: `Ya existe un arrendatario con ese nombre: ${parecido.locatario}. Si es el mismo, úsalo en el contrato; no se duplicó.` }
      if (!dom) avisos.push('Sin comprobante de domicilio: se usa el domicilio de la INE.')
      if (!rfc) avisos.push('Sin RFC: agrégalo antes de facturar.')
      if (ctx.fichas?.[p.ficha_domicilio] && dom?.nombre_titular && norm(dom.nombre_titular) !== norm(ine?.nombre_completo) && !norm(ine?.nombre_completo || '').includes(norm(dom.nombre_titular).slice(0, 8)))
        avisos.push(`El comprobante de domicilio está a nombre de "${dom.nombre_titular}", distinto al de la INE.`)

      return {
        params: {
          locatario, nombre_negocio: p.nombre_negocio || null, rfc, tipo_persona: 'FISICA',
          telefono: p.telefono || null, email: p.email ? String(p.email).toLowerCase() : null, domicilio: dir.texto || null,
          fichas: { ine: p.ficha_ine || null, ine_reverso: p.ficha_ine_reverso || null, domicilio: p.ficha_domicilio || null },
        },
        titulo: `Alta de arrendatario — ${locatario}`,
        confirmar: 'Dar de alta',
        resumen: [
          ['Nombre', locatario],
          ['Negocio', p.nombre_negocio || '—'],
          ['RFC', rfc || '—'],
          ['Contacto', [p.telefono, p.email].filter(Boolean).join(' · ') || '—'],
          ['Domicilio', dir.texto || '—'],
          ['Documentos', [p.ficha_ine && 'INE', p.ficha_ine_reverso && 'INE reverso', p.ficha_domicilio && 'comprobante de domicilio'].filter(Boolean).join(', ') || 'ninguno'],
        ],
        aviso: avisos.join(' ') || undefined,
      }
    },
  },
}

// ─── Utilidades de identidad ────────────────────────────────────────────────
// La INE trae "APELLIDO_PATERNO APELLIDO_MATERNO NOMBRE(S)". Las partículas
// (DE, DEL, LA, LOS…) pertenecen al apellido que las sigue.
const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'MC', 'MAC', 'VAN', 'VON', 'SAN', 'SANTA'])
function separarNombre(completo) {
  const t = String(completo || '').trim().split(/\s+/).filter(Boolean)
  if (!t.length) return {}
  const tomarApellido = () => {
    const partes = []
    while (t.length > 1 && PARTICULAS.has(t[0].toUpperCase())) partes.push(t.shift())
    if (t.length) partes.push(t.shift())
    return partes.join(' ')
  }
  const cap = s => s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
  if (t.length === 1) return { nombre: cap(t[0]) }
  const pat = tomarApellido()
  if (t.length === 1) return { pat: cap(pat), nombre: cap(t[0]) }   // solo un apellido
  const mat = tomarApellido()
  return { pat: cap(pat), mat: cap(mat), nombre: cap(t.join(' ')) }
}

// Domicilio: el comprobante manda; si no hay, el de la INE.
function domicilioDe(dom, ine) {
  const c = dom
    ? { calle: dom.calle, numero_ext: dom.no_ext, numero_int: dom.no_int, colonia: dom.colonia, municipio: dom.municipio, estado_domicilio: dom.estado, codigo_postal: dom.cp }
    : { calle: ine?.calle, numero_ext: ine?.no_ext, numero_int: ine?.no_int, colonia: ine?.colonia_ine, municipio: ine?.municipio_ine, estado_domicilio: ine?.estado_ine, codigo_postal: ine?.cp_ine }
  const campos = Object.fromEntries(Object.entries(c).filter(([, v]) => v != null && String(v).trim() !== ''))
  const texto = [
    campos.calle && `${campos.calle}${campos.numero_ext ? ' ' + campos.numero_ext : ''}${campos.numero_int ? ' int. ' + campos.numero_int : ''}`,
    campos.colonia && `Col. ${campos.colonia}`, campos.codigo_postal && `C.P. ${campos.codigo_postal}`, campos.municipio, campos.estado_domicilio,
  ].filter(Boolean).join(', ')
  return { campos, texto }
}

const TOOLS = [{
  name: 'consultar_datos',
  description: `Consulta de solo lectura a una vista del sistema IRP. Devuelve las filas (máximo ${MAX_FILAS}) y el conteo total que cumple los filtros. Úsala siempre que la pregunta sea sobre datos concretos del negocio (contratos, arrendatarios, cobranza, ingresos, gastos, locales, empleados, prospectos…). Puedes llamarla varias veces para cruzar información.`,
  input_schema: {
    type: 'object',
    properties: {
      vista:  { type: 'string', enum: Object.keys(VISTAS), description: 'Vista a consultar' },
      texto:  { type: 'string', description: 'Búsqueda libre (parcial, sin distinguir mayúsculas) sobre las columnas de nombre/folio/descripción de la vista. Usa una palabra clave, p. ej. "vorwerk" en vez del nombre completo.' },
      filtros: {
        type: 'array',
        description: 'Filtros exactos por columna',
        items: {
          type: 'object',
          properties: {
            columna: { type: 'string' },
            op:      { type: 'string', enum: OPS },
            valor:   { type: ['string', 'number', 'boolean', 'null'] },
          },
          required: ['columna', 'op', 'valor'],
        },
      },
      columnas: { type: 'string', description: 'Columnas a devolver separadas por coma. Por omisión todas.' },
      orden:    { type: 'string', description: 'Columna para ordenar' },
      descendente: { type: 'boolean' },
      limite:   { type: 'integer', minimum: 1, maximum: MAX_FILAS },
    },
    required: ['vista'],
  },
}, {
  name: 'proponer_accion',
  description: 'Propone una operación que MODIFICA datos del sistema. NO la ejecuta: el usuario ve una tarjeta con el resumen y decide con Confirmar/Cancelar. Consulta primero (consultar_datos) para obtener el id del registro. Los parámetros que no envíes se toman del registro actual, así que propón de inmediato con lo que el usuario ya dijo en vez de interrogarlo campo por campo. Acciones: ' +
    Object.entries(ACCIONES).map(([k, a]) => `${k} — ${a.descripcion}`).join(' | '),
  input_schema: {
    type: 'object',
    properties: {
      accion:     { type: 'string', enum: Object.keys(ACCIONES) },
      parametros: { type: 'object', description: 'Parámetros de la acción (ver descripción de cada acción)' },
    },
    required: ['accion', 'parametros'],
  },
}]

const COL = /^[a-z_][a-z0-9_]*$/

async function consultar(db, input) {
  const def = VISTAS[input.vista]
  if (!def) return { error: `Vista no permitida: ${input.vista}` }
  const columnas = (input.columnas || '*').split(',').map(s => s.trim()).filter(Boolean)
  if (columnas.some(c => c !== '*' && !COL.test(c))) return { error: 'Nombre de columna inválido' }

  let q = db.from(input.vista).select(columnas.join(','), { count: 'exact' })
  if (input.texto && def.buscar.length) {
    const t = String(input.texto).replace(/[%,()]/g, ' ').trim()
    if (t) q = q.or(def.buscar.map(c => `${c}.ilike.%${t}%`).join(','))
  }
  for (const f of input.filtros || []) {
    if (!COL.test(f.columna || '') || !OPS.includes(f.op)) return { error: `Filtro inválido: ${JSON.stringify(f)}` }
    const v = f.op === 'ilike' ? `%${String(f.valor).replace(/[%,()]/g, ' ')}%` : f.valor
    q = q[f.op](f.columna, v)
  }
  if (input.orden && COL.test(input.orden)) q = q.order(input.orden, { ascending: !input.descendente })
  q = q.limit(Math.min(MAX_FILAS, input.limite || MAX_FILAS))

  const { data, error, count } = await q
  if (error) return { error: error.message }
  return { total: count, mostradas: data.length, filas: data }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Metodo no permitido' }) }

  try {
    const { messages = [], context = '', fichas = {} } = JSON.parse(event.body || '{}')

    // Sesión del usuario: sin JWT no hay datos (pero sí conversación general).
    const auth = event.headers.authorization || event.headers.Authorization || ''
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null
    // realtime.transport: sin esto, supabase-js truena al crear el cliente en el
    // runtime de Netlify Functions (Node 20 sin WebSocket nativo expuesto).
    const db = (jwt && ANON_KEY)
      ? createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false }, realtime: { transport: ws } })
      : null

    // Solo el personal puede proponer escrituras (un locatario solo consulta lo suyo).
    let puedeEscribir = false
    if (db) { const { data } = await db.rpc('es_staff'); puedeEscribir = data === true }
    const herramientas = puedeEscribir ? TOOLS : TOOLS.filter(t => t.name === 'consultar_datos')

    const hoy = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'long', day: 'numeric' })

    const catalogo = Object.entries(VISTAS).map(([v, d]) => `- ${v}: ${d.columnas}`).join('\n')

    const systemPrompt = `Eres el Agente Operativo de IRP (IWOL Resource Planning), la plataforma de RANNIX Consulting para la administración de inmuebles comerciales en México. Hoy es ${hoy}.

${db
  ? `TIENES ACCESO DIRECTO A LOS DATOS REALES del sistema mediante la herramienta consultar_datos. Cuando el usuario pregunte por cifras, contratos, arrendatarios, locales, cobranza, ingresos, gastos, empleados o prospectos, CONSULTA los datos antes de responder; nunca digas que no tienes acceso ni pidas que revise la pantalla. Si una búsqueda no da resultados, intenta con otra palabra clave más corta (p. ej. solo el apellido o la primera palabra de la razón social) antes de concluir que no existe.`
  : `En esta sesión no hay usuario autenticado, así que no puedes consultar datos; responde con orientación general.`}

Vistas disponibles y sus columnas:
${catalogo}

Notas sobre los datos:
- Un arrendatario puede tener varios contratos (renovaciones: el anterior queda RENOVADO y el nuevo VIGENTE con contrato_anterior_id).
- estatus es la vigencia legal; estatus_proceso es la etapa operativa. En /contratos solo se listan EN_EJECUCION; los EN_RENOVACION viven en /renovaciones.
- dias_restantes negativo = vencido. Montos en pesos mexicanos.
- prp_cartera es la cobranza real (estado PENDIENTE/PAGADO/VENCIDO, saldo).

${db && puedeEscribir ? `Operaciones que modifican datos (herramienta proponer_accion):
- Hoy disponibles: ${Object.keys(ACCIONES).join(', ')}.
- Imágenes adjuntas: llegan ya leídas como "[Ficha F1 adjunta: COMPROBANTE DE PAGO — …]" o "[Ficha F2 adjunta: TICKET DE COMPRA — …]". El tipo lo dice la ficha; no lo adivines por el nombre del proveedor. Con varias fichas, una llamada a proponer_accion por ficha en el mismo turno.
  · COMPROBANTE DE PAGO → aplicar_pago: ubica el contrato por el número de local que traiga (concepto/referencia) con consultar_datos en prp_contratos (VIGENTE) y contrasta el ordenante con el arrendatario; llama con contrato_id y ficha (el sistema toma importe, fecha y referencia de la ficha; no los copies). Si no hay local legible, hay más de un contrato posible o el ordenante no coincide, NO propongas: pregunta.
  · TICKET DE COMPRA → registrar_gasto: llama con ficha, grupo_gasto, categoria_lineas y una descripcion breve, decididos según LOS ARTÍCULOS (p. ej. refrescos y botanas para máquinas = 'Vending / Reabasto' + VENDING; jabón, cloro y escobas = 'Limpieza e higiene' + OPERACION; cemento o tornillos = 'Ferretería y materiales' + MANTENIMIENTO). Si los artículos mezclan grupos o no puedes decidir, pregunta en una línea. Nunca llames a un ticket "papelería" o "ferretería" por el nombre de la tienda.
  · INE (frente/reverso) y COMPROBANTE DE DOMICILIO → altas. Si el usuario quiere dar de alta a un EMPLEADO (RH) usa alta_empleado; si es un ARRENDATARIO/inquilino/locatario usa alta_arrendatario. Si no dice cuál de los dos, pregúntalo en una línea. Pasa ficha_ine, ficha_ine_reverso y ficha_domicilio con los ids de las fichas; nombre, CURP, nacimiento, sexo y domicilio salen de las fichas (no los copies). Para empleado necesitas además el salario diario (pídelo si falta, junto con puesto y tipo de contrato en la misma pregunta). Para arrendatario pide RFC, teléfono y correo solo si el usuario no los dio, pero no bloquees el alta por eso. El alta de arrendatario no crea contrato; ofrécelo como siguiente paso.
  · Si la ficha dice que no se pudo leer o no es reconocida, pide al usuario los datos o que la retome.
- Reglas de aplicación (ya las hace el sistema): si el concepto de la ficha nombra un periodo ("RENTA SEP 2026"), el pago cubre el cargo de ESE periodo (pasa periodo_mes y periodo_anio) y los demás atrasos solo se avisan; si el periodo ya está pagado o no existe, la herramienta te devuelve un error: explícale al usuario con esos datos (no adivines causas ni inventes fechas de generación o vencimiento) y pregunta qué hacer. Sin periodo en la ficha, cubre el cargo pendiente más antiguo. Si no alcanza queda PARCIAL; el excedente es saldo a favor del inquilino; el depósito queda POR_VALIDAR hasta la conciliación bancaria. Si la propuesta falla por referencia duplicada, díselo al usuario. Para cualquier otra modificación (cobros, gastos, altas, cambios de datos) di con franqueza que todavía no puedes hacerla desde el chat e indica el módulo donde se hace.
- NUNCA ejecutas nada tú: proponer_accion solo muestra una tarjeta y el usuario confirma con un botón. Jamás afirmes que algo "ya quedó registrado" hasta que el usuario te lo confirme en un mensaje de sistema.
- No hagas cuestionarios. Consulta el registro, arma la propuesta con lo que el usuario ya dijo y los valores actuales como defecto, y deja que la tarjeta muestre el detalle. Pregunta solo si falta algo que no puedas deducir o si la solicitud es ambigua (varios contratos posibles).
- Si el usuario cambia un dato después de ver la tarjeta, vuelve a llamar proponer_accion con el valor corregido.
- Si un mensaje empieza con "[Sistema]" es el resultado real de una acción confirmada o cancelada por el usuario: repórtalo tal cual, sin inventar detalles.

` : ''}Estilo de respuesta:
- Español, directo y breve. Primero el dato, luego el detalle relevante (folios, locales, fechas, montos).
- Texto plano con saltos de línea y viñetas con "•". Sin encabezados markdown, sin tablas, sin emojis.
- Si ves algo accionable (contrato vencido, saldo en mora, renovación pendiente), menciónalo en una línea.
- Cuando aplique, cita normativa SAT, IMSS, LFT o LFPDPPP.
${context ? `\nContexto de la pantalla actual: ${context}` : ''}`

    const conv = messages.map(m => ({ role: m.role, content: m.content }))
    let respuesta = ''
    const propuestas = []
    const ctx = {
      reservado: {},   // saldo ya asignado por propuestas de este turno
      // datos leídos por OCR de las imágenes adjuntas (sin imagen); tope de tamaño por si acaso
      fichas: JSON.stringify(fichas).length < 400000 ? fichas : {},
    }

    for (let vuelta = 0; vuelta <= MAX_VUELTAS; vuelta++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: systemPrompt,
          tools: db ? herramientas : undefined,
          messages: conv,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error?.message || 'Error en Claude API')

      const usos = data.content.filter(b => b.type === 'tool_use')
      const texto = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')

      if (data.stop_reason !== 'tool_use' || !usos.length || !db) {
        respuesta = texto
        break
      }

      conv.push({ role: 'assistant', content: data.content })
      const resultados = []
      for (const u of usos) {
        let out
        try {
          if (u.name === 'proponer_accion') {
            const def = ACCIONES[u.input.accion]
            const prep = def ? await def.preparar(db, u.input.parametros || {}, ctx) : { error: 'Acción no disponible.' }
            if (prep.error) out = { error: prep.error }
            else {
              propuestas.push({ id: u.id, accion: u.input.accion, ...prep })
              out = { estado: 'PENDIENTE_DE_CONFIRMACION', nota: 'Aún NO se ejecuta. El usuario verá una tarjeta con el resumen y los botones Confirmar/Cancelar. Responde en 1-2 líneas qué propones y que espere su confirmación; no repitas el resumen completo.' }
            }
          } else out = await consultar(db, u.input)
        } catch (e) { out = { error: e.message } }
        console.log('[chat-operativo]', u.name, JSON.stringify(u.input), '→', out.error || out.estado || `${out.total} filas`)
        resultados.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) })
      }
      conv.push({ role: 'user', content: resultados })

      if (vuelta === MAX_VUELTAS) respuesta = texto || 'No pude completar la consulta; intenta con una pregunta más específica.'
    }

    return { statusCode: 200, headers, body: JSON.stringify({ content: respuesta, propuestas }) }
  } catch (error) {
    console.error('chat-operativo error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del Agente Operativo', detail: error.message }),
    }
  }
}

// Solo para scripts/test-agente.mjs
exports.ACCIONES = ACCIONES
exports.periodoDeTexto = periodoDeTexto
