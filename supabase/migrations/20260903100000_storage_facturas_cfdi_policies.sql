-- MIGRACIÓN: Políticas RLS para facturas-cfdi, tickets-gastos, vending-reportes
-- Estos buckets eran públicos sin policies. Agregar INSERT/UPDATE para autenticados.
-- Ver TODO en 20260829120000_storage_privado_urls_firmadas.sql

-- facturas-cfdi
DROP POLICY IF EXISTS "auth_insert_facturas_cfdi" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_facturas_cfdi" ON storage.objects;
DROP POLICY IF EXISTS "auth_select_facturas_cfdi" ON storage.objects;
DROP POLICY IF EXISTS "auth-insert-facturas-cfdi" ON storage.objects;
DROP POLICY IF EXISTS "auth-update-facturas-cfdi" ON storage.objects;
DROP POLICY IF EXISTS "auth-select-facturas-cfdi" ON storage.objects;

CREATE POLICY "auth_insert_facturas_cfdi"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facturas-cfdi');

CREATE POLICY "auth_update_facturas_cfdi"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'facturas-cfdi');

CREATE POLICY "auth_select_facturas_cfdi"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'facturas-cfdi');

-- tickets-gastos
DROP POLICY IF EXISTS "auth_insert_tickets_gastos" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_tickets_gastos" ON storage.objects;
DROP POLICY IF EXISTS "auth_select_tickets_gastos" ON storage.objects;
DROP POLICY IF EXISTS "auth-insert-tickets-gastos" ON storage.objects;
DROP POLICY IF EXISTS "auth-update-tickets-gastos" ON storage.objects;
DROP POLICY IF EXISTS "auth-select-tickets-gastos" ON storage.objects;

CREATE POLICY "auth_insert_tickets_gastos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets-gastos');

CREATE POLICY "auth_update_tickets_gastos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tickets-gastos');

CREATE POLICY "auth_select_tickets_gastos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tickets-gastos');

-- vending-reportes
DROP POLICY IF EXISTS "auth_insert_vending_reportes" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_vending_reportes" ON storage.objects;
DROP POLICY IF EXISTS "auth_select_vending_reportes" ON storage.objects;

CREATE POLICY "auth_insert_vending_reportes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vending-reportes');

CREATE POLICY "auth_update_vending_reportes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vending-reportes');

CREATE POLICY "auth_select_vending_reportes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vending-reportes');

-- Verificar
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'auth_%'
ORDER BY policyname;
