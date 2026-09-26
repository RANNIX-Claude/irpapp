/**
 * Lector del archivo del reloj checador y reconocimiento de empleados.
 *
 * Es código puro (sin navegador ni Supabase). Lo usan:
 *   · ImportChecadorModal.jsx (RH → Importar desde checador).
 *   · El navegador, al adjuntar el archivo al chat del Agente Operativo.
 * El reconocimiento de empleados (a quién pertenece cada marcaje) vive en chat-operativo.js:
 * solo lo usa el servidor, y esa function es CommonJS, que en Netlify no puede cargar
 * archivos ESM de src/.
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
