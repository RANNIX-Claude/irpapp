-- ================================================================
-- MIGRACIÓN 011: Cobranza rentas Jul/Ago/Sep 2026
-- • Genera cargos_programados para contratos activos en el 1ro de cada mes
-- • Jul y Ago: PAGADO → ingreso + aplicación_pago
-- • Sep: PENDIENTE (cobranza vigente)
-- ================================================================

DO $cobranza$
DECLARE
  v_mes     RECORD;
  v_con     RECORD;
  v_cargo   UUID;
  v_ingreso BIGINT;
  v_venc    DATE;
  v_ref     TEXT;
BEGIN

  FOR v_mes IN
    SELECT * FROM (VALUES
      (7, 2026, DATE '2026-07-01', FALSE),
      (8, 2026, DATE '2026-08-01', FALSE),
      (9, 2026, DATE '2026-09-01', TRUE)
    ) AS t(mes, anio, primer_dia, es_pendiente)
  LOOP

    FOR v_con IN
      SELECT c.id, c.numero_contrato, c.locales_display, c.renta_mensual, c.dia_pago
      FROM public.contratos c
      WHERE c.fecha_inicio <= v_mes.primer_dia
        AND c.fecha_fin    >= v_mes.primer_dia
        AND c.renta_mensual IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.cargos_programados cp
          WHERE cp.contrato_id = c.id
            AND cp.periodo_mes  = v_mes.mes
            AND cp.periodo_anio = v_mes.anio
            AND cp.concepto     = 'RENTA'
        )
    LOOP

      -- Fecha de vencimiento = día de pago del mes
      v_venc := make_date(
        v_mes.anio, v_mes.mes,
        LEAST(COALESCE(v_con.dia_pago::INT, 5), 28)
      );

      v_ref := 'RENTA-' || v_con.numero_contrato || '-' ||
               LPAD(v_mes.mes::TEXT, 2, '0') || '-' || v_mes.anio::TEXT;

      -- 1. Cargo programado
      INSERT INTO public.cargos_programados (
        contrato_id, concepto, descripcion,
        periodo_mes, periodo_anio, importe,
        fecha_vencimiento, estado, generado_auto
      ) VALUES (
        v_con.id, 'RENTA',
        'Renta ' || TO_CHAR(v_mes.primer_dia, 'TMMonth YYYY') ||
        ' — ' || v_con.locales_display,
        v_mes.mes, v_mes.anio, v_con.renta_mensual,
        v_venc,
        CASE WHEN v_mes.es_pendiente THEN 'PENDIENTE' ELSE 'PAGADO' END,
        TRUE
      ) RETURNING id INTO v_cargo;

      -- 2. Ingreso y aplicación solo si ya pagó
      IF NOT v_mes.es_pendiente THEN

        INSERT INTO public.ingresos (
          fecha, id_contrato, locales_contrato,
          tipo, mes, anio,
          importe, origen, concepto_origen,
          creado_por, contrato_id, importe_total
        ) VALUES (
          v_venc,
          v_con.numero_contrato,
          v_con.locales_display,
          'RENTA', v_mes.mes, v_mes.anio,
          v_con.renta_mensual,
          'PAGO_MANUAL', v_ref,
          'SISTEMA', v_con.id, v_con.renta_mensual
        ) RETURNING id INTO v_ingreso;

        INSERT INTO public.aplicaciones_pago (
          ingreso_id, cargo_id, importe_aplicado,
          fecha_aplicacion, nota
        ) VALUES (
          v_ingreso, v_cargo, v_con.renta_mensual,
          v_venc,
          'Pago ' || TO_CHAR(v_mes.primer_dia, 'Mon-YYYY')
        );

      END IF;

    END LOOP; -- contratos
  END LOOP;   -- meses

END $cobranza$;

-- ─────────────────────────────────────────────────
-- Resumen por mes
-- ─────────────────────────────────────────────────
SELECT
  cp.periodo_mes                    AS mes,
  cp.periodo_anio                   AS anio,
  cp.estado,
  COUNT(*)                          AS contratos,
  TO_CHAR(SUM(cp.importe), 'FM$999,999,990.00') AS total_renta
FROM public.cargos_programados cp
WHERE cp.periodo_anio = 2026
  AND cp.periodo_mes  IN (7, 8, 9)
GROUP BY cp.periodo_mes, cp.periodo_anio, cp.estado
ORDER BY cp.periodo_mes, cp.estado;
