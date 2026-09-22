-- ============================================================
-- Módulo Proyectos de Obras/Instalaciones
-- ============================================================

-- Tabla principal
CREATE TABLE IF NOT EXISTS proyectos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  proveedor_id    UUID REFERENCES cat_proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT,
  estado          TEXT NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','EN_PROCESO','PAUSADO','COMPLETADO','CANCELADO')),
  fecha_inicio        DATE,
  fecha_fin_estimada  DATE,
  fecha_fin_real      DATE,
  presupuesto_total   NUMERIC(15,2),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cotizaciones (≥3 recomendadas por proyecto)
CREATE TABLE IF NOT EXISTS proyecto_cotizaciones (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id  UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  proveedor    TEXT NOT NULL,
  monto        NUMERIC(15,2),
  fecha        DATE,
  archivo_url  TEXT,
  notas        TEXT,
  seleccionada BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Contrato(s) del proyecto
CREATE TABLE IF NOT EXISTS proyecto_contratos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id      UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  descripcion      TEXT,
  contrato_url     TEXT,
  anexo_url        TEXT,
  fecha_firma      DATE,
  monto_contratado NUMERIC(15,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos / Facturas
CREATE TABLE IF NOT EXISTS proyecto_pagos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id      UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  fecha            DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion      TEXT NOT NULL,
  alcance          TEXT,
  monto            NUMERIC(15,2) NOT NULL,
  incluye_iva      BOOLEAN DEFAULT TRUE,
  tipo             TEXT NOT NULL DEFAULT 'FACTURA'
                   CHECK (tipo IN ('FACTURA','COMPRA','ANTICIPO','FINIQUITO')),
  factura_pdf_url  TEXT,
  factura_xml_url  TEXT,
  factura_zip_url  TEXT,
  transferencia_url TEXT,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Avances de obra (registro periódico)
CREATE TABLE IF NOT EXISTS proyecto_avances (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id        UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  fecha              DATE NOT NULL DEFAULT CURRENT_DATE,
  porcentaje_avance  INTEGER CHECK (porcentaje_avance BETWEEN 0 AND 100),
  descripcion_corta  TEXT NOT NULL,
  descripcion_larga  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Fotos de avance
CREATE TABLE IF NOT EXISTS proyecto_avance_fotos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  avance_id   UUID NOT NULL REFERENCES proyecto_avances(id) ON DELETE CASCADE,
  foto_url    TEXT NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at en proyectos
CREATE OR REPLACE FUNCTION set_proyectos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_proyectos_updated_at ON proyectos;
CREATE TRIGGER trg_proyectos_updated_at
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION set_proyectos_updated_at();

-- RLS
ALTER TABLE proyectos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_cotizaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_contratos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_pagos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_avances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_avance_fotos  ENABLE ROW LEVEL SECURITY;

-- Solo staff puede operar el módulo de proyectos
CREATE POLICY staff_all ON proyectos
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
CREATE POLICY staff_all ON proyecto_cotizaciones
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
CREATE POLICY staff_all ON proyecto_contratos
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
CREATE POLICY staff_all ON proyecto_pagos
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
CREATE POLICY staff_all ON proyecto_avances
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
CREATE POLICY staff_all ON proyecto_avance_fotos
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());

-- Grants a PostgREST
GRANT SELECT, INSERT, UPDATE, DELETE ON proyectos              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proyecto_cotizaciones  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proyecto_contratos     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proyecto_pagos         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proyecto_avances       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON proyecto_avance_fotos  TO authenticated;

-- Storage buckets (ejecutar como service_role o superadmin)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('proyectos-docs',    'proyectos-docs',    false),
         ('proyectos-avances', 'proyectos-avances', false)
  ON CONFLICT (id) DO NOTHING;

-- Políticas storage
CREATE POLICY "auth_read_proyectos_docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proyectos-docs');
CREATE POLICY "auth_write_proyectos_docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proyectos-docs');
CREATE POLICY "auth_delete_proyectos_docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'proyectos-docs');

CREATE POLICY "auth_read_proyectos_avances"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proyectos-avances');
CREATE POLICY "auth_write_proyectos_avances"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proyectos-avances');
CREATE POLICY "auth_delete_proyectos_avances"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'proyectos-avances');

NOTIFY pgrst, 'reload schema';
