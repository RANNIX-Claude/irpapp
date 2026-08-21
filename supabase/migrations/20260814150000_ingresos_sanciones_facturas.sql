-- ═══════════════════════════════════════════════════════════════════════
-- IRP — Sanciones, tipo de cobro y facturas por ingreso
-- RANNIX Consulting · 2026-08-14
-- ═══════════════════════════════════════════════════════════════════════
-- RESUMEN:
--   • cobros_programados.tipo  → RENTA | SANCION | CUOTA_MANT | RECARGO
--   • ingresos.tipo_concepto   → RENTA | SANCION | CUOTA_MANT | RECARGO
--   • ingresos.factura_numero  → folio de la factura CFDI emitida
--   • ingresos.factura_serie   → serie (A, B, C…)
--   • ingresos.factura_pdf_url → URL Supabase Storage
--   • ingresos.factura_xml_url → URL Supabase Storage
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Agregar tipo a cobros_programados ──────────────────────────────
ALTER TABLE public.cobros_programados
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'RENTA';

ALTER TABLE public.cobros_programados
  DROP CONSTRAINT IF EXISTS cobros_programados_tipo_check;
ALTER TABLE public.cobros_programados
  ADD CONSTRAINT cobros_programados_tipo_check
  CHECK (tipo IN ('RENTA','SANCION','CUOTA_MANT','RECARGO','OTRO'));

-- ── 2. Agregar campos de factura e ingreso a ingresos ────────────────
ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS tipo_concepto  TEXT NOT NULL DEFAULT 'RENTA',
  ADD COLUMN IF NOT EXISTS factura_numero TEXT,
  ADD COLUMN IF NOT EXISTS factura_serie  TEXT,
  ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS factura_xml_url TEXT;

ALTER TABLE public.ingresos
  DROP CONSTRAINT IF EXISTS ingresos_tipo_concepto_check;
ALTER TABLE public.ingresos
  ADD CONSTRAINT ingresos_tipo_concepto_check
  CHECK (tipo_concepto IN ('RENTA','SANCION','CUOTA_MANT','RECARGO','OTRO'));

