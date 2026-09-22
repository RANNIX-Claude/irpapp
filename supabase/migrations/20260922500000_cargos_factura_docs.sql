-- Mueve la factura al nivel de cargo, no del ingreso.
-- Regla de negocio: cada cobro (cargo) tiene su propia factura CFDI.
-- Si un pago cubre renta + sanción, son dos cargos y dos facturas distintas.
--
-- Campos nuevos en cargos_programados:
--   factura        TEXT  — número/folio del CFDI (ej. "A-2195")
--   factura_url    TEXT  — ruta al PDF en bucket facturas-cfdi
--   factura_xml_url TEXT — ruta al XML o ZIP en bucket facturas-cfdi
--
-- prp_cartera simplificada: numero_factura y tiene_factura ya no requieren
-- subqueries a través de aplicaciones_pago → ingresos; se leen directamente
-- del cargo. Mantiene security_invoker = true y todos los indicadores.

ALTER TABLE public.cargos_programados
  ADD COLUMN IF NOT EXISTS factura        TEXT,
  ADD COLUMN IF NOT EXISTS factura_url    TEXT,
  ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;

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
  -- Factura: leída directamente del cargo (sin subquery)
  cp.factura                                               AS numero_factura,
  cp.factura_url,
  cp.factura_xml_url,
  (cp.factura IS NOT NULL AND cp.factura <> '')
    OR cp.factura_url IS NOT NULL
    OR cp.factura_xml_url IS NOT NULL                      AS tiene_factura,
  -- Comprobante de pago: viene del ingreso aplicado
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.comprobante_url IS NOT NULL
  ) AS tiene_comprobante,
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
