-- Recrea la función fn_generar_anios_vacaciones que faltaba en producción
CREATE OR REPLACE FUNCTION public.fn_generar_anios_vacaciones(p_emp uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_fi        date;
  v_anios     integer;
  v_i         integer;
  v_inicio    date;
  v_fin       date;
  v_dias      integer;
BEGIN
  SELECT fecha_ingreso INTO v_fi FROM rh_empleados WHERE id = p_emp;
  IF v_fi IS NULL THEN RETURN; END IF;

  -- Años laborales COMPLETADOS hasta hoy
  v_anios := FLOOR(EXTRACT(EPOCH FROM AGE(CURRENT_DATE, v_fi)) / (365.25 * 86400))::integer;

  FOR v_i IN 1..GREATEST(v_anios, 1) LOOP
    v_inicio := v_fi + ((v_i - 1) * interval '1 year');
    v_fin    := v_fi + (v_i      * interval '1 year') - 1;

    -- Días según la ley (catálogo por año)
    SELECT dias INTO v_dias FROM cat_vacaciones_dias
      WHERE anio_numero = v_i AND vigente = true;
    IF v_dias IS NULL THEN
      SELECT dias INTO v_dias FROM cat_vacaciones_dias
        WHERE anio_numero = (SELECT MAX(anio_numero) FROM cat_vacaciones_dias WHERE vigente = true);
    END IF;

    INSERT INTO rh_vacaciones_anio
      (empleado_id, anio, dias_derecho, fecha_inicio_anio, fecha_fin_anio)
    VALUES
      (p_emp, v_i, COALESCE(v_dias, 12), v_inicio, v_fin)
    ON CONFLICT (empleado_id, anio) DO UPDATE
      SET dias_derecho      = COALESCE(v_dias, 12),
          fecha_inicio_anio = v_inicio,
          fecha_fin_anio    = v_fin
      WHERE rh_vacaciones_anio.dias_derecho != COALESCE(v_dias, 12)
         OR rh_vacaciones_anio.fecha_inicio_anio IS NULL;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generar_anios_vacaciones(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_generar_anios_vacaciones(uuid) FROM PUBLIC;
