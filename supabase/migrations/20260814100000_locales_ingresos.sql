-- ============================================================
-- Migración: catálogo de locales con dimensiones reales,
--            locales_referencia en contratos,
--            tabla de ingresos (captura de pagos)
-- ============================================================

-- ── 1. DIMENSIONES REALES EN cat_locales ──────────────────
-- (columnas ya existen; UPDATE con datos del Excel)

UPDATE public.cat_locales SET ancho_m=5.13,  largo_m=11.21, superficie_m2=57.51,  costo_m2=450.00, renta_proyectada=25878.29 WHERE id_local='L02';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=11.31, superficie_m2=56.55,  costo_m2=350.00, renta_proyectada=19792.50 WHERE id_local='L03';
UPDATE public.cat_locales SET ancho_m=5.14,  largo_m=11.30, superficie_m2=58.08,  costo_m2=450.00, renta_proyectada=26136.90 WHERE id_local='L04';
UPDATE public.cat_locales SET ancho_m=4.93,  largo_m=11.18, superficie_m2=55.12,  costo_m2=350.00, renta_proyectada=19291.09 WHERE id_local='L06';
UPDATE public.cat_locales SET ancho_m=4.96,  largo_m=11.17, superficie_m2=55.40,  costo_m2=350.00, renta_proyectada=19391.12 WHERE id_local='L07';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=11.18, superficie_m2=55.90,  costo_m2=350.00, renta_proyectada=19565.00 WHERE id_local='L08';
UPDATE public.cat_locales SET ancho_m=4.93,  largo_m=11.17, superficie_m2=55.07,  costo_m2=350.00, renta_proyectada=19273.84 WHERE id_local='L09';
UPDATE public.cat_locales SET ancho_m=3.08,  largo_m=4.79,  superficie_m2=14.75,  costo_m2=350.00, renta_proyectada=5163.62  WHERE id_local='L091';
UPDATE public.cat_locales SET ancho_m=4.80,  largo_m=11.49, superficie_m2=55.15,  costo_m2=350.00, renta_proyectada=19303.20 WHERE id_local='L10';
UPDATE public.cat_locales SET ancho_m=4.99,  largo_m=11.35, superficie_m2=56.64,  costo_m2=350.00, renta_proyectada=19822.78 WHERE id_local='L11';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=11.17, superficie_m2=55.85,  costo_m2=350.00, renta_proyectada=19547.50 WHERE id_local='L12';
UPDATE public.cat_locales SET ancho_m=4.93,  largo_m=11.00, superficie_m2=54.23,  costo_m2=350.00, renta_proyectada=18980.50 WHERE id_local='L13';
UPDATE public.cat_locales SET                superficie_m2=50.00,  costo_m2=340.00, renta_proyectada=17000.00 WHERE id_local='L14';
UPDATE public.cat_locales SET ancho_m=4.78,  largo_m=10.74, superficie_m2=51.34,  costo_m2=350.00, renta_proyectada=17968.02 WHERE id_local='L15';
UPDATE public.cat_locales SET ancho_m=4.84,  largo_m=10.34, superficie_m2=50.05,  costo_m2=363.00, renta_proyectada=18170.00 WHERE id_local='L16';
UPDATE public.cat_locales SET ancho_m=4.83,  largo_m=9.87,  superficie_m2=47.67,  costo_m2=350.00, renta_proyectada=16685.24 WHERE id_local='L17';
UPDATE public.cat_locales SET ancho_m=4.80,  largo_m=9.93,  superficie_m2=47.66,  costo_m2=367.00, renta_proyectada=17500.00 WHERE id_local='L18';
UPDATE public.cat_locales SET ancho_m=4.94,  largo_m=9.86,  superficie_m2=48.71,  costo_m2=350.00, renta_proyectada=17047.94 WHERE id_local='L19';
UPDATE public.cat_locales SET                superficie_m2=165.86, costo_m2=300.00, renta_proyectada=49758.72 WHERE id_local='L21';
UPDATE public.cat_locales SET ancho_m=4.86,  largo_m=15.25, superficie_m2=74.12,  costo_m2=300.00, renta_proyectada=22234.50 WHERE id_local='L22';
UPDATE public.cat_locales SET ancho_m=5.24,  largo_m=11.20, superficie_m2=58.69,  costo_m2=300.00, renta_proyectada=17606.40 WHERE id_local='L23';
UPDATE public.cat_locales SET ancho_m=4.78,  largo_m=11.20, superficie_m2=53.54,  costo_m2=300.00, renta_proyectada=16060.80 WHERE id_local='L24';
UPDATE public.cat_locales SET ancho_m=4.99,  largo_m=11.21, superficie_m2=55.94,  costo_m2=300.00, renta_proyectada=16781.37 WHERE id_local='L25';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=11.20, superficie_m2=56.00,  costo_m2=300.00, renta_proyectada=16800.00 WHERE id_local='L26';
UPDATE public.cat_locales SET ancho_m=4.99,  largo_m=11.19, superficie_m2=55.84,  costo_m2=300.00, renta_proyectada=16751.43 WHERE id_local='L27';
UPDATE public.cat_locales SET ancho_m=4.93,  largo_m=11.19, superficie_m2=55.17,  costo_m2=300.00, renta_proyectada=16550.01 WHERE id_local='L28';
UPDATE public.cat_locales SET ancho_m=4.78,  largo_m=11.56, superficie_m2=55.26,  costo_m2=300.00, renta_proyectada=16577.04 WHERE id_local='L29';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=11.40, superficie_m2=57.00,  costo_m2=300.00, renta_proyectada=17100.00 WHERE id_local='L30';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=11.21, superficie_m2=56.05,  costo_m2=300.00, renta_proyectada=16815.00 WHERE id_local='L31';
UPDATE public.cat_locales SET ancho_m=4.91,  largo_m=11.11, superficie_m2=54.55,  costo_m2=300.00, renta_proyectada=16365.03 WHERE id_local='L32';
UPDATE public.cat_locales SET ancho_m=4.94,  largo_m=10.91, superficie_m2=53.90,  costo_m2=300.00, renta_proyectada=16168.62 WHERE id_local='L33';
UPDATE public.cat_locales SET ancho_m=4.84,  largo_m=10.74, superficie_m2=51.98,  costo_m2=300.00, renta_proyectada=15594.48 WHERE id_local='L34';
UPDATE public.cat_locales SET ancho_m=4.99,  largo_m=10.63, superficie_m2=53.04,  costo_m2=300.00, renta_proyectada=15913.11 WHERE id_local='L35';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=9.93,  superficie_m2=49.65,  costo_m2=300.00, renta_proyectada=14895.00 WHERE id_local='L36';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=9.94,  superficie_m2=49.70,  costo_m2=300.00, renta_proyectada=14910.00 WHERE id_local='L37';
UPDATE public.cat_locales SET ancho_m=5.00,  largo_m=9.94,  superficie_m2=49.70,  costo_m2=300.00, renta_proyectada=14910.00 WHERE id_local='L38';


