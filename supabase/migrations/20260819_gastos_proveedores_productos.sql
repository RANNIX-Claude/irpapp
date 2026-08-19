-- ============================================================
-- IRP — Gastos: Proveedores, Productos, Detalle de Ticket
-- ============================================================

-- ── 1. CATÁLOGO DE PROVEEDORES ────────────────────────────
CREATE TABLE IF NOT EXISTS public.cat_proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  rfc         TEXT,
  categoria   TEXT CHECK (categoria IN ('VENDING','OPERACION','MANTENIMIENTO','MIXTO')),
  telefono    TEXT,
  email       TEXT,
  contacto    TEXT,
  notas       TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. CATÁLOGO DE PRODUCTOS / SERVICIOS ─────────────────
CREATE TABLE IF NOT EXISTS public.cat_productos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  categoria   TEXT NOT NULL CHECK (categoria IN ('VENDING','OPERACION','MANTENIMIENTO')),
  unidad      TEXT DEFAULT 'PZA',        -- PZA, KG, LT, MT, SRV…
  precio_ref  NUMERIC(10,2),             -- precio de referencia
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ALTER gastos_operativos — añadir campos de ticket ──
ALTER TABLE public.gastos_operativos
  ADD COLUMN IF NOT EXISTS proveedor_id   UUID REFERENCES public.cat_proveedores(id),
  ADD COLUMN IF NOT EXISTS ticket_total   NUMERIC(12,2),   -- total del ticket (cifra de control)
  ADD COLUMN IF NOT EXISTS ticket_img_url TEXT;            -- URL imagen en Storage

-- ── 4. DETALLE DE TICKET ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gasto_detalle (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id     UUID NOT NULL REFERENCES public.gastos_operativos(id) ON DELETE CASCADE,
  producto_id  UUID REFERENCES public.cat_productos(id),
  descripcion  TEXT NOT NULL,
  categoria    TEXT CHECK (categoria IN ('VENDING','OPERACION','MANTENIMIENTO')),
  cantidad     NUMERIC(10,3) NOT NULL DEFAULT 1,
  precio_unit  NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(cantidad * precio_unit, 2)) STORED,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. VISTA GASTOS ENRIQUECIDA ───────────────────────────
DROP VIEW IF EXISTS public.prp_gastos;
CREATE VIEW public.prp_gastos AS
SELECT
  g.id, g.fecha, g.semana, g.anio, g.mes, g.dia_semana,
  g.grupo_gasto, g.descripcion,
  g.cantidad                               AS monto,
  COALESCE(g.ticket_total, g.cantidad)     AS ticket_total,
  g.ticket_img_url,
  g.proveedor                              AS proveedor_txt,
  g.proveedor_id,
  p.nombre                                 AS proveedor_nombre,
  p.categoria                              AS proveedor_cat,
  (SELECT COALESCE(SUM(d.subtotal), 0) FROM public.gasto_detalle d WHERE d.gasto_id = g.id) AS suma_detalle,
  (SELECT COUNT(*)                         FROM public.gasto_detalle d WHERE d.gasto_id = g.id) AS num_lineas,
  g.created_at
FROM public.gastos_operativos g
LEFT JOIN public.cat_proveedores p ON p.id = g.proveedor_id
ORDER BY g.fecha DESC, g.created_at DESC;

-- ── 6. RLS ────────────────────────────────────────────────
ALTER TABLE public.cat_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_productos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gasto_detalle   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON public.cat_proveedores;
CREATE POLICY "auth_all" ON public.cat_proveedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON public.cat_productos;
CREATE POLICY "auth_all" ON public.cat_productos   FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all" ON public.gasto_detalle;
CREATE POLICY "auth_all" ON public.gasto_detalle   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 7. SEED — Proveedores frecuentes ─────────────────────
INSERT INTO public.cat_proveedores (clave, nombre, categoria) VALUES
  ('DOGO',       'Dogo',              'OPERACION'),
  ('SAMS',       'Sam''s Club',       'MIXTO'),
  ('HOME_DEPOT', 'Home Depot',        'MANTENIMIENTO'),
  ('WM',         'Walmart',           'MIXTO'),
  ('OXXO',       'Oxxo',             'OPERACION'),
  ('COSTCO',     'Costco',           'MIXTO'),
  ('FERRETERIA', 'Ferretería Local',  'MANTENIMIENTO'),
  ('BIMBO',      'Bimbo',            'VENDING'),
  ('PEPSI',      'Pepsi / Sabritas',  'VENDING'),
  ('COCA',       'Coca-Cola FEMSA',   'VENDING'),
  ('MODELO',     'Grupo Modelo',      'VENDING')
ON CONFLICT (clave) DO NOTHING;

-- ── 8. SEED — Productos frecuentes ───────────────────────
INSERT INTO public.cat_productos (clave, nombre, categoria, unidad) VALUES
  -- Operación
  ('LIM_AGUA',   'Agua',                    'OPERACION', 'PZA'),
  ('LIM_BOLSA',  'Bolsa basura',            'OPERACION', 'PZA'),
  ('LIM_PAPEL',  'Papel higiénico',         'OPERACION', 'PZA'),
  ('LIM_CLORO',  'Cloro',                   'OPERACION', 'LT'),
  ('LIM_LIMPIADOR','Limpiador multiusos',   'OPERACION', 'PZA'),
  ('LIM_JABON',  'Jabón líquido manos',     'OPERACION', 'LT'),
  ('LIM_MECHUDO','Mechudo',                 'OPERACION', 'PZA'),
  ('LIM_FIBRA',  'Fibra verde',             'OPERACION', 'PZA'),
  -- Mantenimiento
  ('MANT_FOCO',  'Foco LED',                'MANTENIMIENTO', 'PZA'),
  ('MANT_CABLE', 'Cable eléctrico',         'MANTENIMIENTO', 'MT'),
  ('MANT_PINTURA','Pintura',                'MANTENIMIENTO', 'LT'),
  ('MANT_CEMEN', 'Cemento',                 'MANTENIMIENTO', 'KG'),
  -- Vending
  ('VEND_CHOC',  'Chocolate/Dulce',         'VENDING', 'PZA'),
  ('VEND_PAPA',  'Papas/Snack',             'VENDING', 'PZA'),
  ('VEND_AGUA',  'Agua embotellada',        'VENDING', 'PZA'),
  ('VEND_REFRESCO','Refresco',              'VENDING', 'PZA'),
  ('VEND_CAFE',  'Café/Bebida caliente',    'VENDING', 'PZA')
ON CONFLICT (clave) DO NOTHING;
