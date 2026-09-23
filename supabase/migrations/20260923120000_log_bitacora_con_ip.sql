-- Agrega soporte para IP en log_bitacora
-- Elimina todas las versiones anteriores (overloads) antes de recrear.

DROP FUNCTION IF EXISTS public.log_bitacora(text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.log_bitacora(text, text, text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.log_bitacora(
  p_modulo      text,
  p_accion      text,
  p_entidad     text     DEFAULT NULL,
  p_entidad_id  uuid     DEFAULT NULL,
  p_descripcion text     DEFAULT NULL,
  p_ip          text     DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, prp
AS $$
DECLARE
  v_uid   uuid;
  v_email varchar(120);
BEGIN
  SELECT id, email
    INTO v_uid, v_email
    FROM auth.users
   WHERE id = auth.uid()
   LIMIT 1;

  INSERT INTO prp.bitacora(modulo, accion, entidad, entidad_id, descripcion, usuario_id, usuario_email, ip)
  VALUES (p_modulo, p_accion, p_entidad, p_entidad_id, p_descripcion, v_uid, v_email, p_ip);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_bitacora FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_bitacora TO authenticated, service_role;
