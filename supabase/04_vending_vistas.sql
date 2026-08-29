INSERT INTO public.vending_productos
  (producto, costo_caja, unidades_caja, precio_proveedor, precio_venta, utilidad_por_pieza)
VALUES
('Sabriminis', 306.0, 50, 6.12, 10.0, 3.88),
('Florentinas', 167.0, 12, 13.9167, 20.0, 6.0833),
('Mix Barcel', 275.0, 25, 11.0, 20.0, 9.0),
('Principe', 133.0, 18, 7.3889, 15.0, 7.6111),
('Salsagueti', 191.0, NULL, NULL, 10.0, 2.0417),
('BranFrut', 173.0, NULL, NULL, 15.0, 7.7917),
('Chocolate', 252.0, NULL, NULL, 20.0, 7.4),
('Jugos del Valle', 137.0, NULL, NULL, 15.0, 6.4375),
('Coca', 332.0, NULL, NULL, 20.0, 6.1667),
('Agua', 115.0, NULL, NULL, 10.0, 7.7),
('Pepsi', 219.0, NULL, NULL, 15.0, 5.875),
('Gatorade', 435.8, NULL, NULL, 30.0, 11.8417),
('Gatorade 384ml', 290.53, NULL, NULL, 18.0, 5.8946),
('Suavicremas', 162.66, NULL, NULL, 15.0, 8.2225),
('Jarritos', 284.39, NULL, NULL, 20.0, 8.1504),
('Tilikos', 80.82, NULL, NULL, 5.0, 3.3836)
ON CONFLICT (producto) DO NOTHING;

CREATE OR REPLACE VIEW public.prp_estacionamiento_mensual AS
SELECT anio, mes, COUNT(*) AS dias_registrados, SUM(cantidad) AS total_mes,
  AVG(cantidad) AS promedio_dia, MIN(cantidad) AS min_dia, MAX(cantidad) AS max_dia
FROM public.estacionamiento_diario GROUP BY anio, mes;

CREATE OR REPLACE VIEW public.prp_gastos_mensual AS
SELECT anio, mes, grupo_gasto, COUNT(*) AS num_registros, SUM(cantidad) AS total
FROM public.gastos_operativos GROUP BY anio, mes, grupo_gasto;

CREATE OR REPLACE VIEW public.prp_vending_semanas AS
SELECT semana_label, fecha_inicio, SUM(venta_pesos) AS venta_total,
  SUM(utilidad) AS utilidad_total, SUM(venta_unidades) AS unidades_total
FROM public.vending_semanas GROUP BY semana_label, fecha_inicio ORDER BY fecha_inicio;
