-- ================================================================
-- MIGRACIÓN 024: Borrar registros ajenos a los 22 contratos reales
-- Locales válidos: L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,L16,L17,
--                 L18,L19,L23,L27,L29,L30,L31,L32,L33,L34,L35,L36,L37,L38
-- Se borran cobros, contratos y arrendatarios huérfanos de locales ajenos
-- ================================================================

BEGIN;

-- 1. Borrar cobros de locales NO incluidos en los 22 contratos
DELETE FROM prp.cobros_programados
WHERE unidad_id IN (
  SELECT id FROM prp.unidades
  WHERE numero_local NOT IN (
    'L6','L7','L8','L9','L10','L11','L12','L13','L14','L15',
    'L16','L17','L18','L19','L23','L27','L29','L30','L31','L32',
    'L33','L34','L35','L36','L37','L38'
  )
);

-- 2. Borrar contratos vinculados a locales ajenos
DELETE FROM prp.contratos_arrendamiento
WHERE unidad_id IN (
  SELECT id FROM prp.unidades
  WHERE numero_local NOT IN (
    'L6','L7','L8','L9','L10','L11','L12','L13','L14','L15',
    'L16','L17','L18','L19','L23','L27','L29','L30','L31','L32',
    'L33','L34','L35','L36','L37','L38'
  )
);

-- 3. Borrar arrendatarios que ya no tienen ningún contrato en prp
DELETE FROM prp.arrendatarios
WHERE id NOT IN (
  SELECT DISTINCT arrendatario_id FROM prp.contratos_arrendamiento
  WHERE arrendatario_id IS NOT NULL
);

COMMIT;

-- Verificación: qué quedó
SELECT u.numero_local, COUNT(cp.id) AS cobros, COUNT(ca.id) AS contratos
FROM prp.unidades u
LEFT JOIN prp.cobros_programados cp ON cp.unidad_id = u.id
LEFT JOIN prp.contratos_arrendamiento ca ON ca.unidad_id = u.id
WHERE u.numero_local IN (
  'L6','L7','L8','L9','L10','L11','L12','L13','L14','L15',
  'L16','L17','L18','L19','L23','L27','L29','L30','L31','L32',
  'L33','L34','L35','L36','L37','L38'
)
GROUP BY u.numero_local
ORDER BY u.numero_local;

SELECT COUNT(*) AS arrendatarios_restantes FROM prp.arrendatarios;
SELECT COUNT(*) AS cobros_restantes FROM prp.cobros_programados;