-- ── 3. RPC: registrar_sancion ─────────────────────────────────────────
-- Crea un cobro_programado de tipo SANCION + un ingreso vinculado.
-- El monto del cobro y del ingreso son iguales (la sanción ya fue pagada).
-- Parámetros:
--   p_contrato_id         → UUID del contrato arrendamiento
--   p_referencia_pago     → texto que identifica el cobro (ej. "CON-001")
--   p_arrendatario_nombre → nombre para poblar el cobro
--   p_mes, p_anio         → período al que corresponde la sanción
--   p_monto               → importe de la sanción
--   p_fecha               → fecha del pago
--   p_forma_pago          → TRANSFERENCIA | CHEQUE | EFECTIVO
--   p_referencia_banco    → descripción del movimiento banco
--   p_movimiento_banco_id → opcional, FK a movimientos_banco
--   p_factura_numero      → folio factura CFDI
--   p_nota                → texto libre
-- Retorna: UUID del cobro_programado creado
CREATE OR REPLACE FUNCTION public.registrar_sancion(
  p_contrato_id         UUID,
  p_referencia_pago     TEXT,
  p_arrendatario_nombre TEXT,
  p_mes                 INT,
  p_anio                INT,
  p_monto               NUMERIC(14,2),
  p_fecha               DATE,
  p_forma_pago          TEXT    DEFAULT 'TRANSFERENCIA',
  p_referencia_banco    TEXT    DEFAULT NULL,
  p_movimiento_banco_id BIGINT  DEFAULT NULL,
  p_factura_numero      TEXT    DEFAULT NULL,
  p_nota                TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cobro_id   UUID;
  v_ingreso_id BIGINT;
BEGIN
  -- Crear cobro_programado tipo SANCION (ya pagado)
  INSERT INTO public.cobros_programados (
    referencia_pago, arrendatario_nombre,
    tipo, mes, anio,
    fecha_cobro, monto_total, monto_pagado,
    estatus, conciliado, fecha_pago_real
  ) VALUES (
    p_referencia_pago, p_arrendatario_nombre,
    'SANCION', p_mes, p_anio,
    p_fecha, p_monto, p_monto,
    'PAGADO', TRUE, p_fecha
  )
  RETURNING id INTO v_cobro_id;

  -- Crear ingreso vinculado (el trigger recalculará el cobro a PAGADO)
  INSERT INTO public.ingresos (
    fecha, id_contrato, cobro_id, movimiento_banco_id,
    tipo, tipo_concepto, mes, anio, importe,
    origen, concepto_origen, factura_numero, nota, creado_por
  ) VALUES (
    p_fecha, p_contrato_id, v_cobro_id, p_movimiento_banco_id,
    'SANCION', 'SANCION', p_mes, p_anio, p_monto,
    p_forma_pago, COALESCE(p_referencia_banco,''),
    p_factura_numero, p_nota, 'MANUAL'
  )
  RETURNING id INTO v_ingreso_id;

  -- Marcar movimiento banco como conciliado si aplica
  IF p_movimiento_banco_id IS NOT NULL THEN
    UPDATE public.movimientos_banco
       SET conciliado = TRUE, ingreso_id = v_ingreso_id
     WHERE id = p_movimiento_banco_id;
  END IF;

  RETURN v_cobro_id;
END;
$$;

-- ── 4. Actualizar RPC registrar_pago_cobro para soportar campos factura
-- (recreamos con los campos nuevos)
CREATE OR REPLACE FUNCTION public.registrar_pago_cobro(
  p_cobro_id            UUID,
  p_fecha               DATE,
  p_monto               NUMERIC(14,2),
  p_forma_pago          TEXT    DEFAULT 'TRANSFERENCIA',
  p_referencia_banco    TEXT    DEFAULT NULL,
  p_movimiento_banco_id BIGINT  DEFAULT NULL,
  p_nota                TEXT    DEFAULT NULL,
  p_tipo_concepto       TEXT    DEFAULT 'RENTA',
  p_factura_numero      TEXT    DEFAULT NULL,
  p_factura_serie       TEXT    DEFAULT NULL
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
    tipo, tipo_concepto, mes, anio, importe,
    origen, concepto_origen, factura_numero, factura_serie,
    nota, creado_por
  ) VALUES (
    p_fecha,
    v_cobro.referencia_pago,
    p_cobro_id,
    p_movimiento_banco_id,
    UPPER(p_tipo_concepto),
    UPPER(p_tipo_concepto),
    v_cobro.mes,
    v_cobro.anio,
    p_monto,
    p_forma_pago,
    COALESCE(p_referencia_banco, ''),
    p_factura_numero,
    p_factura_serie,
    p_nota,
    'MANUAL'
  )
  RETURNING id INTO v_ingreso_id;

  IF p_movimiento_banco_id IS NOT NULL THEN
    UPDATE public.movimientos_banco
       SET conciliado = TRUE, ingreso_id = v_ingreso_id
     WHERE id = p_movimiento_banco_id;
  END IF;

  -- El trigger trg_ingreso_recalc recalcula cobros_programados automáticamente
  RETURN v_ingreso_id;
END;
$$;

-- ── 5. Vista prp_ingresos_cobro actualizada con campos factura ─────────
CREATE OR REPLACE VIEW public.prp_ingresos_cobro AS
SELECT
  i.id,
  i.cobro_id,
  i.fecha,
  i.importe,
  i.tipo_concepto,
  i.origen          AS forma_pago,
  i.concepto_origen AS referencia_banco,
  i.factura_numero,
  i.factura_serie,
  i.factura_pdf_url,
  i.factura_xml_url,
  i.nota,
  i.creado_por,
  i.created_at,
  mb.descripcion    AS banco_descripcion,
  mb.fecha          AS banco_fecha,
  mb.monto          AS banco_monto
FROM public.ingresos i
LEFT JOIN public.movimientos_banco mb ON mb.id = i.movimiento_banco_id
WHERE i.cobro_id IS NOT NULL;

-- ── 6. Vista prp_cobros extendida con tipo ────────────────────────────
-- (si la vista ya existe la reemplazamos para agregar tipo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='prp_cobros') THEN
    EXECUTE $q$
      CREATE OR REPLACE VIEW public.prp_cobros AS
      SELECT
        cp.*,
        -- Suma real de ingresos para verificación
        (SELECT COALESCE(SUM(i.importe),0)
           FROM public.ingresos i
          WHERE i.cobro_id = cp.id) AS suma_ingresos
      FROM public.cobros_programados cp
    $q$;
  END IF;
END $$;

-- ── 7. Storage bucket para facturas ───────────────────────────────────
-- NOTA: El bucket 'facturas-cfdi' debe crearse en el dashboard de Supabase
-- Storage con acceso público (o privado con signed URLs).
-- Path convention: facturas-cfdi/{contrato_id}/{ingreso_id}/{tipo}.pdf/.xml
-- Aquí sólo documentamos la convención; el bucket se crea en el dashboard.
