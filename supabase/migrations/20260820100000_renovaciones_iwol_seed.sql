-- ══════════════════════════════════════════════════════════════════════════════
-- RENOVACIONES PLAZA IWOL — Contratos vencidos
-- Fuente: Tabla_Comparativa_Contratos_Iwol (1).xlsx
-- Fecha de carga: 2026-08-20
-- Contratos renovados:
--   • Local 14   — Luky del Rosario González Olivo   (vencido 31-may-2025)
--   • Locales 6-7— Vorwerk México S. de R.L. de C.V. (vencido 08-may-2025)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Columnas nuevas en public.arrendatarios ───────────────────────────────
ALTER TABLE public.arrendatarios
  ADD COLUMN IF NOT EXISTS domicilio_fiscal   TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal TEXT;   -- para personas morales

-- ── 2. Columnas nuevas en public.contratos ───────────────────────────────────
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS tipo_contrato          TEXT DEFAULT 'ANUAL'
                            CHECK (tipo_contrato IN ('ANUAL','SEMESTRAL','MENSUAL','EVENTUAL')),
  ADD COLUMN IF NOT EXISTS giro_autorizado         TEXT,
  ADD COLUMN IF NOT EXISTS fiador_nombre           TEXT,
  ADD COLUMN IF NOT EXISTS fiador_rfc              TEXT,
  ADD COLUMN IF NOT EXISTS fiador_domicilio        TEXT,
  ADD COLUMN IF NOT EXISTS fiador_ife              TEXT,
  ADD COLUMN IF NOT EXISTS pagares_cantidad        INT  DEFAULT 12,
  ADD COLUMN IF NOT EXISTS cancelacion_anticipada_meses INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS periodo_gracia_meses    INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contrato_anterior_id    UUID REFERENCES public.contratos(id) ON DELETE SET NULL;

-- ── 3. Actualizar vista prp_contratos para exponer nuevos campos ─────────────
DROP VIEW IF EXISTS public.prp_contratos;
CREATE VIEW public.prp_contratos AS
SELECT
  c.id,
  c.numero_contrato                                   AS folio,
  c.arrendatario_id,
  a.locatario                                         AS arrendatario_nombre,
  a.nombre_negocio,
  a.rfc                                               AS arrendatario_rfc,
  a.tipo_persona,
  a.domicilio_fiscal                                  AS arrendatario_domicilio,
  a.representante_legal,
  c.tipo_contrato,
  c.giro_autorizado,
  c.fecha_inicio,
  c.fecha_fin,
  c.renta_mensual,
  c.renta_sin_iva,
  c.deposito_garantia,
  c.dia_pago,
  c.penalizacion_pct,
  c.incremento_anual_pct,
  c.fiador_nombre,
  c.fiador_rfc,
  c.fiador_domicilio,
  c.fiador_ife,
  c.pagares_cantidad,
  c.cancelacion_anticipada_meses,
  c.periodo_gracia_meses,
  c.contrato_anterior_id,
  c.estatus,
  c.estatus                                           AS estado_id,
  c.locales_referencia,
  c.locales_display,
  c.contrato_pdf_url                                  AS archivo_contrato_url,
  c.notas,
  c.created_at,
  c.updated_at,
  -- Semáforo de vencimiento
  CASE
    WHEN c.estatus NOT IN ('VIGENTE','VENCIDO') THEN c.estatus
    WHEN c.fecha_fin < CURRENT_DATE             THEN 'VENCIDO'
    WHEN c.fecha_fin <= CURRENT_DATE + 30       THEN 'CRITICO'
    WHEN c.fecha_fin <= CURRENT_DATE + 60       THEN 'ALERTA'
    ELSE 'OK'
  END                                                 AS semaforo_vencimiento,
  (c.fecha_fin - CURRENT_DATE)                        AS dias_restantes,
  -- Locales (de contratos_locales)
  STRING_AGG(cl.local_id, '|' ORDER BY cl.local_id)  AS locales_ids,
  STRING_AGG(l.numero_local, ', ' ORDER BY cl.local_id) AS unidad_numero,
  SUM(l.superficie_m2)                                AS m2_totales,
  -- Compatibilidad con campos legacy
  NULL::uuid                                          AS unidad_id,
  NULL::text                                          AS inmueble_nombre,
  NULL::text                                          AS tipo_unidad
FROM public.contratos c
JOIN public.arrendatarios a ON a.id = c.arrendatario_id
LEFT JOIN public.contratos_locales cl ON cl.contrato_id = c.id
LEFT JOIN public.cat_locales l ON l.id_local = cl.local_id
GROUP BY c.id, a.id;

-- ── 4. Insertar ARRENDATARIO — Luky del Rosario González Olivo ───────────────
INSERT INTO public.arrendatarios (
  locatario, nombre_negocio, rfc, tipo_persona, domicilio_fiscal, estatus
) VALUES (
  'Luky del Rosario González Olivo',
  'Salones y Clínicas de Belleza',
  'GOOL8710226M2',
  'FISICA',
  'Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757',
  'ACTIVO'
)
ON CONFLICT DO NOTHING;

