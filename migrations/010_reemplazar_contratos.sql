-- ================================================================
-- MIGRACIÓN 010: Reemplazar tabla contratos desde DATOS_Contratos.xlsx
-- Fecha: 2026-09-02 | 22 contratos IWOL
-- ================================================================

-- 1. Limpiar dependencias FK en orden
DELETE FROM public.aplicaciones_pago
  WHERE cargo_id IN (SELECT id FROM public.cargos_programados);

DELETE FROM public.aplicaciones_pago
  WHERE ingreso_id IN (SELECT id FROM public.ingresos);

DELETE FROM public.ingresos;
DELETE FROM public.pagos;
DELETE FROM public.cargos_programados;
DELETE FROM public.contratos_locales;

-- 2. Eliminar contratos
DELETE FROM public.contratos;

-- 3. Eliminar arrendatarios huérfanos (los creados por IRP)
DELETE FROM public.arrendatarios;

-- 4. Insertar contratos frescos desde Excel

-- 1. L08 — Alejandro Muñoz Fernández
DO $blk0$ DECLARE v_l08 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Alejandro Muñoz Fernández', NULL, NULL, 'ACTIVO', true)
  RETURNING id INTO v_l08;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l08, 'IWOL-2025-L08', 'L8', 'L8',
    '2025-11-21', '2026-11-20', '17500.00', '17500', '21',
    10, '12', 1,
    'Uso comercial', 'ANUAL', NULL, NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk0$;

-- 2. L09 — Alfredo Bravo Mendiola
DO $blk1$ DECLARE v_l09 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Alfredo Bravo Mendiola', 'BAMA841221C2A', 'Carr. Calimaya L3 M11, Fracc. Bosque de las Fuentes, San Andrés Ocotlán, C.P. 52220', 'ACTIVO', true)
  RETURNING id INTO v_l09;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l09, 'IWOL-2025-L09', 'L9', 'L9',
    '2025-09-17', '2026-09-16', '25892.00', '48874', '17',
    10, '12', 0,
    'Spinning', 'ANUAL', 'José Luis Ayala Ayala', 'PASAPORTE G41242147',
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk1$;

-- 3. L10 — Luis Vicente Domínguez Gamboa
DO $blk2$ DECLARE v_l10 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Luis Vicente Domínguez Gamboa', 'DOGL810812TU7', 'Mariano Matamoros Sur 213, Centro, C.P. 50000, Toluca', 'ACTIVO', true)
  RETURNING id INTO v_l10;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l10, 'IWOL-2025-L10', 'L10', 'L10',
    '2025-06-02', '2026-07-01', '19100.00', '19100', '2',
    10, '12', 0,
    'Cafetería', 'ANUAL', 'Jorge Eduardo Thebar Ruribe', 'IFE 5210068589257',
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk2$;

-- 4. L1112 — Andrea Castillo Velázquez
DO $blk3$ DECLARE v_l1112 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Andrea Castillo Velázquez', 'CAVA851220AW3', 'Circuito Puerta del Sol 13-14, Col. Puerta Real, C.P. 76910, El Pueblito, Corregidora, Qro.', 'ACTIVO', true)
  RETURNING id INTO v_l1112;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l1112, 'IWOL-2026-L1112', 'L11, L12', 'L11|L12',
    '2026-04-10', '2027-04-09', '37234.00', NULL, '10',
    10, '12', 0,
    'Pilates y venta de ropa para pilates', 'ANUAL', 'Ma. Oliver Mendoza Gómez (firma ''Olliver'')', 'IFE 2514024108073',
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk3$;

-- 5. L13 — C&R MOTOR, S.A. DE C.V.
DO $blk4$ DECLARE v_l13 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('C&R MOTOR, S.A. DE C.V.', NULL, 'Venustiano Carranza 500, Col. Universidad, C.P. 50130, Toluca', 'ACTIVO', true)
  RETURNING id INTO v_l13;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l13, 'IWOL-2025-L13', 'L13', 'L13',
    '2025-06-26', '2026-06-25', '19832.00', '16685', '10',
    10, '12', 0,
    'Clínica de Atención a la Diabetes', 'ANUAL', 'Alicia García Delgado', 'IFE 1318052907779',
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk4$;

