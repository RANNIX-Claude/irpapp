-- Rol `asistente`: opera desde el chat del asistente (pensado para el celular) y
-- consulta Contratos, Personal, Proyectos, Gastos, Ingresos y Cartera en solo lectura.
--
-- Diseño de seguridad:
--   * es_staff() lo EXCLUYE. Sin esto entraría como personal con acceso a todo:
--     esconder botones en la pantalla no es seguridad, la API la puede llamar
--     cualquiera con esa sesión.
--   * Sin políticas propias sobre las tablas base: no lee ni escribe nada directo.
--   * Lo que puede ver lo ve por vistas `asistente_*` (security_invoker, como manda
--     la convención) que leen de funciones `fn_asistente_*` SECURITY DEFINER. La RLS
--     impide que el asistente lea las tablas base, así que la función las lee con los
--     privilegios del dueño y decide ella quién entra (es_asistente() OR es_staff()) y
--     qué columnas salen. Es la única forma de ocultar COLUMNAS por rol (los permisos
--     por columna son por rol de Postgres, no por rol de la aplicación): Personal sale
--     RFC, CURP, NSS ni datos bancarios (los sueldos SÍ los ve: decisión del 2026-09-25).
--   * Si se recrea una vista prp_* que alimenta estas funciones, las funciones siguen
--     valiendo mientras conserven las columnas que seleccionan (test-rls lo comprueba).
--   * Las escrituras del asistente (dar de alta, registrar tickets, aplicar pagos)
--     NO van directo: pasarán por la function `ejecutar-accion` con una matriz
--     rol × acción (fase 2).

INSERT INTO public.irp_roles (id, nombre, descripcion, nivel, activo)
VALUES ('asistente', 'Asistente',
        'Opera desde el chat del asistente (celular) y consulta contratos, personal, proyectos, gastos e ingresos en solo lectura',
        45, true)
ON CONFLICT (id) DO NOTHING;

-- ─── es_staff(): el asistente no es personal ────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT rol_id NOT IN ('arrendatario','prospecto','restaurante','locatario','asistente')
       FROM public.irp_usuarios WHERE id = auth.uid()),
    false)
$$;

CREATE OR REPLACE FUNCTION public.mi_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol_id FROM public.irp_usuarios WHERE id = auth.uid() AND activo
$$;

CREATE OR REPLACE FUNCTION public.es_asistente() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT rol_id = 'asistente' AND activo FROM public.irp_usuarios WHERE id = auth.uid()), false)
$$;

REVOKE EXECUTE ON FUNCTION public.mi_rol(), public.es_asistente() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.mi_rol(), public.es_asistente() TO authenticated, service_role;

-- ─── Vistas de consulta ─────────────────────────────────────────────────────
-- Vistas viejas (primera versión de esta migración en QA, security definer anidado).
DROP VIEW IF EXISTS public.asistente_contratos, public.asistente_personal, public.asistente_gastos,
                    public.asistente_ingresos, public.asistente_cartera;

-- Cada consulta pasa por una función SECURITY DEFINER: dentro de ella current_user es el dueño
-- (que salta la RLS de las tablas base) y ella decide quién entra y qué columnas salen. Una vista
-- security_invoker anidada dentro de otra vista definer NO sirve: sigue aplicando la RLS del
-- usuario que consulta y devuelve 0 filas. La vista sobre la función es security_invoker.
DROP FUNCTION IF EXISTS public.fn_asistente_contratos(), public.fn_asistente_personal(), public.fn_asistente_gastos(),
                        public.fn_asistente_ingresos(), public.fn_asistente_cartera();

