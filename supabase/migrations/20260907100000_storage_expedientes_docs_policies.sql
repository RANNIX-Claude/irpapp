-- MIGRACIÓN: Políticas RLS para expedientes-docs
--
-- Es el único bucket que quedó sin NINGUNA política: hoy funciona solo porque
-- sigue marcado public = true. Eso tiene dos consecuencias:
--
--   1. urlFirmada('expedientes-docs', ...) — que ya usan ExpedienteEmpleado.jsx
--      y ExpedienteModal.jsx — falla, porque firmar exige permiso SELECT.
--   2. No se puede cerrar el bucket sin romper la subida y la descarga.
--
-- Esta migración solo AGREGA permisos para usuarios autenticados. No cambia
-- public, así que es segura de aplicar sola y no rompe nada de lo que hoy
-- funciona por la vía pública.
--
-- Ver TODO de etapa 2 en 20260829120000_storage_privado_urls_firmadas.sql

DROP POLICY IF EXISTS "auth_select_expedientes_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_insert_expedientes_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_expedientes_docs" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_expedientes_docs" ON storage.objects;

CREATE POLICY "auth_select_expedientes_docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expedientes-docs');

CREATE POLICY "auth_insert_expedientes_docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expedientes-docs');

CREATE POLICY "auth_update_expedientes_docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'expedientes-docs')
  WITH CHECK (bucket_id = 'expedientes-docs');

CREATE POLICY "auth_delete_expedientes_docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expedientes-docs');

-- Recargar el esquema de PostgREST tras cambiar políticas
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and policyname like '%expedientes_docs%'
--  order by policyname;
--   -> deben aparecer las cuatro, todas con roles = {authenticated}
