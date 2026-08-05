-- ============================================================
-- IRP — Plaza IWOL: Contratos reales desde nombres de archivo
-- Script 02 — Arrendatarios, Contratos, Tablas 3NF
-- ============================================================

-- ── 1. NUEVAS TABLAS 3NF ────────────────────────────────────

-- Histórico de precios por unidad (precio cambia en el tiempo)
CREATE TABLE IF NOT EXISTS prp.precios_unidad (
  id              BIGSERIAL PRIMARY KEY,
  unidad_id       BIGINT NOT NULL REFERENCES prp.unidades(id),
  precio_lista    NUMERIC(12,2) NOT NULL,
  precio_negociado NUMERIC(12,2),
  vigente_desde   DATE NOT NULL,
  vigente_hasta   DATE,            -- NULL = precio actual vigente
  motivo          TEXT,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uk_precio_unidad_fecha UNIQUE (unidad_id, vigente_desde)
);

-- Tabla puente: un contrato puede abarcar múltiples locales
CREATE TABLE IF NOT EXISTS prp.contrato_unidades (
  contrato_id  BIGINT NOT NULL REFERENCES prp.contratos_arrendamiento(id) ON DELETE CASCADE,
  unidad_id    BIGINT NOT NULL REFERENCES prp.unidades(id),
  es_principal BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (contrato_id, unidad_id)
);

