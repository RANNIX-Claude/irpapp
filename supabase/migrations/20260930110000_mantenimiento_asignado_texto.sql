-- Mantenimiento: "a quién se asigna" deja de ser un catálogo de proveedores.
--
-- Regla de negocio: quien atiende puede ser una cuadrilla interna (albañiles,
-- electricistas de la plaza) o un proveedor externo que ni siquiera está dado
-- de alta todavía — obligar a elegir de cat_proveedores bloqueaba justo el
-- caso más común. Se cambia a un campo de texto libre.
--
-- asignado_proveedor_id se queda en la tabla (no se borra, por las
-- solicitudes ya autorizadas contra un proveedor real — su expediente sigue
-- siendo clickeable desde el detalle), pero ya no es obligatorio ni lo
-- pide el formulario: lo nuevo que se autorice usa asignado_texto.

ALTER TABLE public.mantenimiento_solicitudes
  ADD COLUMN IF NOT EXISTS asignado_texto TEXT;

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
    -- Antes exigía asignado_proveedor_id (catálogo); ahora basta el texto libre
    -- (cuadrilla interna o proveedor, con o sin catálogo).
    IF nullif(trim(coalesce(NEW.asignado_texto, '')), '') IS NULL AND NEW.asignado_proveedor_id IS NULL THEN
      RAISE EXCEPTION 'Para autorizar hay que decir quién va a atenderlo' USING ERRCODE = '23502';
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

-- asignado_nombre: el texto libre manda; si la solicitud es de antes (con
-- proveedor de catálogo y sin texto), se sigue mostrando el nombre del
-- proveedor para no dejar en blanco lo que ya estaba autorizado.
DROP VIEW IF EXISTS public.prp_mantenimiento;
CREATE VIEW public.prp_mantenimiento WITH (security_invoker = true) AS
SELECT
  s.*,
  c.nombre   AS categoria_nombre,
  c.color    AS categoria_color,
  COALESCE(nullif(trim(s.asignado_texto), ''), p.nombre) AS asignado_nombre,
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

NOTIFY pgrst, 'reload schema';