-- 6. L14 — Luky del Rosario González Olivo
DO $blk5$ DECLARE v_l14 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Luky del Rosario González Olivo', 'GOOL8710226M2', 'Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757', 'ACTIVO', true)
  RETURNING id INTO v_l14;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l14, 'IWOL-2024-L14', 'L14', 'L14',
    '2024-06-01', '2025-05-31', '17500.00', '17000', '1',
    10, '12', 0,
    'Salones y clínicas de belleza y peluquerías', 'ANUAL', 'Héctor Alonso Noriega Rico', 'IFE 2731024152155',
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk5$;

-- 7. L15 — Isagenix México, S. de R.L. de C.V.
DO $blk6$ DECLARE v_l15 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Isagenix México, S. de R.L. de C.V.', NULL, NULL, 'ACTIVO', true)
  RETURNING id INTO v_l15;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l15, 'IWOL-2025-L15', 'L15', 'L15',
    '2025-12-01', '2026-12-31', '19855.00', '18500', NULL,
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'OS: Isagenix México Imports, S. de R.L. de C.V. rep. Ma. Fernanda Rodríguez Espinoza', 'Persona moral (no IFE)',
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk6$;

-- 8. L16 — Denys Retama Bernal
DO $blk7$ DECLARE v_l16 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Denys Retama Bernal', 'Pasaporte REBD950904MMCTRN08', 'Calle José Vicente Villada 450, Col. Francisco Murguía, Toluca, C.P. 50130', 'ACTIVO', true)
  RETURNING id INTO v_l16;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l16, 'IWOL-2026-L16', 'L16', 'L16',
    '2026-06-26', '2027-06-25', '18500.00', '18500', '26',
    10, NULL, 1,
    'Uso comercial', 'ANUAL', 'Leonardo Martín Salinas Toledano', 'IFE SATL940705HMCCLLN03',
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk7$;

-- 9. L17 — Luz Adriana Franco Rodríguez
DO $blk8$ DECLARE v_l17 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Luz Adriana Franco Rodríguez', 'ROPS590726G47', 'Av. Gobernadores 1622, Local 17, Col. La Providencia, C.P. 52177, Metepec', 'ACTIVO', true)
  RETURNING id INTO v_l17;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l17, 'IWOL-2025-L17', 'L17', 'L17',
    '2025-05-01', '2026-04-30', '17700.00', '16685', '1',
    10, '12', 0,
    'Clínica de Atención a la Diabetes', 'ANUAL', 'Fernando Rafael Franco Robles', 'IFE 2261033320309',
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk8$;

-- 10. L18 — Guillermo Antonio Herice Poleo
DO $blk9$ DECLARE v_l18 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Guillermo Antonio Herice Poleo', NULL, NULL, 'ACTIVO', true)
  RETURNING id INTO v_l18;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l18, 'IWOL-2025-L18', 'L18', 'L18',
    '2025-09-15', '2026-09-14', '17500.00', NULL, '15',
    10, NULL, 1,
    'Uso comercial', 'ANUAL', 'OS: Nerynel Mercedes Hernández Briceño', NULL,
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk9$;

-- 11. L19 — Lizeth Cristina Campos García
DO $blk10$ DECLARE v_l19 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Lizeth Cristina Campos García', 'Pasaporte CAGL910724MMCMRZ09', 'Privada Lázaro Cárdenas 7, Col. San Mateo Otzacatipan, Toluca, C.P. 50220', 'ACTIVO', true)
  RETURNING id INTO v_l19;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l19, 'IWOL-2026-L19', 'L19', 'L19',
    '2026-06-19', '2027-06-18', '17500.00', '17500', '19',
    10, NULL, 1,
    'Uso comercial', 'ANUAL', NULL, NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk10$;

