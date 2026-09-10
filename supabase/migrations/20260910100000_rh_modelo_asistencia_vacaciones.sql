-- MIGRACIÓN: modelo de RH según el diagrama de entidades
--
-- Cinco cambios, todos alrededor del empleado:
--
--   1. Asistencia pasa a ser EVENTO, no día.
--      Hoy rh_asistencia guarda un renglón por empleado y día con hora_entrada
--      y hora_salida. El diagrama pide (Empleado, Operación, FechaHora): cada
--      marcaje del checador es un hecho. Se crea rh_checadas para eso y
--      rh_asistencia queda como la consolidación diaria, alimentada por
--      trigger. Así el reporte semanal puede pintar entrada y salida de lunes
--      a domingo, y si alguien checa cuatro veces en un día no se pierde nada.
--      rh_asistencia está vacía hoy, así que no hay datos que migrar.
--
--   2. Tipo de incidencia deja de ser texto libre y pasa a catálogo.
--   3. La incidencia gana rango de fechas y monto.
--   4. Vacaciones: saldo por año + detalle de los períodos tomados.
--   5. Histórico de sueldos gana fecha_fin, para que cada sueldo sea un
--      período con principio y fin, no solo la fecha del cambio.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CHECADAS — el marcaje individual
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_checadas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id  uuid REFERENCES public.rh_empleados(id) ON DELETE CASCADE,
  -- Se conserva el número tal como viene del checador: hay marcajes que llegan
  -- antes de que el empleado exista en el catálogo, y perderlos sería peor.
  numero_empleado_ext text,
  operacion    text NOT NULL CHECK (operacion IN ('ENTRADA','SALIDA')),
  -- Hora de pared del reloj checador. Sin zona horaria a propósito: el aparato
  -- reporta la hora local y convertirla dos veces es de donde salen los turnos
  -- que aparecen corridos una hora.
  fecha_hora   timestamp NOT NULL,
  fecha        date GENERATED ALWAYS AS (fecha_hora::date) STORED,
  origen       text NOT NULL DEFAULT 'MANUAL',
  notas        text,
  created_at   timestamptz DEFAULT now()
);

-- Idempotencia del import: volver a cargar el mismo archivo no duplica.
-- Sin filtro parcial a propósito: el upsert de PostgREST necesita inferir el
-- índice a partir de las columnas, y un índice parcial no se infiere. Los
-- marcajes sin empleado asignado (empleado_id NULL) sí pueden repetirse, porque
-- en un UNIQUE dos NULL no chocan; se depuran al asignarles empleado.
DROP INDEX IF EXISTS public.rh_checadas_unica;
CREATE UNIQUE INDEX IF NOT EXISTS rh_checadas_unica
  ON public.rh_checadas (empleado_id, fecha_hora, operacion);
CREATE INDEX IF NOT EXISTS rh_checadas_emp_fecha ON public.rh_checadas (empleado_id, fecha);

COMMENT ON TABLE public.rh_checadas IS
  'Marcaje individual de entrada o salida. Fuente de verdad de la asistencia; rh_asistencia se deriva de aqui.';

-- ── Consolidación diaria ────────────────────────────────────────────────────
-- Primera entrada y última salida del día. El retardo se mide contra la hora
-- que diga el horario del empleado (se lee el primer HH:MM del texto libre) y
-- si no hay horario, contra las 08:00 con 5 minutos de tolerancia, que es lo
-- que ya hacía el importador del checador.
CREATE OR REPLACE FUNCTION public.fn_consolidar_dia_asistencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_emp   uuid;
  v_fecha date;
  v_ent   time;
  v_sal   time;
  v_ref   time;
  v_min   integer;
  v_ret   integer;
