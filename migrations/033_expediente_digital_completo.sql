-- Expediente Digital completo: documentos, capacitación, evaluaciones, beneficios, historial general

-- Documentos del expediente (Constancia médica, INE, Contrato, etc.)
CREATE TABLE IF NOT EXISTS public.rh_expediente_documentos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id   UUID NOT NULL,
  tipo          TEXT NOT NULL, -- INE | CURP | NSS | CONTRATO | CONSTANCIA_MEDICA | COMPROBANTE_DOM | FOTO | ACTA_NAC | RFC | EVALUACION | OTRO
  nombre        TEXT NOT NULL,
  archivo_url   TEXT,
  archivo_path  TEXT,
  tamano_kb     INTEGER,
  formato       TEXT, -- PDF | XLSX | DOCX | JPG | PNG
  fecha_doc     DATE,
  vence         DATE,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Capacitación
CREATE TABLE IF NOT EXISTS public.rh_capacitacion (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id   UUID NOT NULL,
  nombre        TEXT NOT NULL,
  tipo          TEXT DEFAULT 'INTERNA', -- INTERNA | EXTERNA | CERTIFICACION | CURSO
  institucion   TEXT,
  fecha_inicio  DATE,
  fecha_fin     DATE,
  horas         NUMERIC(6,1),
  resultado     TEXT, -- APROBADO | REPROBADO | EN_CURSO
  constancia_url TEXT,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Evaluaciones de desempeño
CREATE TABLE IF NOT EXISTS public.rh_evaluaciones (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id   UUID NOT NULL,
  periodo       TEXT NOT NULL, -- e.g. "2026-S1", "2025-Anual"
  tipo          TEXT DEFAULT 'ANUAL', -- ANUAL | SEMESTRAL | TRIMESTRAL | PRUEBA
  calificacion  NUMERIC(4,1), -- 0-100
  nivel         TEXT, -- EXCELENTE | BUENO | REGULAR | DEFICIENTE
  evaluador     TEXT,
  fortalezas    TEXT,
  areas_mejora  TEXT,
  fecha         DATE,
  archivo_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Beneficios asignados
CREATE TABLE IF NOT EXISTS public.rh_beneficios (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id   UUID NOT NULL,
  tipo          TEXT NOT NULL, -- VALES_DESPENSA | SEGURO_MEDICO | FONDO_AHORRO | CAJA_AHORRO | BONO | OTRO
  descripcion   TEXT,
  monto         NUMERIC(12,2),
  periodicidad  TEXT DEFAULT 'MENSUAL', -- MENSUAL | QUINCENAL | ANUAL | UNICO
  activo        BOOLEAN DEFAULT TRUE,
  fecha_inicio  DATE,
  fecha_fin     DATE,
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Historial general de cambios (puesto, área, departamento, contrato)
CREATE TABLE IF NOT EXISTS public.rh_historial_cambios (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id   UUID NOT NULL,
  tipo          TEXT NOT NULL, -- PUESTO | AREA | DEPARTAMENTO | CONTRATO | SUPERVISOR | HORARIO
  campo         TEXT,          -- nombre del campo que cambió
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  motivo        TEXT,
  fecha         DATE DEFAULT CURRENT_DATE,
  usuario_ref   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS en todas
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rh_expediente_documentos','rh_capacitacion','rh_evaluaciones','rh_beneficios','rh_historial_cambios']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY auth_all_%s ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_exp_docs_emp   ON public.rh_expediente_documentos (empleado_id);
CREATE INDEX IF NOT EXISTS idx_capac_emp      ON public.rh_capacitacion (empleado_id);
CREATE INDEX IF NOT EXISTS idx_eval_emp       ON public.rh_evaluaciones  (empleado_id);
CREATE INDEX IF NOT EXISTS idx_benef_emp      ON public.rh_beneficios    (empleado_id, activo);
CREATE INDEX IF NOT EXISTS idx_cambios_emp    ON public.rh_historial_cambios (empleado_id, fecha DESC);

NOTIFY pgrst, 'reload schema';
