-- Vending: no se puede vender lo que no hay.
--
-- La captura (movimiento y carga en bloque) ya valida en pantalla; este candado protege la base sin importar
-- por qué camino se escriba (agente, script, otra pantalla). Solo bloquea cuando la venta AUMENTA y deja el
-- inventario negativo: las filas históricas ya negativas (Coca −15, Pepsi −10 al 2026-09-29) no se rechazan
-- mientras nadie les sume más ventas, y el conteo físico / las compras siguen pudiendo corregirlas.
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_vending_no_vender_sin_stock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.qty_ventas > COALESCE(OLD.qty_ventas, 0)
     AND (NEW.qty_inicial + NEW.qty_compras - NEW.qty_ventas) < 0 THEN
    RAISE EXCEPTION 'No se puede vender más de lo que hay: inicial % + compras % − ventas % quedaría en %',
      NEW.qty_inicial, NEW.qty_compras, NEW.qty_ventas, (NEW.qty_inicial + NEW.qty_compras - NEW.qty_ventas)
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vending_no_vender_sin_stock ON public.vending_semana_producto;
CREATE TRIGGER trg_vending_no_vender_sin_stock
  BEFORE INSERT OR UPDATE OF qty_ventas ON public.vending_semana_producto
  FOR EACH ROW EXECUTE FUNCTION public.fn_vending_no_vender_sin_stock();

REVOKE ALL ON FUNCTION public.fn_vending_no_vender_sin_stock() FROM PUBLIC;

COMMIT;
