-- Agrega fecha_max_aplicacion a prp_cartera: la fecha en que se realizó el último
-- pago aplicado al cargo. Permite comparar cuándo debía pagarse (periodo_mes/anio)
-- vs cuándo realmente se cobró — clave para detectar pagos tardíos.
-- El JOIN con aplicaciones_pago ya existe en la vista; solo se añade MAX() al SELECT.

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
  MAX(ap.fecha_aplicacion) AS fecha_max_aplicacion,
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

NOTIFY pgrst, 'reload schema';
