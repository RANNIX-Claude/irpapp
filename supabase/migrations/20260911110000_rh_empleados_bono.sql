-- ================================================================
-- Agrega bono y forma de pago del bono a rh_empleados. El bono
-- puede pagarse por una forma distinta al sueldo (uno en efectivo,
-- el otro en transferencia), así que la nómina debe sumar cada
-- total por separado en vez de tratar todo el pago como un bloque.
-- ================================================================

ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS bono NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forma_pago_bono TEXT DEFAULT 'TRANSFERENCIA';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rh_empleados_forma_pago_bono_check'
  ) THEN
    ALTER TABLE public.rh_empleados
      ADD CONSTRAINT rh_empleados_forma_pago_bono_check
      CHECK (forma_pago_bono IN ('TRANSFERENCIA','EFECTIVO'));
  END IF;
END $$;

-- Recrear vista prp_empleados con los campos nuevos
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
  e.horario_trabajo,
  e.dia_descanso,
  e.forma_pago,
  e.tipo_contratacion,
  -- ── Nuevos campos ──
  e.bono,
  e.forma_pago_bono,
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
