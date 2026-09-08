-- MIGRACIÓN: evidencias fotográficas de órdenes de trabajo
--
-- El panel de evidencias de Mantenimiento guardaba los archivos como URLs
-- `blob:` de URL.createObjectURL(), que solo viven mientras la pestaña está
-- abierta. Nunca se subían a Storage, y la columna donde supuestamente se
-- guardaban ni siquiera existía: por eso updateOT mandaba `evidencias: undefined`.
-- Al recargar, toda la evidencia adjunta a una OT desaparecía.
--
-- Esta migración crea el lugar donde guardarlas.

-- ── Columna en la orden de trabajo ──────────────────────────────────────────
-- Array de objetos: { nombre, path, tipo, tamano_kb, fecha }
-- Se guarda la RUTA dentro del bucket, no una URL: las URLs firmadas expiran.
ALTER TABLE public.ordenes_trabajo
  ADD COLUMN IF NOT EXISTS evidencias jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ordenes_trabajo.evidencias IS
  'Evidencias en el bucket ot-evidencias. Cada elemento: {nombre, path, tipo, tamano_kb, fecha}. path es la ruta dentro del bucket, se firma al mostrarla.';

-- ── Bucket privado ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ot-evidencias',
  'ot-evidencias',
  false,
  10485760,  -- 10 MB, el limite que ya anuncia la interfaz
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf'];

-- ── Políticas ───────────────────────────────────────────────────────────────
-- Nace privado, así que necesita SELECT desde el inicio para poder firmar.
DROP POLICY IF EXISTS "auth_select_ot_evidencias" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_ot_evidencias" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_ot_evidencias" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_ot_evidencias" ON storage.objects;

CREATE POLICY "auth_select_ot_evidencias"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ot-evidencias');

CREATE POLICY "auth_insert_ot_evidencias"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ot-evidencias');

CREATE POLICY "auth_update_ot_evidencias"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ot-evidencias')
  WITH CHECK (bucket_id = 'ot-evidencias');

CREATE POLICY "auth_delete_ot_evidencias"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ot-evidencias');

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select id, public, file_size_limit from storage.buckets where id = 'ot-evidencias';
-- select column_name, data_type from information_schema.columns
--  where table_name = 'ordenes_trabajo' and column_name = 'evidencias';
