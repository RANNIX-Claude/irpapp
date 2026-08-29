-- ============================================================
-- PRP — Módulo RH COMPLETO
-- Reloj checador · Asistencias · Historial salarial
-- Movimientos laborales · IMSS/SUA · Bajas · Finiquitos
-- Evaluaciones · Capacitación
-- ============================================================
-- Ejecutar DESPUÉS de reset_database.sql
-- ============================================================

SET search_path TO prp, public;

-- ============================================================
-- BLOQUE A — CATÁLOGOS RH ADICIONALES
-- ============================================================

-- A.1 Tipo de marca (reloj checador)
CREATE TABLE IF NOT EXISTS prp.cat_tipo_marca (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  orden  INTEGER -- para ordenar la secuencia del día
);
INSERT INTO prp.cat_tipo_marca (clave, nombre, orden) VALUES
  ('ENTRADA',         'Entrada',                1),
  ('SALIDA_COMIDA',   'Salida a comer',         2),
  ('ENTRADA_COMIDA',  'Regreso de comida',      3),
  ('SALIDA',          'Salida',                 4),
  ('ENTRADA_EXTRA',   'Entrada hora extra',     5),
  ('SALIDA_EXTRA',    'Salida hora extra',      6)
ON CONFLICT DO NOTHING;

