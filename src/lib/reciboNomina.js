/**
 * Recibo de nómina semanal — formato Inmobiliaria Alcedines del Norte.
 *
 * Reproduce el Word que usa la administración (FORMATO NOMINA ALCEDINES.docx)
 * para que el recibo salga del sistema con los datos ya puestos, en lugar de
 * capturarlos a mano sobre el machote cada semana.
 *
 * Genera un .docx: el recibo se imprime, se firma y a veces se corrige a mano
 * antes de firmarse, así que entregar un archivo editable vale más que un PDF.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, VerticalAlign,
} from 'docx'

// ── Datos fiscales del patrón ───────────────────────────────────────────────
// Del encabezado del formato original. Si cambian, se cambian aquí.
export const PATRON = {
  razon_social: 'INMOBILIARIA ALCEDINES DEL NORTE S.A. DE C.V.',
  rfc: 'IAN2009238U4',
  regimen: '601 — GENERAL DE LEY PERSONAS MORALES',
  domicilio: 'AV. GOBERNADORES, 1622, COL. LA PROVIDENCIA, 52177, METEPEC, ESTADO DE MÉXICO.',
  telefono: 'Tel. 722 497 8921',
  ciudad: 'METEPEC, ESTADO DE MÉXICO',
}

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO',
  'AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NINGUNO   = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE }
const FINO      = (c = '000000') => ({ style: BorderStyle.SINGLE, size: 4, color: c })
const CAJA      = { top: FINO(), bottom: FINO(), left: FINO(), right: FINO() }

const money = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fechaCorta = f => { if (!f) return '—'; const d = new Date(f + 'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` }

// ── Cantidad con letra ──────────────────────────────────────────────────────
const UNIDADES = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ',
  'ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE']
const DECENAS  = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA']
const CENTENAS = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
  'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS']

function menorAMil(n) {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100), r = n % 100
  let txt = CENTENAS[c]
  if (r === 0) return txt
  let resto
  if (r <= 20) resto = UNIDADES[r]
  else if (r < 30) resto = 'VEINTI' + UNIDADES[r - 20].toLowerCase().toUpperCase()
  else {
    const d = Math.floor(r / 10), u = r % 10
    resto = DECENAS[d] + (u ? ' Y ' + UNIDADES[u] : '')
  }
  return (txt ? txt + ' ' : '') + resto
}

/** 1234.5 -> 'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 50/100 M.N.' */
export function numeroALetras(valor) {
  const n = Math.floor(Math.abs(parseFloat(valor) || 0))
  const centavos = Math.round((Math.abs(parseFloat(valor) || 0) - n) * 100)
  const cent = String(centavos).padStart(2, '0')
  if (n === 0) return `CERO PESOS ${cent}/100 M.N.`

  const millones = Math.floor(n / 1000000)
  const miles    = Math.floor((n % 1000000) / 1000)
  const resto    = n % 1000

  // Apócope delante del sustantivo: VEINTIÚN MIL, TREINTA Y UN PESOS, UN PESO.
  const apocope = t => t.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/(^|\s)UNO$/, '$1UN')

  let txt = ''
  if (millones) txt += (millones === 1 ? 'UN MILLÓN' : apocope(menorAMil(millones)) + ' MILLONES') + ' '
  if (miles)    txt += (miles === 1 ? 'MIL' : apocope(menorAMil(miles)) + ' MIL') + ' '
  if (resto)    txt += menorAMil(resto)

  return `${apocope(txt.trim())} ${n === 1 ? 'PESO' : 'PESOS'} ${cent}/100 M.N.`
}

// ── Salario diario integrado ────────────────────────────────────────────────
/**
 * SDI = salario diario × factor de integración.
 * Factor = (365 + 15 de aguinaldo + días de vacaciones × 25% de prima) / 365.
 * Los días de vacaciones son los de la reforma de 2023: 12 el primer año, +2
 * por año hasta 20, y +2 cada cinco años a partir del sexto.
 */
export function diasVacaciones(aniosAntiguedad) {
  const a = Math.max(1, Math.floor(aniosAntiguedad || 1))
  if (a <= 5) return 10 + a * 2                   // 12, 14, 16, 18, 20
  return 20 + Math.floor((a - 1) / 5) * 2         // 22 del 6º al 10º, 24 del 11º…
}

