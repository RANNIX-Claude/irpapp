-- ============================================================
-- ESTACIONAMIENTO DIARIO
-- ============================================================
DROP TABLE IF EXISTS public.estacionamiento_diario CASCADE;
CREATE TABLE public.estacionamiento_diario (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  anio        INT,
  mes         TEXT,
  dia_semana  TEXT,
  semana      TEXT,
  cantidad    NUMERIC(10,2) NOT NULL,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON public.estacionamiento_diario (fecha);

-- ============================================================
-- GASTOS OPERATIVOS
-- ============================================================
DROP TABLE IF EXISTS public.gastos_operativos CASCADE;
CREATE TABLE public.gastos_operativos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  proveedor   TEXT,
  grupo_gasto TEXT,
  descripcion TEXT,
  cantidad    NUMERIC(10,2) NOT NULL,
  anio        INT,
  mes         TEXT,
  dia_semana  TEXT,
  semana      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON public.gastos_operativos (fecha);
CREATE INDEX ON public.gastos_operativos (grupo_gasto);

-- ============================================================
-- VENDING PRODUCTOS (catálogo base)
-- ============================================================
DROP TABLE IF EXISTS public.vending_semanas CASCADE;
DROP TABLE IF EXISTS public.vending_productos CASCADE;
CREATE TABLE public.vending_productos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto           TEXT NOT NULL UNIQUE,
  costo_caja         NUMERIC(10,2),
  unidades_caja      INT,
  precio_proveedor   NUMERIC(10,4),
  precio_venta       NUMERIC(10,2),
  utilidad_por_pieza NUMERIC(10,4),
  activo             BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VENDING SEMANAS (movimientos por semana)
-- ============================================================
CREATE TABLE public.vending_semanas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_label    TEXT NOT NULL,
  fecha_inicio    DATE,
  producto        TEXT NOT NULL,
  compras         INT DEFAULT 0,
  inventario_ini  INT DEFAULT 0,
  inventario_fin  INT DEFAULT 0,
  venta_unidades  INT DEFAULT 0,
  venta_pesos     NUMERIC(10,2) DEFAULT 0,
  utilidad        NUMERIC(10,2) DEFAULT 0,
  semanas_inv     NUMERIC(10,4),
  baja            BOOLEAN DEFAULT FALSE,
  nota            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON public.vending_semanas (producto);
CREATE INDEX ON public.vending_semanas (semana_label);

-- RLS
ALTER TABLE public.estacionamiento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_operativos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_semanas        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON public.estacionamiento_diario;
DROP POLICY IF EXISTS "auth_all" ON public.gastos_operativos;
DROP POLICY IF EXISTS "auth_all" ON public.vending_productos;
DROP POLICY IF EXISTS "auth_all" ON public.vending_semanas;

CREATE POLICY "auth_all" ON public.estacionamiento_diario FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.gastos_operativos      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.vending_productos      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.vending_semanas        FOR ALL TO authenticated USING (true) WITH CHECK (true);
