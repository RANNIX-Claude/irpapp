-- prp_cartera: un cargo puede facturarse por dos caminos, y el badge "tiene
-- factura" debe verlos a los dos.
--
-- 1. Factura por cargo (20260922500000): cada concepto lleva su propia
--    factura -- una transferencia de renta + sanción son dos cargos y dos
--    facturas ($20,000 y $2,000).
-- 2. Factura por depósito (ingresos.factura_url, ya existía desde antes):
--    un solo depósito paga varias mensualidades y se factura una sola vez
--    -- 3 meses de renta, una factura que cubre los tres cargos.
--
-- tiene_factura/numero_factura/factura_url/factura_xml_url solo miraban el
-- cargo: en el caso 2, los cargos individuales se veían "sin factura" aunque
-- el depósito que los pagó sí la tuviera. Ahora se revisan los dos lados;
-- el propio cargo manda si la tiene, si no se busca en algún ingreso que lo
-- haya pagado (vía aplicaciones_pago).

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
  -- Factura: la del cargo manda; si no tiene, la del depósito que lo pagó.
  COALESCE(
    NULLIF(cp.factura, ''),
    (SELECT NULLIF(i2.factura, '')
       FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
      WHERE ap2.cargo_id = cp.id AND NULLIF(i2.factura, '') IS NOT NULL
      LIMIT 1)
  ) AS numero_factura,
  COALESCE(
    cp.factura_url,
    (SELECT i2.factura_url
       FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
      WHERE ap2.cargo_id = cp.id AND i2.factura_url IS NOT NULL
      LIMIT 1)
  ) AS factura_url,
  COALESCE(
    cp.factura_xml_url,
    (SELECT i2.factura_xml_url
       FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
      WHERE ap2.cargo_id = cp.id AND i2.factura_xml_url IS NOT NULL
      LIMIT 1)
  ) AS factura_xml_url,
  (cp.factura IS NOT NULL AND cp.factura <> '')
    OR cp.factura_url IS NOT NULL
    OR cp.factura_xml_url IS NOT NULL
    OR EXISTS (
         SELECT 1
           FROM aplicaciones_pago ap2 JOIN ingresos i2 ON i2.id = ap2.ingreso_id
          WHERE ap2.cargo_id = cp.id
            AND (i2.factura_url IS NOT NULL OR i2.factura_xml_url IS NOT NULL
                 OR (i2.factura IS NOT NULL AND i2.factura <> ''))
       ) AS tiene_factura,
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
