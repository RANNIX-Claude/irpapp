-- ============================================================
-- PRP — Property Resource Planning
-- RANNIX Consulting · Roberto Aguilar Cota · 2026
-- reset_database.sql — FASE 2 SÚPER PROMPT MAESTRO v5.0
-- Proyecto Supabase: ywashdlhkbvleigakjus
-- ============================================================
-- INSTRUCCIONES:
-- 1. Abrir Supabase → SQL Editor
-- 2. Pegar y ejecutar este script COMPLETO
-- 3. Verificar en Table Editor que todas las tablas existen
-- ============================================================

-- Limpiar esquemas previos (orden inverso de dependencias)
DROP SCHEMA IF EXISTS prp CASCADE;
DROP SCHEMA IF EXISTS dw CASCADE;
CREATE SCHEMA prp;
CREATE SCHEMA dw;
SET search_path TO prp, public;

-- ============================================================
-- SECCIÓN 0 — EMPRESA (configuración global)
-- ============================================================

CREATE TABLE prp.empresa (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  razon_social    TEXT NOT NULL,
  rfc             TEXT NOT NULL,
  regimen_fiscal  TEXT,
  representante   TEXT,
  calle           TEXT,
  numero          TEXT,
  colonia         TEXT,
  municipio       TEXT,
  estado          TEXT,
  cp              TEXT,
  telefono        TEXT,
  email           TEXT,
  logo_url        TEXT,
  pac_proveedor   TEXT DEFAULT 'SOLUCION_FACTIBLE',
  serie_cfdi      TEXT DEFAULT 'A',
  folio_siguiente INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 1 — CATÁLOGOS
-- ============================================================

-- 1.1 Estado general (todos los módulos)
CREATE TABLE prp.cat_estado_general (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  color  TEXT -- hex para UI
);

INSERT INTO prp.cat_estado_general (clave, nombre, color) VALUES
  ('ACTIVO',          'Activo',               '#057642'),
  ('INACTIVO',        'Inactivo',             '#6B7280'),
  ('VIGENTE',         'Vigente',              '#0A66C2'),
  ('DISPONIBLE',      'Disponible',           '#057642'),
  ('OCUPADO',         'Ocupado',              '#E8A020'),
  ('VENCIDO',         'Vencido',              '#B24020'),
  ('EN_MORA',         'En mora',              '#B24020'),
  ('PENDIENTE',       'Pendiente',            '#F59E0B'),
  ('COMPLETADO',      'Completado',           '#057642'),
  ('CANCELADO',       'Cancelado',            '#6B7280'),
  ('EN_PROCESO',      'En proceso',           '#0A66C2'),
  ('MANTENIMIENTO',   'Mantenimiento',        '#F59E0B'),
  ('POR_VENCER',      'Por vencer',           '#F59E0B'),
  ('FIRMADO',         'Firmado',              '#057642'),
  ('RENOVADO',        'Renovado',             '#0A66C2'),
  ('RESCINDIDO',      'Rescindido',           '#B24020'),
  ('BORRADOR',        'Borrador',             '#9CA3AF'),
  ('REVISION',        'En revisión',          '#6366F1');

-- 1.2 Tipo de inmueble
CREATE TABLE prp.cat_tipo_inmueble (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_inmueble (clave, nombre) VALUES
  ('PLAZA_COMERCIAL',  'Plaza comercial'),
  ('EDIFICIO_OFICINAS','Edificio de oficinas'),
  ('BODEGA_INDUSTRIAL','Bodega industrial'),
  ('CONSULTORIO',      'Consultorio médico'),
  ('LOCAL_MIXTO',      'Local uso mixto');

-- 1.3 Tipo de unidad
CREATE TABLE prp.cat_tipo_unidad (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_unidad (clave, nombre) VALUES
  ('LOCAL',        'Local comercial'),
  ('OFICINA',      'Oficina'),
  ('BODEGA',       'Bodega'),
  ('CONSULTORIO',  'Consultorio'),
  ('PATIO',        'Patio de usos múltiples'),
  ('TERRAZA',      'Terraza'),
  ('ANAQUEL',      'Anaquel / aparador'),
  ('KIOSKO',       'Kiosko');

-- 1.4 Giro comercial
CREATE TABLE prp.cat_giro_comercial (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  sector TEXT
);
INSERT INTO prp.cat_giro_comercial (clave, nombre, sector) VALUES
  ('ALIMENTOS',     'Alimentos y bebidas',    'RESTAURANTES'),
  ('ROPA',          'Ropa y accesorios',      'MODA'),
  ('ELECTRONICA',   'Electrónica',            'TECNOLOGIA'),
  ('SALUD',         'Salud y bienestar',      'SERVICIOS'),
  ('BELLEZA',       'Belleza y estética',     'SERVICIOS'),
  ('EDUCACION',     'Educación y cursos',     'SERVICIOS'),
  ('ENTRETENIMIENTO','Entretenimiento',        'OCIO'),
  ('FINANZAS',      'Servicios financieros',  'SERVICIOS'),
  ('SUPERMERCADO',  'Supermercado / abarrotes','RETAIL'),
  ('FARMACIA',      'Farmacia / droguería',   'SALUD'),
  ('OPTICA',        'Óptica',                 'SALUD'),
  ('PAPELERIA',     'Papelería y librería',   'RETAIL'),
  ('ZAPATERIA',     'Zapatería',              'MODA'),
  ('JOYERIA',       'Joyería y relojería',    'LUJO'),
  ('OTRO',          'Otro',                   'GENERAL');

-- 1.5 Tipo de contrato (arrendamiento)
CREATE TABLE prp.cat_tipo_contrato_arrendamiento (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  meses_minimo INTEGER DEFAULT 12
);
INSERT INTO prp.cat_tipo_contrato_arrendamiento (clave, nombre, meses_minimo) VALUES
  ('ANUAL',          'Contrato anual',          12),
  ('SEMESTRAL',      'Contrato semestral',       6),
  ('MENSUAL',        'Contrato mensual',         1),
  ('EVENTUAL',       'Contrato eventual/evento', 0);

-- 1.6 Tipo de pago
CREATE TABLE prp.cat_tipo_pago (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_pago (clave, nombre) VALUES
  ('TRANSFERENCIA', 'Transferencia bancaria'),
  ('CHEQUE',        'Cheque'),
  ('EFECTIVO',      'Efectivo'),
  ('TARJETA',       'Tarjeta de crédito/débito'),
  ('DEPOSITO',      'Depósito en ventanilla'),
  ('SPEI',          'SPEI'),
  ('APP_PAGO',      'App de pago (CoDi, etc)');

-- 1.7 Régimen fiscal SAT
CREATE TABLE prp.cat_regimen_fiscal (
  id          SERIAL PRIMARY KEY,
  clave       TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  persona     TEXT NOT NULL CHECK (persona IN ('FISICA','MORAL','AMBOS'))
);
INSERT INTO prp.cat_regimen_fiscal (clave, descripcion, persona) VALUES
  ('612', 'Personas Físicas con Actividades Empresariales y Profesionales', 'FISICA'),
  ('626', 'Régimen Simplificado de Confianza - RESICO',                     'FISICA'),
  ('601', 'General de Ley Personas Morales',                                 'MORAL'),
  ('603', 'Personas Morales con Fines no Lucrativos',                        'MORAL'),
  ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios',             'FISICA'),
  ('621', 'Incorporación Fiscal',                                             'FISICA'),
  ('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', 'FISICA');

-- 1.8 Tipo de acceso estacionamiento
CREATE TABLE prp.cat_tipo_acceso (
  id         SERIAL PRIMARY KEY,
  clave      TEXT UNIQUE NOT NULL,
  nombre     TEXT NOT NULL,
  cobra      BOOLEAN DEFAULT TRUE,
  tarifa_fija BOOLEAN DEFAULT FALSE
);
INSERT INTO prp.cat_tipo_acceso (clave, nombre, cobra, tarifa_fija) VALUES
  ('PENSION_MENSUAL',   'Pensión mensual',       TRUE,  TRUE),
  ('BOLETO_NORMAL',     'Boleto normal',         TRUE,  FALSE),
  ('TARIFA_PREFERENCIAL','Tarifa preferencial',  TRUE,  FALSE),
  ('BOLETO_PERDIDO',    'Boleto perdido',        TRUE,  TRUE),
  ('VISITA_CORTESIA',   'Visita cortesía',       FALSE, FALSE),
  ('PROVEEDOR_OBRA',    'Proveedor / obra',      FALSE, FALSE),
  ('INVALIDO',          'Persona con discapacidad', FALSE, FALSE);

-- 1.9 Zona estacionamiento
CREATE TABLE prp.cat_zona_estacionamiento (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  nivel  INTEGER DEFAULT 1
);
INSERT INTO prp.cat_zona_estacionamiento (clave, nombre, nivel) VALUES
  ('ZONA_A',         'Zona A – Planta baja norte',    1),
  ('ZONA_B',         'Zona B – Planta baja sur',      1),
  ('ZONA_C',         'Zona C – Sótano 1',             0),
  ('ZONA_D',         'Zona D – Sótano 2',            -1),
  ('DISCAPACITADOS', 'Cajones discapacidad',           1),
  ('DIRECTIVOS',     'Cajones directivos',             1);

-- 1.10 Tipo de vehículo
CREATE TABLE prp.cat_tipo_vehiculo (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_vehiculo (clave, nombre) VALUES
  ('AUTOMOVIL',    'Automóvil'),
  ('MOTOCICLETA',  'Motocicleta'),
  ('CAMIONETA',    'Camioneta / SUV'),
  ('CAMION',       'Camión'),
  ('TRAILER',      'Trailer'),
  ('BICICLETA',    'Bicicleta');

-- 1.11 Tipo de contrato laboral
CREATE TABLE prp.cat_tipo_contrato_laboral (
  id          SERIAL PRIMARY KEY,
  clave       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  articulo_lft TEXT NOT NULL,
  duracion_dias INTEGER,
  prorrogable BOOLEAN DEFAULT FALSE
);
INSERT INTO prp.cat_tipo_contrato_laboral (clave, nombre, articulo_lft, duracion_dias, prorrogable) VALUES
  ('PRUEBA',           'Contrato a prueba',             'Art. 39-A LFT', 30,   FALSE),
  ('CAPACITACION',     'Contrato capacitación inicial', 'Art. 39-B LFT', 90,   FALSE),
  ('TIEMPO_INDETERMINADO','Contrato tiempo indeterminado','Art. 35 LFT',  NULL, FALSE),
  ('OBRA_DETERMINADA', 'Contrato por obra determinada', 'Art. 36 LFT',   NULL, FALSE),
  ('TIEMPO_DETERMINADO','Contrato tiempo determinado',  'Art. 37 LFT',   NULL, TRUE);

-- 1.12 Estado civil
CREATE TABLE prp.cat_estado_civil (
  id    SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_estado_civil (clave, nombre) VALUES
  ('SOLTERO',   'Soltero(a)'),
  ('CASADO',    'Casado(a)'),
  ('DIVORCIADO','Divorciado(a)'),
  ('VIUDO',     'Viudo(a)'),
  ('UNION_LIBRE','Unión libre');

-- 1.13 Tipo de documento (expediente empleado)
CREATE TABLE prp.cat_tipo_documento (
  id          SERIAL PRIMARY KEY,
  clave       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  obligatorio BOOLEAN DEFAULT TRUE,
  aplica_a    TEXT DEFAULT 'AMBOS' CHECK (aplica_a IN ('EMPLEADO','ARRENDATARIO','AMBOS'))
);
INSERT INTO prp.cat_tipo_documento (clave, nombre, obligatorio, aplica_a) VALUES
  ('ACTA_NACIMIENTO',       'Acta de nacimiento',             TRUE,  'EMPLEADO'),
  ('CURP',                  'CURP',                           TRUE,  'EMPLEADO'),
  ('INE',                   'INE / IFE',                      TRUE,  'EMPLEADO'),
  ('COMPROBANTE_DOMICILIO', 'Comprobante de domicilio',       TRUE,  'EMPLEADO'),
  ('CONSTANCIA_SAT',        'Constancia de situación fiscal', TRUE,  'EMPLEADO'),
  ('NUMERO_IMSS',           'Número IMSS (NSS)',              TRUE,  'EMPLEADO'),
  ('CV',                    'Currículum vitae',               FALSE, 'EMPLEADO'),
  ('CARTA_RECOMENDACION',   'Carta de recomendación',         FALSE, 'EMPLEADO'),
  ('EXAMEN_MEDICO',         'Examen médico de ingreso',       FALSE, 'EMPLEADO'),
  ('FOTO',                  'Fotografía',                     FALSE, 'EMPLEADO'),
  -- Arrendatario
  ('INE_REP_LEGAL',         'INE Representante legal',        TRUE,  'ARRENDATARIO'),
  ('ACTA_CONSTITUTIVA',     'Acta constitutiva',              FALSE, 'ARRENDATARIO'),
  ('RFC_ARRENDATARIO',      'RFC / Constancia SAT',           TRUE,  'ARRENDATARIO'),
  ('COMP_DOM_ARRENDATARIO', 'Comprobante domicilio',          TRUE,  'ARRENDATARIO'),
  ('ESTADO_CUENTA',         'Estado de cuenta bancario',      TRUE,  'ARRENDATARIO'),
  ('CARTA_FIANZA',          'Carta de fianza / aval',         FALSE, 'ARRENDATARIO');

-- 1.14 Tipo de incidencia RH
CREATE TABLE prp.cat_tipo_incidencia (
  id            SERIAL PRIMARY KEY,
  clave         TEXT UNIQUE NOT NULL,
  nombre        TEXT NOT NULL,
  afecta_nomina BOOLEAN DEFAULT TRUE,
  signo         TEXT DEFAULT 'NEGATIVO' CHECK (signo IN ('POSITIVO','NEGATIVO','NEUTRO'))
);
INSERT INTO prp.cat_tipo_incidencia (clave, nombre, afecta_nomina, signo) VALUES
  ('FALTA_INJUSTIFICADA','Falta injustificada',      TRUE, 'NEGATIVO'),
  ('FALTA_JUSTIFICADA',  'Falta justificada',        FALSE,'NEUTRO'),
  ('RETARDO',            'Retardo / tardanza',        TRUE, 'NEGATIVO'),
  ('HORA_EXTRA',         'Hora extra doble',          TRUE, 'POSITIVO'),
  ('HORA_EXTRA_TRIPLE',  'Hora extra triple (días festivos)', TRUE, 'POSITIVO'),
  ('VACACIONES',         'Vacaciones',                FALSE,'NEUTRO'),
  ('INCAPACIDAD_IMSS',   'Incapacidad IMSS',         FALSE,'NEUTRO'),
  ('PERMISO_GOCE',       'Permiso con goce de sueldo',FALSE,'NEUTRO'),
  ('PERMISO_SIN_GOCE',   'Permiso sin goce de sueldo',TRUE,'NEGATIVO'),
  ('BONO',               'Bono / premio',             TRUE, 'POSITIVO'),
  ('DESCUENTO_PRESTAMO', 'Descuento préstamo interno',TRUE, 'NEGATIVO'),
  ('INFONAVIT',          'Descuento INFONAVIT',       TRUE, 'NEGATIVO'),
  ('FONACOT',            'Descuento FONACOT',         TRUE, 'NEGATIVO');

-- 1.15 Tipo de notificación
CREATE TABLE prp.cat_tipo_notificacion (
  id      SERIAL PRIMARY KEY,
  clave   TEXT UNIQUE NOT NULL,
  nombre  TEXT NOT NULL,
  modulo  TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_notificacion (clave, nombre, modulo) VALUES
  ('RECORDATORIO_PAGO',      'Recordatorio de pago',         'COBRANZA'),
  ('AVISO_VENCIMIENTO',      'Aviso de vencimiento',         'COBRANZA'),
  ('CARGO_MORA',             'Cargo por mora',               'COBRANZA'),
  ('PAGO_RECIBIDO',          'Confirmación pago recibido',   'COBRANZA'),
  ('RENOVACION_CONTRATO',    'Propuesta de renovación',      'CONTRATOS'),
  ('CONTRATO_FIRMADO',       'Contrato firmado',             'CONTRATOS'),
  ('BIENVENIDA_ARRENDATARIO','Bienvenida al arrendatario',   'CONTRATOS'),
  ('OT_CREADA',              'Orden de trabajo creada',      'MANTENIMIENTO'),
  ('OT_COMPLETADA',          'Orden de trabajo completada',  'MANTENIMIENTO'),
  ('OT_VENCIDA',             'Orden de trabajo vencida',     'MANTENIMIENTO'),
  ('NOMINA_PAGADA',          'Nómina pagada',                'RH'),
  ('FIN_PRUEBA',             'Fin periodo a prueba',         'RH'),
  ('VACACIONES_APROBADAS',   'Vacaciones aprobadas',         'RH'),
  ('PENSION_VENCER',         'Pensión por vencer',           'ESTACIONAMIENTO');

-- 1.16 Canal de notificación
CREATE TABLE prp.cat_canal_notificacion (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_canal_notificacion (clave, nombre) VALUES
  ('EMAIL',     'Correo electrónico'),
  ('WHATSAPP',  'WhatsApp'),
  ('SMS',       'SMS'),
  ('PUSH',      'Notificación push app'),
  ('IN_APP',    'Notificación en plataforma');

-- 1.17 Concepto de egreso
CREATE TABLE prp.cat_concepto_egreso (
  id           SERIAL PRIMARY KEY,
  clave        TEXT UNIQUE NOT NULL,
  nombre       TEXT NOT NULL,
  deducible    TEXT DEFAULT 'DEDUCIBLE_100' CHECK (deducible IN ('DEDUCIBLE_100','DEDUCIBLE_PARCIAL','NO_DEDUCIBLE')),
  requiere_cfdi BOOLEAN DEFAULT TRUE
);
INSERT INTO prp.cat_concepto_egreso (clave, nombre, deducible, requiere_cfdi) VALUES
  ('NOMINA',             'Nómina de empleados',       'DEDUCIBLE_100', TRUE),
  ('SERVICIOS_AGUA',     'Servicio de agua',          'DEDUCIBLE_100', TRUE),
  ('SERVICIOS_LUZ',      'Servicio de electricidad',  'DEDUCIBLE_100', TRUE),
  ('SERVICIOS_GAS',      'Servicio de gas',           'DEDUCIBLE_100', TRUE),
  ('LIMPIEZA',           'Servicio de limpieza',      'DEDUCIBLE_100', TRUE),
  ('SEGURIDAD',          'Servicio de seguridad',     'DEDUCIBLE_100', TRUE),
  ('MANTENIMIENTO',      'Mantenimiento correctivo',  'DEDUCIBLE_100', TRUE),
  ('REPARACION_MENOR',   'Reparación menor',          'DEDUCIBLE_100', FALSE),
  ('MATERIALES',         'Materiales y herramientas', 'DEDUCIBLE_100', FALSE),
  ('INSUMOS_LIMPIEZA',   'Insumos de limpieza',       'DEDUCIBLE_100', FALSE),
  ('SERVICIOS_URGENTES', 'Servicios urgentes',        'DEDUCIBLE_100', FALSE),
  ('HONORARIOS',         'Honorarios profesionales',  'DEDUCIBLE_100', TRUE),
  ('PUBLICIDAD',         'Publicidad y marketing',    'DEDUCIBLE_100', TRUE),
  ('SEGUROS',            'Seguros y fianzas',         'DEDUCIBLE_100', TRUE),
  ('PREDIAL',            'Predial',                   'DEDUCIBLE_100', TRUE),
  ('IMPREVISTOS',        'Imprevistos varios',        'DEDUCIBLE_PARCIAL', FALSE);

-- 1.18 Tipo de proveedor
CREATE TABLE prp.cat_tipo_proveedor (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_proveedor (clave, nombre) VALUES
  ('PERSONA_FISICA', 'Persona física'),
  ('PERSONA_MORAL',  'Persona moral'),
  ('EXTRANJERO',     'Proveedor extranjero');

-- 1.19 Categoría de proveedor
CREATE TABLE prp.cat_categoria_proveedor (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_categoria_proveedor (clave, nombre) VALUES
  ('CONSTRUCCION',   'Construcción y obra'),
  ('LIMPIEZA',       'Limpieza e higiene'),
  ('SEGURIDAD',      'Seguridad y vigilancia'),
  ('ELECTRICIDAD',   'Electricidad y plomería'),
  ('JARDINERIA',     'Jardinería'),
  ('TECNOLOGIA',     'Tecnología y sistemas'),
  ('LEGAL',          'Asesoría legal'),
  ('CONTABILIDAD',   'Contabilidad y fiscal'),
  ('MARKETING',      'Marketing y publicidad'),
  ('SEGUROS',        'Seguros y fianzas'),
  ('SUMINISTROS',    'Suministros generales'),
  ('OTRO',           'Otro');

-- 1.20 Motivo de cancelación CFDI (SAT)
CREATE TABLE prp.cat_motivo_cancelacion_cfdi (
  id      SERIAL PRIMARY KEY,
  clave   TEXT UNIQUE NOT NULL,
  nombre  TEXT NOT NULL
);
INSERT INTO prp.cat_motivo_cancelacion_cfdi (clave, nombre) VALUES
  ('01', 'Comprobante emitido con errores con relación'),
  ('02', 'Comprobante emitido con errores sin relación'),
  ('03', 'No se llevó a cabo la operación'),
  ('04', 'Operación nominativa relacionada en la factura global');

-- ============================================================
-- SECCIÓN 2 — MÓDULO INMUEBLES Y UNIDADES
-- ============================================================

CREATE TABLE prp.inmuebles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave           TEXT UNIQUE NOT NULL,
  nombre          TEXT NOT NULL,
  tipo_inmueble   TEXT REFERENCES prp.cat_tipo_inmueble(clave),
  calle           TEXT,
  numero          TEXT,
  colonia         TEXT,
  municipio       TEXT,
  estado          TEXT,
  cp              TEXT,
  pais            TEXT DEFAULT 'México',
  latitud         DECIMAL(10,7),
  longitud        DECIMAL(10,7),
  m2_totales      DECIMAL(12,2),
  m2_rentables    DECIMAL(12,2),
  num_niveles     INTEGER DEFAULT 1,
  num_unidades    INTEGER DEFAULT 0,
  foto_url        TEXT,
  estado_id       TEXT DEFAULT 'ACTIVO' REFERENCES prp.cat_estado_general(clave),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.unidades (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inmueble_id     UUID REFERENCES prp.inmuebles(id) ON DELETE CASCADE,
  clave           TEXT UNIQUE NOT NULL,
  numero_local    TEXT NOT NULL,
  piso            TEXT DEFAULT 'PB',
  tipo_unidad     TEXT REFERENCES prp.cat_tipo_unidad(clave),
  m2_totales      DECIMAL(10,2),
  m2_vendibles    DECIMAL(10,2),
  frente_ml       DECIMAL(8,2),
  estado_id       TEXT DEFAULT 'DISPONIBLE' REFERENCES prp.cat_estado_general(clave),
  renta_base      DECIMAL(12,2),
  foto_url        TEXT,
  descripcion     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 3 — MÓDULO ARRENDATARIOS
-- ============================================================

CREATE TABLE prp.arrendatarios (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_persona    TEXT DEFAULT 'MORAL' CHECK (tipo_persona IN ('FISICA','MORAL')),
  razon_social    TEXT,
  nombre          TEXT,
  apellido_pat    TEXT,
  apellido_mat    TEXT,
  rfc             TEXT,
  regimen_fiscal  TEXT REFERENCES prp.cat_regimen_fiscal(clave),
  giro_comercial  TEXT REFERENCES prp.cat_giro_comercial(clave),
  rep_legal       TEXT,
  email_principal TEXT,
  email_factura   TEXT,
  telefono        TEXT,
  celular         TEXT,
  calle           TEXT,
  numero          TEXT,
  colonia         TEXT,
  municipio       TEXT,
  estado          TEXT,
  cp              TEXT,
  estado_id       TEXT DEFAULT 'ACTIVO' REFERENCES prp.cat_estado_general(clave),
  calificacion    DECIMAL(3,2) DEFAULT 5.00, -- 1-5 estrellas
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.documentos_arrendatario (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrendatario_id  UUID REFERENCES prp.arrendatarios(id) ON DELETE CASCADE,
  tipo_documento   TEXT REFERENCES prp.cat_tipo_documento(clave),
  nombre_archivo   TEXT NOT NULL,
  storage_path     TEXT NOT NULL, -- Supabase Storage path
  fecha_emision    DATE,
  fecha_vencimiento DATE,
  verificado       BOOLEAN DEFAULT FALSE,
  verificado_por   UUID,
  verificado_at    TIMESTAMPTZ,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 4 — MÓDULO CONTRATOS DE ARRENDAMIENTO
-- ============================================================

CREATE TABLE prp.contratos_arrendamiento (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio            TEXT UNIQUE NOT NULL, -- CA-2026-0001
  unidad_id        UUID REFERENCES prp.unidades(id),
  arrendatario_id  UUID REFERENCES prp.arrendatarios(id),
  tipo_contrato    TEXT REFERENCES prp.cat_tipo_contrato_arrendamiento(clave),
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE,
  renta_mensual    DECIMAL(12,2) NOT NULL,
  cuota_mant       DECIMAL(12,2) DEFAULT 0,
  deposito_garantia DECIMAL(12,2),
  incremento_anual DECIMAL(5,2) DEFAULT 0, -- porcentaje
  dia_cobro        INTEGER DEFAULT 1, -- día del mes
  periodo_gracia_dias INTEGER DEFAULT 5,
  penalizacion_mora DECIMAL(5,2) DEFAULT 5.00, -- % mensual
  uso_autorizados  TEXT, -- giro autorizado en contrato
  docx_url         TEXT, -- contrato generado en Storage
  estado_id        TEXT DEFAULT 'VIGENTE' REFERENCES prp.cat_estado_general(clave),
  firmado_at       TIMESTAMPTZ,
  firmado_por      TEXT,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Plantillas para generación de contratos (arrendamiento y laboral)
CREATE TABLE prp.plantillas_contrato (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('ARRENDAMIENTO','LABORAL_PRUEBA','LABORAL_INDEFINIDO','LABORAL_DETERMINADO','CONVENIO','OTRO')),
  version         TEXT DEFAULT '1.0',
  docx_template_url TEXT, -- en Supabase Storage
  variables_json  JSONB, -- lista de {clave, etiqueta, fuente}
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO prp.plantillas_contrato (nombre, tipo, version, variables_json) VALUES
(
  'Contrato de Arrendamiento Estándar', 'ARRENDAMIENTO', '1.0',
  '[
    {"clave":"{{ARRENDATARIO_NOMBRE}}","fuente":"arrendatarios.razon_social"},
    {"clave":"{{ARRENDATARIO_RFC}}","fuente":"arrendatarios.rfc"},
    {"clave":"{{REP_LEGAL}}","fuente":"arrendatarios.rep_legal"},
    {"clave":"{{UNIDAD_CLAVE}}","fuente":"unidades.clave"},
    {"clave":"{{UNIDAD_M2}}","fuente":"unidades.m2_totales"},
    {"clave":"{{RENTA_MENSUAL}}","fuente":"contratos_arrendamiento.renta_mensual"},
    {"clave":"{{DEPOSITO}}","fuente":"contratos_arrendamiento.deposito_garantia"},
    {"clave":"{{FECHA_INICIO}}","fuente":"contratos_arrendamiento.fecha_inicio"},
    {"clave":"{{FECHA_FIN}}","fuente":"contratos_arrendamiento.fecha_fin"},
    {"clave":"{{INCREMENTO_ANUAL}}","fuente":"contratos_arrendamiento.incremento_anual"},
    {"clave":"{{EMPRESA_NOMBRE}}","fuente":"empresa.razon_social"},
    {"clave":"{{EMPRESA_RFC}}","fuente":"empresa.rfc"},
    {"clave":"{{EMPRESA_REP}}","fuente":"empresa.representante"}
  ]'::JSONB
),
(
  'Contrato a Prueba - Art. 39-A LFT', 'LABORAL_PRUEBA', '1.0',
  '[
    {"clave":"{{TRABAJADOR_NOMBRE}}","fuente":"empleados.nombre_completo"},
    {"clave":"{{TRABAJADOR_CURP}}","fuente":"empleados.curp"},
    {"clave":"{{TRABAJADOR_RFC}}","fuente":"empleados.rfc"},
    {"clave":"{{TRABAJADOR_NSS}}","fuente":"empleados.nss"},
    {"clave":"{{TRABAJADOR_EDAD}}","fuente":"empleados.edad"},
    {"clave":"{{TRABAJADOR_SEXO}}","fuente":"empleados.sexo"},
    {"clave":"{{TRABAJADOR_ESTADO_CIVIL}}","fuente":"empleados.estado_civil"},
    {"clave":"{{TRABAJADOR_DOMICILIO}}","fuente":"empleados.domicilio_completo"},
    {"clave":"{{TRABAJADOR_EMAIL}}","fuente":"empleados.email"},
    {"clave":"{{PUESTO}}","fuente":"empleados.puesto"},
    {"clave":"{{SALARIO_DIARIO}}","fuente":"empleados.salario_diario"},
    {"clave":"{{SALARIO_MENSUAL}}","fuente":"empleados.salario_mensual"},
    {"clave":"{{FECHA_INICIO}}","fuente":"contratos_laborales.fecha_inicio"},
    {"clave":"{{FECHA_FIN_PRUEBA}}","fuente":"contratos_laborales.fecha_fin"},
    {"clave":"{{HORARIO}}","fuente":"empleados.horario"},
    {"clave":"{{EMPRESA_NOMBRE}}","fuente":"empresa.razon_social"},
    {"clave":"{{EMPRESA_REP}}","fuente":"empresa.representante"},
    {"clave":"{{EMPRESA_DOMICILIO}}","fuente":"empresa.direccion_completa"},
    {"clave":"{{LUGAR_CONTRATO}}","fuente":"empresa.municipio"},
    {"clave":"{{FECHA_CONTRATO}}","fuente":"NOW()"}
  ]'::JSONB
),
(
  'Contrato Tiempo Indeterminado - Art. 35 LFT', 'LABORAL_INDEFINIDO', '1.0',
  '[
    {"clave":"{{TRABAJADOR_NOMBRE}}","fuente":"empleados.nombre_completo"},
    {"clave":"{{TRABAJADOR_CURP}}","fuente":"empleados.curp"},
    {"clave":"{{TRABAJADOR_RFC}}","fuente":"empleados.rfc"},
    {"clave":"{{TRABAJADOR_NSS}}","fuente":"empleados.nss"},
    {"clave":"{{PUESTO}}","fuente":"empleados.puesto"},
    {"clave":"{{AREA}}","fuente":"empleados.area"},
    {"clave":"{{SALARIO_MENSUAL}}","fuente":"empleados.salario_mensual"},
    {"clave":"{{FORMA_PAGO}}","fuente":"empleados.forma_pago_nomina"},
    {"clave":"{{FECHA_INICIO}}","fuente":"contratos_laborales.fecha_inicio"},
    {"clave":"{{EMPRESA_NOMBRE}}","fuente":"empresa.razon_social"},
    {"clave":"{{EMPRESA_REP}}","fuente":"empresa.representante"}
  ]'::JSONB
);

-- ============================================================
-- SECCIÓN 5 — MÓDULO COBRANZA
-- ============================================================

CREATE TABLE prp.cargos_renta (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id       UUID REFERENCES prp.contratos_arrendamiento(id),
  periodo           TEXT NOT NULL, -- '2026-07'
  fecha_cargo       DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  renta             DECIMAL(12,2) NOT NULL,
  cuota_mant        DECIMAL(12,2) DEFAULT 0,
  subtotal          DECIMAL(12,2) NOT NULL,
  iva               DECIMAL(12,2) NOT NULL,
  total             DECIMAL(12,2) NOT NULL,
  saldo_pendiente   DECIMAL(12,2) NOT NULL,
  mora_acumulada    DECIMAL(12,2) DEFAULT 0,
  estado_id         TEXT DEFAULT 'PENDIENTE' REFERENCES prp.cat_estado_general(clave),
  cfdi_uuid         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.pagos_renta (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_id        UUID REFERENCES prp.cargos_renta(id),
  contrato_id     UUID REFERENCES prp.contratos_arrendamiento(id),
  fecha_pago      DATE NOT NULL,
  monto           DECIMAL(12,2) NOT NULL,
  tipo_pago       TEXT REFERENCES prp.cat_tipo_pago(clave),
  referencia      TEXT,
  banco_origen    TEXT,
  banco_destino   TEXT,
  conciliado      BOOLEAN DEFAULT FALSE,
  conciliado_at   TIMESTAMPTZ,
  cfdi_pago_uuid  TEXT,
  notas           TEXT,
  registrado_por  UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 6 — MÓDULO RH — RECLUTAMIENTO Y SELECCIÓN
-- ============================================================

CREATE TABLE prp.vacantes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo        TEXT NOT NULL,
  area          TEXT,
  puesto        TEXT NOT NULL,
  num_plazas    INTEGER DEFAULT 1,
  salario_min   DECIMAL(12,2),
  salario_max   DECIMAL(12,2),
  descripcion   TEXT,
  requisitos    TEXT,
  fecha_apertura DATE DEFAULT CURRENT_DATE,
  fecha_cierre  DATE,
  estado_id     TEXT DEFAULT 'ACTIVO' REFERENCES prp.cat_estado_general(clave),
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.candidatos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vacante_id      UUID REFERENCES prp.vacantes(id),
  nombre          TEXT NOT NULL,
  apellido_pat    TEXT,
  apellido_mat    TEXT,
  email           TEXT,
  telefono        TEXT,
  curp            TEXT,
  cv_url          TEXT,
  score_ia        DECIMAL(5,2), -- % compatibilidad calculado por Claude
  notas_ia        TEXT,         -- análisis Claude del CV
  estado          TEXT DEFAULT 'NUEVO' CHECK (estado IN ('NUEVO','EN_REVISION','ENTREVISTA','SELECCIONADO','RECHAZADO','RETENIDO')),
  fecha_entrevista TIMESTAMPTZ,
  entrevistador   TEXT,
  resultado_entrevista TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 7 — MÓDULO RH — EMPLEADOS Y EXPEDIENTE
-- ============================================================

CREATE TABLE prp.empleados (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_empleado TEXT UNIQUE NOT NULL, -- EMP-001
  nombre          TEXT NOT NULL,
  apellido_pat    TEXT NOT NULL,
  apellido_mat    TEXT,
  nombre_completo TEXT GENERATED ALWAYS AS (nombre || ' ' || apellido_pat || ' ' || COALESCE(apellido_mat,'')) STORED,
  sexo            TEXT CHECK (sexo IN ('MASCULINO','FEMENINO','OTRO')),
  fecha_nacimiento DATE,
  edad            INTEGER, -- calculada por trigger o vista: DATE_PART('year', AGE(fecha_nacimiento))
  estado_civil    TEXT REFERENCES prp.cat_estado_civil(clave),
  curp            TEXT UNIQUE,
  rfc             TEXT,
  nss             TEXT UNIQUE, -- # IMSS
  email           TEXT,
  telefono        TEXT,
  celular         TEXT,
  calle           TEXT,
  numero          TEXT,
  colonia         TEXT,
  municipio       TEXT,
  estado          TEXT,
  cp              TEXT,
  domicilio_completo TEXT GENERATED ALWAYS AS (
    COALESCE(calle,'') || ' ' || COALESCE(numero,'') || ', ' || COALESCE(colonia,'') || ', ' || COALESCE(municipio,'') || ', ' || COALESCE(estado,'') || ' CP ' || COALESCE(cp,'')
  ) STORED,
  puesto          TEXT NOT NULL,
  area            TEXT,
  departamento    TEXT,
  fecha_ingreso   DATE NOT NULL,
  fecha_prueba_fin DATE, -- 30 días desde ingreso si aplica
  salario_diario  DECIMAL(10,2),
  salario_mensual DECIMAL(12,2),
  horario         TEXT DEFAULT 'Lunes a Viernes 9:00-18:00 hrs',
  forma_pago_nomina TEXT DEFAULT 'QUINCENAL' CHECK (forma_pago_nomina IN ('SEMANAL','QUINCENAL','MENSUAL')),
  cuenta_clabe    TEXT,
  banco           TEXT,
  dias_vacaciones INTEGER DEFAULT 6, -- LFT art. 76: 6 días primer año
  dias_vacaciones_disponibles INTEGER DEFAULT 6,
  foto_url        TEXT,
  estado_id       TEXT DEFAULT 'ACTIVO' REFERENCES prp.cat_estado_general(clave),
  candidato_id    UUID REFERENCES prp.candidatos(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.documentos_empleado (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id      UUID REFERENCES prp.empleados(id) ON DELETE CASCADE,
  tipo_documento   TEXT REFERENCES prp.cat_tipo_documento(clave),
  nombre_archivo   TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  fecha_emision    DATE,
  fecha_vencimiento DATE,
  verificado       BOOLEAN DEFAULT FALSE,
  verificado_por   UUID,
  verificado_at    TIMESTAMPTZ,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.contratos_laborales (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio            TEXT UNIQUE NOT NULL, -- CL-2026-0001
  empleado_id      UUID REFERENCES prp.empleados(id),
  tipo_contrato    TEXT REFERENCES prp.cat_tipo_contrato_laboral(clave),
  plantilla_id     UUID REFERENCES prp.plantillas_contrato(id),
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE,
  salario_diario   DECIMAL(10,2),
  salario_mensual  DECIMAL(12,2),
  puesto           TEXT,
  area             TEXT,
  horario          TEXT,
  docx_url         TEXT, -- contrato generado en Storage
  firmado_at       TIMESTAMPTZ,
  estado_id        TEXT DEFAULT 'VIGENTE' REFERENCES prp.cat_estado_general(clave),
  contrato_prev_id UUID REFERENCES prp.contratos_laborales(id), -- para encadenar prueba→indefinido
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.beneficiarios_empleado (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id  UUID REFERENCES prp.empleados(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  parentesco   TEXT NOT NULL,
  porcentaje   DECIMAL(5,2) DEFAULT 100.00,
  telefono     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 8 — MÓDULO RH — INCIDENCIAS Y NÓMINA
-- ============================================================

CREATE TABLE prp.incidencias_rh (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id    UUID REFERENCES prp.empleados(id),
  tipo_incidencia TEXT REFERENCES prp.cat_tipo_incidencia(clave),
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE,
  num_dias       INTEGER,
  num_horas      DECIMAL(6,2),
  monto          DECIMAL(10,2),
  aplica_periodo TEXT, -- '2026-07-Q1'
  justificacion  TEXT,
  evidencia_url  TEXT,
  aprobado       BOOLEAN DEFAULT FALSE,
  aprobado_por   UUID,
  aprobado_at    TIMESTAMPTZ,
  estado_id      TEXT DEFAULT 'PENDIENTE' REFERENCES prp.cat_estado_general(clave),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.nomina_quincenal (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo        TEXT NOT NULL, -- '2026-07-Q1' o '2026-07-Q2'
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NOT NULL,
  fecha_pago     DATE NOT NULL,
  total_empleados INTEGER,
  total_percepciones DECIMAL(14,2),
  total_deducciones  DECIMAL(14,2),
  total_neto     DECIMAL(14,2),
  estado_id      TEXT DEFAULT 'BORRADOR' REFERENCES prp.cat_estado_general(clave),
  procesado_por  UUID,
  procesado_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.nomina_detalle (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nomina_id        UUID REFERENCES prp.nomina_quincenal(id) ON DELETE CASCADE,
  empleado_id      UUID REFERENCES prp.empleados(id),
  dias_trabajados  DECIMAL(5,2),
  sueldo_base      DECIMAL(12,2),
  horas_extra_monto DECIMAL(10,2) DEFAULT 0,
  bonos            DECIMAL(10,2) DEFAULT 0,
  vales_despensa   DECIMAL(10,2) DEFAULT 0,
  total_percepciones DECIMAL(12,2),
  isr              DECIMAL(10,2) DEFAULT 0,
  imss_empleado    DECIMAL(10,2) DEFAULT 0,
  infonavit        DECIMAL(10,2) DEFAULT 0,
  prestamos        DECIMAL(10,2) DEFAULT 0,
  descuentos_varios DECIMAL(10,2) DEFAULT 0,
  total_deducciones DECIMAL(12,2),
  neto_pagar       DECIMAL(12,2),
  cfdi_nomina_uuid TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 9 — MÓDULO ESTACIONAMIENTO
-- ============================================================

CREATE TABLE prp.cajones_estacionamiento (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero       TEXT UNIQUE NOT NULL, -- A-001, B-012, etc.
  zona         TEXT REFERENCES prp.cat_zona_estacionamiento(clave),
  nivel        INTEGER DEFAULT 1,
  tipo         TEXT DEFAULT 'AUTOMOVIL',
  estado_id    TEXT DEFAULT 'DISPONIBLE' REFERENCES prp.cat_estado_general(clave),
  pension_id   UUID, -- FK circular, se agrega después
  reservado    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.tarifas_estacionamiento (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_acceso   TEXT REFERENCES prp.cat_tipo_acceso(clave),
  tipo_vehiculo TEXT REFERENCES prp.cat_tipo_vehiculo(clave),
  precio_hora   DECIMAL(8,2) DEFAULT 0,
  precio_fraccion DECIMAL(8,2) DEFAULT 0, -- primeros X minutos
  fraccion_mins INTEGER DEFAULT 15,
  precio_dia    DECIMAL(8,2) DEFAULT 0,
  precio_mensual DECIMAL(8,2) DEFAULT 0,
  tarifa_perdido DECIMAL(8,2) DEFAULT 0,
  vigente_desde DATE DEFAULT CURRENT_DATE,
  vigente_hasta DATE,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.pensiones_estacionamiento (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio           TEXT UNIQUE NOT NULL,
  tipo_titular    TEXT DEFAULT 'EXTERNO' CHECK (tipo_titular IN ('ARRENDATARIO','EMPLEADO','EXTERNO')),
  arrendatario_id UUID REFERENCES prp.arrendatarios(id),
  empleado_id     UUID REFERENCES prp.empleados(id),
  nombre_externo  TEXT,
  placa           TEXT NOT NULL,
  marca           TEXT,
  modelo          TEXT,
  color           TEXT,
  tipo_vehiculo   TEXT REFERENCES prp.cat_tipo_vehiculo(clave),
  cajones         TEXT[], -- array de cajones asignados
  monto_mensual   DECIMAL(8,2),
  dia_cobro       INTEGER DEFAULT 1,
  fecha_inicio    DATE NOT NULL,
  fecha_vencimiento DATE,
  estado_id       TEXT DEFAULT 'ACTIVO' REFERENCES prp.cat_estado_general(clave),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.accesos_estacionamiento (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cajón_id        UUID REFERENCES prp.cajones_estacionamiento(id),
  pension_id      UUID REFERENCES prp.pensiones_estacionamiento(id),
  tipo_acceso     TEXT REFERENCES prp.cat_tipo_acceso(clave),
  placa           TEXT,
  tipo_vehiculo   TEXT REFERENCES prp.cat_tipo_vehiculo(clave),
  entrada_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  salida_at       TIMESTAMPTZ,
  minutos         INTEGER,
  monto_cobrado   DECIMAL(8,2) DEFAULT 0,
  cobrado         BOOLEAN DEFAULT FALSE,
  turno_id        UUID,
  cajero_id       UUID,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.cobros_turno (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cajero_id        UUID,
  turno_inicio     TIMESTAMPTZ NOT NULL,
  turno_fin        TIMESTAMPTZ,
  efectivo_real    DECIMAL(10,2) DEFAULT 0,
  efectivo_esperado DECIMAL(10,2) DEFAULT 0,
  diferencia       DECIMAL(10,2) DEFAULT 0,
  total_boletos    INTEGER DEFAULT 0,
  total_perdidos   INTEGER DEFAULT 0,
  total_pensiones  INTEGER DEFAULT 0,
  total_ingresos   DECIMAL(10,2) DEFAULT 0,
  cerrado          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 10 — MÓDULO PROVEEDORES
-- ============================================================

CREATE TABLE prp.proveedores (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave            TEXT UNIQUE NOT NULL,
  tipo_persona     TEXT REFERENCES prp.cat_tipo_proveedor(clave),
  categoria        TEXT REFERENCES prp.cat_categoria_proveedor(clave),
  razon_social     TEXT NOT NULL,
  rfc              TEXT UNIQUE,
  regimen_fiscal   TEXT REFERENCES prp.cat_regimen_fiscal(clave),
  rep_contacto     TEXT,
  email            TEXT,
  telefono         TEXT,
  calle            TEXT,
  municipio        TEXT,
  estado           TEXT,
  cp               TEXT,
  banco            TEXT,
  cuenta_clabe     TEXT,
  calificacion     DECIMAL(3,2) DEFAULT 5.00,
  num_evaluaciones INTEGER DEFAULT 0,
  activo           BOOLEAN DEFAULT TRUE,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.evaluaciones_proveedor (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proveedor_id   UUID REFERENCES prp.proveedores(id),
  calidad        INTEGER CHECK (calidad BETWEEN 1 AND 5),
  precio         INTEGER CHECK (precio BETWEEN 1 AND 5),
  tiempo         INTEGER CHECK (tiempo BETWEEN 1 AND 5),
  servicio       INTEGER CHECK (servicio BETWEEN 1 AND 5),
  promedio       DECIMAL(3,2),
  comentario     TEXT,
  evaluado_por   UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.cuentas_pagar (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proveedor_id    UUID REFERENCES prp.proveedores(id),
  folio_factura   TEXT,
  cfdi_uuid       TEXT,
  fecha_factura   DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  concepto        TEXT,
  subtotal        DECIMAL(12,2),
  iva             DECIMAL(12,2),
  total           DECIMAL(12,2),
  saldo           DECIMAL(12,2),
  estado_id       TEXT DEFAULT 'PENDIENTE' REFERENCES prp.cat_estado_general(clave),
  pagado_at       TIMESTAMPTZ,
  tipo_pago       TEXT REFERENCES prp.cat_tipo_pago(clave),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 11 — MÓDULO MANTENIMIENTO
-- ============================================================

CREATE TABLE prp.ordenes_trabajo (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio           TEXT UNIQUE NOT NULL, -- OT-2026-0001
  tipo            TEXT NOT NULL CHECK (tipo IN ('CORRECTIVO','PREVENTIVO','PROYECTO','MEJORA')),
  prioridad       TEXT DEFAULT 'MEDIA' CHECK (prioridad IN ('CRITICA','ALTA','MEDIA','BAJA')),
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  inmueble_id     UUID REFERENCES prp.inmuebles(id),
  unidad_id       UUID REFERENCES prp.unidades(id),
  area_comun      TEXT,
  proveedor_id    UUID REFERENCES prp.proveedores(id),
  empleado_asignado UUID REFERENCES prp.empleados(id),
  fecha_reporte   DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_compromiso DATE,
  fecha_inicio    DATE,
  fecha_cierre    DATE,
  costo_estimado  DECIMAL(12,2),
  costo_real      DECIMAL(12,2),
  fotos_url       TEXT[],
  evidencia_cierre_url TEXT[],
  estado_id       TEXT DEFAULT 'PENDIENTE' REFERENCES prp.cat_estado_general(clave),
  reportado_por   UUID,
  cerrado_por     UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 12 — MÓDULO EGRESOS / FONDO REVOLVENTE
-- ============================================================

CREATE TABLE prp.fondos_revolventes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  responsable_id  UUID REFERENCES prp.empleados(id),
  monto_autorizado DECIMAL(12,2) NOT NULL,
  saldo_actual    DECIMAL(12,2) NOT NULL,
  saldo_minimo    DECIMAL(12,2), -- % del monto autorizado para disparar alerta
  fecha_apertura  DATE DEFAULT CURRENT_DATE,
  estado_id       TEXT DEFAULT 'ACTIVO' REFERENCES prp.cat_estado_general(clave),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.egresos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fondo_id        UUID REFERENCES prp.fondos_revolventes(id),
  proveedor_id    UUID REFERENCES prp.proveedores(id),
  concepto        TEXT REFERENCES prp.cat_concepto_egreso(clave),
  descripcion     TEXT,
  area_gasto      TEXT,
  fecha_egreso    DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal        DECIMAL(12,2) NOT NULL,
  iva             DECIMAL(12,2) DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL,
  deducible       TEXT DEFAULT 'DEDUCIBLE_100',
  cfdi_uuid       TEXT,
  folio_ticket    TEXT,
  comprobante_url TEXT,
  validado        BOOLEAN DEFAULT FALSE,
  validado_por    UUID,
  validado_at     TIMESTAMPTZ,
  notas           TEXT,
  registrado_por  UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 13 — MÓDULO PROSPECTOS / CRM
-- ============================================================

CREATE TABLE prp.prospectos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  empresa         TEXT,
  giro            TEXT REFERENCES prp.cat_giro_comercial(clave),
  email           TEXT,
  telefono        TEXT,
  celular         TEXT,
  m2_requeridos   DECIMAL(10,2),
  presupuesto_max DECIMAL(12,2),
  unidad_interes_id UUID REFERENCES prp.unidades(id),
  origen          TEXT CHECK (origen IN ('REFERIDO','REDES_SOCIALES','VISITA_PLAZA','LLAMADA','WEB','OTRO')),
  etapa           TEXT DEFAULT 'NUEVO' CHECK (etapa IN ('NUEVO','CONTACTADO','VISITA_AGENDADA','PROPUESTA','NEGOCIACION','GANADO','PERDIDO')),
  probabilidad    INTEGER DEFAULT 20, -- % cierre
  temperatura     TEXT DEFAULT 'FRIO' CHECK (temperatura IN ('FRIO','TIBIO','CALIENTE')),
  notas           TEXT,
  perdido_motivo  TEXT,
  convertido_at   TIMESTAMPTZ,
  arrendatario_id UUID REFERENCES prp.arrendatarios(id),
  asignado_a      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.seguimiento_prospecto (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospecto_id   UUID REFERENCES prp.prospectos(id) ON DELETE CASCADE,
  tipo           TEXT CHECK (tipo IN ('LLAMADA','EMAIL','VISITA','WHATSAPP','REUNION','PROPUESTA','OTRO')),
  fecha          TIMESTAMPTZ DEFAULT NOW(),
  resultado      TEXT,
  proxima_accion TEXT,
  proxima_fecha  DATE,
  creado_por     UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 14 — MÓDULO NOTIFICACIONES
-- ============================================================

CREATE TABLE prp.plantillas_notificacion (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo           TEXT REFERENCES prp.cat_tipo_notificacion(clave),
  canal          TEXT REFERENCES prp.cat_canal_notificacion(clave),
  asunto         TEXT,
  cuerpo         TEXT NOT NULL, -- con {{variables}}
  activo         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.cola_notificaciones (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo             TEXT REFERENCES prp.cat_tipo_notificacion(clave),
  canal            TEXT REFERENCES prp.cat_canal_notificacion(clave),
  destinatario     TEXT NOT NULL, -- email o teléfono
  destinatario_tipo TEXT CHECK (destinatario_tipo IN ('ARRENDATARIO','EMPLEADO','PROSPECTO','INTERNO')),
  asunto           TEXT,
  cuerpo           TEXT,
  modulo_origen    TEXT,
  registro_id      UUID, -- ID del cargo, contrato, etc.
  programado_at    TIMESTAMPTZ DEFAULT NOW(),
  intentos         INTEGER DEFAULT 0,
  max_intentos     INTEGER DEFAULT 3,
  estado           TEXT DEFAULT 'PENDIENTE' REFERENCES prp.cat_estado_general(clave),
  error_mensaje    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 15 — BITÁCORAS
-- ============================================================

CREATE TABLE prp.bitacora_contrato (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id  UUID,
  tipo_contrato TEXT CHECK (tipo_contrato IN ('ARRENDAMIENTO','LABORAL')),
  accion       TEXT NOT NULL, -- CREADO, FIRMADO, RENOVADO, RESCINDIDO, etc.
  estado_ant   TEXT,
  estado_nuevo TEXT,
  descripcion  TEXT,
  usuario_id   UUID,
  ip           TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.bitacora_cobranza (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_id    UUID REFERENCES prp.cargos_renta(id),
  accion      TEXT NOT NULL,
  monto       DECIMAL(12,2),
  descripcion TEXT,
  usuario_id  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.bitacora_rh (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID REFERENCES prp.empleados(id),
  accion      TEXT NOT NULL, -- CONTRATADO, INCIDENCIA, NOMINA_PAGADA, BAJA, etc.
  descripcion TEXT,
  datos_json  JSONB,
  usuario_id  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.bitacora_acceso_estacionamiento (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  acceso_id   UUID REFERENCES prp.accesos_estacionamiento(id),
  evento      TEXT NOT NULL, -- ENTRADA, SALIDA, COBRO, PERDIDO
  datos_json  JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.bitacora_notificaciones (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cola_id          UUID REFERENCES prp.cola_notificaciones(id),
  tipo             TEXT,
  canal            TEXT,
  destinatario     TEXT,
  estado           TEXT,
  proveedor_respuesta TEXT, -- Resend ID, Twilio SID
  enviado_at       TIMESTAMPTZ,
  entregado_at     TIMESTAMPTZ,
  error            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.bitacora_egreso (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  egreso_id   UUID REFERENCES prp.egresos(id),
  accion      TEXT NOT NULL,
  descripcion TEXT,
  usuario_id  UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 16 — DATA WAREHOUSE (Dimensiones)
-- ============================================================

CREATE TABLE IF NOT EXISTS dw.dim_tiempo_dia (
  fecha        DATE PRIMARY KEY,
  anio         INTEGER,
  mes          INTEGER,
  dia          INTEGER,
  dia_semana   INTEGER,
  nombre_dia   TEXT,
  nombre_mes   TEXT,
  semana       INTEGER,
  trimestre    INTEGER,
  es_fin_semana BOOLEAN,
  es_festivo   BOOLEAN DEFAULT FALSE
);

-- Función para poblar dim_tiempo_dia
CREATE OR REPLACE FUNCTION dw.generar_dim_tiempo(p_inicio DATE, p_fin DATE)
RETURNS VOID AS $$
DECLARE v_fecha DATE := p_inicio;
BEGIN
  WHILE v_fecha <= p_fin LOOP
    INSERT INTO dw.dim_tiempo_dia VALUES (
      v_fecha,
      EXTRACT(YEAR FROM v_fecha),
      EXTRACT(MONTH FROM v_fecha),
      EXTRACT(DAY FROM v_fecha),
      EXTRACT(DOW FROM v_fecha),
      TO_CHAR(v_fecha, 'TMDay'),
      TO_CHAR(v_fecha, 'TMMonth'),
      EXTRACT(WEEK FROM v_fecha),
      EXTRACT(QUARTER FROM v_fecha),
      EXTRACT(DOW FROM v_fecha) IN (0,6),
      FALSE
    ) ON CONFLICT DO NOTHING;
    v_fecha := v_fecha + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT dw.generar_dim_tiempo('2024-01-01', '2027-12-31');

-- ============================================================
-- SECCIÓN 17 — RLS (Row Level Security)
-- ============================================================

ALTER TABLE prp.empresa               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.inmuebles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.unidades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.arrendatarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contratos_arrendamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cargos_renta          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.pagos_renta           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.empleados             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contratos_laborales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.incidencias_rh        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.nomina_quincenal      ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.cajones_estacionamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.proveedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.ordenes_trabajo       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.egresos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.prospectos            ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden ver todo en su organización
-- (Para demo, permitir acceso a todos los autenticados)
CREATE POLICY "authenticated_select_all" ON prp.inmuebles
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.unidades
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.arrendatarios
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.contratos_arrendamiento
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.cargos_renta
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.pagos_renta
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.empleados
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.contratos_laborales
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.cajones_estacionamiento
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.proveedores
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.ordenes_trabajo
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "authenticated_select_all" ON prp.prospectos
  FOR SELECT TO authenticated USING (TRUE);

-- Política escritura: solo autenticados
CREATE POLICY "authenticated_write" ON prp.inmuebles
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.unidades
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.arrendatarios
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.contratos_arrendamiento
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.empleados
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.proveedores
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.egresos
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "authenticated_write" ON prp.prospectos
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- SECCIÓN 18 — DATOS SINTÉTICOS (Demo / Seed)
-- ============================================================

-- 18.1 Empresa
INSERT INTO prp.empresa (
  razon_social, rfc, regimen_fiscal, representante,
  calle, numero, colonia, municipio, estado, cp,
  telefono, email
) VALUES (
  'Inmobiliaria Alcedines del Norte SA de CV',
  'IAN900115XYZ',
  '601',
  'Zurisade Lopez Garcia',
  'Av. Gobernadores', '1622',
  'Centro', 'Metepec', 'Estado de México', '52140',
  '7221234567', 'admin@alcedines.com.mx'
);

-- 18.2 Inmuebles
INSERT INTO prp.inmuebles (clave, nombre, tipo_inmueble, calle, numero, colonia, municipio, estado, cp, m2_totales, m2_rentables, num_niveles, num_unidades) VALUES
('PLZ-MET-01', 'Plaza Alcedines Metepec',    'PLAZA_COMERCIAL', 'Av. Gobernadores', '1622', 'Centro', 'Metepec', 'Estado de México', '52140', 4800.00, 3200.00, 2, 24),
('PLZ-TOL-01', 'Centro Comercial Toluca Sur', 'PLAZA_COMERCIAL', 'Blvd. Aeropuerto', '400',  'Lerma',  'Lerma',  'Estado de México', '52006', 6200.00, 4100.00, 3, 32);

-- 18.3 Unidades PLZ-MET-01
DO $$
DECLARE
  imueble_id UUID;
  tipos TEXT[] := ARRAY['LOCAL','LOCAL','LOCAL','LOCAL','OFICINA','BODEGA','LOCAL','LOCAL'];
  estados TEXT[] := ARRAY['OCUPADO','OCUPADO','OCUPADO','DISPONIBLE','DISPONIBLE','OCUPADO','OCUPADO','MANTENIMIENTO'];
  rentas DECIMAL[] := ARRAY[8500,12000,6000,9500,7000,4500,11000,8000];
  m2s DECIMAL[] := ARRAY[45,72,38,56,42,30,65,50];
  i INTEGER;
BEGIN
  SELECT id INTO imueble_id FROM prp.inmuebles WHERE clave = 'PLZ-MET-01';
  FOR i IN 1..8 LOOP
    INSERT INTO prp.unidades (inmueble_id, clave, numero_local, piso, tipo_unidad, m2_totales, m2_vendibles, estado_id, renta_base)
    VALUES (imueble_id, 'PLZ-MET-L' || LPAD(i::TEXT,3,'0'), 'L-' || LPAD(i::TEXT,3,'0'), 'PB', tipos[i], m2s[i], m2s[i]*0.9, estados[i], rentas[i]);
  END LOOP;
END $$;

-- 18.4 Arrendatarios
INSERT INTO prp.arrendatarios (tipo_persona, razon_social, rfc, regimen_fiscal, giro_comercial, rep_legal, email_principal, telefono, municipio, estado, calificacion) VALUES
('MORAL',  'Sushi Nakamura SA de CV',          'SNA210310AB1', '601', 'ALIMENTOS',  'Carlos Nakamura Ortega',  'carlos@sushinakamura.mx',  '7221112233', 'Metepec', 'Estado de México', 4.8),
('MORAL',  'Fashion Point SA de CV',             'FPO180520XY3', '601', 'ROPA',       'Diana López Fuentes',     'diana@fashionpoint.mx',    '7222223344', 'Toluca',  'Estado de México', 4.5),
('FISICA', 'María Elena Ramírez Torres',         'RATM780901YZ5', '612', 'FARMACIA',   NULL,                      'mertz78@gmail.com',        '7223334455', 'Metepec', 'Estado de México', 5.0),
('MORAL',  'TechZone México SA de CV',           'TZM200714AB2', '601', 'ELECTRONICA','Roberto Sánchez Vega',    'roberto@techzonemexico.mx', '7224445566', 'Lerma',   'Estado de México', 4.2),
('MORAL',  'Grupo BeautyPro SA de CV',           'GBP190830CD4', '601', 'BELLEZA',    'Sofía Herrera Ramos',     'sofia@beautypro.mx',       '7225556677', 'Metepec', 'Estado de México', 4.9),
('FISICA', 'Jorge Alberto Morales Castillo',     'MOCJ850612FG7', '626', 'ALIMENTOS',  NULL,                      'jorge.morales@gmail.com',  '7226667788', 'Toluca',  'Estado de México', 3.8);

-- 18.5 Contratos de arrendamiento
DO $$
DECLARE
  arr_ids UUID[];
  unidad_ids UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM prp.arrendatarios ORDER BY created_at LIMIT 5) INTO arr_ids;
  SELECT ARRAY(SELECT id FROM prp.unidades WHERE estado_id='OCUPADO' LIMIT 5) INTO unidad_ids;

  INSERT INTO prp.contratos_arrendamiento (folio, unidad_id, arrendatario_id, tipo_contrato, fecha_inicio, fecha_fin, renta_mensual, cuota_mant, deposito_garantia, incremento_anual, estado_id) VALUES
  ('CA-2026-0001', unidad_ids[1], arr_ids[1], 'ANUAL',   '2025-02-01', '2026-01-31', 8500,  950,  17000, 5.0, 'VIGENTE'),
  ('CA-2026-0002', unidad_ids[2], arr_ids[2], 'ANUAL',   '2025-04-01', '2026-03-31', 12000, 1200, 24000, 4.5, 'VIGENTE'),
  ('CA-2026-0003', unidad_ids[3], arr_ids[3], 'ANUAL',   '2024-07-01', '2026-06-30', 6000,  800,  12000, 5.0, 'VIGENTE'),
  ('CA-2026-0004', unidad_ids[4], arr_ids[4], 'ANUAL',   '2026-01-01', '2026-12-31', 11000, 1100, 22000, 5.0, 'VIGENTE'),
  ('CA-2026-0005', unidad_ids[5], arr_ids[5], 'SEMESTRAL','2026-03-01', '2026-08-31', 9500,  1000, 19000, 0.0, 'VIGENTE');
END $$;

-- 18.6 Cargos de renta (últimos 3 meses)
DO $$
DECLARE
  c RECORD;
  m TEXT;
  mes_offset INTEGER;
BEGIN
  FOR c IN SELECT id, renta_mensual, cuota_mant FROM prp.contratos_arrendamiento LOOP
    FOR mes_offset IN 0..2 LOOP
      m := TO_CHAR(CURRENT_DATE - INTERVAL '1 month' * mes_offset, 'YYYY-MM');
      INSERT INTO prp.cargos_renta (
        contrato_id, periodo, fecha_cargo, fecha_vencimiento,
        renta, cuota_mant, subtotal, iva, total, saldo_pendiente, estado_id
      ) VALUES (
        c.id, m,
        (DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * mes_offset))::DATE,
        (DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * mes_offset) + INTERVAL '5 days')::DATE,
        c.renta_mensual, c.cuota_mant,
        c.renta_mensual + c.cuota_mant,
        (c.renta_mensual + c.cuota_mant) * 0.16,
        (c.renta_mensual + c.cuota_mant) * 1.16,
        CASE WHEN mes_offset > 0 THEN 0 ELSE (c.renta_mensual + c.cuota_mant) * 1.16 END,
        CASE WHEN mes_offset > 0 THEN 'COMPLETADO' ELSE 'PENDIENTE' END
      );
    END LOOP;
  END LOOP;
END $$;

-- 18.7 Empleados (6 empleados basados en contratos reales)
INSERT INTO prp.empleados (
  numero_empleado, nombre, apellido_pat, apellido_mat, sexo, fecha_nacimiento,
  estado_civil, curp, rfc, nss, email, telefono, celular,
  calle, numero, colonia, municipio, estado, cp,
  puesto, area, salario_diario, salario_mensual, forma_pago_nomina,
  horario, fecha_ingreso, fecha_prueba_fin, estado_id
) VALUES
-- Basado en contrato real
('EMP-001', 'Itzel Guadalupe', 'Cruzalta',  'Marroquin', 'FEMENINO',  '1993-12-03',
  'CASADO', 'CUMI931203MMCRRT05', 'CUMI931203SX2', '03199355300',
  'itzelcruzalta93@gmail.com', '7220000001', '7220000001',
  'Privada Luis Donaldo Colosio', 'S/N', 'Fracc. Colosio', 'Toluca', 'Estado de México', '50000',
  'Chef', 'Cocina', 400.00, 12000.00, 'MENSUAL',
  'Lunes a Sábado 7:00-13:00 y 14:00-16:00 hrs', '2026-02-16', '2026-03-18', 'ACTIVO'),
-- Basado en contrato real
('EMP-002', 'Luis Antonio', 'León',     'Dávila',    'MASCULINO', '1996-01-22',
  'SOLTERO', 'LEDL960122HMCNVS06', 'LEDL960122QR5', '56169695279',
  'luisleon.d@icloud.com', '7220000002', '7220000002',
  'Avenida Independencia', '304', 'Centro', 'Toluca', 'Estado de México', '50000',
  'Cocinero – área de parrilla', 'Cocina', 333.33, 10000.00, 'SEMANAL',
  'Lunes a Sábado 8:00-16:00 hrs', '2026-03-01', NULL, 'ACTIVO'),
-- Empleados adicionales
('EMP-003', 'Ana Beatriz', 'García',  'Soto',      'FEMENINO',  '1990-05-14',
  'SOLTERO', 'GASA900514MDFRTB08', 'GASA900514AB1', '12345678901',
  'ana.garcia@alcedines.mx', '7220000003', '7220000003',
  'Calle Reforma', '120', 'Centro', 'Metepec', 'Estado de México', '52140',
  'Cajera – Estacionamiento', 'Operaciones', 266.67, 8000.00, 'QUINCENAL',
  'Lunes a Viernes 9:00-18:00 hrs', '2025-06-01', NULL, 'ACTIVO'),
('EMP-004', 'Miguel Ángel', 'Torres', 'Ríos',      'MASCULINO', '1988-11-30',
  'CASADO', 'TORM881130HMCRGS01', 'TORM881130PQ3', '98765432101',
  'miguel.torres@alcedines.mx', '7220000004', '7220000004',
  'Av. Solidaridad', '88', 'La Pila', 'Metepec', 'Estado de México', '52176',
  'Jefe de Mantenimiento', 'Operaciones', 433.33, 13000.00, 'QUINCENAL',
  'Lunes a Sábado 7:00-15:00 hrs', '2023-03-15', NULL, 'ACTIVO'),
('EMP-005', 'Laura Patricia', 'Vega', 'Morales',   'FEMENINO',  '1995-08-22',
  'SOLTERO', 'VEML950822MDFRGR05', 'VEML950822XY7', '11122334455',
  'laura.vega@alcedines.mx', '7220000005', '7220000005',
  'Blvd. Las Torres', '55', 'Paseo Tollocan', 'Toluca', 'Estado de México', '50120',
  'Ejecutiva de Cobranza', 'Administración', 366.67, 11000.00, 'QUINCENAL',
  'Lunes a Viernes 9:00-18:00 hrs', '2024-01-08', NULL, 'ACTIVO'),
('EMP-006', 'Roberto Carlos', 'Fuentes', 'Lara',   'MASCULINO', '1985-03-10',
  'CASADO', 'FULR850310HDFNRB04', 'FULR850310MN2', '22233445566',
  'roberto.fuentes@alcedines.mx', '7220000006', '7220000006',
  'Calle Morelos', '450', 'Centro', 'Metepec', 'Estado de México', '52140',
  'Gerente de Administración', 'Dirección', 666.67, 20000.00, 'QUINCENAL',
  'Lunes a Viernes 8:00-17:00 hrs', '2022-09-01', NULL, 'ACTIVO');

-- 18.8 Contratos laborales
DO $$
DECLARE
  emp1 UUID; emp2 UUID;
BEGIN
  SELECT id INTO emp1 FROM prp.empleados WHERE numero_empleado = 'EMP-001';
  SELECT id INTO emp2 FROM prp.empleados WHERE numero_empleado = 'EMP-002';

  INSERT INTO prp.contratos_laborales (folio, empleado_id, tipo_contrato, fecha_inicio, fecha_fin, salario_diario, salario_mensual, puesto, horario, estado_id) VALUES
  ('CL-2026-0001', emp1, 'PRUEBA',              '2026-02-16', '2026-03-18', 400.00, 12000.00, 'Chef',                    'Lunes a Sábado 7:00-13:00 y 14:00-16:00 hrs', 'VENCIDO'),
  ('CL-2026-0002', emp1, 'TIEMPO_INDETERMINADO', '2026-03-19', NULL,        400.00, 12000.00, 'Chef',                    'Lunes a Sábado 7:00-13:00 y 14:00-16:00 hrs', 'VIGENTE'),
  ('CL-2026-0003', emp2, 'TIEMPO_INDETERMINADO', '2026-03-01', NULL,        333.33, 10000.00, 'Cocinero – área parrilla','Lunes a Sábado 8:00-16:00 hrs',              'VIGENTE');
END $$;

-- 18.9 Cajones de estacionamiento (40 cajones)
DO $$
DECLARE
  zonas TEXT[] := ARRAY['ZONA_A','ZONA_A','ZONA_A','ZONA_A','ZONA_A','ZONA_A','ZONA_A','ZONA_A','ZONA_A','ZONA_A',
                         'ZONA_B','ZONA_B','ZONA_B','ZONA_B','ZONA_B','ZONA_B','ZONA_B','ZONA_B','ZONA_B','ZONA_B',
                         'ZONA_C','ZONA_C','ZONA_C','ZONA_C','ZONA_C','ZONA_C','ZONA_C','ZONA_C','ZONA_C','ZONA_C',
                         'ZONA_D','ZONA_D','ZONA_D','ZONA_D','ZONA_D','ZONA_D','ZONA_D','ZONA_D','DISCAPACITADOS','DIRECTIVOS'];
  estados TEXT[] := ARRAY['OCUPADO','DISPONIBLE','OCUPADO','DISPONIBLE','OCUPADO','DISPONIBLE','OCUPADO','DISPONIBLE','OCUPADO','DISPONIBLE',
                            'OCUPADO','OCUPADO','DISPONIBLE','DISPONIBLE','OCUPADO','DISPONIBLE','OCUPADO','DISPONIBLE','OCUPADO','DISPONIBLE',
                            'DISPONIBLE','DISPONIBLE','DISPONIBLE','OCUPADO','DISPONIBLE','DISPONIBLE','OCUPADO','DISPONIBLE','DISPONIBLE','DISPONIBLE',
                            'DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE','DISPONIBLE'];
  i INTEGER;
  prefijo TEXT;
BEGIN
  FOR i IN 1..40 LOOP
    IF zonas[i] = 'ZONA_A' THEN prefijo := 'A';
    ELSIF zonas[i] = 'ZONA_B' THEN prefijo := 'B';
    ELSIF zonas[i] = 'ZONA_C' THEN prefijo := 'C';
    ELSIF zonas[i] = 'ZONA_D' THEN prefijo := 'D';
    ELSIF zonas[i] = 'DISCAPACITADOS' THEN prefijo := 'DIS';
    ELSE prefijo := 'DIR'; END IF;

    INSERT INTO prp.cajones_estacionamiento (numero, zona, estado_id)
    VALUES (prefijo || '-' || LPAD(i::TEXT,3,'0'), zonas[i], estados[i]);
  END LOOP;
END $$;

-- 18.10 Tarifas estacionamiento
INSERT INTO prp.tarifas_estacionamiento (tipo_acceso, tipo_vehiculo, precio_hora, precio_fraccion, precio_mensual, tarifa_perdido) VALUES
('BOLETO_NORMAL',     'AUTOMOVIL',   20.00, 10.00, 0,      0),
('BOLETO_NORMAL',     'CAMIONETA',   25.00, 12.00, 0,      0),
('BOLETO_NORMAL',     'MOTOCICLETA', 10.00,  5.00, 0,      0),
('TARIFA_PREFERENCIAL','AUTOMOVIL',  15.00,  7.00, 0,      0),
('PENSION_MENSUAL',   'AUTOMOVIL',    0,     0,    900.00, 0),
('PENSION_MENSUAL',   'CAMIONETA',    0,     0,   1200.00, 0),
('BOLETO_PERDIDO',    'AUTOMOVIL',    0,     0,    0,     250.00),
('BOLETO_PERDIDO',    'CAMIONETA',    0,     0,    0,     300.00);

-- 18.11 Proveedores
INSERT INTO prp.proveedores (clave, tipo_persona, categoria, razon_social, rfc, rep_contacto, email, telefono, municipio, estado, calificacion) VALUES
('PROV-001', 'PERSONA_MORAL',  'LIMPIEZA',    'Clean Masters SA de CV',          'CMA200101XX1', 'Arturo Medina',    'arturo@cleanmasters.mx',   '7221001001', 'Toluca',    'Estado de México', 4.8),
('PROV-002', 'PERSONA_MORAL',  'SEGURIDAD',   'Grupo Seguridad Élite SA de CV',  'GSE180515YY2', 'Patricia Álvarez', 'palvarez@gseguridad.mx',   '7221002002', 'Metepec',   'Estado de México', 4.5),
('PROV-003', 'PERSONA_FISICA', 'ELECTRICIDAD','Carlos Mendoza Electricista',     'MECC750320ZZ3', 'Carlos Mendoza',  'carlos.mendoza@gmail.com', '7221003003', 'Metepec',   'Estado de México', 4.9),
('PROV-004', 'PERSONA_MORAL',  'CONSTRUCCION','Constructora Alcázar SA de CV',   'CAL190810AA4', 'Ing. José Alcázar','jose@constructoraalcazar.mx','7221004004','Lerma',     'Estado de México', 4.3),
('PROV-005', 'PERSONA_FISICA', 'JARDINERIA',  'Pedro Ramírez Jardinería',        'RAPP820710BB5', 'Pedro Ramírez',   'pedro.ram@hotmail.com',    '7221005005', 'Zinacantepec','Estado de México',4.7);

-- 18.12 Órdenes de trabajo
DO $$
DECLARE
  imueble UUID; unidad UUID; prov UUID; emp UUID;
BEGIN
  SELECT id INTO imueble FROM prp.inmuebles WHERE clave = 'PLZ-MET-01';
  SELECT id INTO unidad FROM prp.unidades WHERE clave = 'PLZ-MET-L001';
  SELECT id INTO prov FROM prp.proveedores WHERE clave = 'PROV-003';
  SELECT id INTO emp FROM prp.empleados WHERE numero_empleado = 'EMP-004';

  INSERT INTO prp.ordenes_trabajo (folio, tipo, prioridad, titulo, descripcion, inmueble_id, unidad_id, proveedor_id, empleado_asignado, fecha_reporte, fecha_compromiso, costo_estimado, estado_id) VALUES
  ('OT-2026-0001','CORRECTIVO','ALTA',  'Falla eléctrica L-001',       'Corto circuito en tablero', imueble, unidad, prov, emp, '2026-07-01','2026-07-03', 3500, 'COMPLETADO'),
  ('OT-2026-0002','PREVENTIVO','MEDIA', 'Mantenimiento AC áreas comunes','Revisión semestral AC',   imueble, NULL,   prov, emp, '2026-07-05','2026-07-12', 8000, 'EN_PROCESO'),
  ('OT-2026-0003','CORRECTIVO','CRITICA','Filtración de agua – techo',   'Mancha humedad nivel 2',  imueble, NULL,   prov, emp, '2026-07-07','2026-07-09', 15000,'PENDIENTE'),
  ('OT-2026-0004','PREVENTIVO','BAJA',  'Pintura fachada norte',         'Repintado anual',         imueble, NULL,   NULL, emp, '2026-06-01','2026-07-30', 22000,'BORRADOR');
END $$;

-- 18.13 Prospectos
DO $$
DECLARE
  unidad UUID;
BEGIN
  SELECT id INTO unidad FROM prp.unidades WHERE estado_id = 'DISPONIBLE' LIMIT 1;

  INSERT INTO prp.prospectos (nombre, empresa, giro, email, telefono, m2_requeridos, presupuesto_max, unidad_interes_id, origen, etapa, probabilidad, temperatura) VALUES
  ('Alejandro Ruiz Castro',  'Café Artesanal Ruiz',    'ALIMENTOS', 'alex.ruiz@caferuiz.mx',  '7227001001', 55, 12000, unidad, 'VISITA_PLAZA',   'PROPUESTA',    70, 'CALIENTE'),
  ('Sandra Torres Mejía',    'Moda Express MX',         'ROPA',      'storres@modaexpress.mx', '7227002002', 80, 15000, NULL,   'REDES_SOCIALES', 'CONTACTADO',   30, 'TIBIO'),
  ('Ing. Omar Delgado',      'TechRepair Centro',       'ELECTRONICA','omar@techrepair.mx',    '7227003003', 45,  9000, NULL,   'REFERIDO',       'VISITA_AGENDADA',50,'CALIENTE'),
  ('Dra. Fernanda López',    'Centro de Bienestar FLM', 'SALUD',     'fer.lopez@bienestar.mx', '7227004004', 60, 11000, NULL,   'WEB',            'NUEVO',        20, 'FRIO'),
  ('Carlos Peña González',   'Papelería El Estudiante', 'PAPELERIA', 'cpeña@elestudiante.mx',  '7227005005', 35,  7500, NULL,   'LLAMADA',        'NEGOCIACION',  85, 'CALIENTE');
END $$;

-- 18.14 Fondo revolvente
DO $$
DECLARE
  emp UUID;
BEGIN
  SELECT id INTO emp FROM prp.empleados WHERE numero_empleado = 'EMP-006';
  INSERT INTO prp.fondos_revolventes (nombre, responsable_id, monto_autorizado, saldo_actual, saldo_minimo) VALUES
  ('Fondo Revolvente Administración', emp, 10000.00, 6340.00, 2000.00),
  ('Fondo Revolvente Mantenimiento',  emp, 5000.00,  2180.00,  1000.00);
END $$;

-- 18.15 Egresos del mes
DO $$
DECLARE
  fondo1 UUID; fondo2 UUID; prov1 UUID; prov2 UUID;
BEGIN
  SELECT id INTO fondo1 FROM prp.fondos_revolventes WHERE nombre LIKE 'Fondo Revolvente Admin%';
  SELECT id INTO fondo2 FROM prp.fondos_revolventes WHERE nombre LIKE 'Fondo Revolvente Mant%';
  SELECT id INTO prov1 FROM prp.proveedores WHERE clave = 'PROV-001';
  SELECT id INTO prov2 FROM prp.proveedores WHERE clave = 'PROV-003';

  INSERT INTO prp.egresos (fondo_id, proveedor_id, concepto, descripcion, fecha_egreso, subtotal, iva, total, validado) VALUES
  (fondo1, prov1, 'LIMPIEZA',          'Servicio de limpieza semana 1',       '2026-07-05', 1500.00, 240.00, 1740.00, TRUE),
  (fondo1, prov1, 'INSUMOS_LIMPIEZA',  'Insumos: cloro, jabón, jergas',       '2026-07-03', 380.00,  60.80,  440.80,  TRUE),
  (fondo2, prov2, 'REPARACION_MENOR',  'Cambio de foco LED pasillo norte',    '2026-07-04', 220.00,  35.20,  255.20,  TRUE),
  (fondo2, prov2, 'MATERIALES',        'Cable calibre 12 y conectores',       '2026-07-06', 540.00,  86.40,  626.40,  FALSE),
  (fondo1, NULL,  'IMPREVISTOS',       'Pago estacionómetro zona carga',      '2026-07-07', 150.00,  0.00,   150.00,  TRUE),
  (fondo2, prov2, 'REPARACION_MENOR',  'Reparación cisterna bomba 2',         '2026-07-08', 1800.00, 288.00, 2088.00, FALSE);
END $$;

-- ============================================================
-- SECCIÓN 19 — EXPEDIENTE DIGITAL / PORTAL SELF-SERVICE
-- ============================================================

-- Token único enviado al prospecto/candidato para subir docs
CREATE TABLE prp.expedientes_digitales (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token            UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  tipo             TEXT NOT NULL CHECK (tipo IN ('ARRENDATARIO','EMPLEADO')),
  referencia_id    UUID, -- arrendatario_id o candidato_id
  nombre           TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefono         TEXT,
  inmueble_id      UUID REFERENCES prp.inmuebles(id),
  unidad_interes_id UUID REFERENCES prp.unidades(id),
  estado           TEXT DEFAULT 'ENVIADO' CHECK (estado IN ('BORRADOR','ENVIADO','PARCIAL','COMPLETO','APROBADO','RECHAZADO')),
  num_docs_requeridos INTEGER DEFAULT 0,
  num_docs_subidos    INTEGER DEFAULT 0,
  enviado_at       TIMESTAMPTZ,
  expira_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  completado_at    TIMESTAMPTZ,
  aprobado_at      TIMESTAMPTZ,
  aprobado_por     UUID,
  notas_rechazo    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seguimiento de cada documento dentro del expediente
CREATE TABLE prp.solicitudes_documentacion (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expediente_id    UUID REFERENCES prp.expedientes_digitales(id) ON DELETE CASCADE,
  tipo_documento   TEXT REFERENCES prp.cat_tipo_documento(clave),
  obligatorio      BOOLEAN DEFAULT TRUE,
  subido           BOOLEAN DEFAULT FALSE,
  storage_path     TEXT,
  nombre_archivo   TEXT,
  fecha_subida     TIMESTAMPTZ,
  verificado       BOOLEAN DEFAULT FALSE,
  verificado_por   UUID,
  verificado_at    TIMESTAMPTZ,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Avales y obligados solidarios
CREATE TABLE prp.avales (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrendatario_id  UUID REFERENCES prp.arrendatarios(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  apellido_pat     TEXT,
  apellido_mat     TEXT,
  tipo_persona     TEXT DEFAULT 'FISICA' CHECK (tipo_persona IN ('FISICA','MORAL')),
  relacion         TEXT, -- familiar, socio, empresa, etc.
  email            TEXT,
  telefono         TEXT,
  rfc              TEXT,
  domicilio        TEXT,
  expediente_id    UUID REFERENCES prp.expedientes_digitales(id),
  estado           TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','COMPLETO','APROBADO','RECHAZADO')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 20 — PERFIL AMPLIADO ARRENDATARIO
-- (Campos adicionales vía ALTER TABLE)
-- ============================================================

ALTER TABLE prp.arrendatarios
  ADD COLUMN IF NOT EXISTS nombre_comercial    TEXT,
  ADD COLUMN IF NOT EXISTS logo_url            TEXT,
  ADD COLUMN IF NOT EXISTS horario_atencion    TEXT,
  ADD COLUMN IF NOT EXISTS sitio_web           TEXT,
  ADD COLUMN IF NOT EXISTS instagram           TEXT,
  ADD COLUMN IF NOT EXISTS facebook            TEXT,
  ADD COLUMN IF NOT EXISTS descripcion_negocio TEXT,
  ADD COLUMN IF NOT EXISTS requiere_aval       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS score_credito       INTEGER DEFAULT 3 CHECK (score_credito BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS meses_puntual       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meses_tardio        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meses_mora          INTEGER DEFAULT 0;

-- Catálogo de productos / servicios ofrecidos por arrendatario
CREATE TABLE prp.productos_servicios_arrendatario (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrendatario_id  UUID REFERENCES prp.arrendatarios(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  categoria        TEXT,
  descripcion      TEXT,
  precio_aprox     DECIMAL(10,2),
  activo           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 21 — ROLES Y USUARIOS DEL SISTEMA
-- ============================================================

CREATE TABLE prp.roles_sistema (
  id          SERIAL PRIMARY KEY,
  clave       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  nivel       INTEGER NOT NULL, -- 1=más alto (Director Grupo), 6=más bajo (externo)
  descripcion TEXT,
  color       TEXT
);

INSERT INTO prp.roles_sistema (clave, nombre, nivel, descripcion, color) VALUES
  ('DIRECTOR_GRUPO',  'Director del Grupo',      1, 'Acceso a todos los inmuebles del grupo', '#B24020'),
  ('DIRECTOR_PLAZA',  'Director de Plaza',        2, 'Acceso total a su plaza asignada',       '#0A66C2'),
  ('ADMINISTRADOR',   'Administrador / Gerente',  3, 'Gestión operativa completa',             '#057642'),
  ('CONTABILIDAD',    'Oficinas Centrales / Cont',4, 'Reportes fiscales y CFDI',               '#6B21A8'),
  ('OPERADOR',        'Ejecutivo / Operador',     5, 'Captura y operación diaria',             '#E8A020'),
  ('MANTENIMIENTO',   'Jefe de Mantenimiento',    5, 'Órdenes de trabajo y proveedores',       '#0F766E'),
  ('PORTAL_EXTERNO',  'Portal Externo',           6, 'Solo su expediente por link token',      '#6B7280');

CREATE TABLE prp.usuarios_sistema (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_uid     UUID UNIQUE, -- auth.users.id
  nombre           TEXT NOT NULL,
  apellidos        TEXT,
  email            TEXT UNIQUE NOT NULL,
  rol              TEXT REFERENCES prp.roles_sistema(clave),
  inmuebles_acceso UUID[] DEFAULT '{}', -- array de inmueble_ids; vacío = TODOS
  activo           BOOLEAN DEFAULT TRUE,
  ultimo_acceso    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prp.permisos_rol (
  id             SERIAL PRIMARY KEY,
  rol            TEXT REFERENCES prp.roles_sistema(clave),
  modulo         TEXT NOT NULL, -- INMUEBLES, CONTRATOS, COBRANZA, RH, NOMINA, ESTACIONAMIENTO, PROVEEDORES, EGRESOS, PROSPECTOS, REPORTES, CONFIG
  puede_ver      BOOLEAN DEFAULT FALSE,
  puede_crear    BOOLEAN DEFAULT FALSE,
  puede_editar   BOOLEAN DEFAULT FALSE,
  puede_eliminar BOOLEAN DEFAULT FALSE,
  puede_aprobar  BOOLEAN DEFAULT FALSE,
  UNIQUE(rol, modulo)
);

-- Poblar permisos por rol
INSERT INTO prp.permisos_rol (rol, modulo, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_aprobar) VALUES
-- Director Grupo: todo
('DIRECTOR_GRUPO', 'INMUEBLES',      TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'CONTRATOS',      TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'COBRANZA',       TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'RH',             TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'NOMINA',         TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'ESTACIONAMIENTO',TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'PROVEEDORES',    TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'EGRESOS',        TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'PROSPECTOS',     TRUE, TRUE, TRUE, TRUE, TRUE),
('DIRECTOR_GRUPO', 'REPORTES',       TRUE, FALSE,FALSE,FALSE,TRUE),
('DIRECTOR_GRUPO', 'CONFIG',         TRUE, TRUE, TRUE, TRUE, TRUE),
-- Director Plaza: todo de su plaza
('DIRECTOR_PLAZA', 'INMUEBLES',      TRUE, FALSE,TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'CONTRATOS',      TRUE, TRUE, TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'COBRANZA',       TRUE, TRUE, TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'RH',             TRUE, TRUE, TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'NOMINA',         TRUE, TRUE, TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'ESTACIONAMIENTO',TRUE, TRUE, TRUE, FALSE,FALSE),
('DIRECTOR_PLAZA', 'PROVEEDORES',    TRUE, TRUE, TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'EGRESOS',        TRUE, TRUE, TRUE, FALSE,TRUE),
('DIRECTOR_PLAZA', 'PROSPECTOS',     TRUE, TRUE, TRUE, FALSE,FALSE),
('DIRECTOR_PLAZA', 'REPORTES',       TRUE, FALSE,FALSE,FALSE,FALSE),
('DIRECTOR_PLAZA', 'CONFIG',         TRUE, FALSE,TRUE, FALSE,FALSE),
-- Administrador: operación completa, sin eliminar ni config
('ADMINISTRADOR',  'INMUEBLES',      TRUE, FALSE,TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'CONTRATOS',      TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'COBRANZA',       TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'RH',             TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'NOMINA',         TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'ESTACIONAMIENTO',TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'PROVEEDORES',    TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'EGRESOS',        TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'PROSPECTOS',     TRUE, TRUE, TRUE, FALSE,FALSE),
('ADMINISTRADOR',  'REPORTES',       TRUE, FALSE,FALSE,FALSE,FALSE),
-- Contabilidad: solo lectura + reportes
('CONTABILIDAD',   'COBRANZA',       TRUE, FALSE,FALSE,FALSE,FALSE),
('CONTABILIDAD',   'EGRESOS',        TRUE, FALSE,FALSE,FALSE,FALSE),
('CONTABILIDAD',   'NOMINA',         TRUE, FALSE,FALSE,FALSE,FALSE),
('CONTABILIDAD',   'REPORTES',       TRUE, FALSE,FALSE,FALSE,FALSE),
-- Operador: captura sin aprobación
('OPERADOR',       'COBRANZA',       TRUE, TRUE, FALSE,FALSE,FALSE),
('OPERADOR',       'ESTACIONAMIENTO',TRUE, TRUE, FALSE,FALSE,FALSE),
('OPERADOR',       'PROSPECTOS',     TRUE, TRUE, TRUE, FALSE,FALSE),
-- Mantenimiento
('MANTENIMIENTO',  'INMUEBLES',      TRUE, FALSE,FALSE,FALSE,FALSE),
('MANTENIMIENTO',  'PROVEEDORES',    TRUE, FALSE,FALSE,FALSE,FALSE);

-- ============================================================
-- SECCIÓN 22 — DATA WAREHOUSE: TABLAS DE HECHOS
-- ============================================================

CREATE TABLE dw.fact_ocupacion_mensual (
  id             BIGSERIAL PRIMARY KEY,
  periodo        TEXT NOT NULL, -- '2026-07'
  anio           INTEGER,
  mes            INTEGER,
  inmueble_id    UUID REFERENCES prp.inmuebles(id),
  zona           TEXT,
  total_unidades INTEGER,
  ocupadas       INTEGER,
  disponibles    INTEGER,
  mantenimiento  INTEGER,
  pct_ocupacion  DECIMAL(5,2),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo, inmueble_id, zona)
);

CREATE TABLE dw.fact_ingresos_mes (
  id          BIGSERIAL PRIMARY KEY,
  periodo     TEXT NOT NULL,
  anio        INTEGER,
  mes         INTEGER,
  inmueble_id UUID REFERENCES prp.inmuebles(id),
  fuente      TEXT CHECK (fuente IN ('RENTA','MANTENIMIENTO','ESTACIONAMIENTO','OTRO')),
  subtotal    DECIMAL(14,2),
  iva         DECIMAL(14,2),
  total       DECIMAL(14,2),
  num_registros INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo, inmueble_id, fuente)
);

CREATE TABLE dw.fact_cobranza_mes (
  id                  BIGSERIAL PRIMARY KEY,
  periodo             TEXT NOT NULL,
  anio                INTEGER,
  mes                 INTEGER,
  inmueble_id         UUID REFERENCES prp.inmuebles(id),
  total_cargos        DECIMAL(14,2),
  total_cobrado       DECIMAL(14,2),
  total_pendiente     DECIMAL(14,2),
  total_mora          DECIMAL(14,2),
  num_contratos       INTEGER,
  num_vigentes        INTEGER,
  num_mora            INTEGER,
  pct_efectividad     DECIMAL(5,2),
  dso_dias            DECIMAL(6,2), -- Days Sales Outstanding
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo, inmueble_id)
);

CREATE TABLE dw.fact_egresos_mes (
  id          BIGSERIAL PRIMARY KEY,
  periodo     TEXT NOT NULL,
  anio        INTEGER,
  mes         INTEGER,
  inmueble_id UUID REFERENCES prp.inmuebles(id),
  concepto    TEXT,
  area_gasto  TEXT,
  subtotal    DECIMAL(14,2),
  iva         DECIMAL(14,2),
  total       DECIMAL(14,2),
  deducible   DECIMAL(14,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dw.fact_estacionamiento_dia (
  id                   BIGSERIAL PRIMARY KEY,
  fecha                DATE NOT NULL,
  inmueble_id          UUID REFERENCES prp.inmuebles(id),
  tipo_acceso          TEXT,
  num_accesos          INTEGER DEFAULT 0,
  ingresos             DECIMAL(10,2) DEFAULT 0,
  cajones_prom_ocupados DECIMAL(5,2) DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fecha, inmueble_id, tipo_acceso)
);

CREATE TABLE dw.fact_rotacion_personal (
  id                    BIGSERIAL PRIMARY KEY,
  periodo               TEXT NOT NULL,
  anio                  INTEGER,
  mes                   INTEGER,
  area                  TEXT,
  num_activos_inicio    INTEGER,
  num_contratados       INTEGER,
  num_bajas             INTEGER,
  num_activos_fin       INTEGER,
  pct_rotacion          DECIMAL(5,2),
  costo_contratacion    DECIMAL(12,2) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo, area)
);

CREATE TABLE dw.fact_nomina_quincenal (
  id                  BIGSERIAL PRIMARY KEY,
  periodo             TEXT NOT NULL, -- '2026-07-Q1'
  anio                INTEGER,
  mes                 INTEGER,
  quincena            INTEGER CHECK (quincena IN (1,2)),
  area                TEXT,
  num_empleados       INTEGER,
  total_percepciones  DECIMAL(14,2),
  total_isr           DECIMAL(14,2),
  total_imss          DECIMAL(14,2),
  total_deducciones   DECIMAL(14,2),
  total_neto          DECIMAL(14,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo, area)
);

CREATE TABLE dw.fact_rotacion_unidades (
  id                      BIGSERIAL PRIMARY KEY,
  unidad_id               UUID REFERENCES prp.unidades(id),
  num_contratos_total     INTEGER DEFAULT 0,
  dias_vacante_acumulados INTEGER DEFAULT 0,
  dias_ocupado_acumulados INTEGER DEFAULT 0,
  pct_ocupacion_historico DECIMAL(5,2),
  renta_promedio_historico DECIMAL(12,2),
  giros_historicos        TEXT[], -- array de giros que han tenido
  ultimo_contrato_at      DATE,
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unidad_id)
);

-- ============================================================
-- SECCIÓN 23 — FUNCIONES Y TRIGGERS AUTOMÁTICOS
-- ============================================================

-- Función: alerta de contratos laborales próximos a vencer
CREATE OR REPLACE FUNCTION prp.fn_alerta_contratos_laborales()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT cl.id, cl.fecha_fin, e.nombre_completo, e.email, cl.tipo_contrato
    FROM prp.contratos_laborales cl
    JOIN prp.empleados e ON e.id = cl.empleado_id
    WHERE cl.estado_id = 'VIGENTE'
      AND cl.fecha_fin IS NOT NULL
      AND cl.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + 15
  LOOP
    INSERT INTO prp.cola_notificaciones
      (tipo, canal, destinatario, destinatario_tipo, asunto, cuerpo, modulo_origen, registro_id)
    VALUES
      ('FIN_PRUEBA', 'IN_APP', 'admin@sistema.mx', 'INTERNO',
       'Contrato próximo a vencer: ' || r.nombre_completo,
       'El contrato ' || r.tipo_contrato || ' de ' || r.nombre_completo ||
       ' vence el ' || r.fecha_fin::TEXT || '. Decide: renovar o prescindir.',
       'RH', r.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Función: generar cargos de renta día 1 de cada mes
CREATE OR REPLACE FUNCTION prp.fn_generar_cargos_renta(p_periodo TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  v_periodo TEXT;
  v_fecha DATE;
BEGIN
  v_periodo := COALESCE(p_periodo, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
  v_fecha   := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  FOR r IN
    SELECT ca.id, ca.renta_mensual, ca.cuota_mant, ca.periodo_gracia_dias
    FROM prp.contratos_arrendamiento ca
    WHERE ca.estado_id = 'VIGENTE'
  LOOP
    INSERT INTO prp.cargos_renta
      (contrato_id, periodo, fecha_cargo, fecha_vencimiento, renta, cuota_mant,
       subtotal, iva, total, saldo_pendiente, estado_id)
    VALUES
      (r.id, v_periodo, v_fecha,
       v_fecha + r.periodo_gracia_dias,
       r.renta_mensual, r.cuota_mant,
       r.renta_mensual + r.cuota_mant,
       (r.renta_mensual + r.cuota_mant) * 0.16,
       (r.renta_mensual + r.cuota_mant) * 1.16,
       (r.renta_mensual + r.cuota_mant) * 1.16,
       'PENDIENTE')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Función: calcular mora en cargos vencidos
CREATE OR REPLACE FUNCTION prp.fn_calcular_mora()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE prp.cargos_renta
  SET
    mora_acumulada = ROUND(saldo_pendiente * 0.05 *
      EXTRACT(DAY FROM CURRENT_DATE - fecha_vencimiento) / 30.0, 2),
    estado_id = 'EN_MORA'
  WHERE estado_id IN ('PENDIENTE', 'POR_VENCER', 'EN_MORA')
    AND fecha_vencimiento < CURRENT_DATE
    AND saldo_pendiente > 0;
END $$;

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION prp.fn_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

CREATE TRIGGER trg_inmuebles_updated_at
  BEFORE UPDATE ON prp.inmuebles
  FOR EACH ROW EXECUTE FUNCTION prp.fn_updated_at();

CREATE TRIGGER trg_unidades_updated_at
  BEFORE UPDATE ON prp.unidades
  FOR EACH ROW EXECUTE FUNCTION prp.fn_updated_at();

CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON prp.contratos_arrendamiento
  FOR EACH ROW EXECUTE FUNCTION prp.fn_updated_at();

CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON prp.empleados
  FOR EACH ROW EXECUTE FUNCTION prp.fn_updated_at();

CREATE TRIGGER trg_prospectos_updated_at
  BEFORE UPDATE ON prp.prospectos
  FOR EACH ROW EXECUTE FUNCTION prp.fn_updated_at();

-- ============================================================
-- SECCIÓN 24 — DATOS SINTÉTICOS ADICIONALES
-- ============================================================

-- Expedientes digitales demo
DO $$
DECLARE arr1 UUID; arr2 UUID; imb UUID;
BEGIN
  SELECT id INTO arr1 FROM prp.arrendatarios LIMIT 1;
  SELECT id INTO arr2 FROM prp.arrendatarios OFFSET 3 LIMIT 1;
  SELECT id INTO imb FROM prp.inmuebles WHERE clave = 'PLZ-MET-01';

  INSERT INTO prp.expedientes_digitales (tipo, referencia_id, nombre, email, inmueble_id, estado, enviado_at, num_docs_requeridos, num_docs_subidos) VALUES
  ('ARRENDATARIO', arr1, 'Alejandro Ruiz Castro',  'alex.ruiz@caferuiz.mx',  imb, 'COMPLETO', NOW()-INTERVAL '5 days', 5, 5),
  ('ARRENDATARIO', arr2, 'Sandra Torres Mejía',    'storres@modaexpress.mx', imb, 'PARCIAL',  NOW()-INTERVAL '2 days', 5, 3),
  ('EMPLEADO',     NULL, 'José Manuel Pérez López', 'jose.perez@gmail.com',  NULL,'ENVIADO',  NOW()-INTERVAL '1 day', 6, 0);
END $$;

-- Usuarios del sistema (demo)
INSERT INTO prp.usuarios_sistema (nombre, apellidos, email, rol, activo) VALUES
('Roberto', 'Aguilar Cota',   'roberto.aguilar.cota@gmail.com', 'DIRECTOR_GRUPO', TRUE),
('Zurisade', 'Lopez Garcia',  'zurisade@alcedines.mx',          'DIRECTOR_PLAZA', TRUE),
('Ana Beatriz', 'García Soto', 'ana.garcia@alcedines.mx',       'ADMINISTRADOR',  TRUE),
('Laura Patricia', 'Vega Morales', 'laura.vega@alcedines.mx',   'OPERADOR',       TRUE),
('Miguel Ángel', 'Torres Ríos', 'miguel.torres@alcedines.mx',   'MANTENIMIENTO',  TRUE);

-- Productos/servicios de arrendatarios
DO $$
DECLARE arr1 UUID; arr2 UUID; arr3 UUID;
BEGIN
  SELECT id INTO arr1 FROM prp.arrendatarios WHERE rfc = 'SNA210310AB1';
  SELECT id INTO arr2 FROM prp.arrendatarios WHERE rfc = 'FPO180520XY3';
  SELECT id INTO arr3 FROM prp.arrendatarios WHERE rfc = 'RATM780901YZ5';

  IF arr1 IS NOT NULL THEN
    UPDATE prp.arrendatarios SET nombre_comercial='Sushi Nakamura', horario_atencion='12:00-22:00 hrs', descripcion_negocio='Restaurante de sushi y comida japonesa fusion' WHERE id=arr1;
    INSERT INTO prp.productos_servicios_arrendatario (arrendatario_id, nombre, categoria) VALUES
    (arr1, 'Rollos de sushi', 'Alimentos'), (arr1, 'Platillos japoneses', 'Alimentos'), (arr1, 'Bebidas y cócteles', 'Bebidas');
  END IF;
  IF arr2 IS NOT NULL THEN
    UPDATE prp.arrendatarios SET nombre_comercial='Fashion Point', horario_atencion='10:00-21:00 hrs', descripcion_negocio='Moda femenina y masculina, accesorios y calzado' WHERE id=arr2;
    INSERT INTO prp.productos_servicios_arrendatario (arrendatario_id, nombre, categoria) VALUES
    (arr2, 'Ropa femenina', 'Moda'), (arr2, 'Ropa masculina', 'Moda'), (arr2, 'Accesorios', 'Moda');
  END IF;
  IF arr3 IS NOT NULL THEN
    UPDATE prp.arrendatarios SET nombre_comercial='Farmacia Ramírez', horario_atencion='8:00-22:00 hrs', descripcion_negocio='Farmacia con servicio de consulta médica' WHERE id=arr3;
  END IF;
END $$;

-- Vista: Expedientes pendientes de revisión
CREATE OR REPLACE VIEW prp.v_expedientes_pendientes AS
SELECT
  e.nombre,
  e.email,
  e.tipo,
  e.estado,
  e.num_docs_requeridos,
  e.num_docs_subidos,
  ROUND(e.num_docs_subidos::NUMERIC / NULLIF(e.num_docs_requeridos,0) * 100, 0) AS pct_completo,
  e.enviado_at,
  e.expira_at,
  CASE WHEN e.expira_at < NOW() THEN TRUE ELSE FALSE END AS expirado
FROM prp.expedientes_digitales e
WHERE e.estado NOT IN ('APROBADO','RECHAZADO')
ORDER BY e.enviado_at DESC;

-- Vista: Contratos laborales próximos a vencer
CREATE OR REPLACE VIEW prp.v_contratos_laborales_vencer AS
SELECT
  e.numero_empleado,
  e.nombre_completo,
  e.puesto,
  e.area,
  cl.tipo_contrato,
  cl.fecha_inicio,
  cl.fecha_fin,
  (cl.fecha_fin - CURRENT_DATE)::INTEGER AS dias_restantes,
  CASE
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 3  THEN 'CRITICO'
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 7  THEN 'URGENTE'
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 15 THEN 'PROXIMO'
    ELSE 'VIGENTE'
  END AS semaforo,
  cl.salario_mensual,
  e.email
FROM prp.contratos_laborales cl
JOIN prp.empleados e ON e.id = cl.empleado_id
WHERE cl.estado_id = 'VIGENTE'
  AND cl.fecha_fin IS NOT NULL
  AND cl.fecha_fin >= CURRENT_DATE
ORDER BY cl.fecha_fin ASC;

-- Vista: Ocupación por inmueble
CREATE OR REPLACE VIEW prp.v_ocupacion_inmueble AS
SELECT
  i.nombre AS inmueble,
  COUNT(u.id) AS total_unidades,
  SUM(CASE WHEN u.estado_id = 'OCUPADO' THEN 1 ELSE 0 END) AS ocupadas,
  SUM(CASE WHEN u.estado_id = 'DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
  ROUND(SUM(CASE WHEN u.estado_id = 'OCUPADO' THEN 1 ELSE 0 END)::NUMERIC / COUNT(u.id) * 100, 1) AS pct_ocupacion
FROM prp.inmuebles i
LEFT JOIN prp.unidades u ON u.inmueble_id = i.id
GROUP BY i.nombre;

-- Vista: Resumen cobranza del mes actual
CREATE OR REPLACE VIEW prp.v_cobranza_mes AS
SELECT
  a.razon_social AS arrendatario,
  u.numero_local AS local,
  cr.periodo,
  cr.total,
  cr.saldo_pendiente,
  cr.estado_id,
  cr.mora_acumulada
FROM prp.cargos_renta cr
JOIN prp.contratos_arrendamiento ca ON ca.id = cr.contrato_id
JOIN prp.arrendatarios a ON a.id = ca.arrendatario_id
JOIN prp.unidades u ON u.id = ca.unidad_id
WHERE cr.periodo = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Vista: Nómina resumen empleados activos
CREATE OR REPLACE VIEW prp.v_nomina_empleados AS
SELECT
  e.numero_empleado,
  e.nombre_completo,
  e.puesto,
  e.area,
  e.salario_mensual,
  e.forma_pago_nomina,
  e.fecha_ingreso,
  DATE_PART('year', AGE(CURRENT_DATE, e.fecha_ingreso)) AS anos_antiguedad,
  e.estado_id
FROM prp.empleados e
WHERE e.estado_id = 'ACTIVO'
ORDER BY e.numero_empleado;

-- Vista: KPIs Dashboard
CREATE OR REPLACE VIEW prp.v_kpis_dashboard AS
SELECT
  (SELECT ROUND(SUM(CASE WHEN u.estado_id='OCUPADO' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(u.id),0)*100,1)
   FROM prp.unidades u) AS pct_ocupacion,
  (SELECT COALESCE(SUM(renta_mensual + cuota_mant),0) FROM prp.contratos_arrendamiento WHERE estado_id='VIGENTE') AS ingresos_renta_mes,
  (SELECT COUNT(*) FROM prp.empleados WHERE estado_id='ACTIVO') AS total_empleados_activos,
  (SELECT COUNT(*) FROM prp.ordenes_trabajo WHERE estado_id='PENDIENTE') AS ot_pendientes,
  (SELECT COUNT(*) FROM prp.prospectos WHERE etapa NOT IN ('GANADO','PERDIDO')) AS prospectos_activos,
  (SELECT COALESCE(SUM(saldo_pendiente),0) FROM prp.cargos_renta WHERE estado_id='EN_MORA') AS cartera_mora,
  (SELECT COUNT(*) FROM prp.cajones_estacionamiento WHERE estado_id='DISPONIBLE') AS cajones_disponibles;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

-- Verificación rápida
SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_schema = t.schemaname AND c.table_name = t.tablename) AS columnas
FROM pg_tables t
WHERE schemaname IN ('prp','dw')
ORDER BY schemaname, tablename;