BEGIN
  v_emp   := COALESCE(NEW.empleado_id, OLD.empleado_id);
  v_fecha := COALESCE(NEW.fecha,       OLD.fecha);
  IF v_emp IS NULL THEN RETURN NULL; END IF;

  SELECT min(fecha_hora::time) FILTER (WHERE operacion = 'ENTRADA'),
         max(fecha_hora::time) FILTER (WHERE operacion = 'SALIDA')
    INTO v_ent, v_sal
    FROM public.rh_checadas
   WHERE empleado_id = v_emp AND fecha = v_fecha;

  -- Sin marcajes: se borra el día consolidado.
  IF v_ent IS NULL AND v_sal IS NULL THEN
    DELETE FROM public.rh_asistencia WHERE empleado_id = v_emp AND fecha = v_fecha;
    RETURN NULL;
  END IF;

  -- El horario es texto libre y llega de varias formas:
  --   'Lunes a Domingo 14:30-21:30 hrs'  -> 14:30   (primer HH:MM)
  --   'Lunes a Viernes 9-17 hrs'         -> 09:00   (primer entero antes del guion)
  --   'Lunes a Domingo 12h x 12h'        -> 08:00   (sin rango: se usa el default)
  SELECT COALESCE(
           (substring(horario_trabajo from '(\d{1,2}:\d{2})'))::time,
           ((substring(horario_trabajo from '(\d{1,2})\s*[-–]\s*\d') || ':00'))::time,
           '08:00'::time)
    INTO v_ref FROM public.rh_empleados WHERE id = v_emp;
  v_ref := COALESCE(v_ref, '08:00'::time);

  v_min := CASE WHEN v_ent IS NOT NULL AND v_sal IS NOT NULL
                THEN EXTRACT(epoch FROM (v_sal - v_ent))::int / 60 END;
  v_ret := CASE WHEN v_ent IS NOT NULL
                THEN GREATEST(0, EXTRACT(epoch FROM (v_ent - v_ref))::int / 60) ELSE 0 END;
  IF v_ret <= 5 THEN v_ret := 0; END IF;   -- tolerancia

  INSERT INTO public.rh_asistencia
    (empleado_id, fecha, hora_entrada, hora_salida, minutos_trabajados, minutos_retardo, estado, fuente)
  VALUES
    (v_emp, v_fecha, v_ent, v_sal, v_min, v_ret,
     CASE WHEN v_ent IS NULL THEN 'FALTA' WHEN v_ret > 10 THEN 'RETARDO' ELSE 'PRESENTE' END,
     'CHECADAS')
  ON CONFLICT (empleado_id, fecha) DO UPDATE SET
    hora_entrada = EXCLUDED.hora_entrada, hora_salida = EXCLUDED.hora_salida,
    minutos_trabajados = EXCLUDED.minutos_trabajados, minutos_retardo = EXCLUDED.minutos_retardo,
    estado = EXCLUDED.estado, fuente = EXCLUDED.fuente;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS trg_checada_consolida ON public.rh_checadas;
CREATE TRIGGER trg_checada_consolida
  AFTER INSERT OR UPDATE OR DELETE ON public.rh_checadas
  FOR EACH ROW EXECUTE FUNCTION public.fn_consolidar_dia_asistencia();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CATÁLOGO DE TIPOS DE INCIDENCIA
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_tipos_incidencia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave         text NOT NULL UNIQUE,
  descripcion   text NOT NULL,
  afecta_nomina boolean NOT NULL DEFAULT true,
  requiere_monto boolean NOT NULL DEFAULT false,
  orden         integer NOT NULL DEFAULT 99,
  activo        boolean NOT NULL DEFAULT true
);

INSERT INTO public.rh_tipos_incidencia (clave, descripcion, afecta_nomina, requiere_monto, orden) VALUES
  ('INASISTENCIA',      'Inasistencia',       true,  false, 1),
  ('RETARDO',           'Retardo',            false, false, 2),
  ('PERMISO_SIN_GOCE',  'Permiso sin goce',   true,  false, 3),
  ('PERMISO_CON_GOCE',  'Permiso con goce',   false, false, 4),
  ('VACACIONES',        'Vacaciones',         false, true,  5),
  ('INCAPACIDAD',       'Incapacidad',        false, false, 6),
  ('DIA_FESTIVO',       'Dia festivo',        false, true,  7),
  ('PRIMA_VACACIONAL',  'Prima vacacional',   false, true,  8)
