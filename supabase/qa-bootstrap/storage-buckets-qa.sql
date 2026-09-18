-- Crea en QA los buckets que ya existen en producción y que el código usa,
-- con sus políticas RLS equivalentes (una sola por operación, sin los
-- duplicados que tiene producción).

insert into storage.buckets (id, name, public)
values
  ('contratos-docs',      'contratos-docs',      false),
  ('contratos-firmados',  'contratos-firmados',  false),
  ('expedientes-docs',    'expedientes-docs',    false),
  ('facturas-cfdi',       'facturas-cfdi',       false),
  ('ot-evidencias',       'ot-evidencias',       false),
  ('prospecto-docs',      'prospecto-docs',      false),
  ('tickets-gastos',      'tickets-gastos',      false),
  ('validacion-capturas', 'validacion-capturas', false),
  ('vending-reportes',    'vending-reportes',    false),
  ('catalogos',           'catalogos',           true)
on conflict (id) do nothing;

-- facturas-cfdi
drop policy if exists "qa_insert_facturas_cfdi" on storage.objects;
drop policy if exists "qa_select_facturas_cfdi" on storage.objects;
drop policy if exists "qa_update_facturas_cfdi" on storage.objects;
create policy "qa_insert_facturas_cfdi" on storage.objects for insert to authenticated with check (bucket_id = 'facturas-cfdi');
create policy "qa_select_facturas_cfdi" on storage.objects for select to authenticated using (bucket_id = 'facturas-cfdi');
create policy "qa_update_facturas_cfdi" on storage.objects for update to authenticated using (bucket_id = 'facturas-cfdi');

-- tickets-gastos
drop policy if exists "qa_insert_tickets_gastos" on storage.objects;
drop policy if exists "qa_select_tickets_gastos" on storage.objects;
drop policy if exists "qa_update_tickets_gastos" on storage.objects;
create policy "qa_insert_tickets_gastos" on storage.objects for insert to authenticated with check (bucket_id = 'tickets-gastos');
create policy "qa_select_tickets_gastos" on storage.objects for select to authenticated using (bucket_id = 'tickets-gastos');
create policy "qa_update_tickets_gastos" on storage.objects for update to authenticated using (bucket_id = 'tickets-gastos');

-- vending-reportes
drop policy if exists "qa_insert_vending_reportes" on storage.objects;
drop policy if exists "qa_select_vending_reportes" on storage.objects;
drop policy if exists "qa_update_vending_reportes" on storage.objects;
create policy "qa_insert_vending_reportes" on storage.objects for insert to authenticated with check (bucket_id = 'vending-reportes');
create policy "qa_select_vending_reportes" on storage.objects for select to authenticated using (bucket_id = 'vending-reportes');
create policy "qa_update_vending_reportes" on storage.objects for update to authenticated using (bucket_id = 'vending-reportes');

-- contratos-firmados
drop policy if exists "qa_insert_contratos_firmados" on storage.objects;
drop policy if exists "qa_select_contratos_firmados" on storage.objects;
drop policy if exists "qa_update_contratos_firmados" on storage.objects;
drop policy if exists "qa_delete_contratos_firmados" on storage.objects;
create policy "qa_insert_contratos_firmados" on storage.objects for insert to authenticated with check (bucket_id = 'contratos-firmados');
create policy "qa_select_contratos_firmados" on storage.objects for select to authenticated using (bucket_id = 'contratos-firmados');
create policy "qa_update_contratos_firmados" on storage.objects for update to authenticated using (bucket_id = 'contratos-firmados');
create policy "qa_delete_contratos_firmados" on storage.objects for delete to authenticated using (bucket_id = 'contratos-firmados');

-- expedientes-docs
drop policy if exists "qa_insert_expedientes_docs" on storage.objects;
drop policy if exists "qa_select_expedientes_docs" on storage.objects;
drop policy if exists "qa_update_expedientes_docs" on storage.objects;
drop policy if exists "qa_delete_expedientes_docs" on storage.objects;
create policy "qa_insert_expedientes_docs" on storage.objects for insert to authenticated with check (bucket_id = 'expedientes-docs');
create policy "qa_select_expedientes_docs" on storage.objects for select to authenticated using (bucket_id = 'expedientes-docs');
create policy "qa_update_expedientes_docs" on storage.objects for update to authenticated using (bucket_id = 'expedientes-docs') with check (bucket_id = 'expedientes-docs');
create policy "qa_delete_expedientes_docs" on storage.objects for delete to authenticated using (bucket_id = 'expedientes-docs');

