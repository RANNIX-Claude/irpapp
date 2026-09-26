/**
 * Archivo del reloj checador: lectura, reconocimiento de empleados y decisión de
 * ENTRADA / SALIDA. Código puro (sin navegador ni Supabase) porque lo comparten:
 *   · ImportChecadorModal.jsx (RH → Importar desde checador),
 *   · el navegador, al adjuntar el archivo al chat del Agente Operativo,
 *   · chat-operativo.js (servidor), que arma la vista previa y las filas de rh_checadas.
 *
 * Cada renglón del checador es un MARCAJE, no un día: se guardan todos en rh_checadas y el
 * estado del día (presente, retardo, falta) lo consolida un trigger de la base.
 */

// ── Lectura del archivo ─────────────────────────────────────────────────────
const esHora = v => /^\d{1,2}:\d{2}/.test((v || '').trim())
const hhmm = v => { const [h, m] = v.trim().split(':'); return `${h.padStart(2, '0')}:${m.slice(0, 2)}` }

// Reloj checador crudo ("ID. Nombre Depart. Tiempo IDdispositivo"): fecha y hora vienen JUNTAS en
// una columna y NO trae si es entrada o salida.
const RE_FECHA_HORA_JUNTAS = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2})$/
// Variante sin ningún separador real de columna (texto pegado que perdió los tabs).
const RE_MARCAJE_SIN_COLUMNAS = /^(\d+)\s+(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2})\s+\d+\s*$/

/**
 * @returns {{numero:string, nombre:string, fecha:string, hora:string, operacion:'ENTRADA'|'SALIDA', inferida?:boolean}[]}
 * `inferida: true` = el archivo no decía si era entrada o salida y la operación es PROVISIONAL
 * (alternada por orden). Esa alternancia se rompe con un solo marcaje faltante y voltea todo lo
 * que sigue, así que `resolverMarcajes` la rehace con el horario y el rol de guardia.
 */
export function parsearChecador(texto) {
  const lineas = String(texto || '').trim().split('\n').filter(l => l.trim())
  const eventos = []
  const sinEstatus = []

  lineas.forEach(linea => {
    const cols = linea.split(/[,\t;]/).map(c => c.trim().replace(/"/g, ''))

    if (cols.length >= 2) {
      const idxFechaHora = cols.findIndex(c => RE_FECHA_HORA_JUNTAS.test(c))
      if (idxFechaHora >= 0 && !isNaN(parseInt(cols[0]))) {
        const [, fecha, hora] = cols[idxFechaHora].match(RE_FECHA_HORA_JUNTAS)
        const nombre = (cols[1] || '').trim().split(/\s+/)[0]
        if (nombre) sinEstatus.push({ numero: cols[0].trim(), nombre, fecha, hora: hhmm(hora) })
        return
      }
    }

    if (cols.length < 4) {
      const m = linea.trim().match(RE_MARCAJE_SIN_COLUMNAS)
      if (m) {
        const [, numero, nombreDepto, fecha, hora] = m
        sinEstatus.push({ numero, nombre: nombreDepto.trim().split(/\s+/)[0], fecha, hora: hhmm(hora) })
      }
      return
    }
    const [col0, col1, col2, col3, col4] = cols

    // Encabezado
    if (isNaN(parseInt(col0)) && !col0.toLowerCase().includes('e0')) return

    const numero = col0.toString().trim()
    const nombre = col1 || ''
    const fecha = (col2 || '').replace(/\//g, '-')
    if (!fecha || !esHora(col3)) return

    // Formato de dos horarios: EmpCode,Nombre,Fecha,HoraEntrada,HoraSalida
    if (esHora(col4)) {
      eventos.push({ numero, nombre, fecha, hora: hhmm(col3), operacion: 'ENTRADA' })
      eventos.push({ numero, nombre, fecha, hora: hhmm(col4), operacion: 'SALIDA' })
      return
    }
    // Formato de marcaje: No,Nombre,Fecha,Hora,Status (0=entrada, 1=salida)
    const st = (col4 || '').trim().toLowerCase()
    const operacion = ['1', 'out', 'salida', 'check out', 'o', 's'].includes(st) ? 'SALIDA' : 'ENTRADA'
    eventos.push({ numero, nombre, fecha, hora: hhmm(col3), operacion })
  })

  // Sin estatus: provisional, alternando por empleado en orden cronológico completo.
  const porEmpleado = {}
  sinEstatus.forEach(ev => { (porEmpleado[ev.numero] ||= []).push(ev) })
  Object.values(porEmpleado).forEach(grupo => {
    grupo.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    grupo.forEach((ev, i) => eventos.push({ ...ev, operacion: i % 2 === 0 ? 'ENTRADA' : 'SALIDA', inferida: true }))
  })
  return eventos
}

// ── Utilidades ──────────────────────────────────────────────────────────────
export const normChecador = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const soloDigitos = s => { const d = String(s || '').replace(/\D/g, ''); return d ? d.replace(/^0+/, '') || '0' : '' }
const aMin = hhmmss => { const [h, m] = String(hhmmss).split(':'); return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0) }
const diaSemana = fecha => new Date(fecha + 'T12:00:00').getDay()            // 0 = domingo
const diaAnterior = fecha => { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) }
const enDias = fecha => Math.round(Date.parse(fecha + 'T12:00:00') / 86400000)

// ── Horario programado ──────────────────────────────────────────────────────
const DIAS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 }

