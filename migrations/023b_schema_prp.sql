-- Columnas de prp.contratos_arrendamiento
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'contratos_arrendamiento'
ORDER BY ordinal_position;

-- Columnas de prp.arrendatarios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'arrendatarios'
ORDER BY ordinal_position;

-- Columnas de prp.cobros_programados
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'cobros_programados'
ORDER BY ordinal_position;

-- Definición de la vista prp_conciliacion_cobros
SELECT schemaname, viewname
FROM pg_views WHERE viewname = 'prp_conciliacion_cobros';

SELECT pg_get_viewdef('prp_conciliacion_cobros'::regclass, true);
