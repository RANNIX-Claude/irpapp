import { useState } from 'react'
import { Calculator, Search, Database, PenLine, Sigma, ExternalLink, Info } from 'lucide-react'
import { useModuleAudit } from '../hooks/useAudit'

/**
 * Explicación de los cálculos del sistema.
 *
 * IRP es el integrador: el Estado de Resultados y el Resumen Semanal no se
 * capturan enteros, se arman con datos que vienen de otros módulos. Quien los
 * revisa necesita saber qué campo captura él y qué campo llega solo —y de
 * dónde— para no perseguir un número que nunca fue suyo.
 *
 * El contenido se escribió leyendo EDR.jsx y ResumenSemanal.jsx. Si un cálculo
 * cambia en el código hay que cambiarlo aquí: es documentación, no un reflejo
 * automático, y una explicación desactualizada engaña más que su ausencia.
 */

// Tres orígenes posibles. La distinción es lo que más le sirve a quien revisa:
// dice a dónde ir a corregir cuando un número está mal.
const ORIGEN = {
  captura: { label: 'Se captura', color: '#0A66C2', bg: '#EFF6FF', icono: PenLine,
             ayuda: 'Lo escribe una persona en el formulario. Si está mal, se corrige ahí mismo.' },
  modulo:  { label: 'Viene de un módulo', color: '#B45309', bg: '#FEF7E8', icono: Database,
             ayuda: 'Llega solo desde otra parte del sistema. Para corregirlo hay que ir al módulo de origen.' },
  calculo: { label: 'Se calcula', color: '#057642', bg: '#ECFDF3', icono: Sigma,
             ayuda: 'Sale de otros renglones. No se captura: cambia cuando cambian sus componentes.' },
}

