-- ═══════════════════════════════════════════════════════════════════════
-- IRP — Portal Arrendatario: auth_user_id + RLS de solo-mis-datos
-- RANNIX Consulting · 2026-08-14
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Vincular arrendatario con usuario Supabase Auth ────────────────
ALTER TABLE public.arrendatarios
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_arr_auth_user ON public.arrendatarios (auth_user_id);

-- ── 2. RLS en arrendatarios ───────────────────────────────────────────
-- El administrador (rol autenticado con permisos amplios) puede ver todo.
-- El arrendatario solo puede ver su propio registro.
DROP POLICY IF EXISTS "portal_arrendatario_select" ON public.arrendatarios;
CREATE POLICY "portal_arrendatario_select"
  ON public.arrendatarios FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()        -- el propio arrendatario
    OR EXISTS (                      -- o un usuario admin (sin auth_user_id en arrendatarios)
      SELECT 1 FROM public.arrendatarios a2
      WHERE a2.auth_user_id = auth.uid()
    ) IS FALSE                       -- simplificado: admins no tienen fila en arrendatarios
  );

-- Política más simple: admin = usuario cuyo uid NO está en arrendatarios.auth_user_id
-- Arrendatario = usuario cuyo uid SÍ está en arrendatarios.auth_user_id
-- Usamos una función helper para claridad:

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.arrendatarios WHERE auth_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.mi_arrendatario_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.arrendatarios WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Reemplazar política con la función helper
DROP POLICY IF EXISTS "portal_arrendatario_select" ON public.arrendatarios;
CREATE POLICY "portal_arrendatario_select"
  ON public.arrendatarios FOR SELECT TO authenticated
  USING ( public.es_admin() OR auth_user_id = auth.uid() );

-- ── 3. RLS en contratos: arrendatario solo ve los suyos ──────────────
DROP POLICY IF EXISTS "portal_contratos_select" ON public.contratos;
CREATE POLICY "portal_contratos_select"
  ON public.contratos FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR arrendatario_id = public.mi_arrendatario_id()
  );

-- ── 4. RLS en cobros_programados ─────────────────────────────────────
-- cobros_programados tiene referencia_pago = id de contrato (UUID como texto)
-- La unión es: cobros → contratos → arrendatarios
DROP POLICY IF EXISTS "portal_cobros_select" ON public.cobros_programados;
CREATE POLICY "portal_cobros_select"
  ON public.cobros_programados FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id::TEXT = cobros_programados.referencia_pago
        AND c.arrendatario_id = public.mi_arrendatario_id()
    )
  );

-- ── 5. RLS en ingresos ────────────────────────────────────────────────
DROP POLICY IF EXISTS "portal_ingresos_select" ON public.ingresos;
CREATE POLICY "portal_ingresos_select"
  ON public.ingresos FOR SELECT TO authenticated
  USING (
    public.es_admin()
    OR EXISTS (
      SELECT 1 FROM public.cobros_programados cp
      JOIN public.contratos c ON c.id::TEXT = cp.referencia_pago
      WHERE cp.id = ingresos.cobro_id
        AND c.arrendatario_id = public.mi_arrendatario_id()
    )
  );

-- ── 6. Vista portal: mis_cobros ───────────────────────────────────────
-- Vista denormalizada para el portal del arrendatario.
-- RLS de cobros_programados + ingresos ya filtra por usuario.
CREATE OR REPLACE VIEW public.portal_mis_cobros AS
SELECT
  cp.id,
  cp.referencia_pago,
  cp.arrendatario_nombre,
  cp.tipo,
  cp.mes,
  cp.anio,
  cp.fecha_cobro,
  cp.monto_total,
  cp.monto_pagado,
  cp.estatus,
  cp.conciliado,
  cp.fecha_pago_real,
  -- Datos del contrato
  c.id              AS contrato_id,
  c.folio           AS contrato_folio,
  u.numero_local,
  u.tipo_unidad,
  i.nombre          AS inmueble_nombre,
  -- Agregados de ingresos (facturas)
  COUNT(ing.id)                           AS num_ingresos,
  COUNT(ing.factura_numero)               AS num_facturas,
  COUNT(ing.factura_pdf_url)              AS num_pdfs,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id',              ing.id,
      'fecha',           ing.fecha,
      'importe',         ing.importe,
      'tipo_concepto',   ing.tipo_concepto,
      'factura_numero',  ing.factura_numero,
      'factura_serie',   ing.factura_serie,
      'factura_pdf_url', ing.factura_pdf_url,
      'factura_xml_url', ing.factura_xml_url,
      'forma_pago',      ing.origen,
      'referencia',      ing.concepto_origen
    ) ORDER BY ing.fecha
  ) FILTER (WHERE ing.id IS NOT NULL) AS ingresos_json
FROM public.cobros_programados cp
LEFT JOIN public.contratos c   ON c.id::TEXT = cp.referencia_pago
LEFT JOIN public.unidades u    ON u.id = c.unidad_id
LEFT JOIN public.inmuebles i   ON i.id = u.inmueble_id
LEFT JOIN public.ingresos ing  ON ing.cobro_id = cp.id
GROUP BY cp.id, c.id, c.folio, u.numero_local, u.tipo_unidad, i.nombre
ORDER BY cp.anio DESC, cp.mes DESC, cp.tipo;

-- ── 7. RPC: crear_usuario_arrendatario ───────────────────────────────
-- Para uso ADMIN ONLY: crea la cuenta Auth y la vincula al arrendatario.
-- Se ejecuta desde el panel admin de IRP, nunca desde el portal.
-- NOTA: Para crear el auth.user se usa la API Admin de Supabase desde
--       una Netlify Function con SUPABASE_SERVICE_ROLE_KEY.
--       Este RPC solo actualiza el link una vez que el usuario ya existe.
CREATE OR REPLACE FUNCTION public.vincular_usuario_arrendatario(
  p_arrendatario_id UUID,
  p_auth_user_id    UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.arrendatarios
     SET auth_user_id = p_auth_user_id
   WHERE id = p_arrendatario_id;
END;
$$;
