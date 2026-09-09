/**
 * Estatus de OPERACIÓN de un contrato — el segundo eje, independiente del papel.
 *
 * El contrato tiene dos condiciones que no siempre coinciden:
 *
 *   1. Estatus del contrato   VIGENTE / VENCIDO   según su fecha de fin
 *   2. Estatus de operación   OCUPADO / DESOCUPADO   según la realidad de la plaza
 *
 * Un local puede tener el contrato vencido y seguir ocupado y pagando: la
 * renovación no se formalizó, pero la relación comercial sigue viva. Hoy son 8
 * de 21 locales en operación. Al revés también pasa: hay contratos marcados
 * VENCIDO cuya fecha ni siquiera ha llegado, porque el campo se captura a mano.
 *
 * Para cobranza manda el eje de operación: si el local está ocupado, esa renta
 * se debe cobrar ese mes — la pague o la deba. Por eso lo proyectado se calcula
 * sobre los ocupados y no sobre los `estatus = VIGENTE`.
 *
 * La ocupación se deduce de la evidencia de pago porque es el único dato que se
 * mantiene solo: no depende de que alguien actualice un campo.
 */

// Meses sin pagar tras los que se considera que el local se desocupó.
// Tres meses da margen a un moroso sin confundirlo con un local vacío.
export const DIAS_OPERACION = 90

/** ¿El contrato está en operación, según su último pago de renta? */
export function estaOcupado(ultimoPago, dias = DIAS_OPERACION) {
  if (!ultimoPago) return false
  const transcurridos = (Date.now() - new Date(ultimoPago).getTime()) / 86400000
  return transcurridos <= dias
}

/** Fecha del último pago de renta por contrato, a partir de una lista de ingresos. */
export function ultimoPagoPorContrato(ingresos = []) {
  const mapa = {}
  for (const i of ingresos) {
    if (i.tipo !== 'RENTA' || !i.contrato_id || !i.fecha) continue
    const actual = mapa[i.contrato_id]
    if (!actual || i.fecha > actual) mapa[i.contrato_id] = i.fecha
  }
  return mapa
}

/**
 * Las dos condiciones de un contrato, listas para pintar.
 * `alerta` marca el caso que al negocio le importa: ocupado sin contrato firmado.
 */
export function condicionContrato(contrato, ultimoPago) {
  const ocupado = estaOcupado(ultimoPago)
  const vencido = contrato.fecha_fin
    ? contrato.fecha_fin < new Date().toISOString().slice(0, 10)
    : contrato.estatus === 'VENCIDO'

  return {
    ocupado,
    vencido,
    operacion: ocupado ? 'OCUPADO' : 'DESOCUPADO',
    // Ocupa y paga, pero el contrato no se renovó: sin respaldo firmado.
    alerta: ocupado && vencido,
    ultimoPago: ultimoPago ?? null,
  }
}
