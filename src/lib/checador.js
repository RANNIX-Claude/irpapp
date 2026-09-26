/**
 * Lector del archivo del reloj checador y reconocimiento de empleados.
 *
 * Es código puro (sin navegador ni Supabase) porque lo usan tres sitios:
 *   · ImportChecadorModal.jsx (RH → Importar desde checador): solo `parsearChecador`.
 *   · El navegador, al adjuntar el archivo al chat del Agente Operativo.
 *   · chat-operativo.js (servidor), que con `resolverMarcajes` arma la vista previa y
 *     las filas que se guardan en rh_checadas.
 *
 * Cada renglón del checador es un MARCAJE, no un día: se guardan todos en rh_checadas y el
 * estado del día (presente, retardo, falta) lo consolida un trigger de la base.
 */

// ── Lectura del archivo ─────────────────────────────────────────────────────
const esHora = v => /^\d{1,2}:\d{2}/.test((v || '').trim())
const hhmm = v => { const [h, m] = v.trim().split(':'); return `${h.padStart(2, '0')}:${m.slice(0, 2)}` }

// Reloj checador crudo (ej. "ID. Nombre Depart. Tiempo IDdispositivo"): fecha y hora vienen
// JUNTAS en una sola columna, y el orden de columnas no es el de ZKTeco/BioTime. Sin columna
// de estatus, así que se infiere alternando por orden cronológico.
const RE_FECHA_HORA_JUNTAS = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2})$/
// Variante sin ningún separador real de columna (texto pegado que perdió los tabs).
const RE_MARCAJE_SIN_COLUMNAS = /^(\d+)\s+(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2})\s+\d+\s*$/

/**
 * @param {string} texto  contenido del archivo (CSV/TXT/DAT del checador)
 * @returns {{numero:string, nombre:string, fecha:string, hora:string, operacion:'ENTRADA'|'SALIDA'}[]}
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

  // Los marcajes crudos no traen estatus: se alternan ENTRADA/SALIDA por EMPLEADO
  // (cronológico completo, cruzando días), no por empleado+día: agrupar por día rompía los
  // turnos de 24 h que ponchan una sola vez (entra 7:00, sale 7:00 del día siguiente).
  const porEmpleado = {}
  sinEstatus.forEach(ev => { (porEmpleado[ev.numero] ||= []).push(ev) })
  Object.values(porEmpleado).forEach(grupo => {
    grupo.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    grupo.forEach((ev, i) => eventos.push({ ...ev, operacion: i % 2 === 0 ? 'ENTRADA' : 'SALIDA' }))
  })
  return eventos
}

// ── Reconocimiento de empleados ─────────────────────────────────────────────
const norm = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const soloDigitos = s => { const d = String(s || '').replace(/\D/g, ''); return d ? d.replace(/^0+/, '') || '0' : '' }

/**
 * Asigna cada marcaje a un empleado del catálogo. A diferencia del modal de RH (que acepta
 * "el primer nombre aparece en algún nombre"), aquí NO se adivina: una asignación equivocada
 * en un flujo automático le pone asistencia a otra persona sin que nadie lo note.
 * Orden: asignación explícita → número del checador = número de empleado → nombre completo
 * igual → nombre (o primer nombre) que coincide con UN SOLO empleado. Lo demás queda sin
 * reconocer, con el motivo, y no se importa.
 *
 * @param {{id:string, numero_empleado:string, nombre_completo:string}[]} empleados
 * @param {ReturnType<typeof parsearChecador>} eventos
 * @param {Record<string,string>} asignaciones  { "<número o nombre del checador>": "<número de empleado o nombre completo>" }
 */
export function resolverMarcajes(empleados, eventos, asignaciones = {}) {
  const porNumero = new Map(), porDigitos = new Map(), porNombre = new Map()
  for (const e of empleados) {
    if (e.numero_empleado) { porNumero.set(norm(e.numero_empleado), e); const d = soloDigitos(e.numero_empleado); if (d && !porDigitos.has(d)) porDigitos.set(d, e) }
    porNombre.set(norm(e.nombre_completo), e)
  }
  const asig = Object.fromEntries(Object.entries(asignaciones || {}).map(([k, v]) => [norm(k), v]))
  const buscarEmpleado = v => porNumero.get(norm(v)) || porNombre.get(norm(v)) || null

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
    let emp = null, via = null, motivo = null, candidatos = []
    const forzado = asig[norm(p.numero)] ?? asig[norm(p.nombre)]
    if (forzado) {
      emp = buscarEmpleado(forzado); via = emp ? 'asignado' : null
      if (!emp) motivo = `la asignación "${forzado}" no coincide con ningún empleado`
    }
    if (!emp && !forzado) {
      emp = porNumero.get(norm(p.numero)) || porDigitos.get(soloDigitos(p.numero)) || null
      if (emp) via = 'numero'
    }
    if (!emp && !forzado && p.nombre) {
      const n = norm(p.nombre)
      emp = porNombre.get(n) || null
      if (emp) via = 'nombre'
      else {
        const toks = n.split(' ').filter(Boolean)
        candidatos = empleados.filter(e => { const et = norm(e.nombre_completo).split(' '); return toks.length && toks.every(t => et.includes(t)) })
        if (candidatos.length === 1) { emp = candidatos[0]; via = toks.length > 1 ? 'nombre' : 'primer_nombre' }
        else if (candidatos.length > 1) motivo = `el nombre coincide con ${candidatos.length} empleados (${candidatos.slice(0, 3).map(c => c.nombre_completo).join(', ')})`
      }
    }
    if (!emp && !motivo) motivo = 'no existe en el catálogo de empleados'
    resultado.set(p.numero, { ...p, emp, via, motivo })
  }

  const filas = [], grupos = [], sinReconocer = []
  for (const r of resultado.values()) {
    if (r.emp) grupos.push({ numero: r.numero, nombre: r.nombre, empleado_id: r.emp.id, empleado: r.emp.nombre_completo, via: r.via, marcajes: r.marcajes })
    else sinReconocer.push({ numero: r.numero, nombre: r.nombre, marcajes: r.marcajes, motivo: r.motivo })
  }
  for (const ev of eventos) {
    const r = resultado.get(ev.numero)
    if (!r?.emp) continue
    filas.push({ empleado_id: r.emp.id, numero_empleado_ext: ev.numero, operacion: ev.operacion, fecha_hora: `${ev.fecha} ${ev.hora}:00`, origen: 'ZKTeco_CSV' })
  }
  return { filas, grupos, sinReconocer }
}
