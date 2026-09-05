-- Agrega campos de proyectado para RSF y Penalizaciones,
-- y split mes/otros para IVA

ALTER TABLE public.er_mensual
  ADD COLUMN IF NOT EXISTS proy_rsf          NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proy_penaliz      NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proy_iva          NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_iva_mes      NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_iva_otros    NUMERIC(14,2) DEFAULT 0;

NOTIFY pgrst, 'reload schema';
