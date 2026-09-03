-- ================================================================
-- MIGRACIÓN 016: Agregar forma_pago a rh_empleados
-- Actualizar vista prp_empleados para incluir horario/descanso/forma_pago
-- Poblar datos reales de los 7 empleados Plaza IWOL
-- ================================================================

-- 1. Agregar columna forma_pago si no existe
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS forma_pago TEXT DEFAULT 'TRANSFERENCIA';

-- Constraint: solo valores válidos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rh_empleados_forma_pago_check'
  ) THEN
    ALTER TABLE public.rh_empleados
      ADD CONSTRAINT rh_empleados_forma_pago_check
      CHECK (forma_pago IN ('TRANSFERENCIA','EFECTIVO','MIXTO'));
  END IF;
END $$;

-- 2. Actualizar los 7 empleados con sus datos correctos
-- (horario y dia_descanso ya fueron cargados en migración 014)
UPDATE public.rh_empleados
SET forma_pago = CASE
  WHEN nombre LIKE '%VERÓNICA%'         THEN 'TRANSFERENCIA'  -- toda por transferencia
  WHEN nombre LIKE '%LUIS FERNANDO%'    THEN 'MIXTO'          -- $2,205 transfer + $795 efectivo
  WHEN nombre LIKE '%HUMBERTO%'         THEN 'TRANSFERENCIA'  -- toda por transferencia
  WHEN nombre LIKE '%DEMETRIO%'         THEN 'TRANSFERENCIA'  -- toda por transferencia
  WHEN nombre LIKE '%MARIA DEL CARMEN%' THEN 'EFECTIVO'       -- toda en efectivo
  WHEN nombre LIKE '%RENÉ%'             THEN 'TRANSFERENCIA'  -- toda por transferencia
  WHEN nombre LIKE '%JUAN%'             THEN 'EFECTIVO'       -- toda en efectivo
  ELSE forma_pago
END
WHERE departamento = 'Plaza IWOL';

-- 3. Recrear vista prp_empleados con los campos nuevos
-- DROP CASCADE porque CREATE OR REPLACE no permite cambiar orden de columnas
DROP VIEW IF EXISTS public.prp_empleados CASCADE;
CREATE VIEW public.prp_empleados AS
SELECT
  e.id,
  e.numero_empleado,
  ((e.nombre || ' '::text) || e.apellido_pat)
    || COALESCE(' '::text || NULLIF(e.apellido_mat, ''), '') AS nombre_completo,
  e.nombre,
  e.apellido_pat,
  e.apellido_mat,
  e.sexo,
  e.puesto,
  e.area,
  e.departamento,
  e.fecha_ingreso,
  e.salario_diario,
  ROUND(e.salario_diario * 30.4, 2)   AS salario_mensual,
  e.rfc,
  e.curp,
  e.nss,
  e.email,
  e.celular,
  e.foto_url,
  e.estado_id,
  e.notas,
  -- ── Nuevos campos ──
  e.horario_trabajo,
  e.dia_descanso,
  e.forma_pago,
  -- ── Contrato activo ──
  c.id              AS contrato_id,
  c.tipo_contrato   AS tipo_contrato_id,
  CASE c.tipo_contrato
    WHEN 'TEMPORAL_3SEM' THEN 'Temporal 3 semanas'
    WHEN 'TEMPORAL_30D'  THEN 'Temporal 30 días'
    WHEN 'INDEFINIDO'    THEN 'Tiempo indefinido'
    WHEN 'PRUEBA_90'     THEN 'Prueba 90 días'
    ELSE COALESCE(c.tipo_contrato, 'Sin contrato')
  END               AS tipo_contrato_nombre,
  c.fecha_inicio    AS contrato_inicio,
  c.fecha_fin       AS contrato_fin,
  CASE
    WHEN c.fecha_fin IS NULL                                 THEN 'INDETERMINADO'
    WHEN c.fecha_fin < CURRENT_DATE                          THEN 'VENCIDO'
    WHEN c.fecha_fin < CURRENT_DATE + INTERVAL '7 days'     THEN 'CRITICO'
    WHEN c.fecha_fin < CURRENT_DATE + INTERVAL '21 days'    THEN 'ALERTA'
    ELSE 'OK'
  END               AS semaforo_contrato,
  CURRENT_DATE - e.fecha_ingreso AS dias_antiguedad
