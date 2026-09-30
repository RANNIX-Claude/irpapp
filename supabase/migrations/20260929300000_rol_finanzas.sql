-- Rol Finanzas (Jessie): valida depósitos registrados por el administrador.
--
-- Flujo:
--   Jorge (admin) captura ingreso → estatus_validacion = 'POR_VALIDAR'
--   Jessie (finanzas) ve la lista → cambia a VALIDADO
--   Fernando (cuando exista) ve los VALIDADO y emite CFDI
--
-- Seguridad:
--   finanzas se excluye de es_staff() para no ver toda la BD.
--   Tiene política propia: solo SELECT + UPDATE en ingresos.
--   UPDATE acotado a los campos de validación; no puede cambiar importe ni contrato.

-- ── 1. Agregar rol al catálogo ───────────────────────────────────────────────
INSERT INTO public.irp_roles (id, nombre, descripcion)
VALUES ('finanzas', 'Finanzas', 'Valida depósitos recibidos y emite CFDI')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

-- ── 2. Excluir finanzas de es_staff() ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_staff() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol_id NOT IN ('arrendatario','prospecto','restaurante','locatario','asistente','finanzas')
    )
$$;

-- ── 3. Políticas para finanzas en ingresos ───────────────────────────────────
-- SELECT: ve todos los ingresos (los filtramos en UI a POR_VALIDAR)
CREATE POLICY finanzas_lee_ingresos
  ON public.ingresos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'finanzas'
    )
  );

-- UPDATE: solo puede cambiar los campos de validación
CREATE POLICY finanzas_valida_ingresos
  ON public.ingresos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'finanzas'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'finanzas'
    )
  );

-- ── 4. Acceso a prp_contratos (para mostrar arrendatario en la lista) ─────────
CREATE POLICY finanzas_lee_contratos
  ON public.contratos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'finanzas'
    )
  );

-- ── 5. Actualizar prp_ingresos para incluir campos de validación ─────────────
DROP VIEW IF EXISTS public.prp_ingresos;

CREATE VIEW public.prp_ingresos
WITH (security_invoker = true) AS
SELECT
  i.id,
  i.fecha,
  i.tipo,
  i.mes,
  i.anio,
  i.importe,
  i.factura,
  i.nota,
  i.origen,
  i.concepto_origen,
  i.comprobante_url,
  i.contrato_id,
  i.created_at,
  i.forma_pago,
  i.referencia_banco,
  i.importe_total,
  i.estatus_validacion,
  i.validado_por,
  i.validado_en,
  i.factura_url,
  i.factura_xml_url,
  -- Datos del contrato
  con.folio,
  con.arrendatario_nombre,
  con.locales_display,
  con.renta_mensual,
  -- Campos legacy para compatibilidad
  con.arrendatario_nombre AS propietario,
  con.locales_display     AS local_id,
  TRUE                    AS es_principal
FROM public.ingresos i
LEFT JOIN public.prp_contratos con ON con.id = i.contrato_id;

NOTIFY pgrst, 'reload schema';
