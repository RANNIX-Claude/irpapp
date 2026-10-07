-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: fn_asistente_ingresos y asistente_ingresos
-- prp_ingresos perdió la columna `clasificacion` en 20260929300000_rol_finanzas
-- La función y la vista se actualizan para coincidir con el esquema actual.
-- ═══════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.asistente_ingresos;
DROP FUNCTION IF EXISTS public.fn_asistente_ingresos();

CREATE OR REPLACE FUNCTION public.fn_asistente_ingresos()
RETURNS TABLE (
  id               bigint,
  fecha            date,
  tipo             text,
  mes              integer,
  anio             integer,
  importe          numeric(14,2),
  factura          text,
  nota             text,
  origen           text,
  concepto_origen  text,
  contrato_id      uuid,
  folio            text,
  arrendatario_nombre text,
  locales_display  text,
  estatus_validacion text,
  forma_pago       text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    id, fecha, tipo, mes, anio, importe, factura, nota, origen, concepto_origen,
    contrato_id, folio, arrendatario_nombre, locales_display,
    estatus_validacion, forma_pago
  FROM public.prp_ingresos
  WHERE public.es_asistente() OR public.es_staff()
$$;

CREATE OR REPLACE VIEW public.asistente_ingresos
  WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_ingresos();

GRANT SELECT ON public.asistente_ingresos TO authenticated;

NOTIFY pgrst, 'reload schema';