const EDR_BLOQUES = [
  {
    titulo: 'Ingresos — Rentas',
    campos: [
      { n: 'Rentas totales', o: 'modulo',
        d: 'La renta que deberían pagar todos los contratos del mes. Es el punto de partida de lo proyectado.',
        t: 'prp_contratos.renta_mensual',
        f: 'Σ renta_mensual de los contratos con estatus VIGENTE',
        nota: 'Cuenta contratos vigentes, no locales ocupados. Los locales que operan y pagan con el contrato vencido no entran aquí, y por eso esta cifra queda por debajo de lo que realmente se debe cobrar. Se puede sobrescribir a mano.' },

      { n: 'Restaurant; Ampliación', o: 'captura',
        d: 'La renta del restaurante y su ampliación, calculada por metro cuadrado.',
        t: 'er_mensual.proy_restaurant',
        f: 'Se RESTA de las Rentas totales',
        nota: 'Se resta, no se suma: el anexo del cliente lo dice en su propio renglón, «Rentas disponibles (locales − Restaurant)».' },

      { n: 'Rentas disponibles', o: 'calculo',
        d: 'Lo que queda de renta proyectada una vez apartado el restaurante.',
        t: '—', f: 'Rentas totales − Restaurant' },

      { n: 'Locales vacantes', o: 'captura',
        d: 'Lo que se deja de cobrar por los locales sin arrendar.',
        t: 'er_mensual.proy_locales_vacantes',
        f: '− |proy_locales_vacantes|',
        nota: 'Siempre entra restando, se escriba con signo o sin él.' },

      { n: 'Rentas brutas', o: 'modulo',
        d: 'Lo cobrado de renta que sí lleva factura. En la columna proyectada es la renta disponible menos los locales vacíos.',
        t: 'ingresos (tipo = RENTA, con factura)',
        f: 'Proyectado: Rentas disponibles − Locales vacantes\nReal: Σ importe donde tipo=RENTA, factura ≠ vacío, fecha ∈ mes' },

      { n: 'Rentas sin Factura', o: 'calculo',
        d: 'La renta cobrada que no lleva factura. No se lee de ningún lado: se deduce por diferencia.',
        t: 'ingresos (tipo = RENTA, sin factura)',
        f: 'Σ importe (tipo=RENTA, mes) − Rentas brutas',
        nota: 'Al ser una resta, cualquier renta a la que se le olvidó capturar el folio de factura cae aquí. Si este renglón crece sin explicación, lo primero que hay que revisar es la captura en Ingresos.' },

      { n: 'Total Rentas', o: 'calculo',
        d: 'Toda la renta cobrada, con factura y sin ella.',
        t: '—', f: 'Rentas brutas + Rentas sin Factura' },

      { n: 'Penalizaciones', o: 'captura',
        d: 'Lo cobrado por sanciones de mora.',
        t: 'er_mensual.real_penaliz_mes · real_penaliz_otros',
        f: 'Se captura a mano',
        nota: 'Es el único concepto de ingreso sin carga automática, aunque el dato existe en ingresos con tipo = SANCION. Hoy hay que capturarlo mirando el módulo de Ingresos.' },

      { n: 'IVA retenido', o: 'captura',
        d: 'El IVA que se descuenta de las rentas.',
        t: 'er_mensual.real_iva_mes · real_iva_otros',
        f: '− (real_iva_mes + real_iva_otros)',
        nota: 'No se proyecta: la columna proyectada del IVA va vacía a propósito.' },

      { n: 'Ingresos Netos Renta', o: 'calculo',
        d: 'La renta después de penalizaciones e IVA.',
        t: '—',
        f: 'Total Rentas + Penalizaciones + IVA   (el IVA ya viene negativo)',
        nota: 'Proyectado y real no son comparables en este renglón: el real lleva IVA descontado y el proyectado no. La comparación honesta está en Total Rentas.' },
    ],
  },
  {
    titulo: 'Ingresos — Otros conceptos',
    campos: [
      { n: 'Estacionamiento', o: 'modulo',
        d: 'Lo cobrado por boletos de estacionamiento.',
        t: 'pagos_boletos — sistema de tickets IwolPark (base aparte)',
        f: 'Σ monto_pagado donde periodo_mes = mes y periodo_año = año',
        nota: 'El importe se toma del primer campo que exista: monto_pagado, si no importe, si no total. Si el sistema de tickets no responde, cae a ingresos con tipo = ESTACIONAMIENTO.' },

      { n: 'Pensiones', o: 'modulo',
        d: 'Lo cobrado por pensiones mensuales de estacionamiento.',
        t: 'pagos_pension — sistema de tickets IwolPark',
        f: 'Σ monto_pagado donde periodo = mes y estado = pagado',
        nota: 'Solo cuentan las que están en estado «pagado». Las pendientes no entran.' },

      { n: 'Maquinita / Vending', o: 'modulo',
        d: 'Lo vendido en las máquinas expendedoras.',
        t: 'vending_semanas.venta_pesos — base de IRP',
        f: 'Σ venta_pesos donde fecha_inicio ∈ mes',
        nota: 'El corte es por la fecha en que arranca la semana. Una semana que empieza el 30 de agosto y termina el 5 de septiembre cuenta completa en agosto, así que en los meses que parten una semana a la mitad no va a cuadrar al peso con el corte semanal.' },

      { n: 'Agua (cobro)', o: 'modulo',
        d: 'Lo cobrado a los arrendatarios por consumo de agua.',
        t: 'ingresos (tipo = AGUA)',
        f: 'Σ importe donde tipo=AGUA y fecha ∈ mes' },

      { n: 'Total Ingresos', o: 'calculo',
        d: 'Todo lo que entró en el mes.',
        t: '—',
        f: 'Ingresos Netos Renta + Estacionamiento + Pensiones + Maquinita + Agua' },
    ],
  },
  {
    titulo: 'Gastos variables',
    campos: [
      { n: 'Sueldos', o: 'modulo',
        d: 'La nómina del mes. El proyectado se calcula solo; el real se captura.',
        t: 'rh_empleados.salario_diario (proyectado) · er_mensual.real_sueldos (real)',
        f: 'Proyectado: Σ salario_diario de los activos × días del mes' },

      { n: 'Fondo Revolvente', o: 'captura',
        d: 'Lo entregado al fondo para gastos menores de la semana.',
        t: 'er_mensual.proy_fondo_revolvente · real_fondo_revolvente',
        f: 'Se captura a mano',
        nota: 'El detalle de los gastos que lo consumen está en el Resumen Semanal, bajo Gastos a Comprobar.' },

      { n: 'Gasto Excedente', o: 'captura',
        d: 'Lo que se gastó por encima del fondo fijo de la semana.',
        t: 'er_mensual.real_gasto_excedente',
        f: 'Se captura a mano',
        nota: 'Solo existe del lado real: no se proyecta un excedente. El renglón se oculta cuando vale cero.' },

      { n: 'Luz · Agua (gasto) · Otros', o: 'captura',
        d: 'Los servicios y los gastos que no caen en ninguna otra categoría.',
        t: 'er_mensual.proy_luz · real_luz · proy_agua_gastos · real_agua_gastos · proy_otros_gastos · real_otros_gastos',
        f: 'Se capturan a mano, en las dos columnas',
        nota: 'No se alimentan del módulo de Gastos Operativos, aunque ahí se capture el detalle con su ticket. Hoy son dos capturas separadas y nada avisa si no coinciden.' },

      { n: 'Total Gastos Variables', o: 'calculo',
        d: 'La suma de los gastos del mes.',
        t: '—',
        f: 'Proyectado: Sueldos + Fondo + Luz + Agua + Otros\nReal: Sueldos + Fondo + Gasto Excedente + Luz + Agua + Otros',
        nota: 'El real lleva un sumando más que el proyectado: el Gasto Excedente. Por eso el real puede pasarse del presupuesto sin que ningún renglón individual se haya pasado.' },
    ],
  },
  {
    titulo: 'Impuestos y resultado',
    campos: [
      { n: 'Utilidad Bruta', o: 'calculo',
        d: 'Lo que queda después de los gastos de operación.',
        t: '—', f: 'Total Ingresos − Total Gastos Variables' },

      { n: 'Predial · Residuos · Licencia · Anuncio', o: 'captura',
        d: 'Los cuatro impuestos y derechos fijos del inmueble.',
        t: 'er_mensual.predial · transporte_residuos · licencia_estacionamiento · anuncio_publicitario',
        f: 'Se capturan a mano, un campo cada uno',
        nota: 'Los cuatro usan el mismo campo para proyectado y para real: capturar uno cambia el otro, son el mismo dato mostrado dos veces. En el anexo del cliente estos impuestos se prorratean entre los doce meses del año.' },

      { n: 'Total Impuestos', o: 'calculo',
        d: 'La suma de los cuatro.',
        t: '—', f: 'Predial + Residuos + Licencia + Anuncio' },

      { n: 'Utilidad Neta', o: 'calculo',
        d: 'El resultado final del mes.',
        t: '—', f: 'Utilidad Bruta − Total Impuestos' },
    ],
  },
  {
    titulo: 'Las columnas del tablero',
    campos: [
      { n: 'Proyectado', o: 'calculo',
        d: 'Lo que debería pasar. Sale del padrón de contratos y de lo capturado como presupuesto.',
        t: '—', f: '—' },
      { n: 'Total', o: 'calculo',
        d: 'Lo que realmente pasó, completo.',
        t: '—', f: 'Rentas Mes + Otros Períodos' },
      { n: 'Rentas Mes', o: 'calculo',
        d: 'Lo cobrado en el mes que corresponde a ese mismo mes: el período del ingreso coincide con el mes del EDR.',
        t: '—', f: '—' },
      { n: 'Otros Períodos', o: 'calculo',
        d: 'Lo cobrado en el mes pero que corresponde a meses anteriores: la renta atrasada que por fin se pagó. Entra en el resultado del mes en que se cobró, no en el que se debía.',
        t: '—', f: '—' },
      { n: 'vs Proy', o: 'calculo',
        d: 'Qué tanto del presupuesto se cumplió.',
        t: '—', f: 'Total ÷ Proyectado × 100',
        nota: 'Queda vacío cuando no hay proyectado: dividir entre cero no da un porcentaje.' },
    ],
  },
]

