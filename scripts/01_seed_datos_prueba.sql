-- ============================================================
-- IRP — Seed: Datos de Prueba Plaza IWOL
-- Ejecutar DESPUÉS de 00_setup_completo.sql
-- ============================================================
SET search_path TO prp, public;

-- ============================================================
-- INMUEBLE: Plaza IWOL
-- ============================================================

INSERT INTO prp.inmuebles (id, nombre, tipo, direccion, colonia, municipio, estado, cp)
VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'Plaza IWOL',
  'PLAZA_COMERCIAL',
  'Avenida Gobernadores 1622',
  'La Providencia',
  'Metepec',
  'Estado de México',
  '52177'
) ON CONFLICT DO NOTHING;

-- ============================================================
-- UNIDADES: Locales L8 al L38
-- ============================================================

INSERT INTO prp.unidades (inmueble_id, numero_local, metros_cuadrados, renta_base, tiene_servicio_agua)
SELECT
  'aaaaaaaa-0001-0001-0001-000000000001',
  'L' || n,
  CASE
    WHEN n IN (27,28,31,32,37,38) THEN 35.00
    WHEN n IN (10,12,15,20) THEN 28.00
    ELSE 22.00
  END,
  CASE
    WHEN n IN (8,9,10) THEN 19100.00
    WHEN n IN (11,12,13,14) THEN 15500.00
    WHEN n IN (27,28,31,32) THEN 12000.00
    WHEN n IN (37,38) THEN 11000.00
    ELSE 9500.00
  END,
  TRUE
FROM generate_series(8, 38) AS n
ON CONFLICT (inmueble_id, numero_local) DO NOTHING;

-- ============================================================
-- EMPLEADOS (usuarios del sistema)
-- Nota: auth_user_id se actualiza después de crear los users
--       en Supabase Auth con el script de invite
-- ============================================================

-- Obtener rol IDs
DO $$
DECLARE
  r_admin    UUID;
  r_tesorero UUID;
  r_operativo UUID;
  r_super    UUID;
BEGIN
  SELECT id INTO r_super    FROM prp.roles WHERE clave = 'SUPER_ADMIN';
  SELECT id INTO r_admin    FROM prp.roles WHERE clave = 'ADMIN';
  SELECT id INTO r_tesorero FROM prp.roles WHERE clave = 'TESORERO';
  SELECT id INTO r_operativo FROM prp.roles WHERE clave = 'OPERATIVO';

  INSERT INTO prp.empleados (id, nombre, apellidos, email, puesto, departamento, rol_id, fecha_ingreso)
  VALUES
    ('bbbbbbbb-0001-0001-0001-000000000001',
     'Roberto', 'Aguilar Cota',
     'roberto.aguilar.cota@gmail.com',
     'Desarrollador / Super Admin', 'TI', r_super, '2026-01-01'),
    ('bbbbbbbb-0001-0001-0001-000000000002',
     'Zurisade', 'López García',
     'zurisade@iwol.mx',
     'Administradora General', 'Dirección', r_admin, '2020-09-23'),
    ('bbbbbbbb-0001-0001-0001-000000000003',
     'Daniela', 'Esquivel Arias',
     'daniela@iwol.mx',
     'Tesorera', 'Finanzas', r_tesorero, '2020-09-23'),
    ('bbbbbbbb-0001-0001-0001-000000000004',
     'Luis Antonio', 'León Dávila',
     'luis.leon@iwol.mx',
     'Operativo Estacionamiento', 'Operaciones', r_operativo, '2023-03-15'),
    ('bbbbbbbb-0001-0001-0001-000000000005',
     'Itzel Guadalupe', 'Cruzalta Marroquín',
     'itzel.cruzalta@iwol.mx',
     'Operativa (Prueba)', 'Operaciones', r_operativo, '2026-07-01')
  ON CONFLICT (email) DO NOTHING;
END $$;

-- ============================================================
-- ARRENDATARIOS (inquilinos actuales Plaza IWOL)
-- ============================================================

