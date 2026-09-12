-- Auto-generated schema dump of production schemas: prp, public
-- Source: introspection via pg_catalog (no pg_dump/Docker) — generated 2026-09-12T22:44:23.715Z
-- Target: QA Supabase project bootstrap

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================
-- SCHEMA "prp"
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "prp";
CREATE TABLE IF NOT EXISTS "prp"."accesos_estacionamiento" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "folio" character varying(20),
  "entrada" timestamp with time zone DEFAULT now() NOT NULL,
  "salida" timestamp with time zone,
  "placa" character varying(20),
  "tipo" character varying(20) DEFAULT 'PUBLICO'::character varying,
  "pension_id" uuid,
  "monto" numeric(8,2) DEFAULT 0,
  "pagado" boolean DEFAULT false,
  "cobrador_id" uuid
);
CREATE TABLE IF NOT EXISTS "prp"."adendums" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid NOT NULL,
  "numero_adendum" smallint DEFAULT 1,
  "fecha_adendum" date,
  "descripcion" text,
  "monto_anterior" numeric(12,2),
  "monto_nuevo" numeric(12,2),
  "archivo_nombre" text,
  "creado_en" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."agua_lecturas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "unidad_id" uuid NOT NULL,
  "numero_medidor" character varying(50),
  "periodo_inicio" date NOT NULL,
  "periodo_fin" date NOT NULL,
  "lectura_anterior" numeric(10,2) DEFAULT 0,
  "lectura_actual" numeric(10,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."agua_recibos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "lectura_id" uuid,
  "unidad_id" uuid NOT NULL,
  "arrendatario_id" uuid,
  "folio" character varying(20),
  "periodo_inicio" date NOT NULL,
  "periodo_fin" date NOT NULL,
  "consumo_m3" numeric(10,2) NOT NULL,
  "monto" numeric(10,2) NOT NULL,
  "estatus" character varying(20) DEFAULT 'PENDIENTE'::character varying,
  "monto_pagado" numeric(10,2) DEFAULT 0,
  "fecha_pago" date,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."arrendatarios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(200) NOT NULL,
  "apellidos" character varying(200),
  "rfc" character varying(13),
  "curp" character varying(18),
  "email" character varying(200),
  "telefono" character varying(15),
  "whatsapp" character varying(15),
  "domicilio" text,
  "tipo_persona" character varying(20) DEFAULT 'FISICA'::character varying,
  "razon_social" character varying(200),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."bitacora" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "modulo" character varying(60) NOT NULL,
  "accion" character varying(80) NOT NULL,
  "entidad" character varying(80),
  "entidad_id" uuid,
  "descripcion" text,
  "usuario_id" uuid,
  "usuario_email" character varying(120),
  "ip" character varying(50),
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."cajones_estacionamiento" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "numero" character varying(10) NOT NULL,
  "tipo" character varying(20) DEFAULT 'PUBLICO'::character varying,
  "empleado_id" uuid,
  "activo" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "prp"."cat_estado_general" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" character varying(30) NOT NULL,
  "descripcion" character varying(100) NOT NULL,
  "color_hex" character varying(7),
  "activo" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "prp"."cat_grupo_gasto" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" character varying(30) NOT NULL,
  "descripcion" character varying(100) NOT NULL,
  "tipo" character varying(20) DEFAULT 'VARIABLE'::character varying,
  "activo" boolean DEFAULT true,
  "orden" integer DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "prp"."cobros_programados" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid NOT NULL,
  "unidad_id" uuid NOT NULL,
  "arrendatario_id" uuid NOT NULL,
  "mes" integer NOT NULL,
  "anio" integer NOT NULL,
  "pagare_numero" integer,
  "fecha_limite_pago" date NOT NULL,
  "monto_renta" numeric(12,2) NOT NULL,
  "monto_iva" numeric(12,2) DEFAULT 0,
  "monto_total" numeric(12,2) NOT NULL,
  "referencia_pago" character varying(60) NOT NULL,
  "estatus" character varying(20) DEFAULT 'PENDIENTE'::character varying,
  "fecha_pago_real" date,
  "monto_pagado" numeric(12,2),
  "numero_operacion_banco" character varying(50),
  "banco_origen" character varying(50),
  "voucher_url" text,
  "forma_pago" character varying(20),
  "registrado_por" uuid,
  "conciliado" boolean DEFAULT false,
  "monto_mora" numeric(10,2) DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."cobros_turno" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha" date DEFAULT CURRENT_DATE NOT NULL,
  "turno" character varying(10) DEFAULT 'DIA'::character varying,
  "empleado_id" uuid,
  "operador_id" uuid,
  "total_tickets" integer DEFAULT 0,
  "total_pensiones" integer DEFAULT 0,
  "monto_efectivo" numeric(10,2) DEFAULT 0,
  "monto_sistema" numeric(10,2) DEFAULT 0,
  "diferencia" numeric(10,2) DEFAULT 0,
  "validado" boolean DEFAULT false,
  "dia_semana" character varying(20),
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."conciliaciones_sesiones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha_sesion" date DEFAULT CURRENT_DATE NOT NULL,
  "banco" character varying(50) DEFAULT 'BBVA'::character varying,
  "periodo_inicio" date,
  "periodo_fin" date,
  "total_mov" integer DEFAULT 0,
  "total_concil" integer DEFAULT 0,
  "monto_concil" numeric(12,2) DEFAULT 0,
  "estatus" character varying(20) DEFAULT 'EN_PROCESO'::character varying,
  "tesorero_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."contrato_unidades" (
  "contrato_id" uuid NOT NULL,
  "unidad_id" uuid NOT NULL,
  "es_principal" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "prp"."contratos_arrendamiento" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "unidad_id" uuid NOT NULL,
  "arrendatario_id" uuid NOT NULL,
  "tipo_documento" character varying(30) DEFAULT 'SUBARRENDAMIENTO'::character varying,
  "tipo_contrato" character varying(20) DEFAULT 'ANUAL'::character varying,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "renta_mensual" numeric(12,2) NOT NULL,
  "deposito_garantia" numeric(12,2) DEFAULT 0,
  "dia_limite_pago" integer DEFAULT 5,
  "periodo_gracia_dias" integer DEFAULT 15,
  "numero_pagares" integer DEFAULT 12,
  "giro_autorizado" character varying(200),
  "incremento_tipo" character varying(20) DEFAULT 'INPC'::character varying,
  "penalizacion_mora_pct" numeric(5,2) DEFAULT 10.00,
  "penalizacion_adicional_pct" numeric(5,2) DEFAULT 5.00,
  "penalizacion_dias" integer DEFAULT 10,
  "cancelacion_anticipada_meses" integer DEFAULT 2,
  "fiador_nombre" character varying(200),
  "fiador_domicilio" text,
  "fiador_rfc" character varying(13),
  "cuenta_banco_pago" character varying(100),
  "clabe_interbancaria" character varying(18),
  "horario_inicio" time without time zone DEFAULT '08:00:00'::time without time zone,
  "horario_fin" time without time zone DEFAULT '22:00:00'::time without time zone,
  "despacho_juridico" character varying(200),
  "fecha_firma" date,
  "archivo_contrato_url" text,
  "factura_a_tercero" boolean DEFAULT false,
  "tercero_razon_social" character varying(200),
  "tercero_rfc" character varying(13),
  "estatus" character varying(20) DEFAULT 'VIGENTE'::character varying,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "url_contrato_firmado" text,
  "notas" text
);
CREATE TABLE IF NOT EXISTS "prp"."contratos_documentos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid NOT NULL,
  "tipo_documento" character varying(60) NOT NULL,
  "nombre_archivo" character varying(200),
  "storage_path" text NOT NULL,
  "fecha_documento" date,
  "subido_por" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."documentos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "entidad_tipo" character varying(40) NOT NULL,
  "entidad_id" uuid NOT NULL,
  "tipo_doc" character varying(60) NOT NULL,
  "nombre_archivo" character varying(200),
  "url" text NOT NULL,
  "estatus" character varying(20) DEFAULT 'PENDIENTE'::character varying,
  "notas" text,
  "subido_por" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."edr_conceptos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" character varying(30) NOT NULL,
  "descripcion" character varying(200) NOT NULL,
  "tipo" character varying(20) NOT NULL,
  "calculo_tipo" character varying(20) DEFAULT 'MANUAL'::character varying,
  "signo" integer DEFAULT 1,
  "orden" integer DEFAULT 0,
  "activo" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "prp"."empleados" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(200) NOT NULL,
  "apellidos" character varying(200),
  "email" character varying(200),
  "telefono" character varying(15),
  "whatsapp" character varying(15),
  "puesto" character varying(100),
  "departamento" character varying(100),
  "salario" numeric(10,2),
  "fecha_ingreso" date,
  "tipo_contrato" character varying(30) DEFAULT 'INDETERMINADO'::character varying,
  "rol_id" uuid,
  "auth_user_id" uuid,
  "tiene_cajon" boolean DEFAULT false,
  "numero_cajon" character varying(10),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."estado_resultados_mensual" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "anio" integer NOT NULL,
  "mes" integer NOT NULL,
  "concepto_id" uuid NOT NULL,
  "monto_real" numeric(12,2) DEFAULT 0,
  "monto_proyectado" numeric(12,2) DEFAULT 0,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."fondo_revolvente_cierres" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fondo_id" uuid NOT NULL,
  "semana_inicio" date NOT NULL,
  "semana_fin" date NOT NULL,
  "monto_asignado" numeric(10,2) DEFAULT 20000,
  "total_estacionamiento" numeric(10,2) DEFAULT 0,
  "total_pensiones" numeric(10,2) DEFAULT 0,
  "total_vending" numeric(10,2) DEFAULT 0,
  "total_ingresos" numeric(10,2) DEFAULT 0,
  "total_gastos" numeric(10,2) DEFAULT 0,
  "total_comprobado" numeric(10,2) DEFAULT 0,
  "diferencia_gastos" numeric(10,2) DEFAULT 0,
  "total_efectivo_entregar" numeric(10,2) DEFAULT 0,
  "dia_tomado_importe" numeric(10,2) DEFAULT 0,
  "residual_vending" numeric(10,2) DEFAULT 0,
  "cerrado" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."fondos_revolventes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(100) NOT NULL,
  "monto_base" numeric(10,2) DEFAULT 20000,
  "responsable_id" uuid,
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."gastos_fijos_anuales" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "concepto" character varying(100) NOT NULL,
  "monto" numeric(10,2) NOT NULL,
  "periodicidad" character varying(20) DEFAULT 'ANUAL'::character varying,
  "mes_pago" integer,
  "anio" integer,
  "pagado" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."gastos_operativos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha" date NOT NULL,
  "proveedor_nombre" character varying(200) NOT NULL,
  "grupo_id" uuid,
  "descripcion" text NOT NULL,
  "monto_pagado" numeric(10,2) NOT NULL,
  "monto_comprobante" numeric(10,2),
  "tiene_factura" boolean DEFAULT false,
  "semana_inicio" date,
  "fondo_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."inmuebles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(200) NOT NULL,
  "tipo" character varying(50) DEFAULT 'PLAZA_COMERCIAL'::character varying,
  "direccion" text,
  "colonia" character varying(100),
  "municipio" character varying(100),
  "estado" character varying(100),
  "cp" character varying(10),
  "rfc_propietario" character varying(13),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."movimientos_bancarios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "sesion_id" uuid NOT NULL,
  "fecha_movimiento" date NOT NULL,
  "descripcion" text,
  "referencia_banco" character varying(100),
  "referencia_cruzada" character varying(40),
  "monto" numeric(12,2) NOT NULL,
  "tipo" character varying(10) DEFAULT 'ABONO'::character varying,
  "conciliado" boolean DEFAULT false,
  "cobro_programado_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."notas_contrato" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid NOT NULL,
  "texto" text NOT NULL,
  "tipo" character varying(30) DEFAULT 'NOTA'::character varying,
  "autor_nombre" character varying(100),
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."pensiones_estacionamiento" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(200) NOT NULL,
  "telefono" character varying(15),
  "placa" character varying(20),
  "marca_auto" character varying(50),
  "color_auto" character varying(30),
  "cajon_id" uuid,
  "monto_mensual" numeric(8,2) DEFAULT 500,
  "fecha_inicio" date,
  "fecha_fin" date,
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."precios_unidad" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "unidad_id" uuid NOT NULL,
  "precio_lista" numeric(12,2) NOT NULL,
  "precio_negociado" numeric(12,2),
  "vigente_desde" date NOT NULL,
  "vigente_hasta" date,
  "motivo" text,
  "creado_en" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."presupuesto_mensual" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "anio" integer NOT NULL,
  "mes" integer NOT NULL,
  "concepto_id" uuid NOT NULL,
  "monto_proyectado" numeric(12,2) DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."prospectos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(200) NOT NULL,
  "apellidos" character varying(200),
  "email" character varying(200),
  "telefono" character varying(15),
  "whatsapp" character varying(15),
  "rfc" character varying(13),
  "curp" character varying(18),
  "domicilio" text,
  "giro_solicitado" character varying(200),
  "unidad_id" uuid,
  "monto_ofertado" numeric(10,2),
  "fecha_visita" date,
  "fiador_nombre" character varying(200),
  "fiador_telefono" character varying(15),
  "fiador_domicilio" text,
  "resultado_buro" character varying(20) DEFAULT 'PENDIENTE'::character varying,
  "resultado_buro_detalle" text,
  "estatus" character varying(20) DEFAULT 'NUEVO'::character varying,
  "motivo_rechazo" text,
  "contrato_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."prospectos_documentos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prospecto_id" uuid NOT NULL,
  "tipo_documento" character varying(50) NOT NULL,
  "nombre_archivo" character varying(200),
  "storage_path" text NOT NULL,
  "fecha_vencimiento" date,
  "verificado" boolean DEFAULT false,
  "subido_por_prospecto" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."prospectos_tokens" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prospecto_id" uuid NOT NULL,
  "token" character varying(64) DEFAULT replace(((gen_random_uuid())::text || (gen_random_uuid())::text), '-'::text, ''::text) NOT NULL,
  "url_portal" text,
  "whatsapp_msg" text,
  "fecha_expiracion" timestamp with time zone DEFAULT (now() + '72:00:00'::interval) NOT NULL,
  "usado" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."proveedores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(200) NOT NULL,
  "rfc" character varying(13),
  "email" character varying(200),
  "telefono" character varying(15),
  "categoria" character varying(50),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."recibos_efectivo" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "folio" character varying(20),
  "unidad_id" uuid,
  "arrendatario_id" uuid,
  "concepto" character varying(200) NOT NULL,
  "monto" numeric(10,2) NOT NULL,
  "fecha_emision" date DEFAULT CURRENT_DATE NOT NULL,
  "cobrador_id" uuid,
  "observaciones" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."roles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" character varying(30) NOT NULL,
  "nombre" character varying(100) NOT NULL,
  "descripcion" text,
  "nivel" integer DEFAULT 5,
  "activo" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "prp"."unidades" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "inmueble_id" uuid NOT NULL,
  "numero_local" character varying(20) NOT NULL,
  "nombre_comercial" character varying(200),
  "tipo_unidad" character varying(50) DEFAULT 'LOCAL_COMERCIAL'::character varying,
  "metros_cuadrados" numeric(8,2),
  "piso" integer DEFAULT 1,
  "estatus_id" uuid,
  "renta_base" numeric(12,2) DEFAULT 0,
  "tiene_servicio_agua" boolean DEFAULT true,
  "numero_medidor_agua" character varying(50),
  "monto_agua_base" numeric(10,2),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."vending_cierres_semanales" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "semana_inicio" date NOT NULL,
  "semana_fin" date NOT NULL,
  "ingreso_maquina" numeric(10,2) DEFAULT 0,
  "efectivo_entregado" numeric(10,2) DEFAULT 0,
  "residual_anterior" numeric(10,2) DEFAULT 0,
  "residual_actual" numeric(10,2) DEFAULT 0,
  "reposicion_monto" numeric(10,2) DEFAULT 0,
  "capturado_por" uuid,
  "observaciones" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prp"."vending_productos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" character varying(100) NOT NULL,
  "proveedor" character varying(100),
  "activo" boolean DEFAULT true,
  "orden" integer DEFAULT 0
);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_mes_check" CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE prp.estado_resultados_mensual ADD CONSTRAINT "estado_resultados_mensual_mes_check" CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE prp.presupuesto_mensual ADD CONSTRAINT "presupuesto_mensual_mes_check" CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE prp.accesos_estacionamiento ADD CONSTRAINT "accesos_estacionamiento_pkey" PRIMARY KEY (id);
ALTER TABLE prp.adendums ADD CONSTRAINT "adendums_pkey" PRIMARY KEY (id);
ALTER TABLE prp.agua_lecturas ADD CONSTRAINT "agua_lecturas_pkey" PRIMARY KEY (id);
ALTER TABLE prp.agua_recibos ADD CONSTRAINT "agua_recibos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.arrendatarios ADD CONSTRAINT "arrendatarios_pkey" PRIMARY KEY (id);
ALTER TABLE prp.bitacora ADD CONSTRAINT "bitacora_pkey" PRIMARY KEY (id);
ALTER TABLE prp.cajones_estacionamiento ADD CONSTRAINT "cajones_estacionamiento_pkey" PRIMARY KEY (id);
ALTER TABLE prp.cat_estado_general ADD CONSTRAINT "cat_estado_general_pkey" PRIMARY KEY (id);
ALTER TABLE prp.cat_grupo_gasto ADD CONSTRAINT "cat_grupo_gasto_pkey" PRIMARY KEY (id);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_pkey" PRIMARY KEY (id);
ALTER TABLE prp.cobros_turno ADD CONSTRAINT "cobros_turno_pkey" PRIMARY KEY (id);
ALTER TABLE prp.conciliaciones_sesiones ADD CONSTRAINT "conciliaciones_sesiones_pkey" PRIMARY KEY (id);
ALTER TABLE prp.contrato_unidades ADD CONSTRAINT "contrato_unidades_pkey" PRIMARY KEY (contrato_id, unidad_id);
ALTER TABLE prp.contratos_arrendamiento ADD CONSTRAINT "contratos_arrendamiento_pkey" PRIMARY KEY (id);
ALTER TABLE prp.contratos_documentos ADD CONSTRAINT "contratos_documentos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.documentos ADD CONSTRAINT "documentos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.edr_conceptos ADD CONSTRAINT "edr_conceptos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.empleados ADD CONSTRAINT "empleados_pkey" PRIMARY KEY (id);
ALTER TABLE prp.estado_resultados_mensual ADD CONSTRAINT "estado_resultados_mensual_pkey" PRIMARY KEY (id);
ALTER TABLE prp.fondo_revolvente_cierres ADD CONSTRAINT "fondo_revolvente_cierres_pkey" PRIMARY KEY (id);
ALTER TABLE prp.fondos_revolventes ADD CONSTRAINT "fondos_revolventes_pkey" PRIMARY KEY (id);
ALTER TABLE prp.gastos_fijos_anuales ADD CONSTRAINT "gastos_fijos_anuales_pkey" PRIMARY KEY (id);
ALTER TABLE prp.gastos_operativos ADD CONSTRAINT "gastos_operativos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.inmuebles ADD CONSTRAINT "inmuebles_pkey" PRIMARY KEY (id);
ALTER TABLE prp.movimientos_bancarios ADD CONSTRAINT "movimientos_bancarios_pkey" PRIMARY KEY (id);
ALTER TABLE prp.notas_contrato ADD CONSTRAINT "notas_contrato_pkey" PRIMARY KEY (id);
ALTER TABLE prp.pensiones_estacionamiento ADD CONSTRAINT "pensiones_estacionamiento_pkey" PRIMARY KEY (id);
ALTER TABLE prp.precios_unidad ADD CONSTRAINT "precios_unidad_pkey" PRIMARY KEY (id);
ALTER TABLE prp.presupuesto_mensual ADD CONSTRAINT "presupuesto_mensual_pkey" PRIMARY KEY (id);
ALTER TABLE prp.prospectos_documentos ADD CONSTRAINT "prospectos_documentos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.prospectos ADD CONSTRAINT "prospectos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.prospectos_tokens ADD CONSTRAINT "prospectos_tokens_pkey" PRIMARY KEY (id);
ALTER TABLE prp.proveedores ADD CONSTRAINT "proveedores_pkey" PRIMARY KEY (id);
ALTER TABLE prp.recibos_efectivo ADD CONSTRAINT "recibos_efectivo_pkey" PRIMARY KEY (id);
ALTER TABLE prp.roles ADD CONSTRAINT "roles_pkey" PRIMARY KEY (id);
ALTER TABLE prp.unidades ADD CONSTRAINT "unidades_pkey" PRIMARY KEY (id);
ALTER TABLE prp.vending_cierres_semanales ADD CONSTRAINT "vending_cierres_semanales_pkey" PRIMARY KEY (id);
ALTER TABLE prp.vending_productos ADD CONSTRAINT "vending_productos_pkey" PRIMARY KEY (id);
ALTER TABLE prp.agua_recibos ADD CONSTRAINT "agua_recibos_folio_key" UNIQUE (folio);
ALTER TABLE prp.cajones_estacionamiento ADD CONSTRAINT "cajones_estacionamiento_numero_key" UNIQUE (numero);
ALTER TABLE prp.cat_estado_general ADD CONSTRAINT "cat_estado_general_clave_key" UNIQUE (clave);
ALTER TABLE prp.cat_grupo_gasto ADD CONSTRAINT "cat_grupo_gasto_clave_key" UNIQUE (clave);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_contrato_id_mes_anio_key" UNIQUE (contrato_id, mes, anio);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_referencia_pago_key" UNIQUE (referencia_pago);
ALTER TABLE prp.edr_conceptos ADD CONSTRAINT "edr_conceptos_clave_key" UNIQUE (clave);
ALTER TABLE prp.empleados ADD CONSTRAINT "empleados_email_key" UNIQUE (email);
ALTER TABLE prp.estado_resultados_mensual ADD CONSTRAINT "estado_resultados_mensual_anio_mes_concepto_id_key" UNIQUE (anio, mes, concepto_id);
ALTER TABLE prp.fondo_revolvente_cierres ADD CONSTRAINT "fondo_revolvente_cierres_semana_inicio_key" UNIQUE (semana_inicio);
ALTER TABLE prp.presupuesto_mensual ADD CONSTRAINT "presupuesto_mensual_anio_mes_concepto_id_key" UNIQUE (anio, mes, concepto_id);
ALTER TABLE prp.prospectos_tokens ADD CONSTRAINT "prospectos_tokens_token_key" UNIQUE (token);
ALTER TABLE prp.recibos_efectivo ADD CONSTRAINT "recibos_efectivo_folio_key" UNIQUE (folio);
ALTER TABLE prp.roles ADD CONSTRAINT "roles_clave_key" UNIQUE (clave);
ALTER TABLE prp.unidades ADD CONSTRAINT "unidades_inmueble_id_numero_local_key" UNIQUE (inmueble_id, numero_local);
ALTER TABLE prp.vending_cierres_semanales ADD CONSTRAINT "vending_cierres_semanales_semana_inicio_key" UNIQUE (semana_inicio);
ALTER TABLE prp.accesos_estacionamiento ADD CONSTRAINT "accesos_estacionamiento_cobrador_id_fkey" FOREIGN KEY (cobrador_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.accesos_estacionamiento ADD CONSTRAINT "accesos_estacionamiento_pension_id_fkey" FOREIGN KEY (pension_id) REFERENCES prp.pensiones_estacionamiento(id);
ALTER TABLE prp.adendums ADD CONSTRAINT "adendums_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES prp.contratos_arrendamiento(id);
ALTER TABLE prp.agua_lecturas ADD CONSTRAINT "agua_lecturas_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.agua_recibos ADD CONSTRAINT "agua_recibos_arrendatario_id_fkey" FOREIGN KEY (arrendatario_id) REFERENCES prp.arrendatarios(id);
ALTER TABLE prp.agua_recibos ADD CONSTRAINT "agua_recibos_lectura_id_fkey" FOREIGN KEY (lectura_id) REFERENCES prp.agua_lecturas(id);
ALTER TABLE prp.agua_recibos ADD CONSTRAINT "agua_recibos_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.cajones_estacionamiento ADD CONSTRAINT "cajones_estacionamiento_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_arrendatario_id_fkey" FOREIGN KEY (arrendatario_id) REFERENCES prp.arrendatarios(id);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES prp.contratos_arrendamiento(id);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_registrado_por_fkey" FOREIGN KEY (registrado_por) REFERENCES prp.empleados(id);
ALTER TABLE prp.cobros_programados ADD CONSTRAINT "cobros_programados_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.cobros_turno ADD CONSTRAINT "cobros_turno_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.cobros_turno ADD CONSTRAINT "cobros_turno_operador_id_fkey" FOREIGN KEY (operador_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.conciliaciones_sesiones ADD CONSTRAINT "conciliaciones_sesiones_tesorero_id_fkey" FOREIGN KEY (tesorero_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.contrato_unidades ADD CONSTRAINT "contrato_unidades_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES prp.contratos_arrendamiento(id) ON DELETE CASCADE;
ALTER TABLE prp.contrato_unidades ADD CONSTRAINT "contrato_unidades_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.contratos_arrendamiento ADD CONSTRAINT "contratos_arrendamiento_arrendatario_id_fkey" FOREIGN KEY (arrendatario_id) REFERENCES prp.arrendatarios(id);
ALTER TABLE prp.contratos_arrendamiento ADD CONSTRAINT "contratos_arrendamiento_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.contratos_documentos ADD CONSTRAINT "contratos_documentos_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES prp.contratos_arrendamiento(id);
ALTER TABLE prp.contratos_documentos ADD CONSTRAINT "contratos_documentos_subido_por_fkey" FOREIGN KEY (subido_por) REFERENCES prp.empleados(id);
ALTER TABLE prp.empleados ADD CONSTRAINT "empleados_rol_id_fkey" FOREIGN KEY (rol_id) REFERENCES prp.roles(id);
ALTER TABLE prp.estado_resultados_mensual ADD CONSTRAINT "estado_resultados_mensual_concepto_id_fkey" FOREIGN KEY (concepto_id) REFERENCES prp.edr_conceptos(id);
ALTER TABLE prp.fondo_revolvente_cierres ADD CONSTRAINT "fondo_revolvente_cierres_fondo_id_fkey" FOREIGN KEY (fondo_id) REFERENCES prp.fondos_revolventes(id);
ALTER TABLE prp.fondos_revolventes ADD CONSTRAINT "fondos_revolventes_responsable_id_fkey" FOREIGN KEY (responsable_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.gastos_operativos ADD CONSTRAINT "gastos_operativos_fondo_id_fkey" FOREIGN KEY (fondo_id) REFERENCES prp.fondos_revolventes(id);
ALTER TABLE prp.gastos_operativos ADD CONSTRAINT "gastos_operativos_grupo_id_fkey" FOREIGN KEY (grupo_id) REFERENCES prp.cat_grupo_gasto(id);
ALTER TABLE prp.movimientos_bancarios ADD CONSTRAINT "movimientos_bancarios_cobro_programado_id_fkey" FOREIGN KEY (cobro_programado_id) REFERENCES prp.cobros_programados(id);
ALTER TABLE prp.movimientos_bancarios ADD CONSTRAINT "movimientos_bancarios_sesion_id_fkey" FOREIGN KEY (sesion_id) REFERENCES prp.conciliaciones_sesiones(id);
ALTER TABLE prp.notas_contrato ADD CONSTRAINT "notas_contrato_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES prp.contratos_arrendamiento(id) ON DELETE CASCADE;
ALTER TABLE prp.pensiones_estacionamiento ADD CONSTRAINT "pensiones_estacionamiento_cajon_id_fkey" FOREIGN KEY (cajon_id) REFERENCES prp.cajones_estacionamiento(id);
ALTER TABLE prp.precios_unidad ADD CONSTRAINT "precios_unidad_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.presupuesto_mensual ADD CONSTRAINT "presupuesto_mensual_concepto_id_fkey" FOREIGN KEY (concepto_id) REFERENCES prp.edr_conceptos(id);
ALTER TABLE prp.prospectos_documentos ADD CONSTRAINT "prospectos_documentos_prospecto_id_fkey" FOREIGN KEY (prospecto_id) REFERENCES prp.prospectos(id);
ALTER TABLE prp.prospectos_tokens ADD CONSTRAINT "prospectos_tokens_prospecto_id_fkey" FOREIGN KEY (prospecto_id) REFERENCES prp.prospectos(id) ON DELETE CASCADE;
ALTER TABLE prp.prospectos ADD CONSTRAINT "prospectos_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.recibos_efectivo ADD CONSTRAINT "recibos_efectivo_arrendatario_id_fkey" FOREIGN KEY (arrendatario_id) REFERENCES prp.arrendatarios(id);
ALTER TABLE prp.recibos_efectivo ADD CONSTRAINT "recibos_efectivo_cobrador_id_fkey" FOREIGN KEY (cobrador_id) REFERENCES prp.empleados(id);
ALTER TABLE prp.recibos_efectivo ADD CONSTRAINT "recibos_efectivo_unidad_id_fkey" FOREIGN KEY (unidad_id) REFERENCES prp.unidades(id);
ALTER TABLE prp.unidades ADD CONSTRAINT "unidades_estatus_id_fkey" FOREIGN KEY (estatus_id) REFERENCES prp.cat_estado_general(id);
ALTER TABLE prp.unidades ADD CONSTRAINT "unidades_inmueble_id_fkey" FOREIGN KEY (inmueble_id) REFERENCES prp.inmuebles(id);
ALTER TABLE prp.vending_cierres_semanales ADD CONSTRAINT "vending_cierres_semanales_capturado_por_fkey" FOREIGN KEY (capturado_por) REFERENCES prp.empleados(id);
CREATE INDEX IF NOT EXISTS idx_bitacora_created ON prp.bitacora USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo ON prp.bitacora USING btree (modulo);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON prp.bitacora USING btree (usuario_id);
CREATE INDEX IF NOT EXISTS idx_cobros_contrato ON prp.cobros_programados USING btree (contrato_id);
CREATE INDEX IF NOT EXISTS idx_cobros_estatus ON prp.cobros_programados USING btree (estatus);
CREATE INDEX IF NOT EXISTS idx_cobros_fecha ON prp.cobros_programados USING btree (fecha_limite_pago);
CREATE INDEX IF NOT EXISTS idx_cobros_ref ON prp.cobros_programados USING btree (referencia_pago);
CREATE INDEX IF NOT EXISTS idx_contratos_arrendatario ON prp.contratos_arrendamiento USING btree (arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_unidad ON prp.contratos_arrendamiento USING btree (unidad_id);
CREATE INDEX IF NOT EXISTS idx_docs_entidad ON prp.documentos USING btree (entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_edr_anio_mes ON prp.estado_resultados_mensual USING btree (anio, mes);
CREATE INDEX IF NOT EXISTS idx_mov_ref ON prp.movimientos_bancarios USING btree (referencia_cruzada);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON prp.prospectos_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_unidades_inmueble ON prp.unidades USING btree (inmueble_id);

-- ============================================================
-- SCHEMA "public"
-- ============================================================

CREATE SCHEMA IF NOT EXISTS "public";
CREATE SEQUENCE IF NOT EXISTS "public"."ingresos_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."sat_subsidio_empleo_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."sat_tarifa_isr_id_seq";
CREATE SEQUENCE IF NOT EXISTS "public"."validacion_folio_seq";
CREATE TABLE IF NOT EXISTS "public"."aplicaciones_pago" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ingreso_id" bigint NOT NULL,
  "cargo_id" uuid NOT NULL,
  "importe_aplicado" numeric(14,2) NOT NULL,
  "fecha_aplicacion" date DEFAULT CURRENT_DATE,
  "nota" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."arrendatarios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre_negocio" text,
  "locatario" text NOT NULL,
  "rfc" text,
  "email" text,
  "telefono" text,
  "tipo_persona" text DEFAULT 'FISICA'::text,
  "estatus" text DEFAULT 'ACTIVO'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "doc_ine_url" text,
  "doc_comprobante_domicilio_url" text,
  "doc_comprobante_ingresos_url" text,
  "activo" boolean DEFAULT true NOT NULL,
  "nombre_razon_social" text,
  "domicilio" text,
  "auth_user_id" uuid,
  "domicilio_fiscal" text,
  "representante_legal" text,
  "logo_url" text
);
CREATE TABLE IF NOT EXISTS "public"."cargos_programados" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid,
  "unidad_id" uuid,
  "concepto" text NOT NULL,
  "descripcion" text,
  "periodo_mes" integer,
  "periodo_anio" integer,
  "importe" numeric(14,2) NOT NULL,
  "fecha_vencimiento" date NOT NULL,
  "estado" text DEFAULT 'PENDIENTE'::text,
  "origen_cargo_id" uuid,
  "generado_auto" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."cat_despachos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" text NOT NULL,
  "titular" text,
  "rfc" text,
  "email" text,
  "telefono" text,
  "celular" text,
  "domicilio" text,
  "ciudad" text DEFAULT 'Hermosillo'::text,
  "estado" text DEFAULT 'Sonora'::text,
  "especialidad" text,
  "notas" text,
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."cat_locales" (
  "id_local" text NOT NULL,
  "numero_local" text NOT NULL,
  "nivel" text DEFAULT 'PLANTA BAJA'::text,
  "ancho_m" numeric(8,4),
  "largo_m" numeric(8,4),
  "superficie_m2" numeric(8,4),
  "costo_m2" numeric(10,2),
  "renta_proyectada" numeric(12,2),
  "estatus" text DEFAULT 'DISPONIBLE'::text NOT NULL,
  "contrato_activo_id" uuid,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."cat_parametros" (
  "clave" text NOT NULL,
  "valor" text NOT NULL,
  "descripcion" text,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."cat_productos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" text NOT NULL,
  "nombre" text NOT NULL,
  "categoria" text NOT NULL,
  "unidad" text DEFAULT 'PZA'::text,
  "precio_ref" numeric(10,2),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "codigo_proveedor" text,
  "imagen_url" text
);
CREATE TABLE IF NOT EXISTS "public"."cat_productos_vending" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nombre" text NOT NULL,
  "precio_venta" numeric(8,2) DEFAULT 0 NOT NULL,
  "precio_costo" numeric(8,2) DEFAULT 0,
  "categoria" text,
  "activo" boolean DEFAULT true,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."cat_proveedores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" text NOT NULL,
  "nombre" text NOT NULL,
  "rfc" text,
  "categoria" text,
  "telefono" text,
  "email" text,
  "contacto" text,
  "notas" text,
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "logo_url" text
);
CREATE TABLE IF NOT EXISTS "public"."cat_tipo_deduccion" (
  "clave" text NOT NULL,
  "nombre" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."cat_tipo_otro_pago" (
  "clave" text NOT NULL,
  "nombre" text NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."cat_tipo_percepcion" (
  "clave" text NOT NULL,
  "nombre" text NOT NULL,
  "gravado_isr" boolean DEFAULT true,
  "gravado_imss" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "public"."comprobantes_pago" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "cobro_id" uuid,
  "arrendatario_id" uuid,
  "imagen_url" text,
  "imagen_path" text,
  "ocr_datos" jsonb DEFAULT '{}'::jsonb,
  "fecha_pago" date,
  "monto" numeric(12,2),
  "banco" text,
  "referencia" text,
  "forma_pago" text,
  "notas" text,
  "estado" text DEFAULT 'ENVIADO'::text NOT NULL,
  "nota_admin" text,
  "revisado_por" uuid,
  "revisado_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "public"."contratos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "numero_contrato" text,
  "arrendatario_id" uuid NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "renta_mensual" numeric(12,2) NOT NULL,
  "renta_sin_iva" numeric(12,2),
  "deposito_garantia" numeric(12,2),
  "dia_pago" integer DEFAULT 1,
  "penalizacion_pct" numeric(5,2) DEFAULT 5.00,
  "incremento_anual_pct" numeric(5,2),
  "estatus" text DEFAULT 'VIGENTE'::text NOT NULL,
  "contrato_pdf_url" text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "locales_referencia" text,
  "locales_display" text,
  "num_locales" integer DEFAULT 1,
  "contrato_origen_id" uuid,
  "despacho_id" uuid,
  "tipo_contrato" text DEFAULT 'ANUAL'::text,
  "giro_autorizado" text,
  "fiador_nombre" text,
  "fiador_rfc" text,
  "fiador_domicilio" text,
  "fiador_ife" text,
  "pagares_cantidad" integer DEFAULT 12,
  "cancelacion_anticipada_meses" integer DEFAULT 2,
  "periodo_gracia_meses" integer DEFAULT 0,
  "contrato_anterior_id" uuid,
  "estatus_proceso" text DEFAULT 'EN_EJECUCION'::text,
  "fiador_telefono" text,
  "estatus_operacion" text DEFAULT 'OCUPADO'::text NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."contratos_locales" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid NOT NULL,
  "local_id" text NOT NULL,
  "renta_asignada" numeric(12,2),
  "es_principal" boolean DEFAULT true,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."documentos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "entidad_tipo" text NOT NULL,
  "entidad_id" uuid NOT NULL,
  "tipo_doc" text NOT NULL,
  "url" text,
  "nombre_archivo" text,
  "estatus" text DEFAULT 'PENDIENTE'::text NOT NULL,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."er_mensual" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "anio" integer NOT NULL,
  "mes" integer NOT NULL,
  "status" text DEFAULT 'borrador'::text NOT NULL,
  "proy_rentas_contratos" numeric(14,2) DEFAULT 0,
  "proy_restaurant" numeric(14,2) DEFAULT 0,
  "proy_locales_vacantes" numeric(14,2) DEFAULT 0,
  "proy_estacionamiento" numeric(14,2) DEFAULT 0,
  "proy_pensiones" numeric(14,2) DEFAULT 0,
  "proy_maquinita" numeric(14,2) DEFAULT 0,
  "proy_agua_ingresos" numeric(14,2) DEFAULT 0,
  "real_rentas_factura" numeric(14,2) DEFAULT 0,
  "real_rentas_sin_factura" numeric(14,2) DEFAULT 0,
  "real_penalizaciones" numeric(14,2) DEFAULT 0,
  "real_iva" numeric(14,2) DEFAULT 0,
  "real_estacionamiento" numeric(14,2) DEFAULT 0,
  "real_pensiones" numeric(14,2) DEFAULT 0,
  "real_maquinita" numeric(14,2) DEFAULT 0,
  "real_agua_ingresos" numeric(14,2) DEFAULT 0,
  "proy_sueldos" numeric(14,2) DEFAULT 0,
  "proy_fondo_revolvente" numeric(14,2) DEFAULT 0,
  "proy_luz" numeric(14,2) DEFAULT 0,
  "proy_agua_gastos" numeric(14,2) DEFAULT 0,
  "proy_otros_gastos" numeric(14,2) DEFAULT 0,
  "real_sueldos" numeric(14,2) DEFAULT 0,
  "real_fondo_revolvente" numeric(14,2) DEFAULT 0,
  "real_gasto_excedente" numeric(14,2) DEFAULT 0,
  "real_luz" numeric(14,2) DEFAULT 0,
  "real_agua_gastos" numeric(14,2) DEFAULT 0,
  "real_otros_gastos" numeric(14,2) DEFAULT 0,
  "predial" numeric(14,2) DEFAULT 0,
  "transporte_residuos" numeric(14,2) DEFAULT 0,
  "licencia_estacionamiento" numeric(14,2) DEFAULT 0,
  "anuncio_publicitario" numeric(14,2) DEFAULT 0,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "real_rentas_factura_mes" numeric(14,2) DEFAULT 0,
  "real_rentas_factura_otros" numeric(14,2) DEFAULT 0,
  "real_rsf_mes" numeric(14,2) DEFAULT 0,
  "real_rsf_otros" numeric(14,2) DEFAULT 0,
  "real_penaliz_mes" numeric(14,2) DEFAULT 0,
  "real_penaliz_otros" numeric(14,2) DEFAULT 0,
  "real_estac_mes" numeric(14,2) DEFAULT 0,
  "real_estac_otros" numeric(14,2) DEFAULT 0,
  "real_pension_mes" numeric(14,2) DEFAULT 0,
  "real_pension_otros" numeric(14,2) DEFAULT 0,
  "real_maquinita_mes" numeric(14,2) DEFAULT 0,
  "real_maquinita_otros" numeric(14,2) DEFAULT 0,
  "real_agua_ing_mes" numeric(14,2) DEFAULT 0,
  "real_agua_ing_otros" numeric(14,2) DEFAULT 0,
  "proy_rsf" numeric(14,2) DEFAULT 0,
  "proy_penaliz" numeric(14,2) DEFAULT 0,
  "proy_iva" numeric(14,2) DEFAULT 0,
  "real_iva_mes" numeric(14,2) DEFAULT 0,
  "real_iva_otros" numeric(14,2) DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "public"."estacionamiento_diario" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha" date NOT NULL,
  "anio" integer,
  "mes" text,
  "dia_semana" text,
  "semana" text,
  "cantidad" numeric(10,2) NOT NULL,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."estacionamiento_pensiones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha" date NOT NULL,
  "semana_inicio" date,
  "local_referencia" text,
  "arrendatario_nombre" text,
  "monto" numeric(10,2) DEFAULT 0 NOT NULL,
  "num_recibo" text,
  "pagado" boolean DEFAULT true,
  "nota" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."gasto_detalle" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gasto_id" uuid NOT NULL,
  "producto_id" uuid,
  "descripcion" text NOT NULL,
  "categoria" text,
  "cantidad" numeric(10,3) DEFAULT 1 NOT NULL,
  "precio_unit" numeric(10,2) NOT NULL,
  "subtotal" numeric(12,2) GENERATED ALWAYS AS (round((cantidad * precio_unit), 2)) STORED,
  "created_at" timestamp with time zone DEFAULT now(),
  "codigo_proveedor" text
);
CREATE TABLE IF NOT EXISTS "public"."gastos_operativos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha" date NOT NULL,
  "proveedor" text,
  "grupo_gasto" text,
  "descripcion" text,
  "cantidad" numeric(10,2) NOT NULL,
  "anio" integer,
  "mes" text,
  "dia_semana" text,
  "semana" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "semana_inicio" date,
  "grupo_clave" text,
  "proveedor_nombre" text,
  "monto_pagado" numeric(10,2),
  "monto_comprobante" numeric(10,2),
  "tiene_factura" boolean DEFAULT false,
  "proveedor_id" uuid,
  "ticket_total" numeric(12,2),
  "ticket_img_url" text,
  "tipo_compra" text,
  "ticket_url" text
);
CREATE TABLE IF NOT EXISTS "public"."ingresos" (
  "id" bigint DEFAULT nextval('ingresos_id_seq'::regclass) NOT NULL,
  "fecha" date,
  "id_contrato" text,
  "local_id" text,
  "locales_contrato" text,
  "es_principal" boolean DEFAULT true,
  "propietario" text,
  "tipo" text DEFAULT 'RENTA'::text NOT NULL,
  "mes" integer NOT NULL,
  "anio" integer NOT NULL,
  "factura" text,
  "importe" numeric(14,2),
  "origen" text,
  "concepto_origen" text,
  "nota" text,
  "creado_por" text DEFAULT 'SISTEMA'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "cobro_id" uuid,
  "tipo_concepto" text,
  "forma_pago" text,
  "referencia_banco" text,
  "factura_numero" text,
  "factura_serie" text,
  "factura_pdf_url" text,
  "factura_xml_url" text,
  "comprobante_url" text,
  "contrato_id" uuid,
  "importe_total" numeric(14,2),
  "estatus_validacion" text DEFAULT 'POR_VALIDAR'::text NOT NULL,
  "validado_por" text,
  "validado_en" timestamp with time zone,
  "clasificacion" text,
  "clasificacion_manual" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."irp_roles" (
  "id" text NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text,
  "nivel" integer DEFAULT 50 NOT NULL,
  "activo" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."irp_usuarios" (
  "id" uuid NOT NULL,
  "rol_id" text NOT NULL,
  "nombre" text NOT NULL,
  "apellido" text,
  "telefono" text,
  "avatar_url" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "contrato_id" uuid
);
CREATE TABLE IF NOT EXISTS "public"."nomina_deducciones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nomina_emp_id" uuid NOT NULL,
  "tipo_deduccion" text NOT NULL,
  "concepto" text NOT NULL,
  "importe" numeric(12,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."nomina_empleado" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "periodo_id" uuid NOT NULL,
  "empleado_id" uuid NOT NULL,
  "contrato_id" uuid,
  "dias_periodo" numeric(5,2) NOT NULL,
  "dias_trabajados" numeric(5,2) NOT NULL,
  "dias_falta" numeric(5,2) DEFAULT 0,
  "dias_vacaciones" numeric(5,2) DEFAULT 0,
  "dias_incapacidad" numeric(5,2) DEFAULT 0,
  "horas_extra_dobles" numeric(6,2) DEFAULT 0,
  "horas_extra_triples" numeric(6,2) DEFAULT 0,
  "salario_diario" numeric(10,2) NOT NULL,
  "salario_periodo" numeric(12,2) NOT NULL,
  "total_percepciones" numeric(14,2) DEFAULT 0,
  "total_deducciones" numeric(14,2) DEFAULT 0,
  "total_otros_pagos" numeric(14,2) DEFAULT 0,
  "neto_pagar" numeric(14,2) DEFAULT 0,
  "isr_base_mensual" numeric(12,2) DEFAULT 0,
  "isr_periodo" numeric(10,2) DEFAULT 0,
  "subsidio_empleo" numeric(10,2) DEFAULT 0,
  "isr_a_retener" numeric(10,2) DEFAULT 0,
  "imss_obrero" numeric(10,2) DEFAULT 0,
  "uuid_cfdi" text,
  "xml_cfdi" text,
  "pdf_base64" text,
  "fecha_timbrado" timestamp with time zone,
  "estatus_cfdi" text DEFAULT 'PENDIENTE'::text,
  "error_timbrado" text,
  "ajustado_manual" boolean DEFAULT false,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."nomina_otros_pagos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nomina_emp_id" uuid NOT NULL,
  "tipo_otro_pago" text NOT NULL,
  "concepto" text NOT NULL,
  "importe" numeric(12,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."nomina_percepciones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "nomina_emp_id" uuid NOT NULL,
  "tipo_percepcion" text NOT NULL,
  "concepto" text NOT NULL,
  "importe_gravado" numeric(12,2) DEFAULT 0,
  "importe_exento" numeric(12,2) DEFAULT 0,
  "horas_extra" numeric(6,2),
  "dias_pagados" numeric(5,2),
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."nomina_periodos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "folio" text NOT NULL,
  "periodicidad" text NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "fecha_pago" date NOT NULL,
  "tipo_nomina" text DEFAULT 'O'::text,
  "descripcion" text,
  "estado" text DEFAULT 'BORRADOR'::text,
  "total_empleados" integer DEFAULT 0,
  "total_percepciones" numeric(14,2) DEFAULT 0,
  "total_deducciones" numeric(14,2) DEFAULT 0,
  "total_neto" numeric(14,2) DEFAULT 0,
  "autorizado_por" uuid,
  "autorizado_at" timestamp with time zone,
  "notas" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."notas_contrato" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid,
  "texto" text NOT NULL,
  "tipo" text DEFAULT 'NOTA'::text,
  "autor_nombre" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."ordenes_trabajo" (
  "id" text NOT NULL,
  "tipo" text NOT NULL,
  "categoria" text,
  "inmueble" text,
  "area" text,
  "descripcion" text NOT NULL,
  "prioridad" text DEFAULT 'MEDIA'::text NOT NULL,
  "asignado" text,
  "estado" text DEFAULT 'PENDIENTE'::text NOT NULL,
  "fecha_apertura" date,
  "fecha_cierre_est" date,
  "fecha_cierre_real" date,
  "costo_est" numeric(12,2),
  "costo_real" numeric(12,2),
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "evidencias" jsonb DEFAULT '[]'::jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."pagos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contrato_id" uuid NOT NULL,
  "local_id" text NOT NULL,
  "referencia" text NOT NULL,
  "folio_interno" text,
  "mes_pago" integer NOT NULL,
  "anio_pago" integer NOT NULL,
  "mes_contrato" integer NOT NULL,
  "monto" numeric(12,2) NOT NULL,
  "monto_iva" numeric(12,2),
  "fecha_vencimiento" date NOT NULL,
  "fecha_pago" date,
  "banco" text,
  "referencia_bancaria" text,
  "estatus" text DEFAULT 'PENDIENTE'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."prospecto_documentos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "persona_id" uuid NOT NULL,
  "tipo_doc" text NOT NULL,
  "storage_path" text,
  "nombre_archivo" text,
  "mime_type" text,
  "tamano_bytes" bigint,
  "estado" text DEFAULT 'PENDIENTE'::text NOT NULL,
  "nota_rechazo" text,
  "subido_at" timestamp with time zone,
  "revisado_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."prospecto_historial" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prospecto_id" uuid NOT NULL,
  "etapa_anterior" text,
  "etapa_nueva" text NOT NULL,
  "nota" text,
  "usuario_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."prospecto_magic_links" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "persona_id" uuid NOT NULL,
  "token" text DEFAULT encode(gen_random_bytes(32), 'hex'::text) NOT NULL,
  "email_destino" text NOT NULL,
  "enviado_at" timestamp with time zone DEFAULT now(),
  "expira_at" timestamp with time zone DEFAULT (now() + '7 days'::interval),
  "usado_at" timestamp with time zone,
  "activo" boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS "public"."prospecto_personas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "prospecto_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "nombre_completo" text,
  "fecha_nacimiento" date,
  "curp" text,
  "rfc" text,
  "email" text,
  "tel_casa" text,
  "cel" text,
  "calle" text,
  "no_ext" text,
  "no_int" text,
  "edificio" text,
  "colonia" text,
  "municipio" text,
  "estado_domicilio" text,
  "cp" text,
  "estado_civil" text,
  "regimen_matrimonial" text,
  "nombre_conyuge" text,
  "empresa" text,
  "antiguedad_empresa" text,
  "ingreso_mensual" numeric(12,2),
  "puesto" text,
  "domicilio_empresa" text,
  "garantia_calle" text,
  "garantia_entre_calles" text,
  "garantia_colonia" text,
  "garantia_municipio" text,
  "garantia_estado" text,
  "garantia_cp" text,
  "escritura_no" text,
  "escritura_fecha" date,
  "escritura_notario" text,
  "escritura_datos_registrales" text,
  "escritura_fecha_registro" date,
  "solicitud_firmada" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "datos_solicitud" jsonb DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS "public"."prospectos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "unidad_id" uuid,
  "inmueble_id" uuid,
  "folio" text GENERATED ALWAYS AS (('PROS-'::text || substr((id)::text, 1, 8))) STORED,
  "nombre_negocio" text,
  "renta_propuesta" numeric(12,2),
  "fecha_contacto" date DEFAULT CURRENT_DATE NOT NULL,
  "etapa" text DEFAULT 'CONTACTO'::text NOT NULL,
  "motivo_rechazo" text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "despacho_id" uuid,
  "ruta_elaboracion" text DEFAULT 'ADMIN'::text
);
CREATE TABLE IF NOT EXISTS "public"."restaurante_gasto_detalle" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gasto_id" uuid,
  "sku" text,
  "descripcion" text,
  "cantidad" numeric(10,3),
  "precio_unit" numeric(12,2),
  "subtotal_linea" numeric(12,2),
  "tasa_impuesto" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."restaurante_gastos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "fecha" date NOT NULL,
  "mes" integer,
  "anio" integer,
  "proveedor" text,
  "razon_social" text,
  "rfc" text,
  "folio" text,
  "subtotal" numeric(12,2),
  "iva" numeric(12,2),
  "total" numeric(12,2),
  "ticket_url" text,
  "tiene_factura" boolean DEFAULT false,
  "grupo_gasto" text,
  "descripcion" text,
  "notas" text
);
CREATE TABLE IF NOT EXISTS "public"."rh_asistencia" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid,
  "numero_empleado_ext" text,
  "empleado_nombre" text,
  "fecha" date NOT NULL,
  "hora_entrada" time without time zone,
  "hora_salida" time without time zone,
  "minutos_trabajados" integer,
  "minutos_retardo" integer DEFAULT 0,
  "estado" text DEFAULT 'PRESENTE'::text,
  "notas" text,
  "fuente" text DEFAULT 'MANUAL'::text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_beneficios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "descripcion" text,
  "monto" numeric(12,2),
  "periodicidad" text DEFAULT 'MENSUAL'::text,
  "activo" boolean DEFAULT true,
  "fecha_inicio" date,
  "fecha_fin" date,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_candidatos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "vacante_id" uuid,
  "nombre" text NOT NULL,
  "apellidos" text,
  "email" text,
  "telefono" text,
  "etapa" text DEFAULT 'NUEVO'::text,
  "token_docs" text DEFAULT encode(gen_random_bytes(16), 'hex'::text),
  "fecha_aplicacion" date DEFAULT CURRENT_DATE,
  "fecha_entrevista" timestamp with time zone,
  "fecha_respuesta" date,
  "motivo_rechazo" text,
  "notas" text,
  "empleado_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_capacitacion" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "nombre" text NOT NULL,
  "tipo" text DEFAULT 'INTERNA'::text,
  "institucion" text,
  "fecha_inicio" date,
  "fecha_fin" date,
  "horas" numeric(6,1),
  "resultado" text,
  "constancia_url" text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_checadas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid,
  "numero_empleado_ext" text,
  "operacion" text NOT NULL,
  "fecha_hora" timestamp without time zone NOT NULL,
  "fecha" date GENERATED ALWAYS AS ((fecha_hora)::date) STORED,
  "origen" text DEFAULT 'MANUAL'::text NOT NULL,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_contratos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "tipo_contrato" text DEFAULT 'TEMPORAL_3SEM'::text NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date,
  "salario_diario" numeric(10,4),
  "activo" boolean DEFAULT true,
  "renovado_de" uuid,
  "documento_url" text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "periodicidad_pago" text DEFAULT 'QUINCENAL'::text
);
CREATE TABLE IF NOT EXISTS "public"."rh_documentos_empleado" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "tipo_doc" text NOT NULL,
  "url" text,
  "nombre_archivo" text,
  "vigencia" date,
  "uploaded_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_empleados" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "numero_empleado" text,
  "nombre" text NOT NULL,
  "apellido_pat" text NOT NULL,
  "apellido_mat" text,
  "sexo" character(1) DEFAULT 'M'::bpchar,
  "fecha_nacimiento" date,
  "rfc" text,
  "curp" text,
  "nss" text,
  "email" text,
  "celular" text,
  "direccion" text,
  "puesto" text,
  "area" text,
  "departamento" text,
  "fecha_ingreso" date DEFAULT CURRENT_DATE NOT NULL,
  "salario_diario" numeric(10,2),
  "foto_url" text,
  "estado_id" text DEFAULT 'ACTIVO'::text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "periodicidad_pago" text DEFAULT 'QUINCENAL'::text,
  "banco" text,
  "cuenta_clabe" text,
  "horario_trabajo" text,
  "dia_descanso" text,
  "forma_pago" text DEFAULT 'TRANSFERENCIA'::text,
  "centro_trabajo" text,
  "supervisor" text,
  "tipo_jornada" text,
  "calle" text,
  "numero_ext" text,
  "numero_int" text,
  "colonia" text,
  "municipio" text,
  "estado_domicilio" text,
  "codigo_postal" text,
  "referencias_domicilio" text,
  "telefono_fijo" text,
  "contacto_emergencia_nombre" text,
  "contacto_emergencia_telefono" text,
  "contacto_emergencia_parentesco" text,
  "estado_civil" text,
  "escolaridad" text,
  "nacionalidad" text,
  "lugar_nacimiento" text,
  "tipo_contratacion" text DEFAULT 'Indeterminado'::text,
  "bono" numeric DEFAULT 0,
  "forma_pago_bono" text DEFAULT 'TRANSFERENCIA'::text,
  "hora_entrada_prog" time without time zone,
  "hora_salida_prog" time without time zone,
  "cruza_medianoche" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."rh_evaluaciones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "periodo" text NOT NULL,
  "tipo" text DEFAULT 'ANUAL'::text,
  "calificacion" numeric(4,1),
  "nivel" text,
  "evaluador" text,
  "fortalezas" text,
  "areas_mejora" text,
  "fecha" date,
  "archivo_url" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_expediente_documentos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "nombre" text NOT NULL,
  "archivo_url" text,
  "archivo_path" text,
  "tamano_kb" integer,
  "formato" text,
  "fecha_doc" date,
  "vence" date,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_historial_cambios" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "tipo" text NOT NULL,
  "campo" text,
  "valor_anterior" text,
  "valor_nuevo" text,
  "motivo" text,
  "fecha" date DEFAULT CURRENT_DATE,
  "usuario_ref" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_historial_nombre" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "fecha" date DEFAULT CURRENT_DATE NOT NULL,
  "nombre_anterior" text,
  "nombre_nuevo" text NOT NULL,
  "motivo" text,
  "usuario_ref" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_historial_sueldo" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "fecha" date DEFAULT CURRENT_DATE NOT NULL,
  "sueldo_anterior" numeric(12,2),
  "sueldo_nuevo" numeric(12,2) NOT NULL,
  "motivo" text,
  "tipo" text DEFAULT 'AJUSTE'::text,
  "usuario_ref" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "fecha_fin" date
);
CREATE TABLE IF NOT EXISTS "public"."rh_incidencias" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "fecha" date NOT NULL,
  "tipo" text DEFAULT 'INASISTENCIA'::text NOT NULL,
  "descripcion" text,
  "afecta_nomina" boolean DEFAULT true NOT NULL,
  "semana_inicio" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" text DEFAULT 'SISTEMA'::text,
  "tipo_id" uuid,
  "fecha_fin" date,
  "monto" numeric(12,2)
);
CREATE TABLE IF NOT EXISTS "public"."rh_tipos_incidencia" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" text NOT NULL,
  "descripcion" text NOT NULL,
  "afecta_nomina" boolean DEFAULT true NOT NULL,
  "requiere_monto" boolean DEFAULT false NOT NULL,
  "orden" integer DEFAULT 99 NOT NULL,
  "activo" boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."rh_turnos_guardia" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha" date NOT NULL,
  "empleado_id" uuid NOT NULL,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_vacaciones_anio" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "anio" integer NOT NULL,
  "dias_derecho" numeric(5,1) DEFAULT 12 NOT NULL,
  "dias_tomados" numeric(5,1) DEFAULT 0 NOT NULL,
  "dias_disponibles" numeric(5,1) GENERATED ALWAYS AS ((dias_derecho - dias_tomados)) STORED,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_vacaciones_detalle" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "empleado_id" uuid NOT NULL,
  "anio" integer NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "dias" numeric(5,1) NOT NULL,
  "monto" numeric(12,2),
  "prima" numeric(12,2),
  "estado" text DEFAULT 'TOMADA'::text NOT NULL,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."rh_vacantes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "area" text,
  "departamento" text,
  "num_plazas" integer DEFAULT 1,
  "descripcion" text,
  "perfil_requerido" text,
  "salario_min" numeric(10,2),
  "salario_max" numeric(10,2),
  "tipo_contrato" text DEFAULT 'TEMPORAL_3SEM'::text,
  "fecha_apertura" date DEFAULT CURRENT_DATE,
  "fecha_cierre" date,
  "status" text DEFAULT 'ABIERTA'::text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."sat_subsidio_empleo" (
  "id" integer DEFAULT nextval('sat_subsidio_empleo_id_seq'::regclass) NOT NULL,
  "anio" integer DEFAULT 2026 NOT NULL,
  "limite_inferior" numeric(14,4) NOT NULL,
  "limite_superior" numeric(14,4),
  "subsidio_mensual" numeric(12,4) NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."sat_tarifa_isr" (
  "id" integer DEFAULT nextval('sat_tarifa_isr_id_seq'::regclass) NOT NULL,
  "anio" integer DEFAULT 2026 NOT NULL,
  "limite_inferior" numeric(14,4) NOT NULL,
  "limite_superior" numeric(14,4),
  "cuota_fija" numeric(14,4) NOT NULL,
  "tasa_excedente" numeric(8,6) NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."validacion_adjuntos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reporte_id" uuid NOT NULL,
  "archivo_path" text NOT NULL,
  "nombre" text,
  "mime" text,
  "tamano_kb" integer,
  "orden" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."validacion_puntos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "clave" text NOT NULL,
  "modulo" text NOT NULL,
  "ruta" text,
  "orden" integer DEFAULT 0 NOT NULL,
  "titulo" text NOT NULL,
  "descripcion" text,
  "donde" text,
  "critico" boolean DEFAULT false NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."validacion_reportes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "folio" text DEFAULT ('RV-'::text || lpad((nextval('validacion_folio_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
  "punto_id" uuid,
  "modulo" text NOT NULL,
  "titulo" text NOT NULL,
  "pasos" text,
  "esperado" text,
  "obtenido" text,
  "severidad" text DEFAULT 'MEDIA'::text NOT NULL,
  "estado" text DEFAULT 'ABIERTO'::text NOT NULL,
  "reportado_por" text,
  "resolucion" text,
  "resuelto_en" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."validacion_revisiones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "punto_id" uuid NOT NULL,
  "estado" text DEFAULT 'PENDIENTE'::text NOT NULL,
  "notas" text,
  "revisado_por" text,
  "revisado_en" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."vending_inventario_semanal" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "anio" integer,
  "semana_num" integer,
  "producto_id" uuid,
  "producto_nombre" text NOT NULL,
  "compras_unidades" integer DEFAULT 0,
  "inventario_unidades" integer DEFAULT 0,
  "ventas_unidades" integer DEFAULT 0,
  "ventas_monto" numeric(10,2) DEFAULT 0,
  "utilidad_semana" numeric(10,2) DEFAULT 0,
  "semanas_inventario" numeric(6,2),
  "status" text DEFAULT 'ACTIVO'::text,
  "notas" text,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."vending_movimientos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "semana_id" uuid NOT NULL,
  "producto_id" uuid NOT NULL,
  "fecha" date NOT NULL,
  "tipo" text NOT NULL,
  "cantidad" numeric(10,2) NOT NULL,
  "precio_unitario" numeric(10,2) NOT NULL,
  "importe" numeric(10,2) GENERATED ALWAYS AS ((cantidad * precio_unitario)) STORED,
  "proveedor" text,
  "nota" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "semana_producto_id" uuid
);
CREATE TABLE IF NOT EXISTS "public"."vending_productos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "producto" text NOT NULL,
  "costo_caja" numeric(10,2),
  "unidades_caja" integer,
  "precio_proveedor" numeric(10,4),
  "precio_venta" numeric(10,2),
  "utilidad_por_pieza" numeric(10,4),
  "activo" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "proveedor" text,
  "orden" integer DEFAULT 0,
  "descripcion" text,
  "codigo_proveedor" text
);
CREATE TABLE IF NOT EXISTS "public"."vending_semana_producto" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "semana_id" uuid NOT NULL,
  "producto_id" uuid NOT NULL,
  "qty_inicial" numeric(10,2) DEFAULT 0 NOT NULL,
  "qty_compras" numeric(10,2) DEFAULT 0 NOT NULL,
  "qty_ventas" numeric(10,2) DEFAULT 0 NOT NULL,
  "qty_final" numeric(10,2) GENERATED ALWAYS AS (((qty_inicial + qty_compras) - qty_ventas)) STORED,
  "precio_compra_semana" numeric(10,2) DEFAULT 0 NOT NULL,
  "precio_venta_semana" numeric(10,2) DEFAULT 0 NOT NULL,
  "importe_compras" numeric(10,2) DEFAULT 0 NOT NULL,
  "importe_ventas" numeric(10,2) DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "public"."vending_semanas" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "semana_label" text NOT NULL,
  "fecha_inicio" date,
  "producto" text NOT NULL,
  "compras" integer DEFAULT 0,
  "inventario_ini" integer DEFAULT 0,
  "inventario_fin" integer DEFAULT 0,
  "venta_unidades" integer DEFAULT 0,
  "venta_pesos" numeric(10,2) DEFAULT 0,
  "utilidad" numeric(10,2) DEFAULT 0,
  "semanas_inv" numeric(10,4),
  "baja" boolean DEFAULT false,
  "nota" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "residual_pesos" numeric(10,2) DEFAULT 0,
  "es_material" boolean DEFAULT false,
  "fecha_fin" date,
  "estado" text DEFAULT 'ABIERTA'::text NOT NULL,
  "reporte_url" text
);
ALTER SEQUENCE "public"."ingresos_id_seq" OWNED BY "public"."ingresos"."id";
ALTER SEQUENCE "public"."sat_subsidio_empleo_id_seq" OWNED BY "public"."sat_subsidio_empleo"."id";
ALTER SEQUENCE "public"."sat_tarifa_isr_id_seq" OWNED BY "public"."sat_tarifa_isr"."id";
ALTER TABLE aplicaciones_pago ADD CONSTRAINT "aplicaciones_pago_importe_aplicado_check" CHECK ((importe_aplicado > (0)::numeric));
ALTER TABLE arrendatarios ADD CONSTRAINT "arrendatarios_estatus_check" CHECK ((estatus = ANY (ARRAY['ACTIVO'::text, 'INACTIVO'::text, 'LISTA_NEGRA'::text])));
ALTER TABLE arrendatarios ADD CONSTRAINT "arrendatarios_tipo_persona_check" CHECK ((tipo_persona = ANY (ARRAY['FISICA'::text, 'MORAL'::text])));
ALTER TABLE cargos_programados ADD CONSTRAINT "cargos_programados_concepto_check" CHECK ((concepto = ANY (ARRAY['RENTA'::text, 'SANCION'::text, 'MANTENIMIENTO'::text, 'AGUA'::text, 'OTRO'::text])));
ALTER TABLE cargos_programados ADD CONSTRAINT "cargos_programados_estado_check" CHECK ((estado = ANY (ARRAY['PENDIENTE'::text, 'PARCIAL'::text, 'PAGADO'::text, 'CANCELADO'::text])));
ALTER TABLE cargos_programados ADD CONSTRAINT "cargos_programados_periodo_mes_check" CHECK (((periodo_mes >= 1) AND (periodo_mes <= 12)));
ALTER TABLE cat_locales ADD CONSTRAINT "cat_locales_estatus_check" CHECK ((estatus = ANY (ARRAY['DISPONIBLE'::text, 'OCUPADO'::text, 'EN_OBRA'::text, 'BLOQUEADO'::text, 'RESCISION'::text])));
ALTER TABLE cat_locales ADD CONSTRAINT "cat_locales_nivel_check" CHECK ((nivel = ANY (ARRAY['PLANTA BAJA'::text, 'PLANTA ALTA'::text, 'MEZZANINE'::text])));
ALTER TABLE cat_productos ADD CONSTRAINT "cat_productos_categoria_check" CHECK ((categoria = ANY (ARRAY['VENDING'::text, 'OPERACION'::text, 'MANTENIMIENTO'::text])));
ALTER TABLE cat_productos_vending ADD CONSTRAINT "cat_productos_vending_categoria_check" CHECK ((categoria = ANY (ARRAY['snack'::text, 'bebida'::text, 'otro'::text])));
ALTER TABLE cat_proveedores ADD CONSTRAINT "cat_proveedores_categoria_check" CHECK ((categoria = ANY (ARRAY['VENDING'::text, 'OPERACION'::text, 'MANTENIMIENTO'::text, 'MIXTO'::text])));
ALTER TABLE comprobantes_pago ADD CONSTRAINT "comprobantes_pago_estado_check" CHECK ((estado = ANY (ARRAY['ENVIADO'::text, 'REVISADO'::text, 'APLICADO'::text, 'RECHAZADO'::text])));
ALTER TABLE contratos ADD CONSTRAINT "contratos_dia_pago_check" CHECK (((dia_pago >= 1) AND (dia_pago <= 28)));
ALTER TABLE contratos ADD CONSTRAINT "contratos_estatus_check" CHECK ((estatus = ANY (ARRAY['VIGENTE'::text, 'VENCIDO'::text, 'RESCISION'::text, 'RENOVADO'::text, 'CANCELADO'::text, 'BORRADOR'::text])));
ALTER TABLE contratos ADD CONSTRAINT "contratos_estatus_operacion_chk" CHECK ((estatus_operacion = ANY (ARRAY['OCUPADO'::text, 'DESOCUPADO'::text])));
ALTER TABLE contratos ADD CONSTRAINT "contratos_estatus_proceso_check" CHECK ((estatus_proceso = ANY (ARRAY['EN_CONTRATACION'::text, 'EN_RENOVACION'::text, 'EN_EJECUCION'::text])));
ALTER TABLE contratos ADD CONSTRAINT "contratos_tipo_contrato_check" CHECK ((tipo_contrato = ANY (ARRAY['ANUAL'::text, 'SEMESTRAL'::text, 'MENSUAL'::text, 'EVENTUAL'::text])));
ALTER TABLE documentos ADD CONSTRAINT "documentos_estatus_chk" CHECK ((estatus = ANY (ARRAY['PENDIENTE'::text, 'APROBADO'::text, 'RECHAZADO'::text])));
ALTER TABLE er_mensual ADD CONSTRAINT "er_mensual_mes_check" CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE gasto_detalle ADD CONSTRAINT "gasto_detalle_categoria_check" CHECK ((categoria = ANY (ARRAY['VENDING'::text, 'OPERACION'::text, 'MANTENIMIENTO'::text])));
ALTER TABLE gastos_operativos ADD CONSTRAINT "gastos_operativos_tipo_compra_check" CHECK ((tipo_compra = ANY (ARRAY['VENDING'::text, 'MANTENIMIENTO'::text, 'CONSUMO'::text])));
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_anio_check" CHECK (((anio >= 2020) AND (anio <= 2099)));
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_clasificacion_chk" CHECK (((clasificacion IS NULL) OR (clasificacion = ANY (ARRAY['RENTA'::text, 'SANCION'::text, 'AGUA'::text, 'OTRO'::text, 'MIXTO'::text]))));
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_estatus_validacion_chk" CHECK ((estatus_validacion = ANY (ARRAY['POR_VALIDAR'::text, 'VALIDADO'::text, 'OBSERVADO'::text])));
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_mes_check" CHECK (((mes >= 1) AND (mes <= 12)));
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_tipo_check" CHECK ((tipo = ANY (ARRAY['RENTA'::text, 'SANCION'::text, 'AGUA'::text, 'OTRO'::text])));
ALTER TABLE nomina_empleado ADD CONSTRAINT "nomina_empleado_estatus_cfdi_check" CHECK ((estatus_cfdi = ANY (ARRAY['PENDIENTE'::text, 'TIMBRADO'::text, 'ERROR'::text, 'CANCELADO'::text])));
ALTER TABLE nomina_periodos ADD CONSTRAINT "nomina_periodos_estado_check" CHECK ((estado = ANY (ARRAY['BORRADOR'::text, 'CALCULADA'::text, 'AUTORIZADA'::text, 'TIMBRADA'::text, 'CANCELADA'::text])));
ALTER TABLE nomina_periodos ADD CONSTRAINT "nomina_periodos_periodicidad_check" CHECK ((periodicidad = ANY (ARRAY['SEMANAL'::text, 'QUINCENAL'::text, 'MENSUAL'::text])));
ALTER TABLE nomina_periodos ADD CONSTRAINT "nomina_periodos_tipo_nomina_check" CHECK ((tipo_nomina = ANY (ARRAY['O'::text, 'E'::text])));
ALTER TABLE pagos ADD CONSTRAINT "pagos_estatus_check" CHECK ((estatus = ANY (ARRAY['PAGADO'::text, 'PENDIENTE'::text, 'VENCIDO'::text, 'CANCELADO'::text])));
ALTER TABLE prospecto_documentos ADD CONSTRAINT "prospecto_documentos_estado_check" CHECK ((estado = ANY (ARRAY['PENDIENTE'::text, 'SUBIDO'::text, 'APROBADO'::text, 'RECHAZADO'::text])));
ALTER TABLE prospecto_documentos ADD CONSTRAINT "prospecto_documentos_tipo_doc_check" CHECK ((tipo_doc = ANY (ARRAY['INE_FRENTE'::text, 'INE_REVERSO'::text, 'PASAPORTE'::text, 'COMPROBANTE_INGRESOS_1'::text, 'COMPROBANTE_INGRESOS_2'::text, 'COMPROBANTE_INGRESOS_3'::text, 'COMPROBANTE_DOMICILIO'::text, 'ESCRITURA_INMUEBLE'::text, 'SOLICITUD_FIRMADA'::text])));
ALTER TABLE prospecto_personas ADD CONSTRAINT "prospecto_personas_estado_civil_check" CHECK ((estado_civil = ANY (ARRAY['SOLTERO'::text, 'CASADO'::text, 'UNION_LIBRE'::text, 'DIVORCIADO'::text, 'VIUDO'::text])));
ALTER TABLE prospecto_personas ADD CONSTRAINT "prospecto_personas_regimen_matrimonial_check" CHECK ((regimen_matrimonial = ANY (ARRAY['BIENES_SEPARADOS'::text, 'SOCIEDAD_CONYUGAL'::text])));
ALTER TABLE prospecto_personas ADD CONSTRAINT "prospecto_personas_tipo_check" CHECK ((tipo = ANY (ARRAY['INQUILINO'::text, 'FIADOR'::text, 'OBLIGADO_SOLIDARIO'::text])));
ALTER TABLE prospectos ADD CONSTRAINT "prospectos_etapa_check" CHECK ((etapa = ANY (ARRAY['CONTACTO'::text, 'CANDIDATO'::text, 'DOCS_PENDIENTES'::text, 'DOCS_COMPLETOS'::text, 'INVESTIGACION'::text, 'APROBADO'::text, 'RECHAZADO'::text, 'CONTRATO'::text])));
ALTER TABLE prospectos ADD CONSTRAINT "prospectos_ruta_elaboracion_check" CHECK ((ruta_elaboracion = ANY (ARRAY['ADMIN'::text, 'DESPACHO'::text])));
ALTER TABLE rh_checadas ADD CONSTRAINT "rh_checadas_operacion_check" CHECK ((operacion = ANY (ARRAY['ENTRADA'::text, 'SALIDA'::text])));
ALTER TABLE rh_contratos ADD CONSTRAINT "rh_contratos_periodicidad_pago_check" CHECK ((periodicidad_pago = ANY (ARRAY['SEMANAL'::text, 'QUINCENAL'::text, 'MENSUAL'::text])));
ALTER TABLE rh_empleados ADD CONSTRAINT "rh_empleados_forma_pago_bono_check" CHECK ((forma_pago_bono = ANY (ARRAY['TRANSFERENCIA'::text, 'EFECTIVO'::text])));
ALTER TABLE rh_empleados ADD CONSTRAINT "rh_empleados_forma_pago_check" CHECK ((forma_pago = ANY (ARRAY['TRANSFERENCIA'::text, 'EFECTIVO'::text, 'MIXTO'::text])));
ALTER TABLE rh_empleados ADD CONSTRAINT "rh_empleados_periodicidad_pago_check" CHECK ((periodicidad_pago = ANY (ARRAY['SEMANAL'::text, 'QUINCENAL'::text, 'MENSUAL'::text])));
ALTER TABLE rh_empleados ADD CONSTRAINT "rh_empleados_tipo_contratacion_check" CHECK ((tipo_contratacion = ANY (ARRAY['Por tiempo determinado'::text, 'Indeterminado'::text, 'Por obra'::text])));
ALTER TABLE rh_incidencias ADD CONSTRAINT "rh_incidencias_tipo_check" CHECK ((tipo = ANY (ARRAY['INASISTENCIA'::text, 'RETARDO'::text, 'PERMISO_CON_GOCE'::text, 'PERMISO_SIN_GOCE'::text, 'VACACIONES'::text, 'INCAPACIDAD'::text])));
ALTER TABLE rh_vacaciones_detalle ADD CONSTRAINT "rh_vacaciones_detalle_check" CHECK ((fecha_fin >= fecha_inicio));
ALTER TABLE rh_vacaciones_detalle ADD CONSTRAINT "rh_vacaciones_detalle_estado_check" CHECK ((estado = ANY (ARRAY['SOLICITADA'::text, 'AUTORIZADA'::text, 'TOMADA'::text, 'CANCELADA'::text])));
ALTER TABLE validacion_reportes ADD CONSTRAINT "validacion_reportes_estado_check" CHECK ((estado = ANY (ARRAY['ABIERTO'::text, 'EN_REVISION'::text, 'RESUELTO'::text, 'DESCARTADO'::text])));
ALTER TABLE validacion_reportes ADD CONSTRAINT "validacion_reportes_severidad_check" CHECK ((severidad = ANY (ARRAY['BLOQUEA'::text, 'ALTA'::text, 'MEDIA'::text, 'BAJA'::text])));
ALTER TABLE validacion_revisiones ADD CONSTRAINT "validacion_revisiones_estado_check" CHECK ((estado = ANY (ARRAY['PENDIENTE'::text, 'CORRECTO'::text, 'CON_PROBLEMA'::text, 'NO_APLICA'::text])));
ALTER TABLE vending_inventario_semanal ADD CONSTRAINT "vending_inventario_semanal_status_check" CHECK ((status = ANY (ARRAY['ACTIVO'::text, 'BAJA'::text, 'PAUSADO'::text])));
ALTER TABLE vending_movimientos ADD CONSTRAINT "vending_movimientos_cantidad_check" CHECK ((cantidad > (0)::numeric));
ALTER TABLE vending_movimientos ADD CONSTRAINT "vending_movimientos_precio_unitario_check" CHECK ((precio_unitario >= (0)::numeric));
ALTER TABLE vending_movimientos ADD CONSTRAINT "vending_movimientos_tipo_check" CHECK ((tipo = ANY (ARRAY['COMPRA'::text, 'VENTA'::text])));
ALTER TABLE vending_semanas ADD CONSTRAINT "vending_semanas_estado_check" CHECK ((estado = ANY (ARRAY['ABIERTA'::text, 'CERRADA'::text])));
ALTER TABLE aplicaciones_pago ADD CONSTRAINT "aplicaciones_pago_pkey" PRIMARY KEY (id);
ALTER TABLE arrendatarios ADD CONSTRAINT "arrendatarios_pkey" PRIMARY KEY (id);
ALTER TABLE cargos_programados ADD CONSTRAINT "cargos_programados_pkey" PRIMARY KEY (id);
ALTER TABLE cat_despachos ADD CONSTRAINT "cat_despachos_pkey" PRIMARY KEY (id);
ALTER TABLE cat_locales ADD CONSTRAINT "cat_locales_pkey" PRIMARY KEY (id_local);
ALTER TABLE cat_parametros ADD CONSTRAINT "cat_parametros_pkey" PRIMARY KEY (clave);
ALTER TABLE cat_productos ADD CONSTRAINT "cat_productos_pkey" PRIMARY KEY (id);
ALTER TABLE cat_productos_vending ADD CONSTRAINT "cat_productos_vending_pkey" PRIMARY KEY (id);
ALTER TABLE cat_proveedores ADD CONSTRAINT "cat_proveedores_pkey" PRIMARY KEY (id);
ALTER TABLE cat_tipo_deduccion ADD CONSTRAINT "cat_tipo_deduccion_pkey" PRIMARY KEY (clave);
ALTER TABLE cat_tipo_otro_pago ADD CONSTRAINT "cat_tipo_otro_pago_pkey" PRIMARY KEY (clave);
ALTER TABLE cat_tipo_percepcion ADD CONSTRAINT "cat_tipo_percepcion_pkey" PRIMARY KEY (clave);
ALTER TABLE comprobantes_pago ADD CONSTRAINT "comprobantes_pago_pkey" PRIMARY KEY (id);
ALTER TABLE contratos_locales ADD CONSTRAINT "contratos_locales_pkey" PRIMARY KEY (id);
ALTER TABLE contratos ADD CONSTRAINT "contratos_pkey" PRIMARY KEY (id);
ALTER TABLE documentos ADD CONSTRAINT "documentos_pkey" PRIMARY KEY (id);
ALTER TABLE er_mensual ADD CONSTRAINT "er_mensual_pkey" PRIMARY KEY (id);
ALTER TABLE estacionamiento_diario ADD CONSTRAINT "estacionamiento_diario_pkey" PRIMARY KEY (id);
ALTER TABLE estacionamiento_pensiones ADD CONSTRAINT "estacionamiento_pensiones_pkey" PRIMARY KEY (id);
ALTER TABLE gasto_detalle ADD CONSTRAINT "gasto_detalle_pkey" PRIMARY KEY (id);
ALTER TABLE gastos_operativos ADD CONSTRAINT "gastos_operativos_pkey" PRIMARY KEY (id);
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_pkey" PRIMARY KEY (id);
ALTER TABLE irp_roles ADD CONSTRAINT "irp_roles_pkey" PRIMARY KEY (id);
ALTER TABLE irp_usuarios ADD CONSTRAINT "irp_usuarios_pkey" PRIMARY KEY (id);
ALTER TABLE nomina_deducciones ADD CONSTRAINT "nomina_deducciones_pkey" PRIMARY KEY (id);
ALTER TABLE nomina_empleado ADD CONSTRAINT "nomina_empleado_pkey" PRIMARY KEY (id);
ALTER TABLE nomina_otros_pagos ADD CONSTRAINT "nomina_otros_pagos_pkey" PRIMARY KEY (id);
ALTER TABLE nomina_percepciones ADD CONSTRAINT "nomina_percepciones_pkey" PRIMARY KEY (id);
ALTER TABLE nomina_periodos ADD CONSTRAINT "nomina_periodos_pkey" PRIMARY KEY (id);
ALTER TABLE notas_contrato ADD CONSTRAINT "notas_contrato_pkey" PRIMARY KEY (id);
ALTER TABLE ordenes_trabajo ADD CONSTRAINT "ordenes_trabajo_pkey" PRIMARY KEY (id);
ALTER TABLE pagos ADD CONSTRAINT "pagos_pkey" PRIMARY KEY (id);
ALTER TABLE prospecto_documentos ADD CONSTRAINT "prospecto_documentos_pkey" PRIMARY KEY (id);
ALTER TABLE prospecto_historial ADD CONSTRAINT "prospecto_historial_pkey" PRIMARY KEY (id);
ALTER TABLE prospecto_magic_links ADD CONSTRAINT "prospecto_magic_links_pkey" PRIMARY KEY (id);
ALTER TABLE prospecto_personas ADD CONSTRAINT "prospecto_personas_pkey" PRIMARY KEY (id);
ALTER TABLE prospectos ADD CONSTRAINT "prospectos_pkey" PRIMARY KEY (id);
ALTER TABLE restaurante_gasto_detalle ADD CONSTRAINT "restaurante_gasto_detalle_pkey" PRIMARY KEY (id);
ALTER TABLE restaurante_gastos ADD CONSTRAINT "restaurante_gastos_pkey" PRIMARY KEY (id);
ALTER TABLE rh_asistencia ADD CONSTRAINT "rh_asistencia_pkey" PRIMARY KEY (id);
ALTER TABLE rh_beneficios ADD CONSTRAINT "rh_beneficios_pkey" PRIMARY KEY (id);
ALTER TABLE rh_candidatos ADD CONSTRAINT "rh_candidatos_pkey" PRIMARY KEY (id);
ALTER TABLE rh_capacitacion ADD CONSTRAINT "rh_capacitacion_pkey" PRIMARY KEY (id);
ALTER TABLE rh_checadas ADD CONSTRAINT "rh_checadas_pkey" PRIMARY KEY (id);
ALTER TABLE rh_contratos ADD CONSTRAINT "rh_contratos_pkey" PRIMARY KEY (id);
ALTER TABLE rh_documentos_empleado ADD CONSTRAINT "rh_documentos_empleado_pkey" PRIMARY KEY (id);
ALTER TABLE rh_empleados ADD CONSTRAINT "rh_empleados_pkey" PRIMARY KEY (id);
ALTER TABLE rh_evaluaciones ADD CONSTRAINT "rh_evaluaciones_pkey" PRIMARY KEY (id);
ALTER TABLE rh_expediente_documentos ADD CONSTRAINT "rh_expediente_documentos_pkey" PRIMARY KEY (id);
ALTER TABLE rh_historial_cambios ADD CONSTRAINT "rh_historial_cambios_pkey" PRIMARY KEY (id);
ALTER TABLE rh_historial_nombre ADD CONSTRAINT "rh_historial_nombre_pkey" PRIMARY KEY (id);
ALTER TABLE rh_historial_sueldo ADD CONSTRAINT "rh_historial_sueldo_pkey" PRIMARY KEY (id);
ALTER TABLE rh_incidencias ADD CONSTRAINT "rh_incidencias_pkey" PRIMARY KEY (id);
ALTER TABLE rh_tipos_incidencia ADD CONSTRAINT "rh_tipos_incidencia_pkey" PRIMARY KEY (id);
ALTER TABLE rh_turnos_guardia ADD CONSTRAINT "rh_turnos_guardia_pkey" PRIMARY KEY (id);
ALTER TABLE rh_vacaciones_anio ADD CONSTRAINT "rh_vacaciones_anio_pkey" PRIMARY KEY (id);
ALTER TABLE rh_vacaciones_detalle ADD CONSTRAINT "rh_vacaciones_detalle_pkey" PRIMARY KEY (id);
ALTER TABLE rh_vacantes ADD CONSTRAINT "rh_vacantes_pkey" PRIMARY KEY (id);
ALTER TABLE sat_subsidio_empleo ADD CONSTRAINT "sat_subsidio_empleo_pkey" PRIMARY KEY (id);
ALTER TABLE sat_tarifa_isr ADD CONSTRAINT "sat_tarifa_isr_pkey" PRIMARY KEY (id);
ALTER TABLE validacion_adjuntos ADD CONSTRAINT "validacion_adjuntos_pkey" PRIMARY KEY (id);
ALTER TABLE validacion_puntos ADD CONSTRAINT "validacion_puntos_pkey" PRIMARY KEY (id);
ALTER TABLE validacion_reportes ADD CONSTRAINT "validacion_reportes_pkey" PRIMARY KEY (id);
ALTER TABLE validacion_revisiones ADD CONSTRAINT "validacion_revisiones_pkey" PRIMARY KEY (id);
ALTER TABLE vending_inventario_semanal ADD CONSTRAINT "vending_inventario_semanal_pkey" PRIMARY KEY (id);
ALTER TABLE vending_movimientos ADD CONSTRAINT "vending_movimientos_pkey" PRIMARY KEY (id);
ALTER TABLE vending_productos ADD CONSTRAINT "vending_productos_pkey" PRIMARY KEY (id);
ALTER TABLE vending_semana_producto ADD CONSTRAINT "vending_semana_producto_pkey" PRIMARY KEY (id);
ALTER TABLE vending_semanas ADD CONSTRAINT "vending_semanas_pkey" PRIMARY KEY (id);
ALTER TABLE aplicaciones_pago ADD CONSTRAINT "aplicaciones_pago_ingreso_id_cargo_id_key" UNIQUE (ingreso_id, cargo_id);
ALTER TABLE cat_productos ADD CONSTRAINT "cat_productos_clave_key" UNIQUE (clave);
ALTER TABLE cat_productos_vending ADD CONSTRAINT "cat_productos_vending_nombre_key" UNIQUE (nombre);
ALTER TABLE cat_proveedores ADD CONSTRAINT "cat_proveedores_clave_key" UNIQUE (clave);
ALTER TABLE contratos_locales ADD CONSTRAINT "contratos_locales_contrato_id_local_id_key" UNIQUE (contrato_id, local_id);
ALTER TABLE contratos ADD CONSTRAINT "contratos_numero_contrato_key" UNIQUE (numero_contrato);
ALTER TABLE er_mensual ADD CONSTRAINT "er_mensual_anio_mes_key" UNIQUE (anio, mes);
ALTER TABLE nomina_empleado ADD CONSTRAINT "nomina_empleado_periodo_id_empleado_id_key" UNIQUE (periodo_id, empleado_id);
ALTER TABLE nomina_periodos ADD CONSTRAINT "nomina_periodos_folio_key" UNIQUE (folio);
ALTER TABLE pagos ADD CONSTRAINT "pagos_referencia_key" UNIQUE (referencia);
ALTER TABLE prospecto_magic_links ADD CONSTRAINT "prospecto_magic_links_token_key" UNIQUE (token);
ALTER TABLE rh_asistencia ADD CONSTRAINT "rh_asistencia_empleado_id_fecha_key" UNIQUE (empleado_id, fecha);
ALTER TABLE rh_candidatos ADD CONSTRAINT "rh_candidatos_token_docs_key" UNIQUE (token_docs);
ALTER TABLE rh_empleados ADD CONSTRAINT "rh_empleados_numero_empleado_key" UNIQUE (numero_empleado);
ALTER TABLE rh_incidencias ADD CONSTRAINT "rh_incidencias_empleado_id_fecha_tipo_key" UNIQUE (empleado_id, fecha, tipo);
ALTER TABLE rh_tipos_incidencia ADD CONSTRAINT "rh_tipos_incidencia_clave_key" UNIQUE (clave);
ALTER TABLE rh_turnos_guardia ADD CONSTRAINT "rh_turnos_guardia_fecha_key" UNIQUE (fecha);
ALTER TABLE rh_vacaciones_anio ADD CONSTRAINT "rh_vacaciones_anio_empleado_id_anio_key" UNIQUE (empleado_id, anio);
ALTER TABLE validacion_puntos ADD CONSTRAINT "validacion_puntos_clave_key" UNIQUE (clave);
ALTER TABLE validacion_reportes ADD CONSTRAINT "validacion_reportes_folio_key" UNIQUE (folio);
ALTER TABLE validacion_revisiones ADD CONSTRAINT "validacion_revisiones_punto_id_key" UNIQUE (punto_id);
ALTER TABLE vending_inventario_semanal ADD CONSTRAINT "vending_inventario_semanal_fecha_inicio_producto_nombre_key" UNIQUE (fecha_inicio, producto_nombre);
ALTER TABLE vending_productos ADD CONSTRAINT "vending_productos_producto_key" UNIQUE (producto);
ALTER TABLE vending_semana_producto ADD CONSTRAINT "vending_semana_producto_semana_id_producto_id_key" UNIQUE (semana_id, producto_id);
ALTER TABLE aplicaciones_pago ADD CONSTRAINT "aplicaciones_pago_cargo_id_fkey" FOREIGN KEY (cargo_id) REFERENCES cargos_programados(id) ON DELETE CASCADE;
ALTER TABLE aplicaciones_pago ADD CONSTRAINT "aplicaciones_pago_ingreso_id_fkey" FOREIGN KEY (ingreso_id) REFERENCES ingresos(id) ON DELETE CASCADE;
ALTER TABLE arrendatarios ADD CONSTRAINT "arrendatarios_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE cargos_programados ADD CONSTRAINT "cargos_programados_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE;
ALTER TABLE cargos_programados ADD CONSTRAINT "cargos_programados_origen_cargo_id_fkey" FOREIGN KEY (origen_cargo_id) REFERENCES cargos_programados(id);
ALTER TABLE comprobantes_pago ADD CONSTRAINT "comprobantes_pago_arrendatario_id_fkey" FOREIGN KEY (arrendatario_id) REFERENCES arrendatarios(id);
ALTER TABLE contratos ADD CONSTRAINT "contratos_arrendatario_id_fkey" FOREIGN KEY (arrendatario_id) REFERENCES arrendatarios(id);
ALTER TABLE contratos ADD CONSTRAINT "contratos_contrato_anterior_id_fkey" FOREIGN KEY (contrato_anterior_id) REFERENCES contratos(id) ON DELETE SET NULL;
ALTER TABLE contratos ADD CONSTRAINT "contratos_despacho_id_fkey" FOREIGN KEY (despacho_id) REFERENCES cat_despachos(id);
ALTER TABLE contratos_locales ADD CONSTRAINT "contratos_locales_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE;
ALTER TABLE contratos_locales ADD CONSTRAINT "contratos_locales_local_id_fkey" FOREIGN KEY (local_id) REFERENCES cat_locales(id_local);
ALTER TABLE cat_locales ADD CONSTRAINT "fk_contrato_activo" FOREIGN KEY (contrato_activo_id) REFERENCES contratos(id) ON DELETE SET NULL;
ALTER TABLE gasto_detalle ADD CONSTRAINT "gasto_detalle_gasto_id_fkey" FOREIGN KEY (gasto_id) REFERENCES gastos_operativos(id) ON DELETE CASCADE;
ALTER TABLE gasto_detalle ADD CONSTRAINT "gasto_detalle_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES cat_productos(id);
ALTER TABLE gastos_operativos ADD CONSTRAINT "gastos_operativos_proveedor_id_fkey" FOREIGN KEY (proveedor_id) REFERENCES cat_proveedores(id);
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES contratos(id);
ALTER TABLE ingresos ADD CONSTRAINT "ingresos_local_id_fkey" FOREIGN KEY (local_id) REFERENCES cat_locales(id_local) ON DELETE RESTRICT;
ALTER TABLE irp_usuarios ADD CONSTRAINT "irp_usuarios_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES contratos(id);
ALTER TABLE irp_usuarios ADD CONSTRAINT "irp_usuarios_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE irp_usuarios ADD CONSTRAINT "irp_usuarios_rol_id_fkey" FOREIGN KEY (rol_id) REFERENCES irp_roles(id);
ALTER TABLE nomina_deducciones ADD CONSTRAINT "nomina_deducciones_nomina_emp_id_fkey" FOREIGN KEY (nomina_emp_id) REFERENCES nomina_empleado(id) ON DELETE CASCADE;
ALTER TABLE nomina_deducciones ADD CONSTRAINT "nomina_deducciones_tipo_deduccion_fkey" FOREIGN KEY (tipo_deduccion) REFERENCES cat_tipo_deduccion(clave);
ALTER TABLE nomina_empleado ADD CONSTRAINT "nomina_empleado_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES rh_contratos(id);
ALTER TABLE nomina_empleado ADD CONSTRAINT "nomina_empleado_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id);
ALTER TABLE nomina_empleado ADD CONSTRAINT "nomina_empleado_periodo_id_fkey" FOREIGN KEY (periodo_id) REFERENCES nomina_periodos(id) ON DELETE CASCADE;
ALTER TABLE nomina_otros_pagos ADD CONSTRAINT "nomina_otros_pagos_nomina_emp_id_fkey" FOREIGN KEY (nomina_emp_id) REFERENCES nomina_empleado(id) ON DELETE CASCADE;
ALTER TABLE nomina_otros_pagos ADD CONSTRAINT "nomina_otros_pagos_tipo_otro_pago_fkey" FOREIGN KEY (tipo_otro_pago) REFERENCES cat_tipo_otro_pago(clave);
ALTER TABLE nomina_percepciones ADD CONSTRAINT "nomina_percepciones_nomina_emp_id_fkey" FOREIGN KEY (nomina_emp_id) REFERENCES nomina_empleado(id) ON DELETE CASCADE;
ALTER TABLE nomina_percepciones ADD CONSTRAINT "nomina_percepciones_tipo_percepcion_fkey" FOREIGN KEY (tipo_percepcion) REFERENCES cat_tipo_percepcion(clave);
ALTER TABLE notas_contrato ADD CONSTRAINT "notas_contrato_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE;
ALTER TABLE pagos ADD CONSTRAINT "pagos_contrato_id_fkey" FOREIGN KEY (contrato_id) REFERENCES contratos(id);
ALTER TABLE pagos ADD CONSTRAINT "pagos_local_id_fkey" FOREIGN KEY (local_id) REFERENCES cat_locales(id_local);
ALTER TABLE prospecto_documentos ADD CONSTRAINT "prospecto_documentos_persona_id_fkey" FOREIGN KEY (persona_id) REFERENCES prospecto_personas(id) ON DELETE CASCADE;
ALTER TABLE prospecto_historial ADD CONSTRAINT "prospecto_historial_prospecto_id_fkey" FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE CASCADE;
ALTER TABLE prospecto_magic_links ADD CONSTRAINT "prospecto_magic_links_persona_id_fkey" FOREIGN KEY (persona_id) REFERENCES prospecto_personas(id) ON DELETE CASCADE;
ALTER TABLE prospecto_personas ADD CONSTRAINT "prospecto_personas_prospecto_id_fkey" FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE CASCADE;
ALTER TABLE prospectos ADD CONSTRAINT "prospectos_despacho_id_fkey" FOREIGN KEY (despacho_id) REFERENCES cat_despachos(id);
ALTER TABLE restaurante_gasto_detalle ADD CONSTRAINT "restaurante_gasto_detalle_gasto_id_fkey" FOREIGN KEY (gasto_id) REFERENCES restaurante_gastos(id) ON DELETE CASCADE;
ALTER TABLE rh_asistencia ADD CONSTRAINT "rh_asistencia_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id);
ALTER TABLE rh_candidatos ADD CONSTRAINT "rh_candidatos_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id);
ALTER TABLE rh_candidatos ADD CONSTRAINT "rh_candidatos_vacante_id_fkey" FOREIGN KEY (vacante_id) REFERENCES rh_vacantes(id);
ALTER TABLE rh_checadas ADD CONSTRAINT "rh_checadas_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE rh_contratos ADD CONSTRAINT "rh_contratos_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE rh_contratos ADD CONSTRAINT "rh_contratos_renovado_de_fkey" FOREIGN KEY (renovado_de) REFERENCES rh_contratos(id);
ALTER TABLE rh_documentos_empleado ADD CONSTRAINT "rh_documentos_empleado_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE rh_incidencias ADD CONSTRAINT "rh_incidencias_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE rh_incidencias ADD CONSTRAINT "rh_incidencias_tipo_id_fkey" FOREIGN KEY (tipo_id) REFERENCES rh_tipos_incidencia(id);
ALTER TABLE rh_turnos_guardia ADD CONSTRAINT "rh_turnos_guardia_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE rh_vacaciones_anio ADD CONSTRAINT "rh_vacaciones_anio_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE rh_vacaciones_detalle ADD CONSTRAINT "rh_vacaciones_detalle_empleado_id_fkey" FOREIGN KEY (empleado_id) REFERENCES rh_empleados(id) ON DELETE CASCADE;
ALTER TABLE validacion_adjuntos ADD CONSTRAINT "validacion_adjuntos_reporte_id_fkey" FOREIGN KEY (reporte_id) REFERENCES validacion_reportes(id) ON DELETE CASCADE;
ALTER TABLE validacion_reportes ADD CONSTRAINT "validacion_reportes_punto_id_fkey" FOREIGN KEY (punto_id) REFERENCES validacion_puntos(id) ON DELETE SET NULL;
ALTER TABLE validacion_revisiones ADD CONSTRAINT "validacion_revisiones_punto_id_fkey" FOREIGN KEY (punto_id) REFERENCES validacion_puntos(id) ON DELETE CASCADE;
ALTER TABLE vending_inventario_semanal ADD CONSTRAINT "vending_inventario_semanal_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES cat_productos_vending(id);
ALTER TABLE vending_movimientos ADD CONSTRAINT "vending_movimientos_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES vending_productos(id) ON DELETE RESTRICT;
ALTER TABLE vending_movimientos ADD CONSTRAINT "vending_movimientos_semana_producto_id_fkey" FOREIGN KEY (semana_producto_id) REFERENCES vending_semana_producto(id) ON DELETE CASCADE;
ALTER TABLE vending_semana_producto ADD CONSTRAINT "vending_semana_producto_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES vending_productos(id) ON DELETE RESTRICT;
ALTER TABLE vending_semana_producto ADD CONSTRAINT "vending_semana_producto_semana_id_fkey" FOREIGN KEY (semana_id) REFERENCES vending_semanas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS documentos_entidad_idx ON public.documentos USING btree (entidad_tipo, entidad_id);
CREATE UNIQUE INDEX IF NOT EXISTS documentos_entidad_tipo_doc_idx ON public.documentos USING btree (entidad_tipo, entidad_id, tipo_doc);
CREATE UNIQUE INDEX IF NOT EXISTS estacionamiento_diario_fecha_idx ON public.estacionamiento_diario USING btree (fecha);
CREATE INDEX IF NOT EXISTS gastos_operativos_fecha_idx ON public.gastos_operativos USING btree (fecha);
CREATE INDEX IF NOT EXISTS gastos_operativos_grupo_gasto_idx ON public.gastos_operativos USING btree (grupo_gasto);
CREATE INDEX IF NOT EXISTS idx_benef_emp ON public.rh_beneficios USING btree (empleado_id, activo);
CREATE INDEX IF NOT EXISTS idx_cambios_emp ON public.rh_historial_cambios USING btree (empleado_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_capac_emp ON public.rh_capacitacion USING btree (empleado_id);
CREATE INDEX IF NOT EXISTS idx_cat_productos_codigo ON public.cat_productos USING btree (codigo_proveedor) WHERE (codigo_proveedor IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_cl_contrato ON public.contratos_locales USING btree (contrato_id);
CREATE INDEX IF NOT EXISTS idx_cl_local ON public.contratos_locales USING btree (local_id);
CREATE INDEX IF NOT EXISTS idx_comp_arr ON public.comprobantes_pago USING btree (arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_comp_cobro ON public.comprobantes_pago USING btree (cobro_id);
CREATE INDEX IF NOT EXISTS idx_comp_est ON public.comprobantes_pago USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_contratos_arrendatario ON public.contratos USING btree (arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estatus ON public.contratos USING btree (estatus);
CREATE INDEX IF NOT EXISTS idx_contratos_fechas ON public.contratos USING btree (fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_eval_emp ON public.rh_evaluaciones USING btree (empleado_id);
CREATE INDEX IF NOT EXISTS idx_exp_docs_emp ON public.rh_expediente_documentos USING btree (empleado_id);
CREATE INDEX IF NOT EXISTS idx_hist_nombre_emp ON public.rh_historial_nombre USING btree (empleado_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_hist_sueldo_emp ON public.rh_historial_sueldo USING btree (empleado_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ingresos_clasificacion ON public.ingresos USING btree (clasificacion);
CREATE INDEX IF NOT EXISTS idx_ingresos_cobro_id ON public.ingresos USING btree (cobro_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_contrato ON public.ingresos USING btree (id_contrato);
CREATE INDEX IF NOT EXISTS idx_ingresos_estatus_validacion ON public.ingresos USING btree (estatus_validacion);
CREATE INDEX IF NOT EXISTS idx_ingresos_local ON public.ingresos USING btree (local_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_mes_anio ON public.ingresos USING btree (anio, mes);
CREATE INDEX IF NOT EXISTS idx_ingresos_tipo ON public.ingresos USING btree (tipo);
CREATE INDEX IF NOT EXISTS idx_locales_estatus ON public.cat_locales USING btree (estatus);
CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON public.pagos USING btree (contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estatus ON public.pagos USING btree (estatus);
CREATE INDEX IF NOT EXISTS idx_pagos_mes ON public.pagos USING btree (anio_pago, mes_pago);
CREATE INDEX IF NOT EXISTS idx_pensiones_semana ON public.estacionamiento_pensiones USING btree (semana_inicio);
CREATE INDEX IF NOT EXISTS idx_rh_asist_fecha ON public.rh_asistencia USING btree (fecha);
CREATE INDEX IF NOT EXISTS idx_rh_contratos_activo ON public.rh_contratos USING btree (activo);
CREATE INDEX IF NOT EXISTS idx_rh_contratos_emp ON public.rh_contratos USING btree (empleado_id);
CREATE INDEX IF NOT EXISTS idx_rh_emp_area ON public.rh_empleados USING btree (area);
CREATE INDEX IF NOT EXISTS idx_rh_emp_estado ON public.rh_empleados USING btree (estado_id);
CREATE INDEX IF NOT EXISTS idx_rh_incidencias_fecha ON public.rh_incidencias USING btree (fecha, empleado_id);
CREATE INDEX IF NOT EXISTS idx_rh_incidencias_semana ON public.rh_incidencias USING btree (semana_inicio, empleado_id);
CREATE INDEX IF NOT EXISTS idx_vending_prod_codigo ON public.vending_productos USING btree (codigo_proveedor) WHERE (codigo_proveedor IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_vmov_fecha ON public.vending_movimientos USING btree (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_vmov_producto ON public.vending_movimientos USING btree (producto_id);
CREATE INDEX IF NOT EXISTS idx_vmov_semana ON public.vending_movimientos USING btree (semana_id);
CREATE INDEX IF NOT EXISTS idx_vsp_producto ON public.vending_semana_producto USING btree (producto_id);
CREATE INDEX IF NOT EXISTS idx_vsp_semana ON public.vending_semana_producto USING btree (semana_id);
CREATE INDEX IF NOT EXISTS rh_checadas_emp_fecha ON public.rh_checadas USING btree (empleado_id, fecha);
CREATE UNIQUE INDEX IF NOT EXISTS rh_checadas_unica ON public.rh_checadas USING btree (empleado_id, fecha_hora, operacion);
CREATE INDEX IF NOT EXISTS rh_vac_det_emp ON public.rh_vacaciones_detalle USING btree (empleado_id, anio);
CREATE INDEX IF NOT EXISTS validacion_adjuntos_reporte ON public.validacion_adjuntos USING btree (reporte_id, orden);
CREATE INDEX IF NOT EXISTS validacion_puntos_modulo ON public.validacion_puntos USING btree (modulo, orden);
CREATE INDEX IF NOT EXISTS validacion_reportes_estado ON public.validacion_reportes USING btree (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS validacion_reportes_punto ON public.validacion_reportes USING btree (punto_id);
CREATE INDEX IF NOT EXISTS vending_semanas_producto_idx ON public.vending_semanas USING btree (producto);
CREATE INDEX IF NOT EXISTS vending_semanas_semana_label_idx ON public.vending_semanas USING btree (semana_label);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW "public"."prp_adendums" AS
SELECT id,
    contrato_id,
    numero_adendum,
    fecha_adendum,
    descripcion,
    monto_anterior,
    monto_nuevo,
    archivo_nombre,
    creado_en
   FROM prp.adendums;
CREATE OR REPLACE VIEW "public"."prp_arrendatarios" AS
SELECT id,
    COALESCE(locatario, nombre_negocio, 'Sin nombre'::text) AS nombre_razon_social,
    locatario,
    nombre_negocio,
    rfc,
    email,
    telefono,
    tipo_persona,
    estatus,
    doc_ine_url,
    doc_comprobante_domicilio_url,
    doc_comprobante_ingresos_url,
    created_at
   FROM arrendatarios;
CREATE OR REPLACE VIEW "public"."prp_asistencia" AS
SELECT a.id,
    a.fecha,
    COALESCE(e.numero_empleado, a.numero_empleado_ext) AS numero_empleado,
    COALESCE((e.nombre || ' '::text) || e.apellido_pat, a.empleado_nombre) AS nombre_completo,
    COALESCE(e.puesto, ''::text) AS puesto,
    a.hora_entrada,
    a.hora_salida,
    a.minutos_trabajados,
    round(a.minutos_trabajados::numeric / 60::numeric, 2) AS horas_trabajadas,
    a.minutos_retardo,
    a.estado,
    a.notas,
    a.fuente
   FROM rh_asistencia a
     LEFT JOIN rh_empleados e ON e.id = a.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_asistencia_semana" AS
SELECT empleado_id,
    date_trunc('week'::text, fecha::timestamp with time zone)::date AS semana_inicio,
    fecha,
    EXTRACT(isodow FROM fecha)::integer AS dia_semana,
    min(fecha_hora) FILTER (WHERE operacion = 'ENTRADA'::text)::time without time zone AS entrada,
    max(fecha_hora) FILTER (WHERE operacion = 'SALIDA'::text)::time without time zone AS salida,
    count(*) AS marcajes
   FROM rh_checadas c
  WHERE empleado_id IS NOT NULL
  GROUP BY empleado_id, (date_trunc('week'::text, fecha::timestamp with time zone)::date), fecha, (EXTRACT(isodow FROM fecha)::integer);
CREATE OR REPLACE VIEW "public"."prp_bitacora" AS
SELECT id,
    created_at,
    modulo,
    accion,
    entidad,
    entidad_id,
    descripcion,
    usuario_id,
    usuario_email,
    ip
   FROM prp.bitacora b;
CREATE OR REPLACE VIEW "public"."prp_cajones_estacionamiento" AS
SELECT id,
    numero,
    tipo,
    empleado_id,
    activo
   FROM prp.cajones_estacionamiento;
CREATE OR REPLACE VIEW "public"."prp_candidatos" AS
SELECT c.id,
    c.vacante_id,
    c.nombre,
    c.apellidos,
    c.email,
    c.telefono,
    c.etapa,
    c.token_docs,
    c.fecha_aplicacion,
    c.fecha_entrevista,
    c.fecha_respuesta,
    c.motivo_rechazo,
    c.notas,
    c.empleado_id,
    c.created_at,
    v.titulo AS vacante_puesto,
    v.area AS vacante_area
   FROM rh_candidatos c
     LEFT JOIN rh_vacantes v ON v.id = c.vacante_id;
CREATE OR REPLACE VIEW "public"."prp_contratos" AS
SELECT c.id,
    c.numero_contrato AS folio,
    c.arrendatario_id,
    a.locatario AS arrendatario_nombre,
    a.nombre_negocio,
    a.rfc AS arrendatario_rfc,
    a.email AS arrendatario_email,
    a.telefono AS arrendatario_telefono,
    a.domicilio_fiscal AS arrendatario_domicilio,
    a.tipo_persona,
    a.representante_legal,
    c.tipo_contrato,
    c.giro_autorizado,
    c.fecha_inicio,
    c.fecha_fin,
    c.renta_mensual,
    c.renta_sin_iva,
    c.deposito_garantia,
    c.dia_pago,
    c.penalizacion_pct,
    c.incremento_anual_pct,
    c.fiador_nombre,
    c.fiador_rfc,
    c.fiador_domicilio,
    c.fiador_ife,
    c.pagares_cantidad,
    c.cancelacion_anticipada_meses,
    c.periodo_gracia_meses,
    c.contrato_anterior_id,
    c.estatus,
    c.estatus AS estado_id,
    c.estatus_proceso,
    c.locales_referencia,
    c.locales_display,
    c.contrato_pdf_url AS archivo_contrato_url,
    c.notas,
    c.created_at,
    c.updated_at,
        CASE
            WHEN c.estatus <> ALL (ARRAY['VIGENTE'::text, 'VENCIDO'::text]) THEN c.estatus
            WHEN c.fecha_fin < CURRENT_DATE THEN 'VENCIDO'::text
            WHEN c.fecha_fin <= (CURRENT_DATE + 30) THEN 'CRITICO'::text
            WHEN c.fecha_fin <= (CURRENT_DATE + 60) THEN 'ALERTA'::text
            ELSE 'OK'::text
        END AS semaforo_vencimiento,
    c.fecha_fin - CURRENT_DATE AS dias_restantes,
    string_agg(cl.local_id, '|'::text ORDER BY cl.local_id) AS locales_ids,
    string_agg(l.numero_local, ', '::text ORDER BY cl.local_id) AS unidad_numero,
    sum(l.superficie_m2) AS m2_totales,
    NULL::uuid AS unidad_id,
    NULL::text AS inmueble_nombre,
    NULL::text AS tipo_unidad
   FROM contratos c
     JOIN arrendatarios a ON a.id = c.arrendatario_id
     LEFT JOIN contratos_locales cl ON cl.contrato_id = c.id
     LEFT JOIN cat_locales l ON l.id_local = cl.local_id
  GROUP BY c.id, a.id;
CREATE OR REPLACE VIEW "public"."prp_cartera" AS
SELECT cp.id,
    cp.contrato_id,
    cp.concepto,
    cp.descripcion,
    cp.periodo_mes,
    cp.periodo_anio,
    cp.importe,
    cp.fecha_vencimiento,
    cp.estado,
    cp.generado_auto,
    cp.origen_cargo_id,
    COALESCE(sum(ap.importe_aplicado), 0::numeric) AS total_aplicado,
    cp.importe - COALESCE(sum(ap.importe_aplicado), 0::numeric) AS saldo,
    con.folio AS contrato_folio,
    con.arrendatario_nombre,
    con.renta_mensual,
    con.inmueble_nombre,
    con.locales_display,
    con.locales_referencia
   FROM cargos_programados cp
     LEFT JOIN aplicaciones_pago ap ON ap.cargo_id = cp.id
     LEFT JOIN prp_contratos con ON con.id = cp.contrato_id
  GROUP BY cp.id, con.id, con.folio, con.arrendatario_nombre, con.renta_mensual, con.inmueble_nombre, con.locales_display, con.locales_referencia;
CREATE OR REPLACE VIEW "public"."prp_cat_estado_general" AS
SELECT id,
    clave,
    descripcion,
    color_hex,
    activo
   FROM prp.cat_estado_general;
CREATE OR REPLACE VIEW "public"."prp_cat_grupo_gasto" AS
SELECT id,
    clave,
    descripcion,
    tipo,
    activo,
    orden
   FROM prp.cat_grupo_gasto;
CREATE OR REPLACE VIEW "public"."prp_checadas" AS
SELECT c.id,
    c.empleado_id,
    c.operacion,
    c.fecha_hora,
    c.fecha,
    c.fecha_hora::time without time zone AS hora,
    c.origen,
    c.notas,
    COALESCE(e.numero_empleado, c.numero_empleado_ext) AS numero_empleado,
    COALESCE((e.nombre || ' '::text) || e.apellido_pat, '(sin empleado)'::text) AS nombre_completo
   FROM rh_checadas c
     LEFT JOIN rh_empleados e ON e.id = c.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_cobros" AS
SELECT cp.id,
    cp.contrato_id,
    cp.mes,
    cp.anio,
    cp.pagare_numero,
    cp.fecha_limite_pago,
    cp.monto_renta,
    cp.monto_iva,
    cp.monto_total,
    cp.monto_pagado,
    cp.monto_mora,
    cp.referencia_pago,
    cp.estatus,
    cp.fecha_pago_real,
    cp.forma_pago,
    cp.conciliado,
    cp.numero_operacion_banco,
    a.id AS arrendatario_id,
    COALESCE(NULLIF(TRIM(BOTH FROM (a.nombre::text || ' '::text) || COALESCE(a.apellidos, ''::character varying)::text), ''::text), 'Sin nombre'::text) AS arrendatario_nombre,
    a.rfc AS arrendatario_rfc,
    a.telefono AS arrendatario_telefono,
    u.numero_local AS unidad_numero,
    i.nombre AS inmueble_nombre,
    i.id AS inmueble_id
   FROM prp.cobros_programados cp
     JOIN prp.contratos_arrendamiento c ON c.id = cp.contrato_id
     JOIN prp.arrendatarios a ON a.id = c.arrendatario_id
     JOIN prp.unidades u ON u.id = c.unidad_id
     JOIN prp.inmuebles i ON i.id = u.inmueble_id;
CREATE OR REPLACE VIEW "public"."prp_conciliacion_cobros" AS
SELECT cp.id,
    cp.referencia_pago,
    cp.mes,
    cp.anio,
    cp.fecha_limite_pago,
    cp.monto_total,
    cp.monto_pagado,
    cp.estatus,
    cp.conciliado,
    cp.numero_operacion_banco,
    cp.forma_pago,
    cp.fecha_pago_real,
    COALESCE(NULLIF(TRIM(BOTH FROM (a.nombre::text || ' '::text) || COALESCE(a.apellidos, ''::character varying)::text), ''::text), a.nombre::text) AS arrendatario_nombre,
    a.rfc AS arrendatario_rfc,
    a.telefono AS arrendatario_tel,
    u.numero_local AS unidad_numero,
    i.nombre AS inmueble_nombre,
    mb.monto AS banco_monto,
    mb.fecha_movimiento AS banco_fecha,
    mb.referencia_banco,
    mb.descripcion AS banco_descripcion
   FROM prp.cobros_programados cp
     JOIN prp.contratos_arrendamiento c ON c.id = cp.contrato_id
     JOIN prp.arrendatarios a ON a.id = c.arrendatario_id
     JOIN prp.unidades u ON u.id = c.unidad_id
     JOIN prp.inmuebles i ON i.id = u.inmueble_id
     LEFT JOIN prp.movimientos_bancarios mb ON mb.cobro_programado_id = cp.id;
CREATE OR REPLACE VIEW "public"."prp_documentos" AS
SELECT id,
    entidad_tipo,
    entidad_id,
    tipo_doc,
    nombre_archivo,
    url,
    estatus,
    notas,
    subido_por,
    created_at
   FROM prp.documentos
  ORDER BY created_at DESC;
CREATE OR REPLACE VIEW "public"."prp_empleados" AS
SELECT e.id,
    e.numero_empleado,
    ((e.nombre || ' '::text) || e.apellido_pat) || COALESCE(' '::text || NULLIF(e.apellido_mat, ''::text), ''::text) AS nombre_completo,
    e.nombre,
    e.apellido_pat,
    e.apellido_mat,
    e.sexo,
    e.puesto,
    e.area,
    e.departamento,
    e.fecha_ingreso,
    e.salario_diario,
    round(e.salario_diario * 30.4, 2) AS salario_mensual,
    e.rfc,
    e.curp,
    e.nss,
    e.email,
    e.celular,
    e.foto_url,
    e.estado_id,
    e.notas,
    e.horario_trabajo,
    e.dia_descanso,
    e.forma_pago,
    e.tipo_contratacion,
    e.bono,
    e.forma_pago_bono,
    c.id AS contrato_id,
    c.tipo_contrato AS tipo_contrato_id,
        CASE c.tipo_contrato
            WHEN 'TEMPORAL_3SEM'::text THEN 'Temporal 3 semanas'::text
            WHEN 'TEMPORAL_30D'::text THEN 'Temporal 30 días'::text
            WHEN 'INDEFINIDO'::text THEN 'Tiempo indefinido'::text
            WHEN 'PRUEBA_90'::text THEN 'Prueba 90 días'::text
            ELSE COALESCE(c.tipo_contrato, 'Sin contrato'::text)
        END AS tipo_contrato_nombre,
    c.fecha_inicio AS contrato_inicio,
    c.fecha_fin AS contrato_fin,
        CASE
            WHEN c.fecha_fin IS NULL THEN 'INDETERMINADO'::text
            WHEN c.fecha_fin < CURRENT_DATE THEN 'VENCIDO'::text
            WHEN c.fecha_fin < (CURRENT_DATE + '7 days'::interval) THEN 'CRITICO'::text
            WHEN c.fecha_fin < (CURRENT_DATE + '21 days'::interval) THEN 'ALERTA'::text
            ELSE 'OK'::text
        END AS semaforo_contrato,
    CURRENT_DATE - e.fecha_ingreso AS dias_antiguedad
   FROM rh_empleados e
     LEFT JOIN rh_contratos c ON c.empleado_id = e.id AND c.activo = true;
CREATE OR REPLACE VIEW "public"."prp_estacionamiento" AS
SELECT ce.id,
    ce.numero AS numero_cajon,
    ce.tipo,
    ce.activo,
        CASE
            WHEN pe.id IS NOT NULL THEN 'OCUPADO'::text
            ELSE 'DISPONIBLE'::text
        END AS estatus,
    pe.id AS pension_id,
    pe.nombre AS pension_titular,
    pe.telefono AS pension_telefono,
    pe.monto_mensual,
    pe.fecha_inicio AS pension_inicio,
    pe.fecha_fin AS pension_fin,
    pe.placa AS vehiculo_placa,
    pe.marca_auto AS vehiculo_marca,
    pe.color_auto AS vehiculo_color
   FROM prp.cajones_estacionamiento ce
     LEFT JOIN prp.pensiones_estacionamiento pe ON pe.cajon_id = ce.id AND pe.activo = true
  WHERE ce.activo = true;
CREATE OR REPLACE VIEW "public"."prp_estacionamiento_mensual" AS
SELECT anio,
    mes,
    count(*) AS dias_registrados,
    sum(cantidad) AS total_mes,
    avg(cantidad) AS promedio_dia,
    min(cantidad) AS min_dia,
    max(cantidad) AS max_dia
   FROM estacionamiento_diario
  GROUP BY anio, mes;
CREATE OR REPLACE VIEW "public"."prp_expediente_arrendatario" AS
SELECT a.id AS arrendatario_id,
    COALESCE(a.razon_social, TRIM(BOTH FROM (a.nombre::text || ' '::text) || COALESCE(a.apellidos, ''::character varying)::text)::character varying) AS nombre_completo,
    a.rfc,
    a.telefono,
    a.whatsapp,
    a.email,
    a.domicilio,
    a.tipo_persona,
    a.activo,
    a.created_at AS alta_fecha,
    c.id AS contrato_id,
    c.tipo_contrato,
    c.fecha_inicio,
    c.fecha_fin,
    c.renta_mensual,
    c.deposito_garantia,
    c.estatus AS contrato_estatus,
    c.archivo_contrato_url,
    c.giro_autorizado,
    c.fiador_nombre,
    c.fiador_rfc,
    c.cuenta_banco_pago,
    c.clabe_interbancaria,
    c.penalizacion_mora_pct,
    c.dia_limite_pago,
    u.numero_local,
    u.tipo_unidad,
    u.metros_cuadrados,
    i.nombre AS inmueble_nombre,
    i.id AS inmueble_id,
    COALESCE(sum(cp.monto_total) FILTER (WHERE cp.estatus::text = 'PAGADO'::text), 0::numeric) AS total_pagado,
    COALESCE(sum(cp.monto_total) FILTER (WHERE cp.estatus::text = 'PENDIENTE'::text), 0::numeric) AS total_pendiente,
    COALESCE(sum(cp.monto_total) FILTER (WHERE cp.estatus::text = ANY (ARRAY['EN_MORA'::character varying, 'VENCIDO'::character varying]::text[])), 0::numeric) AS total_mora,
    count(cp.id) FILTER (WHERE cp.estatus::text = 'PAGADO'::text) AS cobros_pagados,
    count(cp.id) FILTER (WHERE cp.estatus::text = 'PENDIENTE'::text) AS cobros_pendientes,
    count(cp.id) FILTER (WHERE cp.estatus::text = ANY (ARRAY['EN_MORA'::character varying, 'VENCIDO'::character varying]::text[])) AS cobros_mora
   FROM prp.arrendatarios a
     LEFT JOIN prp.contratos_arrendamiento c ON c.arrendatario_id = a.id AND c.estatus::text <> 'CANCELADO'::text
     LEFT JOIN prp.unidades u ON u.id = c.unidad_id
     LEFT JOIN prp.inmuebles i ON i.id = u.inmueble_id
     LEFT JOIN prp.cobros_programados cp ON cp.contrato_id = c.id
  GROUP BY a.id, a.razon_social, a.nombre, a.apellidos, a.rfc, a.telefono, a.whatsapp, a.email, a.domicilio, a.tipo_persona, a.activo, a.created_at, c.id, c.tipo_contrato, c.fecha_inicio, c.fecha_fin, c.renta_mensual, c.deposito_garantia, c.estatus, c.archivo_contrato_url, c.giro_autorizado, c.fiador_nombre, c.fiador_rfc, c.cuenta_banco_pago, c.clabe_interbancaria, c.penalizacion_mora_pct, c.dia_limite_pago, u.numero_local, u.tipo_unidad, u.metros_cuadrados, i.nombre, i.id;
CREATE OR REPLACE VIEW "public"."prp_fondo_revolvente_cierres" AS
SELECT id,
    fondo_id,
    semana_inicio,
    semana_fin,
    monto_asignado,
    total_estacionamiento,
    total_pensiones,
    total_vending,
    total_ingresos,
    total_gastos,
    total_comprobado,
    diferencia_gastos,
    total_efectivo_entregar,
    dia_tomado_importe,
    residual_vending,
    cerrado,
    created_at
   FROM prp.fondo_revolvente_cierres;
CREATE OR REPLACE VIEW "public"."prp_fondos_revolventes" AS
SELECT id,
    nombre,
    monto_base,
    responsable_id,
    activo,
    created_at
   FROM prp.fondos_revolventes;
CREATE OR REPLACE VIEW "public"."prp_gastos" AS
SELECT g.id,
    g.fecha,
    g.semana,
    g.anio,
    g.mes,
    g.dia_semana,
    g.grupo_gasto,
    g.descripcion,
    g.cantidad AS monto,
    COALESCE(g.ticket_total, g.cantidad) AS ticket_total,
    g.ticket_img_url,
    g.proveedor AS proveedor_txt,
    g.proveedor_id,
    p.nombre AS proveedor_nombre,
    p.categoria AS proveedor_cat,
    ( SELECT COALESCE(sum(d.subtotal), 0::numeric) AS "coalesce"
           FROM gasto_detalle d
          WHERE d.gasto_id = g.id) AS suma_detalle,
    ( SELECT count(*) AS count
           FROM gasto_detalle d
          WHERE d.gasto_id = g.id) AS num_lineas,
    g.created_at
   FROM gastos_operativos g
     LEFT JOIN cat_proveedores p ON p.id = g.proveedor_id
  ORDER BY g.fecha DESC, g.created_at DESC;
CREATE OR REPLACE VIEW "public"."prp_gastos_mensual" AS
SELECT anio,
    mes,
    grupo_gasto,
    count(*) AS num_registros,
    sum(cantidad) AS total
   FROM gastos_operativos
  GROUP BY anio, mes, grupo_gasto;
CREATE OR REPLACE VIEW "public"."prp_historico_sueldos" AS
SELECT h.id,
    h.empleado_id,
    h.fecha AS fecha_inicio,
    h.fecha_fin,
    h.sueldo_nuevo AS monto,
    h.sueldo_anterior,
    h.motivo,
    h.tipo,
    h.fecha_fin IS NULL AS vigente,
    e.numero_empleado,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo
   FROM rh_historial_sueldo h
     JOIN rh_empleados e ON e.id = h.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_incidencias" AS
SELECT i.id,
    i.empleado_id,
    ((e.nombre || ' '::text) || e.apellido_pat) || COALESCE(' '::text || e.apellido_mat, ''::text) AS nombre_completo,
    e.numero_empleado,
    e.puesto,
    i.fecha,
    i.tipo,
    i.descripcion,
    i.afecta_nomina,
    i.semana_inicio,
    i.created_at
   FROM rh_incidencias i
     JOIN rh_empleados e ON e.id = i.empleado_id
  ORDER BY i.fecha DESC, (((e.nombre || ' '::text) || e.apellido_pat) || COALESCE(' '::text || e.apellido_mat, ''::text));
CREATE OR REPLACE VIEW "public"."prp_ingresos" AS
SELECT i.id,
    i.fecha,
    i.tipo,
    i.mes,
    i.anio,
    i.importe,
    i.factura,
    i.nota,
    i.origen,
    i.concepto_origen,
    i.comprobante_url,
    i.contrato_id,
    i.created_at,
    con.folio,
    con.arrendatario_nombre,
    con.locales_display,
    con.renta_mensual,
    con.arrendatario_nombre AS propietario,
    con.locales_display AS local_id,
    true AS es_principal,
    i.estatus_validacion,
    i.validado_por,
    i.validado_en,
    i.clasificacion,
    i.clasificacion_manual
   FROM ingresos i
     LEFT JOIN prp_contratos con ON con.id = i.contrato_id;
CREATE OR REPLACE VIEW "public"."prp_ingresos_descuadrados" AS
SELECT i.id AS ingreso_id,
    i.fecha,
    i.importe,
    i.contrato_id,
    con.folio AS contrato_folio,
    con.locales_display,
    con.arrendatario_nombre,
    COALESCE(a.total_aplicado, 0::numeric) AS total_aplicado,
    COALESCE(a.total_aplicado, 0::numeric) - i.importe AS diferencia,
    a.n_aplicaciones,
        CASE
            WHEN COALESCE(a.total_aplicado, 0::numeric) > (i.importe + 0.01) THEN 'SOBRE_APLICADO'::text
            ELSE 'PARCIALMENTE_APLICADO'::text
        END AS problema
   FROM ingresos i
     LEFT JOIN LATERAL ( SELECT sum(ap.importe_aplicado) AS total_aplicado,
            count(*) AS n_aplicaciones
           FROM aplicaciones_pago ap
          WHERE ap.ingreso_id = i.id) a ON true
     LEFT JOIN prp_contratos con ON con.id = i.contrato_id
  WHERE i.importe IS NOT NULL AND a.n_aplicaciones > 0 AND abs(COALESCE(a.total_aplicado, 0::numeric) - i.importe) > 0.01;
CREATE OR REPLACE VIEW "public"."prp_inmuebles" AS
SELECT '00000000-0000-0000-0000-000000000001'::uuid AS id,
    'PLAZA IWOL'::text AS nombre,
    'Plaza Comercial'::text AS tipo_inmueble,
    'Culiacan'::text AS ciudad,
    'Sinaloa'::text AS estado,
    NULL::numeric AS m2_totales,
    ( SELECT count(*)::integer AS count
           FROM cat_locales) AS unidades_total,
    ( SELECT count(*)::integer AS count
           FROM cat_locales
          WHERE cat_locales.estatus = 'OCUPADO'::text) AS unidades_ocupadas,
    'ACTIVO'::text AS estado_id,
    now() AS created_at;
CREATE OR REPLACE VIEW "public"."prp_kpis" AS
SELECT ( SELECT count(*) AS count
           FROM prp.unidades
          WHERE unidades.activo = true) AS total_unidades,
    ( SELECT count(*) AS count
           FROM prp.contratos_arrendamiento
          WHERE contratos_arrendamiento.estatus::text = 'VIGENTE'::text) AS contratos_vigentes,
    ( SELECT count(*) AS count
           FROM prp.unidades u
          WHERE u.activo = true AND (EXISTS ( SELECT 1
                   FROM prp.contratos_arrendamiento c
                  WHERE c.unidad_id = u.id AND c.estatus::text = 'VIGENTE'::text))) AS unidades_ocupadas,
    ( SELECT count(*) AS count
           FROM prp.unidades u
          WHERE u.activo = true AND NOT (EXISTS ( SELECT 1
                   FROM prp.contratos_arrendamiento c
                  WHERE c.unidad_id = u.id AND c.estatus::text = 'VIGENTE'::text))) AS unidades_disponibles,
    round((( SELECT count(*) AS count
           FROM prp.unidades u
          WHERE u.activo = true AND (EXISTS ( SELECT 1
                   FROM prp.contratos_arrendamiento c
                  WHERE c.unidad_id = u.id AND c.estatus::text = 'VIGENTE'::text))))::numeric / NULLIF(( SELECT count(*) AS count
           FROM prp.unidades
          WHERE unidades.activo = true), 0)::numeric * 100::numeric, 1) AS pct_ocupacion,
    ( SELECT COALESCE(sum(contratos_arrendamiento.renta_mensual), 0::numeric) AS "coalesce"
           FROM prp.contratos_arrendamiento
          WHERE contratos_arrendamiento.estatus::text = 'VIGENTE'::text) AS ingresos_renta_mes,
    ( SELECT count(*) AS count
           FROM prp.arrendatarios
          WHERE arrendatarios.activo = true) AS total_arrendatarios,
    ( SELECT count(*) AS count
           FROM prp.contratos_arrendamiento
          WHERE contratos_arrendamiento.estatus::text = 'VIGENTE'::text AND contratos_arrendamiento.fecha_fin IS NOT NULL AND (contratos_arrendamiento.fecha_fin - CURRENT_DATE) <= 60 AND contratos_arrendamiento.fecha_fin >= CURRENT_DATE) AS contratos_por_vencer,
    ( SELECT COALESCE(sum(cobros_programados.monto_total), 0::numeric) AS "coalesce"
           FROM prp.cobros_programados
          WHERE (cobros_programados.estatus::text = ANY (ARRAY['PENDIENTE'::character varying, 'EN_MORA'::character varying]::text[])) AND cobros_programados.fecha_limite_pago < CURRENT_DATE) AS cartera_mora,
    0 AS ot_pendientes,
    ( SELECT count(*) AS count
           FROM prp.cajones_estacionamiento
          WHERE cajones_estacionamiento.activo = true) AS cajones_disponibles,
    ( SELECT count(*) AS count
           FROM prp.empleados
          WHERE empleados.activo = true) AS total_empleados_activos;
CREATE OR REPLACE VIEW "public"."prp_locales" AS
SELECT l.id_local,
    l.numero_local,
    l.nivel,
    l.superficie_m2,
    l.costo_m2,
    l.renta_proyectada,
    l.estatus AS estatus_local,
    c.id AS contrato_id,
    c.numero_contrato,
    c.fecha_inicio,
    c.fecha_fin,
    c.renta_mensual,
    c.estatus AS estatus_contrato,
    a.nombre_negocio,
    a.locatario,
    a.telefono,
    a.email,
    round(c.renta_mensual / NULLIF(l.renta_proyectada, 0::numeric) * 100::numeric, 1) AS pct_vs_proyectado,
        CASE
            WHEN c.fecha_fin < CURRENT_DATE THEN true
            ELSE false
        END AS vencido,
    c.fecha_fin - CURRENT_DATE AS dias_para_vencer
   FROM cat_locales l
     LEFT JOIN contratos c ON c.id = l.contrato_activo_id
     LEFT JOIN arrendatarios a ON a.id = c.arrendatario_id;
CREATE OR REPLACE VIEW "public"."prp_mapa_locales" AS
SELECT DISTINCT ON (u.id) u.id AS unidad_id,
    u.numero_local AS clave,
    u.metros_cuadrados,
    u.renta_base,
    ca.id AS contrato_id,
    ca.giro_autorizado AS giro,
    ca.renta_mensual,
    ca.fecha_inicio,
    ca.fecha_fin,
    ca.estatus AS estatus_contrato,
    TRIM(BOTH FROM COALESCE((ar.nombre::text || ' '::text) || ar.apellidos::text, ar.nombre::text)) AS inquilino,
    ar.telefono,
    ar.email,
        CASE
            WHEN ca.id IS NOT NULL AND ca.estatus::text = 'VIGENTE'::text THEN 'OCUPADO'::text
            ELSE 'DISPONIBLE'::text
        END AS estatus,
        CASE
            WHEN ca.fecha_fin IS NOT NULL THEN ca.fecha_fin - CURRENT_DATE
            ELSE NULL::integer
        END AS dias_para_vencer
   FROM prp.unidades u
     LEFT JOIN prp.contratos_arrendamiento ca ON ca.unidad_id = u.id AND ca.estatus::text = 'VIGENTE'::text
     LEFT JOIN prp.arrendatarios ar ON ar.id = ca.arrendatario_id
  ORDER BY u.id, ca.fecha_inicio DESC NULLS LAST;
CREATE OR REPLACE VIEW "public"."prp_movimientos_bancarios" AS
SELECT id,
    sesion_id,
    fecha_movimiento,
    descripcion,
    referencia_banco,
    referencia_cruzada,
    monto,
    tipo,
    conciliado,
    cobro_programado_id,
    created_at
   FROM prp.movimientos_bancarios;
CREATE OR REPLACE VIEW "public"."prp_nomina_transferencias" AS
SELECT np.folio AS periodo,
    np.fecha_pago,
    np.periodicidad,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo,
    e.banco,
    e.cuenta_clabe,
    ne.salario_periodo,
    ne.total_deducciones,
    ne.neto_pagar AS monto_transferir,
    ne.estatus_cfdi,
    ne.uuid_cfdi
   FROM nomina_empleado ne
     JOIN nomina_periodos np ON np.id = ne.periodo_id
     JOIN rh_empleados e ON e.id = ne.empleado_id
  WHERE np.estado = ANY (ARRAY['AUTORIZADA'::text, 'TIMBRADA'::text])
  ORDER BY np.fecha_pago, e.apellido_pat;
CREATE OR REPLACE VIEW "public"."prp_notas_contrato" AS
SELECT n.id,
    n.contrato_id,
    n.texto,
    n.tipo,
    n.autor_nombre,
    n.created_at,
    (('CTR-'::text || to_char(c.created_at, 'YY'::text)) || '-'::text) || lpad(row_number() OVER (PARTITION BY c.id ORDER BY c.created_at)::text, 4, '0'::text) AS contrato_folio
   FROM prp.notas_contrato n
     JOIN prp.contratos_arrendamiento c ON c.id = n.contrato_id;
CREATE OR REPLACE VIEW "public"."prp_pensiones_estacionamiento" AS
SELECT id,
    nombre,
    telefono,
    placa,
    marca_auto,
    color_auto,
    cajon_id,
    monto_mensual,
    fecha_inicio,
    fecha_fin,
    activo,
    created_at
   FROM prp.pensiones_estacionamiento;
CREATE OR REPLACE VIEW "public"."prp_prenomina" AS
SELECT ne.id,
    ne.periodo_id,
    np.folio AS periodo_folio,
    np.descripcion AS periodo_desc,
    np.fecha_inicio,
    np.fecha_fin,
    np.fecha_pago,
    np.periodicidad,
    np.estado AS periodo_estado,
    e.numero_empleado,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo,
    e.rfc,
    e.nss,
    e.banco,
    e.cuenta_clabe,
    ne.dias_periodo,
    ne.dias_trabajados,
    ne.dias_falta,
    ne.salario_diario,
    ne.salario_periodo,
    ne.total_percepciones,
    ne.total_deducciones,
    ne.isr_a_retener,
    ne.imss_obrero,
    ne.subsidio_empleo,
    ne.neto_pagar,
    ne.estatus_cfdi,
    ne.uuid_cfdi,
    ne.error_timbrado,
    ne.ajustado_manual,
    ne.notas
   FROM nomina_empleado ne
     JOIN nomina_periodos np ON np.id = ne.periodo_id
     JOIN rh_empleados e ON e.id = ne.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_prospectos" AS
SELECT p.id,
    TRIM(BOTH FROM (p.nombre::text || ' '::text) || COALESCE(p.apellidos, ''::character varying)::text) AS nombre_completo,
    p.nombre,
    p.apellidos,
    p.email,
    p.telefono,
    p.whatsapp,
    p.rfc,
    p.giro_solicitado,
    p.monto_ofertado,
    p.fecha_visita,
    p.estatus,
    p.motivo_rechazo,
    p.resultado_buro,
    p.created_at,
    u.numero_local AS unidad_interes,
    i.nombre AS inmueble_nombre
   FROM prp.prospectos p
     LEFT JOIN prp.unidades u ON u.id = p.unidad_id
     LEFT JOIN prp.inmuebles i ON i.id = u.inmueble_id;
CREATE OR REPLACE VIEW "public"."prp_proveedores" AS
SELECT id,
    nombre,
    rfc,
    email,
    telefono,
    categoria,
    activo,
    created_at
   FROM prp.proveedores;
CREATE OR REPLACE VIEW "public"."prp_tipos_incidencia" AS
SELECT id,
    clave,
    descripcion,
    afecta_nomina,
    requiere_monto,
    orden,
    activo
   FROM rh_tipos_incidencia
  WHERE activo;
CREATE OR REPLACE VIEW "public"."prp_turnos_guardia" AS
SELECT t.id,
    t.fecha,
    t.empleado_id,
    t.notas,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo,
    e.numero_empleado
   FROM rh_turnos_guardia t
     JOIN rh_empleados e ON e.id = t.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_unidades" AS
SELECT (('00000000-0000-0000-'::text || lpad(row_number() OVER (ORDER BY id_local)::text, 4, '0'::text)) || '-000000000001'::text)::uuid AS id,
    '00000000-0000-0000-0000-000000000001'::uuid AS inmueble_id,
    id_local AS numero_local,
    nivel AS tipo_unidad,
    superficie_m2 AS m2_totales,
    renta_proyectada AS renta_base,
    estatus AS estado_id,
    notas,
    created_at
   FROM cat_locales;
CREATE OR REPLACE VIEW "public"."prp_vacaciones_anio" AS
SELECT a.id,
    a.empleado_id,
    a.anio,
    a.dias_derecho,
    a.dias_tomados,
    a.dias_disponibles,
    a.notas,
    e.numero_empleado,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo
   FROM rh_vacaciones_anio a
     JOIN rh_empleados e ON e.id = a.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_vacaciones_detalle" AS
SELECT d.id,
    d.empleado_id,
    d.anio,
    d.fecha_inicio,
    d.fecha_fin,
    d.dias,
    d.monto,
    d.prima,
    d.estado,
    d.notas,
    e.numero_empleado,
    (e.nombre || ' '::text) || e.apellido_pat AS nombre_completo
   FROM rh_vacaciones_detalle d
     JOIN rh_empleados e ON e.id = d.empleado_id;
CREATE OR REPLACE VIEW "public"."prp_vacantes" AS
SELECT id,
    titulo,
    area,
    departamento,
    num_plazas,
    descripcion,
    perfil_requerido,
    salario_min,
    salario_max,
    tipo_contrato,
    fecha_apertura,
    fecha_cierre,
    status,
    notas,
    created_at,
    ( SELECT count(*) AS count
           FROM rh_candidatos c
          WHERE c.vacante_id = v.id) AS num_candidatos,
    ( SELECT count(*) AS count
           FROM rh_candidatos c
          WHERE c.vacante_id = v.id AND c.etapa <> 'RECHAZADO'::text) AS candidatos_activos
   FROM rh_vacantes v;
CREATE OR REPLACE VIEW "public"."prp_validacion_puntos" AS
SELECT p.id,
    p.clave,
    p.modulo,
    p.ruta,
    p.orden,
    p.titulo,
    p.descripcion,
    p.donde,
    p.critico,
    COALESCE(r.estado, 'PENDIENTE'::text) AS estado,
    r.notas,
    r.revisado_por,
    r.revisado_en,
    ( SELECT count(*) AS count
           FROM validacion_reportes x
          WHERE x.punto_id = p.id AND (x.estado = ANY (ARRAY['ABIERTO'::text, 'EN_REVISION'::text]))) AS reportes_abiertos
   FROM validacion_puntos p
     LEFT JOIN validacion_revisiones r ON r.punto_id = p.id
  WHERE p.activo;
CREATE OR REPLACE VIEW "public"."prp_validacion_reportes" AS
SELECT r.id,
    r.folio,
    r.punto_id,
    r.modulo,
    r.titulo,
    r.pasos,
    r.esperado,
    r.obtenido,
    r.severidad,
    r.estado,
    r.reportado_por,
    r.resolucion,
    r.resuelto_en,
    r.created_at,
    r.updated_at,
    p.clave AS punto_clave,
    p.titulo AS punto_titulo,
    ( SELECT count(*) AS count
           FROM validacion_adjuntos a
          WHERE a.reporte_id = r.id) AS n_adjuntos
   FROM validacion_reportes r
     LEFT JOIN validacion_puntos p ON p.id = r.punto_id;
CREATE OR REPLACE VIEW "public"."prp_vending_semana" AS
SELECT vs.id AS semana_id,
    vs.fecha_inicio AS semana_inicio,
    vs.fecha_fin AS semana_fin,
    vs.estado,
    vs.venta_pesos AS total_semana,
    vp.id AS producto_id,
    vp.producto AS nombre_producto,
    vp.precio_venta AS precio_venta_catalogo,
    vp.costo_caja,
    vp.unidades_caja,
    sp.id AS detalle_id,
    sp.qty_inicial,
    sp.qty_compras,
    sp.qty_ventas,
    sp.qty_final,
    sp.precio_venta_semana,
    sp.precio_compra_semana,
    sp.importe_ventas,
    sp.importe_compras,
    sp.importe_ventas - sp.importe_compras AS utilidad_bruta
   FROM vending_semanas vs
     JOIN vending_semana_producto sp ON sp.semana_id = vs.id
     JOIN vending_productos vp ON vp.id = sp.producto_id
  WHERE vp.activo = true;
CREATE OR REPLACE VIEW "public"."prp_vending_semanas" AS
SELECT semana_label,
    fecha_inicio,
    sum(venta_pesos) AS venta_total,
    sum(utilidad) AS utilidad_total,
    sum(venta_unidades) AS unidades_total
   FROM vending_semanas
  GROUP BY semana_label, fecha_inicio
  ORDER BY fecha_inicio;
CREATE OR REPLACE VIEW "public"."v_prospecto_docs_status" AS
SELECT pp.id AS persona_id,
    pp.prospecto_id,
    pp.tipo,
    pp.nombre_completo,
    pp.email,
    count(pd.id) AS total_docs,
    count(pd.id) FILTER (WHERE pd.estado = 'SUBIDO'::text) AS docs_subidos,
    count(pd.id) FILTER (WHERE pd.estado = 'APROBADO'::text) AS docs_aprobados,
    count(pd.id) FILTER (WHERE pd.estado = 'PENDIENTE'::text) AS docs_pendientes,
    count(pd.id) FILTER (WHERE pd.estado = 'RECHAZADO'::text) AS docs_rechazados
   FROM prospecto_personas pp
     LEFT JOIN prospecto_documentos pd ON pd.persona_id = pp.id
  GROUP BY pp.id, pp.prospecto_id, pp.tipo, pp.nombre_completo, pp.email;

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION prp.fn_portal_url()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_nombre TEXT;
BEGIN
  SELECT nombre INTO v_nombre FROM prp.prospectos WHERE id = NEW.prospecto_id;
  NEW.url_portal := 'https://priwoi.netlify.app/portal/prospecto/' || NEW.token;
  NEW.whatsapp_msg := 'Hola ' || v_nombre || ', sube tu documentación aquí: https://priwoi.netlify.app/portal/prospecto/' || NEW.token || ' (válido 72 hrs)';
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION prp.fn_referencia_cobro()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_num VARCHAR(20);
BEGIN
  SELECT numero_local INTO v_num FROM prp.unidades WHERE id = NEW.unidad_id;
  NEW.referencia_pago := 'CP-' || NEW.anio::TEXT
    || '-' || LPAD(NEW.mes::TEXT, 2, '0')
    || '-' || REPLACE(REPLACE(UPPER(v_num), ' ', ''), '-', '');
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION prp.generar_cobros_contrato(p_contrato_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      'TEMP-' || LPAD(i::TEXT, 2, '0')
    ) ON CONFLICT (contrato_id, mes, anio) DO NOTHING;
    v_contador := v_contador + 1;
  END LOOP;
  RETURN v_contador;
END;
$function$
;
CREATE OR REPLACE FUNCTION public._comp_mi_arr_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT id FROM public.arrendatarios WHERE auth_user_id = auth.uid() LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.autorizar_periodo_nomina(p_periodo_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.nomina_periodos SET
    estado         = 'AUTORIZADA',
    autorizado_por = auth.uid(),
    autorizado_at  = NOW(),
    updated_at     = NOW()
  WHERE id = p_periodo_id AND estado = 'CALCULADA';
  RETURN FOUND;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calcular_nomina_periodo(p_periodo_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_periodo      public.nomina_periodos%ROWTYPE;
  v_emp          RECORD;
  v_nom_id       UUID;
  v_dias         DECIMAL;
  v_faltas       DECIMAL;
  v_sal_periodo  DECIMAL;
  v_base_mensual DECIMAL;
  v_isr_mensual  DECIMAL;
  v_subsidio_m   DECIMAL;
  v_isr_periodo  DECIMAL;
  v_subsidio_p   DECIMAL;
  v_isr_retener  DECIMAL;
  v_imss         DECIMAL;
  v_neto         DECIMAL;
  v_cuota_fija   DECIMAL;
  v_tasa_exc     DECIMAL;
  v_lim_inf      DECIMAL;
  v_divisor      DECIMAL;
  v_count        INTEGER := 0;
  v_tot_perc     DECIMAL := 0;
  v_tot_ded      DECIMAL := 0;
  v_tot_neto     DECIMAL := 0;
BEGIN
  SELECT * INTO v_periodo FROM public.nomina_periodos WHERE id = p_periodo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Período % no encontrado', p_periodo_id; END IF;
  IF v_periodo.estado NOT IN ('BORRADOR','CALCULADA') THEN
    RAISE EXCEPTION 'Solo BORRADOR o CALCULADA puede recalcularse';
  END IF;

  -- Días naturales del período (inclusivo)
  v_dias := (v_periodo.fecha_fin - v_periodo.fecha_inicio) + 1;

  -- Divisor para convertir ISR mensual → período
  v_divisor := CASE v_periodo.periodicidad
    WHEN 'SEMANAL'   THEN 4.333
    WHEN 'QUINCENAL' THEN 2.0
    WHEN 'MENSUAL'   THEN 1.0
    ELSE 2.0
  END;

  -- Limpiar cálculos anteriores (solo no timbrados)
  DELETE FROM public.nomina_percepciones np
    USING public.nomina_empleado ne
    WHERE np.nomina_emp_id = ne.id
      AND ne.periodo_id = p_periodo_id
      AND ne.estatus_cfdi = 'PENDIENTE';
  DELETE FROM public.nomina_deducciones nd
    USING public.nomina_empleado ne
    WHERE nd.nomina_emp_id = ne.id
      AND ne.periodo_id = p_periodo_id
      AND ne.estatus_cfdi = 'PENDIENTE';
  DELETE FROM public.nomina_otros_pagos no2
    USING public.nomina_empleado ne
    WHERE no2.nomina_emp_id = ne.id
      AND ne.periodo_id = p_periodo_id
      AND ne.estatus_cfdi = 'PENDIENTE';
  DELETE FROM public.nomina_empleado
    WHERE periodo_id = p_periodo_id AND estatus_cfdi = 'PENDIENTE';

  -- ── Iterar TODOS los empleados activos con salario ──────────────────────
  -- Sin filtro de periodicidad: el período define el rango; todos participan.
  FOR v_emp IN
    SELECT
      e.id,
      e.nombre || ' ' || e.apellido_pat AS nombre_completo,
      e.rfc,
      e.nss,
      -- Salario: preferir el del contrato vigente, si no el del empleado
      COALESCE(
        (SELECT rc.salario_diario FROM public.rh_contratos rc
         WHERE rc.empleado_id = e.id AND rc.activo = TRUE
         ORDER BY rc.created_at DESC LIMIT 1),
        e.salario_diario, 0
      ) AS salario_diario,
      (SELECT rc.id FROM public.rh_contratos rc
       WHERE rc.empleado_id = e.id AND rc.activo = TRUE
       ORDER BY rc.created_at DESC LIMIT 1
      ) AS contrato_id
    FROM public.rh_empleados e
    WHERE e.estado_id = 'ACTIVO'
  LOOP
    -- Saltar empleados sin salario configurado
    IF COALESCE(v_emp.salario_diario, 0) <= 0 THEN CONTINUE; END IF;

    -- ── Faltas del período ───────────────────────────────────────────────
    SELECT COALESCE(COUNT(*), 0) INTO v_faltas
    FROM public.rh_asistencia
    WHERE empleado_id = v_emp.id
      AND fecha BETWEEN v_periodo.fecha_inicio AND v_periodo.fecha_fin
      AND estado = 'FALTA';

    -- ── Salario del período ──────────────────────────────────────────────
    v_sal_periodo := ROUND(v_emp.salario_diario * (v_dias - v_faltas), 2);

    -- ── ISR ─────────────────────────────────────────────────────────────
    -- Proyectar al mes para buscar en tarifa
    v_base_mensual := ROUND(v_sal_periodo * v_divisor, 2);

    SELECT cuota_fija, tasa_excedente, limite_inferior
    INTO v_cuota_fija, v_tasa_exc, v_lim_inf
    FROM public.sat_tarifa_isr
    WHERE anio = 2026
      AND v_base_mensual >= limite_inferior
      AND (limite_superior IS NULL OR v_base_mensual <= limite_superior)
    ORDER BY limite_inferior DESC LIMIT 1;

    v_isr_mensual := ROUND(
      COALESCE(v_cuota_fija, 0)
      + ((v_base_mensual - COALESCE(v_lim_inf, 0)) * COALESCE(v_tasa_exc, 0)),
      2
    );

    -- ── Subsidio al empleo ───────────────────────────────────────────────
    SELECT subsidio_mensual INTO v_subsidio_m
    FROM public.sat_subsidio_empleo
    WHERE anio = 2026
      AND v_base_mensual >= limite_inferior
      AND (limite_superior IS NULL OR v_base_mensual <= limite_superior)
    ORDER BY limite_inferior DESC LIMIT 1;
    v_subsidio_m := COALESCE(v_subsidio_m, 0);

    -- Convertir ISR y subsidio al período
    v_isr_periodo  := ROUND(v_isr_mensual / v_divisor, 2);
    v_subsidio_p   := ROUND(v_subsidio_m  / v_divisor, 2);
    v_isr_retener  := GREATEST(0, v_isr_periodo - v_subsidio_p);

    -- ── IMSS obrero (porcentaje simplificado 2026 ~3.675%) ───────────────
    v_imss := ROUND(v_emp.salario_diario * (v_dias - v_faltas) * 0.03675, 2);

    -- ── Neto ─────────────────────────────────────────────────────────────
    v_neto := ROUND(v_sal_periodo - v_isr_retener - v_imss, 2);

    -- Insertar en nomina_empleado
    INSERT INTO public.nomina_empleado (
      periodo_id, empleado_id, contrato_id,
      dias_periodo, dias_trabajados, dias_falta,
      salario_diario, salario_periodo,
      total_percepciones, total_deducciones,
      isr_base_mensual, isr_periodo, subsidio_empleo, isr_a_retener,
      imss_obrero, neto_pagar
    ) VALUES (
      p_periodo_id, v_emp.id, v_emp.contrato_id,
      v_dias, v_dias - v_faltas, v_faltas,
      v_emp.salario_diario, v_sal_periodo,
      v_sal_periodo,
      v_isr_retener + v_imss,
      v_base_mensual, v_isr_periodo, v_subsidio_p, v_isr_retener,
      v_imss, v_neto
    )
    RETURNING id INTO v_nom_id;

    -- Percepción: salario ordinario
    INSERT INTO public.nomina_percepciones
      (nomina_emp_id, tipo_percepcion, concepto, importe_gravado, dias_pagados)
    VALUES
      (v_nom_id, '001', 'Salario ordinario', v_sal_periodo, v_dias - v_faltas);

    -- Deducción: IMSS obrero
    IF v_imss > 0 THEN
      INSERT INTO public.nomina_deducciones
        (nomina_emp_id, tipo_deduccion, concepto, importe)
      VALUES (v_nom_id, '001', 'Cuotas IMSS obrero', v_imss);
    END IF;

    -- Deducción: ISR
    IF v_isr_retener > 0 THEN
      INSERT INTO public.nomina_deducciones
        (nomina_emp_id, tipo_deduccion, concepto, importe)
      VALUES (v_nom_id, '002', 'ISR retenido', v_isr_retener);
    END IF;

    -- Deducción: faltas
    IF v_faltas > 0 THEN
      INSERT INTO public.nomina_deducciones
        (nomina_emp_id, tipo_deduccion, concepto, importe)
      VALUES (
        v_nom_id, '006',
        'Descuento por ' || v_faltas::TEXT || ' falta(s)',
        ROUND(v_emp.salario_diario * v_faltas, 2)
      );
    END IF;

    -- Subsidio al empleo (otro pago)
    IF v_subsidio_p > 0 THEN
      INSERT INTO public.nomina_otros_pagos
        (nomina_emp_id, tipo_otro_pago, concepto, importe)
      VALUES (v_nom_id, '002', 'Subsidio para el empleo', v_subsidio_p);
    END IF;

    v_count    := v_count + 1;
    v_tot_perc := v_tot_perc + v_sal_periodo;
    v_tot_ded  := v_tot_ded  + v_isr_retener + v_imss;
    v_tot_neto := v_tot_neto + v_neto;
  END LOOP;

  -- Actualizar totales del período
  UPDATE public.nomina_periodos SET
    estado             = 'CALCULADA',
    total_empleados    = v_count,
    total_percepciones = ROUND(v_tot_perc, 2),
    total_deducciones  = ROUND(v_tot_ded,  2),
    total_neto         = ROUND(v_tot_neto, 2),
    updated_at         = NOW()
  WHERE id = p_periodo_id;

  RETURN jsonb_build_object(
    'ok',                TRUE,
    'empleados',         v_count,
    'total_percepciones', ROUND(v_tot_perc, 2),
    'total_deducciones',  ROUND(v_tot_ded,  2),
    'total_neto',         ROUND(v_tot_neto, 2)
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.confirmar_cobro(p_cobro_id uuid, p_fecha_pago_real date, p_monto_pagado numeric, p_forma_pago text, p_numero_operacion text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE prp.cobros_programados
  SET
    estatus               = 'PAGADO',
    conciliado            = TRUE,
    fecha_pago_real       = p_fecha_pago_real,
    monto_pagado          = p_monto_pagado,
    forma_pago            = p_forma_pago,
    numero_operacion_banco = p_numero_operacion,
    updated_at            = NOW()
  WHERE id = p_cobro_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.confirmar_cobros_batch(p_matches jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item   JSONB;
  v_ok     INT := 0;
  v_fail   INT := 0;
  v_errors TEXT[] := '{}';
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_matches)
  LOOP
    BEGIN
      UPDATE prp.cobros_programados
      SET
        estatus               = 'PAGADO',
        conciliado            = TRUE,
        fecha_pago_real       = (v_item->>'fecha')::DATE,
        monto_pagado          = (v_item->>'monto')::NUMERIC,
        forma_pago            = 'TRANSFERENCIA',
        numero_operacion_banco = LEFT(v_item->>'descripcion', 120),
        updated_at            = NOW()
      WHERE id = (v_item->>'cobro_id')::UUID
        AND estatus = 'PENDIENTE';

      IF FOUND THEN
        v_ok := v_ok + 1;
      ELSE
        -- cobro ya pagado o no encontrado: igualmente cuenta como ok
        v_ok := v_ok + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      v_errors := array_append(v_errors, SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'fail', v_fail, 'errors', to_jsonb(v_errors));
END;
$function$
;
CREATE OR REPLACE FUNCTION public.crear_empleado(p_nombre text, p_apellido_pat text, p_apellido_mat text DEFAULT ''::text, p_sexo character DEFAULT 'M'::bpchar, p_rfc text DEFAULT NULL::text, p_curp text DEFAULT NULL::text, p_nss text DEFAULT NULL::text, p_fecha_nacimiento date DEFAULT NULL::date, p_fecha_ingreso date DEFAULT CURRENT_DATE, p_puesto text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_departamento text DEFAULT NULL::text, p_salario_diario numeric DEFAULT NULL::numeric, p_email text DEFAULT NULL::text, p_celular text DEFAULT NULL::text, p_tipo_contrato text DEFAULT 'TEMPORAL_3SEM'::text, p_fecha_fin_contrato date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_emp_id UUID;
BEGIN
  INSERT INTO public.rh_empleados
    (nombre, apellido_pat, apellido_mat, sexo, rfc, curp, nss,
     fecha_nacimiento, fecha_ingreso, puesto, area, departamento,
     salario_diario, email, celular)
  VALUES
    (p_nombre, p_apellido_pat, NULLIF(p_apellido_mat,''), p_sexo,
     NULLIF(p_rfc,''), NULLIF(p_curp,''), NULLIF(p_nss,''),
     p_fecha_nacimiento, p_fecha_ingreso,
     NULLIF(p_puesto,''), NULLIF(p_area,''), NULLIF(p_departamento,''),
     p_salario_diario, NULLIF(p_email,''), NULLIF(p_celular,''))
  RETURNING id INTO v_emp_id;

  IF p_tipo_contrato IS NOT NULL THEN
    INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, fecha_fin, salario_diario, activo)
    VALUES (v_emp_id, p_tipo_contrato, p_fecha_ingreso, p_fecha_fin_contrato, p_salario_diario, TRUE);
  END IF;

  RETURN v_emp_id;
END;$function$
;
CREATE OR REPLACE FUNCTION public.crear_empleado(p_nombre text, p_apellido_pat text, p_apellido_mat text DEFAULT NULL::text, p_sexo text DEFAULT 'M'::text, p_rfc text DEFAULT NULL::text, p_curp text DEFAULT NULL::text, p_nss text DEFAULT NULL::text, p_fecha_nacimiento date DEFAULT NULL::date, p_fecha_ingreso date DEFAULT CURRENT_DATE, p_puesto text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_departamento text DEFAULT NULL::text, p_salario_diario numeric DEFAULT NULL::numeric, p_email text DEFAULT NULL::text, p_celular text DEFAULT NULL::text, p_tipo_contrato text DEFAULT 'TEMPORAL_3SEM'::text, p_fecha_fin_contrato date DEFAULT NULL::date, p_horario_trabajo text DEFAULT NULL::text, p_dia_descanso text DEFAULT NULL::text, p_forma_pago text DEFAULT 'TRANSFERENCIA'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
      DECLARE
        v_emp_id UUID;
      BEGIN
        INSERT INTO public.rh_empleados (
          nombre, apellido_pat, apellido_mat, sexo,
          rfc, curp, nss, fecha_nacimiento,
          fecha_ingreso, puesto, area, departamento,
          salario_diario, email, celular, estado_id,
          horario_trabajo, dia_descanso, forma_pago
        ) VALUES (
          p_nombre, p_apellido_pat, NULLIF(p_apellido_mat, ''), p_sexo,
          NULLIF(p_rfc,''), NULLIF(p_curp,''), NULLIF(p_nss,''), p_fecha_nacimiento,
          COALESCE(p_fecha_ingreso, CURRENT_DATE),
          NULLIF(p_puesto,''), NULLIF(p_area,''), NULLIF(p_departamento,''),
          p_salario_diario, NULLIF(p_email,''), NULLIF(p_celular,''), 'ACTIVO',
          NULLIF(p_horario_trabajo,''), NULLIF(p_dia_descanso,''),
          COALESCE(p_forma_pago, 'TRANSFERENCIA')
        ) RETURNING id INTO v_emp_id;

        IF p_tipo_contrato IS NOT NULL THEN
          INSERT INTO public.rh_contratos (
            empleado_id, tipo_contrato, fecha_inicio, fecha_fin,
            salario_diario, activo
          ) VALUES (
            v_emp_id, p_tipo_contrato,
            COALESCE(p_fecha_ingreso, CURRENT_DATE), p_fecha_fin_contrato,
            p_salario_diario, TRUE
          );
        END IF;

        RETURN v_emp_id;
      END;
      $function$
;
CREATE OR REPLACE FUNCTION public.crear_periodo_nomina(p_periodicidad text, p_fecha_inicio date, p_fecha_fin date, p_fecha_pago date, p_tipo_nomina text DEFAULT 'O'::text, p_descripcion text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id   UUID;
  v_folio TEXT;
  v_seq  INTEGER;
  v_prefix TEXT;
BEGIN
  v_prefix := CASE p_periodicidad
    WHEN 'SEMANAL'   THEN 'S'
    WHEN 'MENSUAL'   THEN 'M'
    ELSE 'Q'
  END;

  SELECT COALESCE(MAX(
    CAST(SUBSTR(folio, LENGTH(folio), 1) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.nomina_periodos
  WHERE periodicidad = p_periodicidad
    AND EXTRACT(YEAR  FROM fecha_inicio) = EXTRACT(YEAR  FROM p_fecha_inicio)
    AND EXTRACT(MONTH FROM fecha_inicio) = EXTRACT(MONTH FROM p_fecha_inicio);

  v_folio := 'NOM-' || TO_CHAR(p_fecha_inicio, 'YYYY-MM') || '-' || v_prefix || v_seq;

  INSERT INTO public.nomina_periodos (
    folio, periodicidad, fecha_inicio, fecha_fin, fecha_pago,
    tipo_nomina, descripcion, created_by
  ) VALUES (
    v_folio, p_periodicidad, p_fecha_inicio, p_fecha_fin, p_fecha_pago,
    p_tipo_nomina, p_descripcion, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.desmarcar_cobros(p_cobro_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_count INT;
BEGIN
  UPDATE prp.cobros_programados
  SET
    estatus               = 'PENDIENTE',
    conciliado            = FALSE,
    fecha_pago_real       = NULL,
    monto_pagado          = NULL,
    forma_pago            = NULL,
    numero_operacion_banco = NULL,
    updated_at            = NOW()
  WHERE id = ANY(p_cobro_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.docs_requeridos_por_tipo(p_tipo text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ SELECT CASE p_tipo WHEN 'INQUILINO' THEN ARRAY['INE_FRENTE','INE_REVERSO','COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3','SOLICITUD_FIRMADA'] WHEN 'OBLIGADO_SOLIDARIO' THEN ARRAY['INE_FRENTE','INE_REVERSO','COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3','COMPROBANTE_DOMICILIO','SOLICITUD_FIRMADA'] WHEN 'FIADOR' THEN ARRAY['INE_FRENTE','INE_REVERSO','COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3','COMPROBANTE_DOMICILIO','ESCRITURA_INMUEBLE','SOLICITUD_FIRMADA'] ELSE ARRAY[]::text[] END $function$
;
CREATE OR REPLACE FUNCTION public.documentos_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.es_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT rol_id IN ('super_admin','admin_inmobiliaria','gerente_plaza')
       FROM public.irp_usuarios WHERE id = auth.uid()),
    false)
$function$
;
CREATE OR REPLACE FUNCTION public.es_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT rol_id NOT IN ('arrendatario','prospecto','restaurante')
       FROM public.irp_usuarios WHERE id = auth.uid()),
    false)
$function$
;
CREATE OR REPLACE FUNCTION public.fn_actualizar_estado_cargo()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_cargos uuid[];
  v_cargo  uuid;
  v_importe  numeric;
  v_aplicado numeric;
  v_estado   text;
begin
  -- Un UPDATE puede mover la aplicación de un cargo a otro: hay que recalcular
  -- los dos, el que la recibe y el que la pierde.
  v_cargos := array_remove(array[
    case when tg_op in ('INSERT','UPDATE') then new.cargo_id end,
    case when tg_op in ('DELETE','UPDATE') then old.cargo_id end
  ], null);

  foreach v_cargo in array v_cargos loop
    select importe into v_importe from public.cargos_programados where id = v_cargo;
    if v_importe is null then continue; end if;

    select coalesce(sum(importe_aplicado), 0) into v_aplicado
      from public.aplicaciones_pago where cargo_id = v_cargo;

    if    v_aplicado >= v_importe - 0.01 then v_estado := 'PAGADO';
    elsif v_aplicado > 0                 then v_estado := 'PARCIAL';
    else                                      v_estado := 'PENDIENTE';
    end if;

    update public.cargos_programados
       set estado = v_estado, updated_at = now()
     where id = v_cargo and estado is distinct from v_estado;
  end loop;

  return coalesce(new, old);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_cerrar_sueldo_anterior()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.rh_historial_sueldo
     SET fecha_fin = NEW.fecha - 1
   WHERE empleado_id = NEW.empleado_id
     AND id <> NEW.id
     AND fecha < NEW.fecha
     AND fecha_fin IS NULL;
  RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.fn_clasificacion_desde_aplicaciones(p_ingreso bigint)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare v_conceptos text[];
begin
  select array_agg(distinct
           case when c.concepto in ('RENTA','SANCION','AGUA') then c.concepto else 'OTRO' end)
    into v_conceptos
    from public.aplicaciones_pago a
    join public.cargos_programados c on c.id = a.cargo_id
   where a.ingreso_id = p_ingreso
     and coalesce(a.importe_aplicado, 0) > 0;

  -- Sin aplicaciones no hay distribución de la cual deducir nada: se devuelve
  -- NULL y quien llama deja la clasificación como estaba, sin inventarla.
  if v_conceptos is null or array_length(v_conceptos, 1) = 0 then
    return null;
  end if;
  if array_length(v_conceptos, 1) = 1 then
    return v_conceptos[1];
  end if;
  return 'MIXTO';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_consolidar_dia_asistencia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_emp    uuid;
  v_op     text;
  v_fecha_marcaje date;
  v_cruza  boolean;
  v_entrada_prog time;
  v_shift  date;   -- día de turno a consolidar (puede no ser v_fecha_marcaje)
  v_ent    timestamp;
  v_sal    timestamp;
  v_ref    time;
  v_min    integer;
  v_ret    integer;
BEGIN
  v_emp          := COALESCE(NEW.empleado_id, OLD.empleado_id);
  v_op           := COALESCE(NEW.operacion,   OLD.operacion);
  v_fecha_marcaje := COALESCE(NEW.fecha,      OLD.fecha);
  IF v_emp IS NULL THEN RETURN NULL; END IF;

  SELECT cruza_medianoche, hora_entrada_prog INTO v_cruza, v_entrada_prog
    FROM public.rh_empleados WHERE id = v_emp;
  v_cruza := COALESCE(v_cruza, false);

  v_shift := CASE WHEN v_cruza AND v_op = 'SALIDA' THEN v_fecha_marcaje - 1 ELSE v_fecha_marcaje END;

  IF v_cruza THEN
    -- El turno de v_shift junta la ENTRADA de v_shift con la SALIDA del día
    -- siguiente (v_shift + 1), sin importar la hora exacta de cada una.
    SELECT min(fecha_hora) FILTER (WHERE operacion = 'ENTRADA' AND fecha = v_shift),
           max(fecha_hora) FILTER (WHERE operacion = 'SALIDA'  AND fecha = v_shift + 1)
      INTO v_ent, v_sal
      FROM public.rh_checadas
     WHERE empleado_id = v_emp AND fecha IN (v_shift, v_shift + 1);
  ELSE
    SELECT min(fecha_hora) FILTER (WHERE operacion = 'ENTRADA'),
           max(fecha_hora) FILTER (WHERE operacion = 'SALIDA')
      INTO v_ent, v_sal
      FROM public.rh_checadas
     WHERE empleado_id = v_emp AND fecha = v_shift;
  END IF;

  IF v_ent IS NULL AND v_sal IS NULL THEN
    DELETE FROM public.rh_asistencia WHERE empleado_id = v_emp AND fecha = v_shift;
    RETURN NULL;
  END IF;

  -- El horario programado manda si existe; si no, se sigue leyendo el
  -- primer HH:MM del texto libre (compatibilidad con quien no lo tenga
  -- capturado todavía).
  SELECT COALESCE(
           v_entrada_prog,
           (substring(horario_trabajo from '(\d{1,2}:\d{2})'))::time,
           ((substring(horario_trabajo from '(\d{1,2})\s*[-–]\s*\d') || ':00'))::time,
           '08:00'::time)
    INTO v_ref FROM public.rh_empleados WHERE id = v_emp;
  v_ref := COALESCE(v_ref, '08:00'::time);

  -- Con timestamp completo (no solo ::time) el cálculo de minutos trabajados
  -- da bien aunque la salida caiga al día siguiente.
  v_min := CASE WHEN v_ent IS NOT NULL AND v_sal IS NOT NULL
                THEN EXTRACT(epoch FROM (v_sal - v_ent))::int / 60 END;
  v_ret := CASE WHEN v_ent IS NOT NULL
                THEN GREATEST(0, EXTRACT(epoch FROM (v_ent::time - v_ref))::int / 60) ELSE 0 END;
  IF v_ret <= 5 THEN v_ret := 0; END IF;

  INSERT INTO public.rh_asistencia
    (empleado_id, fecha, hora_entrada, hora_salida, minutos_trabajados, minutos_retardo, estado, fuente)
  VALUES
    (v_emp, v_shift, v_ent::time, v_sal::time, v_min, v_ret,
     CASE WHEN v_ent IS NULL THEN 'FALTA' WHEN v_ret > 10 THEN 'RETARDO' ELSE 'PRESENTE' END,
     'CHECADAS')
  ON CONFLICT (empleado_id, fecha) DO UPDATE SET
    hora_entrada = EXCLUDED.hora_entrada, hora_salida = EXCLUDED.hora_salida,
    minutos_trabajados = EXCLUDED.minutos_trabajados, minutos_retardo = EXCLUDED.minutos_retardo,
    estado = EXCLUDED.estado, fuente = EXCLUDED.fuente;
  RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.fn_generar_folios_iwol()
 RETURNS TABLE(contrato_id uuid, folio_generado text, estatus_nuevo text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v            RECORD;
  v_loc_str    TEXT;
  v_loc_code   TEXT;
  v_anio       TEXT;
  v_base       TEXT;
  v_folio      TEXT;
  v_cnt        INT;
  v_estatus    TEXT;
BEGIN
  FOR v IN
    SELECT id, locales_display, locales_referencia, fecha_inicio, estatus, numero_contrato
    FROM public.contratos
    WHERE numero_contrato IS NULL OR numero_contrato NOT LIKE 'IWOL-%'
    ORDER BY fecha_inicio NULLS LAST
  LOOP
    -- Extraer números de local y concatenar con pad de 2 dígitos
    SELECT string_agg(lpad(m[1], 2, '0'), '' ORDER BY m[1]::INT)
    INTO   v_loc_code
    FROM   regexp_matches(COALESCE(v.locales_display, v.locales_referencia, ''), '(\d+)', 'g') AS m;

    IF v_loc_code IS NULL OR v_loc_code = '' THEN
      v_loc_code := 'XX';
    END IF;

    v_anio := COALESCE(to_char(v.fecha_inicio, 'YYYY'), to_char(CURRENT_DATE, 'YYYY'));
    v_base := 'IWOL-L' || v_loc_code || '-' || v_anio;

    -- Garantizar unicidad
    SELECT COUNT(*) INTO v_cnt FROM public.contratos
    WHERE numero_contrato LIKE v_base || '%';
    IF v_cnt > 0 THEN
      v_folio := v_base || '-' || (v_cnt + 1)::TEXT;
    ELSE
      v_folio := v_base;
    END IF;

    -- Normalizar estatus legacy
    v_estatus := CASE
      WHEN v.estatus IN ('VIGENTE','VENCIDO','RENOVADO','RESCISION') THEN v.estatus
      WHEN v.estatus = 'TERMINADO' THEN 'VENCIDO'
      ELSE 'VIGENTE'
    END;

    UPDATE public.contratos
       SET numero_contrato = v_folio,
           estatus         = v_estatus
     WHERE id = v.id;

    contrato_id      := v.id;
    folio_generado   := v_folio;
    estatus_nuevo    := v_estatus;
    RETURN NEXT;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_generar_sanciones(p_pct_default numeric DEFAULT 0.10)
 RETURNS TABLE(contratos_afectados integer, sanciones_creadas integer)
 LANGUAGE plpgsql
AS $function$
DECLARE v_cargo RECORD; v_monto NUMERIC; v_cnt INT := 0;
BEGIN
  FOR v_cargo IN
    SELECT cp.id, cp.contrato_id, cp.importe, cp.periodo_mes, cp.periodo_anio, cp.descripcion
    FROM public.cargos_programados cp
    WHERE cp.concepto = 'RENTA' AND cp.estado IN ('PENDIENTE','PARCIAL')
      AND cp.fecha_vencimiento < CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public.cargos_programados s
        WHERE s.origen_cargo_id = cp.id AND s.concepto = 'SANCION'
          AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE))
  LOOP
    SELECT cp2.importe - COALESCE(SUM(ap.importe_aplicado),0) INTO v_monto
    FROM public.cargos_programados cp2
    LEFT JOIN public.aplicaciones_pago ap ON ap.cargo_id = cp2.id
    WHERE cp2.id = v_cargo.id GROUP BY cp2.importe;
    IF v_monto > 0 THEN
      INSERT INTO public.cargos_programados (contrato_id, concepto, descripcion, periodo_mes, periodo_anio, importe, fecha_vencimiento, origen_cargo_id, generado_auto)
      VALUES (v_cargo.contrato_id,'SANCION','Sancion por mora - '||COALESCE(v_cargo.descripcion,''),
        EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT,
        ROUND(v_monto*p_pct_default,2), CURRENT_DATE+5, v_cargo.id, TRUE);
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  RETURN QUERY SELECT v_cnt, v_cnt;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_recalcular_clasificacion_ingreso(p_ingreso bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare v_nueva text;
begin
  if p_ingreso is null then return; end if;
  v_nueva := public.fn_clasificacion_desde_aplicaciones(p_ingreso);

  -- La elección manual manda: el recálculo no la pisa. Y si la deducción no da
  -- resultado (ingreso sin aplicaciones) se conserva lo que hubiera.
  update public.ingresos
     set clasificacion = coalesce(v_nueva, clasificacion)
   where id = p_ingreso
     and clasificacion_manual = false
     and clasificacion is distinct from coalesce(v_nueva, clasificacion);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_recalcular_vacaciones_anio()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_emp uuid; v_anio integer;
BEGIN
  v_emp  := COALESCE(NEW.empleado_id, OLD.empleado_id);
  v_anio := COALESCE(NEW.anio,        OLD.anio);

  INSERT INTO public.rh_vacaciones_anio (empleado_id, anio)
  VALUES (v_emp, v_anio) ON CONFLICT (empleado_id, anio) DO NOTHING;

  UPDATE public.rh_vacaciones_anio a
     SET dias_tomados = COALESCE((
       SELECT sum(d.dias) FROM public.rh_vacaciones_detalle d
        WHERE d.empleado_id = v_emp AND d.anio = v_anio
          AND d.estado IN ('AUTORIZADA','TOMADA')), 0)
   WHERE a.empleado_id = v_emp AND a.anio = v_anio;
  RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.fn_trg_clasificacion_ingreso()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op in ('INSERT','UPDATE') then
    perform public.fn_recalcular_clasificacion_ingreso(new.ingreso_id);
  end if;
  -- Un UPDATE puede mover la aplicación de un ingreso a otro: los dos cambian.
  if tg_op in ('DELETE','UPDATE') then
    perform public.fn_recalcular_clasificacion_ingreso(old.ingreso_id);
  end if;
  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_validar_aplicaciones_vs_ingreso()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_ingreso   bigint;
  v_importe   numeric;
  v_aplicado  numeric;
begin
  v_ingreso := new.ingreso_id;

  select importe into v_importe from public.ingresos where id = v_ingreso;
  -- Un ingreso sin importe capturado no da contra qué comparar; no se bloquea.
  if v_importe is null then return null; end if;

  select coalesce(sum(importe_aplicado), 0) into v_aplicado
    from public.aplicaciones_pago where ingreso_id = v_ingreso;

  -- Tolerancia de un centavo: el redondeo de un importe no debe tumbar una captura.
  if v_aplicado > v_importe + 0.01 then
    raise exception
      'La distribución excede el pago: el ingreso #% es de $% y se están aplicando $% (sobran $%). Ajusta los importes o quita el cargo que sobra.',
      v_ingreso,
      to_char(v_importe,  'FM999,999,990.00'),
      to_char(v_aplicado, 'FM999,999,990.00'),
      to_char(v_aplicado - v_importe, 'FM999,999,990.00');
  end if;

  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_validar_ingreso_vs_aplicaciones()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare v_aplicado numeric;
begin
  if new.importe is null then return null; end if;

  select coalesce(sum(importe_aplicado), 0) into v_aplicado
    from public.aplicaciones_pago where ingreso_id = new.id;

  if v_aplicado > new.importe + 0.01 then
    raise exception
      'No se puede bajar el ingreso #% a $%: ya tiene $% distribuidos entre cargos. Corrige primero la distribución.',
      new.id,
      to_char(new.importe, 'FM999,999,990.00'),
      to_char(v_aplicado,  'FM999,999,990.00');
  end if;

  return null;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.gen_numero_empleado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(numero_empleado, '[^0-9]', '', 'g'), '') AS INT)), 0) + 1
  INTO v_num FROM public.rh_empleados;
  NEW.numero_empleado := 'E' || LPAD(v_num::TEXT, 3, '0');
  RETURN NEW;
END;$function$
;
CREATE OR REPLACE FUNCTION public.get_mi_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT rol_id FROM public.irp_usuarios WHERE id = auth.uid();
$function$
;
CREATE OR REPLACE FUNCTION public.inicializar_docs_persona()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ DECLARE doc text; BEGIN FOREACH doc IN ARRAY public.docs_requeridos_por_tipo(NEW.tipo) LOOP INSERT INTO public.prospecto_documentos (persona_id, tipo_doc) VALUES (NEW.id, doc); END LOOP; RETURN NEW; END; $function$
;
CREATE OR REPLACE FUNCTION public.log_bitacora(p_modulo text, p_accion text, p_entidad text DEFAULT NULL::text, p_entidad_id uuid DEFAULT NULL::uuid, p_descripcion text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO prp.bitacora (
    modulo, accion, entidad, entidad_id, descripcion,
    usuario_id, usuario_email, created_at
  )
  SELECT
    p_modulo, p_accion, p_entidad, p_entidad_id, p_descripcion,
    auth.uid(),
    u.email,
    NOW()
  FROM auth.users u
  WHERE u.id = auth.uid()
  UNION ALL
  SELECT p_modulo, p_accion, p_entidad, p_entidad_id, p_descripcion,
    auth.uid(), NULL, NOW()
  WHERE auth.uid() IS NULL
  LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.marcar_cfdi_nomina_timbrado(p_nomina_emp_id uuid, p_uuid text, p_xml text, p_pdf_b64 text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_periodo_id UUID;
BEGIN
  UPDATE public.nomina_empleado SET
    uuid_cfdi      = p_uuid,
    xml_cfdi       = p_xml,
    pdf_base64     = p_pdf_b64,
    fecha_timbrado = CASE WHEN p_error IS NULL THEN NOW() ELSE NULL END,
    estatus_cfdi   = CASE WHEN p_error IS NULL THEN 'TIMBRADO' ELSE 'ERROR' END,
    error_timbrado = p_error,
    updated_at     = NOW()
  WHERE id = p_nomina_emp_id;

  SELECT periodo_id INTO v_periodo_id FROM public.nomina_empleado WHERE id = p_nomina_emp_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.nomina_empleado
    WHERE periodo_id = v_periodo_id AND estatus_cfdi = 'PENDIENTE'
  ) THEN
    UPDATE public.nomina_periodos SET estado = 'TIMBRADA', updated_at = NOW()
    WHERE id = v_periodo_id AND estado = 'AUTORIZADA';
  END IF;

  RETURN TRUE;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.mi_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT rol_id FROM public.irp_usuarios WHERE id = auth.uid()
$function$
;
CREATE OR REPLACE FUNCTION public.renovar_contrato(p_contrato_id uuid, p_folio text, p_arrendatario_id uuid, p_unidad_id uuid, p_tipo_contrato text, p_fecha_inicio date, p_fecha_fin date DEFAULT NULL::date, p_renta_mensual numeric DEFAULT 0, p_cuota_mant numeric DEFAULT 0, p_deposito_garantia numeric DEFAULT 0, p_dia_cobro integer DEFAULT 1, p_penalizacion_mora numeric DEFAULT 5, p_incremento_anual numeric DEFAULT 0, p_fiador_nombre text DEFAULT NULL::text, p_fiador_rfc text DEFAULT NULL::text, p_fiador_domicilio text DEFAULT NULL::text, p_notas text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_nuevo_id uuid;
  v_original record;
BEGIN
  SELECT * INTO v_original FROM public.contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % no encontrado', p_contrato_id;
  END IF;

  UPDATE public.contratos
  SET estatus = 'RENOVADO', updated_at = now()
  WHERE id = p_contrato_id;

  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    fecha_inicio, fecha_fin,
    renta_mensual, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_rfc, fiador_domicilio,
    notas, estatus, estatus_proceso,
    contrato_anterior_id, created_at, updated_at
  ) VALUES (
    p_folio, p_arrendatario_id,
    p_fecha_inicio, p_fecha_fin,
    p_renta_mensual,
    CASE WHEN p_deposito_garantia > 0 THEN p_deposito_garantia ELSE v_original.deposito_garantia END,
    p_dia_cobro, p_penalizacion_mora, p_incremento_anual,
    NULLIF(p_fiador_nombre, ''),
    NULLIF(p_fiador_rfc, ''),
    NULLIF(p_fiador_domicilio, ''),
    COALESCE(NULLIF(p_notas, ''), v_original.notas),
    'VIGENTE', 'EN_RENOVACION',
    p_contrato_id,
    now(), now()
  )
  RETURNING id INTO v_nuevo_id;

  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  SELECT v_nuevo_id, local_id, p_renta_mensual
  FROM public.contratos_locales
  WHERE contrato_id = p_contrato_id;

  UPDATE public.cat_locales
  SET contrato_activo_id = v_nuevo_id, estatus = 'OCUPADO'
  WHERE id_local IN (
    SELECT local_id FROM public.contratos_locales WHERE contrato_id = v_nuevo_id
  );

  RETURN v_nuevo_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;
CREATE OR REPLACE FUNCTION public.sync_local_estatus()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.estatus = 'VIGENTE' THEN
    UPDATE public.cat_locales l
    SET estatus = 'OCUPADO', contrato_activo_id = NEW.id
    FROM public.contratos_locales cl
    WHERE cl.contrato_id = NEW.id AND cl.local_id = l.id_local;
  ELSIF NEW.estatus IN ('RESCISION','VENCIDO','CANCELADO') THEN
    UPDATE public.cat_locales l
    SET estatus = 'DISPONIBLE', contrato_activo_id = NULL
    FROM public.contratos_locales cl
    WHERE cl.contrato_id = NEW.id AND cl.local_id = l.id_local;
  END IF;
  RETURN NEW;
END; $function$
;

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS "trig_portal_url" ON "prp"."prospectos_tokens";
CREATE TRIGGER trig_portal_url BEFORE INSERT ON prp.prospectos_tokens FOR EACH ROW EXECUTE FUNCTION prp.fn_portal_url();
DROP TRIGGER IF EXISTS "trig_ref_cobro" ON "prp"."cobros_programados";
CREATE TRIGGER trig_ref_cobro BEFORE INSERT ON prp.cobros_programados FOR EACH ROW WHEN (((new.referencia_pago)::text ~~ 'TEMP-%'::text)) EXECUTE FUNCTION prp.fn_referencia_cobro();
DROP TRIGGER IF EXISTS "documentos_touch_trg" ON "public"."documentos";
CREATE TRIGGER documentos_touch_trg BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION documentos_touch();
DROP TRIGGER IF EXISTS "trg_actualizar_cargo_estado" ON "public"."aplicaciones_pago";
CREATE TRIGGER trg_actualizar_cargo_estado AFTER INSERT OR DELETE OR UPDATE ON public.aplicaciones_pago FOR EACH ROW EXECUTE FUNCTION fn_actualizar_estado_cargo();
DROP TRIGGER IF EXISTS "trg_aplicacion_no_excede_ingreso" ON "public"."aplicaciones_pago";
CREATE CONSTRAINT TRIGGER trg_aplicacion_no_excede_ingreso AFTER INSERT OR UPDATE ON public.aplicaciones_pago DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fn_validar_aplicaciones_vs_ingreso();
DROP TRIGGER IF EXISTS "trg_checada_consolida" ON "public"."rh_checadas";
CREATE TRIGGER trg_checada_consolida AFTER INSERT OR DELETE OR UPDATE ON public.rh_checadas FOR EACH ROW EXECUTE FUNCTION fn_consolidar_dia_asistencia();
DROP TRIGGER IF EXISTS "trg_cierra_sueldo" ON "public"."rh_historial_sueldo";
CREATE TRIGGER trg_cierra_sueldo AFTER INSERT ON public.rh_historial_sueldo FOR EACH ROW EXECUTE FUNCTION fn_cerrar_sueldo_anterior();
DROP TRIGGER IF EXISTS "trg_clasificacion_ingreso" ON "public"."aplicaciones_pago";
CREATE TRIGGER trg_clasificacion_ingreso AFTER INSERT OR DELETE OR UPDATE ON public.aplicaciones_pago FOR EACH ROW EXECUTE FUNCTION fn_trg_clasificacion_ingreso();
DROP TRIGGER IF EXISTS "trg_contratos_upd" ON "public"."contratos";
CREATE TRIGGER trg_contratos_upd BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS "trg_er_mensual_updated_at" ON "public"."er_mensual";
CREATE TRIGGER trg_er_mensual_updated_at BEFORE UPDATE ON public.er_mensual FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS "trg_gen_numero_empleado" ON "public"."rh_empleados";
CREATE TRIGGER trg_gen_numero_empleado BEFORE INSERT ON public.rh_empleados FOR EACH ROW WHEN ((new.numero_empleado IS NULL)) EXECUTE FUNCTION gen_numero_empleado();
DROP TRIGGER IF EXISTS "trg_ingreso_no_menor_que_aplicaciones" ON "public"."ingresos";
CREATE CONSTRAINT TRIGGER trg_ingreso_no_menor_que_aplicaciones AFTER UPDATE ON public.ingresos DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN ((new.importe IS DISTINCT FROM old.importe)) EXECUTE FUNCTION fn_validar_ingreso_vs_aplicaciones();
DROP TRIGGER IF EXISTS "trg_init_docs_persona" ON "public"."prospecto_personas";
CREATE TRIGGER trg_init_docs_persona AFTER INSERT ON public.prospecto_personas FOR EACH ROW EXECUTE FUNCTION inicializar_docs_persona();
DROP TRIGGER IF EXISTS "trg_locales_upd" ON "public"."cat_locales";
CREATE TRIGGER trg_locales_upd BEFORE UPDATE ON public.cat_locales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS "trg_sync_local_estatus" ON "public"."contratos";
CREATE TRIGGER trg_sync_local_estatus AFTER INSERT OR UPDATE OF estatus ON public.contratos FOR EACH ROW EXECUTE FUNCTION sync_local_estatus();
DROP TRIGGER IF EXISTS "trg_vac_recalcula" ON "public"."rh_vacaciones_detalle";
CREATE TRIGGER trg_vac_recalcula AFTER INSERT OR DELETE OR UPDATE ON public.rh_vacaciones_detalle FOR EACH ROW EXECUTE FUNCTION fn_recalcular_vacaciones_anio();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE "prp"."accesos_estacionamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."adendums" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."agua_lecturas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."agua_recibos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."arrendatarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."bitacora" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."cajones_estacionamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."cat_estado_general" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."cat_grupo_gasto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."cobros_programados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."cobros_turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."conciliaciones_sesiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."contrato_unidades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."contratos_arrendamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."contratos_documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."edr_conceptos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."empleados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."estado_resultados_mensual" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."fondo_revolvente_cierres" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."fondos_revolventes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."gastos_fijos_anuales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."gastos_operativos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."inmuebles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."movimientos_bancarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."notas_contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."pensiones_estacionamiento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."precios_unidad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."presupuesto_mensual" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."prospectos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."prospectos_documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."prospectos_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."proveedores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."recibos_efectivo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."unidades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."vending_cierres_semanales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prp"."vending_productos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON "prp"."accesos_estacionamiento" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."adendums" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."agua_lecturas" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."agua_recibos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."arrendatarios" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_arrendatarios" ON "prp"."arrendatarios" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_bitacora" ON "prp"."bitacora" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_select_bitacora" ON "prp"."bitacora" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_authenticated_bitacora" ON "prp"."bitacora" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."cajones_estacionamiento" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_cajones_estacionamiento" ON "prp"."cajones_estacionamiento" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."cat_estado_general" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."cat_grupo_gasto" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_cat_grupo_gasto" ON "prp"."cat_grupo_gasto" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."cobros_programados" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_cobros_programados" ON "prp"."cobros_programados" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."cobros_turno" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."conciliaciones_sesiones" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."contrato_unidades" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."contratos_arrendamiento" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_contratos_arrendamiento" ON "prp"."contratos_arrendamiento" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."contratos_documentos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_documentos" ON "prp"."documentos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."edr_conceptos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."empleados" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_empleados" ON "prp"."empleados" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."estado_resultados_mensual" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."fondo_revolvente_cierres" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."fondos_revolventes" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_fondos_revolventes" ON "prp"."fondos_revolventes" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."gastos_fijos_anuales" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."gastos_operativos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_gastos_operativos" ON "prp"."gastos_operativos" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."inmuebles" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_inmuebles" ON "prp"."inmuebles" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."movimientos_bancarios" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON "prp"."notas_contrato" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_notas_contrato" ON "prp"."notas_contrato" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."pensiones_estacionamiento" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_pensiones_estacionamiento" ON "prp"."pensiones_estacionamiento" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."precios_unidad" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."presupuesto_mensual" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_prospecto_read" ON "prp"."prospectos" AS PERMISSIVE FOR SELECT TO anon USING ((id IN ( SELECT prospectos_tokens.prospecto_id
   FROM prp.prospectos_tokens
  WHERE ((prospectos_tokens.fecha_expiracion > now()) AND (NOT prospectos_tokens.usado)))));
CREATE POLICY "auth_all" ON "prp"."prospectos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_prospectos" ON "prp"."prospectos" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_doc_insert" ON "prp"."prospectos_documentos" AS PERMISSIVE FOR INSERT TO anon WITH CHECK ((prospecto_id IN ( SELECT prospectos_tokens.prospecto_id
   FROM prp.prospectos_tokens
  WHERE ((prospectos_tokens.fecha_expiracion > now()) AND (NOT prospectos_tokens.usado)))));
CREATE POLICY "auth_all" ON "prp"."prospectos_documentos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_token_read" ON "prp"."prospectos_tokens" AS PERMISSIVE FOR SELECT TO anon USING (((fecha_expiracion > now()) AND (NOT usado)));
CREATE POLICY "auth_all" ON "prp"."prospectos_tokens" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."proveedores" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_proveedores" ON "prp"."proveedores" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."recibos_efectivo" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."roles" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."unidades" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "read_authenticated_unidades" ON "prp"."unidades" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "prp"."vending_cierres_semanales" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "prp"."vending_productos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE "public"."aplicaciones_pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."arrendatarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cargos_programados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cat_despachos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cat_locales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cat_parametros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cat_productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cat_proveedores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."comprobantes_pago" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contratos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contratos_locales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."er_mensual" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estacionamiento_diario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estacionamiento_pensiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gasto_detalle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gastos_operativos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ingresos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."irp_usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notas_contrato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ordenes_trabajo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prospecto_documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prospecto_historial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prospecto_magic_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prospecto_personas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prospectos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."restaurante_gasto_detalle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."restaurante_gastos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_asistencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_beneficios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_candidatos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_capacitacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_checadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_contratos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_documentos_empleado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_empleados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_evaluaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_expediente_documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_historial_cambios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_historial_nombre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_historial_sueldo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_incidencias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_tipos_incidencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_turnos_guardia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_vacaciones_anio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_vacaciones_detalle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rh_vacantes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."validacion_adjuntos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."validacion_puntos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."validacion_reportes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."validacion_revisiones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vending_movimientos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vending_productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vending_semana_producto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vending_semanas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados todo" ON "public"."aplicaciones_pago" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_arrend" ON "public"."arrendatarios" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "autenticados todo" ON "public"."cargos_programados" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."cat_despachos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_locales" ON "public"."cat_locales" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read" ON "public"."cat_parametros" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all" ON "public"."cat_productos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."cat_proveedores" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "comp_rls" ON "public"."comprobantes_pago" AS PERMISSIVE FOR ALL TO authenticated USING (((arrendatario_id = _comp_mi_arr_id()) OR (EXISTS ( SELECT 1
   FROM irp_usuarios
  WHERE ((irp_usuarios.id = auth.uid()) AND (irp_usuarios.rol_id = ANY (ARRAY['SUPERADMIN'::text, 'ADMIN'::text, 'ADMINISTRADOR'::text, 'GERENTE'::text, 'COBRANZA'::text]))))))) WITH CHECK ((arrendatario_id = _comp_mi_arr_id()));
CREATE POLICY "auth_all_contratos" ON "public"."contratos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cl" ON "public"."contratos_locales" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "documentos_auth_all" ON "public"."documentos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_er_mensual" ON "public"."er_mensual" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."estacionamiento_diario" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."estacionamiento_pensiones" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."gasto_detalle" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."gastos_operativos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ingresos" ON "public"."ingresos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_administra_usuarios" ON "public"."irp_usuarios" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "admin_borra_usuarios" ON "public"."irp_usuarios" AS PERMISSIVE FOR DELETE TO authenticated USING (es_admin());
CREATE POLICY "admin_lee_todos" ON "public"."irp_usuarios" AS PERMISSIVE FOR SELECT TO authenticated USING (es_admin());
CREATE POLICY "usuarios_actualizan_su_ficha" ON "public"."irp_usuarios" AS PERMISSIVE FOR UPDATE TO authenticated USING (((id = auth.uid()) OR es_admin())) WITH CHECK (((id = auth.uid()) OR es_admin()));
CREATE POLICY "usuarios_leen_su_ficha" ON "public"."irp_usuarios" AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
CREATE POLICY "auth_all_notas" ON "public"."notas_contrato" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ordenes_trabajo" ON "public"."ordenes_trabajo" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pagos" ON "public"."pagos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON "public"."prospecto_documentos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON "public"."prospecto_historial" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON "public"."prospecto_magic_links" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON "public"."prospecto_personas" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full" ON "public"."prospectos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "restaurante_detalle_auth" ON "public"."restaurante_gasto_detalle" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "restaurante_gastos_auth" ON "public"."restaurante_gastos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_asistencia" ON "public"."rh_asistencia" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_rh_beneficios" ON "public"."rh_beneficios" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_candidatos" ON "public"."rh_candidatos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_rh_capacitacion" ON "public"."rh_capacitacion" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_checadas" ON "public"."rh_checadas" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_contratos" ON "public"."rh_contratos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_docs" ON "public"."rh_documentos_empleado" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_empleados" ON "public"."rh_empleados" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_rh_evaluaciones" ON "public"."rh_evaluaciones" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_rh_expediente_documentos" ON "public"."rh_expediente_documentos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_rh_historial_cambios" ON "public"."rh_historial_cambios" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_hist_nombre" ON "public"."rh_historial_nombre" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_hist_sueldo" ON "public"."rh_historial_sueldo" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_incidencias_all" ON "public"."rh_incidencias" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_tipos_incidencia" ON "public"."rh_tipos_incidencia" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_turnos_guardia" ON "public"."rh_turnos_guardia" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_vacaciones_anio" ON "public"."rh_vacaciones_anio" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_vacaciones_detalle" ON "public"."rh_vacaciones_detalle" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rh_vacantes" ON "public"."rh_vacantes" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_validacion_adjuntos" ON "public"."validacion_adjuntos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_validacion_puntos" ON "public"."validacion_puntos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_validacion_reportes" ON "public"."validacion_reportes" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_validacion_revisiones" ON "public"."validacion_revisiones" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."vending_movimientos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."vending_productos" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."vending_semana_producto" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON "public"."vending_semanas" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);