-- MIGRACIÓN: tabla `documentos` del expediente de arrendatario / contrato
--
-- src/components/ui/ExpedienteModal.jsx lleva tiempo haciendo select, insert y
-- update contra public.documentos, pero la tabla NO EXISTE: PostgREST responde
-- "Could not find the table 'public.documentos'". Es decir, la pestaña de
-- documentos del expediente de arrendatario nunca guardó nada — el archivo se
-- subía al bucket y el registro se perdía.
--
-- El esquema sale de lo que ese componente ya escribe:
--   entidad_tipo, entidad_id, tipo_doc, url, nombre_archivo, estatus

CREATE TABLE IF NOT EXISTS public.documentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo   text NOT NULL,              -- ARRENDATARIO | EMPLEADO | CONTRATO
  entidad_id     uuid NOT NULL,
  tipo_doc       text NOT NULL,              -- INE_FRENTE, RFC_CONSTANCIA, ...
  url            text,                       -- ruta en el bucket expedientes-docs
  nombre_archivo text,
  estatus        text NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE | APROBADO | RECHAZADO
  notas          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documentos_estatus_chk
    CHECK (estatus IN ('PENDIENTE','APROBADO','RECHAZADO'))
);

-- Un documento por tipo y entidad: el componente hace "si existe actualiza,
-- si no inserta", así que conviene garantizarlo en la base.
CREATE UNIQUE INDEX IF NOT EXISTS documentos_entidad_tipo_doc_idx
  ON public.documentos (entidad_tipo, entidad_id, tipo_doc);

CREATE INDEX IF NOT EXISTS documentos_entidad_idx
  ON public.documentos (entidad_tipo, entidad_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION public.documentos_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS documentos_touch_trg ON public.documentos;
CREATE TRIGGER documentos_touch_trg
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.documentos_touch();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_auth_all" ON public.documentos;
CREATE POLICY "documentos_auth_all" ON public.documentos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select column_name, data_type from information_schema.columns
--  where table_schema='public' and table_name='documentos' order by ordinal_position;
