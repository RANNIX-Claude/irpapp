-- MIGRACIÓN: etapas de proceso TERMINADO y SUSPENDIDO
--
-- El ciclo del contrato queda: EN_CONTRATACION → EN_EJECUCION → TERMINADO,
-- con EN_RENOVACION (se atiende en /renovaciones) y SUSPENDIDO como estados
-- laterales. La lista de /contratos muestra únicamente los EN_EJECUCION.

ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_estatus_proceso_check;
ALTER TABLE public.contratos ADD CONSTRAINT contratos_estatus_proceso_check
  CHECK (estatus_proceso IN ('EN_CONTRATACION','EN_RENOVACION','EN_EJECUCION','TERMINADO','SUSPENDIDO'));

NOTIFY pgrst, 'reload schema';
