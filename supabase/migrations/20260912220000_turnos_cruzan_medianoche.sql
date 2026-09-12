-- Soporte para turnos de 24h que cruzan medianoche (entra 7:00 un día, sale
-- 7:00 al día siguiente). Sin esto, fn_consolidar_dia_asistencia agrupaba
-- las checadas por CALENDARIO: la salida de madrugada del día siguiente
-- quedaba sin ENTRADA ese día (-> FALTA falsa) y el día que sí trabajaron
-- se quedaba sin SALIDA (-> "presente" o "retardo" con hora_salida vacía).

-- ─────────────────────────────────────────────────────────────
-- 1. Horario programado por empleado — la referencia real para medir
--    retardo y para decidir si el turno cruza medianoche.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS hora_entrada_prog TIME,
  ADD COLUMN IF NOT EXISTS hora_salida_prog  TIME,
  ADD COLUMN IF NOT EXISTS cruza_medianoche  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.rh_empleados.cruza_medianoche IS
  'true si el turno programado termina al día siguiente de haber entrado (ej. 24h: entra 7:00, sale 7:00 del día siguiente).';

-- Humberto y Demetrio cubren la caseta en turnos de 24h: entran 7:00,
-- salen 7:00 del día siguiente.
UPDATE public.rh_empleados
   SET cruza_medianoche = true,
       hora_entrada_prog = '07:00',
       hora_salida_prog  = '07:00',
       horario_trabajo   = 'Lunes a Domingo 24h trabajo × 24h descanso'
 WHERE (nombre ILIKE 'HUMBERTO' AND apellido_pat ILIKE 'ROMERO')
    OR (nombre ILIKE 'DEMETRIO' AND apellido_pat ILIKE 'MART%');

-- ─────────────────────────────────────────────────────────────
-- 2. Consolidación diaria: soporta turnos que cruzan medianoche
-- ─────────────────────────────────────────────────────────────
-- Para un empleado con cruza_medianoche, el "día de turno" de una SALIDA es
-- el día calendario ANTERIOR al que quedó registrada la checada (porque el
-- turno abrió ayer y cierra hoy en la madrugada). El día de una ENTRADA
-- siempre es su propio día calendario. Esto evita adivinar por la hora del
-- reloj: se apoya en el campo `operacion`, que ya viene bien etiquetado
-- (o se infiere en el importador alternando por empleado, cronológico).
CREATE OR REPLACE FUNCTION public.fn_consolidar_dia_asistencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_emp    uuid;
  v_op     text;
  v_fecha_marcaje date;
  v_cruza  boolean;
  v_entrada_prog time;
  v_shift  date;   -- día de turno a consolidar (puede no ser v_fecha_marcaje)
  v_ent    timestamp;
  v_sal    timestamp;
  v_ref    time;
  v_min    integer;
  v_ret    integer;