INSERT INTO prp.arrendatarios (id, nombre, apellidos, email, telefono, rfc, tipo_persona)
VALUES
  ('cccccccc-0001-0001-0001-000000000001', 'María Elena', 'Rodríguez Torres',   'mrodriguez@mail.com', '7221001001', 'ROTM820315HM1', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000002', 'José Luis',   'García Hernández',   'jgarcia@mail.com',    '7221001002', 'GAHJ770520HM1', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000003', 'Ana Patricia', 'Morales Sánchez',   'amorales@mail.com',   '7221001003', 'MOSA850910MEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000004', 'Carlos',      'Mendoza Vázquez',    'cmendoza@mail.com',   '7221001004', 'MEVC900211HEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000005', 'Lucía',       'Fernández Reyes',    'lfernandez@mail.com', '7221001005', 'FERL930714MEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000006', 'Roberto',     'Jiménez Castillo',   'rjimenez@mail.com',   '7221001006', 'JICR881125HEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000007', 'Sofía',       'Pérez Luna',         'sperez@mail.com',     '7221001007', 'PELS950302MEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000008', 'Miguel Ángel','Gómez Ruiz',         'mgomez@mail.com',     '7221001008', 'GORM800618HEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000009', 'Tatiana',     'Cruz Mendez',        'tcruz@mail.com',      '7221001009', 'CUMT970815MEM', 'FISICA'),
  ('cccccccc-0001-0001-0001-000000000010', 'Fernando',    'Ramírez Ortega',     'framirez@mail.com',   '7221001010', 'RAOF750409HEM', 'FISICA')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CONTRATOS VIGENTES (10 locales con contrato)
-- ============================================================

DO $$
DECLARE
  v_inmueble UUID := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_unidad   UUID;
  v_arr      UUID;
  v_contrato UUID;
  v_inicio   DATE := '2026-01-16'; -- después de 15 días gracia desde 2026-01-01
  v_fin      DATE := '2027-01-31';
  locales    TEXT[] := ARRAY['L8','L9','L10','L11','L12','L13','L14','L15','L16','L17'];
  arrs       UUID[] := ARRAY[
    'cccccccc-0001-0001-0001-000000000001',
    'cccccccc-0001-0001-0001-000000000002',
    'cccccccc-0001-0001-0001-000000000003',
    'cccccccc-0001-0001-0001-000000000004',
    'cccccccc-0001-0001-0001-000000000005',
    'cccccccc-0001-0001-0001-000000000006',
    'cccccccc-0001-0001-0001-000000000007',
    'cccccccc-0001-0001-0001-000000000008',
    'cccccccc-0001-0001-0001-000000000009',
    'cccccccc-0001-0001-0001-000000000010'
  ]::UUID[];
  rentas     NUMERIC[] := ARRAY[19100,19100,15500,15500,15500,15500,9500,9500,9500,9500];
BEGIN
  FOR i IN 1..10 LOOP
    SELECT id INTO v_unidad FROM prp.unidades WHERE inmueble_id = v_inmueble AND numero_local = locales[i];
    v_arr := arrs[i];
    v_contrato := gen_random_uuid();

    INSERT INTO prp.contratos_arrendamiento (
      id, unidad_id, arrendatario_id,
      tipo_documento, tipo_contrato,
      fecha_inicio, fecha_fin,
      renta_mensual, deposito_garantia,
      periodo_gracia_dias, numero_pagares, dia_limite_pago,
      incremento_tipo, penalizacion_mora_pct, penalizacion_adicional_pct,
      clabe_interbancaria, giro_autorizado, estatus
    ) VALUES (
      v_contrato, v_unidad, v_arr,
      'SUBARRENDAMIENTO', 'ANUAL',
      '2026-01-01', v_fin,
      rentas[i], rentas[i],
      15, 12, 5,
      'INPC', 10.00, 5.00,
      '012420001163161152',
      CASE i
        WHEN 1 THEN 'Cafetería'
        WHEN 2 THEN 'Comercio Ropa'
        WHEN 3 THEN 'Consultorio Médico'
        WHEN 4 THEN 'Zapatería'
        WHEN 5 THEN 'Papelería'
        WHEN 6 THEN 'Celulares y Accesorios'
        WHEN 7 THEN 'Dulcería'
        WHEN 8 THEN 'Peluquería'
        WHEN 9 THEN 'Estética'
        ELSE 'Comercio General'
      END,
      'VIGENTE'
    ) ON CONFLICT DO NOTHING;

    -- Generar los cobros mensuales
    PERFORM prp.generar_cobros_contrato(v_contrato);

    -- Marcar enero-julio 2026 como pagados
    UPDATE prp.cobros_programados
    SET estatus = 'PAGADO',
        fecha_pago_real = fecha_limite_pago - 2,
        monto_pagado = monto_total,
        conciliado = TRUE,
        forma_pago = 'TRANSFERENCIA',
        numero_operacion_banco = 'TRF' || LPAD((RANDOM() * 999999)::INT::TEXT, 6, '0')
    WHERE contrato_id = v_contrato
      AND (anio < 2026 OR (anio = 2026 AND mes <= 7));
  END LOOP;
