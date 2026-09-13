-- 20260913120000_retira_portal_arrendatario.sql
-- Retira el portal de arrendatario (rol `arrendatario`, vínculo arrendatarios.auth_user_id,
-- PortalArrendatario.jsx, function crear-acceso-inquilino). Nunca llegó a operar: la RPC
-- vincular_usuario_arrendatario y la vista portal_mis_cobros no existían y ningún arrendatario
-- quedó vinculado. El inquilino usa el rol `locatario` (irp_usuarios.contrato_id), que sí está
-- en producción con 16 cuentas y RLS acotada (20260913100000).
--
-- Reversible: recrear _comp_mi_arr_id() y las políticas comp_arrendatario / arr_read_comp /
-- arr_upload_comp desde supabase/backups/seguridad-prod-2026-09-13-*.json.

BEGIN;

-- 1. Políticas que dependían del vínculo arrendatario ↔ auth user
DROP POLICY IF EXISTS comp_arrendatario ON public.comprobantes_pago;   -- queda staff_all
DROP POLICY IF EXISTS arr_read_comp     ON storage.objects;
DROP POLICY IF EXISTS arr_upload_comp   ON storage.objects;
DROP FUNCTION IF EXISTS public._comp_mi_arr_id();

-- 2. Bucket comprobantes-pago: sin objetos y sin uso en el código (los comprobantes van a
--    facturas-cfdi vía la function subir-comprobante). Supabase no permite borrar buckets por
--    SQL ("Use the Storage API instead"); sin políticas queda inaccesible salvo service_role.
--    Si se quiere eliminar, hacerlo desde el dashboard: Storage → comprobantes-pago → Delete.

-- 3. Usuarios con el rol retirado pasan a locatario sin contrato: la app les muestra
--    "falta vincular tu cuenta" hasta que administración les asigne contrato_id.
UPDATE public.irp_usuarios SET rol_id = 'locatario', updated_at = now()
 WHERE rol_id = 'arrendatario';

-- 4. El rol deja de ofrecerse en Configuración (se conserva la fila por integridad histórica)
UPDATE public.irp_roles
   SET activo = false,
       descripcion = 'Retirado 2026-09-13. Usar locatario (uno por contrato).'
 WHERE id = 'arrendatario';

NOTIFY pgrst, 'reload schema';
COMMIT;
