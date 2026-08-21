-- Recrear policies de storage para forzar recarga del schema cache
DROP POLICY IF EXISTS "auth_insert_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "auth_select_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "auth_update_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_contratos"   ON storage.objects;
DROP POLICY IF EXISTS "public_read_contratos"   ON storage.objects;

CREATE POLICY "auth_insert_contratos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos-firmados');

CREATE POLICY "auth_select_contratos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contratos-firmados');

CREATE POLICY "auth_update_contratos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contratos-firmados');

CREATE POLICY "auth_delete_contratos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contratos-firmados');

CREATE POLICY "public_read_contratos"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'contratos-firmados');

-- También asegurar que el bucket existe y es público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contratos-firmados', 'contratos-firmados', true, 52428800, ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp'];
