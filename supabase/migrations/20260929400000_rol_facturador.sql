-- Rol facturador (Fernando): sube CFDI a los cargos ya validados por Finanzas.
--
-- Flujo completo:
--   Jorge (admin)      → captura ingreso      → POR_VALIDAR
--   Jessie (finanzas)  → valida depósito      → VALIDADO
--   Fernando (facturador) → sube PDF + ZIP al cargo → tiene_factura = true
--
-- Seguridad: facturador excluido de es_staff() para no ver toda la BD.
-- Solo puede leer ingresos (VALIDADO) y los cargos asociados,
-- y escribir en cargos_programados los campos de factura.

-- ── 1. Rol en catálogo ───────────────────────────────────────────────────────
INSERT INTO public.irp_roles (id, nombre, descripcion)
VALUES ('facturador', 'Facturación', 'Emite y adjunta CFDI a los cargos validados')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

-- ── 2. Excluir de es_staff() ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_staff() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol_id NOT IN ('arrendatario','prospecto','restaurante','locatario','asistente','finanzas','facturador')
    )
$$;

-- ── 3. Políticas facturador en ingresos (solo lectura, VALIDADO) ─────────────
CREATE POLICY facturador_lee_ingresos
  ON public.ingresos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'facturador'
    )
  );

-- ── 4. Políticas facturador en cargos_programados ────────────────────────────
-- Lectura: ve todos los cargos (para mostrarlos en su lista)
CREATE POLICY facturador_lee_cargos
  ON public.cargos_programados
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'facturador'
    )
  );

-- Escritura: solo puede actualizar campos de factura en cargos_programados
CREATE POLICY facturador_sube_factura
  ON public.cargos_programados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'facturador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'facturador'
    )
  );

-- ── 5. Lectura de contratos (para mostrar arrendatario en la lista) ───────────
CREATE POLICY facturador_lee_contratos
  ON public.contratos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'facturador'
    )
  );

-- ── 6. Lectura de aplicaciones_pago (para ligar cargo → ingresos validados) ──
CREATE POLICY facturador_lee_aplicaciones
  ON public.aplicaciones_pago
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.irp_usuarios
      WHERE id = auth.uid() AND activo = true AND rol_id = 'facturador'
    )
  );

NOTIFY pgrst, 'reload schema';