export function salarioDiarioIntegrado(salarioDiario, diasAntiguedad) {
  const anios = Math.max(1, Math.floor((diasAntiguedad || 0) / 365) + 1)
  const factor = (365 + 15 + diasVacaciones(anios) * 0.25) / 365
  return Math.round((parseFloat(salarioDiario) || 0) * factor * 100) / 100
}

// ── Piezas del documento ────────────────────────────────────────────────────
const txt = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Arial', size: o.size ?? 18, bold: o.bold, color: o.color })
const par = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [runs],
  alignment: o.align ?? AlignmentType.LEFT,
  spacing: { before: o.before ?? 0, after: o.after ?? 40 },
})

function celda(children, o = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined,
    borders: o.borders ?? NINGUNO,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  })
}

/** Renglón de dos columnas 'ETIQUETA: valor' — como el machote original. */
function parDatos(etiquetaIzq, valorIzq, etiquetaDer, valorDer) {
  const lado = (et, val) => par([txt(et + ' ', { bold: true }), txt(val)])
  return new TableRow({
    children: [
      celda(lado(etiquetaIzq, valorIzq), { width: 58 }),
      celda(etiquetaDer ? lado(etiquetaDer, valorDer) : par(txt('')), { width: 42 }),
    ],
  })
}

/**
 * @param {object} d
 *   empleado: { nombre_completo, rfc, curp, puesto, horario_trabajo,
 *               dia_descanso, fecha_ingreso, salario_diario, dias_antiguedad }
 *   semana:   { lunes, domingo, numero }
 *   nomina:   { dias_trabajados, faltas, percepcion, bono, deducciones, neto, fecha_pago }
 *   logo:     ArrayBuffer del PNG (opcional)
 */