CREATE OR REPLACE FUNCTION public.fn_asistente_contratos()
RETURNS TABLE (id uuid, folio text, arrendatario_id uuid, arrendatario_nombre text, nombre_negocio text, arrendatario_rfc text, arrendatario_email text, arrendatario_telefono text, tipo_persona text, tipo_contrato text, giro_autorizado text, fecha_inicio date, fecha_fin date, renta_mensual numeric(12,2), deposito_garantia numeric(12,2), dia_pago integer, penalizacion_pct numeric(5,2), incremento_anual_pct numeric(5,2), fiador_nombre text, pagares_cantidad integer, contrato_anterior_id uuid, estatus text, estatus_proceso text, locales_display text, semaforo_vencimiento text, dias_restantes integer, unidad_id uuid, unidad_numero text, m2_totales numeric, inmueble_nombre text, notas text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, folio, arrendatario_id, arrendatario_nombre, nombre_negocio, arrendatario_rfc, arrendatario_email, arrendatario_telefono, tipo_persona, tipo_contrato, giro_autorizado, fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago, penalizacion_pct, incremento_anual_pct, fiador_nombre, pagares_cantidad, contrato_anterior_id, estatus, estatus_proceso, locales_display, semaforo_vencimiento, dias_restantes, unidad_id, unidad_numero, m2_totales, inmueble_nombre, notas
    FROM public.prp_contratos
   WHERE public.es_asistente() OR public.es_staff()
$$;

CREATE OR REPLACE VIEW public.asistente_contratos WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_contratos();

CREATE OR REPLACE FUNCTION public.fn_asistente_personal()
RETURNS TABLE (id uuid, numero_empleado text, nombre_completo text, puesto text, area text, departamento text, fecha_ingreso date, foto_url text, estado_id text, horario_trabajo text, dia_descanso text, tipo_contratacion text, contrato_inicio date, contrato_fin date, semaforo_contrato text, dias_antiguedad integer, email text, celular text, salario_diario numeric(10,2), salario_mensual numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, numero_empleado, nombre_completo, puesto, area, departamento, fecha_ingreso, foto_url, estado_id, horario_trabajo, dia_descanso, tipo_contratacion, contrato_inicio, contrato_fin, semaforo_contrato, dias_antiguedad, email, celular, salario_diario, salario_mensual
    FROM public.prp_empleados
   WHERE public.es_asistente() OR public.es_staff()
$$;

CREATE OR REPLACE VIEW public.asistente_personal WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_personal();

CREATE OR REPLACE FUNCTION public.fn_asistente_gastos()
RETURNS TABLE (id uuid, fecha date, semana text, anio integer, mes text, dia_semana text, grupo_gasto text, descripcion text, monto numeric(10,2), ticket_total numeric, proveedor_nombre text, proveedor_cat text, num_lineas bigint, created_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, fecha, semana, anio, mes, dia_semana, grupo_gasto, descripcion, monto, ticket_total, proveedor_nombre, proveedor_cat, num_lineas, created_at
    FROM public.prp_gastos
   WHERE public.es_asistente() OR public.es_staff()
$$;

CREATE OR REPLACE VIEW public.asistente_gastos WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_gastos();

CREATE OR REPLACE FUNCTION public.fn_asistente_ingresos()
RETURNS TABLE (id bigint, fecha date, tipo text, mes integer, anio integer, importe numeric(14,2), factura text, nota text, origen text, concepto_origen text, contrato_id uuid, folio text, arrendatario_nombre text, locales_display text, estatus_validacion text, clasificacion text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, fecha, tipo, mes, anio, importe, factura, nota, origen, concepto_origen, contrato_id, folio, arrendatario_nombre, locales_display, estatus_validacion, clasificacion
    FROM public.prp_ingresos
   WHERE public.es_asistente() OR public.es_staff()
$$;

CREATE OR REPLACE VIEW public.asistente_ingresos WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_ingresos();

CREATE OR REPLACE FUNCTION public.fn_asistente_cartera()
RETURNS TABLE (id uuid, contrato_id uuid, concepto text, descripcion text, periodo_mes integer, periodo_anio integer, importe numeric(14,2), fecha_vencimiento date, estado text, total_aplicado numeric, saldo numeric, contrato_folio text, arrendatario_nombre text, renta_mensual numeric(12,2), inmueble_nombre text, locales_display text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, contrato_id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, total_aplicado, saldo, contrato_folio, arrendatario_nombre, renta_mensual, inmueble_nombre, locales_display
    FROM public.prp_cartera
   WHERE public.es_asistente() OR public.es_staff()
$$;

CREATE OR REPLACE VIEW public.asistente_cartera WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_cartera();

CREATE OR REPLACE VIEW public.asistente_proyectos WITH (security_invoker = false) AS
SELECT id, nombre, descripcion, proveedor_nombre, estado, fecha_inicio, fecha_fin_estimada,
       fecha_fin_real, presupuesto_total, notas, created_at
  FROM public.proyectos
 WHERE public.es_asistente() OR public.es_staff();

DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['asistente_contratos','asistente_personal','asistente_proyectos',
                           'asistente_gastos','asistente_ingresos','asistente_cartera']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', v);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated, service_role', v);
  END LOOP;
  FOREACH v IN ARRAY ARRAY['fn_asistente_contratos','fn_asistente_personal','fn_asistente_gastos',
                           'fn_asistente_ingresos','fn_asistente_cartera']
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC, anon', v);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO authenticated, service_role', v);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
