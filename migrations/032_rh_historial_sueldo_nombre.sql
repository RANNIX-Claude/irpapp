-- Historial de cambios de sueldo y nombre por empleado
-- Usadas por ExpedienteEmpleado.jsx

CREATE TABLE IF NOT EXISTS public.rh_historial_sueldo (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id     UUID NOT NULL REFERENCES public.prp_contratos ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  sueldo_anterior NUMERIC(12,2),
  sueldo_nuevo    NUMERIC(12,2) NOT NULL,
  motivo          TEXT,
  tipo            TEXT DEFAULT 'AJUSTE', -- AJUSTE | PROMOCION | REVISION | INICIAL
  usuario_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rh_historial_nombre (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id     UUID NOT NULL,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  nombre_anterior TEXT,
  nombre_nuevo    TEXT NOT NULL,
  motivo          TEXT,
  usuario_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.rh_historial_sueldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_historial_nombre  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_historial_sueldo" ON public.rh_historial_sueldo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_historial_nombre" ON public.rh_historial_nombre
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hist_sueldo_emp ON public.rh_historial_sueldo (empleado_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_hist_nombre_emp ON public.rh_historial_nombre  (empleado_id, fecha DESC);

NOTIFY pgrst, 'reload schema';
