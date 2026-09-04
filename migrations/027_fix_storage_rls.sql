-- ================================================================
-- MIGRACIÓN 027: Arreglar RLS de storage para permitir uploads
-- El bucket facturas-cfdi existe pero las políticas pueden no estar activas
-- ================================================================

-- Eliminar políticas existentes si las hay (no falla si no existen)
DROP POLICY IF EXISTS "auth-select-tickets-gastos"  ON storage.objects;
DROP POLICY IF EXISTS "auth-insert-tickets-gastos"  ON storage.objects;
DROP POLICY IF EXISTS "auth-update-tickets-gastos"  ON storage.objects;
DROP POLICY IF EXISTS "auth-select-facturas-cfdi"   ON storage.objects;
DROP POLICY IF EXISTS "auth-insert-facturas-cfdi"   ON storage.objects;
DROP POLICY IF EXISTS "auth-update-facturas-cfdi"   ON storage.objects;
DROP POLICY IF EXISTS "auth-select-vending-reportes" ON storage.objects;
DROP POLICY IF EXISTS "auth-insert-vending-reportes" ON storage.objects;
DROP POLICY IF EXISTS "auth-update-vending-reportes" ON storage.objects;

-- Políticas para tickets-gastos
CREATE POLICY "auth-select-tickets-gastos"  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tickets-gastos');
CREATE POLICY "auth-insert-tickets-gastos"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tickets-gastos');
CREATE POLICY "auth-update-tickets-gastos"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tickets-gastos');

-- Políticas para facturas-cfdi
CREATE POLICY "auth-select-facturas-cfdi"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'facturas-cfdi');
CREATE POLICY "auth-insert-facturas-cfdi"   ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facturas-cfdi');
CREATE POLICY "auth-update-facturas-cfdi"   ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'facturas-cfdi');

-- Políticas para vending-reportes
CREATE POLICY "auth-select-vending-reportes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vending-reportes');
CREATE POLICY "auth-insert-vending-reportes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vending-reportes');
CREATE POLICY "auth-update-vending-reportes" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vending-reportes');

-- Verificar
SELECT policyname, cmd, roles FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