-- 12. L23 — Vanessa Acero Jaimes
DO $blk11$ DECLARE v_l23 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Vanessa Acero Jaimes', 'AEJV920924JJ1', 'Prolongación Reforma 1190, Haus Santa Fe 405 C, Cuajimalpa, CDMX', 'ACTIVO', true)
  RETURNING id INTO v_l23;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l23, 'IWOL-2026-L23', 'L23', 'L23',
    '2026-05-01', '2027-05-30', '17780.00', NULL, '1',
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'Ma. Gaysa Jaimes Jaimes', NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk11$;

-- 13. L27 — Centro de Neurorehabilitación CINDE, S.A. de C.V.
DO $blk12$ DECLARE v_l27 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Centro de Neurorehabilitación CINDE, S.A. de C.V.', 'CNC2407298P9 (CINDE)', 'Av. Gobernadores 1622 Interior 27 (mismo que local)', 'ACTIVO', true)
  RETURNING id INTO v_l27;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l27, 'IWOL-2026-L27', 'L27', 'L27',
    '2026-01-08', '2027-01-07', '16751.43', NULL, '8',
    10, '12', 1,
    'Clínica de neurorehabilitación', 'ANUAL', 'OS: Karen Mercedes Gaytán Walle', NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk12$;

-- 14. L29 — Avaxo Tech S.A. de C.V.
DO $blk13$ DECLARE v_l29 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Avaxo Tech S.A. de C.V.', NULL, NULL, 'ACTIVO', true)
  RETURNING id INTO v_l29;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l29, 'IWOL-2026-L29', 'L29', 'L29',
    '2026-01-01', '2026-12-31', '16955.00', '15747.50', '22',
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'Rodrigo Wong Osuna (mismo apellido = pariente del rep. legal)', NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk13$;

-- 15. L30 — Dulce Michelle Andrade Bucio
DO $blk14$ DECLARE v_l30 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Dulce Michelle Andrade Bucio', 'AABD8441219190 (RFC parece con 14 caracteres — revisar OCR o error en captura)', 'C. Hidalgo 7 Int A, Lerma de Villada Centro, C.P. 52000', 'ACTIVO', true)
  RETURNING id INTO v_l30;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l30, 'IWOL-2025-L30', 'L30', 'L30',
    '2025-09-22', '2026-10-21', '17650.00', '16500', '22',
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'Joanna Maruri Esquivel (apellido ''Esquivel'' — posible pariente del arrendador)', NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk14$;

-- 16. L3132 — Grupo Oaklife México, Agente de Seguros y Fianzas, S.A. de C.V.
DO $blk15$ DECLARE v_l3132 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Grupo Oaklife México, Agente de Seguros y Fianzas, S.A. de C.V.', NULL, 'Ciudad Salamanca 5974, Cumbres de Santa Clara, Monterrey NL, C.P. 64349', 'ACTIVO', true)
  RETURNING id INTO v_l3132;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l3132, 'IWOL-2025-L3132', 'L31, L32', 'L31|L32',
    '2025-02-14', '2027-03-05', '31500.00', NULL, '6',
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'OS: Víctor Manuel Monroy Garnica (dominio de correo @oaklife.com.mx = empleado)', NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk15$;

-- 17. L33 — Gerardo Quiroz Acosta y Centro de Artes Escénicas PROART, A.C.
DO $blk16$ DECLARE v_l33 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Gerardo Quiroz Acosta y Centro de Artes Escénicas PROART, A.C.', NULL, 'Calle Viena 159, Col. Del Carmen, Coyoacán, CDMX, C.P. 04100', 'ACTIVO', true)
  RETURNING id INTO v_l33;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l33, 'IWOL-2026-L33', 'L33', 'L33',
    '2026-02-13', '2027-02-12', '16500.00', NULL, NULL,
    10, NULL, 0,
    'Escuela de artes escénicas', 'ANUAL', NULL, NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk16$;

