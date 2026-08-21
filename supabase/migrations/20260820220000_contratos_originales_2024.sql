-- ══════════════════════════════════════════════════════════════════════════════
-- Contratos originales 2024 (Luky y Vorwerk) — RENOVADO
-- Se insertan para completar la cadena de historial:
--   original 2024 (RENOVADO) → renovación 2025 (VIGENTE, EN_RENOVACION)
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_luky      UUID;
  v_vorwerk   UUID;
  v_orig_luky UUID;
  v_orig_vork UUID;
  v_renov_luky UUID;
  v_renov_vork UUID;
BEGIN
  -- IDs de arrendatarios
  SELECT id INTO v_luky FROM public.arrendatarios WHERE rfc = 'GOOL8710226M2' LIMIT 1;
  SELECT id INTO v_vorwerk FROM public.arrendatarios WHERE nombre_negocio ILIKE '%Vorwerk%' LIMIT 1;

  -- IDs de los contratos de renovación ya existentes
  SELECT id INTO v_renov_luky FROM public.contratos WHERE numero_contrato = 'IWOL-L14-R26' LIMIT 1;
  SELECT id INTO v_renov_vork FROM public.contratos WHERE numero_contrato = 'IWOL-L0607-R26' LIMIT 1;

  -- ── Contrato original Luky 2024 ─────────────────────────────────────────────
  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    tipo_contrato, giro_autorizado,
    fecha_inicio, fecha_fin,
    renta_mensual, renta_sin_iva, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_ife, fiador_domicilio,
    pagares_cantidad, cancelacion_anticipada_meses,
    locales_referencia, locales_display,
    estatus, estatus_proceso, notas
  ) VALUES (
    'IWOL-L14-2024', v_luky,
    'ANUAL', 'Salones y clínicas de belleza y peluquerías',
    '2024-06-01', '2025-05-31',
    17500.00, ROUND(17500.00/1.16,2), 17000.00,
    5, 10.00, 0.00,
    'Héctor Alonso Noriega Rico', 'IFE 2731024152155',
    'Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757',
    12, 2,
    'L14', 'L14',
    'RENOVADO', 'EN_EJECUCION',
    'Contrato original firmado 31-may-2024. Renovado mediante IWOL-L14-R26.'
  )
  ON CONFLICT (numero_contrato) DO NOTHING
  RETURNING id INTO v_orig_luky;

  -- Si se insertó, crear contratos_locales
  IF v_orig_luky IS NOT NULL THEN
    INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
    VALUES (v_orig_luky, 'L14', 17500.00)
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_orig_luky FROM public.contratos WHERE numero_contrato = 'IWOL-L14-2024';
  END IF;

  -- Enlazar renovación con original
  IF v_renov_luky IS NOT NULL AND v_orig_luky IS NOT NULL THEN
    UPDATE public.contratos
    SET contrato_anterior_id = v_orig_luky
    WHERE id = v_renov_luky AND contrato_anterior_id IS NULL;
  END IF;

  RAISE NOTICE 'Luky original: %, renovación: %', v_orig_luky, v_renov_luky;

  -- ── Contrato original Vorwerk 2024 ──────────────────────────────────────────
  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    tipo_contrato, giro_autorizado,
    fecha_inicio, fecha_fin,
    renta_mensual, renta_sin_iva, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_ife, fiador_domicilio,
    pagares_cantidad, cancelacion_anticipada_meses, periodo_gracia_meses,
    locales_referencia, locales_display,
    estatus, estatus_proceso, notas
  ) VALUES (
    'IWOL-L0607-2024', v_vorwerk,
    'ANUAL', 'Venta, distribución y demostración de electrodomésticos (Thermomix)',
    '2024-04-09', '2025-05-08',
    36500.00, ROUND(36500.00/1.16,2), 36500.00,
    9, 10.00, 0.00,
    'Horacio Hernández Huerta', 'IFE 0553039941011',
    'Av. Taxqueña 1956, Torre B D010, Coyoacán, CDMX',
    12, 2, 1,
    'L06|L07', 'L6, L7',
    'RENOVADO', 'EN_EJECUCION',
    'Contrato original firmado 09-abr-2024. 1 mes de gracia pactado. Renovado mediante IWOL-L0607-R26.'
  )
  ON CONFLICT (numero_contrato) DO NOTHING
  RETURNING id INTO v_orig_vork;

  IF v_orig_vork IS NOT NULL THEN
    INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
    VALUES
      (v_orig_vork, 'L06', 18250.00),
      (v_orig_vork, 'L07', 18250.00)
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_orig_vork FROM public.contratos WHERE numero_contrato = 'IWOL-L0607-2024';
  END IF;

  IF v_renov_vork IS NOT NULL AND v_orig_vork IS NOT NULL THEN
    UPDATE public.contratos
    SET contrato_anterior_id = v_orig_vork
    WHERE id = v_renov_vork AND contrato_anterior_id IS NULL;
  END IF;

  RAISE NOTICE 'Vorwerk original: %, renovación: %', v_orig_vork, v_renov_vork;
END $$;