-- ── 5. Insertar ARRENDATARIO — Vorwerk México S. de R.L. de C.V. ─────────────
INSERT INTO public.arrendatarios (
  locatario, nombre_negocio, rfc, tipo_persona, domicilio_fiscal, representante_legal, estatus
) VALUES (
  'Horacio Hernández Huerta',
  'Vorwerk México, S. de R.L. de C.V.',
  NULL,
  'MORAL',
  'Vito Alessio Robles 38, Col. Florida, C.P. 01030, Álvaro Obregón, CDMX',
  'Horacio Hernández Huerta / Ariel Hermosillo Mojica',
  'ACTIVO'
)
ON CONFLICT DO NOTHING;

-- ── 6. Contrato de renovación — Local 14 (Luky) ──────────────────────────────
-- Vigencia: 01-jun-2025 al 31-may-2026 (1 año desde día siguiente al vencimiento)
DO $$
DECLARE
  v_arr_id  UUID;
  v_cont_id UUID;
BEGIN
  SELECT id INTO v_arr_id FROM public.arrendatarios WHERE rfc = 'GOOL8710226M2' LIMIT 1;
  IF v_arr_id IS NULL THEN
    RAISE EXCEPTION 'Arrendatario Luky no encontrado';
  END IF;

  INSERT INTO public.contratos (
    numero_contrato, arrendatario_id,
    tipo_contrato, giro_autorizado,
    fecha_inicio, fecha_fin,
    renta_mensual, renta_sin_iva, deposito_garantia,
    dia_pago, penalizacion_pct, incremento_anual_pct,
    fiador_nombre, fiador_ife, fiador_domicilio,
    pagares_cantidad, cancelacion_anticipada_meses,
    locales_referencia, locales_display,
    estatus, notas
  ) VALUES (
    'IWOL-L14-R26',
    v_arr_id,
    'ANUAL',
    'Salones y clínicas de belleza y peluquerías',
    '2025-06-01', '2026-05-31',
    17500.00, ROUND(17500.00 / 1.16, 2), 17000.00,
    5, 10.00, 0.00,
    'Héctor Alonso Noriega Rico', '2731024152155',
    'Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757',
    12, 2,
    'L14', 'L14',
    'VIGENTE',
    'Renovación de contrato 2024-2025. Cajón estacionamiento No. 14 incluido.'
  )
  ON CONFLICT (numero_contrato) DO UPDATE SET
    estatus = 'VIGENTE',
    updated_at = now()
  RETURNING id INTO v_cont_id;

  -- Asociar local L14
  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  VALUES (v_cont_id, 'L14', 17500.00)
  ON CONFLICT DO NOTHING;

  -- Marcar local como OCUPADO
  UPDATE public.cat_locales
  SET estatus = 'OCUPADO', contrato_activo_id = v_cont_id
  WHERE id_local = 'L14';

  RAISE NOTICE 'Contrato IWOL-L14-R26 creado: %', v_cont_id;
END $$;

-- ── 7. Contrato de renovación — Locales 6-7 (Vorwerk México) ─────────────────
-- Vigencia: 09-may-2025 al 08-may-2026 (1 año desde día siguiente al vencimiento 08-may-2025)
DO $$
DECLARE
  v_arr_id  UUID;
  v_cont_id UUID;
BEGIN
  SELECT id INTO v_arr_id
  FROM public.arrendatarios
  WHERE nombre_negocio ILIKE '%Vorwerk%' LIMIT 1;

  IF v_arr_id IS NULL THEN
    RAISE EXCEPTION 'Arrendatario Vorwerk no encontrado';
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
    'IWOL-L0607-R26',
    v_arr_id,
    'ANUAL',
    'Venta, distribución y demostración de electrodomésticos (Thermomix)',
    '2025-05-09', '2026-05-08',
    36500.00, ROUND(36500.00 / 1.16, 2), 36500.00,
    9, 10.00, 0.00,
    'Horacio Hernández Huerta', '0553039941011',
    'Av. Taxqueña 1956, Torre B D010, Coyoacán, CDMX',
    12, 2, 1,   -- periodo_gracia_meses = 1 (mes gratis pactado)
    'L06|L07', 'L6, L7',
    'VIGENTE',
    'Renovación de contrato 2024-2025. 1 mes de gracia pactado. Anexo 2: plano cocina Thermomix. Repr. legal: Horacio Hernández Huerta y Ariel Hermosillo Mojica.'
  )
  ON CONFLICT (numero_contrato) DO UPDATE SET
    estatus = 'VIGENTE',
    updated_at = now()
  RETURNING id INTO v_cont_id;

  -- Asociar locales L06 y L07
  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  VALUES
    (v_cont_id, 'L06', 18250.00),   -- renta dividida proporcionalmente
    (v_cont_id, 'L07', 18250.00)
  ON CONFLICT DO NOTHING;

  -- Marcar locales como OCUPADO
  UPDATE public.cat_locales
  SET estatus = 'OCUPADO', contrato_activo_id = v_cont_id
  WHERE id_local IN ('L06', 'L07');

  RAISE NOTICE 'Contrato IWOL-L0607-R26 creado: %', v_cont_id;
END $$;

-- ── 8. RLS: autenticados pueden ver y modificar ──────────────────────────────
-- (ya existe policy auth_all_contratos y auth_all_arrend desde migración base)