/**
 * Lee el horario del texto libre de rh_empleados.horario_trabajo, p. ej.
 *   "Lunes a Sábado 8-16 horas"                       → 08:00–16:00
 *   "Lunes a Viernes 9-17 hrs / Domingo 9-14 horas"   → según el día de la fecha
 *   "Lunes-Viernes 10-6"                              → 10:00–18:00 (6 = 6 pm)
 *   "Lunes a Domingo 14:30-21:30 hrs"                 → 14:30–21:30
 * Devuelve minutos {entrada, salida} o null si no encuentra un rango de horas.
 */
export function horarioDelDia(texto, fecha) {
  if (!texto) return null
  const segmentos = String(texto).split(/[\/;]/)
  const leidos = []
  for (const seg of segmentos) {
    const t = normChecador(seg).toLowerCase()
    const h = t.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|A)\s*(\d{1,2})(?::(\d{2}))?(?!\d)/i)
    if (!h) continue
    const entrada = parseInt(h[1], 10) * 60 + (parseInt(h[2] || '0', 10))
    let salida = parseInt(h[3], 10) * 60 + (parseInt(h[4] || '0', 10))
    if (salida <= entrada) salida += 12 * 60                                  // "10-6" = 10:00 a 18:00
    // ¿a qué días aplica el segmento?
    const dias = new Set()
    const rango = t.match(/(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\s*(?:a|al|-|hasta)\s*(domingo|lunes|martes|miercoles|jueves|viernes|sabado)/)
    if (rango) { let d = DIAS[rango[1]]; const fin = DIAS[rango[2]]; for (let i = 0; i < 8; i++) { dias.add(d); if (d === fin) break; d = (d + 1) % 7 } }
    else for (const [n, v] of Object.entries(DIAS)) if (t.includes(n)) dias.add(v)
    leidos.push({ entrada, salida, dias: dias.size ? dias : new Set([0, 1, 2, 3, 4, 5, 6]) })
  }
  if (!leidos.length) return null
  const dow = fecha ? diaSemana(fecha) : null
  return leidos.find(l => dow != null && l.dias.has(dow)) || leidos[0]
}

// Cuántos días más allá del último rol de guardia capturado se sigue alternando a los veladores.
const HORIZONTE_ROL_DIAS = 14

