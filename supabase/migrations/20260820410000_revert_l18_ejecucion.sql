-- L18 no está en proceso de renovación — revertir a EN_EJECUCION
UPDATE public.contratos
SET estatus_proceso = 'EN_EJECUCION', updated_at = now()
WHERE locales_referencia = 'L18';
