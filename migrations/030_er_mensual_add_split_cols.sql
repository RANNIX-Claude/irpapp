-- Agrega columnas _mes / _otros por cada tipo de ingreso
-- Real total (existente) se mantiene para compatibilidad; en adelante = mes + otros

ALTER TABLE public.er_mensual
  ADD COLUMN IF NOT EXISTS real_rentas_factura_mes   NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_rentas_factura_otros  NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_rsf_mes               NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_rsf_otros             NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_penaliz_mes           NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_penaliz_otros         NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_estac_mes             NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_estac_otros           NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_pension_mes           NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_pension_otros         NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_maquinita_mes         NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_maquinita_otros       NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_agua_ing_mes          NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_agua_ing_otros        NUMERIC(14,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
