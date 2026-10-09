-- ═══════════════════════════════════════════════════════════════════════════
-- Recibos de nómina firmados por el trabajador
-- Cada semana el admin imprime el recibo, el empleado lo firma y se sube
-- como evidencia legal de que recibió su pago.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.nomina_recibos_firmados (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   uuid        NOT NULL REFERENCES public.rh_empleados(id) ON DELETE CASCADE,
  semana_inicio date        NOT NULL,
  recibo_url    text        NOT NULL,
  subido_por    uuid        REFERENCES auth.users(id),
  subido_en     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empleado_id, semana_inicio)
);

COMMENT ON TABLE  public.nomina_recibos_firmados                  IS 'Evidencia del recibo de nómina firmado por el trabajador, por semana';
COMMENT ON COLUMN public.nomina_recibos_firmados.semana_inicio    IS 'Lunes de la semana de nómina (formato YYYY-MM-DD)';
COMMENT ON COLUMN public.nomina_recibos_firmados.recibo_url       IS 'Ruta en expedientes-docs bucket (recibos-nomina/{semana}/{empleado_id}.{ext})';

ALTER TABLE public.nomina_recibos_firmados ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY staff_all ON public.nomina_recibos_firmados
    FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
