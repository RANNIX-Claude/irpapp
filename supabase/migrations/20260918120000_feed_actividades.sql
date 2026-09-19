-- Feed de actividades operativas — bitácora visual para el propietario
-- Aparecen en FeedEjecutivo como tarjetas con foto (Instagram-style)

CREATE TABLE IF NOT EXISTS feed_actividades (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT        NOT NULL,
  descripcion TEXT,
  foto_url    TEXT,                           -- path en bucket ot-evidencias, subcarpeta feed/
  categoria   TEXT        NOT NULL DEFAULT 'MANTENIMIENTO',
  -- Valores: MANTENIMIENTO | MEJORA | OPERACION | PROYECTO | INCIDENCIA
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feed_actividades ENABLE ROW LEVEL SECURITY;

-- Solo staff puede leer y escribir
CREATE POLICY staff_all ON feed_actividades
  FOR ALL TO authenticated
  USING (es_staff())
  WITH CHECK (es_staff());

-- Vista para el frontend (sigue la convención prp_*)
CREATE OR REPLACE VIEW prp_feed_actividades
WITH (security_invoker = true) AS
SELECT
  id, titulo, descripcion, foto_url, categoria,
  fecha, creado_por, created_at
FROM feed_actividades
ORDER BY fecha DESC;

GRANT SELECT ON prp_feed_actividades TO authenticated;