END $$;

-- ============================================================
-- PENSIONES DE ESTACIONAMIENTO (5 pensiones de prueba)
-- ============================================================

INSERT INTO prp.pensiones_estacionamiento (nombre, telefono, placa, marca_auto, color_auto, monto_mensual, fecha_inicio, activo)
VALUES
  ('Pedro Solano Mata',     '7221110001', 'ABC-123', 'Nissan',    'Blanco',  500, '2026-01-01', TRUE),
  ('Carmen Ávila Reyes',    '7221110002', 'XYZ-456', 'Toyota',    'Gris',    500, '2026-02-01', TRUE),
  ('Roberto Nieves Cruz',   '7221110003', 'DEF-789', 'Volkswagen','Negro',   500, '2026-01-15', TRUE),
  ('Laura Vega Montoya',    '7221110004', 'GHI-012', 'Honda',     'Azul',    500, '2026-03-01', TRUE),
  ('Arturo Campos Rincón',  '7221110005', 'JKL-345', 'Chevrolet', 'Rojo',    500, '2026-04-01', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FONDO REVOLVENTE BASE
-- ============================================================

INSERT INTO prp.fondos_revolventes (id, nombre, monto_base)
VALUES ('dddddddd-0001-0001-0001-000000000001', 'Fondo Revolvente IWOL', 20000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PROSPECTOS (3 candidatos en proceso)
-- ============================================================

INSERT INTO prp.prospectos (nombre, apellidos, email, telefono, giro_solicitado, estatus, resultado_buro)
VALUES
  ('Arturo',  'Barrientos Vega',    'arturo.b@mail.com',   '7221220001', 'Farmacia',            'DOCUMENTACION', 'PENDIENTE'),
  ('Claudia', 'Noriega Santillán',  'claudia.n@mail.com',  '7221220002', 'Joyería y Accesorios','CALIFICACION',  'APROBADO'),
  ('Miguel',  'Torres Espinoza',    'miguel.t@mail.com',   '7221220003', 'Taquería',            'NUEVO',         'PENDIENTE')
ON CONFLICT DO NOTHING;

-- ============================================================
-- CIERRE SEMANAL EJEMPLO (semana 28 jul - 3 ago 2026)
-- ============================================================

INSERT INTO prp.fondo_revolvente_cierres (
  fondo_id, semana_inicio, semana_fin,
  monto_asignado,
  total_estacionamiento, total_pensiones, total_vending,
  total_ingresos, total_gastos, total_comprobado,
  diferencia_gastos, total_efectivo_entregar,
  dia_tomado_importe, residual_vending, cerrado
) VALUES (
  'dddddddd-0001-0001-0001-000000000001',
  '2026-07-28', '2026-08-03',
  20000,
  8450, 2500, 780,
  11730, 4320, 3890,
  430, 7410,
  600, 340, TRUE
) ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN SEED — Sistema listo para pruebas
-- ============================================================
-- Resumen de datos creados:
--   1 inmueble (Plaza IWOL)
--  31 unidades (L8-L38)
--  10 arrendatarios
--  10 contratos vigentes con cobros generados (12 c/u = 120 cobros)
--   5 empleados con roles asignados
--   5 pensiones de estacionamiento
--   3 prospectos
--   1 fondo revolvente + cierre semanal de ejemplo
-- ============================================================
