-- Políticas RLS para buckets de Storage
-- Permite a usuarios autenticados subir, leer y actualizar archivos

-- tickets-gastos
CREATE POLICY "auth-select-tickets-gastos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tickets-gastos');

CREATE POLICY "auth-insert-tickets-gastos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets-gastos');

CREATE POLICY "auth-update-tickets-gastos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'tickets-gastos');

-- facturas-cfdi
CREATE POLICY "auth-select-facturas-cfdi" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'facturas-cfdi');

CREATE POLICY "auth-insert-facturas-cfdi" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facturas-cfdi');

CREATE POLICY "auth-update-facturas-cfdi" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'facturas-cfdi');

-- vending-reportes
CREATE POLICY "auth-select-vending-reportes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vending-reportes');

CREATE POLICY "auth-insert-vending-reportes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vending-reportes');

CREATE POLICY "auth-update-vending-reportes" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vending-reportes');
