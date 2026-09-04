-- ================================================================
-- MIGRACIÓN 022: Generar cobros AGO 2026 en prp.cobros_programados
-- Basado en todos los contratos que tienen cobro JUL 2026 en prp
-- Monto actualizado con importes reales del Excel BBVA JUL2026
-- Todos marcados PAGADO (siguen ocupando aunque contrato esté vencido)
-- Anti-duplicado: salta si ya existe cobro AGO 2026 para ese contrato
-- ================================================================

DO $ago_prp$
DECLARE
  r          RECORD;
  v_monto    NUMERIC;
BEGIN

  FOR r IN
    SELECT DISTINCT ON (cp.contrato_id)
      cp.contrato_id,
      cp.unidad_id,
      cp.arrendatario_id,
      cp.monto_renta,
      cp.monto_iva,
      cp.monto_total,
      cp.pagare_numero,
      u.numero_local
    FROM prp.cobros_programados cp
    JOIN prp.unidades u ON u.id = cp.unidad_id
    WHERE cp.mes = 7 AND cp.anio = 2026
    ORDER BY cp.contrato_id
  LOOP

    -- Saltar si ya existe cobro AGO 2026 para este contrato
    IF EXISTS (
      SELECT 1 FROM prp.cobros_programados
      WHERE contrato_id = r.contrato_id
        AND mes = 8 AND anio = 2026
    ) THEN
      RAISE NOTICE 'Ya existe AGO26: %', r.numero_local;
      CONTINUE;
    END IF;

    -- Monto real del Excel para agosto (mismo que julio confirmado)
    v_monto := CASE r.numero_local
      WHEN 'L6Y7' THEN 39273.20
      WHEN 'L8'   THEN 17500.00   -- Alejandro Muñoz (pagó adeudo en jul, sigue en ago)
      WHEN 'L9'   THEN 25892.00
      WHEN 'L10'  THEN 19100.00
      WHEN 'L11'  THEN 18617.00   -- mitad de L11-12 (37234/2)
      WHEN 'L12'  THEN 18617.00
      WHEN 'L13'  THEN 19832.00   -- C&R Motor (pagó adeudo en jul)
      WHEN 'L14'  THEN 18872.00   -- Luky (contrato vencido, sigue pagando)
      WHEN 'L15'  THEN 19855.00
      WHEN 'L16'  THEN 18500.00
      WHEN 'L17'  THEN 18501.00
      WHEN 'L18'  THEN 17500.00
      WHEN 'L19'  THEN 17500.00
      WHEN 'L23'  THEN 17780.00
      WHEN 'L27'  THEN 16751.43
      WHEN 'L28'  THEN 16651.00
      WHEN 'L29'  THEN 16955.00
      WHEN 'L30'  THEN 17650.00
      WHEN 'L31'  THEN 15750.00   -- mitad de L31-32 (31500/2)
      WHEN 'L32'  THEN 15750.00
      WHEN 'L33'  THEN 16500.00
      WHEN 'L34'  THEN 17120.00   -- Enrique García (pagó adeudos en jul)
      WHEN 'L35'  THEN 15900.00
      WHEN 'L36'  THEN 15000.00
      WHEN 'L37'  THEN 13750.00   -- mitad de L37-38 (27500/2)
      WHEN 'L38'  THEN 13750.00
      ELSE r.monto_total           -- fallback: mismo monto que julio
    END;

    INSERT INTO prp.cobros_programados (
      contrato_id, unidad_id, arrendatario_id,
      mes, anio,
      pagare_numero,
      fecha_limite_pago,
      monto_renta, monto_iva, monto_total,
      referencia_pago,
      estatus,
      fecha_pago_real,
      monto_pagado,
      forma_pago,
      conciliado
    ) VALUES (
      r.contrato_id, r.unidad_id, r.arrendatario_id,
      8, 2026,
      r.pagare_numero,
      '2026-08-05',           -- fecha límite de pago agosto
      v_monto, 0, v_monto,
      'CP-2026-08-' || r.numero_local,
      'PAGADO',
      '2026-08-05',           -- fecha pago confirmada
      v_monto,
      'TRANSFERENCIA',
      true
    );

    RAISE NOTICE 'OK AGO26: % — $%', r.numero_local, v_monto;
  END LOOP;

END $ago_prp$;

-- ── Resultado ────────────────────────────────────────────────────────────────
SELECT
  cp.referencia_pago,
  a.nombre || ' ' || COALESCE(a.apellidos, '') AS arrendatario,
  u.numero_local,
  cp.monto_total,
  cp.estatus
FROM prp.cobros_programados cp
JOIN prp.contratos_arrendamiento c ON c.id = cp.contrato_id
JOIN prp.arrendatarios a ON a.id = c.arrendatario_id
JOIN prp.unidades u ON u.id = c.unidad_id
WHERE cp.mes = 8 AND cp.anio = 2026
ORDER BY u.numero_local;
