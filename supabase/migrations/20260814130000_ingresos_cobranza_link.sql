-- ═══════════════════════════════════════════════════════════════════════
-- IRP — Relación Ingresos ↔ Cobranza  (1 cobro → N ingresos)
-- + Tabla movimientos_banco (estado de cuenta BBVA)
-- RANNIX Consulting · 2026-08-14
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. TABLA movimientos_banco ─────────────────────────────────────────
-- Registros del estado de cuenta bancario importado vía CSV BBVA.
-- Cada movimiento puede quedar vinculado a un ingreso al conciliar.
CREATE TABLE IF NOT EXISTS public.movimientos_banco (
  id              BIGSERIAL PRIMARY KEY,
  fecha           DATE NOT NULL,
  descripcion     TEXT,
  monto           NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  tipo            TEXT NOT NULL DEFAULT 'ABONO'
                  CHECK (tipo IN ('ABONO','CARGO')),
  referencia      TEXT,
  cuenta_banco    TEXT NOT NULL DEFAULT 'BBVA',
  mes             INT GENERATED ALWAYS AS (EXTRACT(MONTH FROM fecha)::INT) STORED,
  anio            INT GENERATED ALWAYS AS (EXTRACT(YEAR  FROM fecha)::INT) STORED,
  -- Estado de conciliación
  conciliado      BOOLEAN NOT NULL DEFAULT FALSE,
  ingreso_id      BIGINT,               -- se actualiza al conciliar
  -- Metadatos de importación
  importado_en    TIMESTAMPTZ DEFAULT NOW(),
  importado_por   TEXT        DEFAULT 'SISTEMA',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movbanco_fecha      ON public.movimientos_banco (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movbanco_conciliado ON public.movimientos_banco (conciliado);

-- ── 2. Nuevas columnas en ingresos ─────────────────────────────────────
ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS cobro_id             UUID,
  ADD COLUMN IF NOT EXISTS movimiento_banco_id  BIGINT;

-- ── 3. FK: ingresos → cobros_programados ──────────────────────────────
ALTER TABLE public.ingresos
  DROP CONSTRAINT IF EXISTS fk_ingreso_cobro;
ALTER TABLE public.ingresos
  ADD CONSTRAINT fk_ingreso_cobro
    FOREIGN KEY (cobro_id)
    REFERENCES public.cobros_programados(id)
    ON DELETE SET NULL;

-- ── 4. FK: ingresos → movimientos_banco ───────────────────────────────
ALTER TABLE public.ingresos
  DROP CONSTRAINT IF EXISTS fk_ingreso_movbanco;
ALTER TABLE public.ingresos
  ADD CONSTRAINT fk_ingreso_movbanco
    FOREIGN KEY (movimiento_banco_id)
    REFERENCES public.movimientos_banco(id)
    ON DELETE SET NULL;

-- ── 5. FK circular: movimientos_banco.ingreso_id → ingresos ───────────
ALTER TABLE public.movimientos_banco
  DROP CONSTRAINT IF EXISTS fk_movbanco_ingreso;
ALTER TABLE public.movimientos_banco
  ADD CONSTRAINT fk_movbanco_ingreso
    FOREIGN KEY (ingreso_id)
    REFERENCES public.ingresos(id)
    ON DELETE SET NULL;

-- ── 6. Agregar estado PARCIAL a cobros_programados ────────────────────
-- DROP + ADD porque no se puede ALTER una CHECK constraint en PostgreSQL
ALTER TABLE public.cobros_programados
  DROP CONSTRAINT IF EXISTS cobros_programados_estatus_check;
ALTER TABLE public.cobros_programados
  ADD CONSTRAINT cobros_programados_estatus_check
  CHECK (estatus IN ('PENDIENTE','PARCIAL','PAGADO','EN_MORA','CANCELADO'));

-- ── 7. Función: recalcular estatus cobro desde ingresos ────────────────
CREATE OR REPLACE FUNCTION public.recalc_cobro_estatus(p_cobro_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_total     NUMERIC(14,2);
  v_pagado    NUMERIC(14,2);
  v_fecha_ult DATE;
BEGIN
  SELECT monto_total INTO v_total
    FROM public.cobros_programados WHERE id = p_cobro_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(importe), 0), MAX(fecha)
    INTO v_pagado, v_fecha_ult
    FROM public.ingresos
   WHERE cobro_id = p_cobro_id;

  IF v_pagado >= v_total THEN
    UPDATE public.cobros_programados SET
      estatus         = 'PAGADO',
      monto_pagado    = v_pagado,
      fecha_pago_real = v_fecha_ult,
      conciliado      = TRUE
    WHERE id = p_cobro_id;

  ELSIF v_pagado > 0 THEN
    UPDATE public.cobros_programados SET
      estatus         = 'PARCIAL',
      monto_pagado    = v_pagado,
      fecha_pago_real = NULL
    WHERE id = p_cobro_id;

  ELSE
    -- Sin ingresos: regresar a PENDIENTE (solo si estaba en PARCIAL o PAGADO por ingresos)
    UPDATE public.cobros_programados SET
      estatus         = 'PENDIENTE',
      monto_pagado    = 0,
      fecha_pago_real = NULL,
      conciliado      = FALSE
    WHERE id = p_cobro_id AND estatus IN ('PARCIAL','PAGADO');
  END IF;
END;
$$;

-- ── 8. Trigger en ingresos → recalcula cobro automáticamente ──────────
CREATE OR REPLACE FUNCTION public.trg_fn_ingreso_recalc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.cobro_id IS NOT NULL THEN
      PERFORM public.recalc_cobro_estatus(OLD.cobro_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.cobro_id IS NOT NULL THEN
    PERFORM public.recalc_cobro_estatus(NEW.cobro_id);
  END IF;

  -- Si cambió el cobro_id, recalcular también el cobro anterior
  IF TG_OP = 'UPDATE'
     AND OLD.cobro_id IS NOT NULL
     AND OLD.cobro_id IS DISTINCT FROM NEW.cobro_id THEN
    PERFORM public.recalc_cobro_estatus(OLD.cobro_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingreso_recalc ON public.ingresos;
CREATE TRIGGER trg_ingreso_recalc
  AFTER INSERT OR UPDATE OF cobro_id, importe, fecha
                 OR DELETE ON public.ingresos
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_ingreso_recalc();

-- ── 9. RPC: registrar_pago_cobro ───────────────────────────────────────
-- Crea un ingreso vinculado a un cobro.
-- El trigger recalcula automáticamente el estatus del cobro.
CREATE OR REPLACE FUNCTION public.registrar_pago_cobro(
  p_cobro_id            UUID,
  p_fecha               DATE,
  p_monto               NUMERIC(14,2),
  p_forma_pago          TEXT    DEFAULT 'TRANSFERENCIA',
  p_referencia_banco    TEXT    DEFAULT NULL,
  p_movimiento_banco_id BIGINT  DEFAULT NULL,
  p_nota                TEXT    DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ingreso_id  BIGINT;
  v_cobro       RECORD;
BEGIN
  SELECT * INTO v_cobro
    FROM public.cobros_programados
   WHERE id = p_cobro_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobro no encontrado: %', p_cobro_id;
  END IF;

  INSERT INTO public.ingresos (
    fecha, id_contrato, cobro_id, movimiento_banco_id,
    tipo, mes, anio, importe,
    origen, concepto_origen, nota, creado_por
  ) VALUES (
    p_fecha,
    v_cobro.referencia_pago,
    p_cobro_id,
    p_movimiento_banco_id,
    'RENTA',
    v_cobro.mes,
    v_cobro.anio,
    p_monto,
    p_forma_pago,
    COALESCE(p_referencia_banco, ''),
    p_nota,
    'MANUAL'
  )
  RETURNING id INTO v_ingreso_id;

  -- Si viene de un movimiento banco, marcarlo como conciliado
  IF p_movimiento_banco_id IS NOT NULL THEN
    UPDATE public.movimientos_banco
       SET conciliado = TRUE, ingreso_id = v_ingreso_id
     WHERE id = p_movimiento_banco_id;
  END IF;

  -- El trigger en ingresos ya recalcula cobros_programados.
  RETURN v_ingreso_id;
END;
$$;

-- ── 10. RPC: conciliar_banco_batch ────────────────────────────────────
-- Batch desde módulo Conciliación:
--   p_matches = JSON array de { cobro_id, fecha, monto, descripcion }
-- Para cada match:
--   1. Guarda en movimientos_banco
--   2. Crea ingreso vinculado
--   3. El trigger recalcula el cobro
-- Returns JSON { ok, fail }
CREATE OR REPLACE FUNCTION public.conciliar_banco_batch(
  p_matches  TEXT   -- JSON
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_items   JSON;
  v_item    JSON;
  v_ok      INT  := 0;
  v_fail    INT  := 0;
  v_mov_id  BIGINT;
  v_ing_id  BIGINT;
BEGIN
  v_items := p_matches::JSON;

  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    BEGIN
      -- Guardar movimiento banco
      INSERT INTO public.movimientos_banco (
        fecha, descripcion, monto, tipo, referencia, conciliado
      ) VALUES (
        (v_item->>'fecha')::DATE,
        v_item->>'descripcion',
        (v_item->>'monto')::NUMERIC,
        'ABONO',
        v_item->>'referencia',
        FALSE
      )
      RETURNING id INTO v_mov_id;

      -- Crear ingreso vinculado al cobro
      SELECT public.registrar_pago_cobro(
        (v_item->>'cobro_id')::UUID,
        (v_item->>'fecha')::DATE,
        (v_item->>'monto')::NUMERIC,
        'TRANSFERENCIA',
        v_item->>'descripcion',
        v_mov_id,
        NULL
      ) INTO v_ing_id;

      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
    END;
  END LOOP;

  RETURN json_build_object('ok', v_ok, 'fail', v_fail);
END;
$$;

-- ── 11. RLS: movimientos_banco ─────────────────────────────────────────
ALTER TABLE public.movimientos_banco ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_movimientos" ON public.movimientos_banco;
CREATE POLICY "auth_all_movimientos"
  ON public.movimientos_banco FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);

-- ── 12. Vista: prp_movimientos_banco ─────────────────────────────────
CREATE OR REPLACE VIEW public.prp_movimientos_banco AS
SELECT
  mb.id,
  mb.fecha,
  mb.descripcion,
  mb.monto,
  mb.tipo,
  mb.referencia,
  mb.cuenta_banco,
  mb.mes,
  mb.anio,
  mb.conciliado,
  mb.ingreso_id,
  mb.importado_en,
  -- Datos del cobro asociado (vía ingreso)
  i.cobro_id,
  cp.referencia_pago,
  cp.arrendatario_nombre
FROM public.movimientos_banco mb
LEFT JOIN public.ingresos i         ON i.id = mb.ingreso_id
LEFT JOIN public.prp_cobros cp      ON cp.id = i.cobro_id;

-- ── 13. Vista: prp_ingresos_cobro ─────────────────────────────────────
-- Para listar los ingresos de un cobro específico en el modal de Cobranza
CREATE OR REPLACE VIEW public.prp_ingresos_cobro AS
SELECT
  i.id,
  i.cobro_id,
  i.fecha,
  i.importe,
  i.origen      AS forma_pago,
  i.concepto_origen AS referencia_banco,
  i.nota,
  i.creado_por,
  i.created_at,
  -- Movimiento banco si existe
  mb.descripcion AS banco_descripcion,
  mb.fecha       AS banco_fecha,
  mb.monto       AS banco_monto
FROM public.ingresos i
LEFT JOIN public.movimientos_banco mb ON mb.id = i.movimiento_banco_id
WHERE i.cobro_id IS NOT NULL;
