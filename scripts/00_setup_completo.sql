-- ============================================================
-- IRP — Setup Completo Base de Datos NUEVA
-- Proyecto: kusuoxwzdxfuybvyiakg
-- RANNIX Consulting · 2026
-- ============================================================
-- ORDEN DE EJECUCIÓN:
--   1. Este archivo completo en Supabase SQL Editor
--   2. Luego: 01_seed_datos_prueba.sql
-- ============================================================

-- ============================================================
-- PASO 1: EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PASO 2: SCHEMA
-- ============================================================
CREATE SCHEMA IF NOT EXISTS prp;
SET search_path TO prp, public;

-- ============================================================
-- PASO 3: CATÁLOGOS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.cat_estado_general (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(30) UNIQUE NOT NULL,
  descripcion VARCHAR(100) NOT NULL,
  color_hex   VARCHAR(7),
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO prp.cat_estado_general (clave, descripcion, color_hex) VALUES
  ('VIGENTE',       'Vigente',            '#057642'),
  ('DISPONIBLE',    'Disponible',         '#0A66C2'),
  ('VENCIDO',       'Vencido',            '#B24020'),
  ('EN_MORA',       'En mora',            '#F59E0B'),
  ('PENDIENTE',     'Pendiente',          '#6B7280'),
  ('COMPLETADO',    'Completado',         '#057642'),
  ('CANCELADO',     'Cancelado',          '#B24020'),
  ('EN_PROCESO',    'En proceso',         '#E8A020'),
  ('MANTENIMIENTO', 'En mantenimiento',   '#7C3AED'),
  ('ACTIVO',        'Activo',             '#057642'),
  ('INACTIVO',      'Inactivo',           '#6B7280'),
  ('SUSPENDIDO',    'Suspendido',         '#F59E0B')
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS prp.cat_grupo_gasto (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(30) UNIQUE NOT NULL,
  descripcion VARCHAR(100) NOT NULL,
  tipo        VARCHAR(20) DEFAULT 'VARIABLE',
  activo      BOOLEAN DEFAULT TRUE,
  orden       INT DEFAULT 0
);

INSERT INTO prp.cat_grupo_gasto (clave, descripcion, tipo, orden) VALUES
  ('LIMPIEZA',          'Limpieza y aseo',              'VARIABLE', 1),
  ('FERRETERIA',        'Ferreterías y materiales',     'VARIABLE', 2),
  ('OXXO',              'OXXO / Servicios varios',      'VARIABLE', 3),
  ('VENDING_REPOS',     'Reposición vending machine',   'VARIABLE', 4),
  ('TOTAL_PLAY',        'Total Play / Internet',        'FIJO',     5),
  ('PAPELERIA',         'Papelería y oficina',          'VARIABLE', 6),
  ('MERCADO_LIBRE',     'Mercado Libre / Amazon',       'VARIABLE', 7),
  ('MANTENIMIENTO',     'Mantenimiento general',        'VARIABLE', 8),
  ('CFE',               'Luz / CFE',                    'FIJO',     11),
  ('AGUA_GASTO',        'Agua operativo',               'FIJO',     12),
  ('PREDIAL',           'Predial',                      'IMPUESTO', 13),
  ('LIC_ESTAC',         'Licencia estacionamiento',     'IMPUESTO', 14),
  ('RESIDUOS',          'Transporte residuos sólidos',  'IMPUESTO', 15),
  ('ANUNCIO',           'Anuncio publicitario',         'FIJO',     16),
  ('OTROS',             'Otros gastos',                 'VARIABLE', 99)
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS prp.edr_conceptos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave        VARCHAR(30) UNIQUE NOT NULL,
  descripcion  VARCHAR(200) NOT NULL,
  tipo         VARCHAR(20) NOT NULL,
  calculo_tipo VARCHAR(20) DEFAULT 'MANUAL',
  signo        INT DEFAULT 1,
  orden        INT DEFAULT 0,
  activo       BOOLEAN DEFAULT TRUE
);

