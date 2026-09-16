-- ════════════════════════════════════════════════════════════════════════════
-- Columnas calculadas (GENERATED ALWAYS AS STORED) en er_mensual
--
-- Objetivo: convertir er_mensual en tabla de hechos completa.
-- El EDR.jsx pasa a ser un visor puro: SELECT * FROM er_mensual donde mes=?
-- Sin joins, sin cálculos en React.  Los detalles siguen viniendo de las
-- tablas operativas (ingresos, gastos_operativos, etc.) vía DetalleEDR.
--
-- El proceso de cierre (Netlify function cerrar-mes) llena los inputs;
-- PostgreSQL calcula todo lo demás al instante.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0. Backfill: unifica real_iva → real_iva_mes para registros legacy ────
-- Los registros anteriores solo tienen real_iva (total); los nuevos usan
-- real_iva_mes + real_iva_otros.  Antes de agregar el GENERATED basado en
-- el split, dejamos los legacy consistentes.
UPDATE public.er_mensual
SET    real_iva_mes = COALESCE(real_iva, 0)
WHERE  (real_iva_mes IS NULL OR real_iva_mes = 0)
  AND  COALESCE(real_iva, 0) <> 0;

-- ── 1. Proyectado ─────────────────────────────────────────────────────────

ALTER TABLE public.er_mensual
  ADD COLUMN IF NOT EXISTS calc_proy_disponibles NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(proy_rentas_contratos, 0) - COALESCE(proy_restaurant, 0)
    ) STORED,

  -- Rentas brutas proyectadas = disponibles − locales vacíos
  ADD COLUMN IF NOT EXISTS calc_proy_rentas_brutas NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(proy_rentas_contratos, 0)
      - COALESCE(proy_restaurant, 0)
      - ABS(COALESCE(proy_locales_vacantes, 0))
    ) STORED,

  -- IVA no se proyecta → ing_neto = rentas_brutas
  ADD COLUMN IF NOT EXISTS calc_proy_total_ing NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(proy_rentas_contratos, 0)
      - COALESCE(proy_restaurant, 0)
      - ABS(COALESCE(proy_locales_vacantes, 0))
      + COALESCE(proy_estacionamiento, 0)
      + COALESCE(proy_pensiones, 0)
      + COALESCE(proy_maquinita, 0)
      + COALESCE(proy_agua_ingresos, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_proy_total_gastos NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(proy_sueldos, 0)
      + COALESCE(proy_fondo_revolvente, 0)
      + COALESCE(proy_luz, 0)
      + COALESCE(proy_agua_gastos, 0)
      + COALESCE(proy_otros_gastos, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_proy_total_imp NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(predial, 0)
      + COALESCE(transporte_residuos, 0)
      + COALESCE(licencia_estacionamiento, 0)
      + COALESCE(anuncio_publicitario, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_proy_util_bruta NUMERIC(14,2)
    GENERATED ALWAYS AS (
      (COALESCE(proy_rentas_contratos, 0)
       - COALESCE(proy_restaurant, 0)
       - ABS(COALESCE(proy_locales_vacantes, 0))
       + COALESCE(proy_estacionamiento, 0)
       + COALESCE(proy_pensiones, 0)
       + COALESCE(proy_maquinita, 0)
       + COALESCE(proy_agua_ingresos, 0))
      - (COALESCE(proy_sueldos, 0)
         + COALESCE(proy_fondo_revolvente, 0)
         + COALESCE(proy_luz, 0)
         + COALESCE(proy_agua_gastos, 0)
         + COALESCE(proy_otros_gastos, 0))
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_proy_util_neta NUMERIC(14,2)
    GENERATED ALWAYS AS (
      (COALESCE(proy_rentas_contratos, 0)
       - COALESCE(proy_restaurant, 0)
       - ABS(COALESCE(proy_locales_vacantes, 0))
       + COALESCE(proy_estacionamiento, 0)
       + COALESCE(proy_pensiones, 0)
       + COALESCE(proy_maquinita, 0)
       + COALESCE(proy_agua_ingresos, 0))
      - (COALESCE(proy_sueldos, 0)
         + COALESCE(proy_fondo_revolvente, 0)
         + COALESCE(proy_luz, 0)
         + COALESCE(proy_agua_gastos, 0)
         + COALESCE(proy_otros_gastos, 0))
      - (COALESCE(predial, 0)
         + COALESCE(transporte_residuos, 0)
         + COALESCE(licencia_estacionamiento, 0)
         + COALESCE(anuncio_publicitario, 0))
    ) STORED;

-- ── 2. Real — totales ─────────────────────────────────────────────────────

ALTER TABLE public.er_mensual
  ADD COLUMN IF NOT EXISTS calc_real_total_rentas NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_mes,   0) + COALESCE(real_rentas_factura_otros, 0)
      + COALESCE(real_rsf_mes,  0)           + COALESCE(real_rsf_otros,  0)
    ) STORED,

  -- Rentas brutas = total rentas + penalizaciones
  ADD COLUMN IF NOT EXISTS calc_real_rentas_brutas NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_mes,   0) + COALESCE(real_rentas_factura_otros, 0)
      + COALESCE(real_rsf_mes,  0)           + COALESCE(real_rsf_otros,  0)
      + COALESCE(real_penaliz_mes, 0)        + COALESCE(real_penaliz_otros, 0)
    ) STORED,

  -- IVA total (negativo: es un descuento)
  ADD COLUMN IF NOT EXISTS calc_real_iva NUMERIC(14,2)
    GENERATED ALWAYS AS (
      -(COALESCE(real_iva_mes, 0) + COALESCE(real_iva_otros, 0))
    ) STORED,

  -- Ingresos netos de renta = rentas_brutas + IVA (negativo)
  ADD COLUMN IF NOT EXISTS calc_real_ing_neto NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_mes,   0) + COALESCE(real_rentas_factura_otros, 0)
      + COALESCE(real_rsf_mes,  0)           + COALESCE(real_rsf_otros,  0)
      + COALESCE(real_penaliz_mes, 0)        + COALESCE(real_penaliz_otros, 0)
      - COALESCE(real_iva_mes, 0)            - COALESCE(real_iva_otros, 0)
    ) STORED,

  -- Totales por fuente (para componición de Total Ingresos)
  ADD COLUMN IF NOT EXISTS calc_real_total_estac NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_estac_mes, 0) + COALESCE(real_estac_otros, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_pension NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_pension_mes, 0) + COALESCE(real_pension_otros, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_maq NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_maquinita_mes, 0) + COALESCE(real_maquinita_otros, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_agua_i NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_agua_ing_mes, 0) + COALESCE(real_agua_ing_otros, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_ing NUMERIC(14,2)
    GENERATED ALWAYS AS (
      -- ing_neto (rentas + penaliz − IVA)
      COALESCE(real_rentas_factura_mes,   0) + COALESCE(real_rentas_factura_otros, 0)
      + COALESCE(real_rsf_mes,  0)           + COALESCE(real_rsf_otros,  0)
      + COALESCE(real_penaliz_mes, 0)        + COALESCE(real_penaliz_otros, 0)
      - COALESCE(real_iva_mes, 0)            - COALESCE(real_iva_otros, 0)
      -- otros ingresos
      + COALESCE(real_estac_mes, 0)          + COALESCE(real_estac_otros, 0)
      + COALESCE(real_pension_mes, 0)        + COALESCE(real_pension_otros, 0)
      + COALESCE(real_maquinita_mes, 0)      + COALESCE(real_maquinita_otros, 0)
      + COALESCE(real_agua_ing_mes, 0)       + COALESCE(real_agua_ing_otros, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_gastos NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_sueldos, 0)
      + COALESCE(real_fondo_revolvente, 0)
      + COALESCE(real_gasto_excedente, 0)
      + COALESCE(real_luz, 0)
      + COALESCE(real_agua_gastos, 0)
      + COALESCE(real_otros_gastos, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_imp NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(predial, 0)
      + COALESCE(transporte_residuos, 0)
      + COALESCE(licencia_estacionamiento, 0)
      + COALESCE(anuncio_publicitario, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_util_bruta NUMERIC(14,2)
    GENERATED ALWAYS AS (
      -- total_ing
      (COALESCE(real_rentas_factura_mes,   0) + COALESCE(real_rentas_factura_otros, 0)
       + COALESCE(real_rsf_mes,  0)           + COALESCE(real_rsf_otros,  0)
       + COALESCE(real_penaliz_mes, 0)        + COALESCE(real_penaliz_otros, 0)
       - COALESCE(real_iva_mes, 0)            - COALESCE(real_iva_otros, 0)
       + COALESCE(real_estac_mes, 0)          + COALESCE(real_estac_otros, 0)
       + COALESCE(real_pension_mes, 0)        + COALESCE(real_pension_otros, 0)
       + COALESCE(real_maquinita_mes, 0)      + COALESCE(real_maquinita_otros, 0)
       + COALESCE(real_agua_ing_mes, 0)       + COALESCE(real_agua_ing_otros, 0))
      -- menos total_gastos
      - (COALESCE(real_sueldos, 0)
         + COALESCE(real_fondo_revolvente, 0)
         + COALESCE(real_gasto_excedente, 0)
         + COALESCE(real_luz, 0)
         + COALESCE(real_agua_gastos, 0)
         + COALESCE(real_otros_gastos, 0))
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_util_neta NUMERIC(14,2)
    GENERATED ALWAYS AS (
      -- total_ing
      (COALESCE(real_rentas_factura_mes,   0) + COALESCE(real_rentas_factura_otros, 0)
       + COALESCE(real_rsf_mes,  0)           + COALESCE(real_rsf_otros,  0)
       + COALESCE(real_penaliz_mes, 0)        + COALESCE(real_penaliz_otros, 0)
       - COALESCE(real_iva_mes, 0)            - COALESCE(real_iva_otros, 0)
       + COALESCE(real_estac_mes, 0)          + COALESCE(real_estac_otros, 0)
       + COALESCE(real_pension_mes, 0)        + COALESCE(real_pension_otros, 0)
       + COALESCE(real_maquinita_mes, 0)      + COALESCE(real_maquinita_otros, 0)
       + COALESCE(real_agua_ing_mes, 0)       + COALESCE(real_agua_ing_otros, 0))
      -- menos total_gastos
      - (COALESCE(real_sueldos, 0)
         + COALESCE(real_fondo_revolvente, 0)
         + COALESCE(real_gasto_excedente, 0)
         + COALESCE(real_luz, 0)
         + COALESCE(real_agua_gastos, 0)
         + COALESCE(real_otros_gastos, 0))
      -- menos impuestos
      - (COALESCE(predial, 0)
         + COALESCE(transporte_residuos, 0)
         + COALESCE(licencia_estacionamiento, 0)
         + COALESCE(anuncio_publicitario, 0))
    ) STORED;

-- ── 3. Real — split mes/otros para las columnas del tablero ──────────────
-- Estos permiten mostrar "Rentas Mes" y "Otros Periodos" en cada renglón
-- sin ningún cálculo en React.

ALTER TABLE public.er_mensual
  -- Ingresos netos por período (rentas + penaliz de ese período − su IVA)
  ADD COLUMN IF NOT EXISTS calc_real_ing_neto_mes NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_mes, 0)
      + COALESCE(real_rsf_mes,  0)
      + COALESCE(real_penaliz_mes, 0)
      - COALESCE(real_iva_mes, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_ing_neto_otros NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_otros, 0)
      + COALESCE(real_rsf_otros, 0)
      + COALESCE(real_penaliz_otros, 0)
      - COALESCE(real_iva_otros, 0)
    ) STORED,

  -- Total ingresos por período (ing_neto + todos los otros ingresos del período)
  ADD COLUMN IF NOT EXISTS calc_real_total_ing_mes NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_mes, 0)
      + COALESCE(real_rsf_mes,  0)
      + COALESCE(real_penaliz_mes, 0)
      - COALESCE(real_iva_mes, 0)
      + COALESCE(real_estac_mes, 0)
      + COALESCE(real_pension_mes, 0)
      + COALESCE(real_maquinita_mes, 0)
      + COALESCE(real_agua_ing_mes, 0)
    ) STORED,

  ADD COLUMN IF NOT EXISTS calc_real_total_ing_otros NUMERIC(14,2)
    GENERATED ALWAYS AS (
      COALESCE(real_rentas_factura_otros, 0)
      + COALESCE(real_rsf_otros, 0)
      + COALESCE(real_penaliz_otros, 0)
      - COALESCE(real_iva_otros, 0)
      + COALESCE(real_estac_otros, 0)
      + COALESCE(real_pension_otros, 0)
      + COALESCE(real_maquinita_otros, 0)
      + COALESCE(real_agua_ing_otros, 0)
    ) STORED;

NOTIFY pgrst, 'reload schema';
