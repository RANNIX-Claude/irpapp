-- Vending: conteo físico del inventario inicial + costo promedio ponderado por semana.
--
-- Problemas que resuelve (2026-09-29):
--  · La utilidad se calculaba con el costo y precio ACTUALES del catálogo, así que cambiar el catálogo
--    reescribía la utilidad de semanas pasadas. Ahora cada semana congela su propio costo.
--  · El inventario inicial solo tenía cantidad, no costo, y el arrastre teórico producía negativos
--    (22 filas en QA) sin dejar rastro de la diferencia contra lo físico.
--
-- Modelo:
--  · costo_inicial        costo/unidad del inventario con el que abre la semana (= costo_prom_semana de la anterior).
--  · costo_prom_semana    (inicial × costo_inicial + importe_compras) / (inicial + compras). Toda la venta de la
--                         semana se costea a este valor y es el que arrastra la semana siguiente.
--  · utilidad_semana      importe_ventas − qty_ventas × costo_prom_semana (precio real cobrado, no el de catálogo).
--  · qty_inicial_confirmado / qty_ajuste_inicial / motivo_ajuste: conteo físico al abrir la semana. El ajuste
--                         = conteo − inventario teórico (final de la semana anterior); es la merma (−) o el sobrante (+).
--
-- Rollback: DROP de las 3 funciones/triggers nuevos + las 6 columnas; el trigger de propagación previo está en
-- 20260926100000_vending_arrastre_inventario.sql.

BEGIN;

