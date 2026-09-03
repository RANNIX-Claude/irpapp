-- ================================================================
-- MIGRACIÓN 012: Ingresos reales julio 2026 (BBVA + efectivo)
-- Reemplaza simulación con datos reales del Excel db_ingresos.xlsx
-- ================================================================

-- 1. Revertir simulación de julio: borrar ingresos y aplicaciones generados
DELETE FROM public.aplicaciones_pago
  WHERE ingreso_id IN (
    SELECT id FROM public.ingresos
    WHERE mes = 7 AND anio = 2026 AND creado_por = 'SISTEMA'
  );

DELETE FROM public.ingresos WHERE mes = 7 AND anio = 2026 AND creado_por = 'SISTEMA';

-- Resetear cargos de julio a PENDIENTE para re-aplicar correctamente
UPDATE public.cargos_programados
  SET estado = 'PENDIENTE', updated_at = NOW()
  WHERE periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA';

-- 2. Insertar ingresos reales y aplicar a cargos

-- L06-L07 | RENTA JUL26 | $39,273.20
DO $ing0$ DECLARE v_ing_0 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-03',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2120',
    39273.2, 39273.2,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2024-L0607'
  RETURNING id INTO v_ing_0;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2024-L0607')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_0 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_0, v_cargo, 39273.2, COALESCE('2026-07-03', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing0$;

-- L09 | RENTA JUL26 | $25,892.00
DO $ing1$ DECLARE v_ing_1 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-20',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2195',
    25892.0, 25892.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L09'
  RETURNING id INTO v_ing_1;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L09')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_1 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_1, v_cargo, 25892.0, COALESCE('2026-07-20', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing1$;

-- L11-L12 | RENTA JUL26 | $37,234.00
DO $ing2$ DECLARE v_ing_2 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-15',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2175',
    37234.0, 37234.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2026-L1112'
  RETURNING id INTO v_ing_2;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2026-L1112')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_2 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_2, v_cargo, 37234.0, COALESCE('2026-07-15', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing2$;

-- L14 | RENTA JUL26 | $18,872.00
DO $ing3$ DECLARE v_ing_3 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-06',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2176',
    18872.0, 18872.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2024-L14'
  RETURNING id INTO v_ing_3;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2024-L14')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_3 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_3, v_cargo, 18872.0, COALESCE('2026-07-06', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing3$;

-- L15 | RENTA JUL26 | $19,855.00
DO $ing4$ DECLARE v_ing_4 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-14',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2122',
    19855.0, 19855.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L15'
  RETURNING id INTO v_ing_4;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L15')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_4 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_4, v_cargo, 19855.0, COALESCE('2026-07-14', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing4$;

-- L17 | RENTA JUL26 | $18,501.00
DO $ing5$ DECLARE v_ing_5 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-05',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2141',
    18501.0, 18501.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L17'
  RETURNING id INTO v_ing_5;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L17')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_5 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_5, v_cargo, 18501.0, COALESCE('2026-07-05', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing5$;

-- L18 | RENTA JUL26 | $17,500.00
DO $ing6$ DECLARE v_ing_6 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-20',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2196',
    17500.0, 17500.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L18'
  RETURNING id INTO v_ing_6;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L18')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_6 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_6, v_cargo, 17500.0, COALESCE('2026-07-20', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing6$;

-- L19 | RENTA JUL26 | $11,000.00
DO $ing7$ DECLARE v_ing_7 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-22',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2197',
    11000.0, 11000.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', 'Pago 1 de 2',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2026-L19'
  RETURNING id INTO v_ing_7;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2026-L19')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_7 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_7, v_cargo, 11000.0, COALESCE('2026-07-22', CURRENT_DATE), 'Pago 1 de 2');

    UPDATE public.cargos_programados
      SET estado = 'PARCIAL', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing7$;

