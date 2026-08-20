-- Función: renovar_contrato
-- Cierra el contrato anterior (estatus = RENOVADO) y crea uno nuevo.
-- Copia todos los campos del contrato original salvo los que el usuario modifica.
-- Columnas mapeadas a public.contratos (DDL real):
--   numero_contrato, arrendatario_id, inmueble_id, fecha_inicio, fecha_fin,
--   renta_mensual, deposito_garantia, dia_pago, penalizacion_pct,
--   incremento_anual_pct, estatus, notas

CREATE OR REPLACE FUNCTION public.renovar_contrato(
  p_contrato_id       uuid,
  p_folio             text,
  p_arrendatario_id   uuid,
  p_unidad_id         uuid,        -- ignorado (relación via contratos_locales)
  p_tipo_contrato     text,        -- ignorado (contratos no tiene tipo_contrato)
  p_fecha_inicio      date,
  p_fecha_fin         date        DEFAULT NULL,
  p_renta_mensual     numeric     DEFAULT 0,
  p_cuota_mant        numeric     DEFAULT 0,  -- ignorado (no existe en contratos)
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
  -- 1. Leer el contrato original
  SELECT * INTO v_original FROM public.contratos WHERE id = p_contrato_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato % no encontrado', p_contrato_id;
  END IF;

  -- 2. Marcar el contrato anterior como RENOVADO
  UPDATE public.contratos
  SET estatus    = 'RENOVADO',
      updated_at = now()
  WHERE id = p_contrato_id;

  -- 3. Crear el nuevo contrato con los datos actualizados
  INSERT INTO public.contratos (
    numero_contrato,
    arrendatario_id,
    inmueble_id,
    fecha_inicio,
    fecha_fin,
    renta_mensual,
    deposito_garantia,
    dia_pago,
    penalizacion_pct,
    incremento_anual_pct,
    notas,
    estatus,
    created_at,
    updated_at
  ) VALUES (
    p_folio,
    p_arrendatario_id,
    v_original.inmueble_id,
    p_fecha_inicio,
    p_fecha_fin,
    p_renta_mensual,
    CASE WHEN p_deposito_garantia > 0 THEN p_deposito_garantia ELSE v_original.deposito_garantia END,
    p_dia_cobro,
    p_penalizacion_mora,
    p_incremento_anual,
    COALESCE(p_notas, v_original.notas),
    'VIGENTE',
    now(),
    now()
  )
  RETURNING id INTO v_nuevo_id;

  -- 4. Copiar la relación de locales del contrato anterior al nuevo
  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_local)
  SELECT v_nuevo_id, local_id, p_renta_mensual
  FROM public.contratos_locales
  WHERE contrato_id = p_contrato_id;

  RETURN v_nuevo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.renovar_contrato(
  uuid, text, uuid, uuid, text, date, date,
  numeric, numeric, numeric, integer, numeric, numeric,
  text, text, text, text
) TO authenticated;
