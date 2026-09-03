-- ================================================================
-- MIGRACIÓN 014: Empleados reales Plaza IWOL
-- Elimina datos de prueba e inserta los 7 empleados reales
-- Fuente: doc_NóminaSemanaLunes Domingo_2026.xlsx
-- ================================================================

-- 1. Agregar columnas de horario si no existen
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS horario_trabajo TEXT,
  ADD COLUMN IF NOT EXISTS dia_descanso    TEXT;

-- 2. Limpiar datos dummy en cascada
-- Limpiar todas las tablas dependientes en orden
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='nomina_empleado') THEN
    EXECUTE 'DELETE FROM public.nomina_empleado';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='nomina_periodos') THEN
    EXECUTE 'DELETE FROM public.nomina_periodos';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rh_periodos_nomina') THEN
    EXECUTE 'DELETE FROM public.rh_periodos_nomina';
  END IF;
END $$;
DELETE FROM public.rh_asistencia;
-- rh_prenomina puede no existir si el período de nómina nunca tuvo cálculo
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rh_prenomina') THEN
    EXECUTE 'DELETE FROM public.rh_prenomina';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rh_nomina_renglones') THEN
    EXECUTE 'DELETE FROM public.rh_nomina_renglones';
  END IF;
END $$;
DELETE FROM public.rh_contratos;
DELETE FROM public.rh_empleados;

-- Resetear secuencia de número de empleado si existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname='public' AND sequencename='rh_empleados_num_seq') THEN
    ALTER SEQUENCE rh_empleados_num_seq RESTART WITH 1;
  END IF;
END $$;

-- 3. Insertar los 7 empleados reales de Plaza IWOL
-- Percepción semanal / 7 = salario_diario
-- 1 - VERONICA NAVA MARTÍNEZ  ($2,205/sem → $315/día)
DO $e1$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'VERÓNICA', 'NAVA', 'MARTÍNEZ', 'F',
    '2024-01-01', 'Operativa', 'Operaciones', 'Plaza IWOL',
    315.00, 'Lunes a Sábado 8-16 horas', 'Domingo', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 315.00);
END $e1$;

-- 2 - LUIS FERNANDO VELÁZQUEZ ESCOBAR ($3,000/sem → $428.57/día)
DO $e2$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'LUIS FERNANDO', 'VELÁZQUEZ', 'ESCOBAR', 'M',
    '2024-01-01', 'Operativo', 'Operaciones', 'Plaza IWOL',
    428.57, 'Lunes a Viernes 9-17 hrs / Domingo 9-14 horas', 'Sábado', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 428.57);
END $e2$;

-- 3 - HUMBERTO ROMERO HERNANDEZ ($2,205/sem → $315/día)
DO $e3$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'HUMBERTO', 'ROMERO', 'HERNANDEZ', 'M',
    '2024-01-01', 'Seguridad', 'Operaciones', 'Plaza IWOL',
    315.00, 'Lunes a Domingo 12h trabajo × 12h descanso', '-', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 315.00);
END $e3$;

-- 4 - DEMETRIO MARTÍNEZ MEJÍA ($2,205/sem → $315/día)
DO $e4$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'DEMETRIO', 'MARTÍNEZ', 'MEJÍA', 'M',
    '2024-01-01', 'Seguridad', 'Operaciones', 'Plaza IWOL',
    315.00, 'Lunes a Domingo 12h trabajo × 12h descanso', '-', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 315.00);
END $e4$;

-- 5 - MARIA DEL CARMEN MORALES LARA ($2,205/sem → $315/día)
DO $e5$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'MARIA DEL CARMEN', 'MORALES', 'LARA', 'F',
    '2024-01-01', 'Limpieza', 'Operaciones', 'Plaza IWOL',
    315.00, 'Lunes a Domingo 8-15 hrs', 'Domingo', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 315.00);
END $e5$;

-- 6 - RENE SANCHEZ DEGOLLADO ($1,890/sem → $270/día)
DO $e6$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'RENÉ', 'SÁNCHEZ', 'DEGOLLADO', 'M',
    '2024-01-01', 'Operativo', 'Operaciones', 'Plaza IWOL',
    270.00, 'Lunes a Domingo 11-19 horas', 'Sábado', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 270.00);
END $e6$;

-- 7 - JUAN CARRILLO ($2,205/sem → $315/día)
DO $e7$ DECLARE v_id UUID;
BEGIN
  INSERT INTO public.rh_empleados (
    nombre, apellido_pat, apellido_mat, sexo,
    fecha_ingreso, puesto, area, departamento,
    salario_diario, horario_trabajo, dia_descanso, estado_id
  ) VALUES (
    'JUAN', 'CARRILLO', NULL, 'M',
    '2024-01-01', 'Mesero', 'Restaurante', 'Plaza IWOL',
    315.00, 'Lunes a Domingo 14:00-21:30 hrs', 'Sábado', 'ACTIVO'
  ) RETURNING id INTO v_id;

  INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, activo, salario_diario)
  VALUES (v_id, 'INDEFINIDO', '2024-01-01', TRUE, 315.00);
END $e7$;

-- Verificar
SELECT numero_empleado, nombre || ' ' || apellido_pat AS nombre,
       horario_trabajo, dia_descanso,
       TO_CHAR(salario_diario, 'FM$9,990.99') AS sal_dia,
       TO_CHAR(salario_diario * 7, 'FM$9,990.99') AS percepcion_semanal
FROM public.rh_empleados
ORDER BY numero_empleado;
