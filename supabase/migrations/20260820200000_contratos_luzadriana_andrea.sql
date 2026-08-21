-- ══════════════════════════════════════════════════════════════════════════════
-- CONTRATOS PLAZA IWOL — Luz Adriana (L17) y Andrea Castillo (L11-L12)
-- Fuente: Tabla_Comparativa_Contratos_Iwol (1).xlsx
-- Fecha de carga: 2026-08-20
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Insertar ARRENDATARIA — Luz Adriana Franco Rodríguez ──────────────────
INSERT INTO public.arrendatarios (
  locatario, nombre_negocio, rfc, tipo_persona, domicilio_fiscal, estatus
) VALUES (
  'Luz Adriana Franco Rodríguez',
  'Clínica de Atención a la Diabetes',
  'ROPS590726G47',
  'FISICA',
  'Av. Gobernadores 1622, Local 17, Col. La Providencia, C.P. 52177, Metepec',
  'ACTIVO'
)
ON CONFLICT DO NOTHING;

-- ── 2. Insertar ARRENDATARIA — Andrea Castillo Velázquez ─────────────────────
INSERT INTO public.arrendatarios (
  locatario, nombre_negocio, rfc, tipo_persona, domicilio_fiscal, estatus
) VALUES (
  'Andrea Castillo Velázquez',
  'Pilates y Ropa Deportiva',
  'CAVA851220AW3',
  'FISICA',
  'Circuito Puerta del Sol 13-14, Col. Puerta Real, C.P. 76910, El Pueblito, Corregidora, Qro.',
  'ACTIVO'
)
ON CONFLICT DO NOTHING;

-- ── 3. Contrato — Local 17 (Luz Adriana) ─────────────────────────────────────
-- Vigencia: 01-may-2025 al 30-abr-2026 (VENCIDO a la fecha de carga)
DO $$
DECLARE
  v_arr_id  UUID;
  v_cont_id UUID;
BEGIN
  SELECT id INTO v_arr_id FROM public.arrendatarios WHERE rfc = 'ROPS590726G47' LIMIT 1;
  IF v_arr_id IS NULL THEN
    RAISE EXCEPTION 'Arrendataria Luz Adriana no encontrada';
  END IF;

  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    tipo_contrato, giro_autorizado,
    fecha_inicio, fecha_fin,
    renta_mensual, renta_sin_iva, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_ife, fiador_domicilio,
    pagares_cantidad, cancelacion_anticipada_meses, periodo_gracia_meses,
    locales_referencia, locales_display,
    estatus, notas
  ) VALUES (
    'IWOL-L17-2025',
    v_arr_id,
    'ANUAL',
    'Clínica de Atención a la Diabetes',
    '2025-05-01', '2026-04-30',
    17700.00, ROUND(17700.00 / 1.16, 2), 16685.00,
    5, 10.00, 0.00,
    'Fernando Rafael Franco Robles', '2261033320309',
    'Valle de Biar 19, Valle Alcudia, San Andrés Ocotlán, C.P. 52220',
    12, 2, 0,
    'L17', 'L17',
    'VENCIDO',
    'Contrato firmado 01-may-2025. Cajón estacionamiento No. 17 incluido. Cláusula incremento anual en blanco. Depósito original $16,685 (faltante $1,015 vs renta vigente).'
  )
  ON CONFLICT (numero_contrato) DO UPDATE SET
    estatus    = EXCLUDED.estatus,
    updated_at = now()
  RETURNING id INTO v_cont_id;

  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  VALUES (v_cont_id, 'L17', 17700.00)
  ON CONFLICT DO NOTHING;

  -- Local marcado DISPONIBLE porque contrato VENCIDO
  UPDATE public.cat_locales
  SET estatus = 'DISPONIBLE', contrato_activo_id = NULL
  WHERE id_local = 'L17';

  RAISE NOTICE 'Contrato IWOL-L17-2025 creado: %', v_cont_id;
END $$;

-- ── 4. Contrato — Locales 11-12 (Andrea Castillo) ────────────────────────────
-- Vigencia: 10-abr-2026 al 09-abr-2027 (VIGENTE)
DO $$
DECLARE
  v_arr_id  UUID;
  v_cont_id UUID;
BEGIN
  SELECT id INTO v_arr_id FROM public.arrendatarios WHERE rfc = 'CAVA851220AW3' LIMIT 1;
  IF v_arr_id IS NULL THEN
    RAISE EXCEPTION 'Arrendataria Andrea Castillo no encontrada';
  END IF;

  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    tipo_contrato, giro_autorizado,
    fecha_inicio, fecha_fin,
    renta_mensual, renta_sin_iva, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_ife, fiador_domicilio,
    pagares_cantidad, cancelacion_anticipada_meses, periodo_gracia_meses,
    locales_referencia, locales_display,
    estatus, notas
  ) VALUES (
    'IWOL-L1112-2026',
    v_arr_id,
    'ANUAL',
    'Pilates y venta de ropa para pilates',
    '2026-04-10', '2027-04-09',
    37234.00, ROUND(37234.00 / 1.16, 2), 37234.00,
    10, 10.00, 0.00,   -- incremento INPC (% no definido en contrato)
    'Ma. Oliver Mendoza Gómez', '2514024108073',
    'Violetas 3, La Virgen, C.P. 52149, Metepec',
    12, 2, 0,
    'L11|L12', 'L11, L12',
    'VIGENTE',
    'Contrato firmado 01-may-2026 (posterior al inicio de vigencia 10-abr-2026). Sin cajón de estacionamiento; pensión $300/mes sujeta a cambio. Incremento INPC Banxico (% no especificado). Depósito = 1 mes renta.'
  )
  ON CONFLICT (numero_contrato) DO UPDATE SET
    estatus    = EXCLUDED.estatus,
    updated_at = now()
  RETURNING id INTO v_cont_id;

  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  VALUES
    (v_cont_id, 'L11', 18617.00),
    (v_cont_id, 'L12', 18617.00)
  ON CONFLICT DO NOTHING;

  UPDATE public.cat_locales
  SET estatus = 'OCUPADO', contrato_activo_id = v_cont_id
  WHERE id_local IN ('L11', 'L12');

  RAISE NOTICE 'Contrato IWOL-L1112-2026 creado: %', v_cont_id;
END $$;
