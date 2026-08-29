-- ═══════════════════════════════════════════════════════════════════════════
-- VENDING — Inventario Semanal
-- IRP / Plaza IWOL — RANNIX Consulting 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. CATÁLOGO DE PRODUCTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vending_productos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                TEXT NOT NULL,
  descripcion           TEXT,
  unidad                TEXT NOT NULL DEFAULT 'pza'  -- pza, caja, bolsa, lata, etc.
                          CHECK (unidad IN ('pza','caja','bolsa','lata','botella','kg','lt','otro')),
  precio_compra_default NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_venta_default  NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo                BOOLEAN NOT NULL DEFAULT true,
  orden                 INTEGER DEFAULT 0,           -- orden de aparición en captura
  created_at            TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.vending_productos IS 'Catálogo de productos de la máquina vending';

-- ── 2. SEMANAS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vending_semanas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio  DATE NOT NULL UNIQUE,               -- siempre sábado
  semana_fin     DATE NOT NULL,                      -- siempre viernes
  estado         TEXT NOT NULL DEFAULT 'ABIERTA'
                   CHECK (estado IN ('ABIERTA','CERRADA')),
  fecha_corte    TIMESTAMPTZ,                        -- cuándo se ejecutó el corte
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_semana_rango CHECK (semana_fin = semana_inicio + 6)
);

COMMENT ON TABLE public.vending_semanas IS 'Períodos semanales Sáb→Vie para control de inventario vending';

-- Índice para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_vending_semanas_inicio ON public.vending_semanas(semana_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_vending_semanas_estado ON public.vending_semanas(estado);

-- ── 3. SNAPSHOT POR PRODUCTO POR SEMANA ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vending_semana_producto (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id            UUID NOT NULL REFERENCES public.vending_semanas(id) ON DELETE CASCADE,
  producto_id          UUID NOT NULL REFERENCES public.vending_productos(id) ON DELETE RESTRICT,
  -- Inventario
  qty_inicial          NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty_compras          NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty_ventas           NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty_final            NUMERIC(10,2) GENERATED ALWAYS AS (qty_inicial + qty_compras - qty_ventas) STORED,
  -- Precios vigentes ESTA semana (pueden diferir del catálogo)
  precio_compra_semana NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_venta_semana  NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Importes calculados
  importe_compras      NUMERIC(10,2) NOT NULL DEFAULT 0,  -- suma de compras × precio_compra
  importe_ventas       NUMERIC(10,2) NOT NULL DEFAULT 0,  -- suma de ventas × precio_venta
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (semana_id, producto_id)
);

COMMENT ON TABLE public.vending_semana_producto IS 'Snapshot de inventario por producto por semana. qty_final pasa como qty_inicial a la semana siguiente.';

CREATE INDEX IF NOT EXISTS idx_vsp_semana ON public.vending_semana_producto(semana_id);
CREATE INDEX IF NOT EXISTS idx_vsp_producto ON public.vending_semana_producto(producto_id);

-- ── 4. MOVIMIENTOS (compras y ventas individuales) ────────────────────────
CREATE TABLE IF NOT EXISTS public.vending_movimientos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id       UUID NOT NULL REFERENCES public.vending_semanas(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES public.vending_productos(id) ON DELETE RESTRICT,
  fecha           DATE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('COMPRA','VENTA')),
  cantidad        NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  importe         NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  proveedor       TEXT,                             -- solo aplica en COMPRA
  nota            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.vending_movimientos IS 'Cada transacción individual de compra o venta de productos vending';

CREATE INDEX IF NOT EXISTS idx_vmov_semana   ON public.vending_movimientos(semana_id);
CREATE INDEX IF NOT EXISTS idx_vmov_producto ON public.vending_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_vmov_fecha    ON public.vending_movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_vmov_tipo     ON public.vending_movimientos(tipo);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.vending_productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_semanas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_semana_producto  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_movimientos      ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados: acceso total
CREATE POLICY "auth_all" ON public.vending_productos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all" ON public.vending_semanas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all" ON public.vending_semana_producto
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all" ON public.vending_movimientos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- VISTA — Resumen semanal de vending (útil para ResumenSemanal)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.prp_vending_semana AS
SELECT
  vs.id              AS semana_id,
  vs.semana_inicio,
  vs.semana_fin,
  vs.estado,
  vp.id              AS producto_id,
  vp.nombre          AS producto,
  vp.unidad,
  sp.qty_inicial,
  sp.qty_compras,
  sp.qty_ventas,
  sp.qty_final,
  sp.precio_venta_semana,
  sp.precio_compra_semana,
  sp.importe_ventas,
  sp.importe_compras,
  (sp.importe_ventas - sp.importe_compras) AS utilidad_bruta
FROM public.vending_semanas vs
JOIN public.vending_semana_producto sp ON sp.semana_id = vs.id
JOIN public.vending_productos vp ON vp.id = sp.producto_id
WHERE vp.activo = true
ORDER BY vs.semana_inicio DESC, vp.orden, vp.nombre;

-- ═══════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES — Productos de ejemplo (ajustar según catálogo real)
-- ═══════════════════════════════════════════════════════════════════════════
-- (Descomentar y ajustar cuando se conozca el catálogo real)
/*
INSERT INTO public.vending_productos (nombre, unidad, precio_compra_default, precio_venta_default, orden) VALUES
  ('Agua 600ml',       'pza',  6.00,  10.00, 1),
  ('Refresco 600ml',   'pza',  9.00,  15.00, 2),
  ('Papas Sabritas',   'pza',  7.00,  12.00, 3),
  ('Gansito',          'pza',  8.00,  14.00, 4),
  ('Café soluble',     'pza', 10.00,  18.00, 5),
  ('Chicles',          'pza',  4.00,   8.00, 6);
*/
