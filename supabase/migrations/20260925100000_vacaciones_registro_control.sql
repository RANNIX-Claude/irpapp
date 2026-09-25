-- ═══════════════════════════════════════════════════════════════════════════
-- CONTROL DE VACACIONES — catálogo LFT + registro de períodos
-- ═══════════════════════════════════════════════════════════════════════════
-- Extiende las tablas rh_vacaciones_anio y rh_vacaciones_detalle que ya
-- existen (20260910100000). Agrega:
--   1. cat_vacaciones_dias  — días por año laboral, editable si cambia la ley
--   2. Columnas de fecha de período y prima en rh_vacaciones_anio
--   3. Columnas de auditoría en rh_vacaciones_detalle
--   4. Función que genera los renglones de rh_vacaciones_anio a partir de
--      fecha_ingreso (sin UI, para semilla/corrección)
--   5. Vistas actualizadas prp_vacaciones_anio / prp_vacaciones_detalle
--   6. Vista prp_vacaciones_activas (quién está de vacaciones hoy)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Catálogo de días por año laboral (editable)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cat_vacaciones_dias (
  id           serial  PRIMARY KEY,
  anio_numero  integer NOT NULL,   -- 1 = primer año laboral, 2 = segundo…
  dias         integer NOT NULL,
  vigente      boolean NOT NULL DEFAULT true,
  notas        text
);

-- Índice único sobre el número de año activo para que la búsqueda sea rápida
CREATE UNIQUE INDEX IF NOT EXISTS cat_vac_anio_vigente
  ON public.cat_vacaciones_dias (anio_numero)
  WHERE vigente = true;

-- Semilla LFT México (reforma 2023: mínimo 12 días año 1, +2 cada año hasta 20)
INSERT INTO public.cat_vacaciones_dias (anio_numero, dias, notas) VALUES
  ( 1, 12, 'LFT Art. 76 — reforma 2023'),
  ( 2, 14, 'LFT Art. 76 — reforma 2023'),
  ( 3, 16, 'LFT Art. 76 — reforma 2023'),
  ( 4, 18, 'LFT Art. 76 — reforma 2023'),
  ( 5, 20, 'LFT Art. 76 — reforma 2023'),
  ( 6, 20, NULL),
  ( 7, 20, NULL),
  ( 8, 20, NULL),
  ( 9, 20, NULL),
  (10, 22, 'LFT Art. 76: +2 días c/5 años de servicio'),
  (11, 22, NULL),(12, 22, NULL),(13, 22, NULL),(14, 22, NULL),
  (15, 24, NULL),(16, 24, NULL),(17, 24, NULL),(18, 24, NULL),(19, 24, NULL),
  (20, 26, NULL),(21, 26, NULL),(22, 26, NULL),(23, 26, NULL),(24, 26, NULL),
  (25, 28, NULL),(26, 28, NULL),(27, 28, NULL),(28, 28, NULL),(29, 28, NULL),
  (30, 30, NULL)
ON CONFLICT DO NOTHING;

ALTER TABLE public.cat_vacaciones_dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_lee   ON public.cat_vacaciones_dias FOR SELECT TO authenticated USING (true);
CREATE POLICY staff_escr ON public.cat_vacaciones_dias FOR ALL    TO authenticated
  USING (es_staff()) WITH CHECK (es_staff());

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Extender rh_vacaciones_anio
--    anio = número de año laboral (1 = primer año, 2 = segundo…)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.rh_vacaciones_anio
  ADD COLUMN IF NOT EXISTS fecha_inicio_anio date,   -- inicio del año laboral (≈ aniversario)
  ADD COLUMN IF NOT EXISTS fecha_fin_anio    date,   -- fin del año laboral
  ADD COLUMN IF NOT EXISTS prima_cubierta    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prima_fecha       date;

-- Comentarios
COMMENT ON COLUMN public.rh_vacaciones_anio.anio              IS 'Número de año laboral (1=primer año, 2=segundo…)';
COMMENT ON COLUMN public.rh_vacaciones_anio.fecha_inicio_anio IS 'Fecha del aniversario que inicia este año laboral';
COMMENT ON COLUMN public.rh_vacaciones_anio.fecha_fin_anio    IS 'Fecha en que vence este año laboral';
COMMENT ON COLUMN public.rh_vacaciones_anio.prima_cubierta    IS 'True cuando la prima vacacional del año ya fue pagada';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Extender rh_vacaciones_detalle
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.rh_vacaciones_detalle
  ADD COLUMN IF NOT EXISTS autorizado_por_nombre text,        -- nombre libre (jefe no está en el sistema)
  ADD COLUMN IF NOT EXISTS registrado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS registrado_en  timestamptz DEFAULT now();