-- ot-evidencias
drop policy if exists "qa_insert_ot_evidencias" on storage.objects;
drop policy if exists "qa_select_ot_evidencias" on storage.objects;
drop policy if exists "qa_update_ot_evidencias" on storage.objects;
drop policy if exists "qa_delete_ot_evidencias" on storage.objects;
create policy "qa_insert_ot_evidencias" on storage.objects for insert to authenticated with check (bucket_id = 'ot-evidencias');
create policy "qa_select_ot_evidencias" on storage.objects for select to authenticated using (bucket_id = 'ot-evidencias');
create policy "qa_update_ot_evidencias" on storage.objects for update to authenticated using (bucket_id = 'ot-evidencias') with check (bucket_id = 'ot-evidencias');
create policy "qa_delete_ot_evidencias" on storage.objects for delete to authenticated using (bucket_id = 'ot-evidencias');

-- prospecto-docs (incluye insert anónimo acotado a carpeta prospectos/)
drop policy if exists "qa_insert_prospecto_docs" on storage.objects;
drop policy if exists "qa_select_prospecto_docs" on storage.objects;
drop policy if exists "qa_update_prospecto_docs" on storage.objects;
drop policy if exists "qa_delete_prospecto_docs" on storage.objects;
drop policy if exists "qa_anon_insert_prospecto_docs" on storage.objects;
create policy "qa_insert_prospecto_docs" on storage.objects for insert to authenticated with check (bucket_id = 'prospecto-docs');
create policy "qa_select_prospecto_docs" on storage.objects for select to authenticated using (bucket_id = 'prospecto-docs');
create policy "qa_update_prospecto_docs" on storage.objects for update to authenticated using (bucket_id = 'prospecto-docs');
create policy "qa_delete_prospecto_docs" on storage.objects for delete to authenticated using (bucket_id = 'prospecto-docs');
create policy "qa_anon_insert_prospecto_docs" on storage.objects for insert to anon with check (bucket_id = 'prospecto-docs' and (storage.foldername(name))[1] = 'prospectos');

-- validacion-capturas
drop policy if exists "qa_val_capturas_auth" on storage.objects;
create policy "qa_val_capturas_auth" on storage.objects for all to authenticated using (bucket_id = 'validacion-capturas') with check (bucket_id = 'validacion-capturas');

-- contratos-docs (solo insert, sin uso en código, igual que producción)
drop policy if exists "qa_insert_contratos_docs" on storage.objects;
create policy "qa_insert_contratos_docs" on storage.objects for insert to authenticated with check (bucket_id = 'contratos-docs');

-- catalogos
drop policy if exists "qa_catalogos_insert" on storage.objects;
drop policy if exists "qa_catalogos_update" on storage.objects;
drop policy if exists "qa_catalogos_delete" on storage.objects;
drop policy if exists "qa_catalogos_public_read" on storage.objects;
create policy "qa_catalogos_insert" on storage.objects for insert to authenticated with check (bucket_id = 'catalogos');
create policy "qa_catalogos_update" on storage.objects for update to authenticated using (bucket_id = 'catalogos') with check (bucket_id = 'catalogos');
create policy "qa_catalogos_delete" on storage.objects for delete to authenticated using (bucket_id = 'catalogos');
create policy "qa_catalogos_public_read" on storage.objects for select to public using (bucket_id = 'catalogos');

-- logos-arrendatarios (el bucket ya existía en QA, pero sin políticas)
drop policy if exists "qa_logos_insert" on storage.objects;
drop policy if exists "qa_logos_update" on storage.objects;
drop policy if exists "qa_logos_delete" on storage.objects;
drop policy if exists "qa_logos_public_read" on storage.objects;
create policy "qa_logos_insert" on storage.objects for insert to authenticated with check (bucket_id = 'logos-arrendatarios');
create policy "qa_logos_update" on storage.objects for update to authenticated using (bucket_id = 'logos-arrendatarios') with check (bucket_id = 'logos-arrendatarios');
create policy "qa_logos_delete" on storage.objects for delete to authenticated using (bucket_id = 'logos-arrendatarios');
create policy "qa_logos_public_read" on storage.objects for select to public using (bucket_id = 'logos-arrendatarios');

notify pgrst, 'reload schema';
