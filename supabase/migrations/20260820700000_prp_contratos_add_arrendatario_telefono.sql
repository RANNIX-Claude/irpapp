-- Agregar telefono y email del arrendatario a prp_contratos
DROP VIEW IF EXISTS public.prp_contratos;
CREATE VIEW public.prp_contratos AS
SELECT
  c.id,
  c.numero_contrato                                   AS folio,
  c.arrendatario_id,
  a.locatario                                         AS arrendatario_nombre,
  a.nombre_negocio,
  a.rfc                                               AS arrendatario_rfc,
  a.email                                             AS arrendatario_email,
  a.telefono                                          AS arrendatario_telefono,
  a.domicilio_fiscal                                  AS arrendatario_domicilio,
  a.tipo_persona,
  a.representante_legal,
  c.tipo_contrato,
  c.giro_autorizado,
  c.fecha_inicio,
  c.fecha_fin,
  c.renta_mensual,
  c.renta_sin_iva,
  c.deposito_garantia,
  c.dia_pago,
  c.penalizacion_pct,
  c.incremento_anual_pct,
  c.fiador_nombre,
  c.fiador_rfc,
  c.fiador_domicilio,
  c.fiador_ife,
  c.pagares_cantidad,
  c.cancelacion_anticipada_meses,
  c.periodo_gracia_meses,
  c.contrato_anterior_id,
  c.estatus,
  c.estatus                                           AS estado_id,
  c.estatus_proceso,
  c.locales_referencia,
  c.locales_display,
  c.contrato_pdf_url                                  AS archivo_contrato_url,
  c.notas,
  c.created_at,
  c.updated_at,
  CASE
    WHEN c.estatus NOT IN ('VIGENTE','VENCIDO') THEN c.estatus
    WHEN c.fecha_fin < CURRENT_DATE             THEN 'VENCIDO'
    WHEN c.fecha_fin <= CURRENT_DATE + 30       THEN 'CRITICO'
    WHEN c.fecha_fin <= CURRENT_DATE + 60       THEN 'ALERTA'
    ELSE 'OK'
  END                                                 AS semaforo_vencimiento,
  (c.fecha_fin - CURRENT_DATE)                        AS dias_restantes,
  STRING_AGG(cl.local_id, '|' ORDER BY cl.local_id)  AS locales_ids,
  STRING_AGG(l.numero_local, ', ' ORDER BY cl.local_id) AS unidad_numero,
  SUM(l.superficie_m2)                                AS m2_totales,
  NULL::uuid                                          AS unidad_id,
  NULL::text                                          AS inmueble_nombre,
  NULL::text                                          AS tipo_unidad
FROM public.contratos c
JOIN public.arrendatarios a ON a.id = c.arrendatario_id
LEFT JOIN public.contratos_locales cl ON cl.contrato_id = c.id
LEFT JOIN public.cat_locales l ON l.id_local = cl.local_id
GROUP BY c.id, a.id;

GRANT SELECT ON public.prp_contratos TO authenticated;
