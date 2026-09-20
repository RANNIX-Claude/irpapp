-- EDR: split sanciones por con/sin factura (origen='EFECTIVO' = sin factura)
-- Razón fiscal: transferencia → factura emitida (IVA acreditable)
--               efectivo     → sin factura
BEGIN;

ALTER TABLE er_mensual
  ADD COLUMN IF NOT EXISTS real_penaliz_cf_mes    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_penaliz_sf_mes    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_penaliz_cf_otros  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_penaliz_sf_otros  NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN er_mensual.real_penaliz_cf_mes   IS 'Sanciones con factura (transferencia) — mes actual';
COMMENT ON COLUMN er_mensual.real_penaliz_sf_mes   IS 'Sanciones sin factura (efectivo) — mes actual';
COMMENT ON COLUMN er_mensual.real_penaliz_cf_otros IS 'Sanciones con factura (transferencia) — meses anteriores cobradas en el mes';
COMMENT ON COLUMN er_mensual.real_penaliz_sf_otros IS 'Sanciones sin factura (efectivo) — meses anteriores cobradas en el mes';

COMMIT;
