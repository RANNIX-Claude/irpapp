-- ═══════════════════════════════════════════════════════════════════════
-- IRP — Corte semanal Vie 26/Jun/2026 → Jue 02/Jul/2026
--   · Tabla estacionamiento_pensiones (nueva)
--   · Columnas extra en gastos_operativos y vending_semanas
--   · Datos del corte
-- RANNIX Consulting · 2026-08-14
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Tabla estacionamiento_pensiones ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.estacionamiento_pensiones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               DATE NOT NULL,
  semana_inicio       DATE,
  local_referencia    TEXT,
  arrendatario_nombre TEXT,
  monto               NUMERIC(10,2) NOT NULL DEFAULT 0,
  num_recibo          TEXT,
  pagado              BOOLEAN DEFAULT TRUE,
  nota                TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pensiones_semana ON public.estacionamiento_pensiones (semana_inicio);
ALTER TABLE public.estacionamiento_pensiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON public.estacionamiento_pensiones;
CREATE POLICY "auth_all" ON public.estacionamiento_pensiones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. Columnas extra en gastos_operativos ───────────────────────────
-- El schema real usa: proveedor, grupo_gasto, cantidad
-- Añadimos las columnas nuevas que necesita el corte semanal
ALTER TABLE public.gastos_operativos
  ADD COLUMN IF NOT EXISTS semana_inicio    DATE,
  ADD COLUMN IF NOT EXISTS grupo_clave      TEXT,
  ADD COLUMN IF NOT EXISTS proveedor_nombre TEXT,   -- alias amigable (proveedor = campo original)
  ADD COLUMN IF NOT EXISTS monto_pagado     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS monto_comprobante NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tiene_factura    BOOLEAN DEFAULT FALSE;

-- Sincronizar proveedor_nombre con proveedor para registros existentes
UPDATE public.gastos_operativos
  SET proveedor_nombre = proveedor, monto_pagado = cantidad
  WHERE proveedor_nombre IS NULL;

-- ── 3. Columnas extra en vending_semanas ─────────────────────────────
ALTER TABLE public.vending_semanas
  ADD COLUMN IF NOT EXISTS residual_pesos NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_material    BOOLEAN DEFAULT FALSE;

-- ── 4. Pensiones (semana Sáb 27-Jun → Vie 03-Jul, cobradas el Vie 26) ─
INSERT INTO public.estacionamiento_pensiones
  (fecha, semana_inicio, local_referencia, arrendatario_nombre, monto, num_recibo, pagado, nota)
VALUES
  ('2026-06-27','2026-06-27','L26-27',  NULL,          300.00,'567',TRUE, NULL),
  ('2026-06-27','2026-06-27','L17',     'Luz Adriana', 600.00,'568',TRUE, NULL),
  ('2026-06-27','2026-06-27','L18',     NULL,          300.00,'569',TRUE, NULL),
  ('2026-06-27','2026-06-27',NULL,      'Leo Viñas',   300.00,'570',TRUE, NULL),
  ('2026-06-27','2026-06-27','L11-12',  'Andrea',        0.00,'571',FALSE,
   'Pidió el recibo pero no pagó; ni vino por él');

-- ── 5. Estacionamiento diario (Sáb 27-Jun → Vie 03-Jul)
--    Misma semana Sáb→Vie, el Vie 26 queda en la semana anterior
INSERT INTO public.estacionamiento_diario (fecha, anio, mes, dia_semana, semana, cantidad)
VALUES
  ('2026-06-27',2026,'Junio',   'Sábado',    'Semana 27-Jun','1628.00'::NUMERIC),
  ('2026-06-28',2026,'Junio',   'Domingo',   'Semana 27-Jun','1378.00'::NUMERIC),
  ('2026-06-29',2026,'Junio',   'Lunes',     'Semana 27-Jun','2777.00'::NUMERIC),
  ('2026-06-30',2026,'Junio',   'Martes',    'Semana 27-Jun','1511.00'::NUMERIC),
  ('2026-07-01',2026,'Julio',   'Miércoles', 'Semana 27-Jun','2364.00'::NUMERIC),
  ('2026-07-02',2026,'Julio',   'Jueves',    'Semana 27-Jun','2229.00'::NUMERIC),
  ('2026-07-03',2026,'Julio',   'Viernes',   'Semana 27-Jun','2229.00'::NUMERIC)
ON CONFLICT (fecha)
  DO UPDATE SET cantidad = EXCLUDED.cantidad, dia_semana = EXCLUDED.dia_semana,
                semana = EXCLUDED.semana;

-- ── 6. Vending Machine (semana Sáb 27-Jun → Vie 03-Jul) ──────────────
INSERT INTO public.vending_semanas
  (semana_label, fecha_inicio, producto, venta_pesos, residual_pesos, es_material, nota)