-- Addendums / modificaciones a contratos
CREATE TABLE IF NOT EXISTS prp.adendums (
  id             BIGSERIAL PRIMARY KEY,
  contrato_id    BIGINT NOT NULL REFERENCES prp.contratos_arrendamiento(id),
  numero_adendum SMALLINT DEFAULT 1,
  fecha_adendum  DATE,
  descripcion    TEXT,
  monto_anterior NUMERIC(12,2),
  monto_nuevo    NUMERIC(12,2),
  archivo_nombre TEXT,
  creado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE prp.precios_unidad  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.contrato_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE prp.adendums         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON prp.precios_unidad   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON prp.contrato_unidades FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON prp.adendums          FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. ARRENDATARIOS REALES (de nombres de archivos) ─────────

INSERT INTO prp.arrendatarios
  (nombre_comercial, tipo_persona, estado_id)
VALUES
  ('ALEJANDRO MUÑOZ',     'FISICA',  1),
  ('ALFREDO BARVO',       'FISICA',  1),
  ('LUIS VICENTE',        'FISICA',  1),
  ('ANDREA CASTILLO',     'FISICA',  1),
  ('C&R MOTOR',           'MORAL',   1),
  ('ISAGENIX',            'MORAL',   1),
  ('DENYS RETAMA',        'FISICA',  1),
  ('LUZ ADRIANA',         'FISICA',  1),
  ('GUILLERMO HERICE',    'FISICA',  1),
  ('LIZETH CRISTINA',     'FISICA',  1),
  ('VANESSA ACERO',       'FISICA',  1),
  ('CARLOS MICHEL',       'FISICA',  1),
  ('AVAXO',               'MORAL',   1),
  ('DULCE MICHELLE',      'FISICA',  1),
  ('GRUPO OAKLIFE',       'MORAL',   1),
  ('GERARDO QUIROZ',      'FISICA',  1),
  ('ENRIQUE GARCIA',      'FISICA',  1),
  ('NANCY GALLARDO',      'FISICA',  1),
  ('LEO VIÑAS',           'FISICA',  1)
ON CONFLICT DO NOTHING;

-- ── 3. CONTRATOS (datos base — montos y fechas por completar) ──

DO $$
DECLARE
  inmueble_id BIGINT;
  -- Arrendatario IDs
  v_alejandro  BIGINT; v_alfredo   BIGINT; v_luis      BIGINT;
  v_andrea     BIGINT; v_cyr       BIGINT; v_isagenix  BIGINT;
  v_denys      BIGINT; v_luz       BIGINT; v_guillermo BIGINT;
  v_lizeth     BIGINT; v_vanessa   BIGINT; v_carlos    BIGINT;
  v_avaxo      BIGINT; v_dulce     BIGINT; v_oaklife   BIGINT;
  v_gerardo    BIGINT; v_enrique   BIGINT; v_nancy     BIGINT;
  v_leo        BIGINT;
  -- Unidad IDs
  u8  BIGINT; u9  BIGINT; u10 BIGINT; u11 BIGINT; u12 BIGINT;
  u13 BIGINT; u15 BIGINT; u16 BIGINT; u17 BIGINT; u18 BIGINT;
  u19 BIGINT; u23 BIGINT; u27 BIGINT; u28 BIGINT; u29 BIGINT;
  u30 BIGINT; u31 BIGINT; u32 BIGINT; u33 BIGINT; u34 BIGINT;
  u35 BIGINT; u36 BIGINT; u37 BIGINT; u38 BIGINT;
  -- Contrato IDs (para junction + adendums)
  c_andrea2   BIGINT; c_carlos    BIGINT; c_oaklife   BIGINT;
  c_leo       BIGINT; c_enrique   BIGINT;
  estado_vigente BIGINT;
BEGIN
  -- Obtener inmueble Plaza IWOL
  SELECT id INTO inmueble_id FROM prp.inmuebles WHERE nombre ILIKE '%IWOL%' LIMIT 1;

  -- Obtener estado VIGENTE
  SELECT id INTO estado_vigente FROM prp.cat_estado_general WHERE clave = 'VIGENTE' LIMIT 1;

  -- Obtener arrendatario IDs
  SELECT id INTO v_alejandro FROM prp.arrendatarios WHERE nombre_comercial = 'ALEJANDRO MUÑOZ' LIMIT 1;
  SELECT id INTO v_alfredo   FROM prp.arrendatarios WHERE nombre_comercial = 'ALFREDO BARVO' LIMIT 1;
  SELECT id INTO v_luis      FROM prp.arrendatarios WHERE nombre_comercial = 'LUIS VICENTE' LIMIT 1;
  SELECT id INTO v_andrea    FROM prp.arrendatarios WHERE nombre_comercial = 'ANDREA CASTILLO' LIMIT 1;
  SELECT id INTO v_cyr       FROM prp.arrendatarios WHERE nombre_comercial = 'C&R MOTOR' LIMIT 1;
  SELECT id INTO v_isagenix  FROM prp.arrendatarios WHERE nombre_comercial = 'ISAGENIX' LIMIT 1;
  SELECT id INTO v_denys     FROM prp.arrendatarios WHERE nombre_comercial = 'DENYS RETAMA' LIMIT 1;
  SELECT id INTO v_luz       FROM prp.arrendatarios WHERE nombre_comercial = 'LUZ ADRIANA' LIMIT 1;
  SELECT id INTO v_guillermo FROM prp.arrendatarios WHERE nombre_comercial = 'GUILLERMO HERICE' LIMIT 1;
  SELECT id INTO v_lizeth    FROM prp.arrendatarios WHERE nombre_comercial = 'LIZETH CRISTINA' LIMIT 1;
  SELECT id INTO v_vanessa   FROM prp.arrendatarios WHERE nombre_comercial = 'VANESSA ACERO' LIMIT 1;
  SELECT id INTO v_carlos    FROM prp.arrendatarios WHERE nombre_comercial = 'CARLOS MICHEL' LIMIT 1;
  SELECT id INTO v_avaxo     FROM prp.arrendatarios WHERE nombre_comercial = 'AVAXO' LIMIT 1;
  SELECT id INTO v_dulce     FROM prp.arrendatarios WHERE nombre_comercial = 'DULCE MICHELLE' LIMIT 1;
  SELECT id INTO v_oaklife   FROM prp.arrendatarios WHERE nombre_comercial = 'GRUPO OAKLIFE' LIMIT 1;
  SELECT id INTO v_gerardo   FROM prp.arrendatarios WHERE nombre_comercial = 'GERARDO QUIROZ' LIMIT 1;
  SELECT id INTO v_enrique   FROM prp.arrendatarios WHERE nombre_comercial = 'ENRIQUE GARCIA' LIMIT 1;
  SELECT id INTO v_nancy     FROM prp.arrendatarios WHERE nombre_comercial = 'NANCY GALLARDO' LIMIT 1;
  SELECT id INTO v_leo       FROM prp.arrendatarios WHERE nombre_comercial = 'LEO VIÑAS' LIMIT 1;

  -- Obtener unidad IDs por clave
  SELECT id INTO u8  FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L8';
  SELECT id INTO u9  FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L9';
  SELECT id INTO u10 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L10';
  SELECT id INTO u11 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L11';
  SELECT id INTO u12 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L12';
  SELECT id INTO u13 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L13';
  SELECT id INTO u15 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L15';
  SELECT id INTO u16 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L16';
  SELECT id INTO u17 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L17';
  SELECT id INTO u18 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L18';
  SELECT id INTO u19 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L19';
  SELECT id INTO u23 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L23';
  SELECT id INTO u27 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L27';
  SELECT id INTO u28 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L28';
  SELECT id INTO u29 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L29';
  SELECT id INTO u30 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L30';
  SELECT id INTO u31 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L31';
  SELECT id INTO u32 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L32';
  SELECT id INTO u33 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L33';
  SELECT id INTO u34 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L34';
  SELECT id INTO u35 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L35';
  SELECT id INTO u36 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L36';
  SELECT id INTO u37 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L37';
  SELECT id INTO u38 FROM prp.unidades WHERE inmueble_id = inmueble_id AND clave = 'L38';

  -- ── Contratos simples (1 local) ────────────────────────────

  -- L8 ALEJANDRO MUÑOZ
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_alejandro, u8, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L9 ALFREDO BARVO
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_alfredo, u9, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L10 LUIS VICENTE
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_luis, u10, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L13 C&R MOTOR
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_cyr, u13, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L15 ISAGENIX
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_isagenix, u15, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L16 DENYS RETAMA
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_denys, u16, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L17 LUZ ADRIANA
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_luz, u17, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L18 GUILLERMO HERICE
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_guillermo, u18, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L19 LIZETH CRISTINA
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_lizeth, u19, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L23 VANESSA ACERO
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_vanessa, u23, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L29 AVAXO
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_avaxo, u29, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L30 DULCE MICHELLE
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_dulce, u30, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L33 GERARDO QUIROZ
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_gerardo, u33, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L35 ANDREA CASTILLO (segundo contrato, local distinto)
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_andrea, u35, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- L36 NANCY GALLARDO
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_nancy, u36, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente);

  -- ── Contratos DOBLES (L11-12, L27-28, L31-32, L37-38) ─────

  -- L11-12 ANDREA CASTILLO 2026-2027
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id, notas)
  VALUES (v_andrea, u11, 'SUBARRENDAMIENTO', '2026-01-01', '2027-12-31', 0, estado_vigente, 'Abarca L11 y L12')
  RETURNING id INTO c_andrea2;
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_andrea2, u11, TRUE);
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_andrea2, u12, FALSE);

  -- L27-28 CARLOS MICHEL
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id, notas)
  VALUES (v_carlos, u27, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente, 'Abarca L27 y L28')
  RETURNING id INTO c_carlos;
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_carlos, u27, TRUE);
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_carlos, u28, FALSE);

  -- L31-32 GRUPO OAKLIFE
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id, notas)
  VALUES (v_oaklife, u31, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente, 'Abarca L31 y L32')
  RETURNING id INTO c_oaklife;
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_oaklife, u31, TRUE);
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_oaklife, u32, FALSE);

  -- L34 ENRIQUE GARCIA
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id)
  VALUES (v_enrique, u34, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente)
  RETURNING id INTO c_enrique;

  -- L37-38 LEO VIÑAS
  INSERT INTO prp.contratos_arrendamiento
    (arrendatario_id, unidad_id, tipo_documento, fecha_inicio, fecha_fin, monto_renta, estado_id, notas)
  VALUES (v_leo, u37, 'SUBARRENDAMIENTO', '2025-01-01', '2025-12-31', 0, estado_vigente, 'Abarca L37 y L38')
  RETURNING id INTO c_leo;
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_leo, u37, TRUE);
  INSERT INTO prp.contrato_unidades (contrato_id, unidad_id, es_principal) VALUES (c_leo, u38, FALSE);

  -- ── 4. ADDENDUMS ──────────────────────────────────────────

  INSERT INTO prp.adendums (contrato_id, numero_adendum, descripcion, archivo_nombre)
  VALUES
    (c_oaklife, 1, 'Addendum L31-L32 Grupo Oaklife', 'ADENDUM L31Y32 GRUPO OAKLIFE.pdf'),
    (c_enrique, 1, 'Addendum L34 Enrique Garcia',    'ADENDUM L34_ENRIQUE GARACIA.pdf');

END $$;

-- ── 5. VERIFICACIÓN ───────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM prp.arrendatarios)         AS arrendatarios,
  (SELECT COUNT(*) FROM prp.contratos_arrendamiento) AS contratos,
  (SELECT COUNT(*) FROM prp.contrato_unidades)       AS contrato_unidades,
  (SELECT COUNT(*) FROM prp.adendums)                AS adendums,
  (SELECT COUNT(*) FROM prp.precios_unidad)          AS precios;
