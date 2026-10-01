-- Agregar DEPOSITO_GARANTIA como concepto válido.
--
-- cargos_programados.concepto: RENTA | SANCION | MANTENIMIENTO | AGUA | OTRO
-- → se agrega DEPOSITO_GARANTIA para registrar el cargo inicial de depósito
--   que se genera al firmar un contrato.
--
-- ingresos.tipo_concepto: RENTA | SANCION | CUOTA_MANT | RECARGO | OTRO
-- → se agrega DEPOSITO_GARANTIA para asociar el pago de ese depósito.

-- ── 1. cargos_programados ────────────────────────────────────────────────────
ALTER TABLE public.cargos_programados
  DROP CONSTRAINT IF EXISTS cargos_programados_concepto_check;

ALTER TABLE public.cargos_programados
  ADD CONSTRAINT cargos_programados_concepto_check
  CHECK (concepto IN ('RENTA','SANCION','MANTENIMIENTO','AGUA','DEPOSITO_GARANTIA','OTRO'));

-- ── 2. ingresos.tipo ─────────────────────────────────────────────────────────
-- `tipo` es el campo principal (RENTA | SANCION | AGUA | OTRO)
ALTER TABLE public.ingresos
  DROP CONSTRAINT IF EXISTS ingresos_tipo_check;

ALTER TABLE public.ingresos
  ADD CONSTRAINT ingresos_tipo_check
  CHECK (tipo IN ('RENTA','SANCION','AGUA','DEPOSITO_GARANTIA','OTRO'));

-- ── 3. ingresos.tipo_concepto ─────────────────────────────────────────────────
ALTER TABLE public.ingresos
  DROP CONSTRAINT IF EXISTS ingresos_tipo_concepto_check;

ALTER TABLE public.ingresos
  ADD CONSTRAINT ingresos_tipo_concepto_check
  CHECK (tipo_concepto IN ('RENTA','SANCION','CUOTA_MANT','RECARGO','DEPOSITO_GARANTIA','OTRO'));

NOTIFY pgrst, 'reload schema';
