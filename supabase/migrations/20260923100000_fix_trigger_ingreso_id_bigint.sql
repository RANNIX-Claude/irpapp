-- Fix: trg_fn_aplicaciones_er_mensual declaraba v_ingreso_id UUID
-- pero aplicaciones_pago.ingreso_id es BIGINT → el trigger fallaba en cualquier
-- DELETE/INSERT/UPDATE sobre aplicaciones_pago con error
-- "invalid input syntax for type uuid: '<entero>'".
-- La función solo lee ingresos.fecha para saber el mes a recalcular; el tipo
-- correcto es BIGINT, que coincide con ingresos.id (BIGSERIAL).

CREATE OR REPLACE FUNCTION public.trg_fn_aplicaciones_er_mensual()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ingreso_id BIGINT;
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