const SEMANAL_BLOQUES = [
  {
    titulo: 'Ingresos en efectivo de la semana',
    campos: [
      { n: 'Tickets del estacionamiento', o: 'modulo',
        d: 'Los boletos cobrados cada día de la semana.',
        t: 'sistema de tickets IwolPark',
        f: 'Σ de los tickets de los días de la semana',
        nota: 'La semana del corte va de viernes a jueves, no de lunes a domingo.' },

      { n: 'Estacionamiento (captura)', o: 'captura',
        d: 'El ingreso de estacionamiento registrado a mano en IRP.',
        t: 'estacionamiento_diario.cantidad',
        f: 'Σ cantidad de los registros de la semana' },

      { n: 'Pensiones', o: 'modulo',
        d: 'Las pensiones de estacionamiento cobradas en la semana.',
        t: 'sistema de tickets IwolPark',
        f: 'Σ monto de las pensiones con pagado = verdadero',
        nota: 'Las pendientes se muestran para que se vean, pero no suman al total. Solo lo cobrado es efectivo a entregar.' },

      { n: 'Vending', o: 'modulo',
        d: 'Lo vendido en las máquinas durante la semana.',
        t: 'vending_semanas.venta_pesos',
        f: 'Σ venta_pesos de las semanas del período' },

      { n: 'Rentas cobradas en efectivo', o: 'captura',
        d: 'La renta que se recibió en efectivo durante la semana.',
        t: 'ingresos (tipo = RENTA)',
        f: 'Σ importe de los ingresos en efectivo con tipo = RENTA' },

      { n: 'Agua cobrada en efectivo', o: 'captura',
        d: 'El cobro de agua recibido en efectivo.',
        t: 'ingresos (tipo = AGUA)',
        f: 'Σ importe de los ingresos en efectivo con tipo = AGUA' },

      { n: 'Otros', o: 'captura',
        d: 'Cualquier otro ingreso en efectivo que no sea renta ni agua.',
        t: 'ingresos (tipo ≠ RENTA, AGUA)',
        f: 'Σ importe de los ingresos en efectivo restantes' },

      { n: 'Total Efectivo a Entregar', o: 'calculo',
        d: 'Todo el efectivo que debe entregarse del corte de la semana.',
        t: '—',
        f: 'Pensiones + Estacionamiento + Tickets + Vending + Rentas + Agua + Otros',
        nota: 'Es el número que se compara contra lo que físicamente se entrega. Si no cuadra, la diferencia está en alguno de los siete sumandos, y el desglose por concepto que está justo arriba dice en cuál.' },
    ],
  },
  {
    titulo: 'Gastos a comprobar — Fondo revolvente',
    campos: [
      { n: 'Gastos de la semana', o: 'captura',
        d: 'Los gastos menores pagados con el fondo revolvente.',
        t: 'gastos del fondo revolvente',
        f: 'Σ cantidad de los gastos de la semana' },

      { n: 'Balance del fondo', o: 'calculo',
        d: 'Lo que queda del fondo después de los gastos de la semana.',
        t: '—', f: 'Fondo fijo − Gastos de la semana' },

      { n: 'Déficit del fondo', o: 'calculo',
        d: 'Lo gastado por encima del fondo fijo.',
        t: '—',
        f: 'Gastos de la semana − Fondo fijo   (solo cuando es positivo)',
        nota: 'Este déficit es el que después se captura en el EDR como Gasto Excedente. No viaja solo: hay que pasarlo a mano.' },

      { n: 'Diferencia', o: 'calculo',
        d: 'El efectivo que sobra una vez cubiertos los gastos a comprobar.',
        t: '—', f: 'Total Efectivo a Entregar − Gastos de la semana' },
    ],
  },
]

