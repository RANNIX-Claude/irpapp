-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Agregar campo estatus_proceso a contratos
-- Valores: EN_CONTRATACION | EN_RENOVACION | EN_EJECUCION
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS estatus_proceso TEXT DEFAULT 'EN_EJECUCION'
  CHECK (estatus_proceso IN ('EN_CONTRATACION','EN_RENOVACION','EN_EJECUCION'));

-- Contratos ya vencidos con renovación insertada → EN_RENOVACION
UPDATE public.contratos
SET estatus_proceso = 'EN_RENOVACION'
WHERE numero_contrato IN ('IWOL-L14-R26','IWOL-L0607-R26');

-- El resto de contratos existentes → EN_EJECUCION (ya es el default)

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Insertar arrendatarios Nancy Gallardo y Alfredo Bravo
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.arrendatarios (
  locatario, nombre_negocio, rfc, tipo_persona, domicilio_fiscal, estatus
) VALUES
(
  'Nancy Gallardo Fuentes',
  'Uso Comercial - Local 36',
  NULL,
  'FISICA',
  'Av. Gobernadores 1622, Interior 36, C.P. 52177, Metepec',
  'ACTIVO'
),
(
  'Alfredo Bravo Mendiola',
  'Spinning',
  'BAMA841221C2A',
  'FISICA',
  'Carr. Calimaya L3 M11, Fracc. Bosque de las Fuentes, San Andrés Ocotlán, C.P. 52220',
  'ACTIVO'
)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Contrato Local 36 — Nancy Gallardo Fuentes
-- VIGENTE hasta 14-sep-2026 (POR VENCER en ~25 días)
-- Garantía especial: inmueble en Cancún (sin fiador persona física)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE v_arr UUID; v_cont UUID;
BEGIN
  SELECT id INTO v_arr FROM public.arrendatarios
  WHERE locatario = 'Nancy Gallardo Fuentes' LIMIT 1;

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
    'IWOL-L36-2025', v_arr,
    'ANUAL', 'Uso comercial',
    '2025-09-15', '2026-09-14',
    15000.00, ROUND(15000.00/1.16,2), 15000.00,
    15, 10.00, 0.00,
    NULL, NULL, NULL,  -- sin fiador persona física
    0, 2,              -- sin pagarés (garantía real: inmueble Cancún)
    'L36', 'L36',
    'VIGENTE', 'EN_EJECUCION',
    'ARRENDAMIENTO DIRECTO (no subarrendamiento). Sin fiador personal — garantía real: inmueble en Cancún, Q. Roo, Depto. 503 Torre Miami (Anexo 1: escritura no incluida en expediente). Resolución de conflictos: ARBITRAJE en CDMX, árbitro Marco Antonio Zaragoza Galindo. Renta incluye cuota de mantenimiento. Incremento INPC automático.'
  )
  ON CONFLICT (numero_contrato) DO UPDATE SET
    estatus = EXCLUDED.estatus, updated_at = now()
  RETURNING id INTO v_cont;

  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  VALUES (v_cont, 'L36', 15000.00)
  ON CONFLICT DO NOTHING;

  UPDATE public.cat_locales
  SET estatus = 'OCUPADO', contrato_activo_id = v_cont
  WHERE id_local = 'L36';

  RAISE NOTICE 'Contrato IWOL-L36-2025 creado: %', v_cont;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Contrato Local 9 — Alfredo Bravo Mendiola
-- VIGENTE hasta 16-sep-2026 (POR VENCER en ~27 días)
-- Depósito especial: 2 meses ($48,874). Fiador con PASAPORTE (no IFE).
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE v_arr UUID; v_cont UUID;
BEGIN
  SELECT id INTO v_arr FROM public.arrendatarios
  WHERE rfc = 'BAMA841221C2A' LIMIT 1;

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
    'IWOL-L09-2025', v_arr,
    'ANUAL', 'Spinning',
    '2025-09-17', '2026-09-16',
    25892.00, ROUND(25892.00/1.16,2), 48874.00,
    17, 10.00, 0.00,
    'José Luis Ayala Ayala', 'PASAPORTE G41242147',
    'Av. Ermita 1501, San Mateo, C.P. 52140, Metepec',
    12, 2,
    'L09', 'L9',
    'VIGENTE', 'EN_EJECUCION',
    'Depósito = 2 meses ($48,874 vs. $51,784 requerido; faltante $2,910). Fiador: identificación con PASAPORTE G41242147 (único contrato con pasaporte en lugar de IFE). Cajón No. 17 asignado en contrato (posible error de plantilla — verificar). Incremento INPC Banxico.'
  )
  ON CONFLICT (numero_contrato) DO UPDATE SET
    estatus = EXCLUDED.estatus, updated_at = now()
  RETURNING id INTO v_cont;

  INSERT INTO public.contratos_locales (contrato_id, local_id, renta_asignada)
  VALUES (v_cont, 'L09', 25892.00)
  ON CONFLICT DO NOTHING;

  UPDATE public.cat_locales
  SET estatus = 'OCUPADO', contrato_activo_id = v_cont
  WHERE id_local = 'L09';

  RAISE NOTICE 'Contrato IWOL-L09-2025 creado: %', v_cont;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Actualizar contratos existentes con datos completos del Excel
-- ══════════════════════════════════════════════════════════════════════════════

-- Local 17 — Luz Adriana: actualizar estatus a VENCIDO (fecha_fin 30-abr-2026 < hoy)
UPDATE public.contratos
SET
  estatus           = 'VENCIDO',
  giro_autorizado   = 'Clínica de Atención a la Diabetes',
  fiador_nombre     = 'Fernando Rafael Franco Robles',
  fiador_ife        = 'IFE 2261033320309',
  fiador_domicilio  = 'Valle de Biar 19, Valle Alcudia, San Andrés Ocotlán, C.P. 52220',
  pagares_cantidad  = 12,
  updated_at        = now()
WHERE numero_contrato = 'IWOL-L17-2025';

-- Local 14 — Luky: datos fiador ya correctos, confirmar
UPDATE public.contratos
SET
  fiador_nombre    = 'Héctor Alonso Noriega Rico',
  fiador_ife       = 'IFE 2731024152155',
  fiador_domicilio = 'Av. Encino, Mz6 Lt3 1, Encinos Roble, San Pedro Cholula, C.P. 52757',
  updated_at       = now()
WHERE numero_contrato IN ('IWOL-L14-R26');

-- Locales 6-7 — Vorwerk: datos fiador ya correctos, confirmar
UPDATE public.contratos
SET
  fiador_nombre    = 'Horacio Hernández Huerta',
  fiador_ife       = 'IFE 0553039941011',
  fiador_domicilio = 'Av. Taxqueña 1956, Torre B D010, Coyoacán, CDMX',
  updated_at       = now()
WHERE numero_contrato IN ('IWOL-L0607-R26');

-- Locales 11-12 — Andrea Castillo: actualizar fiador
UPDATE public.contratos
SET
  fiador_nombre    = 'Ma. Oliver Mendoza Gómez',
  fiador_ife       = 'IFE 2514024108073',
  fiador_domicilio = 'Violetas 3, La Virgen, C.P. 52149, Metepec',
  updated_at       = now()
WHERE numero_contrato = 'IWOL-L1112-2026';

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Actualizar arrendatarios con RFC/domicilio del Excel
-- ══════════════════════════════════════════════════════════════════════════════

-- Alfredo Bravo: confirmar RFC
UPDATE public.arrendatarios
SET rfc = 'BAMA841221C2A'
WHERE locatario = 'Alfredo Bravo Mendiola';