ON CONFLICT (clave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. INCIDENCIA: rango de fechas, monto y tipo por catálogo
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_incidencias
  ADD COLUMN IF NOT EXISTS tipo_id   uuid REFERENCES public.rh_tipos_incidencia(id),
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS monto     numeric(12,2);

-- fecha sigue siendo el inicio; fecha_fin, cuando es de un solo día, la iguala.
UPDATE public.rh_incidencias i
   SET tipo_id   = t.id,
       fecha_fin = COALESCE(i.fecha_fin, i.fecha)
  FROM public.rh_tipos_incidencia t
 WHERE t.clave = i.tipo AND i.tipo_id IS NULL;

COMMENT ON COLUMN public.rh_incidencias.fecha     IS 'Inicio de la incidencia';
COMMENT ON COLUMN public.rh_incidencias.fecha_fin IS 'Fin de la incidencia; igual a fecha cuando dura un solo dia';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VACACIONES — saldo por año y detalle de los períodos tomados
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rh_vacaciones_anio (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id  uuid NOT NULL REFERENCES public.rh_empleados(id) ON DELETE CASCADE,
  anio         integer NOT NULL,
  -- Días que le corresponden por ley según antigüedad. Desde la reforma de
  -- 2023 son 12 el primer año y suben 2 por año hasta 20, luego 2 cada 5 años.
  dias_derecho    numeric(5,1) NOT NULL DEFAULT 12,
  dias_tomados    numeric(5,1) NOT NULL DEFAULT 0,
  dias_disponibles numeric(5,1) GENERATED ALWAYS AS (dias_derecho - dias_tomados) STORED,
  notas        text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (empleado_id, anio)
);

CREATE TABLE IF NOT EXISTS public.rh_vacaciones_detalle (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id  uuid NOT NULL REFERENCES public.rh_empleados(id) ON DELETE CASCADE,
  anio         integer NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin    date NOT NULL,
  dias         numeric(5,1) NOT NULL,
  monto        numeric(12,2),
  prima        numeric(12,2),
  estado       text NOT NULL DEFAULT 'TOMADA' CHECK (estado IN ('SOLICITADA','AUTORIZADA','TOMADA','CANCELADA')),
  notas        text,
  created_at   timestamptz DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);
CREATE INDEX IF NOT EXISTS rh_vac_det_emp ON public.rh_vacaciones_detalle (empleado_id, anio);

-- Los días tomados del año son la suma del detalle, nunca un número capturado
-- aparte: dos lugares donde escribir el mismo dato es un lugar donde se
-- contradicen.
CREATE OR REPLACE FUNCTION public.fn_recalcular_vacaciones_anio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_emp uuid; v_anio integer;
BEGIN
  v_emp  := COALESCE(NEW.empleado_id, OLD.empleado_id);
  v_anio := COALESCE(NEW.anio,        OLD.anio);

  INSERT INTO public.rh_vacaciones_anio (empleado_id, anio)
  VALUES (v_emp, v_anio) ON CONFLICT (empleado_id, anio) DO NOTHING;

  UPDATE public.rh_vacaciones_anio a
     SET dias_tomados = COALESCE((
       SELECT sum(d.dias) FROM public.rh_vacaciones_detalle d
        WHERE d.empleado_id = v_emp AND d.anio = v_anio
          AND d.estado IN ('AUTORIZADA','TOMADA')), 0)
   WHERE a.empleado_id = v_emp AND a.anio = v_anio;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS trg_vac_recalcula ON public.rh_vacaciones_detalle;
CREATE TRIGGER trg_vac_recalcula
  AFTER INSERT OR UPDATE OR DELETE ON public.rh_vacaciones_detalle
  FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_vacaciones_anio();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. HISTÓRICO DE SUELDOS — período con inicio y fin
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rh_historial_sueldo
  ADD COLUMN IF NOT EXISTS fecha_fin date;

COMMENT ON COLUMN public.rh_historial_sueldo.fecha_fin IS
  'Ultimo dia con ese sueldo. NULL = vigente. Lo cierra el trigger cuando entra un cambio posterior.';

-- Al registrar un cambio de sueldo se cierra el período anterior el día antes.
CREATE OR REPLACE FUNCTION public.fn_cerrar_sueldo_anterior()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE public.rh_historial_sueldo
     SET fecha_fin = NEW.fecha - 1
   WHERE empleado_id = NEW.empleado_id
     AND id <> NEW.id
     AND fecha < NEW.fecha
     AND fecha_fin IS NULL;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS trg_cierra_sueldo ON public.rh_historial_sueldo;
CREATE TRIGGER trg_cierra_sueldo
  AFTER INSERT ON public.rh_historial_sueldo
  FOR EACH ROW EXECUTE FUNCTION public.fn_cerrar_sueldo_anterior();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — mismo criterio que el resto de rh_*: acceso para autenticados
-- ═══════════════════════════════════════════════════════════════════════════
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rh_checadas','rh_tipos_incidencia','rh_vacaciones_anio','rh_vacaciones_detalle'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_%s ON public.%I', t, t);
    EXECUTE format('CREATE POLICY auth_%s ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTAS prp_* — el frontend lee de aquí
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.prp_checadas AS
SELECT c.id, c.empleado_id, c.operacion, c.fecha_hora, c.fecha,
       c.fecha_hora::time AS hora, c.origen, c.notas,
       COALESCE(e.numero_empleado, c.numero_empleado_ext) AS numero_empleado,
       COALESCE(e.nombre || ' ' || e.apellido_pat, '(sin empleado)') AS nombre_completo
  FROM public.rh_checadas c
  LEFT JOIN public.rh_empleados e ON e.id = c.empleado_id;

CREATE OR REPLACE VIEW public.prp_tipos_incidencia AS
SELECT id, clave, descripcion, afecta_nomina, requiere_monto, orden, activo
  FROM public.rh_tipos_incidencia WHERE activo;

CREATE OR REPLACE VIEW public.prp_vacaciones_anio AS
SELECT a.id, a.empleado_id, a.anio, a.dias_derecho, a.dias_tomados, a.dias_disponibles, a.notas,
       e.numero_empleado, e.nombre || ' ' || e.apellido_pat AS nombre_completo
  FROM public.rh_vacaciones_anio a
  JOIN public.rh_empleados e ON e.id = a.empleado_id;

CREATE OR REPLACE VIEW public.prp_vacaciones_detalle AS
SELECT d.id, d.empleado_id, d.anio, d.fecha_inicio, d.fecha_fin, d.dias, d.monto, d.prima,
       d.estado, d.notas, e.numero_empleado,
       e.nombre || ' ' || e.apellido_pat AS nombre_completo
  FROM public.rh_vacaciones_detalle d
  JOIN public.rh_empleados e ON e.id = d.empleado_id;

CREATE OR REPLACE VIEW public.prp_historico_sueldos AS
SELECT h.id, h.empleado_id, h.fecha AS fecha_inicio, h.fecha_fin,
       h.sueldo_nuevo AS monto, h.sueldo_anterior, h.motivo, h.tipo,
       (h.fecha_fin IS NULL) AS vigente,
       e.numero_empleado, e.nombre || ' ' || e.apellido_pat AS nombre_completo
  FROM public.rh_historial_sueldo h
  JOIN public.rh_empleados e ON e.id = h.empleado_id;

-- ── La que alimenta el reporte semanal de nómina ────────────────────────────
-- Un renglón por empleado y día con la primera entrada y la última salida.
-- La semana arranca en lunes (date_trunc('week') en Postgres ya es ISO).
CREATE OR REPLACE VIEW public.prp_asistencia_semana AS
SELECT c.empleado_id,
       date_trunc('week', c.fecha)::date AS semana_inicio,
       c.fecha,
       EXTRACT(isodow FROM c.fecha)::int AS dia_semana,   -- 1 lunes … 7 domingo
       min(c.fecha_hora) FILTER (WHERE c.operacion = 'ENTRADA')::time AS entrada,
       max(c.fecha_hora) FILTER (WHERE c.operacion = 'SALIDA')::time  AS salida,
       count(*) AS marcajes
  FROM public.rh_checadas c
 WHERE c.empleado_id IS NOT NULL
 GROUP BY 1, 2, 3, 4;

COMMENT ON VIEW public.prp_asistencia_semana IS
  'Entrada y salida por dia para el reporte semanal de nomina. dia_semana: 1=lunes ... 7=domingo.';

NOTIFY pgrst, 'reload schema';
