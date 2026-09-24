-- ============================================================
-- Mantenimiento: solicitudes de reparación con flujo de autorización
--
--   SOLICITADO ──autorizar + asignar──▶ AUTORIZADO ──iniciar──▶ EN_PROCESO ──cerrar──▶ CERRADO
--        └──────rechazar──▶ RECHAZADO                    └─────────cerrar────────────▶
--
-- · Categoría (pintura, plomería…) en catálogo editable.
-- · Tipo: URGENTE / PROGRAMADO / NO_PLANEADO.
-- · El responsable se asigna del catálogo único de proveedores (internos o
--   externos: "Juan Pérez — plomero" se da de alta ahí).
-- · Fotos de la solicitud y del resultado en el bucket privado ot-evidencias.
-- · El trigger valida cada cambio de estatus, sella quién y cuándo, y deja
--   rastro en mantenimiento_historial.
-- · Autorizar/rechazar: solo roles de puede_autorizar_mantenimiento().
--
-- ordenes_trabajo (tabla anterior, con datos de demostración) no se toca.
-- ============================================================

-- 1. Catálogo de categorías ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.cat_categoria_mantenimiento (
  clave      text PRIMARY KEY,
  nombre     text NOT NULL,
  color      text NOT NULL DEFAULT '#6B7280',
  orden      integer NOT NULL DEFAULT 100,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.cat_categoria_mantenimiento (clave, nombre, color, orden) VALUES
  ('PINTURA',            'Pintura',             '#7C3AED', 10),
  ('ALBANILERIA',        'Albañilería',         '#92400E', 20),
  ('PLOMERIA',           'Plomería',            '#0A66C2', 30),
  ('ELECTRICIDAD',       'Electricidad',        '#E8A020', 40),
  ('HERRERIA',           'Herrería',            '#475569', 50),
  ('CARPINTERIA',        'Carpintería',         '#B45309', 60),
  ('JARDINERIA',         'Jardinería',          '#057642', 70),
  ('IMPERMEABILIZACION', 'Impermeabilización',  '#0891B2', 80),
  ('AIRE_ACONDICIONADO', 'Aire acondicionado',  '#0EA5E9', 90),
  ('CERRAJERIA',         'Cerrajería',          '#64748B', 100),
  ('LIMPIEZA',           'Limpieza',            '#14B8A6', 110),
  ('OTRO',               'Otro',                '#6B7280', 999)
ON CONFLICT (clave) DO NOTHING;

-- 2. Solicitudes ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.mantenimiento_folio_seq;

CREATE TABLE IF NOT EXISTS public.mantenimiento_solicitudes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio                 text UNIQUE NOT NULL DEFAULT ('MT-' || to_char(current_date, 'YY') || '-' || lpad(nextval('public.mantenimiento_folio_seq')::text, 4, '0')),
  fecha_solicitud       date NOT NULL DEFAULT current_date,
  categoria             text NOT NULL REFERENCES public.cat_categoria_mantenimiento(clave) ON UPDATE CASCADE,
  tipo                  text NOT NULL DEFAULT 'NO_PLANEADO' CHECK (tipo IN ('URGENTE','PROGRAMADO','NO_PLANEADO')),
  titulo                text NOT NULL,
  descripcion           text,
  ubicacion             text,
  estatus               text NOT NULL DEFAULT 'SOLICITADO' CHECK (estatus IN ('SOLICITADO','AUTORIZADO','EN_PROCESO','CERRADO','RECHAZADO')),

  solicitado_por        uuid,
  solicitante_nombre    text,

  autorizado_por        uuid,
  autorizado_por_nombre text,
  fecha_autorizacion    timestamptz,
  asignado_proveedor_id uuid REFERENCES public.cat_proveedores(id) ON DELETE SET NULL,
  fecha_programada      date,
  costo_estimado        numeric(12,2),

  fecha_inicio          date,
  fecha_cierre          date,
  resultado             text,
  costo_real            numeric(12,2),
  motivo_rechazo        text,

  fotos_solicitud       jsonb NOT NULL DEFAULT '[]',
  fotos_resultado       jsonb NOT NULL DEFAULT '[]',
  nota_cambio           text,           -- comentario del último cambio; el trigger lo pasa al historial

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mant_estatus   ON public.mantenimiento_solicitudes(estatus);
CREATE INDEX IF NOT EXISTS idx_mant_proveedor ON public.mantenimiento_solicitudes(asignado_proveedor_id);

CREATE TABLE IF NOT EXISTS public.mantenimiento_historial (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id     uuid NOT NULL REFERENCES public.mantenimiento_solicitudes(id) ON DELETE CASCADE,
  fecha            timestamptz NOT NULL DEFAULT now(),
  usuario_id       uuid,
  usuario_nombre   text,
  estatus_anterior text,
  estatus_nuevo    text NOT NULL,
  nota             text
);
CREATE INDEX IF NOT EXISTS idx_mant_hist_solicitud ON public.mantenimiento_historial(solicitud_id, fecha);

-- 3. Quién puede autorizar --------------------------------------------------
CREATE OR REPLACE FUNCTION public.puede_autorizar_mantenimiento()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.irp_usuarios
    WHERE id = auth.uid()
      AND rol_id IN ('super_admin','admin_inmobiliaria','gerente_plaza','supervisor_operaciones','corporativo')
  )