// ── Presentación ────────────────────────────────────────────────────────────
const card = { background: 'white', border: '1px solid #E5E7EB', borderRadius: 10 }

function Marca({ o }) {
  const m = ORIGEN[o]
  const Icono = m.icono
  return (
    <span title={m.ayuda}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10,
        fontSize: 10.5, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      <Icono size={10} /> {m.label}
    </span>
  )
}

function Campo({ c }) {
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #F3F4F6', display: 'grid',
      gridTemplateColumns: '1fr 1.15fr', gap: 16, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{c.n}</span>
          <Marca o={c.o} />
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-light)', lineHeight: 1.5 }}>{c.d}</div>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {c.t !== '—' && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Tabla origen</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#0A66C2', wordBreak: 'break-word' }}>{c.t}</div>
          </div>
        )}
        {c.f !== '—' && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Cómo se calcula</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11.5, background: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: 6, padding: '6px 9px', color: '#166534', whiteSpace: 'pre-line', lineHeight: 1.55 }}>{c.f}</div>
          </div>
        )}
        {c.nota && (
          <div style={{ fontSize: 11.5, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A',
            borderRadius: 6, padding: '7px 9px', lineHeight: 1.5 }}>{c.nota}</div>
        )}
      </div>
    </div>
  )
}

