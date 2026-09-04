-- Ver definición de la vista prp_conciliacion_cobros
SELECT pg_get_viewdef('prp_conciliacion_cobros'::regclass, true) AS definicion;

-- Ver si es una vista del schema public o prp
SELECT schemaname, viewname, definition
FROM pg_views
WHERE viewname = 'prp_conciliacion_cobros';

-- Ver qué tablas tiene el schema prp
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'prp' ORDER BY table_name;

-- Columnas de prp.contratos_arrendamiento (sin numero_contrato)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'contratos_arrendamiento'
ORDER BY ordinal_position;

-- Ver datos reales en prp.arrendatarios
SELECT id, nombre, apellidos, rfc FROM prp.arrendatarios ORDER BY nombre LIMIT 30;

-- Ver datos reales en prp.unidades
SELECT id, numero_local, inmueble_id FROM prp.unidades ORDER BY numero_local;
