-- ============================================================
-- IRP — Módulo Prospectos / CRM
-- Pipeline: CONTACTO → CANDIDATO → DOCS_PENDIENTES →
--           DOCS_COMPLETOS → INVESTIGACION → APROBADO → CONTRATO
-- ============================================================

-- Prospecto principal (ligado a una unidad disponible)
CREATE TABLE IF NOT EXISTS public.prospectos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id       uuid REFERENCES public.unidades(id),
  inmueble_id     uuid REFERENCES public.inmuebles(id),
  folio           text GENERATED ALWAYS AS ('PROS-' || substr(id::text,1,8)) STORED,
  nombre_negocio  text,                          -- giro / nombre del local
  renta_propuesta numeric(12,2),
  fecha_contacto  date NOT NULL DEFAULT current_date,
  etapa           text NOT NULL DEFAULT 'CONTACTO'
                  CHECK (etapa IN ('CONTACTO','CANDIDATO','DOCS_PENDIENTES',
                                   'DOCS_COMPLETOS','INVESTIGACION',
                                   'APROBADO','RECHAZADO','CONTRATO')),
  motivo_rechazo  text,
  notas           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Personas ligadas al prospecto (inquilino, fiador, obligado solidario)
CREATE TABLE IF NOT EXISTS public.prospecto_personas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id    uuid NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  tipo            text NOT NULL
                  CHECK (tipo IN ('INQUILINO','FIADOR','OBLIGADO_SOLIDARIO')),
  -- Datos personales
  nombre_completo text,
  fecha_nacimiento date,
  curp            text,
  rfc             text,
  email           text,
  tel_casa        text,
  cel             text,
  -- Domicilio
  calle           text,
  no_ext          text,
  no_int          text,
  edificio        text,
  colonia         text,
  municipio       text,
  estado_domicilio text,
  cp              text,
  -- Estado civil
  estado_civil    text CHECK (estado_civil IN ('SOLTERO','CASADO','UNION_LIBRE','DIVORCIADO','VIUDO')),
  regimen_matrimonial text CHECK (regimen_matrimonial IN ('BIENES_SEPARADOS','SOCIEDAD_CONYUGAL')),
  nombre_conyuge  text,
  -- Datos económicos
  empresa         text,
  antiguedad_empresa text,
  ingreso_mensual numeric(12,2),
  puesto          text,
  domicilio_empresa text,
  -- Inmueble en garantía (solo FIADOR)
  garantia_calle  text,
  garantia_entre_calles text,
  garantia_colonia text,
  garantia_municipio text,
  garantia_estado text,
  garantia_cp     text,
  -- Escritura (solo FIADOR)
  escritura_no    text,
  escritura_fecha date,
  escritura_notario text,
  escritura_datos_registrales text,
  escritura_fecha_registro date,
  -- Control
  solicitud_firmada boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Documentos requeridos por persona
CREATE TABLE IF NOT EXISTS public.prospecto_documentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id      uuid NOT NULL REFERENCES public.prospecto_personas(id) ON DELETE CASCADE,
  tipo_doc        text NOT NULL CHECK (tipo_doc IN (
                    'INE_FRENTE','INE_REVERSO','PASAPORTE',
                    'COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3',
                    'COMPROBANTE_DOMICILIO',
                    'ESCRITURA_INMUEBLE',
                    'SOLICITUD_FIRMADA'
                  )),
  storage_path    text,                         -- path en Supabase Storage
  nombre_archivo  text,
  mime_type       text,
  tamano_bytes    bigint,
  estado          text NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','SUBIDO','APROBADO','RECHAZADO')),
  nota_rechazo    text,
  subido_at       timestamptz,
  revisado_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Magic links enviados a cada persona para subir sus documentos
CREATE TABLE IF NOT EXISTS public.prospecto_magic_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id      uuid NOT NULL REFERENCES public.prospecto_personas(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email_destino   text NOT NULL,
  enviado_at      timestamptz DEFAULT now(),
  expira_at       timestamptz DEFAULT (now() + interval '7 days'),
  usado_at        timestamptz,
  activo          boolean DEFAULT true
);

-- Historial de etapas (auditoría)
CREATE TABLE IF NOT EXISTS public.prospecto_historial (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id    uuid NOT NULL REFERENCES public.prospectos(id) ON DELETE CASCADE,
  etapa_anterior  text,
  etapa_nueva     text NOT NULL,
  nota            text,
  usuario_id      uuid,
  created_at      timestamptz DEFAULT now()
);