export default function Calculos() {
  useModuleAudit('CALCULOS')
  const [tab, setTab] = useState('edr')
  const [busca, setBusca] = useState('')

  const bloques = tab === 'edr' ? EDR_BLOQUES : SEMANAL_BLOQUES
  const q = busca.toLowerCase()
  const filtrados = bloques
    .map(b => ({ ...b, campos: b.campos.filter(c =>
      !q || c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q)
        || (c.t || '').toLowerCase().includes(q) || (c.f || '').toLowerCase().includes(q)) }))
    .filter(b => b.campos.length)

  const cuenta = o => bloques.reduce((s, b) => s + b.campos.filter(c => c.o === o).length, 0)

  return (
    <div style={{ padding: 24, maxWidth: 1180 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calculator size={27} color="var(--color-primary)" /> Cálculos del Sistema
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-light)' }}>
          De dónde sale cada cifra: qué se captura, qué llega de otro módulo y con qué fórmula se combina
        </p>
      </div>

      {/* Leyenda — la distinción que más sirve al revisar un número */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 18 }}>
        {Object.entries(ORIGEN).map(([k, m]) => {
          const Icono = m.icono
          return (
            <div key={k} style={{ ...card, padding: '12px 14px', borderLeft: `3px solid ${m.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Icono size={14} color={m.color} />
                <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>{cuenta(k)}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-light)', lineHeight: 1.45 }}>{m.ayuda}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #E5E7EB', marginBottom: 16 }}>
        {[['edr', 'Estado de Resultados'], ['semanal', 'Resumen Semanal']].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              borderBottom: `2.5px solid ${tab === k ? 'var(--color-primary)' : 'transparent'}`,
              color: tab === k ? 'var(--color-primary)' : 'var(--color-text-light)' }}>
            {t}
          </button>
        ))}
        <a href={tab === 'edr' ? '/edr' : '/resumen-semanal'}
          style={{ marginLeft: 'auto', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
          Abrir el módulo <ExternalLink size={12} />
        </a>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 380 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar un concepto, tabla o fórmula…"
          style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
      </div>

      {tab === 'edr' && !busca && (
        <div style={{ ...card, padding: '14px 16px', marginBottom: 16, borderLeft: '3px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <Info size={14} color="var(--color-primary)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Dos cosas que conviene entender antes de leer</span>
          </div>
          <p style={{ margin: '0 0 7px', fontSize: 13, color: 'var(--color-text-light)', lineHeight: 1.55 }}>
            <b style={{ color: '#374151' }}>Todo lo real se guarda como foto.</b> Los renglones reales viven en <code style={{ fontFamily: 'monospace', fontSize: 11.5 }}>er_mensual</code>, una fila por mes.
            Mientras esa fila esté vacía, el EDR muestra el dato vivo de las tablas de operación; en cuanto se guarda, manda lo guardado
            y ya no cambia aunque cambien los ingresos. Es a propósito: un estado de resultados cerrado no debe moverse solo.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-light)', lineHeight: 1.55 }}>
            <b style={{ color: '#374151' }}>Mes contra otros períodos.</b> Casi todo lo real se parte en dos columnas, y el corte es siempre base caja:
            cuenta la fecha del depósito, no la del cargo.
          </p>
        </div>
      )}

      {filtrados.length === 0 ? (
        <div style={{ ...card, padding: 50, textAlign: 'center', color: '#9CA3AF' }}>
          Sin conceptos que coincidan con la búsqueda
        </div>
      ) : filtrados.map(b => (
        <div key={b.titulo} style={{ marginBottom: 18 }}>
          <div style={{ background: '#1A3C5E', color: 'white', padding: '10px 16px', borderRadius: '9px 9px 0 0',
            display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{b.titulo}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, opacity: .75 }}>{b.campos.length} conceptos</span>
          </div>
          <div style={{ ...card, borderTop: 'none', borderRadius: '0 0 9px 9px', overflow: 'hidden' }}>
            {b.campos.map(c => <Campo key={c.n} c={c} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