FROM public.rh_empleados e
LEFT JOIN public.rh_contratos c
  ON c.empleado_id = e.id AND c.activo = TRUE;

-- 4. También actualizar función crear_empleado si existe, para soportar
--    los nuevos parámetros. Detectamos si existe y la reemplazamos.
DO $upd_fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'crear_empleado'
  ) THEN
    -- Agregar los tres parámetros nuevos con valor default NULL
    -- para no romper llamadas existentes
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.crear_empleado(
        p_nombre            TEXT,
        p_apellido_pat      TEXT,
        p_apellido_mat      TEXT DEFAULT NULL,
        p_sexo              TEXT DEFAULT 'M',
        p_rfc               TEXT DEFAULT NULL,
        p_curp              TEXT DEFAULT NULL,
        p_nss               TEXT DEFAULT NULL,
        p_fecha_nacimiento  DATE DEFAULT NULL,
        p_fecha_ingreso     DATE DEFAULT CURRENT_DATE,
        p_puesto            TEXT DEFAULT NULL,
        p_area              TEXT DEFAULT NULL,
        p_departamento      TEXT DEFAULT NULL,
        p_salario_diario    NUMERIC DEFAULT NULL,
        p_email             TEXT DEFAULT NULL,
        p_celular           TEXT DEFAULT NULL,
        p_tipo_contrato     TEXT DEFAULT 'TEMPORAL_3SEM',
        p_fecha_fin_contrato DATE DEFAULT NULL,
        p_horario_trabajo   TEXT DEFAULT NULL,
        p_dia_descanso      TEXT DEFAULT NULL,
        p_forma_pago        TEXT DEFAULT 'TRANSFERENCIA'
      )
      RETURNS UUID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_emp_id UUID;
      BEGIN
        INSERT INTO public.rh_empleados (
          nombre, apellido_pat, apellido_mat, sexo,
          rfc, curp, nss, fecha_nacimiento,
          fecha_ingreso, puesto, area, departamento,
          salario_diario, email, celular, estado_id,
          horario_trabajo, dia_descanso, forma_pago
        ) VALUES (
          p_nombre, p_apellido_pat, NULLIF(p_apellido_mat, ''), p_sexo,
          NULLIF(p_rfc,''), NULLIF(p_curp,''), NULLIF(p_nss,''), p_fecha_nacimiento,
          COALESCE(p_fecha_ingreso, CURRENT_DATE),
          NULLIF(p_puesto,''), NULLIF(p_area,''), NULLIF(p_departamento,''),
          p_salario_diario, NULLIF(p_email,''), NULLIF(p_celular,''), 'ACTIVO',
          NULLIF(p_horario_trabajo,''), NULLIF(p_dia_descanso,''),
          COALESCE(p_forma_pago, 'TRANSFERENCIA')
        ) RETURNING id INTO v_emp_id;

        IF p_tipo_contrato IS NOT NULL THEN
          INSERT INTO public.rh_contratos (
            empleado_id, tipo_contrato, fecha_inicio, fecha_fin,
            salario_diario, activo
          ) VALUES (
            v_emp_id, p_tipo_contrato,
            COALESCE(p_fecha_ingreso, CURRENT_DATE), p_fecha_fin_contrato,
            p_salario_diario, TRUE
          );
        END IF;

        RETURN v_emp_id;
      END;
      $$;
    $fn$;
  END IF;
END $upd_fn$;

-- Verificar
SELECT numero_empleado, nombre, horario_trabajo, dia_descanso, forma_pago
FROM public.rh_empleados ORDER BY numero_empleado;