COMMENT ON COLUMN public.rh_vacaciones_detalle.autorizado_por_nombre IS 'Nombre del supervisor que autorizó verbalmente';
COMMENT ON COLUMN public.rh_vacaciones_detalle.registrado_por        IS 'Usuario del sistema que capturó el período';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Función auxiliar: generar/completar años laborales de un empleado
--    Llama fn_generar_anios_vacaciones(empleado_id) desde la UI después de
--    editar la fecha_ingreso o al crear un empleado.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_generar_anios_vacaciones(p_emp uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fi        date;
  v_anios     integer;
  v_i         integer;
  v_inicio    date;
  v_fin       date;
  v_dias      integer;
BEGIN
  SELECT fecha_ingreso INTO v_fi FROM rh_empleados WHERE id = p_emp;
  IF v_fi IS NULL THEN RETURN; END IF;

  -- Años laborales COMPLETADOS hasta hoy
  v_anios := FLOOR(EXTRACT(EPOCH FROM AGE(CURRENT_DATE, v_fi)) / (365.25 * 86400))::integer;

  FOR v_i IN 1..GREATEST(v_anios, 1) LOOP
    v_inicio := v_fi + ((v_i - 1) * interval '1 year');
    v_fin    := v_fi + (v_i      * interval '1 year') - 1;

    -- Días de la ley (máximo disponible en el catálogo)
    SELECT dias INTO v_dias FROM cat_vacaciones_dias
      WHERE anio_numero = v_i AND vigente = true;
    IF v_dias IS NULL THEN
      SELECT dias INTO v_dias FROM cat_vacaciones_dias
        WHERE anio_numero = (SELECT MAX(anio_numero) FROM cat_vacaciones_dias WHERE vigente = true);
    END IF;

    INSERT INTO rh_vacaciones_anio
      (empleado_id, anio, dias_derecho, fecha_inicio_anio, fecha_fin_anio)
    VALUES
      (p_emp, v_i, COALESCE(v_dias, 12), v_inicio, v_fin)
    ON CONFLICT (empleado_id, anio) DO UPDATE
      SET dias_derecho      = COALESCE(v_dias, 12),
          fecha_inicio_anio = v_inicio,
          fecha_fin_anio    = v_fin
      WHERE rh_vacaciones_anio.dias_derecho != COALESCE(v_dias, 12)
         OR rh_vacaciones_anio.fecha_inicio_anio IS NULL;
  END LOOP;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Vistas actualizadas
-- ───────────────────────────────────────────────────────────────────────────
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
  -- Año laboral vencido (pasó la fecha fin y aún tiene días disponibles)
  CASE WHEN a.fecha_fin_anio < CURRENT_DATE AND a.dias_disponibles > 0
    THEN true ELSE false
  END AS anio_vencido
FROM public.rh_vacaciones_anio a
JOIN public.rh_empleados        e ON e.id = a.empleado_id;

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
  -- Para resumen de nómina: ¿cae en la semana actual?
  (d.fecha_inicio <= CURRENT_DATE AND d.fecha_fin >= CURRENT_DATE) AS en_curso
FROM public.rh_vacaciones_detalle d
JOIN public.rh_empleados           e ON e.id = d.empleado_id;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Vista: quién está de vacaciones hoy
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.prp_vacaciones_activas
  WITH (security_invoker = true) AS
SELECT
  d.id,
  d.empleado_id,
  e.numero_empleado,
  e.nombre || ' ' || e.apellido_pat AS nombre_completo,
  e.puesto,
  e.area,
  d.fecha_inicio,
  d.fecha_fin,
  d.dias,
  d.anio                           AS anio_numero,
  (d.fecha_fin - CURRENT_DATE + 1) AS dias_restantes
FROM public.rh_vacaciones_detalle d
JOIN public.rh_empleados           e ON e.id = d.empleado_id
WHERE d.estado IN ('AUTORIZADA','TOMADA')
  AND d.fecha_inicio <= CURRENT_DATE
  AND d.fecha_fin    >= CURRENT_DATE
ORDER BY d.fecha_fin;

GRANT SELECT ON public.prp_vacaciones_activas TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. RLS en tablas nuevas/modificadas
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.rh_vacaciones_anio    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_vacaciones_detalle ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rh_vacaciones_anio'    AND policyname='staff_all') THEN
    CREATE POLICY staff_all ON public.rh_vacaciones_anio    FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rh_vacaciones_detalle' AND policyname='staff_all') THEN
    CREATE POLICY staff_all ON public.rh_vacaciones_detalle FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
  END IF;
END $$;
