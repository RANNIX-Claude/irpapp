-- Locales 9, 18 y 36 — marcar EN_RENOVACION
-- Vencen en sep-2026, proceso de renovación iniciado
UPDATE public.contratos
SET estatus_proceso = 'EN_RENOVACION', updated_at = now()
WHERE locales_referencia IN ('L09', 'L18', 'L36')
  AND estatus IN ('VIGENTE', 'VENCIDO');
