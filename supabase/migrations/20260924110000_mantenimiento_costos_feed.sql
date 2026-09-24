-- ============================================================
-- Mantenimiento: costo y huella en el Feed
--
-- Costo · al cerrar hay que decir si el trabajo tuvo costo (con_costo).
--   Hecho con personal interno → no. Si un proveedor externo cobró o se
--   compró material (una llave pagada con caja chica), ese dinero es un gasto
--   de la plaza: se registra como ticket en gastos_operativos ligado a la
--   solicitud (mantenimiento_id). prp_mantenimiento suma esos gastos.
--
-- Feed · cada solicitud se publica en el Feed Ejecutivo con sus fotos
--   ("Reporte: …") y al cerrarse se publica el resultado ("Listo: …") con las
--   fotos del trabajo terminado. Así el dueño se entera de lo que se mantiene
--   en la plaza sin tener que abrir el módulo.
--
-- Requiere 20260923300000 (ticket_url en prp_gastos) aplicada antes.
-- ============================================================

-- 1. ¿Tuvo costo? ------------------------------------------------------------
ALTER TABLE public.mantenimiento_solicitudes ADD COLUMN IF NOT EXISTS con_costo boolean;

-- 2. Gastos ligados a la solicitud ----------------------------------------------
ALTER TABLE public.gastos_operativos
  ADD COLUMN IF NOT EXISTS mantenimiento_id uuid REFERENCES public.mantenimiento_solicitudes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gastos_operativos_mantenimiento ON public.gastos_operativos(mantenimiento_id);

CREATE OR REPLACE VIEW public.prp_gastos WITH (security_invoker = true) AS
SELECT g.id,
    g.fecha,
    g.semana,
    g.anio,
    g.mes,
    g.dia_semana,
    g.grupo_gasto,
    g.descripcion,
    g.cantidad AS monto,
    COALESCE(g.ticket_total, g.cantidad) AS ticket_total,
    g.ticket_img_url,
    g.proveedor AS proveedor_txt,
    g.proveedor_id,
    p.nombre AS proveedor_nombre,
    p.categoria AS proveedor_cat,
    ( SELECT COALESCE(sum(d.subtotal), (0)::numeric) AS "coalesce"
           FROM gasto_detalle d
          WHERE (d.gasto_id = g.id)) AS suma_detalle,
    ( SELECT count(*) AS count
           FROM gasto_detalle d
          WHERE (d.gasto_id = g.id)) AS num_lineas,
    g.created_at,
    g.ticket_url,
    g.tiene_factura,
    g.mantenimiento_id
   FROM (gastos_operativos g
     LEFT JOIN cat_proveedores p ON ((p.id = g.proveedor_id)))
  ORDER BY g.fecha DESC, g.created_at DESC;

-- 3. El cierre exige decir si hubo costo --------------------------------------
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
    ('RECHAZADO','SOLICITADO'),
    ('CERRADO','EN_PROCESO')
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
    IF NEW.con_costo IS NULL THEN
      RAISE EXCEPTION 'Para cerrar hay que indicar si el trabajo tuvo costo' USING ERRCODE = '23502';
    END IF;
    NEW.fecha_inicio := coalesce(NEW.fecha_inicio, current_date);
    NEW.fecha_cierre := coalesce(NEW.fecha_cierre, current_date);
  ELSIF NEW.estatus = 'SOLICITADO' THEN
    NEW.motivo_rechazo := NULL;
  END IF;
  RETURN NEW;
END $$;

-- 4. Vista con el gasto ligado --------------------------------------------------
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
  (coalesce(s.fecha_cierre, current_date) - s.fecha_solicitud) AS dias,
  g.n_gastos,
  g.gasto_total
FROM public.mantenimiento_solicitudes s
LEFT JOIN public.cat_categoria_mantenimiento c ON c.clave = s.categoria
LEFT JOIN public.cat_proveedores p ON p.id = s.asignado_proveedor_id
LEFT JOIN LATERAL (
  SELECT count(*)::int AS n_gastos, coalesce(sum(go.cantidad), 0) AS gasto_total
  FROM public.gastos_operativos go WHERE go.mantenimiento_id = s.id
) g ON true;