-- L19 | RENTA JUL26 | $6,500.00
DO $ing8$ DECLARE v_ing_8 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    NULL,
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, NULL,
    6500.0, 6500.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', 'Pago 2 de 2; fecha, factura y concepto no especificados en el origen',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2026-L19'
  RETURNING id INTO v_ing_8;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2026-L19')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_8 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_8, v_cargo, 6500.0, COALESCE(NULL, CURRENT_DATE), 'Pago 2 de 2; fecha, factura y concepto no especificados en el origen');

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing8$;

-- L23 | RENTA JUL26 | $17,780.00
DO $ing9$ DECLARE v_ing_9 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-03',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, 'EFECTIVO 572',
    17780.0, 17780.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', 'Cobro en efectivo',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2026-L23'
  RETURNING id INTO v_ing_9;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2026-L23')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_9 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_9, v_cargo, 17780.0, COALESCE('2026-07-03', CURRENT_DATE), 'Cobro en efectivo');

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing9$;

-- L29 | RENTA JUL26 | $16,955.00
DO $ing10$ DECLARE v_ing_10 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-03',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2142',
    16955.0, 16955.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2026-L29'
  RETURNING id INTO v_ing_10;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2026-L29')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_10 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_10, v_cargo, 16955.0, COALESCE('2026-07-03', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing10$;

-- L30 | RENTA JUL26 | $17,650.00
DO $ing11$ DECLARE v_ing_11 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-23',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, NULL,
    17650.0, 17650.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', 'Sin factura en el origen',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L30'
  RETURNING id INTO v_ing_11;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L30')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_11 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_11, v_cargo, 17650.0, COALESCE('2026-07-23', CURRENT_DATE), 'Sin factura en el origen');

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing11$;

-- L31-L32 | RENTA JUL26 | $31,500.00
DO $ing12$ DECLARE v_ing_12 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-10',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, '2153',
    31500.0, 31500.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L3132'
  RETURNING id INTO v_ing_12;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L3132')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_12 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_12, v_cargo, 31500.0, COALESCE('2026-07-10', CURRENT_DATE), NULL);

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing12$;

-- L33 | RENTA JUL26 | $16,500.00
DO $ing13$ DECLARE v_ing_13 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-16',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, NULL,
    16500.0, 16500.0,
    'TRANSFERENCIA BBVA JUL26', 'RENTA JUL26', 'Sin factura en el origen',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2026-L33'
  RETURNING id INTO v_ing_13;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2026-L33')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_13 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_13, v_cargo, 16500.0, COALESCE('2026-07-16', CURRENT_DATE), 'Sin factura en el origen');

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing13$;

-- L35 | None | $15,900.00
DO $ing14$ DECLARE v_ing_14 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    NULL,
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, NULL,
    15900.0, 15900.0,
    'TRANSFERENCIA BBVA JUL26', NULL, 'Fecha, factura y concepto no especificados en el origen; concepto asumido RENTA JUL26',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2024-L35'
  RETURNING id INTO v_ing_14;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2024-L35')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_14 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_14, v_cargo, 15900.0, COALESCE(NULL, CURRENT_DATE), 'Fecha, factura y concepto no especificados en el origen; concepto asumido RENTA JUL26');

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing14$;

-- L36 | None | $15,000.00
DO $ing15$ DECLARE v_ing_15 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    NULL,
    c.numero_contrato,
    c.locales_display,
    'RENTA', 7, 2026, NULL,
    15000.0, 15000.0,
    'TRANSFERENCIA BBVA JUL26', NULL, 'Fecha, factura y concepto no especificados en el origen; concepto asumido RENTA JUL26',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L36'
  RETURNING id INTO v_ing_15;

  -- Cargo de julio correspondiente
  SELECT id INTO v_cargo
  FROM public.cargos_programados
  WHERE contrato_id = (SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2025-L36')
    AND periodo_mes = 7 AND periodo_anio = 2026 AND concepto = 'RENTA'
  LIMIT 1;

  IF v_cargo IS NOT NULL AND v_ing_15 IS NOT NULL THEN
    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ing_15, v_cargo, 15000.0, COALESCE(NULL, CURRENT_DATE), 'Fecha, factura y concepto no especificados en el origen; concepto asumido RENTA JUL26');

    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = v_cargo;
  END IF;