INSERT INTO prp.edr_conceptos (clave, descripcion, tipo, calculo_tipo, signo, orden) VALUES
  ('RENTAS_BRUTAS',        'Rentas Brutas',                'INGRESO',  'AUTO_SUMA', 1,  1),
  ('PENALIZACIONES',       'Penalizaciones',               'INGRESO',  'AUTO_SUMA', 1,  3),
  ('IVA',                  'IVA (deducción)',               'CALCULO',  'AUTO_SUMA', -1, 4),
  ('INGRESOS_NETOS_RENTA', 'Ingresos Netos Renta',         'CALCULO',  'AUTO_SUMA', 1,  5),
  ('ESTACIONAMIENTO',      'Estacionamiento',              'INGRESO',  'AUTO_SUMA', 1,  6),
  ('PENSIONES_ESTAC',      'Pensiones estacionamiento',    'INGRESO',  'AUTO_SUMA', 1,  7),
  ('VENDING',              'Maquinita (Vending)',          'INGRESO',  'AUTO_SUMA', 1,  8),
  ('AGUA_INGRESO',         'Agua (cobro a locales)',       'INGRESO',  'AUTO_SUMA', 1,  9),
  ('TOTAL_INGRESOS',       'Total Ingresos',               'CALCULO',  'AUTO_SUMA', 1,  10),
  ('SUELDOS',              'Sueldos / Nómina',             'GASTO',    'AUTO_SUMA', -1, 11),
  ('FONDO_REVOLVENTE',     'Fondo Revolvente',             'GASTO',    'AUTO_SUMA', -1, 12),
  ('LUZ',                  'Luz / CFE',                    'GASTO',    'MANUAL',    -1, 14),
  ('OTROS_GASTOS',         'Otros Gastos',                 'GASTO',    'MANUAL',    -1, 16),
  ('TOTAL_GASTOS',         'Total Gastos',                 'CALCULO',  'AUTO_SUMA', -1, 17),
  ('UTILIDAD_BRUTA',       'Utilidad Bruta',               'CALCULO',  'AUTO_SUMA', 1,  18),
  ('PREDIAL_EDR',          'Predial',                      'IMPUESTO', 'AUTO_SUMA', -1, 19),
  ('RESIDUOS_EDR',         'Transporte Residuos Sólidos',  'IMPUESTO', 'AUTO_SUMA', -1, 20),
  ('LIC_ESTAC_EDR',        'Licencia Estacionamiento',     'IMPUESTO', 'AUTO_SUMA', -1, 21),
  ('UTILIDAD_NETA',        'Utilidad Neta',                'CALCULO',  'AUTO_SUMA', 1,  24)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- PASO 4: INMUEBLES Y UNIDADES
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.inmuebles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL,
  tipo            VARCHAR(50) DEFAULT 'PLAZA_COMERCIAL',
  direccion       TEXT,
  colonia         VARCHAR(100),
  municipio       VARCHAR(100),
  estado          VARCHAR(100),
  cp              VARCHAR(10),
  rfc_propietario VARCHAR(13),
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.unidades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inmueble_id          UUID NOT NULL REFERENCES prp.inmuebles(id),
  numero_local         VARCHAR(20) NOT NULL,
  nombre_comercial     VARCHAR(200),
  tipo_unidad          VARCHAR(50) DEFAULT 'LOCAL_COMERCIAL',
  metros_cuadrados     NUMERIC(8,2),
  piso                 INT DEFAULT 1,
  estatus_id           UUID REFERENCES prp.cat_estado_general(id),
  renta_base           NUMERIC(12,2) DEFAULT 0,
  tiene_servicio_agua  BOOLEAN DEFAULT TRUE,
  numero_medidor_agua  VARCHAR(50),
  monto_agua_base      NUMERIC(10,2),
  activo               BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inmueble_id, numero_local)
);

