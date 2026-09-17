-- reset-ingresos-1a1.sql
-- Limpia ingresos y aplicaciones_pago, luego crea un ingreso por cada cargo
-- con estatus PAGADO, en relación 1-a-1 (un depósito = un cobro).
--
-- EJECUTAR SOLO EN QA o con backup previo.
-- Requiere ser superadmin / service_role.
--
-- Paso 1: Borrar todo

DELETE FROM aplicaciones_pago;
DELETE FROM ingresos;

-- Paso 2: Reiniciar secuencia si ingresos usa SERIAL (ajustar si usa uuid)
-- ALTER SEQUENCE ingresos_id_seq RESTART WITH 1;

-- Paso 3: Crear un ingreso por cada cargo PAGADO y aplicarlo 1-a-1
--
-- Asume que cargos_programados tiene:
--   id, contrato_id, importe, concepto, periodo_mes, periodo_anio, fecha_vencimiento,
--   estatus (PAGADO / PENDIENTE), fecha_pago (nullable)
--
-- Si el cargo no tiene fecha_pago usa fecha_vencimiento como fallback.

WITH cargos_pagados AS (
  SELECT
    id            AS cargo_id,
    contrato_id,
    importe,
    concepto,
    periodo_mes,
    periodo_anio,
    COALESCE(fecha_pago, fecha_vencimiento) AS fecha_pago
  FROM cargos_programados
  WHERE estatus = 'PAGADO'
),
ingresos_nuevos AS (
  INSERT INTO ingresos (
    contrato_id,
    tipo,
    mes,
    anio,
    fecha,
    importe,
    origen,
    concepto_origen,
    estatus_validacion,
    clasificacion,
    clasificacion_manual
  )
  SELECT
    contrato_id,
    concepto,          -- RENTA / AGUA / SANCION → tipo del cargo
    periodo_mes,
    periodo_anio,
    fecha_pago::date,
    importe,
    'TRANSFERENCIA BBVA',
    concepto || ' ' || periodo_mes || '/' || periodo_anio,
    'VALIDADO',
    concepto,          -- clasificacion = concepto del cargo
    false
  FROM cargos_pagados
  RETURNING id, contrato_id, importe, mes, anio
),
-- Para vincular el nuevo ingreso con el cargo correcto necesitamos
-- hacer match por contrato + mes + anio + importe (puede haber duplicados
-- si hay varios cargos del mismo tipo en el mismo mes; en ese caso se
-- asigna al primero por orden de id de cargo)
match AS (
  SELECT
    i.id   AS ingreso_id,
    cp.cargo_id,
    i.importe,
    ROW_NUMBER() OVER (PARTITION BY cp.cargo_id ORDER BY i.id) AS rn
  FROM ingresos_nuevos i
  JOIN cargos_pagados cp
    ON cp.contrato_id = i.contrato_id
    AND cp.periodo_mes = i.mes
    AND cp.periodo_anio = i.anio
    AND cp.importe = i.importe
)
INSERT INTO aplicaciones_pago (ingreso_id, cargo_id, importe_aplicado, fecha_aplicacion)
SELECT ingreso_id, cargo_id, importe, CURRENT_DATE
FROM match
WHERE rn = 1;

-- Verificación rápida: debe devolver 0 filas si todo está cuadrado
SELECT
  i.id              AS ingreso_id,
  i.importe         AS depositado,
  COALESCE(SUM(ap.importe_aplicado), 0) AS aplicado,
  i.importe - COALESCE(SUM(ap.importe_aplicado), 0) AS diferencia
FROM ingresos i
LEFT JOIN aplicaciones_pago ap ON ap.ingreso_id = i.id
GROUP BY i.id, i.importe
HAVING ABS(i.importe - COALESCE(SUM(ap.importe_aplicado), 0)) > 0.01
ORDER BY diferencia DESC;
