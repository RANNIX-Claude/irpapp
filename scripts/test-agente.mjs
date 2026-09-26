// Casos de regresión del Agente Operativo (aplicar_pago). Sin red: usa una base simulada en memoria.
// Cada fallo real del agente se agrega aquí como caso nuevo.  Uso: node scripts/test-agente.mjs
import { ACCIONES, periodoDeTexto } from '../netlify/functions/chat-operativo.js'

// Mini query-builder: from().select().eq/neq/in/gt/order/limit → thenable | maybeSingle
function baseSimulada(tablas) {
  return { from: (t) => {
    let rows = [...(tablas[t] || [])]
    const q = {
      select: () => q,
      eq: (c, v) => (rows = rows.filter(r => r[c] == v), q),
      neq: (c, v) => (rows = rows.filter(r => r[c] != v), q),
      in: (c, vs) => (rows = rows.filter(r => vs.includes(r[c])), q),
      gt: (c, v) => (rows = rows.filter(r => Number(r[c]) > v), q),
      order: (c) => (rows.sort((a, b) => String(a[c]).localeCompare(String(b[c]))), q),
      limit: () => q,
      maybeSingle: async () => ({ data: rows[0] || null, error: null }),
      then: (ok, ko) => Promise.resolve({ data: rows, error: null }).then(ok, ko),
    }
    return q
  } }
}

const contrato = { id: 'c8', folio: 'IWOL-2025-L08', arrendatario_nombre: 'Cristina Medina', locales_display: 'L8', estatus: 'VIGENTE' }
const cargo = (id, mes, saldo, estado) => ({ id, contrato_id: 'c8', concepto: 'RENTA', periodo_mes: mes, periodo_anio: 2026, importe: 10000, saldo, estado, fecha_vencimiento: `2026-${String(mes).padStart(2, '0')}-21` })
const ficha = { contrato_id: 'c8', importe: 10000, fecha: '2026-09-12', forma_pago: 'TRANSFERENCIA', referencia: 'RENTA SEP 2026 L08', banco: 'Banco Vital' }

let fallos = 0
const ok = (nombre, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${nombre}${cond ? '' : '  ' + extra}`); if (!cond) fallos++ }

ok('periodo: "RENTA SEP 2026 L08"', JSON.stringify(periodoDeTexto('RENTA SEP 2026 L08')) === '{"mes":9,"anio":2026}')
ok('periodo: "Renta Septiembre de 2026"', periodoDeTexto('Renta Septiembre de 2026')?.mes === 9)
ok('periodo: "09/2026"', periodoDeTexto('pago 09/2026')?.mes === 9)
ok('periodo: sin periodo → null', periodoDeTexto('TRANSFERENCIA L08') === null)

const prep = (p, tablas) => ACCIONES.aplicar_pago.preparar(baseSimulada({ prp_contratos: [contrato], ingresos: [], aplicaciones_pago: [], ...tablas }), p, { reservado: {} })

// Caso L08: enero y septiembre pendientes; la ficha dice SEP → debe ir a septiembre, no a enero.
let r = await prep(ficha, { prp_cartera: [cargo('ene', 1, 10000, 'PENDIENTE'), cargo('sep', 9, 10000, 'PENDIENTE')] })
ok('L08: aplica al cargo de SEP, no al más antiguo', r.params?.distribucion?.length === 1 && r.params.distribucion[0].cargo_id === 'sep', JSON.stringify(r.error || r.params))
ok('L08: avisa que enero sigue pendiente', /01\/2026/.test(r.aviso || ''), r.aviso)

// Caso L18: el periodo ya está pagado → no propone, explica.
r = await prep(ficha, { prp_cartera: [cargo('sep', 9, 0, 'PAGADO')], aplicaciones_pago: [{ cargo_id: 'sep', ingreso_id: 976, importe_aplicado: 10000 }] })
ok('L18: periodo ya pagado → error, no propuesta', !!r.error && /YA ESTÁ PAGADO/.test(r.error) && /976/.test(r.error), JSON.stringify(r))

// El usuario insiste: ignorar_periodo → saldo a favor (sin cargos pendientes).
r = await prep({ ...ficha, ignorar_periodo: true }, { prp_cartera: [cargo('sep', 9, 0, 'PAGADO')] })
ok('ignorar_periodo → queda como saldo a favor', !r.error && r.params.distribucion.length === 0 && r.params.excedente === 10000, JSON.stringify(r))

// Periodo inexistente
r = await prep(ficha, { prp_cartera: [cargo('ene', 1, 10000, 'PENDIENTE')] })
ok('periodo sin cargo → error y pregunta', !!r.error && /no tiene cargo/.test(r.error), JSON.stringify(r))

// Sin periodo en la ficha: comportamiento anterior (más antiguo).
r = await prep({ ...ficha, referencia: 'TRANSFERENCIA' }, { prp_cartera: [cargo('ene', 1, 10000, 'PENDIENTE'), cargo('sep', 9, 10000, 'PENDIENTE')] })
ok('sin periodo → el más antiguo', r.params?.distribucion?.[0]?.cargo_id === 'ene', JSON.stringify(r.error || r.params))

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodos los casos pasan')
process.exit(fallos ? 1 : 0)
