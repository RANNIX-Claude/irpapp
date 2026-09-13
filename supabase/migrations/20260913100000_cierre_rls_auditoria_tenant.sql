-- 20260913100000_cierre_rls_auditoria_tenant.sql
-- Cierra los hallazgos de la auditoría de aislamiento (2026-09-12):
--   C1  vistas prp_* con security_invoker + anon sin grants en public
--   C2  RLS en las 13 tablas que no lo tenían
--   C3  políticas USING(true) → es_staff(), con políticas acotadas para locatario y restaurante
--   A1  es_staff() excluye a 'locatario'
--   A2  funciones SECURITY DEFINER: sin EXECUTE para anon y con validación de rol en el cuerpo
--   A3  storage: sin lectura pública de expedientes, sin insert anon amplio, contratos-docs privado
--   M1  comprobantes_pago: política de staff con los rol_id reales
-- Todo en una transacción. Reversible: las políticas anteriores eran ALL/true para authenticated.

BEGIN;

-- ─── A1. es_staff(): locatario NO es staff ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.es_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT rol_id NOT IN ('arrendatario','prospecto','restaurante','locatario')
       FROM public.irp_usuarios WHERE id = auth.uid()),
    false)
$$;
REVOKE EXECUTE ON FUNCTION public.es_staff() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.es_staff() TO authenticated, service_role;

-- Helpers para el locatario: su contrato y su arrendatario (por irp_usuarios.contrato_id)
CREATE OR REPLACE FUNCTION public.mi_contrato_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT contrato_id FROM public.irp_usuarios WHERE id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.mi_arrendatario_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.arrendatario_id FROM public.contratos c
   WHERE c.id = (SELECT contrato_id FROM public.irp_usuarios WHERE id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.mi_contrato_id(), public.mi_arrendatario_id() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.mi_contrato_id(), public.mi_arrendatario_id() TO authenticated, service_role;

-- ─── C3. Reemplazar toda política abierta (true) de authenticated por staff_all ──
DO $$
DECLARE p record; t record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
     WHERE schemaname IN ('public','prp')
       AND roles = '{authenticated}'
       AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;

  -- staff_all en TODA tabla de negocio de public y prp (incluye las 13 que no tenían RLS)
  FOR t IN
    SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname IN ('public','prp')
       AND c.relname NOT IN ('irp_usuarios')            -- ya tiene sus políticas por usuario/admin
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.nspname, t.relname);
    EXECUTE format('DROP POLICY IF EXISTS staff_all ON %I.%I', t.nspname, t.relname);
    EXECUTE format('CREATE POLICY staff_all ON %I.%I FOR ALL TO authenticated USING (public.es_staff()) WITH CHECK (public.es_staff())', t.nspname, t.relname);
  END LOOP;
END $$;

-- Catálogos que cualquier usuario autenticado puede LEER (no sensibles; los necesita el perfil / la vista de contrato)
CREATE POLICY auth_lee ON public.irp_roles      FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_lee ON public.cat_parametros FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_lee ON public.cat_locales    FOR SELECT TO authenticated USING (true);

-- Locatario: solo SU contrato (ExpedienteContrato.jsx: prp_contratos, prp_cartera, documentos, arrendatarios, ingresos)
CREATE POLICY locatario_lee ON public.contratos          FOR SELECT TO authenticated USING (id = public.mi_contrato_id());
CREATE POLICY locatario_lee ON public.contratos_locales  FOR SELECT TO authenticated USING (contrato_id = public.mi_contrato_id());
CREATE POLICY locatario_lee ON public.arrendatarios      FOR SELECT TO authenticated USING (id = public.mi_arrendatario_id());
CREATE POLICY locatario_lee ON public.cargos_programados FOR SELECT TO authenticated USING (contrato_id = public.mi_contrato_id());
CREATE POLICY locatario_lee ON public.aplicaciones_pago  FOR SELECT TO authenticated
  USING (cargo_id IN (SELECT id FROM public.cargos_programados WHERE contrato_id = public.mi_contrato_id()));
CREATE POLICY locatario_lee ON public.documentos         FOR SELECT TO authenticated
  USING (entidad_tipo = 'ARRENDATARIO' AND entidad_id = public.mi_arrendatario_id());
