-- Fix políticas del bucket avatars para permitir upload desde frontend autenticado

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "avatars_upload"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_update"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete"       ON storage.objects;

-- Lectura pública (cualquiera puede ver las fotos)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Upload: usuarios autenticados pueden subir
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Update: usuarios autenticados pueden reemplazar
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- Delete: usuarios autenticados pueden borrar
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- Asegurar que el bucket está marcado como público
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