-- 18. L34 — Enrique García Robles
DO $blk17$ DECLARE v_l34 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Enrique García Robles', 'GARE72101017SB8', '2 de Abril 48 A, Santa Ana Tlapaltitlán, C.P. 50160, Toluca', 'ACTIVO', true)
  RETURNING id INTO v_l34;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l34, 'IWOL-2025-L34', 'L34', 'L34',
    '2025-10-28', '2026-10-27', '17120.00', NULL, '28',
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'Erika Uribe Cedillo', NULL,
    'VIGENTE', 'EN_EJECUCION'
  );
END $blk17$;

-- 19. L35 — Andrea Castillo Velázquez
DO $blk18$ DECLARE v_l35 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Andrea Castillo Velázquez', 'CAVA851220AW3 (mismo que L11-12)', 'Circuito Puerta del Sol 13-14 (mismo que L11-12)', 'ACTIVO', true)
  RETURNING id INTO v_l35;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l35, 'IWOL-2024-L35', 'L35', 'L35',
    '2024-08-02', '2025-08-20', '15900.00', NULL, '2',
    10, '12', 0,
    'Uso comercial', 'ANUAL', 'Olliver Mendoza Gómez (misma persona que L11-12)', 'IFE 2514024108073 (mismo que L11-12)',
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk18$;

-- 20. L36 — Nancy Gallardo Fuentes
DO $blk19$ DECLARE v_l36 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Nancy Gallardo Fuentes', NULL, 'Av. Gobernadores 1622, Interior 36 (mismo que local)', 'ACTIVO', true)
  RETURNING id INTO v_l36;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l36, 'IWOL-2025-L36', 'L36', 'L36',
    '2025-09-15', '2026-09-14', '15000.00', '15000', '15',
    10, NULL, 0,
    'USO COMERCIAL', 'ANUAL', NULL, NULL,
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk19$;

-- 21. L3738 — Leonardo Félix Viñas Osorio
DO $blk20$ DECLARE v_l3738 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Leonardo Félix Viñas Osorio', 'VIOL8411202X2', 'Calle Benito Juárez García 404 005, San Mateo Oxtotitlán, C.P. 50100, Toluca', 'ACTIVO', true)
  RETURNING id INTO v_l3738;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l3738, 'IWOL-2024-L3738', 'L37, L38', 'L37|L38',
    '2024-09-06', '2026-10-05', '27500.00', '52000', '5',
    10, '12', 1,
    'Uso comercial', 'ANUAL', 'Donato Alberto Montes de Oca Martínez', NULL,
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk20$;

-- 22. L0607 — Vorwerk México, S. de R.L. de C.V.
DO $blk21$ DECLARE v_l0607 UUID;
BEGIN
  INSERT INTO public.arrendatarios (locatario, rfc, domicilio_fiscal, estatus, activo)
  VALUES ('Vorwerk México, S. de R.L. de C.V.', NULL, 'Vito Alessio Robles 38, Col. Florida, C.P. 01030, Álvaro Obregón, CDMX', 'ACTIVO', true)
  RETURNING id INTO v_l0607;

  INSERT INTO public.contratos (
    arrendatario_id, numero_contrato, locales_display, locales_referencia,
    fecha_inicio, fecha_fin, renta_mensual, deposito_garantia, dia_pago,
    penalizacion_pct, pagares_cantidad, periodo_gracia_meses,
    giro_autorizado, tipo_contrato, fiador_nombre, fiador_ife,
    estatus, estatus_proceso
  ) VALUES (
    v_l0607, 'IWOL-2024-L0607', 'L6, L7', 'L6|L7',
    '2024-04-09', '2025-05-08', '36500.00', NULL, '9',
    10, '12', 1,
    'Venta, distribución y demostración de electrodomésticos', 'ANUAL', 'Horacio Hernández Huerta (por propio derecho — es el mismo apoderado)', 'IFE 0553039941011',
    'VENCIDO', 'EN_EJECUCION'
  );
END $blk21$;

NOTIFY pgrst, 'reload schema';