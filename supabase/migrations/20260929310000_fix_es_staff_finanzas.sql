-- Corrección: la migración 20260929300000 omitió 'asistente' al reescribir es_staff().
-- Esta migración restaura la lista completa.
CREATE OR REPLACE FUNCTION public.es_staff() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol_id NOT IN ('arrendatario','prospecto','restaurante','locatario','asistente','finanzas')
    )
$$;
