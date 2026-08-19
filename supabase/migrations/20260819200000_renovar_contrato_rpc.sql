-- RPC pública para renovar contrato (evita exponer schema prp en la API)
CREATE OR REPLACE FUNCTION public.renovar_contrato(
  p_contrato_id       UUID,
  p_folio             TEXT,
  p_arrendatario_id   UUID,
  p_unidad_id         UUID,
  p_tipo_contrato     TEXT,
  p_fecha_inicio      DATE,
  p_fecha_fin         DATE DEFAULT NULL,
  p_renta_mensual     NUMERIC DEFAULT 0,
  p_cuota_mant        NUMERIC DEFAULT 0,
  p_deposito_garantia NUMERIC DEFAULT 0,
  p_dia_cobro         INT    DEFAULT 1,
  p_penalizacion_mora NUMERIC DEFAULT 5,
  p_incremento_anual  NUMERIC DEFAULT 0,
  p_fiador_nombre     TEXT   DEFAULT NULL,
  p_fiador_rfc        TEXT   DEFAULT NULL,
  p_fiador_domicilio  TEXT   DEFAULT NULL,
  p_notas             TEXT   DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Insertar nuevo contrato
  INSERT INTO prp.contratos_arrendamiento (
    folio, arrendatario_id, unidad_id, tipo_contrato,
    fecha_inicio, fecha_fin, renta_mensual, cuota_mant,
    deposito_garantia, dia_cobro, penalizacion_mora, incremento_anual,
    fiador_nombre, fiador_rfc, fiador_domicilio, notas, estado_id
  ) VALUES (
    p_folio, p_arrendatario_id, p_unidad_id, p_tipo_contrato,
    p_fecha_inicio, p_fecha_fin, p_renta_mensual, p_cuota_mant,
    p_deposito_garantia, p_dia_cobro, p_penalizacion_mora, p_incremento_anual,
    p_fiador_nombre, p_fiador_rfc, p_fiador_domicilio, p_notas, 'VIGENTE'
  )
  RETURNING id INTO v_new_id;

  -- Marcar contrato anterior como RENOVADO
  UPDATE prp.contratos_arrendamiento
     SET estado_id = 'RENOVADO'
   WHERE id = p_contrato_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.renovar_contrato TO authenticated;