$$;

CREATE OR REPLACE FUNCTION public.nombre_usuario_actual()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(trim(coalesce(nombre, '') || ' ' || coalesce(apellido, '')), '')
  FROM public.irp_usuarios WHERE id = auth.uid()
$$;

-- 4. Flujo ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_mantenimiento_flujo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.estatus := 'SOLICITADO';
    NEW.solicitado_por := coalesce(NEW.solicitado_por, auth.uid());
    NEW.solicitante_nombre := coalesce(nullif(trim(NEW.solicitante_nombre), ''), public.nombre_usuario_actual());
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  IF NEW.estatus IS NOT DISTINCT FROM OLD.estatus THEN
    RETURN NEW;
  END IF;

  v_ok := (OLD.estatus, NEW.estatus) IN (
    ('SOLICITADO','AUTORIZADO'), ('SOLICITADO','RECHAZADO'),
    ('AUTORIZADO','EN_PROCESO'), ('AUTORIZADO','CERRADO'), ('AUTORIZADO','RECHAZADO'),
    ('EN_PROCESO','CERRADO'),
    ('RECHAZADO','SOLICITADO'),            -- reabrir una rechazada
    ('CERRADO','EN_PROCESO')               -- reabrir si el trabajo quedó mal
  );
  IF NOT v_ok THEN
    RAISE EXCEPTION 'No se puede pasar de % a %', OLD.estatus, NEW.estatus USING ERRCODE = '22023';
  END IF;

  IF NEW.estatus IN ('AUTORIZADO','RECHAZADO') AND OLD.estatus IN ('SOLICITADO','AUTORIZADO')
     AND NOT public.puede_autorizar_mantenimiento() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Tu rol no puede autorizar ni rechazar solicitudes de mantenimiento' USING ERRCODE = '42501';
  END IF;

  IF NEW.estatus = 'AUTORIZADO' THEN
    IF NEW.asignado_proveedor_id IS NULL THEN
      RAISE EXCEPTION 'Para autorizar hay que asignar un responsable' USING ERRCODE = '23502';
    END IF;
    NEW.autorizado_por := auth.uid();
    NEW.autorizado_por_nombre := public.nombre_usuario_actual();
    NEW.fecha_autorizacion := now();
  ELSIF NEW.estatus = 'RECHAZADO' THEN
    IF nullif(trim(coalesce(NEW.motivo_rechazo, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Indica el motivo del rechazo' USING ERRCODE = '23502';
    END IF;
    NEW.autorizado_por := auth.uid();
    NEW.autorizado_por_nombre := public.nombre_usuario_actual();
    NEW.fecha_autorizacion := now();
  ELSIF NEW.estatus = 'EN_PROCESO' THEN
    NEW.fecha_inicio := coalesce(NEW.fecha_inicio, current_date);
    IF OLD.estatus = 'CERRADO' THEN NEW.fecha_cierre := NULL; END IF;
  ELSIF NEW.estatus = 'CERRADO' THEN
    IF nullif(trim(coalesce(NEW.resultado, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Para cerrar hay que describir el resultado' USING ERRCODE = '23502';
    END IF;
    NEW.fecha_inicio := coalesce(NEW.fecha_inicio, current_date);
    NEW.fecha_cierre := coalesce(NEW.fecha_cierre, current_date);
  ELSIF NEW.estatus = 'SOLICITADO' THEN
    NEW.motivo_rechazo := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mantenimiento_flujo ON public.mantenimiento_solicitudes;
CREATE TRIGGER trg_mantenimiento_flujo
  BEFORE INSERT OR UPDATE ON public.mantenimiento_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.trg_mantenimiento_flujo();

CREATE OR REPLACE FUNCTION public.trg_mantenimiento_historial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.estatus IS DISTINCT FROM OLD.estatus THEN
    INSERT INTO public.mantenimiento_historial (solicitud_id, usuario_id, usuario_nombre, estatus_anterior, estatus_nuevo, nota)
    VALUES (NEW.id, auth.uid(), public.nombre_usuario_actual(),
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.estatus END, NEW.estatus,
            coalesce(nullif(trim(NEW.nota_cambio), ''),
                     CASE WHEN NEW.estatus = 'RECHAZADO' THEN NEW.motivo_rechazo
                          WHEN NEW.estatus = 'CERRADO' THEN NEW.resultado END));
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_mantenimiento_historial ON public.mantenimiento_solicitudes;
CREATE TRIGGER trg_mantenimiento_historial
  AFTER INSERT OR UPDATE ON public.mantenimiento_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.trg_mantenimiento_historial();

-- 5. RLS y permisos --------------------------------------------------------
ALTER TABLE public.cat_categoria_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimiento_solicitudes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimiento_historial     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all ON public.cat_categoria_mantenimiento;
CREATE POLICY staff_all ON public.cat_categoria_mantenimiento FOR ALL TO authenticated USING (public.es_staff()) WITH CHECK (public.es_staff());
DROP POLICY IF EXISTS staff_all ON public.mantenimiento_solicitudes;
CREATE POLICY staff_all ON public.mantenimiento_solicitudes FOR ALL TO authenticated USING (public.es_staff()) WITH CHECK (public.es_staff());
-- El historial solo se lee: lo escribe el trigger (SECURITY DEFINER).
DROP POLICY IF EXISTS staff_all ON public.mantenimiento_historial;
DROP POLICY IF EXISTS staff_lee ON public.mantenimiento_historial;
CREATE POLICY staff_lee ON public.mantenimiento_historial FOR SELECT TO authenticated USING (public.es_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cat_categoria_mantenimiento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mantenimiento_solicitudes   TO authenticated;
GRANT SELECT ON public.mantenimiento_historial TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.mantenimiento_folio_seq TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.puede_autorizar_mantenimiento() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nombre_usuario_actual()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_mantenimiento_flujo()       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_mantenimiento_historial()   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.puede_autorizar_mantenimiento() TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.nombre_usuario_actual()         TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.trg_mantenimiento_flujo()       TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.trg_mantenimiento_historial()   TO authenticated, service_role;

-- 6. Vista ------------------------------------------------------------------
DROP VIEW IF EXISTS public.prp_mantenimiento;
CREATE VIEW public.prp_mantenimiento WITH (security_invoker = true) AS
SELECT
  s.*,
  c.nombre   AS categoria_nombre,
  c.color    AS categoria_color,
  p.nombre   AS asignado_nombre,
  p.telefono AS asignado_telefono,
  jsonb_array_length(s.fotos_solicitud) AS n_fotos_solicitud,
  jsonb_array_length(s.fotos_resultado) AS n_fotos_resultado,
  (coalesce(s.fecha_cierre, current_date) - s.fecha_solicitud) AS dias
FROM public.mantenimiento_solicitudes s
LEFT JOIN public.cat_categoria_mantenimiento c ON c.clave = s.categoria
LEFT JOIN public.cat_proveedores p ON p.id = s.asignado_proveedor_id;

GRANT SELECT ON public.prp_mantenimiento TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
