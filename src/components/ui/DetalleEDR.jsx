import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const fmt = n => '$' + (parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
const fmtD = s => s ? String(s).slice(0, 10) : '—'

/**
 * Detalle de un renglón del Estado de Resultados: los registros que lo suman.
 *
 * Cada concepto declara de qué tabla sale y cómo se filtra. Los renglones que
 * el EDR toma de `er_mensual` —luz, agua, otros— son cifras capturadas a mano
 * en la foto del mes, no un cálculo: para esos se muestra el gasto operativo
 * del período como respaldo, y se advierte que el número del tablero no se
 * deriva de ahí.
 */
const FUENTES = {
  rentas: {
    titulo: 'Rentas cobradas',
    tabla: 'ingresos',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['periodo', 'Período', r => `${String(r.mes).padStart(2, '0')}/${r.anio}`],
      ['folio', 'Contrato'],
      ['factura', 'Factura', v => v || '—'],
      ['origen', 'Origen'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => cobrosDelMes(m, a, ['RENTA']),
  },
  // La renta se parte en dos por el número de factura, que es exactamente como
  // el EDR arma los renglones: lo facturado se lee, y lo no facturado se
  // obtiene por diferencia. Aquí se ve renglón por renglón cuál cayó en cuál.
  rentas_factura: {
    titulo: 'Rentas con factura',
    tabla: 'ingresos',
    nota: 'Cobros de renta del mes que traen número de factura capturado.',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['periodo', 'Período', r => `${String(r.mes).padStart(2, '0')}/${r.anio}`],
      ['folio', 'Contrato'],
      ['factura', 'Factura'],
      ['origen', 'Origen', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => {
      const { filas } = await cobrosDelMes(m, a, ['RENTA'])
      return { filas: filas.filter(r => r.factura), campoTotal: 'importe' }
    },
  },
  rentas_sin_factura: {
    titulo: 'Rentas sin factura',
    tabla: 'ingresos',
    nota: 'El EDR no lee este renglón: lo calcula restando lo facturado del total de renta cobrada. Estos son los cobros de renta del mes a los que NO se les capturó número de factura — que es lo mismo que esa diferencia.',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['periodo', 'Período', r => `${String(r.mes).padStart(2, '0')}/${r.anio}`],
      ['folio', 'Contrato'],
      ['origen', 'Origen', v => v || '—'],
      ['nota', 'Nota', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => {
      const { filas } = await cobrosDelMes(m, a, ['RENTA'])
      return { filas: filas.filter(r => !r.factura), campoTotal: 'importe' }
    },
  },
  estacionamiento: {
    titulo: 'Estacionamiento',
    tabla: 'ingresos',
    nota: 'El tablero toma el estacionamiento del sistema de tickets IwolPark, que es una base aparte. Aquí solo aparece lo que además se capturó como ingreso en IRP, así que puede no cuadrar con el renglón.',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['nota', 'Concepto', v => v || '—'],
      ['origen', 'Origen', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => cobrosDelMes(m, a, ['ESTACIONAMIENTO']),
  },
  pensiones: {
    titulo: 'Pensiones',
    tabla: 'ingresos',
    nota: 'El tablero toma las pensiones del sistema de tickets IwolPark, contando solo las que están en estado «pagado». Aquí solo aparece lo que además se capturó como ingreso en IRP.',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['nota', 'Concepto', v => v || '—'],
      ['origen', 'Origen', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => cobrosDelMes(m, a, ['PENSION']),
  },
  sanciones: {
    titulo: 'Penalizaciones cobradas',
    tabla: 'ingresos',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['periodo', 'Período', r => `${String(r.mes).padStart(2, '0')}/${r.anio}`],
      ['folio', 'Contrato'],
      ['nota', 'Nota', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => cobrosDelMes(m, a, ['SANCION']),
  },
  agua_ingreso: {
    titulo: 'Agua cobrada',
    tabla: 'ingresos',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['folio', 'Contrato'],
      ['nota', 'Nota', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => cobrosDelMes(m, a, ['AGUA']),
  },
  otros_ingresos: {
    titulo: 'Estacionamiento y pensiones',
    tabla: 'ingresos',
    nota: 'Estacionamiento y pensiones se operan en el sistema de tickets, un proyecto aparte. Aquí solo aparecen los que se hayan capturado como ingreso en IRP.',
    columnas: [
      ['fecha', 'Fecha pago', fmtD],
      ['tipo', 'Tipo'],
      ['nota', 'Concepto', v => v || '—'],
      ['importe', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => cobrosDelMes(m, a, ['ESTACIONAMIENTO', 'PENSION']),
  },
  vending: {
    titulo: 'Vending — semanas del mes',
    tabla: 'vending_semanas',
    nota: 'El vending es de IRP y se opera en el módulo Vending. Se suman las semanas cuya fecha de inicio cae en el mes.',
    columnas: [
      ['fecha_inicio', 'Semana', fmtD],
      ['producto', 'Producto', v => v || '—'],
      ['venta_unidades', 'Unidades', v => v ?? '—', 'num'],
      ['utilidad', 'Utilidad', fmt, 'num'],
      ['venta_pesos', 'Venta', fmt, 'num'],
    ],
    cargar: async (m, a) => {
      const ini = `${a}-${String(m).padStart(2, '0')}-01`
      const fin = `${a}-${String(m).padStart(2, '0')}-${new Date(a, m, 0).getDate()}`
      const { data, error } = await supabase.from('vending_semanas')
        .select('id, fecha_inicio, producto, venta_unidades, venta_pesos, utilidad')
        .gte('fecha_inicio', ini).lte('fecha_inicio', fin)
        .order('venta_pesos', { ascending: false })
      if (error) throw error
      return { filas: data ?? [], campoTotal: 'venta_pesos' }
    },
  },
  gastos: {
    titulo: 'Gastos operativos del mes',
    tabla: 'gastos_operativos',
    nota: 'El tablero toma luz, agua y otros de la foto mensual capturada a mano; esta lista es el gasto registrado en el período, no su desglose.',
    columnas: [
      ['fecha', 'Fecha', fmtD],
      ['proveedor', 'Proveedor', v => v || '—'],
      ['grupo_gasto', 'Grupo', v => v || '—'],
      ['descripcion', 'Descripción', v => (v || '').slice(0, 48) || '—'],
      ['cantidad', 'Importe', fmt, 'num'],
    ],
    cargar: async (m, a) => {
      const { data, error } = await supabase.from('gastos_operativos')
        .select('id, fecha, proveedor, grupo_gasto, descripcion, cantidad')
        .eq('mes', m).eq('anio', a)
        .order('fecha', { ascending: false })
      if (error) throw error
      return { filas: data ?? [], campoTotal: 'cantidad' }
    },
  },
  sueldos: {
    titulo: 'Nómina — empleados activos',
    tabla: 'rh_empleados',
    nota: 'Sueldo mensual del personal activo. El tablero muestra lo capturado en la foto del mes, que puede diferir de esta proyección.',
    columnas: [
      ['numero_empleado', 'N° empleado'],
      ['nombre_completo', 'Empleado'],
      ['puesto', 'Puesto', v => v || '—'],
      ['area', 'Área', v => v || '—'],
      ['salario_mensual', 'Sueldo mensual', fmt, 'num'],
    ],
    cargar: async () => {
      const { data, error } = await supabase.from('prp_empleados')
        .select('id, numero_empleado, nombre_completo, puesto, area, salario_mensual, estado_id')
        .eq('estado_id', 'ACTIVO')
        .order('salario_mensual', { ascending: false })
      if (error) throw error
      return { filas: data ?? [], campoTotal: 'salario_mensual' }
    },
  },
  proyectado: {
    titulo: 'Renta proyectada — locales en operación',
    tabla: 'contratos',
    nota: 'Contratos con estatus de operación OCUPADO. Es lo que se debe cobrar en el mes, con independencia de la vigencia del contrato.',
    columnas: [
      ['locales_display', 'Local', v => v || '—'],
      ['arrendatario_nombre', 'Arrendatario'],
      ['folio', 'Folio'],
      ['estatus', 'Contrato'],
      ['renta_mensual', 'Renta', fmt, 'num'],
    ],
    cargar: async () => {
      const [vista, tabla] = await Promise.all([
        supabase.from('prp_contratos').select('id, locales_display, arrendatario_nombre, folio, estatus, renta_mensual'),
        supabase.from('contratos').select('id, estatus_operacion'),
      ])
      if (vista.error) throw vista.error
      const ocupados = new Set((tabla.data ?? []).filter(x => x.estatus_operacion !== 'DESOCUPADO').map(x => x.id))
      const filas = (vista.data ?? []).filter(c => ocupados.has(c.id))
        .sort((a, b) => (b.renta_mensual || 0) - (a.renta_mensual || 0))
      return { filas, campoTotal: 'renta_mensual' }
    },
  },
}

async function cobrosDelMes(mes, anio, tipos) {
  const ini = `${anio}-${String(mes).padStart(2, '0')}-01`
  const fin = `${anio}-${String(mes).padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`
  const { data, error } = await supabase.from('prp_ingresos')
    .select('id, fecha, mes, anio, tipo, importe, factura, origen, nota, folio')
    .gte('fecha', ini).lte('fecha', fin)
    .in('tipo', tipos)
    .order('fecha', { ascending: false })
  if (error) throw error
  return { filas: data ?? [], campoTotal: 'importe' }
}

export const CONCEPTOS_CON_DETALLE = Object.keys(FUENTES)

/**
 * Un total calculado no tiene registros detrás: tiene sumandos. Su detalle es
 * la fórmula y el valor de cada parte, y desde ahí se puede seguir bajando a
 * la parte que sí venga de una tabla.
 */
function Composicion({ comp, onBajar }) {
  return (
    <div style={{ padding: '18px 22px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 7 }}>
        Cómo se calcula
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '11px 13px', marginBottom: 18, color: '#166534' }}>
        {comp.formula}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 7 }}>
        Los sumandos de este mes
      </div>
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 9, overflow: 'hidden' }}>
        {comp.partes.map((p, i) => {
          const puedeBajar = !!p.concepto
          return (
            <div key={i}
              onClick={puedeBajar ? () => onBajar(p.concepto, p.valor) : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderTop: i ? '1px solid #F3F4F6' : 'none',
                cursor: puedeBajar ? 'pointer' : 'default',
                background: 'white',
              }}
              onMouseEnter={e => { if (puedeBajar) e.currentTarget.style.background = '#F9FAFB' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white' }}>
              <span style={{ fontSize: 13.5, color: '#374151', fontWeight: p.fuerte ? 700 : 400 }}>
                {p.signo === '-' && <span style={{ color: '#B91C1C', fontWeight: 700, marginRight: 5 }}>−</span>}
                {p.label}
              </span>
              {puedeBajar && (
                <span style={{ fontSize: 9, color: '#0A66C2', border: '1px solid #BFDBFE', background: '#EFF6FF', borderRadius: 4, padding: '0 4px', fontWeight: 700, letterSpacing: '.04em' }}>
                  DETALLE
                </span>
              )}
              {p.nota && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{p.nota}</span>}
              <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 13, fontWeight: p.fuerte ? 700 : 600, color: p.valor < 0 ? '#B91C1C' : '#374151', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(p.valor)}
              </span>
            </div>
          )
        })}
        <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderTop: '2px solid #E5E7EB', background: '#F9FAFB' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{comp.etiquetaTotal || 'Total'}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: comp.total < 0 ? '#B91C1C' : '#057642', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(comp.total)}
          </span>
        </div>
      </div>

      {comp.nota && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
          {comp.nota}
        </div>
      )}
    </div>
  )
}

export default function DetalleEDR({ concepto, composicion, mes, anio, valorTablero, onClose }) {
  const [filas, setFilas] = useState(null)
  const [campoTotal, setCampoTotal] = useState('importe')
  const [error, setError] = useState(null)
  // Bajar de un total a uno de sus sumandos sin cerrar y volver a abrir.
  const [bajada, setBajada] = useState(null)

  const conceptoActivo = bajada?.concepto ?? concepto
  const fuente = FUENTES[conceptoActivo]

  if (composicion && !bajada) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={onClose}>
        <div style={{ background: 'white', borderRadius: 14, width: 660, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{composicion.titulo}</h3>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                {String(mes).padStart(2, '0')}/{anio} · renglón calculado, no viene de una tabla
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
          <Composicion comp={composicion} onBajar={(c, v) => setBajada({ concepto: c, valor: v })} />
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!fuente) return
    let cancelado = false
    setFilas(null); setError(null)
    fuente.cargar(mes, anio)
      .then(({ filas, campoTotal }) => {
        if (cancelado) return
        setFilas(filas); setCampoTotal(campoTotal)
      })
      .catch(e => { if (!cancelado) setError(e.message) })
    return () => { cancelado = true }
  }, [conceptoActivo, mes, anio])

  if (!fuente) return null

  const total = (filas ?? []).reduce((s, r) => s + (parseFloat(r[campoTotal]) || 0), 0)
  const refTablero = bajada ? bajada.valor : valorTablero
  const difiere = refTablero != null && Math.abs(total - refTablero) > 1

  const exportar = () => {
    const cab = fuente.columnas.map(c => c[1])
    const cuerpo = (filas ?? []).map(r => fuente.columnas.map(([campo, , transform]) => {
      // 'periodo' es derivado: su transform recibe la fila entera, no un campo.
      const v = campo === 'periodo' ? transform(r) : transform ? transform(r[campo]) : r[campo]
      return `"${String(v ?? '').replace(/"/g, '""')}"`
    }).join(','))
    const csv = [cab.join(','), ...cuerpo].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv)
    a.download = `${concepto}_${anio}-${String(mes).padStart(2, '0')}.csv`
    a.click()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 14, width: 900, maxWidth: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{fuente.titulo}</h3>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
              {String(mes).padStart(2, '0')}/{anio} · origen: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{fuente.tabla}</code>
              {filas && ` · ${filas.length} registro${filas.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {filas?.length > 0 && (
              <button onClick={exportar} title="Descargar CSV"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1.5px solid #E5E7EB', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                <Download size={13} /> CSV
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
        </div>

        {fuente.nota && (
          <div style={{ padding: '10px 22px', background: '#FFF8E7', borderBottom: '1px solid #FDE9BC', fontSize: 12, color: '#92400E' }}>
            {fuente.nota}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: '0 22px' }}>
          {error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#B24020', fontSize: 13 }}>No se pudo cargar el detalle: {error}</div>
          ) : !filas ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Cargando…</div>
          ) : filas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              Sin registros en este período.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                <tr>
                  {fuente.columnas.map(([campo, titulo, , tipo]) => (
                    <th key={campo} style={{ padding: '10px 8px', textAlign: tipo === 'num' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((r, i) => (
                  <tr key={r.id ?? i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {fuente.columnas.map(([campo, , transform, tipo]) => {
                      const valor = campo === 'periodo' ? transform(r)
                        : transform ? transform(r[campo]) : r[campo]
                      return (
                        <td key={campo} style={{ padding: '8px', textAlign: tipo === 'num' ? 'right' : 'left', fontVariantNumeric: tipo === 'num' ? 'tabular-nums' : undefined, fontWeight: tipo === 'num' ? 600 : 400, whiteSpace: tipo === 'num' ? 'nowrap' : undefined }}>
                          {valor ?? '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '2px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280' }}>
            {difiere && (
              <>El tablero muestra <strong style={{ color: '#92400E' }}>{fmt(valorTablero)}</strong> — la diferencia sale de la foto mensual capturada, no de estos registros.</>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Suma del detalle</span>
            <span style={{ fontSize: 19, fontWeight: 800, color: '#1A3C5E', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
