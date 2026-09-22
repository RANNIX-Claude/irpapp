-- Agrega los archivos del CFDI emitido: factura_url (PDF visual) y
-- factura_xml_url (XML/HTML/ZIP para contabilidad). Ambos se almacenan en el
-- bucket facturas-cfdi. Son independientes de la columna factura (número en texto).
-- Actualiza prp_cartera para que tiene_factura se active con cualquiera de los tres.

ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS factura_url TEXT,
  ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;

-- Reemplaza la vista para que tiene_factura sea true cuando existe
-- el número de factura O el archivo adjunto (o ambos).
CREATE OR REPLACE VIEW public.prp_cartera AS
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
  COALESCE(SUM(ap.importe_aplicado), 0::numeric) AS total_aplicado,
  cp.importe - COALESCE(SUM(ap.importe_aplicado), 0::numeric) AS saldo,
  con.folio AS contrato_folio,
  con.arrendatario_nombre,
  con.renta_mensual,
  con.inmueble_nombre,
  con.locales_display,
  con.locales_referencia,
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.comprobante_url IS NOT NULL
  ) AS tiene_comprobante,
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND (
        (i.factura IS NOT NULL AND i.factura <> '')
        OR i.factura_url IS NOT NULL
      )
  ) AS tiene_factura,
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.forma_pago NOT IN ('EFECTIVO')
  ) AS tiene_pago_transferencia,
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
