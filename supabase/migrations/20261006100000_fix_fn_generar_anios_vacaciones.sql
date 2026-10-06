-- Migración completa de vacaciones: catálogo LFT, columnas y función
-- Equivale a 20260925100000_vacaciones_registro_control.sql que no se había aplicado en prod.

-- 1. Catálogo de días por año laboral (LFT reforma 2023)
CREATE TABLE IF NOT EXISTS public.cat_vacaciones_dias (
  id          serial  PRIMARY KEY,
  anio_numero integer NOT NULL,
  dias        integer NOT NULL,
  vigente     boolean NOT NULL DEFAULT true,
  notas       text
);
CREATE UNIQUE INDEX IF NOT EXISTS cat_vac_anio_vigente
  ON public.cat_vacaciones_dias (anio_numero) WHERE vigente = true;

INSERT INTO public.cat_vacaciones_dias (anio_numero, dias, notas) VALUES
  ( 1,12,'LFT Art. 76 — reforma 2023'),( 2,14,'LFT Art. 76 — reforma 2023'),
  ( 3,16,'LFT Art. 76 — reforma 2023'),( 4,18,'LFT Art. 76 — reforma 2023'),
  ( 5,20,'LFT Art. 76 — reforma 2023'),( 6,20,NULL),( 7,20,NULL),( 8,20,NULL),
  ( 9,20,NULL),(10,22,'LFT Art. 76: +2 días c/5 años de servicio'),
  (11,22,NULL),(12,22,NULL),(13,22,NULL),(14,22,NULL),
  (15,24,NULL),(16,24,NULL),(17,24,NULL),(18,24,NULL),(19,24,NULL),
  (20,26,NULL),(21,26,NULL),(22,26,NULL),(23,26,NULL),(24,26,NULL),
  (25,28,NULL),(26,28,NULL),(27,28,NULL),(28,28,NULL),(29,28,NULL),(30,30,NULL)
ON CONFLICT DO NOTHING;

ALTER TABLE public.cat_vacaciones_dias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_lee   ON public.cat_vacaciones_dias;
DROP POLICY IF EXISTS staff_escr ON public.cat_vacaciones_dias;
CREATE POLICY auth_lee   ON public.cat_vacaciones_dias FOR SELECT TO authenticated USING (true);
CREATE POLICY staff_escr ON public.cat_vacaciones_dias FOR ALL    TO authenticated
  USING (es_staff()) WITH CHECK (es_staff());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cat_vacaciones_dias TO authenticated, service_role;

-- 2. Columnas adicionales en rh_vacaciones_anio
ALTER TABLE public.rh_vacaciones_anio
  ADD COLUMN IF NOT EXISTS fecha_inicio_anio date,
  ADD COLUMN IF NOT EXISTS fecha_fin_anio    date,
  ADD COLUMN IF NOT EXISTS prima_cubierta    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prima_fecha       date;

-- 3. Columnas adicionales en rh_vacaciones_detalle
ALTER TABLE public.rh_vacaciones_detalle
  ADD COLUMN IF NOT EXISTS autorizado_por_nombre text,
  ADD COLUMN IF NOT EXISTS registrado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS registrado_en  timestamptz DEFAULT now();

-- 4. Función: genera filas rh_vacaciones_anio a partir de fecha_ingreso
--    Cast explícito a ::date antes de restar para evitar "timestamp - integer"
CREATE OR REPLACE FUNCTION public.fn_generar_anios_vacaciones(p_emp uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fi    date; v_anios integer; v_i integer;
  v_inicio date; v_fin date; v_dias integer;
BEGIN
  SELECT fecha_ingreso INTO v_fi FROM rh_empleados WHERE id = p_emp;
  IF v_fi IS NULL THEN RETURN; END IF;

  v_anios := FLOOR(EXTRACT(EPOCH FROM AGE(CURRENT_DATE, v_fi)) / (365.25 * 86400))::integer;

  FOR v_i IN 1..GREATEST(v_anios, 1) LOOP
    v_inicio := (v_fi + ((v_i - 1) * interval '1 year'))::date;
    v_fin    := (v_fi + (v_i      * interval '1 year'))::date - 1;

    SELECT dias INTO v_dias FROM cat_vacaciones_dias WHERE anio_numero = v_i AND vigente = true;
    IF v_dias IS NULL THEN
      SELECT dias INTO v_dias FROM cat_vacaciones_dias
        WHERE anio_numero = (SELECT MAX(anio_numero) FROM cat_vacaciones_dias WHERE vigente = true);
    END IF;

    INSERT INTO rh_vacaciones_anio (empleado_id, anio, dias_derecho, fecha_inicio_anio, fecha_fin_anio)
    VALUES (p_emp, v_i, COALESCE(v_dias, 12), v_inicio, v_fin)
    ON CONFLICT (empleado_id, anio) DO UPDATE
      SET dias_derecho      = COALESCE(v_dias, 12),
          fecha_inicio_anio = v_inicio,
          fecha_fin_anio    = v_fin
      WHERE rh_vacaciones_anio.dias_derecho != COALESCE(v_dias, 12)
         OR rh_vacaciones_anio.fecha_inicio_anio IS NULL;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generar_anios_vacaciones(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_generar_anios_vacaciones(uuid) FROM PUBLIC;

-- 5. Vistas: recrear con las columnas nuevas
CREATE OR REPLACE VIEW public.prp_vacaciones_anio
  WITH (security_invoker = true) AS
SELECT
  a.id,
  a.empleado_id,
  a.anio                           AS anio_numero,
  a.fecha_inicio_anio,
  a.fecha_fin_anio,
  a.dias_derecho,
  a.dias_tomados,
  a.dias_disponibles,
  a.prima_cubierta,
  a.prima_fecha,
  a.notas,
  a.created_at,
  e.numero_empleado,
  e.nombre || ' ' || e.apellido_pat AS nombre_completo,
  e.puesto,
  e.area,
  e.fecha_ingreso,
  CASE WHEN a.fecha_fin_anio < CURRENT_DATE AND a.dias_disponibles > 0
    THEN true ELSE false
  END AS anio_vencido
FROM public.rh_vacaciones_anio a
JOIN public.rh_empleados        e ON e.id = a.empleado_id;

GRANT SELECT ON public.prp_vacaciones_anio TO authenticated, service_role;

CREATE OR REPLACE VIEW public.prp_vacaciones_detalle
  WITH (security_invoker = true) AS
SELECT
  d.id,
  d.empleado_id,
  d.anio                           AS anio_numero,
  d.fecha_inicio,
  d.fecha_fin,
  d.dias,
  d.monto,
  d.prima,
  d.estado,
  d.notas,
  d.autorizado_por_nombre,
  d.registrado_por,
  d.registrado_en,
  e.numero_empleado,
  e.nombre || ' ' || e.apellido_pat AS nombre_completo,
  e.puesto,
  e.area,
  (d.fecha_inicio <= CURRENT_DATE AND d.fecha_fin >= CURRENT_DATE) AS en_curso
FROM public.rh_vacaciones_detalle d
JOIN public.rh_empleados           e ON e.id = d.empleado_id;

GRANT SELECT ON public.prp_vacaciones_detalle TO authenticated, service_role;