VALUES
  ('Semana 27-Jun-2026','2026-06-27','CORTE_SEMANAL',
   975.00, 37.50, TRUE, 'Venta usada para material · Residual máquina: $37.50');

-- ── 7. Gastos Fondo Revolvente (semana_inicio = Sáb 27-Jun) ──────────
-- Columnas reales: proveedor, grupo_gasto, descripcion, cantidad, fecha, semana
-- Nuevas: semana_inicio, grupo_clave, proveedor_nombre, monto_pagado, monto_comprobante
INSERT INTO public.gastos_operativos
  (fecha, anio, mes, semana, semana_inicio, grupo_gasto, grupo_clave,
   proveedor, proveedor_nombre, descripcion,
   cantidad, monto_pagado, monto_comprobante, tiene_factura)
VALUES
-- 30/Jun — Los Canarios
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Eléctrico / Instalaciones','ELEC',
   'Los Canarios','Los Canarios','Cable 12',       34.00, 34.00,  NULL, FALSE),
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Eléctrico / Instalaciones','ELEC',
   'Los Canarios','Los Canarios','Cable 14',       60.00, 60.00,  NULL, FALSE),
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Eléctrico / Instalaciones','ELEC',
   'Los Canarios','Los Canarios','Taquete',        72.00, 72.00,  NULL, FALSE),
-- 30/Jun — Walmart
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Materiales','MATERIAL',
   'Walmart','Walmart','Cinta de aislar',          25.00, 25.00, 191.00, FALSE),
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Walmart','Walmart','Windex',                   55.00, 55.00,  55.00, FALSE),
-- 29/Jun — Oxxo
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Consumibles','CONSUMIBLES',
   'Oxxo','Oxxo','Agua',                          171.50,171.50, 172.00, FALSE),
-- 29/Jun — Home Depot
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Materiales','MATERIAL',
   'Home Depot','Home Depot','Guante',            104.00,104.00, 104.00, FALSE),
-- 29/Jun — Office Depot
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Oficina','OFICINA',
   'Office Depot','Office Depot','Diurex',         57.00, 57.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Oficina','OFICINA',
   'Office Depot','Office Depot','Libretas',      128.00,128.00, 185.00, FALSE),
-- 29/Jun — Dogo (limpieza)
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Limpiador',                     240.00,240.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Atomizador',                     50.00, 50.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Guante',                         90.00, 90.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Mechudo',                       120.00,120.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Cloro',                         150.00,150.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Garrafón',                      250.00,250.00,  NULL, FALSE),
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Tapete antisalpicadura',        300.00,300.00,1200.00, FALSE),
-- 30/Jun — Comex
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Pintura','PINTURA',
   'Comex','Comex','Thinner',                     246.00,246.00,  NULL, FALSE),
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Pintura','PINTURA',
   'Comex','Comex','Repuesto Rodillo',             38.00, 38.00,  NULL, FALSE),
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Pintura','PINTURA',
   'Comex','Comex','Pintura Amarilla',           1258.99,1258.99, NULL, FALSE),
  ('2026-06-30',2026,'Junio','Semana 27-Jun','2026-06-27','Pintura','PINTURA',
   'Comex','Comex','Armazón p/rodillo',            40.00, 40.00,1583.00, FALSE),
-- 29/Jun — Rojas (señalización)
  ('2026-06-29',2026,'Junio','Semana 27-Jun','2026-06-27','Señalización','SENALIZACION',
   'Rojas','Rojas','Letreros números local',    1600.00,1600.00,1600.00, FALSE),
-- 03/Jul — Cravioto
  ('2026-07-03',2026,'Julio','Semana 27-Jun','2026-06-27','Materiales','MATERIAL',
   'Cravioto','Cravioto','No más clavos',          98.00, 98.00,  98.00, FALSE),
-- 03/Jul — Dogo (2ª compra)
  ('2026-07-03',2026,'Julio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Papel',                        510.01,510.01,  NULL, FALSE),
  ('2026-07-03',2026,'Julio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Bolsa',                        180.00,180.00,  NULL, FALSE),
  ('2026-07-03',2026,'Julio','Semana 27-Jun','2026-06-27','Limpieza','LIMPIEZA',
   'Dogo','Dogo','Bolsa Grande',                  60.00, 60.00, 750.00, FALSE);

-- ── 8. Renta Vanessa L23 (efectivo) ──────────────────────────────────
INSERT INTO public.ingresos
  (fecha, id_contrato, propietario, tipo, mes, anio,
   importe, origen, concepto_origen, nota)
VALUES
  ('2026-06-27','L23','Vanessa','RENTA',6,2026,
   17780.00,'EFECTIVO','Renta L23 Jun/2026','Pago efectivo corte Sáb 27-Jun-2026');