CREATE POLICY locatario_lee ON public.ingresos           FOR SELECT TO authenticated USING (contrato_id = public.mi_contrato_id());
CREATE POLICY locatario_sube_comprobante ON public.ingresos FOR INSERT TO authenticated
  WITH CHECK (contrato_id = public.mi_contrato_id() AND estatus_validacion = 'POR_VALIDAR');

-- Restaurante: solo sus dos tablas
CREATE POLICY restaurante_all ON public.restaurante_gastos        FOR ALL TO authenticated
  USING (public.mi_rol() = 'restaurante') WITH CHECK (public.mi_rol() = 'restaurante');
CREATE POLICY restaurante_all ON public.restaurante_gasto_detalle FOR ALL TO authenticated
  USING (public.mi_rol() = 'restaurante') WITH CHECK (public.mi_rol() = 'restaurante');

-- ─── M1. comprobantes_pago: la rama de staff comparaba con roles inexistentes ──
DROP POLICY IF EXISTS comp_rls ON public.comprobantes_pago;
CREATE POLICY comp_arrendatario ON public.comprobantes_pago FOR ALL TO authenticated
  USING (arrendatario_id = public._comp_mi_arr_id()) WITH CHECK (arrendatario_id = public._comp_mi_arr_id());
-- (staff_all ya creada arriba por el loop)

