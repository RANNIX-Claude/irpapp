-- Tabla de publicaciones del Feed
-- Reemplaza feed_actividades: soporta múltiples fotos, autor completo con foto.
-- El frontend pasa autor_nombre y autor_foto_url desde el perfil del usuario
-- logueado (no se calcula en BD para evitar joins circulares con auth.users).

-- ── Tabla principal ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicaciones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT        NOT NULL,
  descripcion     TEXT,
  fotos           TEXT[]      NOT NULL DEFAULT '{}',   -- paths en ot-evidencias/feed/
  categoria       TEXT        NOT NULL DEFAULT 'OPERACION',
  -- Valores: MANTENIMIENTO | MEJORA | OPERACION | PROYECTO | INCIDENCIA
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por      UUID        REFERENCES auth.users(id),
  autor_nombre    TEXT,          -- nombre completo del autor (copiado del perfil al publicar)
  autor_foto_url  TEXT,          -- foto_url del empleado (copiado al publicar)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE publicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all ON publicaciones
  FOR ALL TO authenticated
  USING (es_staff())
  WITH CHECK (es_staff());

-- ── Vista ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW prp_publicaciones
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.titulo,
  p.descripcion,
  p.fotos,
  p.categoria,
  p.fecha,
  p.creado_por,
  COALESCE(p.autor_nombre,
    u.nombre || CASE WHEN u.apellido IS NOT NULL THEN ' ' || u.apellido ELSE '' END
  ) AS autor_nombre,
  p.autor_foto_url,
  p.created_at
FROM publicaciones p
LEFT JOIN irp_usuarios u ON u.id = p.creado_por
ORDER BY p.fecha DESC;

GRANT SELECT ON prp_publicaciones TO authenticated;

-- ── Migrar datos existentes de feed_actividades (si la tabla existe) ─────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'feed_actividades') THEN
    INSERT INTO publicaciones (id, titulo, descripcion, fotos, categoria, fecha, creado_por, created_at)
    SELECT
      id, titulo, descripcion,
      CASE WHEN foto_url IS NOT NULL THEN ARRAY[foto_url] ELSE '{}' END,
      categoria, fecha, creado_por, created_at
    FROM feed_actividades
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
