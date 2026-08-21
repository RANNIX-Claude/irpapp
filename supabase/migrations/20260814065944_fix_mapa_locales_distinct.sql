-- Fix: DISTINCT ON para evitar duplicados cuando hay múltiples
-- contratos VIGENTE por unidad (datos de prueba de dos seeds)
CREATE OR REPLACE VIEW public.prp_mapa_locales AS
SELECT DISTINCT ON (u.id)
  u.id                                                    AS unidad_id,
  u.numero_local                                          AS clave,
  u.metros_cuadrados,
  u.renta_base,
  ca.id                                                   AS contrato_id,
  ca.giro_autorizado                                      AS giro,
  ca.renta_mensual,
  ca.fecha_inicio,
  ca.fecha_fin,
  ca.estatus                                              AS estatus_contrato,
  TRIM(COALESCE(ar.nombre || ' ' || ar.apellidos, ar.nombre)) AS inquilino,
  ar.telefono,
  ar.email,
  CASE
    WHEN ca.id IS NOT NULL AND ca.estatus = 'VIGENTE' THEN 'OCUPADO'
    ELSE 'DISPONIBLE'
  END                                                     AS estatus,
  CASE
    WHEN ca.fecha_fin IS NOT NULL THEN (ca.fecha_fin - CURRENT_DATE)
    ELSE NULL
  END                                                     AS dias_para_vencer
FROM prp.unidades u
LEFT JOIN prp.contratos_arrendamiento ca
  ON  ca.unidad_id = u.id
  AND ca.estatus   = 'VIGENTE'
LEFT JOIN prp.arrendatarios ar
  ON  ar.id = ca.arrendatario_id
ORDER BY u.id, ca.fecha_inicio DESC NULLS LAST;
