-- VISTA: prp_ingresos — recrea con folio, arrendatario_nombre, comprobante_url
DROP VIEW IF EXISTS public.prp_ingresos;

CREATE VIEW public.prp_ingresos AS
SELECT
  i.id,
  i.fecha,
  i.tipo,
  i.mes,
  i.anio,
  i.importe,
  i.factura,
  i.nota,
  i.origen,
  i.concepto_origen,
  i.comprobante_url,
  i.contrato_id,
  i.created_at,
  -- Datos del contrato
  con.folio,
  con.arrendatario_nombre,
  con.locales_display,
  -- Campos legacy para compatibilidad con filtros de búsqueda
  con.arrendatario_nombre AS propietario,
  con.locales_display     AS local_id,
  TRUE                    AS es_principal
FROM public.ingresos i
LEFT JOIN public.prp_contratos con ON con.id = i.contrato_id;

NOTIFY pgrst, 'reload schema';
