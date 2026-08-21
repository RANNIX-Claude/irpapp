-- Fix renovar_contrato: quitar inmueble_id, agregar fiador + contrato_anterior_id

CREATE OR REPLACE FUNCTION public.renovar_contrato(
  p_contrato_id       uuid,
  p_folio             text,
  p_arrendatario_id   uuid,
  p_unidad_id         uuid,
  p_tipo_contrato     text,
  p_fecha_inicio      date,
  p_fecha_fin         date        DEFAULT NULL,
  p_renta_mensual     numeric     DEFAULT 0,
  p_cuota_mant        numeric     DEFAULT 0,
  p_deposito_garantia numeric     DEFAULT 0,
  p_dia_cobro         integer     DEFAULT 1,
  p_penalizacion_mora numeric     DEFAULT 5,
  p_incremento_anual  numeric     DEFAULT 0,
  p_fiador_nombre     text        DEFAULT NULL,
  p_fiador_rfc        text        DEFAULT NULL,
  p_fiador_domicilio  text        DEFAULT NULL,
  p_notas             text        DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nuevo_id uuid;
  v_original record;
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION public.renovar_contrato(
  uuid, text, uuid, uuid, text, date, date,
  numeric, numeric, numeric, integer, numeric, numeric,
  text, text, text, text
) TO authenticated;
