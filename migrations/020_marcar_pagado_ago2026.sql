-- ================================================================
-- MIGRACIÓN 020: Marcar todos los cargos de RENTA AGO 2026 como PAGADO
-- Crea ingreso + aplicación para los que aún no tienen pago registrado
-- ================================================================

DO $pago_ago$
DECLARE
  r            RECORD;
  v_ingreso_id BIGINT;
BEGIN

  FOR r IN
    SELECT
      cp.id        AS cargo_id,
      cp.importe,
      cp.fecha_vencimiento,
      c.id         AS contrato_id,
      c.numero_contrato,
      c.locales_display
    FROM public.cargos_programados cp
    JOIN public.contratos c ON c.id = cp.contrato_id
    WHERE cp.periodo_mes  = 8
      AND cp.periodo_anio = 2026
      AND cp.concepto     = 'RENTA'
      AND cp.estado      != 'PAGADO'   -- solo los que aún no están pagados
  LOOP

    -- Crear ingreso si no tiene aplicación de pago
    IF NOT EXISTS (
      SELECT 1 FROM public.aplicaciones_pago WHERE cargo_id = r.cargo_id
    ) THEN

      INSERT INTO public.ingresos (
        fecha, id_contrato, locales_contrato,
        tipo, mes, anio,
        importe, importe_total,
        origen, concepto_origen,
        creado_por, contrato_id
      ) VALUES (
        r.fecha_vencimiento,
        r.numero_contrato,
        r.locales_display,
        'RENTA', 8, 2026,
        r.importe, r.importe,
        'PAGO_MANUAL',
        'RENTA-' || r.numero_contrato || '-08-2026',
        'SISTEMA',
        r.contrato_id
      ) RETURNING id INTO v_ingreso_id;

      INSERT INTO public.aplicaciones_pago (
        ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion, nota
      ) VALUES (
        v_ingreso_id, r.cargo_id, r.importe, r.fecha_vencimiento, 'Pago Ago-2026'
      );

    END IF;

    -- Marcar cargo como PAGADO
    UPDATE public.cargos_programados
      SET estado = 'PAGADO', updated_at = NOW()
      WHERE id = r.cargo_id;

    RAISE NOTICE 'PAGADO: % — $%', r.locales_display, r.importe;
  END LOOP;

END $pago_ago$;

-- ── Verificación final ───────────────────────────────────────────────────────
SELECT
  con.locales_display   AS local,
  cp.importe,
  cp.estado
FROM public.cargos_programados cp
JOIN public.contratos con ON con.id = cp.contrato_id
WHERE cp.periodo_mes = 8 AND cp.periodo_anio = 2026 AND cp.concepto = 'RENTA'
ORDER BY con.locales_display;
