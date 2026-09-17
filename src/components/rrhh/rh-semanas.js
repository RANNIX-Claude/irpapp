// Helpers de semanas y asistencia compartidos por TabIncidencias, TabNominaIWOL y NuevaIncidenciaModal
// Extraído de src/pages/RH.jsx — sin cambios de lógica

export function getLunes(d) {
  const dt = new Date(d)
  const day = dt.getDay() // 0=dom
  const diff = (day === 0 ? -6 : 1 - day)
  dt.setDate(dt.getDate() + diff)
  return dt
}
export function fmtDate(d) {
  // Usa fecha LOCAL (no UTC) para evitar el desfase de zona horaria
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt }

export function generarSemanas(n = 12) {
  const semanas = []
  let lunes = getLunes(new Date())
  for (let i = 0; i < n; i++) {
    const domingo = addDays(lunes, 6)
    semanas.push({ lunes: fmtDate(lunes), domingo: fmtDate(domingo) })
    lunes = addDays(lunes, -7)
  }
  return semanas
}

// La semana del reporte va de lunes a domingo, igual que isodow en Postgres.
export const DIAS_ABREV = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']   // índice = isodow - 1
export const ISO_POR_DIA = { lunes:1, martes:2, miercoles:3, jueves:4, viernes:5, sabado:6, domingo:7 }

// dia_descanso se captura como texto ('Sábado', 'Domingo', '-'). Se normaliza
// quitando acentos para no depender de cómo se escribió.
export function isoDelDia(txt) {
  const k = (txt || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return ISO_POR_DIA[k] ?? null
}
export const soloHora = t => (t ? String(t).slice(0, 5) : null)

export const MESES_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
export function labelSemana(lunes, domingo) {
  const l = new Date(lunes + 'T12:00:00')
  const d = new Date(domingo + 'T12:00:00')
  return `${l.getDate()} al ${d.getDate()} de ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`
}