BEGIN
  v_emp          := COALESCE(NEW.empleado_id, OLD.empleado_id);
  v_op           := COALESCE(NEW.operacion,   OLD.operacion);
  v_fecha_marcaje := COALESCE(NEW.fecha,      OLD.fecha);
  IF v_emp IS NULL THEN RETURN NULL; END IF;

  SELECT cruza_medianoche, hora_entrada_prog INTO v_cruza, v_entrada_prog
    FROM public.rh_empleados WHERE id = v_emp;
  v_cruza := COALESCE(v_cruza, false);

  v_shift := CASE WHEN v_cruza AND v_op = 'SALIDA' THEN v_fecha_marcaje - 1 ELSE v_fecha_marcaje END;

  IF v_cruza THEN
    -- El turno de v_shift junta la ENTRADA de v_shift con la SALIDA del día
    -- siguiente (v_shift + 1), sin importar la hora exacta de cada una.
    SELECT min(fecha_hora) FILTER (WHERE operacion = 'ENTRADA' AND fecha = v_shift),
           max(fecha_hora) FILTER (WHERE operacion = 'SALIDA'  AND fecha = v_shift + 1)
      INTO v_ent, v_sal
      FROM public.rh_checadas
     WHERE empleado_id = v_emp AND fecha IN (v_shift, v_shift + 1);
  ELSE
    SELECT min(fecha_hora) FILTER (WHERE operacion = 'ENTRADA'),
           max(fecha_hora) FILTER (WHERE operacion = 'SALIDA')
      INTO v_ent, v_sal
      FROM public.rh_checadas
     WHERE empleado_id = v_emp AND fecha = v_shift;
  END IF;

  IF v_ent IS NULL AND v_sal IS NULL THEN
    DELETE FROM public.rh_asistencia WHERE empleado_id = v_emp AND fecha = v_shift;
    RETURN NULL;
  END IF;

  -- El horario programado manda si existe; si no, se sigue leyendo el
  -- primer HH:MM del texto libre (compatibilidad con quien no lo tenga
  -- capturado todavía).
  SELECT COALESCE(
           v_entrada_prog,
           (substring(horario_trabajo from '(\d{1,2}:\d{2})'))::time,
           ((substring(horario_trabajo from '(\d{1,2})\s*[-–]\s*\d') || ':00'))::time,
           '08:00'::time)
    INTO v_ref FROM public.rh_empleados WHERE id = v_emp;
  v_ref := COALESCE(v_ref, '08:00'::time);

  -- Con timestamp completo (no solo ::time) el cálculo de minutos trabajados
  -- da bien aunque la salida caiga al día siguiente.
  v_min := CASE WHEN v_ent IS NOT NULL AND v_sal IS NOT NULL
                THEN EXTRACT(epoch FROM (v_sal - v_ent))::int / 60 END;
  v_ret := CASE WHEN v_ent IS NOT NULL
                THEN GREATEST(0, EXTRACT(epoch FROM (v_ent::time - v_ref))::int / 60) ELSE 0 END;
  IF v_ret <= 5 THEN v_ret := 0; END IF;

  INSERT INTO public.rh_asistencia
    (empleado_id, fecha, hora_entrada, hora_salida, minutos_trabajados, minutos_retardo, estado, fuente)
  VALUES
    (v_emp, v_shift, v_ent::time, v_sal::time, v_min, v_ret,
     CASE WHEN v_ent IS NULL THEN 'FALTA' WHEN v_ret > 10 THEN 'RETARDO' ELSE 'PRESENTE' END,
     'CHECADAS')
  ON CONFLICT (empleado_id, fecha) DO UPDATE SET
    hora_entrada = EXCLUDED.hora_entrada, hora_salida = EXCLUDED.hora_salida,
    minutos_trabajados = EXCLUDED.minutos_trabajados, minutos_retardo = EXCLUDED.minutos_retardo,
    estado = EXCLUDED.estado, fuente = EXCLUDED.fuente;
  RETURN NULL;
END $fn$;

-- ─────────────────────────────────────────────────────────────
-- 3. Repara lo ya importado de Humberto y Demetrio: sus checadas quedaron
--    mal etiquetadas (el importador viejo alternaba por día, no por
--    empleado, así que el marcaje que cerraba el turno de ayer se guardó
--    como ENTRADA de hoy). Se limpia todo lo suyo para que se vuelva a
--    importar con el parser corregido.
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.rh_asistencia
 WHERE empleado_id IN (
   SELECT id FROM public.rh_empleados
    WHERE (nombre ILIKE 'HUMBERTO' AND apellido_pat ILIKE 'ROMERO')
       OR (nombre ILIKE 'DEMETRIO' AND apellido_pat ILIKE 'MART%')
 );

DELETE FROM public.rh_checadas
 WHERE empleado_id IN (
   SELECT id FROM public.rh_empleados
    WHERE (nombre ILIKE 'HUMBERTO' AND apellido_pat ILIKE 'ROMERO')
       OR (nombre ILIKE 'DEMETRIO' AND apellido_pat ILIKE 'MART%')
 );

NOTIFY pgrst, 'reload schema';
