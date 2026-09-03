-- ================================================================
-- MIGRACIÓN 013: Sanciones otros periodos — ingresos julio 2026
-- Sanción = importe depositado − renta mensual del contrato
-- L8  MAY26: $19,250 − $17,500 = $1,750    factura 2152
-- L13 ABR26: $21,815.20 − $19,832 = $1,983.20  factura 2148
-- L34 FEB26: $18,832 − $17,120 = $1,712    factura 2144
-- L34 MAR26: $18,832 − $17,120 = $1,712    factura 2146
-- ================================================================

DO $sanciones$ BEGIN

  -- L8 SANCION MAY26
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT '2026-07-08', c.numero_contrato, c.locales_display,
    'SANCION', 5, 2026, '2152',
    1750.00, 1750.00,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'SANCION MAY26',
    'Sanción por mora: $19,250 depositado − $17,500 renta = $1,750',
    'REAL', c.id
  FROM public.contratos c WHERE c.numero_contrato = 'IWOL-2025-L08';

  -- L13 SANCION ABR26
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT '2026-07-07', c.numero_contrato, c.locales_display,
    'SANCION', 4, 2026, '2148',
    1983.20, 1983.20,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'SANCION ABR26',
    'Sanción por mora: $21,815.20 depositado − $19,832 renta = $1,983.20',
    'REAL', c.id
  FROM public.contratos c WHERE c.numero_contrato = 'IWOL-2025-L13';

  -- L34 SANCION FEB26
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT '2026-07-07', c.numero_contrato, c.locales_display,
    'SANCION', 2, 2026, '2144',
    1712.00, 1712.00,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'SANCION FEB26',
    'Sanción por mora: $18,832 depositado − $17,120 renta = $1,712',
    'REAL', c.id
  FROM public.contratos c WHERE c.numero_contrato = 'IWOL-2025-L34';

  -- L34 SANCION MAR26
  INSERT INTO public.ingresos (
    fecha, id_contrato, locales_contrato,
    tipo, mes, anio, factura,
    importe, importe_total,
    origen, concepto_origen, nota,
    creado_por, contrato_id
  )
  SELECT '2026-07-07', c.numero_contrato, c.locales_display,
    'SANCION', 3, 2026, '2146',
    1712.00, 1712.00,
    'TRANSFERENCIA BBVA - OTROS PERIODOS', 'SANCION MAR26',
    'Sanción por mora: $18,832 depositado − $17,120 renta = $1,712',
    'REAL', c.id
  FROM public.contratos c WHERE c.numero_contrato = 'IWOL-2025-L34';

END $sanciones$;

-- Verificar
SELECT i.id_contrato, i.concepto_origen, i.factura,
       TO_CHAR(i.importe, 'FM$999,999,990.00') AS importe, i.mes, i.anio
FROM public.ingresos i
WHERE i.tipo = 'SANCION'
ORDER BY i.id_contrato, i.anio, i.mes;
