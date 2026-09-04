-- ================================================================
-- MIGRACIÓN 018: L14 — Ingresos post-vencimiento de contrato
-- Contrato: IWOL-2024-L14 | Luky del Rosario González Olivo
-- Contrato formal: 2024-06-01 → 2025-05-31 (vencido)
-- Locatario sigue pagando y ocupando el local.
--
-- Genera cargos + ingresos de JUN 2025 → AGO 2026
-- con el importe real pagado: $18,872.00/mes
-- NO toca JUL 2026 (ya existe en migración 012)
-- ================================================================

DO $l14_post$
DECLARE
  v_con_id     UUID;
  v_num_con    TEXT  := 'IWOL-2024-L14';
  v_local      TEXT  := 'L14';
  v_importe    NUMERIC := 18872.00;   -- importe real pagado post-vencimiento
  v_dia_pago   INT   := 1;
  v_fecha_mes  DATE;
  v_venc       DATE;
  v_cargo_id   UUID;
  v_ingreso_id BIGINT;
  v_mes        INT;
  v_anio       INT;
BEGIN

  SELECT id INTO v_con_id
  FROM public.contratos
  WHERE numero_contrato = v_num_con;

  IF v_con_id IS NULL THEN
    RAISE EXCEPTION 'Contrato % no encontrado', v_num_con;
  END IF;

  -- Iterar JUN 2025 → AGO 2026
  v_fecha_mes := DATE '2025-06-01';

  WHILE v_fecha_mes <= DATE '2026-08-01' LOOP

    v_mes  := EXTRACT(MONTH FROM v_fecha_mes)::INT;
    v_anio := EXTRACT(YEAR  FROM v_fecha_mes)::INT;

    -- Saltar si ya existe cargo para este mes
    IF NOT EXISTS (
      SELECT 1 FROM public.cargos_programados
      WHERE contrato_id  = v_con_id
        AND periodo_mes  = v_mes
        AND periodo_anio = v_anio
        AND concepto     = 'RENTA'
    ) THEN

      v_venc := make_date(v_anio, v_mes, LEAST(v_dia_pago, 28));

      -- 1. Cargo programado PAGADO
      INSERT INTO public.cargos_programados (
        contrato_id, concepto, descripcion,
        periodo_mes, periodo_anio,
        importe, fecha_vencimiento,
        estado, generado_auto
      ) VALUES (
        v_con_id,
        'RENTA',
        'Renta ' || TO_CHAR(v_fecha_mes, 'TMMonth YYYY') || ' — ' || v_local || ' (continuación s/contrato)',
        v_mes, v_anio,
        v_importe,
        v_venc,
        'PAGADO',
        TRUE
      ) RETURNING id INTO v_cargo_id;

      -- 2. Ingreso
      INSERT INTO public.ingresos (
        fecha, id_contrato, locales_contrato,
        tipo, mes, anio,
        importe, importe_total,
        origen, concepto_origen,
        creado_por, contrato_id
      ) VALUES (
        v_venc,
        v_num_con,
        v_local,
        'RENTA', v_mes, v_anio,
        v_importe, v_importe,
        'PAGO_MANUAL',
        'RENTA-' || v_num_con || '-' || LPAD(v_mes::TEXT,2,'0') || '-' || v_anio::TEXT,
        'SISTEMA',
        v_con_id
      ) RETURNING id INTO v_ingreso_id;

      -- 3. Aplicación
      INSERT INTO public.aplicaciones_pago (
        ingreso_id, cargo_id,
        importe_aplicado, fecha_aplicacion,
        nota
      ) VALUES (
        v_ingreso_id, v_cargo_id,
        v_importe, v_venc,
        'Pago ' || TO_CHAR(v_fecha_mes, 'Mon-YYYY') || ' (contrato vencido, locatario vigente)'
      );

      RAISE NOTICE 'Generado: L14 % / %', v_mes, v_anio;

    ELSE
      RAISE NOTICE 'Saltado (ya existe): L14 % / %', v_mes, v_anio;
    END IF;

    v_fecha_mes := v_fecha_mes + INTERVAL '1 month';
  END LOOP;

END $l14_post$;

-- ── Verificación ────────────────────────────────────────────────────────────
SELECT
  cp.periodo_anio   AS anio,
  cp.periodo_mes    AS mes,
  cp.estado,
  cp.importe,
  cp.descripcion
FROM public.cargos_programados cp
WHERE cp.contrato_id = (
  SELECT id FROM public.contratos WHERE numero_contrato = 'IWOL-2024-L14'
)
  AND cp.concepto = 'RENTA'
ORDER BY cp.periodo_anio, cp.periodo_mes;
