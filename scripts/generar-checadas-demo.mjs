/**
 * Genera un archivo de marcajes que imita la salida de un checador ZKTeco,
 * usando los horarios y las claves reales de los empleados de Plaza IWOL.
 *
 *   node scripts/generar-checadas-demo.mjs > checadas-demo.txt
 *
 * Formato de salida (el primero que acepta el importador):
 *
 *   No,Nombre,Fecha,Hora,Status      Status: 0 = entrada, 1 = salida
 *
 * No es un volcado limpio a propósito. Un archivo de checador real trae
 * retardos, salidas a comer, alguien que se fue sin checar y algún ausente;
 * si el archivo de prueba sale perfecto, la prueba no prueba nada.
 */

// Empleados tal como están en rh_empleados. El horario está en texto libre,
// así que aquí se traduce a la hora que realmente se espera de cada uno.
const EMPLEADOS = [
  { num: 'E001', nombre: 'VERONICA NAVA MARTINEZ',          entrada: '08:00', salida: '16:00', descanso: 7, dias: [1,2,3,4,5,6] },
  { num: 'E002', nombre: 'LUIS FERNANDO VELAZQUEZ ESCOBAR', entrada: '09:00', salida: '17:00', descanso: 6, dias: [1,2,3,4,5],
    especial: { 7: { entrada: '09:00', salida: '14:00' } } },              // domingo corto
  { num: 'E003', nombre: 'HUMBERTO ROMERO HERNANDEZ',       entrada: '08:00', salida: '08:00', descanso: 0, dias: [1,3,5,7], guardia: 24 },
  { num: 'E004', nombre: 'DEMETRIO MARTINEZ MEJIA',         entrada: '08:00', salida: '20:00', descanso: 0, dias: [1,3,5,7], guardia: 12 },
  { num: 'E005', nombre: 'MARIA DEL CARMEN MORALES LARA',   entrada: '08:00', salida: '15:00', descanso: 7, dias: [1,2,3,4,5,6] },
  { num: 'E006', nombre: 'RENE SANCHEZ DEGOLLADO',          entrada: '13:00', salida: '21:00', descanso: 6, dias: [1,2,3,4,5,7] },
  { num: 'E007', nombre: 'JUAN CARRILLO SANTANA',           entrada: '14:30', salida: '21:30', descanso: 6, dias: [1,2,3,4,5,7] },
  { num: 'E008', nombre: 'JORGE MORALES LARA',              entrada: '09:00', salida: '18:00', descanso: 7, dias: [1,2,3,4,5,6] },
]

// Incidencias sembradas a propósito, para que el importador tenga qué digerir.
// La clave es 'empleado|fecha'.
const RUIDO = {
  'E001|2026-09-02': { retardo: 18 },              // retardo que debe marcarse
  'E001|2026-09-08': { comida: ['13:00', '14:00'] },// cuatro marcajes en un día
  'E002|2026-09-03': { falta: true },              // no se presentó
  'E005|2026-09-01': { sinSalida: true },          // entró y no checó salida
  'E005|2026-09-09': { retardo: 7 },               // retardo apenas sobre tolerancia
  'E006|2026-09-04': { retardo: 25 },
  'E007|2026-09-07': { comida: ['17:00', '17:45'] },
  'E008|2026-09-02': { falta: true },
}

const mas = (hhmm, minutos) => {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + minutos
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
const fmt = d => d.toISOString().slice(0, 10)
const isodow = d => (d.getDay() === 0 ? 7 : d.getDay())

// Variación de un par de minutos: nadie checa a las 08:00:00 clavadas.
const jitter = () => Math.floor(Math.random() * 5) - 2

const DESDE = new Date('2026-08-31T12:00:00')   // lunes
const HASTA = new Date('2026-09-10T12:00:00')   // hoy

const filas = []
for (let d = new Date(DESDE); d <= HASTA; d.setDate(d.getDate() + 1)) {
  const fecha = fmt(d)
  const dow = isodow(d)

  for (const e of EMPLEADOS) {
    if (!e.dias.includes(dow)) continue
    if (dow === e.descanso) continue

    const r = RUIDO[`${e.num}|${fecha}`] || {}
    if (r.falta) continue

    const horario = e.especial?.[dow] || e
    const entrada = mas(horario.entrada, (r.retardo || 0) + jitter())
    filas.push([e.num, e.nombre, fecha, entrada, 0])

    if (r.comida) {
      filas.push([e.num, e.nombre, fecha, r.comida[0], 1])
      filas.push([e.num, e.nombre, fecha, r.comida[1], 0])
    }

    if (r.sinSalida) continue

    // Las guardias de 24 horas salen al día siguiente: la salida se registra
    // con la fecha en que ocurre, que es como lo manda el aparato.
    if (e.guardia === 24) {
      const sig = new Date(d); sig.setDate(sig.getDate() + 1)
      if (sig <= HASTA) filas.push([e.num, e.nombre, fmt(sig), mas(horario.salida, jitter()), 1])
    } else {
      filas.push([e.num, e.nombre, fecha, mas(horario.salida, jitter()), 1])
    }
  }
}

// El checador ordena por fecha y hora, no por empleado.
filas.sort((a, b) => (a[2] + a[3] + a[0]).localeCompare(b[2] + b[3] + b[0]))

console.log('No,Nombre,Fecha,Hora,Status')
for (const f of filas) console.log(f.join(','))
