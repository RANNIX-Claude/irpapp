-- Agrega tiene_comprobante a prp_cartera
-- Indica si algún ingreso aplicado a este cargo tiene comprobante de pago adjunto.

CREATE OR REPLACE VIEW public.prp_cartera
WITH (security_invoker = true)
AS
SELECT
  cp.id,
  cp.contrato_id,
  cp.concepto,
  cp.descripcion,
  cp.periodo_mes,
  cp.periodo_anio,
  cp.importe,
  cp.fecha_vencimiento,
  cp.estado,
  cp.generado_auto,
  cp.origen_cargo_id,
  COALESCE(SUM(ap.importe_aplicado), 0) AS total_aplicado,
  cp.importe - COALESCE(SUM(ap.importe_aplicado), 0) AS saldo,
  -- Datos del contrato/arrendatario
  con.folio AS contrato_folio,
  con.arrendatario_nombre,
  con.renta_mensual,
  con.inmueble_nombre,
  con.locales_display,
  con.locales_referencia,
  -- True si algún ingreso aplicado tiene comprobante adjunto
  EXISTS (
    SELECT 1
    FROM public.aplicaciones_pago ap2
    JOIN public.ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.comprobante_url IS NOT NULL
  ) AS tiene_comprobante
FROM public.cargos_programados cp
LEFT JOIN public.aplicaciones_pago ap ON ap.cargo_id = cp.id
LEFT JOIN public.prp_contratos con ON con.id = cp.contrato_id
GROUP BY cp.id, con.id, con.folio, con.arrendatario_nombre,
         con.renta_mensual, con.inmueble_nombre, con.locales_display, con.locales_referencia;

NOTIFY pgrst, 'reload schema';
