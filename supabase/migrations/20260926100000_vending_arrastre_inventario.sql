-- Vending: el inventario final de la semana N es el inicial de la semana N+1, siempre.
--
-- Hallazgos de la auditoría del 2026-09-26 (scripts/diagnostico-vending.mjs):
--  · El inicial se copiaba UNA vez, al crear la semana siguiente; si después se capturaba o corregía la
--    semana anterior, la siguiente conservaba el valor viejo (53 productos-semana descuadrados).
--  · Algunos caminos de alta insertaban la semana con qty_inicial = 0.
--  · El corte automático actualizaba vending_semanas.fecha_corte, columna que no existía: el UPDATE fallaba
--    en silencio (el cliente no revisaba el error) y las semanas vencidas nunca se cerraban.
--
-- Solución en la base para que valga sin importar por qué pantalla o función se escriba:
--  1. columna fecha_corte;
--  2. BEFORE INSERT: si existe la semana anterior con ese producto, el inicial sale de su final;
--  3. AFTER INSERT/UPDATE: propaga el final a la semana siguiente SI está ABIERTA (una CERRADA no se toca).

ALTER TABLE public.vending_semanas ADD COLUMN IF NOT EXISTS fecha_corte timestamptz;

CREATE OR REPLACE FUNCTION public.fn_vending_inicial_desde_anterior()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_ini  date;
  v_prev numeric;
BEGIN
  SELECT fecha_inicio INTO v_ini FROM vending_semanas WHERE id = NEW.semana_id;
  IF v_ini IS NULL THEN RETURN NEW; END IF;
  SELECT p.qty_final INTO v_prev
    FROM vending_semana_producto p
    JOIN vending_semanas s ON s.id = p.semana_id
   WHERE s.fecha_inicio = v_ini - 7 AND p.producto_id = NEW.producto_id
   LIMIT 1;
  IF FOUND THEN NEW.qty_inicial := v_prev; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_vending_propagar_final()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_ini date;
BEGIN
  SELECT fecha_inicio INTO v_ini FROM vending_semanas WHERE id = NEW.semana_id;
  IF v_ini IS NULL THEN RETURN NULL; END IF;
  UPDATE vending_semana_producto d
     SET qty_inicial = NEW.qty_final
    FROM vending_semanas s
   WHERE d.semana_id = s.id
     AND s.fecha_inicio = v_ini + 7
     AND s.estado = 'ABIERTA'
     AND d.producto_id = NEW.producto_id
     AND d.qty_inicial IS DISTINCT FROM NEW.qty_final;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_vending_inicial_desde_anterior ON public.vending_semana_producto;
CREATE TRIGGER trg_vending_inicial_desde_anterior
  BEFORE INSERT ON public.vending_semana_producto
  FOR EACH ROW EXECUTE FUNCTION public.fn_vending_inicial_desde_anterior();

DROP TRIGGER IF EXISTS trg_vending_propagar_final ON public.vending_semana_producto;
CREATE TRIGGER trg_vending_propagar_final
  AFTER INSERT OR UPDATE OF qty_inicial, qty_compras, qty_ventas ON public.vending_semana_producto
  FOR EACH ROW EXECUTE FUNCTION public.fn_vending_propagar_final();

-- Las funciones de trigger no deben ser invocables directamente por la API.
REVOKE ALL ON FUNCTION public.fn_vending_inicial_desde_anterior() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_vending_propagar_final() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
