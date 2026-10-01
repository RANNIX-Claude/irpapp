-- Generación de moras (sanciones por atraso) bajo control del administrador, además del corte automático
-- de medianoche (netlify/functions/generar-sanciones.js, cron 23:55). Pedido del usuario (2026-10-01):
-- poder ejecutar el proceso a mano desde Cobranza y ver antes "vas a crear N cargos" con su monto.
--
-- De paso se corrigen dos cosas de fn_generar_sanciones que afectaban al corte automático también:
--  1. Nunca usaba el penalizacion_pct del contrato (CLAUDE.md: "5% mensual, configurable por contrato");
--     aplicaba el 10% parejo a todos. Ahora usa el % del contrato si lo tiene capturado, y el parámetro
--     p_pct_default (10% por default, igual que antes) solo como respaldo para los que no lo tienen.
--  2. No revisaba si el contrato ya estaba TERMINADO: un contrato cancelado con un cargo de renta sin
--     pagar seguía generando mora mes tras mes (el caso IWOL-2025-L10 del reporte de fallas del 26-sep).
--     Ya no se le genera mora a un contrato TERMINADO.

CREATE OR REPLACE FUNCTION public.fn_generar_sanciones(p_pct_default numeric DEFAULT 0.10)
RETURNS TABLE(contratos_afectados integer, sanciones_creadas integer)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cargo RECORD;
  v_monto NUMERIC;
  v_pct   NUMERIC;
  v_cnt   INT := 0;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Solo el personal puede generar sanciones por mora' USING ERRCODE = '42501';
  END IF;

  FOR v_cargo IN
    SELECT cp.id, cp.contrato_id, cp.importe, cp.periodo_mes, cp.periodo_anio, cp.descripcion, ct.penalizacion_pct
    FROM public.cargos_programados cp
    JOIN public.contratos ct ON ct.id = cp.contrato_id
    WHERE cp.concepto = 'RENTA' AND cp.estado IN ('PENDIENTE', 'PARCIAL')
      AND cp.fecha_vencimiento < CURRENT_DATE
      AND ct.estatus_proceso <> 'TERMINADO'
      AND NOT EXISTS (SELECT 1 FROM public.cargos_programados s
        WHERE s.origen_cargo_id = cp.id AND s.concepto = 'SANCION'
          AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE))
  LOOP
    SELECT cp2.importe - COALESCE(SUM(ap.importe_aplicado), 0) INTO v_monto
    FROM public.cargos_programados cp2
    LEFT JOIN public.aplicaciones_pago ap ON ap.cargo_id = cp2.id
    WHERE cp2.id = v_cargo.id GROUP BY cp2.importe;

    v_pct := COALESCE(v_cargo.penalizacion_pct, p_pct_default * 100) / 100.0;

    IF v_monto > 0 THEN
      INSERT INTO public.cargos_programados (contrato_id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, origen_cargo_id, generado_auto)
      VALUES (v_cargo.contrato_id, 'SANCION', 'Sanción por mora — ' || COALESCE(v_cargo.descripcion, ''),
        EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT,
        ROUND(v_monto * v_pct, 2), CURRENT_DATE + 5, v_cargo.id, TRUE);
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_cnt, v_cnt;
END;
$function$;

-- Vista previa: misma selección y mismo cálculo de fn_generar_sanciones, sin insertar nada. La usa el
-- botón "Generar moras del mes" en Cobranza para mostrar "vas a crear N cargos por $X" antes de ejecutar.
CREATE OR REPLACE FUNCTION public.fn_previsualizar_sanciones(p_pct_default numeric DEFAULT 0.10)
RETURNS TABLE(
  cargo_id uuid, contrato_id uuid, folio text, arrendatario_nombre text,
  periodo_mes integer, periodo_anio integer, dias_vencido integer,
  saldo_pendiente numeric, pct_aplicado numeric, importe_sancion numeric
)
LANGUAGE sql STABLE
AS $function$
  SELECT
    cp.id, cp.contrato_id, pc.folio, pc.arrendatario_nombre,
    cp.periodo_mes, cp.periodo_anio, (CURRENT_DATE - cp.fecha_vencimiento)::int,
    saldo.monto,
    COALESCE(ct.penalizacion_pct, p_pct_default * 100),
    ROUND(saldo.monto * (COALESCE(ct.penalizacion_pct, p_pct_default * 100) / 100.0), 2)
  FROM public.cargos_programados cp
  JOIN public.contratos ct ON ct.id = cp.contrato_id
  JOIN public.prp_contratos pc ON pc.id = cp.contrato_id
  CROSS JOIN LATERAL (
    SELECT cp.importe - COALESCE(SUM(ap.importe_aplicado), 0) AS monto
    FROM public.aplicaciones_pago ap WHERE ap.cargo_id = cp.id
  ) saldo
  WHERE public.es_staff()
    AND cp.concepto = 'RENTA' AND cp.estado IN ('PENDIENTE', 'PARCIAL')
    AND cp.fecha_vencimiento < CURRENT_DATE
    AND ct.estatus_proceso <> 'TERMINADO'
    AND saldo.monto > 0
    AND NOT EXISTS (SELECT 1 FROM public.cargos_programados s
      WHERE s.origen_cargo_id = cp.id AND s.concepto = 'SANCION'
        AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE))
  ORDER BY cp.fecha_vencimiento;
$function$;

REVOKE ALL ON FUNCTION public.fn_previsualizar_sanciones(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_previsualizar_sanciones(numeric) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