ALTER TABLE public.vending_semana_producto
  ADD COLUMN IF NOT EXISTS qty_inicial_confirmado boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qty_ajuste_inicial     numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motivo_ajuste          text,
  ADD COLUMN IF NOT EXISTS costo_inicial          numeric(10,4),
  ADD COLUMN IF NOT EXISTS costo_prom_semana      numeric(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilidad_semana        numeric(12,2) NOT NULL DEFAULT 0;

-- ── 1. Cálculo de costo y utilidad de la fila (siempre, sin importar qué pantalla escriba) ──────────────
CREATE OR REPLACE FUNCTION public.fn_vending_costos()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_ini  date;
  v_prev numeric;
  v_den  numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT fecha_inicio INTO v_ini FROM vending_semanas WHERE id = NEW.semana_id;
    IF v_ini IS NOT NULL THEN
      SELECT p.costo_prom_semana INTO v_prev
        FROM vending_semana_producto p
        JOIN vending_semanas s ON s.id = p.semana_id
       WHERE s.fecha_inicio = v_ini - 7 AND p.producto_id = NEW.producto_id
       LIMIT 1;
      IF FOUND AND COALESCE(v_prev, 0) > 0 THEN NEW.costo_inicial := v_prev; END IF;
    END IF;
  END IF;

  NEW.costo_inicial := COALESCE(NULLIF(NEW.costo_inicial, 0), NULLIF(NEW.precio_compra_semana, 0), 0);
  v_den := GREATEST(NEW.qty_inicial, 0) + NEW.qty_compras;
  IF v_den > 0 THEN
    NEW.costo_prom_semana := (GREATEST(NEW.qty_inicial, 0) * NEW.costo_inicial + NEW.importe_compras) / v_den;
  ELSE
    NEW.costo_prom_semana := NEW.costo_inicial;
  END IF;
  NEW.utilidad_semana := NEW.importe_ventas - NEW.qty_ventas * NEW.costo_prom_semana;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vending_costos ON public.vending_semana_producto;
CREATE TRIGGER trg_vending_costos
  BEFORE INSERT OR UPDATE ON public.vending_semana_producto
  FOR EACH ROW EXECUTE FUNCTION public.fn_vending_costos();

-- ── 2. Propagación a la semana siguiente (solo si está ABIERTA): cantidad y costo ──────────────────────
--    Un inicial ya confirmado por conteo físico NO se sobrescribe; el costo sí sigue a la semana anterior.
CREATE OR REPLACE FUNCTION public.fn_vending_propagar_final()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_ini date;
BEGIN
  SELECT fecha_inicio INTO v_ini FROM vending_semanas WHERE id = NEW.semana_id;
  IF v_ini IS NULL THEN RETURN NULL; END IF;
  UPDATE vending_semana_producto d
     SET qty_inicial   = CASE WHEN d.qty_inicial_confirmado THEN d.qty_inicial ELSE NEW.qty_final END,
         costo_inicial = NEW.costo_prom_semana
    FROM vending_semanas s
   WHERE d.semana_id = s.id
     AND s.fecha_inicio = v_ini + 7
     AND s.estado = 'ABIERTA'
     AND d.producto_id = NEW.producto_id
     AND ( (NOT d.qty_inicial_confirmado AND d.qty_inicial IS DISTINCT FROM NEW.qty_final)
        OR (COALESCE(NEW.costo_prom_semana, 0) > 0 AND d.costo_inicial IS DISTINCT FROM NEW.costo_prom_semana) );
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_vending_propagar_final ON public.vending_semana_producto;
CREATE TRIGGER trg_vending_propagar_final
  AFTER INSERT OR UPDATE OF qty_inicial, qty_compras, qty_ventas, importe_compras, costo_inicial
  ON public.vending_semana_producto
  FOR EACH ROW EXECUTE FUNCTION public.fn_vending_propagar_final();

-- ── 3. Conteo físico: confirma el inventario inicial de una semana ABIERTA y registra la merma ─────────
--    p_conteos = [{"producto_id": "...", "qty": 12}, ...]. Devuelve cuántos productos quedaron confirmados.
CREATE OR REPLACE FUNCTION public.confirmar_inventario_inicial(
  p_semana_id uuid, p_conteos jsonb, p_motivo text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado  text;
  v_ini     date;
  v_item    jsonb;
  v_qty     numeric;
  v_teorico numeric;
  v_n       integer := 0;
BEGIN
  IF NOT es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  SELECT estado, fecha_inicio INTO v_estado, v_ini FROM vending_semanas WHERE id = p_semana_id;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Semana inexistente'; END IF;
  IF v_estado <> 'ABIERTA' THEN RAISE EXCEPTION 'La semana está cerrada: su inventario inicial ya no se puede cambiar'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_conteos) LOOP
    v_qty := (v_item->>'qty')::numeric;
    IF v_qty IS NULL OR v_qty < 0 THEN RAISE EXCEPTION 'Conteo inválido para %', v_item->>'producto_id'; END IF;

    SELECT p.qty_final INTO v_teorico
      FROM vending_semana_producto p
      JOIN vending_semanas s ON s.id = p.semana_id
     WHERE s.fecha_inicio = v_ini - 7 AND p.producto_id = (v_item->>'producto_id')::uuid
     LIMIT 1;
    IF NOT FOUND THEN
      SELECT qty_inicial INTO v_teorico FROM vending_semana_producto
       WHERE semana_id = p_semana_id AND producto_id = (v_item->>'producto_id')::uuid;
    END IF;

    UPDATE vending_semana_producto
       SET qty_inicial            = v_qty,
           qty_inicial_confirmado = true,
           qty_ajuste_inicial     = v_qty - COALESCE(v_teorico, 0),
           motivo_ajuste          = p_motivo
     WHERE semana_id = p_semana_id AND producto_id = (v_item->>'producto_id')::uuid;
    IF FOUND THEN v_n := v_n + 1; END IF;
  END LOOP;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.fn_vending_costos()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_vending_propagar_final()               FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_inventario_inicial(uuid, jsonb, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.confirmar_inventario_inicial(uuid, jsonb, text) TO authenticated, service_role;

-- ── 4. Backfill: recorre las semanas en orden y encadena el costo (cada una parte del costo de la anterior) ──
DO $$
DECLARE w record;
BEGIN
  FOR w IN SELECT DISTINCT s.fecha_inicio
             FROM vending_semanas s JOIN vending_semana_producto d ON d.semana_id = s.id
            ORDER BY s.fecha_inicio LOOP
    UPDATE vending_semana_producto d
       SET costo_inicial = COALESCE(
             (SELECT p.costo_prom_semana
                FROM vending_semana_producto p JOIN vending_semanas ps ON ps.id = p.semana_id
               WHERE ps.fecha_inicio = w.fecha_inicio - 7 AND p.producto_id = d.producto_id
                 AND p.costo_prom_semana > 0
               LIMIT 1),
             NULLIF(d.costo_inicial, 0),
             -- semanas históricas sin costo capturado: mejor estimación = costo unitario actual del catálogo
             (SELECT CASE WHEN vp.unidades_caja > 0 AND vp.costo_caja > 0 THEN vp.costo_caja / vp.unidades_caja
                          ELSE NULLIF(vp.precio_proveedor, 0) END
                FROM vending_productos vp WHERE vp.id = d.producto_id))
      FROM vending_semanas s
     WHERE s.id = d.semana_id AND s.fecha_inicio = w.fecha_inicio;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
