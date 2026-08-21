-- Crea el bucket contratos-firmados (si no existe) y habilita políticas RLS
-- para que usuarios autenticados puedan subir/leer/eliminar PDFs de contratos.

INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-firmados', 'contratos-firmados', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Eliminar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "auth_insert_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "auth_select_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "auth_update_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "public_read_contratos"   ON storage.objects;

-- Política: INSERT — cualquier usuario autenticado puede subir
CREATE POLICY "auth_insert_contratos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contratos-firmados');

-- Política: SELECT — cualquier usuario autenticado puede leer
CREATE POLICY "auth_select_contratos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contratos-firmados');

-- Política: UPDATE — cualquier usuario autenticado puede reemplazar (upsert)
CREATE POLICY "auth_update_contratos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contratos-firmados');

-- Política: DELETE — cualquier usuario autenticado puede eliminar
CREATE POLICY "auth_delete_contratos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contratos-firmados');

-- Acceso público para leer URLs (sin autenticación) — bucket es public=true
CREATE POLICY "public_read_contratos"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'contratos-firmados');