-- ============================================================
-- PASO 5: PERSONAS (ARRENDATARIOS, PROSPECTOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.arrendatarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(200) NOT NULL,
  apellidos         VARCHAR(200),
  rfc               VARCHAR(13),
  curp              VARCHAR(18),
  email             VARCHAR(200),
  telefono          VARCHAR(15),
  whatsapp          VARCHAR(15),
  domicilio         TEXT,
  tipo_persona      VARCHAR(20) DEFAULT 'FISICA',
  razon_social      VARCHAR(200),
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.prospectos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                VARCHAR(200) NOT NULL,
  apellidos             VARCHAR(200),
  email                 VARCHAR(200),
  telefono              VARCHAR(15),
  whatsapp              VARCHAR(15),
  rfc                   VARCHAR(13),
  curp                  VARCHAR(18),
  domicilio             TEXT,
  giro_solicitado       VARCHAR(200),
  unidad_id             UUID REFERENCES prp.unidades(id),
  monto_ofertado        NUMERIC(10,2),
  fecha_visita          DATE,
  fiador_nombre         VARCHAR(200),
  fiador_telefono       VARCHAR(15),
  fiador_domicilio      TEXT,
  resultado_buro        VARCHAR(20) DEFAULT 'PENDIENTE',
  resultado_buro_detalle TEXT,
  estatus               VARCHAR(20) DEFAULT 'NUEVO',
  motivo_rechazo        TEXT,
  contrato_id           UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 6: EMPLEADOS Y ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(30) UNIQUE NOT NULL,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  nivel       INT DEFAULT 5,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO prp.roles (clave, nombre, descripcion, nivel) VALUES
  ('SUPER_ADMIN',   'Super Administrador',  'Acceso total al sistema y configuración',  1),
  ('ADMIN',         'Administrador',        'Administrador de plaza',                   2),
  ('TESORERO',      'Tesorero',             'Módulo de cobranza y conciliación bancaria',3),
  ('CONTADOR',      'Contador',             'Módulo contable y fiscal',                 3),
  ('RH',            'Recursos Humanos',     'Módulo de RH y nómina',                    4),
  ('OPERATIVO',     'Operativo',            'Operación diaria: estacionamiento, caja',  5),
  ('MANTENIMIENTO', 'Mantenimiento',        'Órdenes de trabajo y mantenimiento',       5),
  ('SUPERVISOR',    'Supervisor',           'Supervisión de operaciones',               4),
  ('READONLY',      'Solo lectura',         'Visualización de reportes',                6),
  ('PROSPECTO',     'Prospecto',            'Acceso portal self-service de documentos', 9)
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS prp.empleados (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(200) NOT NULL,
  apellidos      VARCHAR(200),
  email          VARCHAR(200) UNIQUE,
  telefono       VARCHAR(15),
  whatsapp       VARCHAR(15),
  puesto         VARCHAR(100),
  departamento   VARCHAR(100),
  salario        NUMERIC(10,2),
  fecha_ingreso  DATE,
  tipo_contrato  VARCHAR(30) DEFAULT 'INDETERMINADO',
  rol_id         UUID REFERENCES prp.roles(id),
  auth_user_id   UUID,
  tiene_cajon    BOOLEAN DEFAULT FALSE,
  numero_cajon   VARCHAR(10),
  activo         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 7: PROVEEDORES
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(200) NOT NULL,
  rfc         VARCHAR(13),
  email       VARCHAR(200),
  telefono    VARCHAR(15),
  categoria   VARCHAR(50),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 8: CONTRATOS
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.contratos_arrendamiento (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id                 UUID NOT NULL REFERENCES prp.unidades(id),
  arrendatario_id           UUID NOT NULL REFERENCES prp.arrendatarios(id),
  tipo_documento            VARCHAR(30) DEFAULT 'SUBARRENDAMIENTO',
  tipo_contrato             VARCHAR(20) DEFAULT 'ANUAL',
  fecha_inicio              DATE NOT NULL,
  fecha_fin                 DATE NOT NULL,
  renta_mensual             NUMERIC(12,2) NOT NULL,
  deposito_garantia         NUMERIC(12,2) DEFAULT 0,
  dia_limite_pago           INT DEFAULT 5,
  periodo_gracia_dias       INT DEFAULT 15,
  numero_pagares            INT DEFAULT 12,
  giro_autorizado           VARCHAR(200),
  incremento_tipo           VARCHAR(20) DEFAULT 'INPC',
  penalizacion_mora_pct     NUMERIC(5,2) DEFAULT 10.00,
  penalizacion_adicional_pct NUMERIC(5,2) DEFAULT 5.00,
  penalizacion_dias         INT DEFAULT 10,
  cancelacion_anticipada_meses INT DEFAULT 2,
  fiador_nombre             VARCHAR(200),
  fiador_domicilio          TEXT,
  fiador_rfc                VARCHAR(13),
  cuenta_banco_pago         VARCHAR(100),
  clabe_interbancaria       VARCHAR(18),
  horario_inicio            TIME DEFAULT '08:00',
  horario_fin               TIME DEFAULT '22:00',
  despacho_juridico         VARCHAR(200),
  fecha_firma               DATE,
  archivo_contrato_url      TEXT,
  factura_a_tercero         BOOLEAN DEFAULT FALSE,
  tercero_razon_social      VARCHAR(200),
  tercero_rfc               VARCHAR(13),
  estatus                   VARCHAR(20) DEFAULT 'VIGENTE',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 9: COBROS PROGRAMADOS (los 12 mensuales por contrato)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.cobros_programados (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id            UUID NOT NULL REFERENCES prp.contratos_arrendamiento(id),
  unidad_id              UUID NOT NULL REFERENCES prp.unidades(id),
  arrendatario_id        UUID NOT NULL REFERENCES prp.arrendatarios(id),
  mes                    INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio                   INT NOT NULL,
  pagare_numero          INT,
  fecha_limite_pago      DATE NOT NULL,
  monto_renta            NUMERIC(12,2) NOT NULL,
  monto_iva              NUMERIC(12,2) DEFAULT 0,
  monto_total            NUMERIC(12,2) NOT NULL,
  referencia_pago        VARCHAR(40) UNIQUE NOT NULL,
  estatus                VARCHAR(20) DEFAULT 'PENDIENTE',
  fecha_pago_real        DATE,
  monto_pagado           NUMERIC(12,2),
  numero_operacion_banco  VARCHAR(50),
  banco_origen           VARCHAR(50),
  voucher_url            TEXT,
  forma_pago             VARCHAR(20),
  registrado_por         UUID REFERENCES prp.empleados(id),
  conciliado             BOOLEAN DEFAULT FALSE,
  monto_mora             NUMERIC(10,2) DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contrato_id, mes, anio)
);

-- Trigger referencia CP-YYYY-MM-LXX
CREATE OR REPLACE FUNCTION prp.fn_referencia_cobro()
RETURNS TRIGGER AS $$
DECLARE v_num VARCHAR(20);
BEGIN
  SELECT numero_local INTO v_num FROM prp.unidades WHERE id = NEW.unidad_id;
  NEW.referencia_pago := 'CP-' || NEW.anio::TEXT
    || '-' || LPAD(NEW.mes::TEXT, 2, '0')
    || '-' || REPLACE(REPLACE(UPPER(v_num), ' ', ''), '-', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_ref_cobro ON prp.cobros_programados;
CREATE TRIGGER trig_ref_cobro
  BEFORE INSERT ON prp.cobros_programados
  FOR EACH ROW
  WHEN (NEW.referencia_pago LIKE 'TEMP-%')
  EXECUTE FUNCTION prp.fn_referencia_cobro();

-- RPC: Generar 12 cobros al firmar contrato
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
  v_inicio := v_c.fecha_inicio + COALESCE(v_c.periodo_gracia_dias, 0);
  v_meses := EXTRACT(YEAR FROM AGE(v_c.fecha_fin, v_inicio)) * 12
           + EXTRACT(MONTH FROM AGE(v_c.fecha_fin, v_inicio));
  FOR i IN 1..v_meses LOOP
    v_fecha := v_inicio + ((i-1) || ' months')::INTERVAL;
    v_mes   := EXTRACT(MONTH FROM v_fecha);
    v_anio  := EXTRACT(YEAR FROM v_fecha);
    INSERT INTO prp.cobros_programados (
      contrato_id, unidad_id, arrendatario_id,
      mes, anio, pagare_numero, fecha_limite_pago,
      monto_renta, monto_iva, monto_total, referencia_pago
    ) VALUES (
      p_contrato_id, v_c.unidad_id, v_c.arrendatario_id,
      v_mes, v_anio, i,
      MAKE_DATE(v_anio, v_mes, COALESCE(v_c.dia_limite_pago, 5)),
      v_c.renta_mensual, v_c.renta_mensual * 0.16, v_c.renta_mensual * 1.16,
      'TEMP-' || gen_random_uuid()::TEXT
    ) ON CONFLICT (contrato_id, mes, anio) DO NOTHING;
    v_contador := v_contador + 1;
  END LOOP;
  RETURN v_contador;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PASO 10: CONCILIACIÓN BANCARIA
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.conciliaciones_sesiones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_sesion    DATE NOT NULL DEFAULT CURRENT_DATE,
  banco           VARCHAR(50) DEFAULT 'BBVA',
  periodo_inicio  DATE,
  periodo_fin     DATE,
  total_mov       INT DEFAULT 0,
  total_concil    INT DEFAULT 0,
  monto_concil    NUMERIC(12,2) DEFAULT 0,
  estatus         VARCHAR(20) DEFAULT 'EN_PROCESO',
  tesorero_id     UUID REFERENCES prp.empleados(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.movimientos_bancarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id           UUID NOT NULL REFERENCES prp.conciliaciones_sesiones(id),
  fecha_movimiento    DATE NOT NULL,
  descripcion         TEXT,
  referencia_banco    VARCHAR(100),
  referencia_cruzada  VARCHAR(40),
  monto               NUMERIC(12,2) NOT NULL,
  tipo                VARCHAR(10) DEFAULT 'ABONO',
  conciliado          BOOLEAN DEFAULT FALSE,
  cobro_programado_id UUID REFERENCES prp.cobros_programados(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 11: ESTACIONAMIENTO
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.cajones_estacionamiento (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        VARCHAR(10) UNIQUE NOT NULL,
  tipo          VARCHAR(20) DEFAULT 'PUBLICO',
  empleado_id   UUID REFERENCES prp.empleados(id),
  activo        BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS prp.pensiones_estacionamiento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(200) NOT NULL,
  telefono        VARCHAR(15),
  placa           VARCHAR(20),
  marca_auto      VARCHAR(50),
  color_auto      VARCHAR(30),
  cajon_id        UUID REFERENCES prp.cajones_estacionamiento(id),
  monto_mensual   NUMERIC(8,2) DEFAULT 500,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.accesos_estacionamiento (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio       VARCHAR(20),
  entrada     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  salida      TIMESTAMPTZ,
  placa       VARCHAR(20),
  tipo        VARCHAR(20) DEFAULT 'PUBLICO',
  pension_id  UUID REFERENCES prp.pensiones_estacionamiento(id),
  monto       NUMERIC(8,2) DEFAULT 0,
  pagado      BOOLEAN DEFAULT FALSE,
  cobrador_id UUID REFERENCES prp.empleados(id)
);

CREATE TABLE IF NOT EXISTS prp.cobros_turno (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
  turno             VARCHAR(10) DEFAULT 'DIA',
  empleado_id       UUID REFERENCES prp.empleados(id),
  operador_id       UUID REFERENCES prp.empleados(id),
  total_tickets     INT DEFAULT 0,
  total_pensiones   INT DEFAULT 0,
  monto_efectivo    NUMERIC(10,2) DEFAULT 0,
  monto_sistema     NUMERIC(10,2) DEFAULT 0,
  diferencia        NUMERIC(10,2) DEFAULT 0,
  validado          BOOLEAN DEFAULT FALSE,
  dia_semana        VARCHAR(20),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 12: VENDING MACHINE
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.vending_productos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        VARCHAR(100) NOT NULL,
  proveedor     VARCHAR(100),
  activo        BOOLEAN DEFAULT TRUE,
  orden         INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prp.vending_cierres_semanales (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio       DATE UNIQUE NOT NULL,
  semana_fin          DATE NOT NULL,
  ingreso_maquina     NUMERIC(10,2) DEFAULT 0,
  efectivo_entregado  NUMERIC(10,2) DEFAULT 0,
  residual_anterior   NUMERIC(10,2) DEFAULT 0,
  residual_actual     NUMERIC(10,2) DEFAULT 0,
  reposicion_monto    NUMERIC(10,2) DEFAULT 0,
  capturado_por       UUID REFERENCES prp.empleados(id),
  observaciones       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO prp.vending_productos (nombre, proveedor, orden) VALUES
  ('Sabriminis',   'LAS TOLUQUEÑAS',    1),
  ('Florentinas',  'LAS TOLUQUEÑAS',    2),
  ('Mix Barcel',   'LAS TOLUQUEÑAS',    3),
  ('Tilikos',      'FRITURAS SELECTAS', 4),
  ('Chocolate',    'BIMBO',             5),
  ('Coca Cola',    'COM GAO',           6),
  ('Agua 600ml',   'COM GAO',           7),
  ('Gatorade',     'COM GAO',           8),
  ('Nescafé',      'COM GAO',           9),
  ('Suavicremas',  'COM GAO',           10)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASO 13: AGUA POTABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.agua_lecturas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id        UUID NOT NULL REFERENCES prp.unidades(id),
  numero_medidor   VARCHAR(50),
  periodo_inicio   DATE NOT NULL,
  periodo_fin      DATE NOT NULL,
  lectura_anterior NUMERIC(10,2) DEFAULT 0,
  lectura_actual   NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.agua_recibos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lectura_id      UUID REFERENCES prp.agua_lecturas(id),
  unidad_id       UUID NOT NULL REFERENCES prp.unidades(id),
  arrendatario_id UUID REFERENCES prp.arrendatarios(id),
  folio           VARCHAR(20) UNIQUE,
  periodo_inicio  DATE NOT NULL,
  periodo_fin     DATE NOT NULL,
  consumo_m3      NUMERIC(10,2) NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  estatus         VARCHAR(20) DEFAULT 'PENDIENTE',
  monto_pagado    NUMERIC(10,2) DEFAULT 0,
  fecha_pago      DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 14: GASTOS OPERATIVOS Y FONDO REVOLVENTE
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.fondos_revolventes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(100) NOT NULL,
  monto_base   NUMERIC(10,2) DEFAULT 20000,
  responsable_id UUID REFERENCES prp.empleados(id),
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.fondo_revolvente_cierres (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fondo_id               UUID NOT NULL REFERENCES prp.fondos_revolventes(id),
  semana_inicio          DATE UNIQUE NOT NULL,
  semana_fin             DATE NOT NULL,
  monto_asignado         NUMERIC(10,2) DEFAULT 20000,
  total_estacionamiento  NUMERIC(10,2) DEFAULT 0,
  total_pensiones        NUMERIC(10,2) DEFAULT 0,
  total_vending          NUMERIC(10,2) DEFAULT 0,
  total_ingresos         NUMERIC(10,2) DEFAULT 0,
  total_gastos           NUMERIC(10,2) DEFAULT 0,
  total_comprobado       NUMERIC(10,2) DEFAULT 0,
  diferencia_gastos      NUMERIC(10,2) DEFAULT 0,
  total_efectivo_entregar NUMERIC(10,2) DEFAULT 0,
  dia_tomado_importe     NUMERIC(10,2) DEFAULT 0,
  residual_vending       NUMERIC(10,2) DEFAULT 0,
  cerrado                BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.gastos_operativos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha             DATE NOT NULL,
  proveedor_nombre  VARCHAR(200) NOT NULL,
  grupo_id          UUID REFERENCES prp.cat_grupo_gasto(id),
  descripcion       TEXT NOT NULL,
  monto_pagado      NUMERIC(10,2) NOT NULL,
  monto_comprobante NUMERIC(10,2),
  tiene_factura     BOOLEAN DEFAULT FALSE,
  semana_inicio     DATE,
  fondo_id          UUID REFERENCES prp.fondos_revolventes(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.recibos_efectivo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio           VARCHAR(20) UNIQUE,
  unidad_id       UUID REFERENCES prp.unidades(id),
  arrendatario_id UUID REFERENCES prp.arrendatarios(id),
  concepto        VARCHAR(200) NOT NULL,
  monto           NUMERIC(10,2) NOT NULL,
  fecha_emision   DATE NOT NULL DEFAULT CURRENT_DATE,
  cobrador_id     UUID REFERENCES prp.empleados(id),
  observaciones   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 15: PORTAL PROSPECTOS (self-service)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.prospectos_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id     UUID NOT NULL REFERENCES prp.prospectos(id) ON DELETE CASCADE,
  token            VARCHAR(64) UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  url_portal       TEXT,
  whatsapp_msg     TEXT,
  fecha_expiracion TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  usado            BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prp.fn_portal_url()
RETURNS TRIGGER AS $$
DECLARE v_nombre TEXT;
BEGIN
  SELECT nombre INTO v_nombre FROM prp.prospectos WHERE id = NEW.prospecto_id;
  NEW.url_portal := 'https://priwoi.netlify.app/portal/prospecto/' || NEW.token;
  NEW.whatsapp_msg := 'Hola ' || v_nombre || ', sube tu documentación aquí: https://priwoi.netlify.app/portal/prospecto/' || NEW.token || ' (válido 72 hrs)';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_portal_url ON prp.prospectos_tokens;
CREATE TRIGGER trig_portal_url
  BEFORE INSERT ON prp.prospectos_tokens
  FOR EACH ROW EXECUTE FUNCTION prp.fn_portal_url();

CREATE TABLE IF NOT EXISTS prp.prospectos_documentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id     UUID NOT NULL REFERENCES prp.prospectos(id),
  tipo_documento   VARCHAR(50) NOT NULL,
  nombre_archivo   VARCHAR(200),
  storage_path     TEXT NOT NULL,
  fecha_vencimiento DATE,
  verificado       BOOLEAN DEFAULT FALSE,
  subido_por_prospecto BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.contratos_documentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id    UUID NOT NULL REFERENCES prp.contratos_arrendamiento(id),
  tipo_documento VARCHAR(60) NOT NULL,
  nombre_archivo VARCHAR(200),
  storage_path   TEXT NOT NULL,
  fecha_documento DATE,
  subido_por     UUID REFERENCES prp.empleados(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 16: EDR (ESTADO DE RESULTADOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.presupuesto_mensual (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio             INT NOT NULL,
  mes              INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  concepto_id      UUID NOT NULL REFERENCES prp.edr_conceptos(id),
  monto_proyectado NUMERIC(12,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anio, mes, concepto_id)
);

CREATE TABLE IF NOT EXISTS prp.estado_resultados_mensual (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio             INT NOT NULL,
  mes              INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  concepto_id      UUID NOT NULL REFERENCES prp.edr_conceptos(id),
  monto_real       NUMERIC(12,2) DEFAULT 0,
  monto_proyectado NUMERIC(12,2) DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anio, mes, concepto_id)
);

CREATE TABLE IF NOT EXISTS prp.gastos_fijos_anuales (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto     VARCHAR(100) NOT NULL,
  monto        NUMERIC(10,2) NOT NULL,
  periodicidad VARCHAR(20) DEFAULT 'ANUAL',
  mes_pago     INT,
  anio         INT,
  pagado       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO prp.gastos_fijos_anuales (concepto, monto, periodicidad, mes_pago, anio) VALUES
  ('Predial',                    11894.00, 'ANUAL', 1, 2026),
  ('Licencia de Estacionamiento', 1595.00, 'ANUAL', 1, 2026),
  ('Transporte Residuos Sólidos', 1273.00, 'ANUAL', 1, 2026),
  ('Anuncio Publicitario IWOL',    852.00, 'ANUAL', 1, 2026)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASO 17: RLS — habilitar en todas las tablas
-- ============================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'cat_estado_general','cat_grupo_gasto','edr_conceptos',
    'inmuebles','unidades','arrendatarios','prospectos',
    'roles','empleados','proveedores',
    'contratos_arrendamiento','cobros_programados',
    'conciliaciones_sesiones','movimientos_bancarios',
    'cajones_estacionamiento','pensiones_estacionamiento',
    'accesos_estacionamiento','cobros_turno',
    'vending_productos','vending_cierres_semanales',
    'agua_lecturas','agua_recibos',
    'fondos_revolventes','fondo_revolvente_cierres',
    'gastos_operativos','recibos_efectivo',
    'prospectos_tokens','prospectos_documentos',
    'contratos_documentos',
    'presupuesto_mensual','estado_resultados_mensual',
    'gastos_fijos_anuales'
  ]
  LOOP
    EXECUTE 'ALTER TABLE prp.' || quote_ident(tbl) || ' ENABLE ROW LEVEL SECURITY';
    EXECUTE format(
      'DROP POLICY IF EXISTS "auth_all" ON prp.%I; CREATE POLICY "auth_all" ON prp.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Portal prospectos: acceso anon con token
CREATE POLICY "anon_token_read" ON prp.prospectos_tokens
  FOR SELECT TO anon
  USING (fecha_expiracion > NOW() AND NOT usado);

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
-- PASO 18: ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_unidades_inmueble    ON prp.unidades(inmueble_id);
CREATE INDEX IF NOT EXISTS idx_contratos_unidad     ON prp.contratos_arrendamiento(unidad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_arrendatario ON prp.contratos_arrendamiento(arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_cobros_contrato      ON prp.cobros_programados(contrato_id);
CREATE INDEX IF NOT EXISTS idx_cobros_estatus       ON prp.cobros_programados(estatus);
CREATE INDEX IF NOT EXISTS idx_cobros_ref           ON prp.cobros_programados(referencia_pago);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha         ON prp.cobros_programados(fecha_limite_pago);
CREATE INDEX IF NOT EXISTS idx_mov_ref              ON prp.movimientos_bancarios(referencia_cruzada);
CREATE INDEX IF NOT EXISTS idx_tokens_token         ON prp.prospectos_tokens(token);
CREATE INDEX IF NOT EXISTS idx_edr_anio_mes         ON prp.estado_resultados_mensual(anio, mes);

-- ============================================================
-- FIN: Setup completo listo para seed
-- ============================================================
