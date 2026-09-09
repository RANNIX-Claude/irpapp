-- MIGRACIÓN: imágenes de catálogos — proveedores y productos
--
-- Mismo patrón que ya usan avatars (empleados) y logos-arrendatarios: vista de
-- mosaico con la imagen, y ficha completa al abrir. Aquí se aplica al catálogo
-- de proveedores (Sam's, Garis, Oxxo…) y al de productos que se compran.

ALTER TABLE public.cat_proveedores
  ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.cat_productos
  ADD COLUMN IF NOT EXISTS imagen_url text;

COMMENT ON COLUMN public.cat_proveedores.logo_url IS
  'Logo del proveedor en el bucket público catalogos, prefijo proveedores/.';
COMMENT ON COLUMN public.cat_productos.imagen_url IS
  'Imagen del producto en el bucket público catalogos, prefijo productos/.';

-- ── Bucket único para imágenes de catálogo ──────────────────────────────────
-- Un solo bucket con prefijos por entidad, en lugar de uno por catálogo: son
-- imágenes del mismo tipo y con las mismas reglas. Público por el mismo motivo
-- que avatars y logos-arrendatarios — se pintan en listados de muchas tarjetas,
-- donde firmar cada URL sería caro, y no hay dato sensible en un logo comercial.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalogos',
  'catalogos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 2097152,
  -- sin SVG: Storage lo rechaza y no hace falta para un logo
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "catalogos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "catalogos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "catalogos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "catalogos_auth_delete" ON storage.objects;

CREATE POLICY "catalogos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'catalogos');

CREATE POLICY "catalogos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalogos');

CREATE POLICY "catalogos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'catalogos')
  WITH CHECK (bucket_id = 'catalogos');

CREATE POLICY "catalogos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'catalogos');

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select id, public from storage.buckets where id = 'catalogos';
-- select column_name from information_schema.columns
--  where table_name in ('cat_proveedores','cat_productos')
--    and column_name in ('logo_url','imagen_url');
--
-- NOTA: prp_proveedores no expone logo_url. Mientras no se versione esa vista,
-- el frontend lo lee de cat_proveedores, igual que hace con rh_empleados y
-- arrendatarios.