export async function construirRecibo(d) {
  const { empleado: e, semana: s, nomina: n } = d
  const hoy = new Date()
  const sdi = salarioDiarioIntegrado(e.salario_diario, e.dias_antiguedad)
  const sueldoSemanal = (parseFloat(e.salario_diario) || 0) * 7

  // ── Encabezado: logo a la izquierda, datos fiscales a la derecha ──────────
  const encabezado = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NINGUNO,
    rows: [new TableRow({ children: [
      celda(
        d.logo
          ? new Paragraph({ children: [new ImageRun({ data: d.logo, transformation: { width: 105, height: 78 } })] })
          : par(txt('')),
        { width: 22 },
      ),
      celda([
        par(txt(PATRON.razon_social, { bold: true, size: 20 }), { align: AlignmentType.CENTER }),
        par(txt(PATRON.rfc, { bold: true }), { align: AlignmentType.CENTER }),
        par(txt('RÉGIMEN FISCAL: ' + PATRON.regimen, { size: 15 }), { align: AlignmentType.CENTER }),
        par(txt(PATRON.domicilio, { size: 15 }), { align: AlignmentType.CENTER }),
        par(txt(PATRON.telefono, { size: 15 }), { align: AlignmentType.CENTER }),
      ], { width: 78 }),
    ] })],
  })

  // ── Datos del empleado ───────────────────────────────────────────────────
  const datos = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NINGUNO,
    rows: [
      parDatos('RFC:',   e.rfc  || '—', 'INICIO REL. LABORAL:', fechaCorta(e.fecha_ingreso)),
      parDatos('CURP:',  e.curp || '—', 'DÍAS TRABAJADOS:',     n.dias_trabajados),
      parDatos('PUESTO:', e.puesto || '—', 'FALTAS:',           n.faltas),
      parDatos('HORARIO:', e.horario_trabajo || '—', 'DESCANSO:', e.dia_descanso || '—'),
      parDatos('SUELDO:', money(sueldoSemanal), 'FECHA DE PAGO:', fechaCorta(n.fecha_pago)),
      parDatos('SALARIO D. INTEGRADO:', money(sdi), '', ''),
    ],
  })

  // ── Concepto / percepción / deducción ────────────────────────────────────
  const hdr = t => celda(par(txt(t, { bold: true }), { align: AlignmentType.CENTER }), { borders: CAJA, fill: 'D9D9D9' })
  const conceptos = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [hdr('CONCEPTO'), hdr('PERCEPCIÓN'), hdr('DEDUCCIÓN')] }),
      new TableRow({ children: [
        celda(par(txt(`SEMANA ${s.numero} ${new Date(s.lunes + 'T12:00:00').getFullYear()}`)), { borders: CAJA, width: 50 }),
        celda(par(txt(money(n.percepcion)), { align: AlignmentType.RIGHT }), { borders: CAJA, width: 25 }),
        celda(par(txt(n.deducciones ? money(n.deducciones) : '-----'), { align: AlignmentType.RIGHT }), { borders: CAJA, width: 25 }),
      ] }),
      new TableRow({ children: [
        celda(par(txt(`Del ${fechaCorta(s.lunes)} al ${fechaCorta(s.domingo)}`, { size: 15, color: '595959' })), { borders: CAJA }),
        celda(par(txt('')), { borders: CAJA }),
        celda(par(txt('')), { borders: CAJA }),
      ] }),
    ],
  })

  // ── Totales ──────────────────────────────────────────────────────────────
  const totalRow = (et, val, bold) => new TableRow({ children: [
    celda(par(txt(et, { bold: true }), { align: AlignmentType.RIGHT }), { borders: CAJA, width: 70, fill: bold ? 'D9D9D9' : undefined }),
    celda(par(txt(val, { bold }), { align: AlignmentType.RIGHT }), { borders: CAJA, width: 30, fill: bold ? 'D9D9D9' : undefined }),
  ] })

  const totales = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      totalRow('PERCEPCIÓN:', money(n.percepcion)),
      totalRow('BONO DE PUNTUALIDAD:', n.bono ? money(n.bono) : '------'),
      totalRow('DEDUCCIONES:', n.deducciones ? money(n.deducciones) : '------'),
      totalRow('NETO RECIBIDO:', money(n.neto), true),
    ],
  })

  const LEGAL = 'Recibí de la empresa que se cita en el encabezado, la cantidad anteriormente descrita, ' +
    'con la cual doy por pagadas todas y cada una de las prestaciones incluyendo el 7º día que generé ' +
    'durante el presente periodo y anteriores, así mismo, manifiesto a mi entera satisfacción estar de ' +
    'acuerdo con los descuentos legales aplicados. De igual forma acepto, que no se me adeuda prestación ' +
    'o cantidad alguna por cualquier otro concepto por lo que no me reservo acción o derecho alguno que ' +
    'ejercitar en contra de la empresa a la que se hace referencia.'

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children: [
        encabezado,
        par(txt(''), { after: 120 }),
        par(txt('R E C I B O   D E   N Ó M I N A', { bold: true, size: 24 }), { align: AlignmentType.CENTER, after: 160 }),
        par(txt(`${PATRON.ciudad} A ${hoy.getDate()} DE ${MESES[hoy.getMonth()]} DE ${hoy.getFullYear()}`, { size: 17 }),
          { align: AlignmentType.RIGHT, after: 160 }),
        par([txt('EMPLEADO: ', { bold: true }), txt((e.nombre_completo || '').toUpperCase(), { bold: true, size: 20 })], { after: 120 }),
        datos,
        par(txt(''), { after: 120 }),
        conceptos,
        par(txt(''), { after: 120 }),
        totales,
        par(txt(''), { after: 100 }),
        par(txt('(' + numeroALetras(n.neto) + ')', { bold: true, size: 17 }), { align: AlignmentType.CENTER, after: 200 }),
        par(txt(LEGAL, { size: 15 }), { align: AlignmentType.JUSTIFIED, after: 400 }),
        par(txt('_______________________________________'), { align: AlignmentType.CENTER, after: 40 }),
        par(txt('NOMBRE Y FIRMA', { bold: true, size: 17 }), { align: AlignmentType.CENTER }),
      ],
    }],
  })
}

/** Construye el recibo y lo descarga. Devuelve el nombre del archivo. */
export async function descargarRecibo(datos) {
  let logo = null
  try {
    const r = await fetch('/logo-alcedines.png')
    if (r.ok) logo = await r.arrayBuffer()
  } catch { /* sin logo el recibo sale igual, solo sin imagen */ }

  const doc = await construirRecibo({ ...datos, logo })
  const blob = await Packer.toBlob(doc)
  const limpio = (datos.empleado.nombre_completo || 'empleado')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_')
  const nombre = `Recibo_${limpio}_sem${datos.semana.numero}_${datos.semana.lunes}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  URL.revokeObjectURL(url)
  return nombre
}

/** Número de semana ISO de una fecha 'YYYY-MM-DD'. */
export function semanaISO(fecha) {
  const d = new Date(fecha + 'T12:00:00')
  const jueves = new Date(d)
  jueves.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const enero4 = new Date(jueves.getFullYear(), 0, 4)
  return 1 + Math.round(((jueves - enero4) / 86400000 - 3 + ((enero4.getDay() + 6) % 7)) / 7)
}
