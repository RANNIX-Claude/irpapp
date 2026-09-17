import { useState, useEffect, Fragment } from 'react'
import { Download, X, FileText, Calendar, RefreshCw, Printer } from 'lucide-react'
import { usePRP } from '../../hooks/usePRP'
import toast from 'react-hot-toast'
import ExcelJS from 'exceljs'
import { NominaInput } from './rh-helpers'
import { generarSemanas, DIAS_ABREV, isoDelDia, soloHora, labelSemana } from './rh-semanas'

// ── Tab Nómina Semanal IWOL ─────────────────────────────────────────────────
function TabNominaIWOL() {
  const SEMANAS = generarSemanas(16)
  const [semanaIdx, setSemanaIdx] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: empleados } = usePRP('prp_empleados', { order: { col: 'nombre_completo' } })
  const { data: incidencias } = usePRP('prp_incidencias', {
    filters: [['semana_inicio', 'eq', SEMANAS[semanaIdx].lunes]],
    refreshKey,
  })
  // Entradas y salidas de la semana, un renglón por empleado y día.
  const { data: asistencia } = usePRP('prp_asistencia_semana', {
    filters: [['semana_inicio', 'eq', SEMANAS[semanaIdx].lunes]],
    refreshKey,
  })
  // Ajustes manuales: { [empleadoId]: { complemento, vacaciones, prima_vac, dia_festivo, transferencia } }
  const [ajustes, setAjustes] = useState({})
  const semana = SEMANAS[semanaIdx]

  const activos = (empleados ?? []).filter(e => e.estado_id === 'ACTIVO')
  const incs = incidencias ?? []
  const marcajes = asistencia ?? []

  // Calcular renglones
  const renglones = activos.map((emp, idx) => {
    const faltas = incs.filter(i => i.empleado_id === emp.id && i.afecta_nomina).length

    // Asistencia de lunes a domingo. El día de descanso no se pinta: no se
    // espera marcaje ese día y ponerlo en blanco se leería como una falta.
    const descanso = isoDelDia(emp.dia_descanso)
    const delEmpleado = marcajes.filter(m => m.empleado_id === emp.id)
    const asistenciaSemana = [1, 2, 3, 4, 5, 6, 7]
      .filter(d => d !== descanso)
      .map(d => {
        const m = delEmpleado.find(x => x.dia_semana === d)
        return { dia: d, abrev: DIAS_ABREV[d - 1], entrada: soloHora(m?.entrada), salida: soloHora(m?.salida) }
      })
    const asistenciaTexto = asistenciaSemana
      .map(a => `${a.abrev} ${a.entrada ? a.entrada + '–' + (a.salida || '?') : '—'}`)
      .join('\n')
    const salDia = parseFloat(emp.salario_diario) || 0
    const percepcion = Math.round(salDia * 7 * 100) / 100
    const descuento = Math.round(salDia * faltas * 100) / 100
    const aj = ajustes[emp.id] || {}
    const complemento   = parseFloat(aj.complemento  || 0)
    const vacaciones    = parseFloat(aj.vacaciones    || 0)
    const prima_vac     = parseFloat(aj.prima_vac     || 0)
    const dia_festivo   = parseFloat(aj.dia_festivo   || 0)
    // El bono es un dato del empleado (recurrente); se puede ajustar por
    // semana desde el panel de nómina igual que los demás conceptos.
    const bono          = parseFloat(aj.bono !== undefined ? aj.bono : (emp.bono || 0))
    const totalPerc     = percepcion - descuento + complemento + vacaciones + prima_vac + dia_festivo + bono
    // Sueldo y bono pueden pagarse por vías distintas (p.ej. sueldo en
    // efectivo y bono en transferencia), así que el default se arma sumando
    // cada parte según su propia forma de pago, no todo el total en bloque.
    const formaPagoBono = emp.forma_pago_bono || emp.forma_pago || 'TRANSFERENCIA'
    const defaultTransfer =
      (emp.forma_pago === 'EFECTIVO' ? 0 : (totalPerc - bono)) +
      (formaPagoBono === 'EFECTIVO' ? 0 : bono)
    const transferencia = parseFloat(aj.transferencia !== undefined ? aj.transferencia : defaultTransfer)
    const efectivo      = Math.round((totalPerc - transferencia) * 100) / 100
    return {
      no: idx + 1,
      empleado_id: emp.id,
      emp,                       // se necesita completo para el recibo (RFC, CURP, ingreso)
      nombre: emp.nombre_completo,
      horario: emp.horario_trabajo || '—',
      descanso: emp.dia_descanso || '—',
      asistencia: asistenciaSemana,
      asistencia_texto: asistenciaTexto,
      faltas,
      percepcion,
      descuento,
      complemento,
      vacaciones,
      prima_vac,
      dia_festivo,
      bono,
      total_percepciones: totalPerc,
      transferencia,
      efectivo,
      forma_pago: emp.forma_pago || 'TRANSFERENCIA',
      forma_pago_bono: formaPagoBono,
    }
  })

  const totales = {
    percepcion:         renglones.reduce((s, r) => s + r.percepcion, 0),
    total_percepciones: renglones.reduce((s, r) => s + r.total_percepciones, 0),
    // Suma el split real de cada empleado (sueldo y bono pueden ir por vías
    // distintas), no un todo-o-nada según una sola forma de pago.
    transferencia:      renglones.reduce((s, r) => s + r.transferencia, 0),
    efectivo:           renglones.reduce((s, r) => s + r.efectivo, 0),
  }

  const setAj = (empId, k, v) => setAjustes(prev => ({
    ...prev,
    [empId]: { ...(prev[empId] || {}), [k]: v },
  }))

  // ── Recibo de nómina individual ───────────────────────────────────────────
  // El formato del cliente lleva una FECHA DE PAGO que no siempre es el
  // domingo, así que se pide una vez arriba y aplica a todos los recibos.
  const [fechaPago, setFechaPago] = useState(semana.domingo)
  useEffect(() => { setFechaPago(semana.domingo) }, [semana.domingo])

  // Los mismos datos alimentan el Word y la impresión, para que no discrepen.
  const datosRecibo = (r, semanaISO) => {
    return {
      empleado: r.emp,
      semana: { lunes: semana.lunes, domingo: semana.domingo, numero: semanaISO(semana.lunes) },
      nomina: {
        dias_trabajados: 7 - r.faltas,
        faltas: r.faltas,
        // Percepción del formato: el sueldo de la semana más los conceptos
        // que se le sumaron. El descuento por faltas va del lado de deducción.
        percepcion:  r.percepcion + r.complemento + r.vacaciones + r.prima_vac + r.dia_festivo,
        bono:        r.bono,
        deducciones: r.descuento,
        neto:        r.total_percepciones,
        fecha_pago:  fechaPago,
      },
    }
  }

  const generarRecibo = async (r) => {
    // Carga diferida: docx pesa ~380 KB y solo hace falta al pedir un recibo.
    const { descargarRecibo, semanaISO } = await import('../../lib/reciboNomina')
    try {
      const nombre = await descargarRecibo(datosRecibo(r, semanaISO))
      toast.success(nombre)
      logAudit({ modulo: 'Nómina', accion: 'RECIBO', descripcion: `${r.nombre} — semana ${semana.lunes}` })
    } catch (e) {
      toast.error('No se pudo generar el recibo: ' + e.message)
    }
  }

  const imprimirReciboDe = async (r) => {
    const { imprimirRecibo, semanaISO } = await import('../../lib/reciboNomina')
    try {
      imprimirRecibo(datosRecibo(r, semanaISO))
      logAudit({ modulo: 'Nómina', accion: 'RECIBO_IMPRESO', descripcion: `${r.nombre} — semana ${semana.lunes}` })
    } catch (e) {
      toast.error(e.message)
    }
  }

  const generarTodos = async () => {
    for (const r of renglones) await generarRecibo(r)
  }

  const exportarExcel = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'IRP — RANNIX Consulting'
    const sheetName = labelSemana(semana.lunes, semana.domingo).substring(0, 31)
    const ws = wb.addWorksheet(sheetName)

    // Formato monetario idéntico al archivo original
    const MONEY = '_-"$"* #,##0.00_-;\\-"$"* #,##0.00_-;_-"$"* "-"??_-;_-@_-'

    // Anchos de columna. Los del archivo original, más la de asistencia que se
    // insertó en quinto lugar (columna E), junto al horario y el descanso.
    const COL_W = [4, 34.88, 21.33, 17.44, 20, 12.88, 17.88, 26.55, 14, 18.44, 21.44, 22.33, 21.33, 14.88]
    COL_W.forEach((w, i) => { ws.getColumn(i + 1).width = w })
    const COL_ASIST = 4          // índice 0-based de la columna de asistencia
    const COL_DINERO = 6         // de aquí en adelante, formato moneda

    // Borde fino para todas las celdas de datos
    const thinBorder = {
      top:    { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left:   { style: 'thin', color: { argb: 'FF000000' } },
      right:  { style: 'thin', color: { argb: 'FF000000' } },
    }

    // ── Fila 1: vacía ──────────────────────────────────────────────────

    // ── Fila 2: título fusionado A2:M2 ─────────────────────────────────
    ws.mergeCells('A2:N2')
    const titulo = `NÓMINA PLAZA IWOL DEL ${labelSemana(semana.lunes, semana.domingo).toUpperCase()}`
    const tCell = ws.getCell('A2')
    tCell.value = titulo
    tCell.font  = { bold: true, size: 12, name: 'Calibri' }
    tCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 22

    // ── Fila 3: vacía ──────────────────────────────────────────────────

    // ── Fila 4: encabezados ────────────────────────────────────────────
    const HDRS = [
      'No.', 'NOMBRE DEL TRABAJADOR', 'HORARIO', 'DESCANSO',
      'ASISTENCIA LUN-DOM (ENTRADA-SALIDA)', 'FALTAS',
      'PERCEPCIÓN', 'COMPLEMENTO DE PAGO DE NOMINA', 'VACACIONES',
      'PRIMA VACACIONAL', 'DIA FESTIVO', 'TOTAL PERCEPCIONES', 'TRANFERENCIA', 'EFECTIVO',
    ]
    const hRow = ws.getRow(4)
    hRow.height = 30
    HDRS.forEach((h, i) => {
      const c = hRow.getCell(i + 1)
      c.value = h
      c.font  = { bold: true, size: 10, name: 'Calibri' }
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      c.border = thinBorder
      // Fondo gris claro en encabezados (toque visual)
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }
    })

    // ── Filas 5+: empleados ────────────────────────────────────────────
    renglones.forEach((r, idx) => {
      const rowNum = 5 + idx
      const row = ws.getRow(rowNum)
      // La celda de asistencia lleva un renglón por día; se le da altura para
      // que se vean los seis o siete sin tener que ampliar la fila a mano.
      row.height = Math.max(18, 12 * (r.asistencia.length || 1))
      // Alternar fondo blanco / azul muy claro
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFEBF3FB'

      const vals = [
        r.no,
        r.nombre,
        r.horario,
        r.descanso,
        r.asistencia_texto || '—',
        r.faltas,
        r.percepcion,
        r.complemento  || null,
        r.vacaciones   || null,
        r.prima_vac    || null,
        r.dia_festivo  || null,
        r.total_percepciones,
        r.transferencia || null,
        r.efectivo      || null,
      ]
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1)
        c.value = v === 0 && i >= COL_DINERO ? 0 : (v || null)  // mantener 0 en columnas dinero
        c.border = thinBorder
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        // Alineación
        c.alignment = {
          horizontal: [0, 3, 5].includes(i) ? 'center'
            : i >= COL_DINERO ? 'right' : 'left',
          vertical: i === COL_ASIST ? 'top' : 'middle',
          wrapText: i === 2 || i === COL_ASIST,   // horario y asistencia son multilínea
        }
        if (i >= COL_DINERO) c.numFmt = MONEY
      })
    })

    // ── Fila totales ───────────────────────────────────────────────────
    const totRowNum = 5 + renglones.length
    const totRow = ws.getRow(totRowNum)
    totRow.height = 18
    ;[null, null, null, null, null, 'TOTALES:',
      totales.percepcion, null, null, null, null,
      totales.total_percepciones, totales.transferencia, totales.efectivo,
    ].forEach((v, i) => {
      const c = totRow.getCell(i + 1)
      c.value = v
      c.border = thinBorder
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }
      c.font = { bold: true, size: 10, name: 'Calibri' }
      c.alignment = {
        horizontal: i >= 5 ? 'right' : 'center',
        vertical: 'middle',
      }
      if (i >= COL_DINERO) c.numFmt = MONEY
    })

    // ── Generar y descargar ────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Nomina_IWOL_${semana.lunes}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Excel generado correctamente')
  }

  const INP = NominaInput

  return (
    <div>
      {/* Selector semana + acciones */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:'white',borderRadius:8,border:'1.5px solid #E5E7EB',padding:'4px 4px 4px 12px' }}>
          <Calendar size={14} color="var(--color-primary)" />
          <span style={{ fontSize:13,fontWeight:600 }}>Semana:</span>
          <select value={semanaIdx} onChange={e => { setSemanaIdx(+e.target.value); setAjustes({}) }}
            style={{ border:'none',background:'transparent',fontSize:13,fontWeight:600,color:'var(--color-primary)',cursor:'pointer',padding:'6px 8px',outline:'none' }}>
            {SEMANAS.map((s, i) => (
              <option key={s.lunes} value={i}>{labelSemana(s.lunes, s.domingo)}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize:12,color:'var(--color-text-light)' }}>{semana.lunes} al {semana.domingo}</span>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:'white',borderRadius:8,border:'1.5px solid #E5E7EB',padding:'4px 10px' }}>
          <span style={{ fontSize:12,fontWeight:600,color:'#6B7280' }}>Fecha de pago:</span>
          <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
            style={{ border:'none',background:'transparent',fontSize:12.5,fontWeight:600,color:'var(--color-primary)',outline:'none',padding:'4px 0' }} />
        </div>
        <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
          <button onClick={generarTodos}
            style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 12px',border:'1.5px solid #5A4080',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:'white',color:'#5A4080' }}>
            <FileText size={13} /> Recibos de todos
          </button>
          <button onClick={() => setRefreshKey(k => k+1)}
            style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',background:'white' }}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={exportarExcel}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#057642',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer' }}>
            <Download size={14} /> Exportar Excel
          </button>
          <button onClick={() => window.print()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#5A4080',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer' }}>
            <Printer size={14} /> Imprimir PDF
          </button>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #nomina-iwol-print, #nomina-iwol-print * { visibility: visible; }
          #nomina-iwol-print {
            position: absolute; left: 0; top: 0; width: 100%;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }

          /* Oficio landscape: 355mm × 216mm — caben las 13 columnas */
          @page {
            size: 355mm 216mm landscape;
            margin: 6mm 8mm;
          }

          /* Tabla compacta para impresión */
          #nomina-iwol-print table { font-size: 9px !important; width: 100% !important; table-layout: fixed; }
          #nomina-iwol-print thead th { padding: 5px 4px !important; font-size: 8px !important; white-space: normal !important; }
          #nomina-iwol-print tbody td { padding: 5px 4px !important; font-size: 9px !important; }

          /* Anchos fijos por columna. El horario cede espacio a la asistencia,
             que necesita ancho para los siete renglones de entrada-salida. */
          #nomina-iwol-print table colgroup { display: table-column-group; }
          #nomina-iwol-print th:nth-child(1),  #nomina-iwol-print td:nth-child(1)  { width: 14px;  } /* No */
          #nomina-iwol-print th:nth-child(2),  #nomina-iwol-print td:nth-child(2)  { width: 50px;  } /* Nombre */
          #nomina-iwol-print th:nth-child(3),  #nomina-iwol-print td:nth-child(3)  { width: 40px;  } /* Horario */
          #nomina-iwol-print th:nth-child(4),  #nomina-iwol-print td:nth-child(4)  { width: 18px;  } /* Descanso */
          #nomina-iwol-print th:nth-child(5),  #nomina-iwol-print td:nth-child(5)  { display: none !important; } /* Asistencia: oculta en impresión */
          #nomina-iwol-print th:nth-child(6),  #nomina-iwol-print td:nth-child(6)  { width: 16px;  } /* Faltas */
          #nomina-iwol-print th:nth-child(7),  #nomina-iwol-print td:nth-child(7)  { width: 28px;  } /* Percepción */
          #nomina-iwol-print th:nth-child(8),  #nomina-iwol-print td:nth-child(8)  { width: 26px;  } /* Complem. */
          #nomina-iwol-print th:nth-child(9),  #nomina-iwol-print td:nth-child(9)  { width: 22px;  } /* Vacaciones */
          #nomina-iwol-print th:nth-child(10), #nomina-iwol-print td:nth-child(10) { width: 22px;  } /* Prima Vac */
          #nomina-iwol-print th:nth-child(11), #nomina-iwol-print td:nth-child(11) { width: 22px;  } /* Día Festivo */
          #nomina-iwol-print th:nth-child(12), #nomina-iwol-print td:nth-child(12) { width: 30px;  } /* Total Perc */
          #nomina-iwol-print th:nth-child(13), #nomina-iwol-print td:nth-child(13) { width: 28px;  } /* Transferencia */
          #nomina-iwol-print th:nth-child(14), #nomina-iwol-print td:nth-child(14) { width: 24px;  } /* Efectivo */

          /* La celda de asistencia se aprieta: es una rejilla de 7 renglones */
          #nomina-iwol-print td:nth-child(5) div { font-size: 7px !important; line-height: 1.25 !important; }

          /* Inputs → valor de texto */
          #nomina-iwol-print input { display: none !important; }
          #nomina-iwol-print .print-val { display: inline !important; }

          /* Colores forzados */
          #nomina-iwol-print thead tr,
          #nomina-iwol-print .print-total-row {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        .print-val { display: none; }
      `}</style>

      {/* Totales rápidos */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
        {[
          [activos.length, 'Empleados', '#7B5EA7'],
          [incs.filter(i => i.afecta_nomina).length, 'Inasistencias', '#B24020'],
          ['$'+totales.total_percepciones.toLocaleString('es-MX',{minimumFractionDigits:2}), 'Total a pagar', '#057642'],
          ['$'+totales.transferencia.toLocaleString('es-MX',{minimumFractionDigits:2}), 'Transferencia', '#7B5EA7'],
        ].map(([v,t,c]) => (
          <div key={t} style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',padding:'14px 16px' }}>
            <div style={{ fontSize:11,fontWeight:600,color:'var(--color-text-light)',textTransform:'uppercase',marginBottom:4 }}>{t}</div>
            <div style={{ fontSize:20,fontWeight:700,color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabla nómina */}
      <div id="nomina-iwol-print" style={{ background:'white',borderRadius:10,border:'1px solid #E5E7EB',overflow:'hidden' }}>
        {/* Encabezado solo visible en impresión */}
        <div className="print-val" style={{ padding:'10px 14px 6px', borderBottom:'2px solid #5A4080' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#5A4080' }}>INMOBILIARIA IWOL — Nómina Semanal</div>
              <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>
                Semana: {semana.lunes} al {semana.domingo}
              </div>
            </div>
            <div style={{ textAlign:'right', fontSize:11, color:'#6B7280' }}>
              <div>RANNIX Consulting</div>
              <div>Generado: {new Date().toLocaleDateString('es-MX')}</div>
            </div>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
            <thead>
              <tr style={{ background:'#5A4080',color:'white' }}>
                {['No.','Nombre del Trabajador','Horario','Descanso','Asistencia Lun–Dom','Faltas','Percepción','Complem.','Vacaciones','Prima Vac.','Día Festivo','Total Perc.','Transferencia','Efectivo'].map(h => (
                  <th key={h} style={{ padding:'10px 12px',textAlign:'left',fontWeight:600,fontSize:11,whiteSpace:'nowrap' }}>{h}</th>
                ))}
                <th className="no-print" style={{ padding:'10px 12px',textAlign:'center',fontWeight:600,fontSize:11 }}>Recibo</th>
              </tr>
            </thead>
            <tbody>
              {renglones.map((r, i) => (
                <tr key={r.empleado_id} style={{ borderBottom:'1px solid #F3F4F6',background:i%2===0?'white':'#FAFAFA' }}>
                  <td style={{ padding:'10px 12px',color:'#9CA3AF',fontSize:11 }}>{r.no}</td>
                  <td style={{ padding:'10px 12px',fontWeight:600 }}>{r.nombre}</td>
                  <td style={{ padding:'10px 12px',fontSize:11,color:'#6B7280',maxWidth:180 }}>{r.horario}</td>
                  <td style={{ padding:'10px 12px',fontSize:11 }}>{r.descanso}</td>
                  <td style={{ padding:'6px 10px' }}>
                    <div style={{ display:'grid',gridTemplateColumns:'auto 1fr',gap:'1px 6px',fontSize:10.5,fontVariantNumeric:'tabular-nums',lineHeight:1.4 }}>
                      {r.asistencia.map(a => (
                        <Fragment key={a.dia}>
                          <span style={{ fontWeight:700,color:'#9CA3AF' }}>{a.abrev}</span>
                          <span style={{ color: a.entrada ? '#374151' : '#D1D5DB' }}>
                            {a.entrada ? `${a.entrada}–${a.salida || '?'}` : '—'}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'10px 12px',textAlign:'center',fontWeight:700,color:r.faltas>0?'#B24020':'#374151' }}>{r.faltas}</td>
                  <td style={{ padding:'10px 12px',textAlign:'right',fontWeight:600,color:'#374151' }}>${r.percepcion.toLocaleString('es-MX')}</td>
                  <td style={{ padding:'8px 10px', textAlign:'right' }}>
                    <INP value={ajustes[r.empleado_id]?.complemento} onChange={v => setAj(r.empleado_id,'complemento',v)} />
                    <span className="print-val" style={{ fontSize:12, color:'#374151' }}>{ajustes[r.empleado_id]?.complemento ? '$'+parseFloat(ajustes[r.empleado_id].complemento).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}</span>
                  </td>
                  <td style={{ padding:'8px 10px', textAlign:'right' }}>
                    <INP value={ajustes[r.empleado_id]?.vacaciones} onChange={v => setAj(r.empleado_id,'vacaciones',v)} />
                    <span className="print-val" style={{ fontSize:12, color:'#374151' }}>{ajustes[r.empleado_id]?.vacaciones ? '$'+parseFloat(ajustes[r.empleado_id].vacaciones).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}</span>
                  </td>
                  <td style={{ padding:'8px 10px', textAlign:'right' }}>
                    <INP value={ajustes[r.empleado_id]?.prima_vac} onChange={v => setAj(r.empleado_id,'prima_vac',v)} />
                    <span className="print-val" style={{ fontSize:12, color:'#374151' }}>{ajustes[r.empleado_id]?.prima_vac ? '$'+parseFloat(ajustes[r.empleado_id].prima_vac).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}</span>
                  </td>
                  <td style={{ padding:'8px 10px', textAlign:'right' }}>
                    <INP value={ajustes[r.empleado_id]?.dia_festivo} onChange={v => setAj(r.empleado_id,'dia_festivo',v)} />
                    <span className="print-val" style={{ fontSize:12, color:'#374151' }}>{ajustes[r.empleado_id]?.dia_festivo ? '$'+parseFloat(ajustes[r.empleado_id].dia_festivo).toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}</span>
                  </td>
                  <td style={{ padding:'10px 12px',textAlign:'right',fontWeight:700,color:'#057642' }}>${r.total_percepciones.toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                  <td style={{ padding:'10px 12px',textAlign:'right',color:'#1D4ED8',fontWeight:600 }}>
                    {r.transferencia ? '$'+r.transferencia.toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}
                  </td>
                  <td style={{ padding:'10px 12px',textAlign:'right',color:'#166534',fontWeight:600 }}>
                    {r.efectivo ? '$'+r.efectivo.toLocaleString('es-MX',{minimumFractionDigits:2}) : '—'}
                  </td>
                  <td className="no-print" style={{ padding:'8px 10px',textAlign:'center' }}>
                    {/* Word para archivar o corregir; impresora para el caso de
                        cada semana: imprimir, firmar y entregar. */}
                    <div style={{ display:'inline-flex',border:'1.5px solid #E5E7EB',borderRadius:7,overflow:'hidden' }}>
                      <button onClick={() => generarRecibo(r)} title={`Recibo de ${r.nombre} en Word`}
                        style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'5px 9px',border:'none',background:'white',cursor:'pointer',fontSize:11,fontWeight:600,color:'#5A4080',whiteSpace:'nowrap' }}>
                        <FileText size={12} /> Recibo
                      </button>
                      <button onClick={() => imprimirReciboDe(r)} title={`Imprimir el recibo de ${r.nombre}`}
                        style={{ display:'inline-flex',alignItems:'center',padding:'5px 8px',border:'none',borderLeft:'1.5px solid #E5E7EB',background:'white',cursor:'pointer',color:'#6B7280' }}>
                        <Printer size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Totales */}
              <tr className="print-total-row" style={{ background:'#5A4080',color:'white',fontWeight:700 }}>
                <td colSpan={5} style={{ padding:'10px 12px' }}></td>
                <td style={{ padding:'10px 12px',textAlign:'center' }}>TOTALES:</td>
                <td style={{ padding:'10px 12px',textAlign:'right' }}>${totales.percepcion.toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                <td colSpan={4}></td>
                <td style={{ padding:'10px 12px',textAlign:'right' }}>${totales.total_percepciones.toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                <td style={{ padding:'10px 12px',textAlign:'right' }}>${totales.transferencia.toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                <td style={{ padding:'10px 12px',textAlign:'right' }}>${totales.efectivo.toLocaleString('es-MX',{minimumFractionDigits:2})}</td>
                <td className="no-print"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 14px',fontSize:11,color:'#9CA3AF',borderTop:'1px solid #F3F4F6' }}>
          Asistencia: primera entrada y última salida de cada día, del checador · el día de descanso no se muestra · «—» es día sin marcaje<br />
          Complemento, Vacaciones, Prima Vacacional y Día Festivo son ajustes manuales · Transferencia editable (el resto va en Efectivo)
        </div>
      </div>
    </div>
  )
}

export default TabNominaIWOL