-- ─────────────────────────────────────────────────────────────────────────────
-- Gastos operativos semana Sáb 4/Jul — Vie 10/Jul 2026
-- Fuente: comprobantes físicos capturados el 2026-08-14
-- Total: $9,599.23
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.gastos_operativos
  (fecha, anio, mes, dia_semana, semana, semana_inicio,
   proveedor, proveedor_nombre, grupo_gasto,
   descripcion, cantidad, monto_pagado, tiene_factura)
VALUES
-- ── Los Canarios (Ferretería) ─────────────────────────────────────────────
  ('2026-07-04', 2026, 'Julio', 'Sábado',  'S1', '2026-06-29',
   'Los Canarios', 'Los Canarios', 'Ferretería y materiales',
   'Broca para concreto', 60.00, 60.00, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Los Canarios', 'Los Canarios', 'Ferretería y materiales',
   'Brocha', 20.00, 20.00, FALSE),

-- ── Oxxo (Servicios / Agua) ───────────────────────────────────────────────
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Oxxo', 'Oxxo', 'Servicios externos',
   'Recarga Cel', 200.00, 200.00, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Oxxo', 'Oxxo', 'Limpieza e higiene',
   'Agua', 188.00, 188.00, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Oxxo', 'Oxxo', 'Servicios externos',
   'Total Play', 777.00, 777.00, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Oxxo', 'Oxxo', 'Servicios externos',
   'Comisión Oxxo', 18.00, 18.00, FALSE),

-- ── La Comer ─────────────────────────────────────────────────────────────
  ('2026-07-04', 2026, 'Julio', 'Sábado',  'S1', '2026-06-29',
   'La Comer', 'La Comer', 'Alimentación',
   'Tes', 48.50, 48.50, FALSE),

-- ── Sam''s Club (Vending / Reabasto) ─────────────────────────────────────
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Sam''s Club', 'Sam''s Club', 'Vending / Reabasto',
   'Mix Barcel', 274.20, 274.20, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Sam''s Club', 'Sam''s Club', 'Vending / Reabasto',
   'Florentinas', 166.80, 166.80, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Sam''s Club', 'Sam''s Club', 'Vending / Reabasto',
   'Chocolate', 213.80, 213.80, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Sam''s Club', 'Sam''s Club', 'Vending / Reabasto',
   'Coca', 309.50, 309.50, FALSE),

-- ── Office Depot (Papelería) ──────────────────────────────────────────────
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Office Depot', 'Office Depot', 'Papelería y oficina',
   'Marcatexto', 74.00, 74.00, FALSE),
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Office Depot', 'Office Depot', 'Papelería y oficina',
   'Hojas', 114.00, 114.00, FALSE),

-- ── Com Gao (Ferretería) ──────────────────────────────────────────────────
  ('2026-07-06', 2026, 'Julio', 'Lunes',   'S1', '2026-06-29',
   'Com Gao', 'Com Gao', 'Ferretería y materiales',
   'Silicon', 613.23, 613.23, FALSE),

-- ── Dogo (Limpieza) ───────────────────────────────────────────────────────
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Bolsa negra', 120.00, 120.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Bolsa grande', 120.00, 120.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Papel higiénico', 510.00, 510.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Tapete antisalpicadura', 300.00, 300.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Cloro', 150.00, 150.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Limpiador', 240.00, 240.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Jabón líquido para manos', 108.00, 108.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Dogo', 'Dogo', 'Limpieza e higiene',
   'Pastilla WC', 140.00, 140.00, FALSE),

-- ── Imprenta (Servicios) ──────────────────────────────────────────────────
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Imprenta', 'Imprenta', 'Servicios externos',
   'Letreros', 1680.00, 1680.00, FALSE),

-- ── Farmacia GD ───────────────────────────────────────────────────────────
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Farmacia GD', 'Farmacia GD', 'Otros',
   'Aceite', 41.50, 41.50, FALSE),

-- ── Amazon (Herramienta / Equipo) ─────────────────────────────────────────
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Amazon', 'Amazon', 'Herramienta y equipo',
   'Regulador', 1498.99, 1498.99, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Amazon', 'Amazon', 'Herramienta y equipo',
   'Checador', 599.00, 599.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Amazon', 'Amazon', 'Servicios externos',
   'Traslado y recepción', 998.00, 998.00, FALSE),
  ('2026-07-07', 2026, 'Julio', 'Martes',  'S1', '2026-06-29',
   'Amazon', 'Amazon', 'Servicios externos',
   'Comisión', 17.00, 17.00, FALSE);

-- Verificar total insertado (debe ser ~9,599.23)
-- SELECT SUM(cantidad) FROM public.gastos_operativos
-- WHERE fecha BETWEEN '2026-07-04' AND '2026-07-10';
