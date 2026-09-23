-- ════════════════════════════════════════════════════════════════════════════
-- Auto-actualización de er_mensual desde fuentes operativas IRP
--
-- Función: recalcular_er_mensual_local(p_anio, p_mes)
--   Recalcula los campos real_* que viven en la BD de IRP:
--     • real_rentas_factura_mes  ← ingresos + aplicaciones_pago (transferencia, periodo=mes)
--     • real_rsf_mes             ← idem efectivo
--     • real_rentas_factura_otros/real_rsf_otros ← pagos del mes para periodos anteriores
--     • real_maquinita_mes       ← vending_semanas.venta_pesos (fecha_inicio en el mes)
--
--   Los campos que vienen de la base de tickets (estacionamiento, pensiones)
--   NO se tocan aquí — se actualizan por el cron nocturno.
--   Los campos de gastos/sueldos siguen siendo captura manual en EDR.
--
-- Triggers: ingresos, aplicaciones_pago, vending_semanas
--   Llaman a la función después de cada INSERT/UPDATE/DELETE.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Función principal ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalcular_er_mensual_local(p_anio INT, p_mes INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ini DATE := make_date(p_anio, p_mes, 1);
  v_fin DATE := (make_date(p_anio, p_mes, 1) + INTERVAL '1 month - 1 day')::DATE;

  -- Rentas del mes cobradas en el mes (periodo = mes seleccionado)
  v_rf_mes    NUMERIC := 0;   -- con factura (transferencia)
  v_rsf_mes   NUMERIC := 0;   -- sin factura (efectivo)

  -- Rentas de otros periodos cobradas en el mes
  v_rf_otros  NUMERIC := 0;
  v_rsf_otros NUMERIC := 0;

  v_vending   NUMERIC := 0;

  v_filas     INT;
BEGIN
  -- Solo actualiza si el renglón ya existe (no crea meses sin autorización del staff)
  SELECT COUNT(*) INTO v_filas FROM er_mensual WHERE anio = p_anio AND mes = p_mes;
  IF v_filas = 0 THEN RETURN; END IF;

  -- ── Rentas con factura del mes (transferencia, periodo = este mes) ──────────
  SELECT COALESCE(SUM(ap.importe_aplicado), 0) INTO v_rf_mes
  FROM ingresos i
  JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
  JOIN cargos_programados cp ON cp.id = ap.cargo_id
  WHERE i.fecha BETWEEN v_ini AND v_fin
    AND cp.concepto = 'RENTA'
    AND cp.periodo_mes  = p_mes
    AND cp.periodo_anio = p_anio
    AND UPPER(COALESCE(i.origen, '')) != 'EFECTIVO';

  -- ── Rentas sin factura del mes (efectivo, periodo = este mes) ───────────────
  SELECT COALESCE(SUM(ap.importe_aplicado), 0) INTO v_rsf_mes
  FROM ingresos i
  JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
  JOIN cargos_programados cp ON cp.id = ap.cargo_id
  WHERE i.fecha BETWEEN v_ini AND v_fin
    AND cp.concepto = 'RENTA'
    AND cp.periodo_mes  = p_mes
    AND cp.periodo_anio = p_anio
    AND UPPER(COALESCE(i.origen, '')) = 'EFECTIVO';

  -- ── Rentas de otros periodos cobradas en este mes (con factura) ─────────────
  SELECT COALESCE(SUM(ap.importe_aplicado), 0) INTO v_rf_otros
  FROM ingresos i
  JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
  JOIN cargos_programados cp ON cp.id = ap.cargo_id
  WHERE i.fecha BETWEEN v_ini AND v_fin
    AND cp.concepto = 'RENTA'
    AND NOT (cp.periodo_mes = p_mes AND cp.periodo_anio = p_anio)
    AND UPPER(COALESCE(i.origen, '')) != 'EFECTIVO';

  -- ── Rentas de otros periodos cobradas en este mes (sin factura) ─────────────
  SELECT COALESCE(SUM(ap.importe_aplicado), 0) INTO v_rsf_otros
  FROM ingresos i
  JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
  JOIN cargos_programados cp ON cp.id = ap.cargo_id
  WHERE i.fecha BETWEEN v_ini AND v_fin
    AND cp.concepto = 'RENTA'
    AND NOT (cp.periodo_mes = p_mes AND cp.periodo_anio = p_anio)
    AND UPPER(COALESCE(i.origen, '')) = 'EFECTIVO';

  -- ── Vending: semanas cuya fecha_inicio cae en el mes ───────────────────────
  SELECT COALESCE(SUM(venta_pesos), 0) INTO v_vending
  FROM vending_semanas
  WHERE fecha_inicio BETWEEN v_ini AND v_fin;

  -- ── UPDATE del renglón ──────────────────────────────────────────────────────
  UPDATE er_mensual SET
    real_rentas_factura_mes    = v_rf_mes,
    real_rentas_factura_otros  = v_rf_otros,
    real_rsf_mes               = v_rsf_mes,
    real_rsf_otros             = v_rsf_otros,
    real_maquinita_mes         = v_vending
  WHERE anio = p_anio AND mes = p_mes;
  -- Postgres recalcula calc_* al instante (GENERATED ALWAYS AS STORED)
END;
$$;

COMMENT ON FUNCTION public.recalcular_er_mensual_local IS
  'Actualiza los campos real_* de er_mensual desde las fuentes IRP (rentas, vending). '
  'Llamada por triggers en ingresos, aplicaciones_pago y vending_semanas. '
  'Estacionamiento y pensiones NO se tocan — vienen de la base de tickets (cron nocturno).';

-- ── 2. Función de trigger: desde ingresos ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_ingresos_er_mensual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fecha DATE;
BEGIN
  -- En DELETE usa OLD; en INSERT/UPDATE usa NEW; en UPDATE ambos si la fecha cambió
  IF TG_OP = 'DELETE' THEN
    v_fecha := OLD.fecha;
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM v_fecha)::INT,
      EXTRACT(MONTH FROM v_fecha)::INT);
  ELSIF TG_OP = 'UPDATE' AND OLD.fecha IS DISTINCT FROM NEW.fecha THEN
    -- Fecha cambió: recalcular el mes viejo y el nuevo
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM OLD.fecha)::INT,
      EXTRACT(MONTH FROM OLD.fecha)::INT);
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM NEW.fecha)::INT,
      EXTRACT(MONTH FROM NEW.fecha)::INT);
  ELSE
    v_fecha := NEW.fecha;
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM v_fecha)::INT,
      EXTRACT(MONTH FROM v_fecha)::INT);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ingresos_er_mensual ON public.ingresos;
