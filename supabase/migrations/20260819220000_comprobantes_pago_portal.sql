-- Comprobantes de pago enviados por arrendatarios desde el portal
-- Admin los revisa en Cobranza y confirma o rechaza

CREATE TABLE IF NOT EXISTS public.comprobantes_pago (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT now(),
  cobro_id         UUID,                       -- id de prp.cobros_programados (sin FK cross-schema)
  arrendatario_id  UUID        REFERENCES public.arrendatarios(id),
  imagen_url       TEXT,                       -- URL en Storage
  imagen_path      TEXT,                       -- path en bucket
  ocr_datos        JSONB DEFAULT '{}',         -- datos extraídos por IA
  -- Datos confirmados por el arrendatario
  fecha_pago       DATE,
  monto            NUMERIC(12,2),
  banco            TEXT,
  referencia       TEXT,
  forma_pago       TEXT,
  notas            TEXT,
  -- Estado de revisión
  estado           TEXT NOT NULL DEFAULT 'ENVIADO'
    CHECK (estado IN ('ENVIADO','REVISADO','APLICADO','RECHAZADO')),
  nota_admin       TEXT,
  revisado_por     UUID,
  revisado_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comp_cobro ON public.comprobantes_pago(cobro_id);
CREATE INDEX IF NOT EXISTS idx_comp_arr   ON public.comprobantes_pago(arrendatario_id);
CREATE INDEX IF NOT EXISTS idx_comp_est   ON public.comprobantes_pago(estado);

ALTER TABLE public.comprobantes_pago ENABLE ROW LEVEL SECURITY;

-- Garantizar que auth_user_id existe en arrendatarios (idempotente)
ALTER TABLE public.arrendatarios
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Helper local
CREATE OR REPLACE FUNCTION public._comp_mi_arr_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.arrendatarios WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Arrendatario ve y crea solo sus comprobantes; admin ve todo
CREATE POLICY "comp_rls" ON public.comprobantes_pago
  FOR ALL TO authenticated
  USING (
    arrendatario_id = public._comp_mi_arr_id()
    OR EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid()
        AND rol_id IN ('SUPERADMIN','ADMIN','ADMINISTRADOR','GERENTE','COBRANZA')
    )
  )
  WITH CHECK (
    arrendatario_id = public._comp_mi_arr_id()
  );

-- Bucket de storage para comprobantes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes-pago',
  'comprobantes-pago',
  false,
  10485760,   -- 10 MB máx
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
) ON CONFLICT (id) DO NOTHING;

-- Políticas del bucket: autenticados leen/escriben en su carpeta
CREATE POLICY "arr_upload_comp" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'comprobantes-pago'
    AND (storage.foldername(name))[1] = (public._comp_mi_arr_id())::text
  );

CREATE POLICY "arr_read_comp" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'comprobantes-pago'
    AND (
      (storage.foldername(name))[1] = (public._comp_mi_arr_id())::text
      OR EXISTS (
        SELECT 1 FROM public.irp_usuarios WHERE id = auth.uid()
          AND rol_id IN ('SUPERADMIN','ADMIN','ADMINISTRADOR','GERENTE','COBRANZA')
      )
    )
  );
