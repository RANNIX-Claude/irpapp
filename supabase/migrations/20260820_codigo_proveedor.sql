-- ============================================================
-- IRP — código de proveedor para doble match Sam's / vending
-- ============================================================

-- Agregar código Sam's a catálogo de productos generales
ALTER TABLE public.cat_productos
  ADD COLUMN IF NOT EXISTS codigo_proveedor TEXT;

-- Agregar código Sam's a catálogo de productos vending
ALTER TABLE public.vending_productos
  ADD COLUMN IF NOT EXISTS codigo_proveedor TEXT;

-- Índices para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_cat_productos_codigo  ON public.cat_productos(codigo_proveedor) WHERE codigo_proveedor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vending_prod_codigo   ON public.vending_productos(codigo_proveedor) WHERE codigo_proveedor IS NOT NULL;

-- Agregar codigo_proveedor a gasto_detalle para guardarlo en el ticket
ALTER TABLE public.gasto_detalle
  ADD COLUMN IF NOT EXISTS codigo_proveedor TEXT;
