-- Estado de Resultados mensual IWOL
-- Cada registro = un mes/año con proyectado + real capturado

CREATE TABLE IF NOT EXISTS public.er_mensual (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio          INTEGER NOT NULL,
  mes           INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  status        TEXT NOT NULL DEFAULT 'borrador', -- borrador | cerrado

  -- ── INGRESOS: valores proyectados (calculados al crear, editables) ──
  proy_rentas_contratos   NUMERIC(14,2) DEFAULT 0,  -- SUM renta_mensual contratos vigentes
  proy_restaurant         NUMERIC(14,2) DEFAULT 0,  -- ampliación restaurant ($/m2)
  proy_locales_vacantes   NUMERIC(14,2) DEFAULT 0,  -- pérdida por vacantes
  proy_estacionamiento    NUMERIC(14,2) DEFAULT 0,
  proy_pensiones          NUMERIC(14,2) DEFAULT 0,
  proy_maquinita          NUMERIC(14,2) DEFAULT 0,
  proy_agua_ingresos      NUMERIC(14,2) DEFAULT 0,

  -- ── INGRESOS: valores reales capturados ──
  real_rentas_factura     NUMERIC(14,2) DEFAULT 0,  -- rentas cobradas CON factura
  real_rentas_sin_factura NUMERIC(14,2) DEFAULT 0,  -- rentas cobradas SIN factura
  real_penalizaciones     NUMERIC(14,2) DEFAULT 0,
  real_iva                NUMERIC(14,2) DEFAULT 0,  -- IVA retenido (negativo = descuento)
  real_estacionamiento    NUMERIC(14,2) DEFAULT 0,
  real_pensiones          NUMERIC(14,2) DEFAULT 0,
  real_maquinita          NUMERIC(14,2) DEFAULT 0,
  real_agua_ingresos      NUMERIC(14,2) DEFAULT 0,

  -- ── GASTOS VARIABLES: proyectado ──
  proy_sueldos            NUMERIC(14,2) DEFAULT 0,  -- calculado de RH (días × sueldo diario)
  proy_fondo_revolvente   NUMERIC(14,2) DEFAULT 0,
  proy_luz                NUMERIC(14,2) DEFAULT 0,
  proy_agua_gastos        NUMERIC(14,2) DEFAULT 0,
  proy_otros_gastos       NUMERIC(14,2) DEFAULT 0,

  -- ── GASTOS VARIABLES: real capturado ──
  real_sueldos            NUMERIC(14,2) DEFAULT 0,
  real_fondo_revolvente   NUMERIC(14,2) DEFAULT 0,
  real_gasto_excedente    NUMERIC(14,2) DEFAULT 0,
  real_luz                NUMERIC(14,2) DEFAULT 0,
  real_agua_gastos        NUMERIC(14,2) DEFAULT 0,
  real_otros_gastos       NUMERIC(14,2) DEFAULT 0,

  -- ── IMPUESTOS / GASTOS FIJOS ──
  predial                 NUMERIC(14,2) DEFAULT 0,
  transporte_residuos     NUMERIC(14,2) DEFAULT 0,
  licencia_estacionamiento NUMERIC(14,2) DEFAULT 0,
  anuncio_publicitario    NUMERIC(14,2) DEFAULT 0,

  -- Metadatos
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(anio, mes)
);

-- RLS
ALTER TABLE public.er_mensual ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_er_mensual" ON public.er_mensual
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_er_mensual_updated_at ON public.er_mensual;
CREATE TRIGGER trg_er_mensual_updated_at
  BEFORE UPDATE ON public.er_mensual
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
