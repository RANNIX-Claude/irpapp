-- ETAPA 1 — Cierra los buckets que HOY contienen datos personales.
--
-- PROBLEMA QUE CORRIGE:
-- Los buckets se crearon con public = true para que getPublicUrl() funcionara
-- sin sesión. Eso sirve los objetos en /storage/v1/object/public/... SIN
-- NINGUNA LLAVE, y las políticas "TO anon" permiten además enumerarlos con la
-- llave anónima, que va incrustada en el bundle del navegador.
--
-- Verificado el 2026-08-29 con la llave anónima del proyecto:
--   contratos-firmados -> 23 objetos enumerables
--   prospecto-docs     ->  1 objeto enumerable
-- Contratos de arrendamiento firmados y documentos de identidad de prospectos.
--
-- ALCANCE DE ESTA MIGRACIÓN: solo esos dos buckets.
-- Los otros cinco (expedientes-docs, tickets-gastos, facturas-cfdi,
-- comprobantes-pago, vending-reportes) están VACÍOS hoy: no hay exposición real
-- y cerrarlos exige refactorizar ~30 puntos de lectura en el frontend. Se hace
-- en la etapa 2, antes de que entren datos de producción. Ver TODO al final.
--
-- ⚠️ NO APLICAR SOLA: rompe la subida y descarga de contratos hasta que se
-- despliegue el cambio de código que acompaña a esta migración.

begin;

-- ─────────────────────────────────────────────────────────────
-- 1. Los dos buckets con contenido pasan a privados
-- ─────────────────────────────────────────────────────────────

update storage.buckets
   set public = false
 where id in ('contratos-firmados', 'prospecto-docs');

-- ─────────────────────────────────────────────────────────────
-- 2. Fuera el acceso anónimo de lectura
-- ─────────────────────────────────────────────────────────────

drop policy if exists "public_read_contratos"      on storage.objects;
drop policy if exists "anon_select_prospecto_docs" on storage.objects;

-- ─────────────────────────────────────────────────────────────
-- 3. La subida anónima del prospecto queda acotada a su prefijo
-- ─────────────────────────────────────────────────────────────
-- El prospecto no tiene sesión de Supabase: sube desde el magic link. Se
-- conserva el INSERT anónimo pero restringido a 'prospectos/', para que no se
-- pueda escribir en cualquier ruta del bucket.
--
-- Endurecimiento de la etapa 2: mover la subida a la Netlify Function
-- portal-prospecto —que ya valida el token— y eliminar este INSERT.

drop policy if exists "anon_insert_prospecto_docs" on storage.objects;

create policy "anon_insert_prospecto_docs"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'prospecto-docs'
    and (storage.foldername(name))[1] = 'prospectos'
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Lectura autenticada de prospecto-docs
-- ─────────────────────────────────────────────────────────────
-- contratos-firmados ya tiene auth_select/insert/update/delete definidas en
-- 20260820900000_reload_storage_policies.sql. prospecto-docs ya tiene
-- auth_select/update/delete. Se agrega el INSERT autenticado que le faltaba.

drop policy if exists "auth_insert_prospecto_docs" on storage.objects;

create policy "auth_insert_prospecto_docs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'prospecto-docs');

commit;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select id, public from storage.buckets order by id;
--   -> contratos-firmados y prospecto-docs deben decir public = false
--
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'storage' and tablename = 'objects' and 'anon' = any(roles);
--   -> solo debe quedar anon_insert_prospecto_docs, y solo con cmd = INSERT

-- ─────────────────────────────────────────────────────────────
-- TODO — ETAPA 2 (antes de producción)
-- ─────────────────────────────────────────────────────────────
-- 1. Guardar la RUTA del archivo en la BD, no la URL: una URL firmada expira,
--    así que contrato_pdf_url / factura_pdf_url / ticket_url / imagen_url no
--    pueden seguir almacenando una URL completa.
-- 2. Sustituir los ~30 getPublicUrl() restantes por urlFirmada() de
--    src/lib/supabase.js, incluidos los <img src> que requieren resolver la
--    URL antes de pintar.
-- 3. Cerrar los otros cinco buckets y darles política 'authenticated'.
--    Hoy no tienen NINGUNA política: funcionan solo porque son públicos, y se
--    romperán en cuanto se cierren si no se les agrega.
