-- ============================================================
-- IRP — Migración v2.0 — Modelo de Datos Completo
-- RANNIX Consulting · Roberto Aguilar Cota · 2026
-- Proyecto Supabase: ywashdlhkbvleigakjus
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecutar DESPUÉS de reset_database.sql (el schema prp ya existe)
-- 2. Abrir Supabase → SQL Editor → pegar y ejecutar
-- 3. Este script NO borra nada, solo AGREGA y MODIFICA
-- ============================================================

SET search_path TO prp, public;

-- ============================================================
-- SECCIÓN 1: MODIFICACIONES A TABLAS EXISTENTES
-- ============================================================

-- 1.1 Enriquecer contratos_arrendamiento con datos reales de IWOL
ALTER TABLE prp.contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS tipo_documento       VARCHAR(30) DEFAULT 'SUBARRENDAMIENTO',
  ADD COLUMN IF NOT EXISTS fiador_nombre        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS fiador_domicilio     TEXT,
  ADD COLUMN IF NOT EXISTS fiador_rfc           VARCHAR(13),
  ADD COLUMN IF NOT EXISTS fiador_identificacion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS giro_autorizado      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS numero_pagares       INT DEFAULT 12,
  ADD COLUMN IF NOT EXISTS dia_limite_pago      INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS incremento_tipo      VARCHAR(20) DEFAULT 'INPC',
  ADD COLUMN IF NOT EXISTS cuenta_banco_pago    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS clabe_interbancaria  VARCHAR(18),
  ADD COLUMN IF NOT EXISTS penalizacion_dias    INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS penalizacion_pct2    NUMERIC(5,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS cancelacion_anticipada_meses INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS horario_inicio       TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS horario_fin          TIME DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS despacho_juridico    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS fecha_firma          DATE,
  ADD COLUMN IF NOT EXISTS archivo_contrato_url TEXT,
  ADD COLUMN IF NOT EXISTS inventario_anexo_url TEXT,
  ADD COLUMN IF NOT EXISTS factura_a_tercero    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tercero_razon_social VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tercero_rfc          VARCHAR(13);

-- 1.2 Enriquecer empleados
ALTER TABLE prp.empleados
  ADD COLUMN IF NOT EXISTS tiene_cajon   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS numero_cajon  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS whatsapp      VARCHAR(15);

-- 1.3 Enriquecer unidades (locales)
ALTER TABLE prp.unidades
  ADD COLUMN IF NOT EXISTS tiene_servicio_agua  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS numero_medidor_agua  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS monto_agua_base      NUMERIC(10,2);

-- 1.4 Enriquecer prospectos (portal self-service + datos reales)
ALTER TABLE prp.prospectos
  ADD COLUMN IF NOT EXISTS apellidos            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS whatsapp             VARCHAR(15),
  ADD COLUMN IF NOT EXISTS rfc                  VARCHAR(13),
  ADD COLUMN IF NOT EXISTS curp                 VARCHAR(18),
  ADD COLUMN IF NOT EXISTS domicilio            TEXT,
  ADD COLUMN IF NOT EXISTS giro_solicitado      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS monto_ofertado       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fecha_visita         DATE,
  ADD COLUMN IF NOT EXISTS fiador_nombre        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS fiador_telefono      VARCHAR(15),
  ADD COLUMN IF NOT EXISTS fiador_domicilio     TEXT,
  ADD COLUMN IF NOT EXISTS resultado_buro       VARCHAR(20) DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS resultado_buro_detalle TEXT,
  ADD COLUMN IF NOT EXISTS motivo_rechazo       TEXT,
  ADD COLUMN IF NOT EXISTS contrato_id          UUID REFERENCES prp.contratos_arrendamiento(id),
  ADD COLUMN IF NOT EXISTS registrado_por       UUID REFERENCES prp.empleados(id);

-- 1.5 Agregar campo cierre diario a cobros_turno (ya existe como tabla de turno)
ALTER TABLE prp.cobros_turno
  ADD COLUMN IF NOT EXISTS fecha         DATE,
  ADD COLUMN IF NOT EXISTS dia_semana    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS validado      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS operador_id   UUID REFERENCES prp.empleados(id);

-- ============================================================
-- SECCIÓN 2: CATÁLOGOS NUEVOS
-- ============================================================

-- 2.1 Grupos de gasto operativo (para fondo revolvente y gastos diarios)
CREATE TABLE IF NOT EXISTS prp.cat_grupo_gasto (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(30) UNIQUE NOT NULL,
  descripcion VARCHAR(100) NOT NULL,
  tipo        VARCHAR(20) DEFAULT 'VARIABLE', -- VARIABLE, FIJO, IMPUESTO
  activo      BOOLEAN DEFAULT TRUE,
  orden       INT DEFAULT 0
);

INSERT INTO prp.cat_grupo_gasto (clave, descripcion, tipo, orden) VALUES
  ('LIMPIEZA',          'Limpieza y aseo',                 'VARIABLE', 1),
  ('FERRETERIA',        'Ferreterías y materiales',         'VARIABLE', 2),
  ('OXXO',              'OXXO / Servicios varios',          'VARIABLE', 3),
  ('VENDING_REPOSICION','Reposición vending machine',       'VARIABLE', 4),
  ('TOTAL_PLAY',        'Total Play / Internet',            'FIJO',     5),
  ('PAPELERIA',         'Papelería y oficina',              'VARIABLE', 6),
  ('MERCADO_LIBRE',     'Mercado Libre / Amazon',           'VARIABLE', 7),
  ('MANTENIMIENTO',     'Mantenimiento general',            'VARIABLE', 8),
  ('UNIFORMES',         'Uniformes y ropa de trabajo',      'VARIABLE', 9),
  ('GASTOS_MEDICOS',    'Gastos médicos empleados',         'VARIABLE', 10),
  ('CFE',               'Luz / CFE',                        'FIJO',     11),
  ('AGUA_GASTO',        'Agua (gasto operativo)',            'FIJO',     12),
  ('PREDIAL',           'Predial',                          'IMPUESTO', 13),
  ('LIC_ESTAC',         'Licencia de estacionamiento',      'IMPUESTO', 14),
  ('RESIDUOS',          'Transporte de residuos sólidos',   'IMPUESTO', 15),
  ('ANUNCIO',           'Anuncio publicitario IWOL',        'FIJO',     16),
  ('FUMIGACION',        'Fumigación',                       'VARIABLE', 17),
  ('OTROS',             'Otros gastos',                     'VARIABLE', 99)
ON CONFLICT (clave) DO NOTHING;

-- 2.2 Conceptos del Estado de Resultados
CREATE TABLE IF NOT EXISTS prp.edr_conceptos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(30) UNIQUE NOT NULL,
  descripcion VARCHAR(200) NOT NULL,
  tipo        VARCHAR(20) NOT NULL, -- INGRESO, GASTO, IMPUESTO, CALCULO
  calculo_tipo VARCHAR(20) DEFAULT 'MANUAL', -- MANUAL, AUTO_SUMA
  signo       INT DEFAULT 1, -- 1 = suma, -1 = resta
  orden       INT DEFAULT 0,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO prp.edr_conceptos (clave, descripcion, tipo, calculo_tipo, signo, orden) VALUES
  ('RENTAS_BRUTAS',       'Rentas Brutas',                  'INGRESO',   'AUTO_SUMA', 1,  1),
  ('RENTAS_SIN_FACTURA',  'Rentas sin Factura',             'INGRESO',   'AUTO_SUMA', 1,  2),
  ('PENALIZACIONES',      'Penalizaciones',                 'INGRESO',   'AUTO_SUMA', 1,  3),
  ('IVA',                 'IVA (deducción)',                'CALCULO',   'AUTO_SUMA', -1, 4),
  ('INGRESOS_NETOS_RENTA','Ingresos Netos Renta',           'CALCULO',   'AUTO_SUMA', 1,  5),
  ('ESTACIONAMIENTO',     'Estacionamiento',                'INGRESO',   'AUTO_SUMA', 1,  6),
  ('PENSIONES_ESTAC',     'Pensiones estacionamiento',      'INGRESO',   'AUTO_SUMA', 1,  7),
  ('VENDING',             'Maquinita (Vending Machine)',    'INGRESO',   'AUTO_SUMA', 1,  8),
  ('AGUA_INGRESO',        'Agua (cobro a locales)',         'INGRESO',   'AUTO_SUMA', 1,  9),
  ('TOTAL_INGRESOS',      'Total Ingresos',                 'CALCULO',   'AUTO_SUMA', 1,  10),
  ('SUELDOS',             'Sueldos / Nómina',               'GASTO',     'AUTO_SUMA', -1, 11),
  ('FONDO_REVOLVENTE',    'Fondo Revolvente',               'GASTO',     'AUTO_SUMA', -1, 12),
  ('GASTO_EXCEDENTE',     'Gasto Excedente',                'GASTO',     'MANUAL',    -1, 13),
  ('LUZ',                 'Luz / CFE',                      'GASTO',     'MANUAL',    -1, 14),
  ('AGUA_GASTO_EDR',      'Agua (gasto operativo)',         'GASTO',     'MANUAL',    -1, 15),
  ('OTROS_GASTOS',        'Otros Gastos',                   'GASTO',     'MANUAL',    -1, 16),
  ('TOTAL_GASTOS',        'Total Gastos Variables',         'CALCULO',   'AUTO_SUMA', -1, 17),
  ('UTILIDAD_BRUTA',      'Utilidad Bruta',                 'CALCULO',   'AUTO_SUMA', 1,  18),
  ('PREDIAL_EDR',         'Predial',                        'IMPUESTO',  'AUTO_SUMA', -1, 19),
  ('RESIDUOS_EDR',        'Transporte Residuos Sólidos',    'IMPUESTO',  'AUTO_SUMA', -1, 20),
  ('LIC_ESTAC_EDR',       'Licencia Estacionamiento',       'IMPUESTO',  'AUTO_SUMA', -1, 21),
  ('ANUNCIO_EDR',         'Anuncio Publicitario IWOL',      'IMPUESTO',  'AUTO_SUMA', -1, 22),
  ('TOTAL_IMPUESTOS',     'Total Impuestos Fijos',          'CALCULO',   'AUTO_SUMA', -1, 23),
  ('UTILIDAD_NETA',       'Utilidad Neta',                  'CALCULO',   'AUTO_SUMA', 1,  24)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- SECCIÓN 3: VENDING MACHINE
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.vending_productos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           VARCHAR(100) NOT NULL,
  costo_unitario   NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_venta     NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidades_por_caja INT DEFAULT 1,
  proveedor        VARCHAR(100),
  activo           BOOLEAN DEFAULT TRUE,
  orden            INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO prp.vending_productos (nombre, proveedor, orden) VALUES
  ('Sabriminis',   'LAS TOLUQUEÑAS',    1),
  ('Florentinas',  'LAS TOLUQUEÑAS',    2),
  ('Mix Barcel',   'LAS TOLUQUEÑAS',    3),
  ('Príncipe',     'LAS TOLUQUEÑAS',    4),
  ('Tilikos',      'FRITURAS SELECTAS', 5),
  ('Chocolate',    'BIMBO',             6),
  ('Coca Cola',    'COM GAO',           7),
  ('Agua 600ml',   'COM GAO',           8),
  ('Gatorade',     'COM GAO',           9),
  ('Jarritos',     'COM GAO',           10),
  ('Nescafé',      'COM GAO',           11),
  ('Suavicremas',  'COM GAO',           12)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS prp.vending_inventario_semanal (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio     DATE NOT NULL,
  semana_fin        DATE NOT NULL,
  producto_id       UUID NOT NULL REFERENCES prp.vending_productos(id),
  inventario_inicial INT NOT NULL DEFAULT 0,
  compras           INT DEFAULT 0,
  unidades_vendidas INT DEFAULT 0,
  venta_monto       NUMERIC(10,2) DEFAULT 0,
  costo_monto       NUMERIC(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semana_inicio, producto_id)
);

CREATE TABLE IF NOT EXISTS prp.vending_cierres_semanales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio       DATE UNIQUE NOT NULL,
  semana_fin          DATE NOT NULL,
  ingreso_maquina     NUMERIC(10,2) NOT NULL DEFAULT 0,
  efectivo_entregado  NUMERIC(10,2) DEFAULT 0,
  residual_anterior   NUMERIC(10,2) DEFAULT 0,
  residual_actual     NUMERIC(10,2) DEFAULT 0,
  reposicion_monto    NUMERIC(10,2) DEFAULT 0,
  capturado_por       UUID REFERENCES prp.empleados(id),
  observaciones       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 4: GASTOS OPERATIVOS DETALLADOS
-- (complementa prp.egresos con campos específicos de Plaza IWOL)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.gastos_operativos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha             DATE NOT NULL,
  proveedor_nombre  VARCHAR(200) NOT NULL,
  proveedor_id      UUID REFERENCES prp.proveedores(id),
  grupo_id          UUID REFERENCES prp.cat_grupo_gasto(id),
  descripcion       TEXT NOT NULL,
  monto_pagado      NUMERIC(10,2) NOT NULL,
  monto_comprobante NUMERIC(10,2), -- puede diferir (pagaron $55, factura dice $50)
  tiene_factura     BOOLEAN DEFAULT FALSE,
  folio_factura     VARCHAR(50),
  semana_inicio     DATE,
  mes               INT,
  anio              INT,
  dia_semana        VARCHAR(20),
  fondo_id          UUID REFERENCES prp.fondos_revolventes(id),
  capturado_por     UUID REFERENCES prp.empleados(id),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 5: RESUMEN SEMANAL / FONDO REVOLVENTE
-- (extiende prp.fondos_revolventes con cierre semanal)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.fondo_revolvente_cierres (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fondo_id              UUID NOT NULL REFERENCES prp.fondos_revolventes(id),
  semana_inicio         DATE UNIQUE NOT NULL,
  semana_fin            DATE NOT NULL,
  monto_asignado        NUMERIC(10,2) NOT NULL DEFAULT 20000,
  total_estacionamiento NUMERIC(10,2) DEFAULT 0,
  total_pensiones       NUMERIC(10,2) DEFAULT 0,
  total_vending         NUMERIC(10,2) DEFAULT 0,
  total_recibos_efectivo NUMERIC(10,2) DEFAULT 0,
  total_ingresos        NUMERIC(10,2) DEFAULT 0,
  total_gastos          NUMERIC(10,2) DEFAULT 0,
  total_comprobado      NUMERIC(10,2) DEFAULT 0,
  diferencia_gastos     NUMERIC(10,2) DEFAULT 0,
  total_efectivo_entregar NUMERIC(10,2) DEFAULT 0,
  dia_tomado_empleado   UUID REFERENCES prp.empleados(id),
  dia_tomado_dia        VARCHAR(20),
  dia_tomado_importe    NUMERIC(10,2) DEFAULT 0,
  residual_vending      NUMERIC(10,2) DEFAULT 0,
  cerrado               BOOLEAN DEFAULT FALSE,
  cerrado_por           UUID REFERENCES prp.empleados(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 6: RECIBOS DE EFECTIVO
-- (pagos manuales en efectivo de rentas o servicios)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.recibos_efectivo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           VARCHAR(20) UNIQUE,
  numero_recibo   INT,
  unidad_id       UUID REFERENCES prp.unidades(id),
  arrendatario_id UUID REFERENCES prp.arrendatarios(id),
  concepto        VARCHAR(200) NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  fecha_emision   DATE NOT NULL DEFAULT CURRENT_DATE,
  pagado          BOOLEAN DEFAULT TRUE, -- en efectivo se registra al momento
  fecha_pago      DATE DEFAULT CURRENT_DATE,
  cobrador_id     UUID REFERENCES prp.empleados(id),
  observaciones   TEXT, -- "Pidió recibo pero no pagó; ni vino por él"
  semana_cierre   DATE, -- a qué semana pertenece
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger folio automático REC-YYYY-NNNN
CREATE SEQUENCE IF NOT EXISTS prp.recibo_efectivo_seq START 500;

CREATE OR REPLACE FUNCTION prp.fn_folio_recibo_efectivo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_recibo := nextval('prp.recibo_efectivo_seq');
  NEW.folio := 'REC-' || EXTRACT(YEAR FROM NEW.fecha_emision)::TEXT
            || '-' || LPAD(NEW.numero_recibo::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_folio_recibo_efectivo ON prp.recibos_efectivo;
CREATE TRIGGER trig_folio_recibo_efectivo
  BEFORE INSERT ON prp.recibos_efectivo
  FOR EACH ROW EXECUTE FUNCTION prp.fn_folio_recibo_efectivo();

-- ============================================================
-- SECCIÓN 7: AGUA POTABLE (BIMESTRAL POR LOCAL)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.agua_lecturas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id        UUID NOT NULL REFERENCES prp.unidades(id),
  numero_medidor   VARCHAR(50),
  periodo_inicio   DATE NOT NULL,
  periodo_fin      DATE NOT NULL,
  lectura_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
  lectura_actual   NUMERIC(10,2) NOT NULL,
  tarifa_por_m3    NUMERIC(10,4) DEFAULT 0,
  fecha_lectura    DATE NOT NULL DEFAULT CURRENT_DATE,
  capturado_por    UUID REFERENCES prp.empleados(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.agua_recibos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lectura_id       UUID NOT NULL REFERENCES prp.agua_lecturas(id),
  unidad_id        UUID NOT NULL REFERENCES prp.unidades(id),
  arrendatario_id  UUID REFERENCES prp.arrendatarios(id),
  folio            VARCHAR(20) UNIQUE,
  periodo_inicio   DATE NOT NULL,
  periodo_fin      DATE NOT NULL,
  consumo_m3       NUMERIC(10,2) NOT NULL,
  monto            NUMERIC(10,2) NOT NULL,
  fecha_emision    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite_pago DATE,
  estatus          VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO, VENCIDO, PARCIAL
  monto_pagado     NUMERIC(10,2) DEFAULT 0,
  fecha_pago       DATE,
  observaciones    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.agua_pagos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recibo_id   UUID NOT NULL REFERENCES prp.agua_recibos(id),
  monto       NUMERIC(10,2) NOT NULL,
  fecha_pago  DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pago  VARCHAR(20) DEFAULT 'EFECTIVO',
  recibio     UUID REFERENCES prp.empleados(id),
  observaciones TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger folio agua AGA-YYYY-NNNN
CREATE SEQUENCE IF NOT EXISTS prp.agua_recibo_seq START 1;

CREATE OR REPLACE FUNCTION prp.fn_folio_agua_recibo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.folio := 'AGA-' || EXTRACT(YEAR FROM NEW.fecha_emision)::TEXT
            || '-' || LPAD(nextval('prp.agua_recibo_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_folio_agua ON prp.agua_recibos;
CREATE TRIGGER trig_folio_agua
  BEFORE INSERT ON prp.agua_recibos
  FOR EACH ROW EXECUTE FUNCTION prp.fn_folio_agua_recibo();

-- ============================================================
-- SECCIÓN 8: COBROS PROGRAMADOS
-- (los 12 registros que se generan al firmar un contrato)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.cobros_programados (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id           UUID NOT NULL REFERENCES prp.contratos_arrendamiento(id),
  unidad_id             UUID NOT NULL REFERENCES prp.unidades(id),
  arrendatario_id       UUID NOT NULL REFERENCES prp.arrendatarios(id),
  mes                   INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio                  INT NOT NULL,
  pagare_numero         INT, -- cuál pagaré de los 12 corresponde
  fecha_limite_pago     DATE NOT NULL,
  monto_renta           NUMERIC(12,2) NOT NULL,
  monto_iva             NUMERIC(12,2) DEFAULT 0,
  monto_total           NUMERIC(12,2) NOT NULL,
  referencia_pago       VARCHAR(40) UNIQUE NOT NULL,
  -- Al pagar:
  estatus               VARCHAR(20) DEFAULT 'PENDIENTE',
  fecha_pago_real       DATE,
  monto_pagado          NUMERIC(12,2),
  numero_operacion_banco VARCHAR(50),
  banco_origen          VARCHAR(50),
  voucher_url           TEXT,
  forma_pago            VARCHAR(20),
  registrado_por        UUID REFERENCES prp.empleados(id),
  conciliado            BOOLEAN DEFAULT FALSE,
  conciliado_at         TIMESTAMPTZ,
  monto_mora            NUMERIC(10,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contrato_id, mes, anio)
);

-- Función para generar referencia de cobro
CREATE OR REPLACE FUNCTION prp.fn_referencia_cobro()
RETURNS TRIGGER AS $$
DECLARE v_num VARCHAR(20);
BEGIN
  SELECT numero_local INTO v_num FROM prp.unidades WHERE id = NEW.unidad_id;
  NEW.referencia_pago := 'CP-' || NEW.anio::TEXT
    || '-' || LPAD(NEW.mes::TEXT, 2, '0')
    || '-' || REPLACE(REPLACE(v_num, ' ', ''), '-', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_referencia_cobro ON prp.cobros_programados;
CREATE TRIGGER trig_referencia_cobro
  BEFORE INSERT ON prp.cobros_programados
  FOR EACH ROW EXECUTE FUNCTION prp.fn_referencia_cobro();

-- RPC: Generar los 12 cobros al firmar un contrato
CREATE OR REPLACE FUNCTION prp.generar_cobros_contrato(p_contrato_id UUID)
RETURNS INT AS $$
DECLARE
  v_c        prp.contratos_arrendamiento%ROWTYPE;
  v_inicio   DATE;
  v_fecha    DATE;
  v_mes      INT;
  v_anio     INT;
  v_meses    INT;
  v_contador INT := 0;
BEGIN
  SELECT * INTO v_c FROM prp.contratos_arrendamiento WHERE id = p_contrato_id;

  -- Inicio real: después del periodo de gracia
  v_inicio := v_c.fecha_inicio + COALESCE(v_c.periodo_gracia_dias, 0);

  -- Número de meses hasta fecha_fin
  v_meses := EXTRACT(YEAR FROM AGE(v_c.fecha_fin, v_inicio)) * 12
           + EXTRACT(MONTH FROM AGE(v_c.fecha_fin, v_inicio));

  FOR i IN 1..v_meses LOOP
    v_fecha := v_inicio + ((i-1) || ' months')::INTERVAL;
    v_mes   := EXTRACT(MONTH FROM v_fecha);
    v_anio  := EXTRACT(YEAR FROM v_fecha);

    INSERT INTO prp.cobros_programados (
      contrato_id, unidad_id, arrendatario_id,
      mes, anio, pagare_numero,
      fecha_limite_pago,
      monto_renta, monto_iva, monto_total,
      referencia_pago
    ) VALUES (
      p_contrato_id, v_c.unidad_id, v_c.arrendatario_id,
      v_mes, v_anio, i,
      MAKE_DATE(v_anio, v_mes, COALESCE(v_c.dia_limite_pago, 5)),
      v_c.renta_mensual,
      v_c.renta_mensual * 0.16,
      v_c.renta_mensual * 1.16,
      'TEMP-' || gen_random_uuid()::TEXT -- trigger lo reemplaza
    ) ON CONFLICT (contrato_id, mes, anio) DO NOTHING;

    v_contador := v_contador + 1;
  END LOOP;

  RETURN v_contador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECCIÓN 9: CONCILIACIÓN BANCARIA
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.conciliaciones_sesiones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_sesion      DATE NOT NULL DEFAULT CURRENT_DATE,
  banco             VARCHAR(50) DEFAULT 'BBVA',
  cuenta_destino    VARCHAR(30), -- últimos 4 dígitos o alias
  periodo_inicio    DATE,
  periodo_fin       DATE,
  total_movimientos INT DEFAULT 0,
  total_conciliados INT DEFAULT 0,
  total_pendientes  INT DEFAULT 0,
  monto_conciliado  NUMERIC(12,2) DEFAULT 0,
  estatus           VARCHAR(20) DEFAULT 'EN_PROCESO',
  tesorero_id       UUID REFERENCES prp.empleados(id),
  archivo_nombre    VARCHAR(200),
  observaciones     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.movimientos_bancarios (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id            UUID NOT NULL REFERENCES prp.conciliaciones_sesiones(id),
  fecha_movimiento     DATE NOT NULL,
  descripcion          TEXT,
  referencia_banco     VARCHAR(100),
  referencia_cruzada   VARCHAR(40), -- la referencia CP-YYYY-MM-LXX
  monto                NUMERIC(12,2) NOT NULL,
  tipo                 VARCHAR(10) DEFAULT 'ABONO',
  conciliado           BOOLEAN DEFAULT FALSE,
  cobro_programado_id  UUID REFERENCES prp.cobros_programados(id),
  fecha_conciliacion   TIMESTAMPTZ,
  conciliado_por       UUID REFERENCES prp.empleados(id),
  motivo_no_conciliado TEXT, -- si quedó sin cruzar
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 10: PORTAL DE PROSPECTOS (self-service)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.prospectos_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id     UUID NOT NULL REFERENCES prp.prospectos(id) ON DELETE CASCADE,
  token            VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  url_portal       TEXT,
  whatsapp_msg     TEXT, -- mensaje pre-armado para enviar
  fecha_expiracion TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  usado            BOOLEAN DEFAULT FALSE,
  fecha_uso        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: genera URL y mensaje WhatsApp automáticamente
CREATE OR REPLACE FUNCTION prp.fn_portal_prospecto_url()
RETURNS TRIGGER AS $$
DECLARE v_nombre TEXT;
BEGIN
  SELECT nombre INTO v_nombre FROM prp.prospectos WHERE id = NEW.prospecto_id;
  NEW.url_portal := 'https://priwoi.netlify.app/portal/prospecto/' || NEW.token;
  NEW.whatsapp_msg := 'Hola ' || v_nombre || ', para continuar con tu solicitud de local en Plaza IWOL, por favor sube tu documentación aquí: https://priwoi.netlify.app/portal/prospecto/' || NEW.token || ' (válido 72 hrs)';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_portal_prospecto ON prp.prospectos_tokens;
CREATE TRIGGER trig_portal_prospecto
  BEFORE INSERT ON prp.prospectos_tokens
  FOR EACH ROW EXECUTE FUNCTION prp.fn_portal_prospecto_url();

CREATE TABLE IF NOT EXISTS prp.prospectos_documentos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id          UUID NOT NULL REFERENCES prp.prospectos(id) ON DELETE CASCADE,
  tipo_documento        VARCHAR(50) NOT NULL,
  -- INE_FRENTE, INE_VUELTA, COMP_DOMICILIO, RFC_CSF, FOTO, ACTA_CONSTITUTIVA,
  -- INE_FIADOR, COMP_DOM_FIADOR, ESTADO_CUENTA, OTRO
  nombre_archivo        VARCHAR(200),
  storage_path          TEXT NOT NULL,
  fecha_documento       DATE,
  fecha_vencimiento     DATE,
  estatus_vigencia      VARCHAR(20) DEFAULT 'VIGENTE',
  subido_por_prospecto  BOOLEAN DEFAULT FALSE,
  verificado            BOOLEAN DEFAULT FALSE,
  verificado_por        UUID REFERENCES prp.empleados(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 11: EXPEDIENTE DEL CONTRATO (documentos)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.contratos_documentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id      UUID NOT NULL REFERENCES prp.contratos_arrendamiento(id) ON DELETE CASCADE,
  tipo_documento   VARCHAR(60) NOT NULL,
  -- CONTRATO_FIRMADO, INVENTARIO_ANEXO, ADDENDUM, PAGARE_FIRMADO,
  -- INE_ARRENDATARIO, INE_FIADOR, RFC_CSF, COMP_DOMICILIO, POLIZA_JURIDICA, OTRO
  nombre_archivo   VARCHAR(200),
  storage_path     TEXT NOT NULL,
  fecha_documento  DATE,
  fecha_vencimiento DATE,
  estatus_vigencia VARCHAR(20) DEFAULT 'VIGENTE',
  subido_por       UUID REFERENCES prp.empleados(id),
  observaciones    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 12: PENALIZACIONES A ARRENDATARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.penalizaciones_arrendatarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         UUID NOT NULL REFERENCES prp.contratos_arrendamiento(id),
  arrendatario_id     UUID NOT NULL REFERENCES prp.arrendatarios(id),
  cobro_programado_id UUID REFERENCES prp.cobros_programados(id),
  tipo                VARCHAR(30) DEFAULT 'MORA',
  -- MORA, DANO_INMUEBLE, INCUMPLIMIENTO_HORARIO, OTRO
  descripcion         TEXT,
  monto               NUMERIC(10,2) NOT NULL,
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  estatus             VARCHAR(20) DEFAULT 'PENDIENTE',
  -- PENDIENTE, PAGADA, CONDONADA
  fecha_pago          DATE,
  registrado_por      UUID REFERENCES prp.empleados(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 13: PRESUPUESTO Y ESTADO DE RESULTADOS MENSUAL
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.presupuesto_mensual (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio              INT NOT NULL,
  mes               INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  concepto_id       UUID NOT NULL REFERENCES prp.edr_conceptos(id),
  monto_proyectado  NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas             TEXT,
  capturado_por     UUID REFERENCES prp.empleados(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anio, mes, concepto_id)
);

CREATE TABLE IF NOT EXISTS prp.estado_resultados_mensual (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio                 INT NOT NULL,
  mes                  INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  concepto_id          UUID NOT NULL REFERENCES prp.edr_conceptos(id),
  monto_real           NUMERIC(12,2) DEFAULT 0,
  monto_proyectado     NUMERIC(12,2) DEFAULT 0,
  monto_rentas_mes     NUMERIC(12,2) DEFAULT 0,
  monto_otros_periodos NUMERIC(12,2) DEFAULT 0,
  notas                TEXT,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anio, mes, concepto_id)
);

-- ============================================================
-- SECCIÓN 14: GASTOS FIJOS / IMPUESTOS ANUALES
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.gastos_fijos_anuales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto     VARCHAR(100) NOT NULL,
  grupo_id     UUID REFERENCES prp.cat_grupo_gasto(id),
  monto        NUMERIC(10,2) NOT NULL,
  periodicidad VARCHAR(20) DEFAULT 'ANUAL', -- ANUAL, SEMESTRAL, MENSUAL
  mes_pago     INT,
  anio         INT,
  fecha_pago   DATE,
  pagado       BOOLEAN DEFAULT FALSE,
  recibo_url   TEXT,
  observaciones TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed con los impuestos fijos de IWOL (valores reales de julio 2026)
INSERT INTO prp.gastos_fijos_anuales (concepto, monto, periodicidad, mes_pago, anio) VALUES
  ('Predial',                      11894.00, 'ANUAL',   1, 2026),
  ('Licencia de Estacionamiento',   1595.00, 'ANUAL',   1, 2026),
  ('Transporte Residuos Sólidos',   1273.00, 'ANUAL',   1, 2026),
  ('Anuncio Publicitario IWOL',      852.00, 'ANUAL',   1, 2026)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECCIÓN 15: RLS POLICIES PARA TABLAS NUEVAS
-- ============================================================

ALTER TABLE prp.cat_grupo_gasto           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.edr_conceptos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.vending_productos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.vending_inventario_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.vending_cierres_semanales  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.gastos_operativos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.fondo_revolvente_cierres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.recibos_efectivo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.agua_lecturas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.agua_recibos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.agua_pagos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cobros_programados        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.conciliaciones_sesiones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.movimientos_bancarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.prospectos_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.prospectos_documentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contratos_documentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.penalizaciones_arrendatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.presupuesto_mensual       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.estado_resultados_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.gastos_fijos_anuales      ENABLE ROW LEVEL SECURITY;

-- Política: autenticados pueden todo
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'cat_grupo_gasto','edr_conceptos','vending_productos',
    'vending_inventario_semanal','vending_cierres_semanales',
    'gastos_operativos','fondo_revolvente_cierres','recibos_efectivo',
    'agua_lecturas','agua_recibos','agua_pagos','cobros_programados',
    'conciliaciones_sesiones','movimientos_bancarios',
    'prospectos_documentos','contratos_documentos',
    'penalizaciones_arrendatarios','presupuesto_mensual',
    'estado_resultados_mensual','gastos_fijos_anuales'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'CREATE POLICY "auth_all" ON prp.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- Política especial: portal público de prospectos (sin login, solo token)
ALTER TABLE prp.prospectos_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_token_read" ON prp.prospectos_tokens
  FOR SELECT TO anon
  USING (fecha_expiracion > NOW() AND NOT usado);

CREATE POLICY "auth_token_all" ON prp.prospectos_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_prospecto_read" ON prp.prospectos
  FOR SELECT TO anon
  USING (id IN (
    SELECT prospecto_id FROM prp.prospectos_tokens
    WHERE fecha_expiracion > NOW() AND NOT usado
  ));

CREATE POLICY "anon_doc_insert" ON prp.prospectos_documentos
  FOR INSERT TO anon
  WITH CHECK (prospecto_id IN (
    SELECT prospecto_id FROM prp.prospectos_tokens
    WHERE fecha_expiracion > NOW() AND NOT usado
  ));

-- ============================================================
-- SECCIÓN 16: ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cobros_contrato    ON prp.cobros_programados(contrato_id);
CREATE INDEX IF NOT EXISTS idx_cobros_estatus     ON prp.cobros_programados(estatus);
CREATE INDEX IF NOT EXISTS idx_cobros_ref         ON prp.cobros_programados(referencia_pago);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha       ON prp.cobros_programados(fecha_limite_pago);
CREATE INDEX IF NOT EXISTS idx_mov_sesion         ON prp.movimientos_bancarios(sesion_id);
CREATE INDEX IF NOT EXISTS idx_mov_conciliado     ON prp.movimientos_bancarios(conciliado);
CREATE INDEX IF NOT EXISTS idx_mov_ref            ON prp.movimientos_bancarios(referencia_cruzada);
CREATE INDEX IF NOT EXISTS idx_tokens_token       ON prp.prospectos_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_exp         ON prp.prospectos_tokens(fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_agua_recibos_est   ON prp.agua_recibos(estatus);
CREATE INDEX IF NOT EXISTS idx_agua_recibos_unidad ON prp.agua_recibos(unidad_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha       ON prp.gastos_operativos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_grupo       ON prp.gastos_operativos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_edr_anio_mes       ON prp.estado_resultados_mensual(anio, mes);
CREATE INDEX IF NOT EXISTS idx_presup_anio_mes    ON prp.presupuesto_mensual(anio, mes);

-- ============================================================
-- FIN DE LA MIGRACIÓN v2.0
-- ============================================================
-- Tablas nuevas:        21
-- Tablas modificadas:    5 (contratos_arrendamiento, empleados,
--                          unidades, prospectos, cobros_turno)
-- Funciones RPC nuevas:  1 (generar_cobros_contrato)
-- Triggers nuevos:       4 (folio_recibo, folio_agua,
--                           referencia_cobro, url_portal_prospecto)
-- Índices:              15
-- Seed data:            Productos vending, Grupos gasto,
--                       Conceptos EDR, Gastos fijos IWOL 2026
-- ============================================================
