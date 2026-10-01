-- Rol "central": autoriza solicitudes de mantenimiento desde oficina central,
-- sin necesariamente encargarse de la operación diaria de la plaza (a
-- diferencia de gerente_plaza/supervisor_operaciones, que sí la operan).
--
-- Se agrega al catálogo (irp_usuarios.rol_id tiene FK a irp_roles) y a la
-- función puede_autorizar_mantenimiento(), que es la que de verdad protege
-- el paso SOLICITADO → AUTORIZADO/RECHAZADO (ver trg_mantenimiento_flujo en
-- 20260924100000_mantenimiento_solicitudes.sql). El rol nuevo cae dentro de
-- es_staff() automáticamente (esa función excluye por lista negativa:
-- arrendatario/prospecto/restaurante/locatario), así que no hace falta tocar
-- ninguna política RLS aparte.

INSERT INTO public.irp_roles (id, nombre, descripcion, nivel, activo)
VALUES ('central', 'Central', 'Autoriza o rechaza solicitudes de mantenimiento desde oficina central; no opera la plaza día a día.', 45, true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.puede_autorizar_mantenimiento()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.irp_usuarios
    WHERE id = auth.uid()
      AND rol_id IN ('super_admin','admin_inmobiliaria','gerente_plaza','supervisor_operaciones','corporativo','central')
  )
$$;
