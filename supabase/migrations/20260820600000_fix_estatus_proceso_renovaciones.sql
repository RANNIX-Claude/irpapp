-- Asegurar que todos los contratos esperados en renovación tengan estatus_proceso correcto.
-- Aplica a cualquier contrato cuyo local asignado esté en el set de renovación activa.

-- 1. Por número de contrato conocido (renovaciones explícitas IWOL)
UPDATE public.contratos
SET estatus_proceso = 'EN_RENOVACION', updated_at = now()
WHERE numero_contrato IN (
  'IWOL-L14-R26',
  'IWOL-L0607-R26',
  'IWOL-L36-2025',
  'IWOL-L09-2025',
  'IWOL-L09-2025-R26'   -- renovación creada desde UI antes del fix de la función
)
AND estatus NOT IN ('CANCELADO','RENOVADO','RESCISION');

-- 2. Cualquier contrato cuyo local_id sea L09 y esté vigente o vencido
UPDATE public.contratos c
SET estatus_proceso = 'EN_RENOVACION', updated_at = now()
FROM public.contratos_locales cl
WHERE cl.contrato_id = c.id
  AND cl.local_id = 'L09'
  AND c.estatus NOT IN ('CANCELADO','RENOVADO','RESCISION')
  AND c.estatus_proceso <> 'EN_RENOVACION';
