-- Diagnóstico: cómo están los datos en prp vs public

-- 1. Contratos en prp
SELECT 'prp.contratos' AS tabla, COUNT(*) FROM prp.contratos_arrendamiento
UNION ALL
SELECT 'prp.arrendatarios', COUNT(*) FROM prp.arrendatarios
UNION ALL
SELECT 'prp.unidades', COUNT(*) FROM prp.unidades
UNION ALL
SELECT 'prp.cobros_jul26', COUNT(*) FROM prp.cobros_programados WHERE mes=7 AND anio=2026
UNION ALL
SELECT 'prp.cobros_ago26', COUNT(*) FROM prp.cobros_programados WHERE mes=8 AND anio=2026;

-- 2. Columnas de prp.contratos_arrendamiento
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'contratos_arrendamiento'
ORDER BY ordinal_position;

-- 3. Columnas de prp.arrendatarios
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'arrendatarios'
ORDER BY ordinal_position;

-- 4. Unidades en prp
SELECT id, numero_local FROM prp.unidades ORDER BY numero_local;

-- 5. Muestra de cobros julio prp
SELECT cp.id, u.numero_local, a.nombre, cp.monto_total, cp.estatus
FROM prp.cobros_programados cp
JOIN prp.unidades u ON u.id = cp.unidad_id
JOIN prp.contratos_arrendamiento ca ON ca.id = cp.contrato_id
JOIN prp.arrendatarios a ON a.id = ca.arrendatario_id
WHERE cp.mes = 7 AND cp.anio = 2026
ORDER BY u.numero_local;
