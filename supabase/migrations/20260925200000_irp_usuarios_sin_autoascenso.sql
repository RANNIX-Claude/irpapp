-- irp_usuarios: nadie puede cambiarse a sí mismo el rol, el contrato ni el estado.
--
-- Hallazgo del 2026-09-25 (comprobado en QA con ROLLBACK y en producción por
-- inspección de políticas/grants): la política `usuarios_actualizan_su_ficha`
-- deja a cada usuario hacer UPDATE de SU fila, y `authenticated` tiene UPDATE
-- sobre TODAS las columnas, incluidas rol_id, contrato_id y activo. Resultado:
--   UPDATE irp_usuarios SET rol_id = 'super_admin' WHERE id = auth.uid();
-- funcionaba para cualquier cuenta (un locatario, el restaurante…) y con eso
-- es_staff()/es_admin() pasaban a true. También un locatario podía reasignarse
-- otro contract_id y ver el expediente de otro inquilino.
--
-- Se corrige con un trigger y no con REVOKE por columna, para no romper la
-- pantalla de Configuración, donde un administrador sí cambia roles desde el
-- cliente. Sin sesión (auth.uid() nulo: SQL editor, service_role, migraciones)
-- no se estorba.

CREATE OR REPLACE FUNCTION public.irp_usuarios_protege_privilegios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.rol_id      IS DISTINCT FROM OLD.rol_id
       OR NEW.contrato_id IS DISTINCT FROM OLD.contrato_id
       OR NEW.activo      IS DISTINCT FROM OLD.activo
       OR NEW.id          IS DISTINCT FROM OLD.id)
     AND NOT public.es_admin()
  THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el rol, el contrato o el estado de una cuenta'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.irp_usuarios_protege_privilegios() FROM anon, public;

DROP TRIGGER IF EXISTS trg_irp_usuarios_protege_privilegios ON public.irp_usuarios;
CREATE TRIGGER trg_irp_usuarios_protege_privilegios
  BEFORE UPDATE ON public.irp_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.irp_usuarios_protege_privilegios();
