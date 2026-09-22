-- ============================================================
-- Módulo Eventos — comunicación admin → dirección/propietario
-- ============================================================

CREATE TABLE IF NOT EXISTS eventos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  notas           TEXT,
  fecha_evento    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_url       TEXT,   -- URL externa (YouTube, Vimeo, Drive…)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evento_fotos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  foto_url    TEXT NOT NULL,
  descripcion TEXT,
  orden       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_eventos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_eventos_updated_at ON eventos;
CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_eventos_updated_at();

-- RLS
ALTER TABLE eventos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all ON eventos
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());
CREATE POLICY staff_all ON evento_fotos
  FOR ALL TO authenticated USING (es_staff()) WITH CHECK (es_staff());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON eventos      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON evento_fotos TO authenticated;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('eventos-fotos', 'eventos-fotos', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_read_eventos_fotos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'eventos-fotos');
CREATE POLICY "auth_write_eventos_fotos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'eventos-fotos');
CREATE POLICY "auth_delete_eventos_fotos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'eventos-fotos');

NOTIFY pgrst, 'reload schema';
