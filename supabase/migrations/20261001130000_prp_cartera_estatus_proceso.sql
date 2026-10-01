-- prp_cartera no traía el estatus_proceso del contrato: ni la pantalla de Cobranza ni el Agente
-- Operativo podían saber, con una sola consulta a esta vista, que un cargo era de un contrato ya
-- TERMINADO. Cobranza.jsx ya lo filtra en el frontend (20261001100000-ish, fix del 2026-10-01) cruzando
-- con prp_contratos aparte; el agente no tenía ese cruce y seguía reportando cartera vencida de
-- contratos terminados hasta que el usuario lo corregía a mano (caso L10, visto en una conversación real
-- del 2026-10-01).
--
-- No se filtran filas aquí a propósito: agenteEjecutores.js (aplicar_pago) y Facturacion/Reportes
-- necesitan poder seguir encontrando y liquidando un cargo viejo de un contrato ya terminado si alguien
-- por fin lo paga. Se agrega la columna y el Agente Operativo decide, por consulta, si lo excluye
-- (cartera vencida/por cobrar normal) o no (cuando preguntan explícitamente por un contrato terminado).

CREATE OR REPLACE VIEW public.prp_cartera
  WITH (security_invoker = true) AS
SELECT
  cp.id,
  cp.contrato_id,
  cp.concepto,
  cp.descripcion,
  cp.periodo_mes,
  cp.periodo_anio,
  cp.importe,
  cp.fecha_vencimiento,
  CASE
    WHEN cp.estado = 'CANCELADO' THEN 'CANCELADO'
    WHEN COALESCE(SUM(ap.importe_aplicado), 0) >= (cp.importe - 0.01) THEN 'PAGADO'
    WHEN COALESCE(SUM(ap.importe_aplicado), 0) > 0 THEN 'PARCIAL'
    ELSE 'PENDIENTE'
  END AS estado,
  cp.estado AS estado_capturado,
  cp.generado_auto,
  cp.origen_cargo_id,
  COALESCE(SUM(ap.importe_aplicado), 0) AS total_aplicado,
  cp.importe - COALESCE(SUM(ap.importe_aplicado), 0) AS saldo,
  con.folio AS contrato_folio,
  con.arrendatario_nombre,
  con.renta_mensual,
  con.inmueble_nombre,
  con.locales_display,
  con.locales_referencia,
  COALESCE(NULLIF(cp.factura, ''), (
    SELECT NULLIF(i2.factura, '') FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
     WHERE ap2.cargo_id = cp.id AND NULLIF(i2.factura, '') IS NOT NULL LIMIT 1)) AS numero_factura,
  COALESCE(cp.factura_url, (
    SELECT i2.factura_url FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
     WHERE ap2.cargo_id = cp.id AND i2.factura_url IS NOT NULL LIMIT 1)) AS factura_url,
  COALESCE(cp.factura_xml_url, (
    SELECT i2.factura_xml_url FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
     WHERE ap2.cargo_id = cp.id AND i2.factura_xml_url IS NOT NULL LIMIT 1)) AS factura_xml_url,
  (cp.factura IS NOT NULL AND cp.factura <> '') OR cp.factura_url IS NOT NULL OR cp.factura_xml_url IS NOT NULL
    OR EXISTS (SELECT 1 FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
      WHERE ap2.cargo_id = cp.id AND (i2.factura_url IS NOT NULL OR i2.factura_xml_url IS NOT NULL OR (i2.factura IS NOT NULL AND i2.factura <> ''))) AS tiene_factura,
  EXISTS (SELECT 1 FROM aplicaciones_pago ap2 JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id AND i.comprobante_url IS NOT NULL) AS tiene_comprobante,
  EXISTS (SELECT 1 FROM aplicaciones_pago ap2 JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id AND i.forma_pago <> 'EFECTIVO') AS tiene_pago_transferencia,
  EXISTS (SELECT 1 FROM aplicaciones_pago ap2 JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id AND i.forma_pago = 'EFECTIVO') AS tiene_pago_efectivo,
  con.estatus_proceso
FROM cargos_programados cp
LEFT JOIN aplicaciones_pago ap ON ap.cargo_id = cp.id
LEFT JOIN prp_contratos con ON con.id = cp.contrato_id
GROUP BY cp.id, con.id, con.folio, con.arrendatario_nombre, con.renta_mensual, con.inmueble_nombre,
  con.locales_display, con.locales_referencia, con.estatus_proceso;

GRANT SELECT ON public.prp_cartera TO authenticated;

-- El rol asistente consulta por esta función (SECURITY DEFINER, ver 20260925220000) y la vista
-- asistente_cartera que lee de ella (20260925210000); también necesita poder ver y filtrar por
-- estatus_proceso para no repetir el mismo error con un contrato terminado. RETURNS TABLE cambió
-- (columna nueva): CREATE OR REPLACE no lo permite, hay que soltar función + vista y recrearlas.
DROP VIEW IF EXISTS public.asistente_cartera;
DROP FUNCTION IF EXISTS public.fn_asistente_cartera();

CREATE FUNCTION public.fn_asistente_cartera()
RETURNS TABLE(id uuid, contrato_id uuid, concepto text, descripcion text, periodo_mes integer, periodo_anio integer, importe numeric, fecha_vencimiento date, estado text, total_aplicado numeric, saldo numeric, contrato_folio text, arrendatario_nombre text, renta_mensual numeric, inmueble_nombre text, locales_display text, estatus_proceso text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT id, contrato_id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, total_aplicado, saldo, contrato_folio, arrendatario_nombre, renta_mensual, inmueble_nombre, locales_display, estatus_proceso
    FROM public.prp_cartera
   WHERE public.es_asistente() OR public.es_staff()
$function$;

CREATE VIEW public.asistente_cartera WITH (security_invoker = true) AS
SELECT * FROM public.fn_asistente_cartera();

REVOKE ALL ON FUNCTION public.fn_asistente_cartera() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_asistente_cartera() TO authenticated, service_role;
REVOKE ALL ON public.asistente_cartera FROM PUBLIC, anon;
GRANT SELECT ON public.asistente_cartera TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