// ── ENTRADA / SALIDA ────────────────────────────────────────────────────────
/**
 * Decide si cada marcaje sin etiqueta es ENTRADA o SALIDA. NO alterna por orden a través de los
 * días: un marcaje faltante voltearía todo lo que sigue. Se decide por día y con el horario:
 *  · Horario diurno: dentro de cada día el primer marcaje es ENTRADA y el último SALIDA. Un día
 *    con un solo marcaje se decide por cercanía a la hora de entrada o de salida programadas.
 *  · Guardia de 24 h (cruza medianoche): con el rol de guardia (rh_turnos_guardia). Quien tiene la
 *    guardia hoy y no ayer ENTRA hoy; quien la tuvo ayer y no hoy SALE hoy. Si el rol no llega a
 *    esa fecha se extiende alternando a los guardias día con día.
 * Solo toca marcajes con `inferida: true`; los que el archivo sí etiquetó se respetan.
 *
 * @param {object[]} eventos  marcajes de UNA persona [{fecha, hora, operacion, inferida}]
 * @param {{id:string, cruza_medianoche?:boolean, hora_entrada_prog?:string, hora_salida_prog?:string, horario_trabajo?:string}} emp
 * @param {Map<string,string>} rota  fecha → empleado_id que cubre esa guardia (puede ser parcial)
 * @param {string[]} guardias  ids de los empleados con turno de 24 h
 * @returns {object[]} los mismos marcajes con `operacion`, `metodo`, `dudoso` y `cambio`
 */
export function asignarOperaciones(eventos, emp, rota = new Map(), guardias = []) {
  const orden = [...eventos].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  const resultado = new Map()
  const fijar = (ev, operacion, metodo, dudoso = false) => resultado.set(ev, { ...ev, operacion, metodo, dudoso, cambio: ev.operacion !== operacion })

  // Los que el archivo sí etiquetó se respetan tal cual.
  for (const ev of orden) if (!ev.inferida) fijar(ev, ev.operacion, 'archivo')
  const libres = orden.filter(e => e.inferida)

  if (emp?.cruza_medianoche) {
    const guardiaDe = (fecha) => {
      if (rota.has(fecha)) return { id: rota.get(fecha), extrapolada: false }
      const conocidas = [...rota.keys()]
      if (!conocidas.length || guardias.length < 2) return null
      const cercana = conocidas.reduce((a, b) => Math.abs(enDias(b) - enDias(fecha)) < Math.abs(enDias(a) - enDias(fecha)) ? b : a)
      const dif = Math.abs(enDias(fecha) - enDias(cercana))
      // Alternar a los guardias solo se sostiene unos días (cambios de rol, faltas, vacaciones): más
      // allá del horizonte no se adivina y el marcaje queda como dudoso.
      if (dif > HORIZONTE_ROL_DIAS) return null
      const base = rota.get(cercana)
      return { id: dif % 2 === 0 ? base : guardias.find(g => g !== base), extrapolada: true }
    }
    const porDia = new Map()
    for (const ev of libres) (porDia.get(ev.fecha) || porDia.set(ev.fecha, []).get(ev.fecha)).push(ev)
    for (const [fecha, del] of porDia) {
      const hoy = guardiaDe(fecha), ayer = guardiaDe(diaAnterior(fecha))
      const yo = hoy?.id === emp.id, yoAyer = ayer?.id === emp.id
      const extra = !!(hoy?.extrapolada || ayer?.extrapolada)
      const metodo = extra ? 'rol de guardia (extendido)' : 'rol de guardia'
      del.forEach((ev, i) => {
        if (!hoy && !ayer) return fijar(ev, ev.operacion, 'sin rol de guardia: se conserva la alternancia', true)
        // Un guardia que solo entra (o solo sale) esa mañana trae UN marcaje; si trae más, hay algo raro.
        if (!yo && yoAyer) return fijar(ev, 'SALIDA', metodo, del.length > 1)
        if (yo && !yoAyer) return fijar(ev, 'ENTRADA', metodo, del.length > 1)
        if (yo && yoAyer) return fijar(ev, del.length > 1 ? (i === 0 ? 'SALIDA' : 'ENTRADA') : 'ENTRADA', metodo, del.length === 1)
        return fijar(ev, ev.operacion, 'fuera del rol de guardia', true)
      })
    }
  } else {
    const porDia = new Map()
    for (const ev of libres) (porDia.get(ev.fecha) || porDia.set(ev.fecha, []).get(ev.fecha)).push(ev)
    for (const [fecha, del] of porDia) {
      const k = del.length
      if (k >= 2) {
        del.forEach((ev, i) => {
          const op = i === 0 ? 'ENTRADA' : i === k - 1 ? 'SALIDA' : (i % 2 === 1 ? 'SALIDA' : 'ENTRADA')
          fijar(ev, op, 'primer marcaje del día = entrada, último = salida', k > 2 && k % 2 === 1)
        })
        continue
      }
      // Un solo marcaje en el día: ¿está más cerca de la hora de entrada o de la de salida?
      const ev = del[0]
      const prog = (emp?.hora_entrada_prog && emp?.hora_salida_prog)
        ? { entrada: aMin(emp.hora_entrada_prog), salida: aMin(emp.hora_salida_prog) }
        : horarioDelDia(emp?.horario_trabajo, fecha)
      const m = aMin(ev.hora)
      if (prog) fijar(ev, Math.abs(m - prog.entrada) <= Math.abs(m - prog.salida) ? 'ENTRADA' : 'SALIDA', 'un solo marcaje: cercanía al horario', true)
      else fijar(ev, m < 13 * 60 ? 'ENTRADA' : 'SALIDA', 'un solo marcaje: sin horario, por la hora del día', true)
    }
  }
  return orden.map(e => resultado.get(e))
}

