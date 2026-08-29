INSERT INTO public.vending_productos
  (producto, costo_caja, unidades_caja, precio_proveedor, precio_venta, utilidad_por_pieza)
VALUES
('Sabriminis', 306.0, 50, 6.12, 10.0, 3.88),
('Florentinas', 167.0, 12, 13.916666666666666, 20.0, 6.083333333333334),
('Mix Barcel', 275.0, 25, 11.0, 20.0, 9.0),
('Principe', 133.0, 18, 7.388888888888889, 15.0, 7.611111111111111),
('Salsagueti', 191.0, 24, 7.958333333333333, 10.0, 2.041666666666667),
('BranFrut', 173.0, 24, 7.208333333333333, 15.0, 7.791666666666667),
('Chocolate', 252.0, 20, 12.6, 20.0, 7.4),
('Jugos del Valle', 137.0, 16, 8.5625, 15.0, 6.4375),
('Coca', 332.0, 24, 13.833333333333334, 20.0, 6.166666666666666),
('Agua', 115.0, 50, 2.3, 10.0, 7.7),
('Pepsi', 219.0, 24, 9.125, 15.0, 5.875),
('Gatorade', 435.8, 24, 18.158333333333335, 30.0, 11.841666666666665),
('Gatorade 384ml', 290.53, 24, 12.105416666666665, 18.0, 5.894583333333335),
('Suavicremas', 162.66, 24, 6.7775, 15.0, 8.2225),
('Jarritos', 284.39, 24, 11.849583333333333, 20.0, 8.150416666666667),
('Tilikos', 80.82, 50, 1.6163999999999998, 5.0, 3.3836000000000004)
ON CONFLICT (producto) DO NOTHING;


-- ============================================================
-- VENDING SEMANAS (movimientos por semana)
-- ============================================================
DROP TABLE IF EXISTS public.vending_semanas CASCADE;
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


-- ============================================================
-- VISTAS para Estado de Resultados
-- ============================================================

-- Estacionamiento por mes
CREATE OR REPLACE VIEW public.prp_estacionamiento_mensual AS
SELECT
  anio,
  mes,
  COUNT(*)        AS dias_registrados,
  SUM(cantidad)   AS total_mes,
  AVG(cantidad)   AS promedio_dia,
  MIN(cantidad)   AS min_dia,
  MAX(cantidad)   AS max_dia
FROM public.estacionamiento_diario
GROUP BY anio, mes;

-- Gastos por mes y grupo
CREATE OR REPLACE VIEW public.prp_gastos_mensual AS
SELECT
  anio,
  mes,
  grupo_gasto,
  COUNT(*)        AS num_registros,
  SUM(cantidad)   AS total
FROM public.gastos_operativos
GROUP BY anio, mes, grupo_gasto;

-- Vending rentabilidad por semana
CREATE OR REPLACE VIEW public.prp_vending_semanas AS
SELECT
  semana_label,
  fecha_inicio,
  SUM(venta_pesos)   AS venta_total,
  SUM(utilidad)      AS utilidad_total,
  SUM(venta_unidades) AS unidades_total
FROM public.vending_semanas
GROUP BY semana_label, fecha_inicio
ORDER BY fecha_inicio;

-- Vista resumen mensual para dashboard
CREATE OR REPLACE VIEW public.prp_resumen_mensual AS
SELECT
  e.anio,
  e.mes,
  COALESCE(e.total_mes, 0)   AS estacionamiento,
  COALESCE(g.total_gastos, 0) AS gastos_operativos,
  COALESCE(v.venta_vending, 0) AS vending_ventas,
  COALESCE(v.util_vending, 0)  AS vending_utilidad
FROM public.prp_estacionamiento_mensual e
LEFT JOIN (
  SELECT anio, mes, SUM(total) AS total_gastos
  FROM public.prp_gastos_mensual
  GROUP BY anio, mes
) g ON g.anio = e.anio AND g.mes = e.mes
LEFT JOIN (
  SELECT
    EXTRACT(YEAR FROM fecha_inicio)::INT AS anio,
    TO_CHAR(fecha_inicio, 'Month')       AS mes,
    SUM(venta_total)  AS venta_vending,
    SUM(utilidad_total) AS util_vending
  FROM public.prp_vending_semanas
  WHERE fecha_inicio IS NOT NULL
  GROUP BY 1, 2
) v ON v.anio = e.anio AND TRIM(v.mes) = e.mes;


-- RLS
ALTER TABLE public.estacionamiento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_operativos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vending_semanas        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON public.estacionamiento_diario FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.gastos_operativos      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.vending_productos      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.vending_semanas        FOR ALL TO authenticated USING (true) WITH CHECK (true);