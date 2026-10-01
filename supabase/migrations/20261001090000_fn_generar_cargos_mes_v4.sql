-- fn_generar_cargos_mes v4: solo contratos con estatus_proceso = 'EN_EJECUCION'.
-- Regla de negocio: EN_RENOVACION no genera cargo (está en negociación de nuevos términos).
-- Cubre tanto contratos VIGENTES como VENCIDOS que siguen en ejecución activa.

CREATE OR REPLACE FUNCTION public.fn_generar_cargos_mes(
  p_mes  INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT,
  p_anio INT DEFAULT EXTRACT(YEAR  FROM CURRENT_DATE)::INT
)
RETURNS TABLE(cargos_creados INT, contratos_procesados INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_primer_dia DATE;
  v_con        RECORD;
  v_venc       DATE;
  v_cnt        INT := 0;
BEGIN
  v_primer_dia := make_date(p_anio, p_mes, 1);

  FOR v_con IN
    SELECT c.id, c.numero_contrato, c.locales_display, c.renta_mensual, c.dia_pago
    FROM public.contratos c
    WHERE c.fecha_inicio <= v_primer_dia
      AND c.renta_mensual IS NOT NULL AND c.renta_mensual > 0
      -- Solo contratos activamente en ejecución: excluye renovaciones en negociación
      AND c.estatus_proceso = 'EN_EJECUCION'
      AND c.estatus NOT IN ('RESCISION', 'CANCELADO', 'RENOVADO', 'TERMINADO')
      AND NOT EXISTS (
        SELECT 1 FROM public.cargos_programados cp
        WHERE cp.contrato_id = c.id
          AND cp.periodo_mes = p_mes AND cp.periodo_anio = p_anio
          AND cp.concepto = 'RENTA'
      )
  LOOP
    v_venc := make_date(p_anio, p_mes, LEAST(COALESCE(v_con.dia_pago::INT, 5), 28));
    INSERT INTO public.cargos_programados (
      contrato_id, concepto, descripcion, periodo_mes, periodo_anio,
      importe, fecha_vencimiento, estado, generado_auto
    ) VALUES (
      v_con.id, 'RENTA',
      'Renta ' || TO_CHAR(v_primer_dia, 'TMMonth YYYY') ||
        ' — ' || COALESCE(v_con.locales_display, v_con.numero_contrato),
      p_mes, p_anio, v_con.renta_mensual, v_venc, 'PENDIENTE', TRUE
    );
    v_cnt := v_cnt + 1;
  END LOOP;

  RETURN QUERY SELECT v_cnt, v_cnt;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_generar_cargos_mes(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_generar_cargos_mes(INT, INT)
  TO service_role, authenticated;
