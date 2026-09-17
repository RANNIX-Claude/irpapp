-- Corregir numero_local: "LOCAL 6" → "LOCAL 06", "LOCAL 8" → "LOCAL 08", etc.
-- Deriva el valor directamente de id_local (L01→'LOCAL 01', L09→'LOCAL 09').
-- Aplica a todos los locales con id_local de dos dígitos (patrón L##).

UPDATE public.cat_locales
SET    numero_local = 'LOCAL ' || substring(id_local FROM 2)
WHERE  id_local ~ '^L[0-9][0-9]$';

-- Notificación PostgREST para refrescar el schema cache
NOTIFY pgrst, 'reload schema';
