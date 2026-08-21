-- ============================================================
-- Agrega locales faltantes en prp.unidades:
--   L1–L7 (Zona 1, columna izquierda + fondo)
--   L39   (Zona 2, ADMON)
-- Los metros y renta_base son valores de referencia.
-- ============================================================

INSERT INTO prp.unidades (inmueble_id, numero_local, metros_cuadrados, renta_base, tiene_servicio_agua)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L1',  80.00, 25000.00, TRUE),  -- ANDA TÚ (restaurante grande)
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L2',  18.00,  7000.00, TRUE),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L3',  18.00,  7000.00, TRUE),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L4',  18.00,  7000.00, TRUE),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L5',  22.00,  9000.00, TRUE),  -- Restaurante
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L6',  22.00,  9000.00, TRUE),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L7',  22.00,  9000.00, TRUE),
  ('aaaaaaaa-0001-0001-0001-000000000001', 'L39', 30.00,     0.00, FALSE)  -- Administración IWOL
ON CONFLICT (inmueble_id, numero_local) DO NOTHING;
