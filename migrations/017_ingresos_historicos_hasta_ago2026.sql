-- ================================================================
-- MIGRACIÓN 017: Ingresos históricos de renta — todos los contratos
-- Genera cargos_programados + ingresos + aplicaciones_pago
-- Rango: desde fecha_inicio de cada contrato hasta MIN(fecha_fin, 2026-08-31)
-- Todos marcados como PAGADO (son datos históricos confirmados)
-- No duplica: verifica existencia antes de insertar
-- ================================================================

DO $historico$
DECLARE
  v_con        RECORD;
  v_fecha_mes  DATE;
  v_fecha_fin  DATE;
  v_venc       DATE;
  v_cargo_id   UUID;
  v_ingreso_id BIGINT;
  v_ref        TEXT;
  v_mes        INT;
  v_anio       INT;
  v_limite     DATE := DATE '2026-08-31';
BEGIN

  FOR v_con IN
    SELECT
      c.id,
      c.numero_contrato,
      c.locales_display,
      c.renta_mensual,
      c.dia_pago,
      c.fecha_inicio,
      c.fecha_fin
    FROM public.contratos c
    WHERE c.renta_mensual IS NOT NULL
      AND c.renta_mensual > 0
      AND c.fecha_inicio IS NOT NULL
    ORDER BY c.fecha_inicio
  LOOP

    -- Límite real: el menor entre fecha_fin del contrato y agosto 2026
    v_fecha_fin := LEAST(COALESCE(v_con.fecha_fin, v_limite), v_limite);

    -- Iterar mes a mes desde fecha_inicio hasta el límite
    v_fecha_mes := DATE_TRUNC('month', v_con.fecha_inicio);

    WHILE v_fecha_mes <= DATE_TRUNC('month', v_fecha_fin) LOOP

      v_mes  := EXTRACT(MONTH FROM v_fecha_mes)::INT;
      v_anio := EXTRACT(YEAR  FROM v_fecha_mes)::INT;

      -- Solo si NO existe ya un cargo de RENTA para ese contrato/mes/año
      IF NOT EXISTS (
        SELECT 1 FROM public.cargos_programados cp
        WHERE cp.contrato_id  = v_con.id
          AND cp.periodo_mes  = v_mes
          AND cp.periodo_anio = v_anio
          AND cp.concepto     = 'RENTA'
      ) THEN

        -- Fecha de vencimiento: día de pago del contrato en ese mes
        v_venc := make_date(
          v_anio, v_mes,
          LEAST(COALESCE(v_con.dia_pago::INT, 5), 28)
        );

        v_ref := 'RENTA-' || v_con.numero_contrato || '-' ||
                 LPAD(v_mes::TEXT, 2, '0') || '-' || v_anio::TEXT;

        -- 1. Cargo programado PAGADO
        INSERT INTO public.cargos_programados (
          contrato_id, concepto, descripcion,
          periodo_mes, periodo_anio,
          importe, fecha_vencimiento,
          estado, generado_auto
        ) VALUES (
          v_con.id,
          'RENTA',
          'Renta ' || TO_CHAR(v_fecha_mes, 'TMMonth YYYY') || ' — ' || v_con.locales_display,
          v_mes, v_anio,
          v_con.renta_mensual,
          v_venc,
          'PAGADO',
          TRUE
        ) RETURNING id INTO v_cargo_id;

        -- 2. Ingreso correspondiente
        INSERT INTO public.ingresos (
          fecha,
          id_contrato,
          locales_contrato,
          tipo,
          mes,
          anio,
          importe,
          origen,
          concepto_origen,
          creado_por,
          contrato_id,
          importe_total
        ) VALUES (
          v_venc,
          v_con.numero_contrato,
          v_con.locales_display,
          'RENTA',
          v_mes,
          v_anio,
          v_con.renta_mensual,
          'PAGO_MANUAL',
          v_ref,
          'SISTEMA',
          v_con.id,
          v_con.renta_mensual
        ) RETURNING id INTO v_ingreso_id;

        -- 3. Aplicación de pago (cierra el cargo)
        INSERT INTO public.aplicaciones_pago (
          ingreso_id, cargo_id,
          importe_aplicado, fecha_aplicacion,
          nota
        ) VALUES (
          v_ingreso_id, v_cargo_id,
          v_con.renta_mensual,
          v_venc,
          'Pago ' || TO_CHAR(v_fecha_mes, 'Mon-YYYY')
        );

      END IF;

      -- Avanzar al siguiente mes
      v_fecha_mes := v_fecha_mes + INTERVAL '1 month';

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Migración 017 completada.';
END $historico$;

-- ── Resumen de lo generado ─────────────────────────────────────────────────
SELECT
  cp.periodo_anio                              AS anio,
  cp.periodo_mes                               AS mes,
  COUNT(DISTINCT cp.contrato_id)               AS contratos,
  COUNT(*)                                     AS cargos,
  TO_CHAR(SUM(cp.importe), 'FM$999,999,990.00') AS total_renta
FROM public.cargos_programados cp
WHERE cp.concepto     = 'RENTA'
  AND cp.generado_auto = TRUE
  AND cp.estado        = 'PAGADO'
GROUP BY cp.periodo_anio, cp.periodo_mes
ORDER BY cp.periodo_anio, cp.periodo_mes;
