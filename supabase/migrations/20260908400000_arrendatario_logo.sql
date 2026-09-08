-- MIGRACIÓN: logo de la empresa arrendataria
--
-- Para la vista de mosaico de contratos y para el encabezado del expediente
-- de contrato, donde el logo hace el papel que la foto hace en el expediente
-- de empleado.

ALTER TABLE public.arrendatarios
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.arrendatarios.logo_url IS
  'Logo de la empresa en el bucket público logos-arrendatarios. URL directa, igual que avatars: es identidad comercial, no dato sensible.';

-- ── Bucket público ──────────────────────────────────────────────────────────
-- Mismo criterio que `avatars`: se pinta con <img src> en listados de muchos
-- registros, donde firmar una URL por tarjeta sería caro y sin ganancia — un
-- logo comercial es público por naturaleza.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos-arrendatarios',
  'logos-arrendatarios',
  true,
  2097152,  -- 2 MB: son logos, no fotografías
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'];

DROP POLICY IF EXISTS "logos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "logos_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "logos_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "logos_auth_delete"   ON storage.objects;

CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos-arrendatarios');

CREATE POLICY "logos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos-arrendatarios');

CREATE POLICY "logos_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'logos-arrendatarios')
  WITH CHECK (bucket_id = 'logos-arrendatarios');

CREATE POLICY "logos_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'logos-arrendatarios');

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- PENDIENTE — exponer logo_url en las vistas
-- ─────────────────────────────────────────────────────────────
-- prp_contratos y prp_expediente_arrendatario no lo expondrán solas. Mientras
-- no se versionen esas vistas, el frontend lee logo_url directo de
-- arrendatarios, igual que hace con rh_empleados.