END $ing15$;

-- L08 | RENTA MAY26 | $19,250.00
DO $ing16$ DECLARE v_ing_16 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-08',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 5, 2026, '2151',
    19250.0, 19250.0,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'RENTA MAY26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L08'
  RETURNING id INTO v_ing_16;
END $ing16$;

-- L13 | RENTA ABR26 | $21,815.20
DO $ing17$ DECLARE v_ing_17 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-07',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 4, 2026, '2147',
    21815.2, 21815.2,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'RENTA ABR26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L13'
  RETURNING id INTO v_ing_17;
END $ing17$;

-- L34 | RENTA FEB26 | $18,832.00
DO $ing18$ DECLARE v_ing_18 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-07',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 2, 2026, '2143',
    18832.0, 18832.0,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'RENTA FEB26', NULL,
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L34'
  RETURNING id INTO v_ing_18;
END $ing18$;

-- L34 | RENTA MAR26 | $18,832.00
DO $ing19$ DECLARE v_ing_19 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    NULL,
    c.numero_contrato,
    c.locales_display,
    'RENTA', 3, 2026, '2145',
    18832.0, 18832.0,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'RENTA MAR26', 'Sin fecha en el origen',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L34'
  RETURNING id INTO v_ing_19;
END $ing19$;

-- L37-L38 | RENTA JUN26 P1 | $20,000.00
DO $ing20$ DECLARE v_ing_20 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-20',
    c.numero_contrato,
    c.locales_display,
    'RENTA', 6, 2026, NULL,
    20000.0, 20000.0,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'RENTA JUN26 P1', 'Pago parcial 1',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2024-L3738'
  RETURNING id INTO v_ing_20;
END $ing20$;

-- L37-L38 | RENTA JUN26 P2 | $10,250.00
DO $ing21$ DECLARE v_ing_21 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    NULL,
    c.numero_contrato,
    c.locales_display,
    'RENTA', 6, 2026, NULL,
    10250.0, 10250.0,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'RENTA JUN26 P2', 'Pago parcial 2; concepto asumido (celda vacía en el origen)',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2024-L3738'
  RETURNING id INTO v_ing_21;
END $ing21$;

-- L13 | AGUA 2ºBIM26 | $378.80
DO $ing22$ DECLARE v_ing_22 BIGINT; v_cargo UUID;
BEGIN
  -- Ingreso
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT
    '2026-07-07',
    c.numero_contrato,
    c.locales_display,
    'OTRO', 4, 2026, NULL,
    378.8, 378.8,
    'TRANSFERENCIA BBVA - AGUA', 'AGUA 2ºBIM26', '2º bimestre 2026 (mar-abr); se asigna al mes de cierre del bimestre',
    'REAL', c.id
  FROM public.contratos c
  WHERE c.numero_contrato = 'IWOL-2025-L13'
  RETURNING id INTO v_ing_22;
END $ing22$;


-- ================================================================
-- Resumen final cargos julio 2026
-- ================================================================
SELECT cp.estado, COUNT(*) AS contratos,
       TO_CHAR(SUM(cp.importe), 'FM$999,999,990.00') AS total_cargo,
       TO_CHAR(SUM(COALESCE(ap.total_aplicado,0)), 'FM$999,999,990.00') AS total_pagado
FROM public.cargos_programados cp
LEFT JOIN (
  SELECT cargo_id, SUM(importe_aplicado) AS total_aplicado
  FROM public.aplicaciones_pago GROUP BY cargo_id
) ap ON ap.cargo_id = cp.id
WHERE cp.periodo_mes = 7 AND cp.periodo_anio = 2026 AND cp.concepto = 'RENTA'
GROUP BY cp.estado ORDER BY cp.estado;