-- ── 2. locales_referencia EN public.contratos ─────────────
-- Campo de referencia rápida: locales del contrato ordenados,
-- el más pequeño primero (ej. 'L06|L07', 'L31|L32').
-- Se mantiene en paralelo a la tabla de relación contratos_locales.

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS locales_referencia TEXT,       -- ej. 'L06|L07'
  ADD COLUMN IF NOT EXISTS locales_display    TEXT,       -- ej. 'L6, L7'
  ADD COLUMN IF NOT EXISTS num_locales        INT DEFAULT 1;

-- ── 3. TABLA public.ingresos ───────────────────────────────
-- Captura de ingresos por contrato/local (transferencias BBVA,
-- efectivo, etc.). Estructura normalizada del archivo "BD INGRESOS".

CREATE TABLE IF NOT EXISTS public.ingresos (
  id                  BIGSERIAL PRIMARY KEY,
  fecha               DATE,
  -- Referencia de contrato y local
  id_contrato         TEXT NOT NULL,         -- 'L06-L07', 'L09', 'L31-L32'
  local_id            TEXT REFERENCES public.cat_locales(id_local) ON DELETE RESTRICT,
  locales_contrato    TEXT,                  -- 'L06|L07' separado por |
  es_principal        BOOLEAN DEFAULT TRUE,  -- FALSE = local secundario del contrato
  -- Arrendatario (desnormalizado para consultas rápidas)
  propietario         TEXT,
  -- Tipo de ingreso
  tipo                TEXT NOT NULL DEFAULT 'RENTA'
                      CHECK (tipo IN ('RENTA','SANCION','AGUA','OTRO')),
  mes                 INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio                INT NOT NULL CHECK (anio BETWEEN 2020 AND 2099),
  -- Documento
  factura             TEXT,                  -- número o referencia
  importe             NUMERIC(14,2),         -- NULL si es registro de local secundario
  -- Origen del registro
  origen              TEXT,                  -- 'TRANSFERENCIA BBVA JUL26', 'EFECTIVO', etc.
  concepto_origen     TEXT,                  -- texto tal como viene del estado de cuenta
  nota                TEXT,
  -- Auditoría
  creado_por          TEXT DEFAULT 'SISTEMA',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_ingresos_contrato  ON public.ingresos(id_contrato);
CREATE INDEX IF NOT EXISTS idx_ingresos_local     ON public.ingresos(local_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_mes_anio  ON public.ingresos(anio, mes);
CREATE INDEX IF NOT EXISTS idx_ingresos_tipo      ON public.ingresos(tipo);

-- RLS
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ingresos" ON public.ingresos
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- ── 4. VISTA prp_ingresos (con nombre de local y m2) ──────
CREATE OR REPLACE VIEW public.prp_ingresos AS
SELECT
  i.*,
  l.numero_local,
  l.superficie_m2
FROM public.ingresos i
LEFT JOIN public.cat_locales l ON l.id_local = i.local_id
ORDER BY i.anio DESC, i.mes DESC, i.id_contrato, i.es_principal DESC, i.id;


-- ── 6. SEED: ingresos de julio 2026 desde el Excel ─────────
-- (solo registros con importe capturado — los secundarios sin importe
--  se insertan como referencia histórica con importe NULL)

INSERT INTO public.ingresos
  (fecha, id_contrato, local_id, locales_contrato, es_principal, propietario, tipo, mes, anio, factura, importe, origen, concepto_origen, nota)
VALUES
  ('2026-07-03','L06-L07','L06','L06|L07',TRUE,'VORWERK','RENTA',7,2026,'2120',39273.20,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  (NULL,        'L06-L07','L07','L06|L07',FALSE,'VORWERK','RENTA',7,2026,NULL,NULL,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Importe registrado en el local principal del contrato'),
  ('2026-07-20','L09',    'L09','L09',    TRUE,'ALFREDO BRAVO MENDIOLA','RENTA',7,2026,'2195',25892.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  ('2026-07-15','L11-L12','L11','L11|L12',TRUE,'ANDREA CASTILLO VELAZQUEZ','RENTA',7,2026,'2175',37234.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  (NULL,        'L11-L12','L12','L11|L12',FALSE,'ANDREA CASTILLO VELAZQUEZ','RENTA',7,2026,NULL,NULL,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Importe registrado en el local principal del contrato'),
  ('2026-07-06','L14',    'L14','L14',    TRUE,'ROSARIO GONZALEZ OLIVO (LUKY)','RENTA',7,2026,'2176',18872.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  ('2026-07-14','L15',    'L15','L15',    TRUE,'ISAGENIX','RENTA',7,2026,'2122',19855.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  ('2026-07-05','L17',    'L17','L17',    TRUE,'LUZ ADRIANA','RENTA',7,2026,'2141',18501.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  ('2026-07-20','L18',    'L18','L18',    TRUE,'GUILLERMO ANTONIO','RENTA',7,2026,'2196',17500.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  ('2026-07-22','L19',    'L19','L19',    TRUE,'LIZETH CRISTINA CAMPOS GARCIA','RENTA',7,2026,'2197',11000.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Pago 1 de 2'),
  (NULL,        'L19',    'L19','L19',    TRUE,'LIZETH CRISTINA CAMPOS GARCIA','RENTA',7,2026,NULL,6500.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Pago 2 de 2'),
  ('2026-07-03','L23',    'L23','L23',    TRUE,'VANESSA ACERO','RENTA',7,2026,'EFECTIVO 572',17780.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Cobro en efectivo'),
  ('2026-07-03','L29',    'L29','L29',    TRUE,'AVAXO','RENTA',7,2026,'2142',16955.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  ('2026-07-23','L30',    'L30','L30',    TRUE,'DULCE MICHELLE ANDRADE BUCIO','RENTA',7,2026,NULL,17650.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Sin factura en el origen'),
  ('2026-07-10','L31-L32','L31','L31|L32',TRUE,'GRUPO OAKLIFE','RENTA',7,2026,'2153',31500.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26',NULL),
  (NULL,        'L31-L32','L32','L31|L32',FALSE,'GRUPO OAKLIFE','RENTA',7,2026,NULL,NULL,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Importe registrado en el local principal del contrato'),
  ('2026-07-16','L33',    'L33','L33',    TRUE,'CENTRO DE ARTES ESCENICAS','RENTA',7,2026,NULL,16500.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Sin factura en el origen'),
  (NULL,        'L35',    'L35','L35',    TRUE,'ANDREA CASTILLO VELAZQUEZ','RENTA',7,2026,NULL,15900.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Concepto asumido RENTA JUL26'),
  (NULL,        'L36',    'L36','L36',    TRUE,'NANCY GALLARDO FUENTES','RENTA',7,2026,NULL,15000.00,'TRANSFERENCIA BBVA JUL26','RENTA JUL26','Concepto asumido RENTA JUL26'),
  -- Otros periodos
  ('2026-07-08','L08',    'L08','L08',    TRUE,'ALEJANDRO MUÑOZ FERNANDEZ','RENTA',5,2026,'2151',19250.00,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA MAY26',NULL),
  (NULL,        'L08',    'L08','L08',    TRUE,'ALEJANDRO MUÑOZ FERNANDEZ','SANCION',5,2026,'2152',NULL,'TRANSFERENCIA BBVA - OTROS PERIODOS','SANCION MAY26','Sin importe capturado'),
  ('2026-07-07','L13',    'L13','L13',    TRUE,'C & R MOTOR','RENTA',4,2026,'2147',21815.20,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA ABR26',NULL),
  (NULL,        'L13',    'L13','L13',    TRUE,'C & R MOTOR','SANCION',4,2026,'2148',NULL,'TRANSFERENCIA BBVA - OTROS PERIODOS','SANCION ABR26','Sin importe capturado'),
  ('2026-07-07','L34',    'L34','L34',    TRUE,'ENRIQUE GARCIA ROBLES','RENTA',2,2026,'2143',18832.00,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA FEB26',NULL),
  (NULL,        'L34',    'L34','L34',    TRUE,'ENRIQUE GARCIA ROBLES','SANCION',2,2026,'2144',NULL,'TRANSFERENCIA BBVA - OTROS PERIODOS','SANCION FEB26','Sin importe capturado'),
  (NULL,        'L34',    'L34','L34',    TRUE,'ENRIQUE GARCIA ROBLES','RENTA',3,2026,'2145',18832.00,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA MAR26','Sin fecha en el origen'),
  (NULL,        'L34',    'L34','L34',    TRUE,'ENRIQUE GARCIA ROBLES','SANCION',3,2026,'2146',NULL,'TRANSFERENCIA BBVA - OTROS PERIODOS','SANCION MAR26','Sin importe capturado'),
  ('2026-07-20','L37-L38','L37','L37|L38',TRUE,'LEONARDO FELIX VIÑAS OSORIO','RENTA',6,2026,NULL,20000.00,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA JUN26 P1','Pago parcial 1'),
  (NULL,        'L37-L38','L38','L37|L38',FALSE,'LEONARDO FELIX VIÑAS OSORIO','RENTA',6,2026,NULL,NULL,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA JUN26 P1','Importe registrado en local principal'),
  (NULL,        'L37-L38','L37','L37|L38',TRUE,'LEONARDO FELIX VIÑAS OSORIO','RENTA',6,2026,NULL,10250.00,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA JUN26 P2','Pago parcial 2'),
  (NULL,        'L37-L38','L38','L37|L38',FALSE,'LEONARDO FELIX VIÑAS OSORIO','RENTA',6,2026,NULL,NULL,'TRANSFERENCIA BBVA - OTROS PERIODOS','RENTA JUN26 P2','Importe registrado en local principal'),
  -- Agua
  ('2026-07-07','L13',    'L13','L13',    TRUE,'C & R MOTOR','AGUA',4,2026,NULL,378.80,'TRANSFERENCIA BBVA - AGUA','AGUA 2°BIM26','2° bimestre 2026 (mar-abr)')
ON CONFLICT DO NOTHING;
