-- Función: genera folios IWOL-LXX-YYYY en numero_contrato para contratos sin folio estándar
-- y normaliza estatus legacy (ACTIVO/TERMINADO → VIGENTE/VENCIDO)
CREATE OR REPLACE FUNCTION public.fn_generar_folios_iwol()
RETURNS TABLE(contrato_id UUID, folio_generado TEXT, estatus_nuevo TEXT)
LANGUAGE plpgsql AS $$
DECLARE
  v            RECORD;
  v_loc_str    TEXT;
  v_loc_code   TEXT;
  v_anio       TEXT;
  v_base       TEXT;
  v_folio      TEXT;
  v_cnt        INT;
  v_estatus    TEXT;
BEGIN
  FOR v IN
    SELECT id, locales_display, locales_referencia, fecha_inicio, estatus, numero_contrato
    FROM public.contratos
    WHERE numero_contrato IS NULL OR numero_contrato NOT LIKE 'IWOL-%'
    ORDER BY fecha_inicio NULLS LAST
  LOOP
    -- Extraer números de local y concatenar con pad de 2 dígitos
    SELECT string_agg(lpad(m[1], 2, '0'), '' ORDER BY m[1]::INT)
    INTO   v_loc_code
    FROM   regexp_matches(COALESCE(v.locales_display, v.locales_referencia, ''), '(\d+)', 'g') AS m;

    IF v_loc_code IS NULL OR v_loc_code = '' THEN
      v_loc_code := 'XX';
    END IF;

    v_anio := COALESCE(to_char(v.fecha_inicio, 'YYYY'), to_char(CURRENT_DATE, 'YYYY'));
    v_base := 'IWOL-L' || v_loc_code || '-' || v_anio;

    -- Garantizar unicidad
    SELECT COUNT(*) INTO v_cnt FROM public.contratos
    WHERE numero_contrato LIKE v_base || '%';
    IF v_cnt > 0 THEN
      v_folio := v_base || '-' || (v_cnt + 1)::TEXT;
    ELSE
      v_folio := v_base;
    END IF;

    -- Normalizar estatus legacy
    v_estatus := CASE
      WHEN v.estatus IN ('VIGENTE','VENCIDO','RENOVADO','RESCISION') THEN v.estatus
      WHEN v.estatus = 'TERMINADO' THEN 'VENCIDO'
      ELSE 'VIGENTE'
    END;

    UPDATE public.contratos
       SET numero_contrato = v_folio,
           estatus         = v_estatus
     WHERE id = v.id;

    contrato_id      := v.id;
    folio_generado   := v_folio;
    estatus_nuevo    := v_estatus;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Ejecutar inmediatamente
SELECT * FROM public.fn_generar_folios_iwol();