-- A.2 Tipo de dispositivo checador
CREATE TABLE IF NOT EXISTS prp.cat_tipo_dispositivo (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_dispositivo (clave, nombre) VALUES
  ('BIOMETRICO',  'Biométrico (huella digital)'),
  ('RFID',        'Tarjeta RFID'),
  ('PIN',         'PIN numérico'),
  ('APP_MOVIL',   'App móvil con GPS'),
  ('FACIAL',      'Reconocimiento facial'),
  ('MANUAL',      'Captura manual admin')
ON CONFLICT DO NOTHING;

-- A.3 Motivo de baja
CREATE TABLE IF NOT EXISTS prp.cat_motivo_baja (
  id             SERIAL PRIMARY KEY,
  clave          TEXT UNIQUE NOT NULL,
  nombre         TEXT NOT NULL,
  genera_finiquito BOOLEAN DEFAULT TRUE,
  partes_proporcionales BOOLEAN DEFAULT TRUE,
  prima_antiguedad BOOLEAN DEFAULT FALSE,
  indemnizacion  BOOLEAN DEFAULT FALSE -- aplica solo despido injustificado
);
INSERT INTO prp.cat_motivo_baja (clave, nombre, genera_finiquito, partes_proporcionales, prima_antiguedad, indemnizacion) VALUES
  ('RENUNCIA_VOLUNTARIA',   'Renuncia voluntaria',          TRUE,  TRUE,  FALSE, FALSE),
  ('DESPIDO_JUSTIFICADO',   'Despido justificado Art.47',   TRUE,  TRUE,  FALSE, FALSE),
  ('DESPIDO_INJUSTIFICADO', 'Despido injustificado',        TRUE,  TRUE,  TRUE,  TRUE),
  ('MUTUO_ACUERDO',         'Mutuo acuerdo / convenio',     TRUE,  TRUE,  FALSE, FALSE),
  ('FIN_CONTRATO',          'Fin contrato determinado',     TRUE,  TRUE,  FALSE, FALSE),
  ('FALLECIMIENTO',         'Fallecimiento',                TRUE,  TRUE,  FALSE, FALSE),
  ('JUBILACION',            'Jubilación / retiro',          TRUE,  TRUE,  TRUE,  FALSE),
  ('ABANDONO',              'Abandono de empleo',           FALSE, FALSE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- A.4 Tipo de movimiento laboral
CREATE TABLE IF NOT EXISTS prp.cat_tipo_movimiento_laboral (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);
INSERT INTO prp.cat_tipo_movimiento_laboral (clave, nombre) VALUES
  ('CONTRATACION',        'Contratación / Alta'),
  ('CAMBIO_PUESTO',       'Cambio de puesto'),
  ('CAMBIO_AREA',         'Cambio de área / departamento'),
  ('CAMBIO_SUELDO',       'Modificación de sueldo'),
  ('CAMBIO_HORARIO',      'Cambio de horario'),
  ('CAMBIO_CONTRATO',     'Cambio de tipo de contrato'),
  ('CAMBIO_TURNO',        'Cambio de turno'),
  ('PERMISO_ESPECIAL',    'Permiso especial'),
  ('INCAPACIDAD',         'Incapacidad IMSS'),
  ('PENSION_IMSS',        'Alta pensión IMSS'),
  ('BAJA',                'Baja / terminación'),
  ('RECONTRATACION',      'Recontratación')
ON CONFLICT DO NOTHING;

-- A.5 Tipo de movimiento IMSS (SUA)
CREATE TABLE IF NOT EXISTS prp.cat_tipo_movimiento_imss (
  id      SERIAL PRIMARY KEY,
  clave   TEXT UNIQUE NOT NULL,
  nombre  TEXT NOT NULL,
  codigo_sua TEXT
);
INSERT INTO prp.cat_tipo_movimiento_imss (clave, nombre, codigo_sua) VALUES
  ('ALTA',           'Alta inicial',               '08'),
  ('BAJA',           'Baja',                       '02'),
  ('MOD_SUELDO',     'Modificación de salario',    '07'),
  ('REINGRESO',      'Reingreso',                  '08'),
  ('INCAP_RIESGO',   'Incapacidad riesgo trabajo', '11'),
  ('INCAP_ENFERM',   'Incapacidad enfermedad',     '12'),
  ('INCAP_MATERN',   'Incapacidad maternidad',     '14')
ON CONFLICT DO NOTHING;

-- A.6 Tipo de evaluación de desempeño
CREATE TABLE IF NOT EXISTS prp.cat_tipo_evaluacion (
  id     SERIAL PRIMARY KEY,
  clave  TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  periodicidad TEXT -- MENSUAL, TRIMESTRAL, SEMESTRAL, ANUAL
);
INSERT INTO prp.cat_tipo_evaluacion (clave, nombre, periodicidad) VALUES
  ('FIN_PRUEBA',   'Evaluación fin periodo a prueba',  'UNICA'),
  ('TRIMESTRAL',   'Evaluación trimestral',            'TRIMESTRAL'),
  ('SEMESTRAL',    'Evaluación semestral',             'SEMESTRAL'),
  ('ANUAL',        'Evaluación anual de desempeño',    'ANUAL'),
  ('360_GRADOS',   'Evaluación 360°',                  'ANUAL')
ON CONFLICT DO NOTHING;

-- ============================================================
-- BLOQUE B — RELOJ CHECADOR Y ASISTENCIAS
-- ============================================================

-- B.1 Dispositivos checadores registrados
CREATE TABLE IF NOT EXISTS prp.dispositivos_checador (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre           TEXT NOT NULL,
  tipo             TEXT REFERENCES prp.cat_tipo_dispositivo(clave),
  serie            TEXT,
  modelo           TEXT,
  marca            TEXT,
  inmueble_id      UUID REFERENCES prp.inmuebles(id),
  ubicacion        TEXT, -- 'Entrada principal', 'Cafetería', etc.
  ip               TEXT,
  formato_export   TEXT DEFAULT 'CSV' CHECK (formato_export IN ('CSV','TXT','EXCEL','API')),
  activo           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- B.2 Importaciones del reloj (cada vez que se importa un archivo)
CREATE TABLE IF NOT EXISTS prp.importaciones_checador (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispositivo_id   UUID REFERENCES prp.dispositivos_checador(id),
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE NOT NULL,
  archivo_nombre   TEXT,
  archivo_url      TEXT, -- Storage path
  total_registros  INTEGER DEFAULT 0,
  registros_ok     INTEGER DEFAULT 0,
  registros_error  INTEGER DEFAULT 0,
  procesado        BOOLEAN DEFAULT FALSE,
  procesado_at     TIMESTAMPTZ,
  procesado_por    UUID,
  errores_json     JSONB, -- array de errores encontrados
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- B.3 Registros crudos del reloj (tal como viene del dispositivo)
CREATE TABLE IF NOT EXISTS prp.registros_checador (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  importacion_id   UUID REFERENCES prp.importaciones_checador(id),
  dispositivo_id   UUID REFERENCES prp.dispositivos_checador(id),
  empleado_id      UUID REFERENCES prp.empleados(id),
  -- Si el reloj usa número de nómina o huella (antes de cruzar con empleados):
  codigo_empleado  TEXT, -- número en el reloj (puede ser numero_empleado)
  fecha_hora       TIMESTAMPTZ NOT NULL,
  tipo_marca       TEXT REFERENCES prp.cat_tipo_marca(clave),
  origen           TEXT DEFAULT 'RELOJ' CHECK (origen IN ('RELOJ','APP','MANUAL','IMPORTADO')),
  latitud          DECIMAL(10,7), -- si viene del app móvil
  longitud         DECIMAL(10,7),
  valido           BOOLEAN DEFAULT TRUE,
  error_mensaje    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- B.4 Asistencia procesada (un registro por empleado por día)
-- Esta es la tabla con la que se calcula nómina
CREATE TABLE IF NOT EXISTS prp.asistencia_diaria (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id           UUID REFERENCES prp.empleados(id),
  fecha                 DATE NOT NULL,
  -- Marcas del día
  hora_entrada          TIME,
  hora_salida_comida    TIME,
  hora_entrada_comida   TIME,
  hora_salida           TIME,
  -- Cálculos
  horas_trabajadas      DECIMAL(6,2) DEFAULT 0,
  horas_extra           DECIMAL(6,2) DEFAULT 0,
  minutos_retardo       INTEGER DEFAULT 0,
  -- Estado del día
  estado                TEXT DEFAULT 'PRESENTE' CHECK (estado IN (
    'PRESENTE',       -- asistió
    'RETARDO',        -- llegó tarde (> tolerancia)
    'FALTA',          -- no se presentó
    'VACACIONES',     -- día de vacaciones autorizado
    'INCAPACIDAD',    -- incapacidad IMSS
    'PERMISO_GOCE',   -- permiso con goce
    'PERMISO_SIN',    -- permiso sin goce
    'FESTIVO',        -- día feriado oficial
    'DESCANSO',       -- día de descanso semanal
    'INCOMPLETO'      -- faltó alguna marca
  )),
  -- Referencia a incidencia autorizada (si aplica)
  incidencia_id         UUID REFERENCES prp.incidencias_rh(id),
  -- Control
  ajustado_manualmente  BOOLEAN DEFAULT FALSE,
  ajustado_por          UUID,
  ajustado_at           TIMESTAMPTZ,
  notas                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empleado_id, fecha)
);

-- B.5 Reglas de asistencia por empleado / turno
CREATE TABLE IF NOT EXISTS prp.reglas_asistencia (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre                TEXT NOT NULL, -- 'Turno administrativo', 'Turno cocina', etc.
  hora_entrada          TIME NOT NULL,
  hora_salida           TIME NOT NULL,
  tolerancia_mins       INTEGER DEFAULT 10, -- minutos de gracia para retardo
  minutos_comida        INTEGER DEFAULT 60,
  dias_trabajo          INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Lun, 7=Dom
  horas_semana          DECIMAL(5,2) DEFAULT 48.00,
  activo                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Asignar regla a empleado
ALTER TABLE prp.empleados
  ADD COLUMN IF NOT EXISTS regla_asistencia_id UUID REFERENCES prp.reglas_asistencia(id);

-- ============================================================
-- BLOQUE C — HISTORIAL SALARIAL Y MOVIMIENTOS LABORALES
-- ============================================================

-- C.1 Historial de salarios (todo cambio queda registrado)
CREATE TABLE IF NOT EXISTS prp.historial_salario (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id       UUID REFERENCES prp.empleados(id),
  salario_diario_ant  DECIMAL(10,2),
  salario_mensual_ant DECIMAL(12,2),
  salario_diario_nuevo DECIMAL(10,2) NOT NULL,
  salario_mensual_nuevo DECIMAL(12,2) NOT NULL,
  motivo            TEXT NOT NULL, -- 'Ajuste anual', 'Promoción', 'Revisión salarial', etc.
  fecha_vigencia    DATE NOT NULL,
  autorizado_por    UUID,
  movimiento_imss   BOOLEAN DEFAULT TRUE, -- requiere aviso modificación IMSS
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- C.2 Historial de movimientos laborales (todo cambio en el expediente)
CREATE TABLE IF NOT EXISTS prp.movimientos_laborales (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id       UUID REFERENCES prp.empleados(id),
  tipo_movimiento   TEXT REFERENCES prp.cat_tipo_movimiento_laboral(clave),
  -- Valores anteriores y nuevos (flexible con JSONB)
  valor_anterior    JSONB, -- {"puesto":"Cajero","area":"Ventas","salario":8000}
  valor_nuevo       JSONB, -- {"puesto":"Supervisor","area":"Ventas","salario":11000}
  descripcion       TEXT,
  fecha_efectiva    DATE NOT NULL,
  autorizado_por    UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: al cambiar salario en empleados → guardar historial automáticamente
CREATE OR REPLACE FUNCTION prp.fn_registrar_cambio_salario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.salario_mensual IS DISTINCT FROM NEW.salario_mensual) THEN
    INSERT INTO prp.historial_salario (
      empleado_id,
      salario_diario_ant, salario_mensual_ant,
      salario_diario_nuevo, salario_mensual_nuevo,
      motivo, fecha_vigencia, movimiento_imss
    ) VALUES (
      NEW.id,
      OLD.salario_diario, OLD.salario_mensual,
      NEW.salario_diario, NEW.salario_mensual,
      'Actualización directa en sistema', CURRENT_DATE, TRUE
    );
    -- También registra movimiento laboral
    INSERT INTO prp.movimientos_laborales (
      empleado_id, tipo_movimiento,
      valor_anterior, valor_nuevo, descripcion, fecha_efectiva
    ) VALUES (
      NEW.id, 'CAMBIO_SUELDO',
      jsonb_build_object('salario_diario', OLD.salario_diario, 'salario_mensual', OLD.salario_mensual),
      jsonb_build_object('salario_diario', NEW.salario_diario, 'salario_mensual', NEW.salario_mensual),
      'Cambio de salario', CURRENT_DATE
    );
  END IF;
  IF (OLD.puesto IS DISTINCT FROM NEW.puesto) OR (OLD.area IS DISTINCT FROM NEW.area) THEN
    INSERT INTO prp.movimientos_laborales (
      empleado_id, tipo_movimiento,
      valor_anterior, valor_nuevo, descripcion, fecha_efectiva
    ) VALUES (
      NEW.id, CASE WHEN OLD.puesto IS DISTINCT FROM NEW.puesto THEN 'CAMBIO_PUESTO' ELSE 'CAMBIO_AREA' END,
      jsonb_build_object('puesto', OLD.puesto, 'area', OLD.area),
      jsonb_build_object('puesto', NEW.puesto, 'area', NEW.area),
      'Cambio de posición', CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_historial_salario
  BEFORE UPDATE ON prp.empleados
  FOR EACH ROW EXECUTE FUNCTION prp.fn_registrar_cambio_salario();

-- ============================================================
-- BLOQUE D — MOVIMIENTOS IMSS / SUA
-- ============================================================

-- D.1 Registro de movimientos IMSS (para generar archivos SUA)
CREATE TABLE IF NOT EXISTS prp.movimientos_imss (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id     UUID REFERENCES prp.empleados(id),
  tipo_movimiento TEXT REFERENCES prp.cat_tipo_movimiento_imss(clave),
  nss             TEXT NOT NULL, -- # IMSS
  nombre_completo TEXT NOT NULL,
  curp            TEXT,
  salario_diario  DECIMAL(10,2),
  fecha_movimiento DATE NOT NULL,
  fecha_vigencia  DATE,
  -- Para incapacidades
  num_dias_incap  INTEGER,
  folio_imss      TEXT,
  -- Control
  enviado_sua     BOOLEAN DEFAULT FALSE,
  enviado_at      TIMESTAMPTZ,
  archivo_sua     TEXT, -- path del archivo generado
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOQUE E — BAJAS Y FINIQUITOS
-- ============================================================

-- E.1 Bajas de empleados
CREATE TABLE IF NOT EXISTS prp.bajas_empleado (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id         UUID REFERENCES prp.empleados(id) UNIQUE, -- 1 baja activa
  motivo_baja         TEXT REFERENCES prp.cat_motivo_baja(clave),
  fecha_baja          DATE NOT NULL,
  ultimo_dia_trabajado DATE NOT NULL,
  descripcion         TEXT,
  -- Carta de rescisión (si aplica)
  carta_rescision_url TEXT,
  -- Estado del proceso
  estado              TEXT DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO','FINIQUITADO','CANCELADO')),
  imss_dado_baja      BOOLEAN DEFAULT FALSE,
  imss_baja_at        DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- E.2 Cálculo de finiquito
CREATE TABLE IF NOT EXISTS prp.finiquitos (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baja_id               UUID REFERENCES prp.bajas_empleado(id),
  empleado_id           UUID REFERENCES prp.empleados(id),
  -- Datos base del cálculo
  salario_diario        DECIMAL(10,2) NOT NULL,
  salario_mensual       DECIMAL(12,2) NOT NULL,
  fecha_ingreso         DATE NOT NULL,
  fecha_baja            DATE NOT NULL,
  dias_trabajados_total  INTEGER NOT NULL, -- días desde ingreso hasta baja
  anos_completos        INTEGER NOT NULL,
  -- Partes proporcionales
  dias_aguinaldo_prop   DECIMAL(5,2),
  monto_aguinaldo_prop  DECIMAL(12,2),
  dias_vacaciones_prop  DECIMAL(5,2),
  monto_vacaciones_prop DECIMAL(12,2),
  monto_prima_vac_prop  DECIMAL(12,2),
  -- Liquidación (solo despido injustificado)
  meses_indemnizacion   INTEGER DEFAULT 0, -- Art. 50 LFT: 3 meses
  monto_indemnizacion   DECIMAL(12,2) DEFAULT 0,
  -- Prima de antigüedad (si aplica)
  dias_prima_antiguedad INTEGER DEFAULT 0, -- 12 días por año
  monto_prima_antiguedad DECIMAL(12,2) DEFAULT 0,
  -- Saldo de nómina pendiente
  salario_pendiente     DECIMAL(12,2) DEFAULT 0,
  -- TOTAL
  subtotal              DECIMAL(12,2) NOT NULL,
  isr_retenido          DECIMAL(12,2) DEFAULT 0,
  total_neto            DECIMAL(12,2) NOT NULL,
  -- Control
  pagado                BOOLEAN DEFAULT FALSE,
  pagado_at             DATE,
  forma_pago            TEXT,
  recibo_url            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOQUE F — EVALUACIONES DE DESEMPEÑO
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.evaluaciones_desempeno (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id       UUID REFERENCES prp.empleados(id),
  tipo_evaluacion   TEXT REFERENCES prp.cat_tipo_evaluacion(clave),
  periodo           TEXT NOT NULL, -- '2026-Q2', '2026'
  evaluador_id      UUID REFERENCES prp.empleados(id),
  -- Factores evaluados (1-5)
  puntualidad       INTEGER CHECK (puntualidad BETWEEN 1 AND 5),
  productividad     INTEGER CHECK (productividad BETWEEN 1 AND 5),
  actitud           INTEGER CHECK (actitud BETWEEN 1 AND 5),
  trabajo_equipo    INTEGER CHECK (trabajo_equipo BETWEEN 1 AND 5),
  cumplimiento_obj  INTEGER CHECK (cumplimiento_obj BETWEEN 1 AND 5),
  calidad_trabajo   INTEGER CHECK (calidad_trabajo BETWEEN 1 AND 5),
  promedio          DECIMAL(3,2),
  resultado         TEXT CHECK (resultado IN ('EXCELENTE','BUENO','REGULAR','DEFICIENTE')),
  comentarios       TEXT,
  compromisos       TEXT,  -- compromisos y plan de mejora
  -- Consecuencia
  genera_aumento    BOOLEAN DEFAULT FALSE,
  pct_aumento       DECIMAL(5,2),
  firmado_empleado  BOOLEAN DEFAULT FALSE,
  firmado_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOQUE G — CAPACITACIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS prp.cursos_capacitacion (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  tipo             TEXT CHECK (tipo IN ('INTERNO','EXTERNO','EN_LINEA','CERTIFICACION')),
  area_aplica      TEXT,
  duracion_horas   DECIMAL(6,2),
  costo            DECIMAL(10,2) DEFAULT 0,
  proveedor        TEXT,
  activo           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prp.capacitacion_empleado (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id      UUID REFERENCES prp.empleados(id),
  curso_id         UUID REFERENCES prp.cursos_capacitacion(id),
  fecha_inicio     DATE,
  fecha_fin        DATE,
  completado       BOOLEAN DEFAULT FALSE,
  calificacion     DECIMAL(5,2),
  certificado_url  TEXT,
  costo_empresa    DECIMAL(10,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOQUE H — FUNCIÓN: PROCESAR ASISTENCIA DEL DÍA
-- ============================================================

-- Procesa los registros crudos del reloj → genera asistencia_diaria
CREATE OR REPLACE FUNCTION prp.fn_procesar_asistencia(p_fecha DATE DEFAULT CURRENT_DATE - 1)
RETURNS TABLE(empleado TEXT, resultado TEXT, horas DECIMAL, retardo_mins INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  v_entrada    TIMESTAMPTZ;
  v_sal_com    TIMESTAMPTZ;
  v_ent_com    TIMESTAMPTZ;
  v_salida     TIMESTAMPTZ;
  v_horas      DECIMAL;
  v_extra      DECIMAL;
  v_retardo    INTEGER;
  v_estado     TEXT;
  v_regla      RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT rc.empleado_id, e.nombre_completo, e.regla_asistencia_id
    FROM prp.registros_checador rc
    JOIN prp.empleados e ON e.id = rc.empleado_id
    WHERE rc.fecha_hora::DATE = p_fecha
      AND rc.valido = TRUE
  LOOP
    -- Obtener marcas del día para este empleado
    SELECT fecha_hora INTO v_entrada    FROM prp.registros_checador WHERE empleado_id=r.empleado_id AND fecha_hora::DATE=p_fecha AND tipo_marca='ENTRADA'        ORDER BY fecha_hora LIMIT 1;
    SELECT fecha_hora INTO v_sal_com    FROM prp.registros_checador WHERE empleado_id=r.empleado_id AND fecha_hora::DATE=p_fecha AND tipo_marca='SALIDA_COMIDA'  ORDER BY fecha_hora LIMIT 1;
    SELECT fecha_hora INTO v_ent_com    FROM prp.registros_checador WHERE empleado_id=r.empleado_id AND fecha_hora::DATE=p_fecha AND tipo_marca='ENTRADA_COMIDA' ORDER BY fecha_hora LIMIT 1;
    SELECT fecha_hora INTO v_salida     FROM prp.registros_checador WHERE empleado_id=r.empleado_id AND fecha_hora::DATE=p_fecha AND tipo_marca='SALIDA'         ORDER BY fecha_hora DESC LIMIT 1;

    -- Obtener regla de asistencia
    SELECT * INTO v_regla FROM prp.reglas_asistencia WHERE id = r.regla_asistencia_id;

    -- Calcular retardo
    v_retardo := 0;
    IF v_entrada IS NOT NULL AND v_regla.hora_entrada IS NOT NULL THEN
      v_retardo := GREATEST(0,
        EXTRACT(EPOCH FROM (v_entrada::TIME - v_regla.hora_entrada)) / 60
        - COALESCE(v_regla.tolerancia_mins, 10)
      )::INTEGER;
    END IF;

    -- Calcular horas trabajadas (excluyendo comida)
    v_horas := 0;
    v_extra := 0;
    IF v_entrada IS NOT NULL AND v_salida IS NOT NULL THEN
      v_horas := EXTRACT(EPOCH FROM (v_salida - v_entrada)) / 3600;
      -- Descontar comida si hay marcas
      IF v_sal_com IS NOT NULL AND v_ent_com IS NOT NULL THEN
        v_horas := v_horas - EXTRACT(EPOCH FROM (v_ent_com - v_sal_com)) / 3600;
      END IF;
      -- Horas extra = horas trabajadas - horas jornada normal
      IF v_regla.horas_semana IS NOT NULL THEN
        v_extra := GREATEST(0, v_horas - (v_regla.horas_semana / (array_length(v_regla.dias_trabajo,1))::DECIMAL));
      END IF;
    END IF;

    -- Determinar estado
    v_estado := CASE
      WHEN v_entrada IS NULL THEN 'FALTA'
      WHEN v_salida IS NULL   THEN 'INCOMPLETO'
      WHEN v_retardo > 0      THEN 'RETARDO'
      ELSE                         'PRESENTE'
    END;

    -- Insertar o actualizar asistencia_diaria
    INSERT INTO prp.asistencia_diaria (
      empleado_id, fecha,
      hora_entrada, hora_salida_comida, hora_entrada_comida, hora_salida,
      horas_trabajadas, horas_extra, minutos_retardo, estado
    ) VALUES (
      r.empleado_id, p_fecha,
      v_entrada::TIME, v_sal_com::TIME, v_ent_com::TIME, v_salida::TIME,
      ROUND(v_horas::NUMERIC, 2), ROUND(v_extra::NUMERIC, 2), v_retardo, v_estado
    )
    ON CONFLICT (empleado_id, fecha) DO UPDATE SET
      hora_entrada = EXCLUDED.hora_entrada,
      hora_salida  = EXCLUDED.hora_salida,
      horas_trabajadas = EXCLUDED.horas_trabajadas,
      horas_extra  = EXCLUDED.horas_extra,
      minutos_retardo = EXCLUDED.minutos_retardo,
      estado = EXCLUDED.estado;

    -- Devolver resultado
    empleado    := r.nombre_completo;
    resultado   := v_estado;
    horas       := ROUND(v_horas::NUMERIC, 2);
    retardo_mins := v_retardo;
    RETURN NEXT;
  END LOOP;
END $$;

-- ============================================================
-- BLOQUE I — FUNCIÓN: CALCULAR PRE-NÓMINA QUINCENAL
-- ============================================================

-- Esta función calcula el monto a pagar por empleado en una quincena
-- usando asistencia_diaria + incidencias_rh
CREATE OR REPLACE FUNCTION prp.fn_calcular_prenomina(
  p_fecha_inicio DATE,
  p_fecha_fin    DATE
) RETURNS TABLE (
  empleado_id     UUID,
  nombre          TEXT,
  puesto          TEXT,
  dias_habiles    INTEGER,
  dias_trabajados DECIMAL,
  dias_falta      INTEGER,
  dias_retardo    INTEGER,
  horas_extra     DECIMAL,
  descuento_faltas DECIMAL,
  descuento_retardos DECIMAL,
  bonos           DECIMAL,
  sueldo_base     DECIMAL,
  total_percepciones DECIMAL,
  isr_estimado    DECIMAL,
  imss_empleado   DECIMAL,
  total_deducciones DECIMAL,
  neto_estimado   DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.nombre_completo,
    e.puesto,
    -- Días hábiles en el período (excluye sábado=6, domingo=0)
    (SELECT COUNT(*)::INTEGER FROM generate_series(p_fecha_inicio, p_fecha_fin, '1 day'::interval) d
     WHERE EXTRACT(DOW FROM d) NOT IN (0,6))::INTEGER AS dias_habiles,
    -- Días trabajados (PRESENTE o RETARDO cuenta como día trabajado)
    COALESCE((SELECT SUM(CASE WHEN ad.estado IN ('PRESENTE','RETARDO') THEN 1.0 ELSE 0 END)
              FROM prp.asistencia_diaria ad
              WHERE ad.empleado_id = e.id AND ad.fecha BETWEEN p_fecha_inicio AND p_fecha_fin), 0),
    -- Faltas
    COALESCE((SELECT COUNT(*)::INTEGER FROM prp.asistencia_diaria ad
              WHERE ad.empleado_id = e.id AND ad.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
                AND ad.estado = 'FALTA'), 0)::INTEGER,
    -- Retardos
    COALESCE((SELECT COUNT(*)::INTEGER FROM prp.asistencia_diaria ad
              WHERE ad.empleado_id = e.id AND ad.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
                AND ad.estado = 'RETARDO'), 0)::INTEGER,
    -- Horas extra
    COALESCE((SELECT SUM(ad.horas_extra) FROM prp.asistencia_diaria ad
              WHERE ad.empleado_id = e.id AND ad.fecha BETWEEN p_fecha_inicio AND p_fecha_fin), 0),
    -- Descuento por faltas (1 día de salario por falta)
    COALESCE((SELECT COUNT(*) * e.salario_diario FROM prp.asistencia_diaria ad
              WHERE ad.empleado_id = e.id AND ad.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
                AND ad.estado = 'FALTA'), 0),
    -- Descuento por retardos (3 retardos = 1 falta = 1 día de salario)
    COALESCE((SELECT FLOOR(COUNT(*) / 3.0) * e.salario_diario FROM prp.asistencia_diaria ad
              WHERE ad.empleado_id = e.id AND ad.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
                AND ad.estado = 'RETARDO'), 0),
    -- Bonos del período
    COALESCE((SELECT SUM(ir.monto) FROM prp.incidencias_rh ir
              WHERE ir.empleado_id = e.id AND ir.tipo_incidencia = 'BONO'
                AND ir.fecha_inicio BETWEEN p_fecha_inicio AND p_fecha_fin
                AND ir.aprobado = TRUE), 0),
    -- Sueldo base quincenal
    (e.salario_mensual / 2),
    -- Total percepciones (simplificado)
    (e.salario_mensual / 2),
    -- ISR estimado (se calcula con tarifa Art.96 LISR — simplificado 10%)
    ROUND((e.salario_mensual / 2) * 0.10, 2),
    -- IMSS empleado (cuota obrera ~2.375% + otros ~0.625% total ~3%)
    ROUND((e.salario_mensual / 2) * 0.03, 2),
    -- Total deducciones
    ROUND((e.salario_mensual / 2) * 0.13, 2),
    -- Neto estimado
    ROUND((e.salario_mensual / 2) * 0.87, 2)
  FROM prp.empleados e
  WHERE e.estado_id = 'ACTIVO';
END $$;

-- ============================================================
-- BLOQUE J — VISTAS RH
-- ============================================================

CREATE OR REPLACE VIEW prp.v_resumen_asistencia_mes AS
SELECT
  e.numero_empleado,
  e.nombre_completo,
  e.puesto,
  e.area,
  TO_CHAR(ad.fecha, 'YYYY-MM') AS periodo,
  COUNT(*) FILTER (WHERE ad.estado = 'PRESENTE')   AS presencias,
  COUNT(*) FILTER (WHERE ad.estado = 'RETARDO')    AS retardos,
  COUNT(*) FILTER (WHERE ad.estado = 'FALTA')      AS faltas,
  COUNT(*) FILTER (WHERE ad.estado = 'VACACIONES') AS vacaciones,
  COUNT(*) FILTER (WHERE ad.estado = 'INCAPACIDAD')AS incapacidades,
  ROUND(SUM(ad.horas_trabajadas),1)                AS horas_totales,
  ROUND(SUM(ad.horas_extra),1)                     AS horas_extra_totales,
  SUM(ad.minutos_retardo)                          AS minutos_retardo_total,
  ROUND(SUM(ad.horas_trabajadas) / NULLIF(COUNT(*) FILTER (WHERE ad.estado IN ('PRESENTE','RETARDO')), 0), 2) AS hrs_promedio_dia
FROM prp.asistencia_diaria ad
JOIN prp.empleados e ON e.id = ad.empleado_id
GROUP BY e.numero_empleado, e.nombre_completo, e.puesto, e.area, TO_CHAR(ad.fecha, 'YYYY-MM');

CREATE OR REPLACE VIEW prp.v_historial_salarial AS
SELECT
  e.numero_empleado,
  e.nombre_completo,
  e.puesto,
  hs.salario_mensual_ant AS sueldo_anterior,
  hs.salario_mensual_nuevo AS sueldo_nuevo,
  ROUND((hs.salario_mensual_nuevo - COALESCE(hs.salario_mensual_ant,0)) /
    NULLIF(hs.salario_mensual_ant,0) * 100, 2) AS pct_incremento,
  hs.motivo,
  hs.fecha_vigencia,
  hs.movimiento_imss
FROM prp.historial_salario hs
JOIN prp.empleados e ON e.id = hs.empleado_id
ORDER BY hs.fecha_vigencia DESC;

CREATE OR REPLACE VIEW prp.v_contratos_laborales_proximos AS
SELECT
  e.numero_empleado,
  e.nombre_completo,
  e.puesto,
  e.area,
  e.email,
  cl.tipo_contrato,
  cl.fecha_inicio,
  cl.fecha_fin,
  (cl.fecha_fin - CURRENT_DATE)::INTEGER AS dias_restantes,
  CASE
    WHEN (cl.fecha_fin - CURRENT_DATE) <=  3 THEN '🔴 CRITICO'
    WHEN (cl.fecha_fin - CURRENT_DATE) <=  7 THEN '🟠 URGENTE'
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 15 THEN '🟡 PROXIMO'
    WHEN (cl.fecha_fin - CURRENT_DATE) <= 30 THEN '🔵 VIGENTE'
    ELSE '✅ OK'
  END AS semaforo,
  e.salario_mensual,
  e.nss,
  e.curp,
  e.rfc
FROM prp.contratos_laborales cl
JOIN prp.empleados e ON e.id = cl.empleado_id
WHERE cl.estado_id = 'VIGENTE'
  AND cl.fecha_fin IS NOT NULL
ORDER BY cl.fecha_fin ASC;

-- ============================================================
-- BLOQUE K — DATOS SINTÉTICOS RH
-- ============================================================

-- Dispositivo checador
INSERT INTO prp.dispositivos_checador (nombre, tipo, marca, modelo, serie, inmueble_id, ubicacion, formato_export)
SELECT 'Checador Principal – Entrada', 'BIOMETRICO', 'ZKTeco', 'F18', 'ZK20260001', id, 'Entrada principal', 'TXT'
FROM prp.inmuebles WHERE clave = 'PLZ-MET-01'
ON CONFLICT DO NOTHING;

-- Reglas de asistencia
INSERT INTO prp.reglas_asistencia (nombre, hora_entrada, hora_salida, tolerancia_mins, dias_trabajo, horas_semana) VALUES
('Turno Administrativo',  '09:00', '18:00', 10, ARRAY[1,2,3,4,5],   48.0),
('Turno Cocina Mañana',   '07:00', '16:00', 5,  ARRAY[1,2,3,4,5,6], 54.0),
('Turno Estacionamiento', '08:00', '16:00', 10, ARRAY[1,2,3,4,5,6], 48.0),
('Turno Mantenimiento',   '07:00', '15:00', 10, ARRAY[1,2,3,4,5,6], 48.0)
ON CONFLICT DO NOTHING;

-- Asignar reglas a empleados
DO $$
DECLARE
  r_admin UUID; r_cocina UUID; r_estac UUID; r_mant UUID;
BEGIN
  SELECT id INTO r_admin  FROM prp.reglas_asistencia WHERE nombre LIKE 'Turno Administrativo%' LIMIT 1;
  SELECT id INTO r_cocina FROM prp.reglas_asistencia WHERE nombre LIKE 'Turno Cocina%' LIMIT 1;
  SELECT id INTO r_estac  FROM prp.reglas_asistencia WHERE nombre LIKE 'Turno Estacio%' LIMIT 1;
  SELECT id INTO r_mant   FROM prp.reglas_asistencia WHERE nombre LIKE 'Turno Manten%' LIMIT 1;

  UPDATE prp.empleados SET regla_asistencia_id = r_cocina WHERE numero_empleado IN ('EMP-001','EMP-002');
  UPDATE prp.empleados SET regla_asistencia_id = r_estac  WHERE numero_empleado = 'EMP-003';
  UPDATE prp.empleados SET regla_asistencia_id = r_mant   WHERE numero_empleado = 'EMP-004';
  UPDATE prp.empleados SET regla_asistencia_id = r_admin  WHERE numero_empleado IN ('EMP-005','EMP-006');
END $$;

-- Registros del reloj: últimos 10 días hábiles (lunes-sábado)
DO $$
DECLARE
  emps UUID[];
  emp  UUID;
  regla RECORD;
  d    DATE;
  hora_base TIME;
  retardo_mins INTEGER;
BEGIN
  SELECT ARRAY(SELECT id FROM prp.empleados WHERE estado_id='ACTIVO') INTO emps;

  FOREACH emp IN ARRAY emps LOOP
    SELECT ra.* INTO regla
    FROM prp.reglas_asistencia ra
    JOIN prp.empleados e ON e.regla_asistencia_id = ra.id
    WHERE e.id = emp;

    FOR d IN SELECT generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, '1 day')::DATE LOOP
      -- Solo días que aplican al turno (saltamos domingos siempre)
      IF EXTRACT(DOW FROM d) = 0 THEN CONTINUE; END IF;
      IF regla.dias_trabajo IS NOT NULL AND NOT (EXTRACT(DOW FROM d)::INTEGER = ANY(regla.dias_trabajo)) THEN CONTINUE; END IF;

      -- 85% asistencia, 10% retardo, 5% falta
      IF random() < 0.05 THEN CONTINUE; END IF; -- falta

      retardo_mins := 0;
      IF random() < 0.10 THEN retardo_mins := (random() * 25 + 5)::INTEGER; END IF;

      hora_base := COALESCE(regla.hora_entrada, '09:00');

      -- ENTRADA
      INSERT INTO prp.registros_checador (empleado_id, fecha_hora, tipo_marca, origen)
      VALUES (emp, (d::TEXT || ' ' || hora_base::TEXT)::TIMESTAMPTZ + (retardo_mins || ' minutes')::INTERVAL, 'ENTRADA', 'RELOJ')
      ON CONFLICT DO NOTHING;

      -- SALIDA COMIDA (si trabaja > 6h)
      IF regla.minutos_comida > 0 THEN
        INSERT INTO prp.registros_checador (empleado_id, fecha_hora, tipo_marca, origen)
        VALUES (emp, (d::TEXT || ' ' || hora_base::TEXT)::TIMESTAMPTZ + INTERVAL '4 hours', 'SALIDA_COMIDA', 'RELOJ')
        ON CONFLICT DO NOTHING;

        INSERT INTO prp.registros_checador (empleado_id, fecha_hora, tipo_marca, origen)
        VALUES (emp, (d::TEXT || ' ' || hora_base::TEXT)::TIMESTAMPTZ + INTERVAL '5 hours', 'ENTRADA_COMIDA', 'RELOJ')
        ON CONFLICT DO NOTHING;
      END IF;

      -- SALIDA (con posibles horas extra)
      INSERT INTO prp.registros_checador (empleado_id, fecha_hora, tipo_marca, origen)
      VALUES (emp,
        (d::TEXT || ' ' || COALESCE(regla.hora_salida,'18:00')::TEXT)::TIMESTAMPTZ
        + ((random() * 45)::INTEGER || ' minutes')::INTERVAL,
        'SALIDA', 'RELOJ')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Procesar asistencia de los últimos 10 días
DO $$
DECLARE d DATE;
BEGIN
  FOR d IN SELECT generate_series(CURRENT_DATE - 14, CURRENT_DATE - 1, '1 day')::DATE LOOP
    IF EXTRACT(DOW FROM d) != 0 THEN
      PERFORM prp.fn_procesar_asistencia(d);
    END IF;
  END LOOP;
END $$;

-- Historial salarial demo (para mostrar historial)
DO $$
DECLARE emp UUID;
BEGIN
  SELECT id INTO emp FROM prp.empleados WHERE numero_empleado = 'EMP-004';
  INSERT INTO prp.historial_salario (empleado_id, salario_diario_ant, salario_mensual_ant, salario_diario_nuevo, salario_mensual_nuevo, motivo, fecha_vigencia)
  VALUES (emp, 333.33, 10000.00, 400.00, 12000.00, 'Promoción a Jefe de Mantenimiento', '2024-03-01'),
         (emp, 400.00, 12000.00, 433.33, 13000.00, 'Revisión salarial anual 2025',       '2025-03-01')
  ON CONFLICT DO NOTHING;
END $$;

-- Cursos de capacitación
INSERT INTO prp.cursos_capacitacion (nombre, tipo, area_aplica, duracion_horas, costo) VALUES
('Seguridad e Higiene en el Trabajo',          'INTERNO',  'TODOS',         8,    0),
('Atención al cliente y servicio al inquilino','INTERNO',  'ADMINISTRACIÓN', 4,    0),
('Manejo de extintor y brigadas de emergencia','EXTERNO',  'TODOS',         4, 1500),
('Excel avanzado para administración',         'EN_LINEA', 'ADMINISTRACIÓN',16,  800),
('Normatividad CFDI 4.0 y SAT',                'EXTERNO',  'CONTABILIDAD',   6, 2500)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RESUMEN FINAL
-- ============================================================
SELECT
  'prp.' || t.tablename AS tabla,
  c.reltuples::BIGINT AS filas_aprox
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE t.schemaname = 'prp'
ORDER BY t.tablename;
