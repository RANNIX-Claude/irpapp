-- ═══════════════════════════════════════════════════════════════════════
-- Fix: estacionamiento_diario semana 27-Jun-2026
--   · Elimina la fila Vie 26/Jun (quedaba fuera del rango Sáb→Vie)
--   · La semana queda Sáb 27-Jun → Jue 02-Jul (Vie 03-Jul sin dato aún)
-- RANNIX Consulting · 2026-08-14
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM public.estacionamiento_diario
  WHERE fecha = '2026-06-26';

-- Actualizar etiqueta de semana en los registros ya insertados
UPDATE public.estacionamiento_diario
  SET semana = 'Semana 27-Jun'
  WHERE fecha BETWEEN '2026-06-27' AND '2026-07-03'
    AND semana = 'Semana 26-Jun';
