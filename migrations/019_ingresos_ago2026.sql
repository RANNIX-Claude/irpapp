-- ================================================================
-- MIGRACIÓN 019: Cargos + Ingresos AGOSTO 2026
-- Contratos que pagaron renta corriente en JUL26 → PAGADO en AGO26
-- Contratos en mora que pagaron adeudos en JUL26  → PENDIENTE en AGO26
--   (L8, L13, L34, L37-38 seguían al corriente en julio)
-- Anti-duplicado: salta si ya existe cargo AGO26 para el contrato.
-- ================================================================

DO $ago$
DECLARE
  v_cargo_id   UUID;
  v_ingreso_id BIGINT;
  v_con_id     UUID;
  v_importe    NUMERIC;
  v_local      TEXT;
  v_num_con    TEXT;
  v_venc       DATE;
  r            RECORD;
BEGIN

  -- ── Contratos al corriente: PAGADO en agosto ────────────────────────────
  FOR r IN
    SELECT * FROM (VALUES
      ('IWOL-2024-L0607',  39273.20::NUMERIC, '2026-08-03'::DATE),
      ('IWOL-2025-L09',    25892.00::NUMERIC, '2026-08-17'::DATE),
      ('IWOL-2026-L1112',  37234.00::NUMERIC, '2026-08-10'::DATE),
      ('IWOL-2024-L14',    18872.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L15',    19855.00::NUMERIC, '2026-08-05'::DATE),
      ('IWOL-2025-L17',    18501.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L18',    17500.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2026-L19',    17500.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2026-L23',    17780.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2026-L29',    16955.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L30',    17650.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L3132',  31500.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2026-L33',    16500.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2024-L35',    15900.00::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L36',    15000.00::NUMERIC, '2026-08-01'::DATE)
    ) AS t(num_con, importe_real, fecha_pago)
  LOOP

    SELECT c.id, c.locales_display, c.numero_contrato,
           COALESCE(r.importe_real, c.renta_mensual)
    INTO   v_con_id, v_local, v_num_con, v_importe
    FROM   public.contratos c
    WHERE  c.numero_contrato = r.num_con;

    IF v_con_id IS NULL THEN
      RAISE NOTICE 'No encontrado: %', r.num_con; CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.cargos_programados
      WHERE contrato_id = v_con_id AND periodo_mes = 8 AND periodo_anio = 2026 AND concepto = 'RENTA'
    ) THEN
      RAISE NOTICE 'Ya existe AGO26: %', v_num_con; CONTINUE;
    END IF;

    v_venc := r.fecha_pago;

    INSERT INTO public.cargos_programados (
      contrato_id, concepto, descripcion,
      periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, generado_auto
    ) VALUES (
      v_con_id, 'RENTA', 'Renta Agosto 2026 — ' || v_local,
      8, 2026, v_importe, v_venc, 'PAGADO', TRUE
    ) RETURNING id INTO v_cargo_id;

    INSERT INTO public.ingresos (
      fecha, id_contrato, locales_contrato, tipo, mes, anio,
      importe, importe_total, origen, concepto_origen, creado_por, contrato_id
    ) VALUES (
      v_venc, v_num_con, v_local, 'RENTA', 8, 2026,
      v_importe, v_importe, 'PAGO_MANUAL',
      'RENTA-' || v_num_con || '-08-2026', 'SISTEMA', v_con_id
    ) RETURNING id INTO v_ingreso_id;

    INSERT INTO public.aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota)
    VALUES (v_ingreso_id, v_cargo_id, v_importe, v_venc, 'Pago Ago-2026');

    RAISE NOTICE 'PAGADO AGO26: % — $%', v_num_con, v_importe;
  END LOOP;

  -- ── Contratos que en JUL pagaron adeudos: solo generar cargo PENDIENTE ──
  -- L08  → pagó RENTA+SANCION MAY26 en julio
  -- L13  → pagó RENTA+SANCION ABR26 en julio
  -- L34  → pagó RENTA+SANCION FEB26 y MAR26 en julio
  -- L37-38 → pagó RENTA JUN26 parcial en julio
  FOR r IN
    SELECT * FROM (VALUES
      ('IWOL-2025-L08',   NULL::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L13',   NULL::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2025-L34',   NULL::NUMERIC, '2026-08-01'::DATE),
      ('IWOL-2024-L3738', NULL::NUMERIC, '2026-08-01'::DATE)
    ) AS t(num_con, importe_real, fecha_pago)
  LOOP

    SELECT c.id, c.locales_display, c.numero_contrato,
           COALESCE(r.importe_real, c.renta_mensual)
    INTO   v_con_id, v_local, v_num_con, v_importe
    FROM   public.contratos c
    WHERE  c.numero_contrato = r.num_con;

    IF v_con_id IS NULL THEN
      RAISE NOTICE 'No encontrado: %', r.num_con; CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.cargos_programados
      WHERE contrato_id = v_con_id AND periodo_mes = 8 AND periodo_anio = 2026 AND concepto = 'RENTA'
    ) THEN
      RAISE NOTICE 'Ya existe AGO26: %', v_num_con; CONTINUE;
    END IF;

    v_venc := r.fecha_pago;

    -- Solo cargo PENDIENTE, sin ingreso ni aplicación (aún no se ha confirmado el pago)
    INSERT INTO public.cargos_programados (
      contrato_id, concepto, descripcion,
      periodo_mes, periodo_anio, importe, fecha_vencimiento, estado, generado_auto
    ) VALUES (
      v_con_id, 'RENTA',
      'Renta Agosto 2026 — ' || v_local || ' (en proceso de regularización)',
      8, 2026, v_importe, v_venc, 'PENDIENTE', TRUE
    );

    RAISE NOTICE 'PENDIENTE AGO26: % — $% (pagó adeudos en jul)', v_num_con, v_importe;
  END LOOP;

END $ago$;

-- ── Resumen ─────────────────────────────────────────────────────────────────
SELECT
  con.locales_display   AS local,
  cp.importe,
  cp.estado,
  cp.descripcion
FROM public.cargos_programados cp
JOIN public.contratos con ON con.id = cp.contrato_id
WHERE cp.periodo_mes = 8 AND cp.periodo_anio = 2026 AND cp.concepto = 'RENTA'
ORDER BY con.locales_display;
