-- ================================================================
-- MIGRACIÓN 021: Eliminar cargos_programados e ingresos huérfanos
-- Solo deben existir registros vinculados a los 22 contratos reales.
-- ================================================================

-- 1. Borrar aplicaciones_pago huérfanas (cuyo cargo no tiene contrato válido)
DELETE FROM public.aplicaciones_pago
WHERE cargo_id IN (
  SELECT cp.id FROM public.cargos_programados cp
  WHERE cp.contrato_id NOT IN (SELECT id FROM public.contratos)
     OR cp.contrato_id IS NULL
);

-- 2. Borrar ingresos huérfanos (sin contrato válido)
DELETE FROM public.ingresos
WHERE contrato_id IS NOT NULL
  AND contrato_id NOT IN (SELECT id FROM public.contratos);

-- 3. Borrar cargos_programados huérfanos
DELETE FROM public.cargos_programados
WHERE contrato_id NOT IN (SELECT id FROM public.contratos)
   OR contrato_id IS NULL;

-- ── Verificación: cuántos cargos quedan y de qué contratos ──────────────────
SELECT
  con.numero_contrato,
  con.locales_display,
  COUNT(cp.id)                                      AS cargos,
  SUM(CASE WHEN cp.estado = 'PAGADO'   THEN 1 ELSE 0 END) AS pagados,
  SUM(CASE WHEN cp.estado = 'PENDIENTE'THEN 1 ELSE 0 END) AS pendientes
FROM public.cargos_programados cp
JOIN public.contratos con ON con.id = cp.contrato_id
WHERE cp.concepto = 'RENTA'
GROUP BY con.numero_contrato, con.locales_display
ORDER BY con.locales_display;
