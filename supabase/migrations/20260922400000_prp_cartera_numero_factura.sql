-- Agrega numero_factura a prp_cartera: texto del CFDI/recibo entregado
-- con ese cobro. Permite mostrarlo directamente en la fila de la tabla sin
-- abrir el panel de detalle. Mantiene security_invoker = true y el resto
-- de campos incorporados en 20260922300000.

DROP VIEW IF EXISTS public.prp_cartera;

CREATE VIEW public.prp_cartera
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
    WHEN COALESCE(SUM(ap.importe_aplicado), 0::numeric) >= cp.importe - 0.01 THEN 'PAGADO'
    WHEN COALESCE(SUM(ap.importe_aplicado), 0::numeric) > 0 THEN 'PARCIAL'
    ELSE 'PENDIENTE'
  END AS estado,
  cp.estado AS estado_capturado,
  cp.generado_auto,
  cp.origen_cargo_id,
  COALESCE(SUM(ap.importe_aplicado), 0::numeric) AS total_aplicado,
  cp.importe - COALESCE(SUM(ap.importe_aplicado), 0::numeric) AS saldo,
  con.folio AS contrato_folio,
  con.arrendatario_nombre,
  con.renta_mensual,
  con.inmueble_nombre,
  con.locales_display,
  con.locales_referencia,
  -- Número(s) de factura/recibo entregados con este cobro (texto, coma-separado)
  (SELECT STRING_AGG(fnum, ', ' ORDER BY fnum)
   FROM (
     SELECT DISTINCT i.factura AS fnum
     FROM aplicaciones_pago ap2
     JOIN ingresos i ON i.id = ap2.ingreso_id
     WHERE ap2.cargo_id = cp.id
       AND i.factura IS NOT NULL AND i.factura <> ''
   ) sub_f) AS numero_factura,
  -- Comprobante de pago adjunto
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.comprobante_url IS NOT NULL
  ) AS tiene_comprobante,
  -- Factura CFDI: número registrado O archivo PDF O archivo XML/ZIP
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND (
        (i.factura IS NOT NULL AND i.factura <> '')
        OR i.factura_url IS NOT NULL
        OR i.factura_xml_url IS NOT NULL
      )
  ) AS tiene_factura,
  -- Forma de pago: transferencia
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.forma_pago NOT IN ('EFECTIVO')
  ) AS tiene_pago_transferencia,
  -- Forma de pago: efectivo
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.forma_pago = 'EFECTIVO'
  ) AS tiene_pago_efectivo
FROM cargos_programados cp
LEFT JOIN aplicaciones_pago ap ON ap.cargo_id = cp.id
LEFT JOIN prp_contratos con ON con.id = cp.contrato_id
GROUP BY cp.id, con.id, con.folio, con.arrendatario_nombre,
         con.renta_mensual, con.inmueble_nombre, con.locales_display, con.locales_referencia;

NOTIFY pgrst, 'reload schema';
