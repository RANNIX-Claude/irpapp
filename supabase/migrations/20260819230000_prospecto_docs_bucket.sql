-- Bucket para documentos del portal prospecto (magic link, usuarios anónimos)
-- El bucket es público para que getPublicUrl funcione sin auth

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prospecto-docs',
  'prospecto-docs',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Usuarios anónimos (magic link) pueden subir archivos
DROP POLICY IF EXISTS "anon_insert_prospecto_docs"  ON storage.objects;
DROP POLICY IF EXISTS "anon_select_prospecto_docs"  ON storage.objects;
DROP POLICY IF EXISTS "auth_select_prospecto_docs"  ON storage.objects;
DROP POLICY IF EXISTS "auth_update_prospecto_docs"  ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_prospecto_docs"  ON storage.objects;

CREATE POLICY "anon_insert_prospecto_docs"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'prospecto-docs');

CREATE POLICY "anon_select_prospecto_docs"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'prospecto-docs');

CREATE POLICY "auth_select_prospecto_docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prospecto-docs');

CREATE POLICY "auth_update_prospecto_docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'prospecto-docs');

CREATE POLICY "auth_delete_prospecto_docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prospecto-docs');
