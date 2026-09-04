-- Ver columnas de cada tabla prp
SELECT 'contratos_arrendamiento' AS tabla, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'contratos_arrendamiento'
ORDER BY ordinal_position;

SELECT 'arrendatarios' AS tabla, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'arrendatarios'
ORDER BY ordinal_position;

SELECT 'unidades' AS tabla, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'prp' AND table_name = 'unidades'
ORDER BY ordinal_position;

-- Ver qué hay actualmente en prp.unidades
SELECT id, numero_local FROM prp.unidades ORDER BY numero_local;

-- Ver prp.arrendatarios
SELECT id, nombre, apellidos, rfc FROM prp.arrendatarios ORDER BY nombre LIMIT 30;