-- ─── A2. Funciones SECURITY DEFINER de escritura: validación de rol en el cuerpo ──
-- autorizar_periodo_nomina
CREATE OR REPLACE FUNCTION public.autorizar_periodo_nomina(p_periodo_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.nomina_periodos SET
    estado         = 'AUTORIZADA',
    autorizado_por = auth.uid(),
    autorizado_at  = NOW(),
    updated_at     = NOW()
  WHERE id = p_periodo_id AND estado = 'CALCULADA';
  RETURN FOUND;
END;
$function$;

-- calcular_nomina_periodo
CREATE OR REPLACE FUNCTION public.calcular_nomina_periodo(p_periodo_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_periodo      public.nomina_periodos%ROWTYPE;
  v_emp          RECORD;
  v_nom_id       UUID;
  v_dias         DECIMAL;
  v_faltas       DECIMAL;
  v_sal_periodo  DECIMAL;
  v_base_mensual DECIMAL;
  v_isr_mensual  DECIMAL;
  v_subsidio_m   DECIMAL;
  v_isr_periodo  DECIMAL;
  v_subsidio_p   DECIMAL;
  v_isr_retener  DECIMAL;
  v_imss         DECIMAL;
  v_neto         DECIMAL;
  v_cuota_fija   DECIMAL;
  v_tasa_exc     DECIMAL;
  v_lim_inf      DECIMAL;
  v_divisor      DECIMAL;
  v_count        INTEGER := 0;
  v_tot_perc     DECIMAL := 0;
  v_tot_ded      DECIMAL := 0;
  v_tot_neto     DECIMAL := 0;
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_periodo FROM public.nomina_periodos WHERE id = p_periodo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Período % no encontrado', p_periodo_id; END IF;
  IF v_periodo.estado NOT IN ('BORRADOR','CALCULADA') THEN
    RAISE EXCEPTION 'Solo BORRADOR o CALCULADA puede recalcularse';
  END IF;

  -- Días naturales del período (inclusivo)
  v_dias := (v_periodo.fecha_fin - v_periodo.fecha_inicio) + 1;

  -- Divisor para convertir ISR mensual → período
  v_divisor := CASE v_periodo.periodicidad
    WHEN 'SEMANAL'   THEN 4.333
    WHEN 'QUINCENAL' THEN 2.0
    WHEN 'MENSUAL'   THEN 1.0
    ELSE 2.0
  END;

  -- Limpiar cálculos anteriores (solo no timbrados)
  DELETE FROM public.nomina_percepciones np
    USING public.nomina_empleado ne
    WHERE np.nomina_emp_id = ne.id
      AND ne.periodo_id = p_periodo_id
      AND ne.estatus_cfdi = 'PENDIENTE';
  DELETE FROM public.nomina_deducciones nd
    USING public.nomina_empleado ne
    WHERE nd.nomina_emp_id = ne.id
      AND ne.periodo_id = p_periodo_id
      AND ne.estatus_cfdi = 'PENDIENTE';
  DELETE FROM public.nomina_otros_pagos no2
    USING public.nomina_empleado ne
    WHERE no2.nomina_emp_id = ne.id
      AND ne.periodo_id = p_periodo_id
      AND ne.estatus_cfdi = 'PENDIENTE';
  DELETE FROM public.nomina_empleado
    WHERE periodo_id = p_periodo_id AND estatus_cfdi = 'PENDIENTE';

  -- ── Iterar TODOS los empleados activos con salario ──────────────────────
  -- Sin filtro de periodicidad: el período define el rango; todos participan.
  FOR v_emp IN
    SELECT
      e.id,
      e.nombre || ' ' || e.apellido_pat AS nombre_completo,
      e.rfc,
      e.nss,
      -- Salario: preferir el del contrato vigente, si no el del empleado
      COALESCE(
        (SELECT rc.salario_diario FROM public.rh_contratos rc
         WHERE rc.empleado_id = e.id AND rc.activo = TRUE
         ORDER BY rc.created_at DESC LIMIT 1),
        e.salario_diario, 0
      ) AS salario_diario,
      (SELECT rc.id FROM public.rh_contratos rc
       WHERE rc.empleado_id = e.id AND rc.activo = TRUE
       ORDER BY rc.created_at DESC LIMIT 1
      ) AS contrato_id
    FROM public.rh_empleados e
    WHERE e.estado_id = 'ACTIVO'
  LOOP
    -- Saltar empleados sin salario configurado
    IF COALESCE(v_emp.salario_diario, 0) <= 0 THEN CONTINUE; END IF;

    -- ── Faltas del período ───────────────────────────────────────────────
    SELECT COALESCE(COUNT(*), 0) INTO v_faltas
    FROM public.rh_asistencia
    WHERE empleado_id = v_emp.id
      AND fecha BETWEEN v_periodo.fecha_inicio AND v_periodo.fecha_fin
      AND estado = 'FALTA';

    -- ── Salario del período ──────────────────────────────────────────────
    v_sal_periodo := ROUND(v_emp.salario_diario * (v_dias - v_faltas), 2);

    -- ── ISR ─────────────────────────────────────────────────────────────
    -- Proyectar al mes para buscar en tarifa
    v_base_mensual := ROUND(v_sal_periodo * v_divisor, 2);

    SELECT cuota_fija, tasa_excedente, limite_inferior
    INTO v_cuota_fija, v_tasa_exc, v_lim_inf
    FROM public.sat_tarifa_isr
    WHERE anio = 2026
      AND v_base_mensual >= limite_inferior
      AND (limite_superior IS NULL OR v_base_mensual <= limite_superior)
    ORDER BY limite_inferior DESC LIMIT 1;

    v_isr_mensual := ROUND(
      COALESCE(v_cuota_fija, 0)
      + ((v_base_mensual - COALESCE(v_lim_inf, 0)) * COALESCE(v_tasa_exc, 0)),
      2
    );

    -- ── Subsidio al empleo ───────────────────────────────────────────────
    SELECT subsidio_mensual INTO v_subsidio_m
    FROM public.sat_subsidio_empleo
    WHERE anio = 2026
      AND v_base_mensual >= limite_inferior
      AND (limite_superior IS NULL OR v_base_mensual <= limite_superior)
    ORDER BY limite_inferior DESC LIMIT 1;
    v_subsidio_m := COALESCE(v_subsidio_m, 0);

    -- Convertir ISR y subsidio al período
    v_isr_periodo  := ROUND(v_isr_mensual / v_divisor, 2);
    v_subsidio_p   := ROUND(v_subsidio_m  / v_divisor, 2);
    v_isr_retener  := GREATEST(0, v_isr_periodo - v_subsidio_p);

    -- ── IMSS obrero (porcentaje simplificado 2026 ~3.675%) ───────────────
    v_imss := ROUND(v_emp.salario_diario * (v_dias - v_faltas) * 0.03675, 2);

    -- ── Neto ─────────────────────────────────────────────────────────────
    v_neto := ROUND(v_sal_periodo - v_isr_retener - v_imss, 2);

    -- Insertar en nomina_empleado
    INSERT INTO public.nomina_empleado (
      periodo_id, empleado_id, contrato_id,
      dias_periodo, dias_trabajados, dias_falta,
      salario_diario, salario_periodo,
      total_percepciones, total_deducciones,
      isr_base_mensual, isr_periodo, subsidio_empleo, isr_a_retener,
      imss_obrero, neto_pagar
    ) VALUES (
      p_periodo_id, v_emp.id, v_emp.contrato_id,
      v_dias, v_dias - v_faltas, v_faltas,
      v_emp.salario_diario, v_sal_periodo,
      v_sal_periodo,
      v_isr_retener + v_imss,
      v_base_mensual, v_isr_periodo, v_subsidio_p, v_isr_retener,
      v_imss, v_neto
    )
    RETURNING id INTO v_nom_id;

    -- Percepción: salario ordinario
    INSERT INTO public.nomina_percepciones
      (nomina_emp_id, tipo_percepcion, concepto, importe_gravado, dias_pagados)
    VALUES
      (v_nom_id, '001', 'Salario ordinario', v_sal_periodo, v_dias - v_faltas);

    -- Deducción: IMSS obrero
    IF v_imss > 0 THEN
      INSERT INTO public.nomina_deducciones
        (nomina_emp_id, tipo_deduccion, concepto, importe)
      VALUES (v_nom_id, '001', 'Cuotas IMSS obrero', v_imss);
    END IF;

    -- Deducción: ISR
    IF v_isr_retener > 0 THEN
      INSERT INTO public.nomina_deducciones
        (nomina_emp_id, tipo_deduccion, concepto, importe)
      VALUES (v_nom_id, '002', 'ISR retenido', v_isr_retener);
    END IF;

    -- Deducción: faltas
    IF v_faltas > 0 THEN
      INSERT INTO public.nomina_deducciones
        (nomina_emp_id, tipo_deduccion, concepto, importe)
      VALUES (
        v_nom_id, '006',
        'Descuento por ' || v_faltas::TEXT || ' falta(s)',
        ROUND(v_emp.salario_diario * v_faltas, 2)
      );
    END IF;

    -- Subsidio al empleo (otro pago)
    IF v_subsidio_p > 0 THEN
      INSERT INTO public.nomina_otros_pagos
        (nomina_emp_id, tipo_otro_pago, concepto, importe)
      VALUES (v_nom_id, '002', 'Subsidio para el empleo', v_subsidio_p);
    END IF;

    v_count    := v_count + 1;
    v_tot_perc := v_tot_perc + v_sal_periodo;
    v_tot_ded  := v_tot_ded  + v_isr_retener + v_imss;
    v_tot_neto := v_tot_neto + v_neto;
  END LOOP;

  -- Actualizar totales del período
  UPDATE public.nomina_periodos SET
    estado             = 'CALCULADA',
    total_empleados    = v_count,
    total_percepciones = ROUND(v_tot_perc, 2),
    total_deducciones  = ROUND(v_tot_ded,  2),
    total_neto         = ROUND(v_tot_neto, 2),
    updated_at         = NOW()
  WHERE id = p_periodo_id;

  RETURN jsonb_build_object(
    'ok',                TRUE,
    'empleados',         v_count,
    'total_percepciones', ROUND(v_tot_perc, 2),
    'total_deducciones',  ROUND(v_tot_ded,  2),
    'total_neto',         ROUND(v_tot_neto, 2)
  );
END;
$function$;

-- confirmar_cobro
CREATE OR REPLACE FUNCTION public.confirmar_cobro(p_cobro_id uuid, p_fecha_pago_real date, p_monto_pagado numeric, p_forma_pago text, p_numero_operacion text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE prp.cobros_programados
  SET
    estatus               = 'PAGADO',
    conciliado            = TRUE,
    fecha_pago_real       = p_fecha_pago_real,
    monto_pagado          = p_monto_pagado,
    forma_pago            = p_forma_pago,
    numero_operacion_banco = p_numero_operacion,
    updated_at            = NOW()
  WHERE id = p_cobro_id;
END;
$function$;

-- confirmar_cobros_batch
CREATE OR REPLACE FUNCTION public.confirmar_cobros_batch(p_matches jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item   JSONB;
  v_ok     INT := 0;
  v_fail   INT := 0;
  v_errors TEXT[] := '{}';
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_matches)
  LOOP
    BEGIN
      UPDATE prp.cobros_programados
      SET
        estatus               = 'PAGADO',
        conciliado            = TRUE,
        fecha_pago_real       = (v_item->>'fecha')::DATE,
        monto_pagado          = (v_item->>'monto')::NUMERIC,
        forma_pago            = 'TRANSFERENCIA',
        numero_operacion_banco = LEFT(v_item->>'descripcion', 120),
        updated_at            = NOW()
      WHERE id = (v_item->>'cobro_id')::UUID
        AND estatus = 'PENDIENTE';

      IF FOUND THEN
        v_ok := v_ok + 1;
      ELSE
        -- cobro ya pagado o no encontrado: igualmente cuenta como ok
        v_ok := v_ok + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      v_errors := array_append(v_errors, SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', v_ok, 'fail', v_fail, 'errors', to_jsonb(v_errors));
END;
$function$;

-- crear_empleado
CREATE OR REPLACE FUNCTION public.crear_empleado(p_nombre text, p_apellido_pat text, p_apellido_mat text DEFAULT ''::text, p_sexo character DEFAULT 'M'::bpchar, p_rfc text DEFAULT NULL::text, p_curp text DEFAULT NULL::text, p_nss text DEFAULT NULL::text, p_fecha_nacimiento date DEFAULT NULL::date, p_fecha_ingreso date DEFAULT CURRENT_DATE, p_puesto text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_departamento text DEFAULT NULL::text, p_salario_diario numeric DEFAULT NULL::numeric, p_email text DEFAULT NULL::text, p_celular text DEFAULT NULL::text, p_tipo_contrato text DEFAULT 'TEMPORAL_3SEM'::text, p_fecha_fin_contrato date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_emp_id UUID;
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.rh_empleados
    (nombre, apellido_pat, apellido_mat, sexo, rfc, curp, nss,
     fecha_nacimiento, fecha_ingreso, puesto, area, departamento,
     salario_diario, email, celular)
  VALUES
    (p_nombre, p_apellido_pat, NULLIF(p_apellido_mat,''), p_sexo,
     NULLIF(p_rfc,''), NULLIF(p_curp,''), NULLIF(p_nss,''),
     p_fecha_nacimiento, p_fecha_ingreso,
     NULLIF(p_puesto,''), NULLIF(p_area,''), NULLIF(p_departamento,''),
     p_salario_diario, NULLIF(p_email,''), NULLIF(p_celular,''))
  RETURNING id INTO v_emp_id;

  IF p_tipo_contrato IS NOT NULL THEN
    INSERT INTO public.rh_contratos (empleado_id, tipo_contrato, fecha_inicio, fecha_fin, salario_diario, activo)
    VALUES (v_emp_id, p_tipo_contrato, p_fecha_ingreso, p_fecha_fin_contrato, p_salario_diario, TRUE);
  END IF;

  RETURN v_emp_id;
END;$function$;

-- crear_empleado
CREATE OR REPLACE FUNCTION public.crear_empleado(p_nombre text, p_apellido_pat text, p_apellido_mat text DEFAULT NULL::text, p_sexo text DEFAULT 'M'::text, p_rfc text DEFAULT NULL::text, p_curp text DEFAULT NULL::text, p_nss text DEFAULT NULL::text, p_fecha_nacimiento date DEFAULT NULL::date, p_fecha_ingreso date DEFAULT CURRENT_DATE, p_puesto text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_departamento text DEFAULT NULL::text, p_salario_diario numeric DEFAULT NULL::numeric, p_email text DEFAULT NULL::text, p_celular text DEFAULT NULL::text, p_tipo_contrato text DEFAULT 'TEMPORAL_3SEM'::text, p_fecha_fin_contrato date DEFAULT NULL::date, p_horario_trabajo text DEFAULT NULL::text, p_dia_descanso text DEFAULT NULL::text, p_forma_pago text DEFAULT 'TRANSFERENCIA'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
      DECLARE
        v_emp_id UUID;
      BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
        INSERT INTO public.rh_empleados (
          nombre, apellido_pat, apellido_mat, sexo,
          rfc, curp, nss, fecha_nacimiento,
          fecha_ingreso, puesto, area, departamento,
          salario_diario, email, celular, estado_id,
          horario_trabajo, dia_descanso, forma_pago
        ) VALUES (
          p_nombre, p_apellido_pat, NULLIF(p_apellido_mat, ''), p_sexo,
          NULLIF(p_rfc,''), NULLIF(p_curp,''), NULLIF(p_nss,''), p_fecha_nacimiento,
          COALESCE(p_fecha_ingreso, CURRENT_DATE),
          NULLIF(p_puesto,''), NULLIF(p_area,''), NULLIF(p_departamento,''),
          p_salario_diario, NULLIF(p_email,''), NULLIF(p_celular,''), 'ACTIVO',
          NULLIF(p_horario_trabajo,''), NULLIF(p_dia_descanso,''),
          COALESCE(p_forma_pago, 'TRANSFERENCIA')
        ) RETURNING id INTO v_emp_id;

        IF p_tipo_contrato IS NOT NULL THEN
          INSERT INTO public.rh_contratos (
            empleado_id, tipo_contrato, fecha_inicio, fecha_fin,
            salario_diario, activo
          ) VALUES (
            v_emp_id, p_tipo_contrato,
            COALESCE(p_fecha_ingreso, CURRENT_DATE), p_fecha_fin_contrato,
            p_salario_diario, TRUE
          );
        END IF;

        RETURN v_emp_id;
      END;
      $function$;

-- crear_periodo_nomina
CREATE OR REPLACE FUNCTION public.crear_periodo_nomina(p_periodicidad text, p_fecha_inicio date, p_fecha_fin date, p_fecha_pago date, p_tipo_nomina text DEFAULT 'O'::text, p_descripcion text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id   UUID;
  v_folio TEXT;
  v_seq  INTEGER;
  v_prefix TEXT;
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  v_prefix := CASE p_periodicidad
    WHEN 'SEMANAL'   THEN 'S'
    WHEN 'MENSUAL'   THEN 'M'
    ELSE 'Q'
  END;

  SELECT COALESCE(MAX(
    CAST(SUBSTR(folio, LENGTH(folio), 1) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.nomina_periodos
  WHERE periodicidad = p_periodicidad
    AND EXTRACT(YEAR  FROM fecha_inicio) = EXTRACT(YEAR  FROM p_fecha_inicio)
    AND EXTRACT(MONTH FROM fecha_inicio) = EXTRACT(MONTH FROM p_fecha_inicio);

  v_folio := 'NOM-' || TO_CHAR(p_fecha_inicio, 'YYYY-MM') || '-' || v_prefix || v_seq;

  INSERT INTO public.nomina_periodos (
    folio, periodicidad, fecha_inicio, fecha_fin, fecha_pago,
    tipo_nomina, descripcion, created_by
  ) VALUES (
    v_folio, p_periodicidad, p_fecha_inicio, p_fecha_fin, p_fecha_pago,
    p_tipo_nomina, p_descripcion, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- desmarcar_cobros
CREATE OR REPLACE FUNCTION public.desmarcar_cobros(p_cobro_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_count INT;
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE prp.cobros_programados
  SET
    estatus               = 'PENDIENTE',
    conciliado            = FALSE,
    fecha_pago_real       = NULL,
    monto_pagado          = NULL,
    forma_pago            = NULL,
    numero_operacion_banco = NULL,
    updated_at            = NOW()
  WHERE id = ANY(p_cobro_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- marcar_cfdi_nomina_timbrado
CREATE OR REPLACE FUNCTION public.marcar_cfdi_nomina_timbrado(p_nomina_emp_id uuid, p_uuid text, p_xml text, p_pdf_b64 text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_periodo_id UUID;
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  UPDATE public.nomina_empleado SET
    uuid_cfdi      = p_uuid,
    xml_cfdi       = p_xml,
    pdf_base64     = p_pdf_b64,
    fecha_timbrado = CASE WHEN p_error IS NULL THEN NOW() ELSE NULL END,
    estatus_cfdi   = CASE WHEN p_error IS NULL THEN 'TIMBRADO' ELSE 'ERROR' END,
    error_timbrado = p_error,
    updated_at     = NOW()
  WHERE id = p_nomina_emp_id;

  SELECT periodo_id INTO v_periodo_id FROM public.nomina_empleado WHERE id = p_nomina_emp_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.nomina_empleado
    WHERE periodo_id = v_periodo_id AND estatus_cfdi = 'PENDIENTE'
  ) THEN
    UPDATE public.nomina_periodos SET estado = 'TIMBRADA', updated_at = NOW()
    WHERE id = v_periodo_id AND estado = 'AUTORIZADA';
  END IF;

  RETURN TRUE;
END;
$function$;

-- renovar_contrato
CREATE OR REPLACE FUNCTION public.renovar_contrato(p_contrato_id uuid, p_folio text, p_arrendatario_id uuid, p_unidad_id uuid, p_tipo_contrato text, p_fecha_inicio date, p_fecha_fin date DEFAULT NULL::date, p_renta_mensual numeric DEFAULT 0, p_cuota_mant numeric DEFAULT 0, p_deposito_garantia numeric DEFAULT 0, p_dia_cobro integer DEFAULT 1, p_penalizacion_mora numeric DEFAULT 5, p_incremento_anual numeric DEFAULT 0, p_fiador_nombre text DEFAULT NULL::text, p_fiador_rfc text DEFAULT NULL::text, p_fiador_domicilio text DEFAULT NULL::text, p_notas text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_nuevo_id uuid;
  v_original record;
BEGIN
  IF NOT public.es_staff() THEN RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_original FROM public.contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % no encontrado', p_contrato_id;
  END IF;

  UPDATE public.contratos
  SET estatus = 'RENOVADO', updated_at = now()
  WHERE id = p_contrato_id;

  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    fecha_inicio, fecha_fin,
    renta_mensual, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_rfc, fiador_domicilio,
    notas, estatus, estatus_proceso,
    contrato_anterior_id, created_at, updated_at
  ) VALUES (
    p_folio, p_arrendatario_id,
    p_fecha_inicio, p_fecha_fin,
    p_renta_mensual,
    CASE WHEN p_deposito_garantia > 0 THEN p_deposito_garantia ELSE v_original.deposito_garantia END,
    p_dia_cobro, p_penalizacion_mora, p_incremento_anual,
    NULLIF(p_fiador_nombre, ''),
    NULLIF(p_fiador_rfc, ''),
    NULLIF(p_fiador_domicilio, ''),
    COALESCE(NULLIF(p_notas, ''), v_original.notas),
    'VIGENTE', 'EN_RENOVACION',
    p_contrato_id,
    now(), now()
  )
  RETURNING id INTO v_nuevo_id;

  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  SELECT v_nuevo_id, local_id, p_renta_mensual
  FROM public.contratos_locales
  WHERE contrato_id = p_contrato_id;

  UPDATE public.cat_locales
  SET contrato_activo_id = v_nuevo_id, estatus = 'OCUPADO'
  WHERE id_local IN (
    SELECT local_id FROM public.contratos_locales WHERE contrato_id = v_nuevo_id
  );

  RETURN v_nuevo_id;
END;
$function$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ─── C1. Vistas heredan RLS del que consulta ──────────────────────────────
DO $$ DECLARE v record; BEGIN
  FOR v IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'v'
  LOOP EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname); END LOOP;
END $$;

-- Con security_invoker, quien consulta necesita privilegios sobre las tablas prp.* que hay detrás de 19 vistas
GRANT USAGE ON SCHEMA prp TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA prp TO authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA prp TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA prp GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA prp GRANT ALL    ON TABLES TO service_role;

-- anon no lee ni escribe nada del esquema public. Excepción: el portal anónimo de prospectos
-- (PortalProspecto.jsx) hace UPDATE sobre estas dos tablas; se conserva el grant, RLS sigue decidiendo.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
GRANT SELECT, UPDATE ON public.prospecto_documentos, public.prospecto_personas TO anon;

-- ─── A3. Storage ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public_read_expedientes"  ON storage.objects;   -- expedientes-docs es privado; se lee con urlFirmada()
DROP POLICY IF EXISTS "Anon sube prospecto-docs" ON storage.objects;   -- queda anon_insert_prospecto_docs, acotada a prospectos/
UPDATE storage.buckets SET public = false WHERE id = 'contratos-docs'; -- sin uso en el código; reversible

NOTIFY pgrst, 'reload schema';
COMMIT;