CREATE TRIGGER trg_ingresos_er_mensual
  AFTER INSERT OR UPDATE OR DELETE ON public.ingresos
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_ingresos_er_mensual();

-- ── 3. Función de trigger: desde aplicaciones_pago ───────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_aplicaciones_er_mensual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ingreso_id UUID;
  v_fecha      DATE;
BEGIN
  v_ingreso_id := COALESCE(NEW.ingreso_id, OLD.ingreso_id);
  SELECT fecha INTO v_fecha FROM public.ingresos WHERE id = v_ingreso_id;
  IF v_fecha IS NOT NULL THEN
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM v_fecha)::INT,
      EXTRACT(MONTH FROM v_fecha)::INT);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_aplicaciones_er_mensual ON public.aplicaciones_pago;
CREATE TRIGGER trg_aplicaciones_er_mensual
  AFTER INSERT OR UPDATE OR DELETE ON public.aplicaciones_pago
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_aplicaciones_er_mensual();

-- ── 4. Función de trigger: desde vending_semanas ─────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_vending_er_mensual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fecha DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_fecha := OLD.fecha_inicio;
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM v_fecha)::INT,
      EXTRACT(MONTH FROM v_fecha)::INT);
  ELSIF TG_OP = 'UPDATE' AND OLD.fecha_inicio IS DISTINCT FROM NEW.fecha_inicio THEN
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM OLD.fecha_inicio)::INT,
      EXTRACT(MONTH FROM OLD.fecha_inicio)::INT);
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM NEW.fecha_inicio)::INT,
      EXTRACT(MONTH FROM NEW.fecha_inicio)::INT);
  ELSE
    v_fecha := NEW.fecha_inicio;
    PERFORM public.recalcular_er_mensual_local(
      EXTRACT(YEAR  FROM v_fecha)::INT,
      EXTRACT(MONTH FROM v_fecha)::INT);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_vending_er_mensual ON public.vending_semanas;
CREATE TRIGGER trg_vending_er_mensual
  AFTER INSERT OR UPDATE OR DELETE ON public.vending_semanas
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_vending_er_mensual();

-- ── 5. Backfill: recalcular todos los meses abiertos con datos frescos ────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT anio, mes FROM public.er_mensual ORDER BY anio, mes LOOP
    PERFORM public.recalcular_er_mensual_local(r.anio, r.mes);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