// ── Reconocimiento de empleados ─────────────────────────────────────────────
/**
 * Asigna cada marcaje a un empleado del catálogo y decide su ENTRADA/SALIDA. NO adivina a quién
 * pertenece una persona: número del checador = número de empleado (si el nombre también se
 * parece), nombre completo igual, o nombre (aun el solo primer nombre) que coincide con UN solo
 * empleado. Lo demás queda sin reconocer, con el motivo. Los acentos no cuentan (René = RENÉ).
 *
 * @param {{id:string, numero_empleado:string, nombre_completo:string}[]} empleados
 * @param {ReturnType<typeof parsearChecador>} eventos
 * @param {Record<string,string>} asignaciones  { "<número o nombre del checador>": "<número de empleado o nombre completo>" }
 * @param {{extras?:Map<string,object>, rota?:Map<string,string>, guardias?:string[]}} contexto
 *        extras: empleado_id → { cruza_medianoche, hora_entrada_prog, hora_salida_prog, horario_trabajo }
 */
export function resolverMarcajes(empleados, eventos, asignaciones = {}, contexto = {}) {
  const { extras = new Map(), rota = new Map(), guardias = [] } = contexto
  const porNumero = new Map(), porDigitos = new Map(), porNombre = new Map()
  for (const e of empleados) {
    if (e.numero_empleado) { porNumero.set(normChecador(e.numero_empleado), e); const d = soloDigitos(e.numero_empleado); if (d && !porDigitos.has(d)) porDigitos.set(d, e) }
    porNombre.set(normChecador(e.nombre_completo), e)
  }
  const asig = Object.fromEntries(Object.entries(asignaciones || {}).map(([k, v]) => [normChecador(k), v]))
  const buscarEmpleado = v => porNumero.get(normChecador(v)) || porNombre.get(normChecador(v)) || null

  // Una persona del checador = un número (el nombre puede venir recortado).
  const personas = new Map()
  for (const ev of eventos) {
    const p = personas.get(ev.numero) || { numero: ev.numero, nombre: ev.nombre, marcajes: 0 }
    if ((ev.nombre || '').length > (p.nombre || '').length) p.nombre = ev.nombre
    p.marcajes++
    personas.set(ev.numero, p)
  }

  const resultado = new Map()
  for (const p of personas.values()) {
    let emp = null, via = null, motivo = null, candidatos = [], numeroChoca = null
    const forzado = asig[normChecador(p.numero)] ?? asig[normChecador(p.nombre)]
    if (forzado) {
      emp = buscarEmpleado(forzado); via = emp ? 'asignado' : null
      if (!emp) motivo = `la asignación "${forzado}" no coincide con ningún empleado`
    }
    if (!emp && !forzado) {
      emp = porNumero.get(normChecador(p.numero)) || porDigitos.get(soloDigitos(p.numero)) || null
      if (emp) via = 'numero'
      if (emp && p.nombre) {
        // Un nombre de pila en común no basta (Luis Fernando Velázquez ≠ Luis Pérez León): se piden
        // 2 palabras iguales cuando ambos nombres traen 2 o más. Un reloj que solo da el primer
        // nombre (una palabra) se conforma con esa.
        const delEmp = normChecador(emp.nombre_completo).split(' ').filter(Boolean)
        const delArchivo = normChecador(p.nombre).split(' ').filter(Boolean)
        const comunes = delArchivo.filter(t => delEmp.includes(t)).length
        if (comunes < Math.min(2, delArchivo.length, delEmp.length)) {
          // El reloj numera a su manera: el 7 del checador puede ser el E003 del catálogo. Antes de
          // rendirse se busca por nombre; si hay UN solo empleado con ese nombre, es él, y se avisa.
          numeroChoca = `${emp.nombre_completo} (número ${emp.numero_empleado})`
          motivo = `el número coincide con ${emp.nombre_completo}, pero el archivo dice «${p.nombre}»: parecen personas distintas`
          emp = null; via = null
        }
      }
    }
    if (!emp && !forzado && p.nombre) {
      const n = normChecador(p.nombre)
      emp = porNombre.get(n) || null
      if (emp) via = 'nombre'
      else {
        const toks = n.split(' ').filter(Boolean)
        candidatos = empleados.filter(e => { const et = normChecador(e.nombre_completo).split(' '); return toks.length && toks.every(t => et.includes(t)) })
        if (candidatos.length === 1) { emp = candidatos[0]; via = toks.length > 1 ? 'nombre' : 'primer_nombre' }
        else if (candidatos.length > 1) motivo = `el nombre coincide con ${candidatos.length} empleados (${candidatos.slice(0, 3).map(c => c.nombre_completo).join(', ')})`
      }
    }
    if (emp) motivo = null
    if (!emp && !motivo) motivo = 'no existe en el catálogo de empleados'
    resultado.set(p.numero, { ...p, emp, via, motivo, choque: emp ? numeroChoca : null })
  }

  // ENTRADA/SALIDA por persona, con su horario y el rol de guardia.
  const filas = [], grupos = [], sinReconocer = [], dudosos = []
  let reasignadas = 0, extendidos = 0
  for (const r of resultado.values()) {
    if (!r.emp) { sinReconocer.push({ numero: r.numero, nombre: r.nombre, marcajes: r.marcajes, motivo: r.motivo }); continue }
    const suyos = eventos.filter(e => e.numero === r.numero)
    const emp = { id: r.emp.id, ...(extras.get(r.emp.id) || {}) }
    const decididos = asignarOperaciones(suyos, emp, rota, guardias)
    const cambiados = decididos.filter(d => d.cambio).length
    reasignadas += cambiados
    extendidos += decididos.filter(d => /extendido/.test(d.metodo)).length
    for (const d of decididos) {
      filas.push({ empleado_id: r.emp.id, numero_empleado_ext: r.numero, operacion: d.operacion, fecha_hora: `${d.fecha} ${d.hora}:00`, origen: 'ZKTeco_CSV' })
      if (d.dudoso) dudosos.push({ empleado: r.emp.nombre_completo, fecha: d.fecha, hora: d.hora, operacion: d.operacion, metodo: d.metodo })
    }
    grupos.push({ numero: r.numero, nombre: r.nombre, empleado_id: r.emp.id, empleado: r.emp.nombre_completo, via: r.via, marcajes: r.marcajes, choque: r.choque, corregidos: cambiados, guardia: !!emp.cruza_medianoche })
  }
  filas.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
  return { filas, grupos, sinReconocer, dudosos, reasignadas, extendidos }
}
