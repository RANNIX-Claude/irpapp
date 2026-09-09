-- MIGRACIÓN: romper la recursión infinita en las políticas de irp_usuarios
--
-- SÍNTOMA
--   select sobre irp_usuarios -> 42P17 "infinite recursion detected in policy
--   for relation irp_usuarios", y TODA operación de Storage con sesión iniciada
--   fallaba con "The database schema is invalid or incompatible".
--
-- POR QUÉ SE PROPAGA A STORAGE
--   La política `arr_read_comp` de storage.objects (creada en
--   20260819220000_comprobantes_pago_portal.sql) consulta irp_usuarios para
--   saber si el usuario es staff. Postgres evalúa juntas todas las políticas
--   SELECT de storage.objects, así que la recursión tumbaba la consulta entera
--   sin importar el bucket: por eso no se podía firmar ni subir NADA estando
--   autenticado, mientras con la llave anónima todo funcionaba (esa política es
--   TO authenticated y no llega a evaluarse).
--
-- LA CAUSA
--   Alguna política de irp_usuarios consulta la propia irp_usuarios para
--   averiguar el rol. Evaluarla exige evaluarla de nuevo, y así al infinito.
--
-- LA SOLUCIÓN
--   Una función SECURITY DEFINER lee el rol saltándose RLS. Al no pasar por las
--   políticas, no hay recursión, y las demás políticas la usan en lugar de
--   consultar la tabla directamente.

-- ─────────────────────────────────────────────────────────────
-- 1. Función que devuelve el rol del usuario actual, sin RLS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol_id FROM public.irp_usuarios WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.mi_rol() IS
  'Rol del usuario autenticado. SECURITY DEFINER a propósito: se salta RLS para que las políticas puedan preguntar por el rol sin provocar recursión.';

-- Staff = personal interno. Se define por exclusión de los roles externos y
-- acotados, para que un rol nuevo entre como staff sin tener que tocar esto.
-- Roles reales en la tabla: super_admin, admin_inmobiliaria, gerente_plaza,
-- supervisor_operaciones, rh_manager, contador, ventas_crm, mantenimiento,
-- read_only, arrendatario, restaurante.
CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol_id NOT IN ('arrendatario','prospecto','restaurante')
       FROM public.irp_usuarios WHERE id = auth.uid()),
    false)
$$;

-- Administración: los tres roles que la política original dejaba ver todos los
-- perfiles. Se conserva esa semántica tal cual.
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rol_id IN ('super_admin','admin_inmobiliaria','gerente_plaza')
       FROM public.irp_usuarios WHERE id = auth.uid()),
    false)
$$;

REVOKE ALL ON FUNCTION public.mi_rol()   FROM public, anon;
REVOKE ALL ON FUNCTION public.es_staff() FROM public, anon;
REVOKE ALL ON FUNCTION public.es_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mi_rol()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Políticas de irp_usuarios sin auto-referencia
-- ─────────────────────────────────────────────────────────────
-- Se eliminan TODAS las políticas actuales de la tabla: cualquiera que consulte
-- irp_usuarios dentro de sí misma reintroduce el problema.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'irp_usuarios'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.irp_usuarios', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.irp_usuarios ENABLE ROW LEVEL SECURITY;

-- Cada quien lee su propia ficha. Comparación directa contra auth.uid(),
-- sin subconsulta: aquí es donde nacía la recursión.
CREATE POLICY "usuarios_leen_su_ficha" ON public.irp_usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- El staff ve a todos, preguntando el rol por la función (que no pasa por RLS).
CREATE POLICY "admin_lee_todos" ON public.irp_usuarios
  FOR SELECT TO authenticated
  USING (public.es_admin());

-- Cada quien actualiza su propia ficha; el staff, la de cualquiera.
CREATE POLICY "usuarios_actualizan_su_ficha" ON public.irp_usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.es_admin())
  WITH CHECK (id = auth.uid() OR public.es_admin());

CREATE POLICY "admin_administra_usuarios" ON public.irp_usuarios
  FOR INSERT TO authenticated
  WITH CHECK (public.es_admin());

CREATE POLICY "admin_borra_usuarios" ON public.irp_usuarios
  FOR DELETE TO authenticated
  USING (public.es_admin());

-- ─────────────────────────────────────────────────────────────
-- 3. La política de storage deja de consultar la tabla
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "arr_read_comp" ON storage.objects;

CREATE POLICY "arr_read_comp" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprobantes-pago'
    AND (
      (storage.foldername(name))[1] = (public._comp_mi_arr_id())::text
      OR public.es_staff()
    )
  );

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- 1) Ya no debe dar 42P17:
--    select id, rol_id from public.irp_usuarios limit 1;
--
-- 2) Políticas que quedaron:
--    select policyname, cmd, roles from pg_policies
--     where schemaname='public' and tablename='irp_usuarios' order by policyname;
--
-- 3) Ninguna política de storage debe seguir consultando irp_usuarios:
--    select policyname from pg_policies
--     where schemaname='storage' and qual::text like '%irp_usuarios%';
--
-- 4) En la app: entrar, abrir un documento del expediente y subir un logo.
