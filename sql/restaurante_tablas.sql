-- ── Módulo Restaurante: tablas de gastos ────────────────────────────────────
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.restaurante_gastos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  fecha         date        NOT NULL,
  mes           integer,
  anio          integer,
  proveedor     text,
  razon_social  text,
  rfc           text,
  folio         text,
  subtotal      numeric(12,2),
  iva           numeric(12,2),
  total         numeric(12,2),
  ticket_url    text,
  tiene_factura boolean     DEFAULT false,
  grupo_gasto   text,
  descripcion   text,
  notas         text
);

CREATE TABLE IF NOT EXISTS public.restaurante_gasto_detalle (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id       uuid REFERENCES public.restaurante_gastos(id) ON DELETE CASCADE,
  sku            text,
  descripcion    text,
  cantidad       numeric(10,3),
  precio_unit    numeric(12,2),
  subtotal_linea numeric(12,2),
  tasa_impuesto  text,
  created_at     timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.restaurante_gastos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_gasto_detalle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_gastos_auth"
  ON public.restaurante_gastos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "restaurante_detalle_auth"
  ON public.restaurante_gasto_detalle FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