-- ─── VISTA: estado de documentos por persona ───────────────────────────────
CREATE OR REPLACE VIEW public.v_prospecto_docs_status AS
SELECT
  pp.id            AS persona_id,
  pp.prospecto_id,
  pp.tipo,
  pp.nombre_completo,
  pp.email,
  COUNT(pd.id)                                      AS total_docs,
  COUNT(pd.id) FILTER (WHERE pd.estado = 'SUBIDO')  AS docs_subidos,
  COUNT(pd.id) FILTER (WHERE pd.estado = 'APROBADO') AS docs_aprobados,
  COUNT(pd.id) FILTER (WHERE pd.estado = 'PENDIENTE') AS docs_pendientes,
  COUNT(pd.id) FILTER (WHERE pd.estado = 'RECHAZADO') AS docs_rechazados
FROM public.prospecto_personas pp
LEFT JOIN public.prospecto_documentos pd ON pd.persona_id = pp.id
GROUP BY pp.id, pp.prospecto_id, pp.tipo, pp.nombre_completo, pp.email;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.prospectos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_personas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_documentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_magic_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecto_historial    ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados (admin/operador) — acceso total
CREATE POLICY "auth_full" ON public.prospectos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full" ON public.prospecto_personas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full" ON public.prospecto_documentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full" ON public.prospecto_magic_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full" ON public.prospecto_historial
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Acceso anónimo via magic link — solo a la persona del token válido
CREATE POLICY "magic_link_access_persona" ON public.prospecto_personas
  FOR SELECT TO anon
  USING (
    id IN (
      SELECT persona_id FROM public.prospecto_magic_links
      WHERE token = current_setting('request.jwt.claims', true)::json->>'token'
        AND activo = true
        AND expira_at > now()
    )
  );

CREATE POLICY "magic_link_upload_docs" ON public.prospecto_documentos
  FOR ALL TO anon
  USING (
    persona_id IN (
      SELECT persona_id FROM public.prospecto_magic_links
      WHERE token = current_setting('request.jwt.claims', true)::json->>'token'
        AND activo = true
        AND expira_at > now()
    )
  )
  WITH CHECK (
    persona_id IN (
      SELECT persona_id FROM public.prospecto_magic_links
      WHERE token = current_setting('request.jwt.claims', true)::json->>'token'
        AND activo = true
        AND expira_at > now()
    )
  );

-- ─── Función: documentos requeridos por tipo de persona ────────────────────
CREATE OR REPLACE FUNCTION public.docs_requeridos_por_tipo(p_tipo text)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_tipo
    WHEN 'INQUILINO' THEN ARRAY[
      'INE_FRENTE','INE_REVERSO',
      'COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3',
      'SOLICITUD_FIRMADA'
    ]
    WHEN 'OBLIGADO_SOLIDARIO' THEN ARRAY[
      'INE_FRENTE','INE_REVERSO',
      'COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3',
      'COMPROBANTE_DOMICILIO',
      'SOLICITUD_FIRMADA'
    ]
    WHEN 'FIADOR' THEN ARRAY[
      'INE_FRENTE','INE_REVERSO',
      'COMPROBANTE_INGRESOS_1','COMPROBANTE_INGRESOS_2','COMPROBANTE_INGRESOS_3',
      'COMPROBANTE_DOMICILIO',
      'ESCRITURA_INMUEBLE',
      'SOLICITUD_FIRMADA'
    ]
    ELSE ARRAY[]::text[]
  END
$$;

-- ─── Función: inicializar documentos al agregar persona ────────────────────
CREATE OR REPLACE FUNCTION public.inicializar_docs_persona()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  doc text;
BEGIN
  FOREACH doc IN ARRAY public.docs_requeridos_por_tipo(NEW.tipo) LOOP
    INSERT INTO public.prospecto_documentos (persona_id, tipo_doc)
    VALUES (NEW.id, doc);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_docs_persona
  AFTER INSERT ON public.prospecto_personas
  FOR EACH ROW EXECUTE FUNCTION public.inicializar_docs_persona();

-- ─── Trigger: actualizar etapa automáticamente ─────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_etapa_prospecto()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_prospecto_id uuid;
  v_total_pendientes int;
BEGIN
  -- Cuando se aprueba un documento, verificar si ya están todos listos
  SELECT pp.prospecto_id INTO v_prospecto_id
  FROM public.prospecto_personas pp WHERE pp.id = NEW.persona_id;

  SELECT COUNT(*) INTO v_total_pendientes
  FROM public.prospecto_documentos pd
  JOIN public.prospecto_personas pp ON pp.id = pd.persona_id
  WHERE pp.prospecto_id = v_prospecto_id
    AND pd.estado = 'PENDIENTE';

  IF v_total_pendientes = 0 THEN
    UPDATE public.prospectos
    SET etapa = 'DOCS_COMPLETOS', updated_at = now()
    WHERE id = v_prospecto_id AND etapa = 'DOCS_PENDIENTES';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_etapa_prospecto
  AFTER UPDATE OF estado ON public.prospecto_documentos
  FOR EACH ROW WHEN (NEW.estado IN ('APROBADO','SUBIDO'))
  EXECUTE FUNCTION public.auto_etapa_prospecto();