GRANT SELECT ON public.prp_mantenimiento TO authenticated, service_role;

-- 5. Feed ------------------------------------------------------------------------
ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS mantenimiento_id uuid REFERENCES public.mantenimiento_solicitudes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS etapa text;
CREATE INDEX IF NOT EXISTS idx_publicaciones_mantenimiento ON public.publicaciones(mantenimiento_id);

CREATE OR REPLACE VIEW public.prp_publicaciones WITH (security_invoker = true) AS
SELECT
  p.id,
  p.titulo,
  p.descripcion,
  p.fotos,
  p.categoria,
  p.fecha,
  p.creado_por,
  COALESCE(p.autor_nombre,
    u.nombre || CASE WHEN u.apellido IS NOT NULL THEN ' ' || u.apellido ELSE '' END
  ) AS autor_nombre,
  p.autor_foto_url,
  p.created_at,
  p.mantenimiento_id,
  p.etapa
FROM publicaciones p
LEFT JOIN irp_usuarios u ON u.id = p.creado_por
ORDER BY p.fecha DESC;

CREATE OR REPLACE FUNCTION public.fotos_paths(j jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(e->>'path'), '{}') FROM jsonb_array_elements(coalesce(j, '[]')) e
$$;

CREATE OR REPLACE FUNCTION public.trg_mantenimiento_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cat text;
BEGIN
  SELECT nombre INTO v_cat FROM cat_categoria_mantenimiento WHERE clave = NEW.categoria;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO publicaciones (titulo, descripcion, fotos, categoria, fecha, creado_por, autor_nombre, mantenimiento_id, etapa)
    VALUES ('Reporte: ' || NEW.titulo,
            concat_ws(' · ', v_cat, NEW.ubicacion, NEW.descripcion),
            fotos_paths(NEW.fotos_solicitud),
            CASE WHEN NEW.tipo = 'URGENTE' THEN 'INCIDENCIA' ELSE 'MANTENIMIENTO' END,
            now(), auth.uid(), coalesce(NEW.solicitante_nombre, nombre_usuario_actual()), NEW.id, 'SOLICITUD');
    RETURN NULL;
  END IF;

  -- Las fotos de la solicitud se suben después del alta: se reflejan en su publicación.
  IF NEW.fotos_solicitud IS DISTINCT FROM OLD.fotos_solicitud THEN
    UPDATE publicaciones SET fotos = fotos_paths(NEW.fotos_solicitud)
     WHERE mantenimiento_id = NEW.id AND etapa = 'SOLICITUD';
  END IF;

  IF NEW.estatus = 'CERRADO' AND OLD.estatus IS DISTINCT FROM 'CERRADO' THEN
    DELETE FROM publicaciones WHERE mantenimiento_id = NEW.id AND etapa = 'CIERRE';   -- reabierta y vuelta a cerrar
    INSERT INTO publicaciones (titulo, descripcion, fotos, categoria, fecha, creado_por, autor_nombre, mantenimiento_id, etapa)
    VALUES ('Listo: ' || NEW.titulo,
            concat_ws(' · ', v_cat, NEW.resultado),
            fotos_paths(NEW.fotos_resultado),
            'MANTENIMIENTO', now(), auth.uid(), nombre_usuario_actual(), NEW.id, 'CIERRE');
  ELSIF NEW.estatus = 'CERRADO' AND NEW.fotos_resultado IS DISTINCT FROM OLD.fotos_resultado THEN
    UPDATE publicaciones SET fotos = fotos_paths(NEW.fotos_resultado)
     WHERE mantenimiento_id = NEW.id AND etapa = 'CIERRE';
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_mantenimiento_feed ON public.mantenimiento_solicitudes;
CREATE TRIGGER trg_mantenimiento_feed
  AFTER INSERT OR UPDATE ON public.mantenimiento_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.trg_mantenimiento_feed();

REVOKE EXECUTE ON FUNCTION public.fotos_paths(jsonb)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_mantenimiento_feed()    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fotos_paths(jsonb)          TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.trg_mantenimiento_feed()    TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
