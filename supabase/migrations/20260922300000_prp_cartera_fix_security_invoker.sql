-- Restaura security_invoker = true en prp_cartera y consolida todos los campos
-- que las migraciones anteriores fueron agregando.
--
-- Las migraciones 20260922100000 y 20260922200000 recrearon la vista con
-- CREATE OR REPLACE VIEW sin la cláusula WITH, lo que borra las reloptions
-- en Postgres 16 — en particular security_invoker, que había sido restaurado
-- por 20260920120000. Sin ella el locatario puede leer la cartera de otros
-- contratos. Esta migración corrige eso y es la versión canónica de la vista.

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
  -- Estado derivado: evita que una edición manual de cargos_programados
  -- desincronice el badge respecto a los pagos reales.
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
  -- Comprobante de pago (archivo adjunto al ingreso)
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
  -- Liquidado por transferencia/depósito bancario
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.forma_pago NOT IN ('EFECTIVO')
  ) AS tiene_pago_transferencia,
  -- Liquidado en efectivo
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
