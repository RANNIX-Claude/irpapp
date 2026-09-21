-- prp_cartera: derivar `estado` y restaurar security_invoker.
--
-- DOS problemas, uno de datos y uno de seguridad.
--
-- 1 · `estado` podía mentir.
--    `total_aplicado` y `saldo` se calculan en esta vista desde
--    aplicaciones_pago, pero `estado` se leía de la columna almacenada en
--    cargos_programados. El trigger trg_actualizar_cargo_estado la mantiene
--    bien en cada INSERT/UPDATE/DELETE de una aplicación — pero NO es la
--    única forma de escribirla: ExpedienteContrato.jsx y el modal de edición
--    de Cobranza.jsx hacen `update cargos_programados set estado = …`
--    directo, sin tocar ninguna aplicación, así que el trigger no dispara y
--    la columna se queda como la dejaron.
--    Resultado visible: un cargo con importe $10,000 y $10,000 aplicados
--    (saldo $0) marcado como PENDIENTE. El badge decía una cosa y los KPIs,
--    que suman `saldo`, decían otra. Derivándolo aquí ya no puede pasar:
--    el estado es una consecuencia de los pagos, no un dato aparte.
--    Se conserva CANCELADO de la columna, porque esa sí es una decisión
--    humana que no se deduce de los importes.
--    La regla y la tolerancia de 0.01 son las mismas que usa el trigger,
--    para que ambos digan siempre lo mismo.
--
-- 2 · La vista había perdido security_invoker.
--    20260913100000_cierre_rls_auditoria_tenant.sql se lo puso a todas las
--    vistas prp_* (`ALTER VIEW … SET (security_invoker = true)`), pero
--    20260917100000_prp_cartera_tiene_comprobante.sql la recreó con
--    CREATE OR REPLACE VIEW sin cláusula WITH, y eso BORRA las reloptions
--    (verificado en Postgres 16). Sin security_invoker la vista corre con
--    los privilegios de su dueño y se salta el RLS de cargos_programados y
--    aplicaciones_pago: un locatario podría leer la cartera de otros
--    contratos. Aquí se restaura explícitamente.
--    Confirmar con: select relname, reloptions from pg_class
--                    where relname = 'prp_cartera';

CREATE OR REPLACE VIEW public.prp_cartera
WITH (security_invoker = true) AS
SELECT
  cp.id,
  cp.contrato_id,
  cp.concepto,
  cp.descripcion,
  cp.periodo_mes,
  cp.periodo_anio,
  cp.importe,
  cp.fecha_vencimiento,
  CASE
    WHEN cp.estado = 'CANCELADO' THEN 'CANCELADO'
    WHEN COALESCE(SUM(ap.importe_aplicado), 0::numeric) >= cp.importe - 0.01 THEN 'PAGADO'
    WHEN COALESCE(SUM(ap.importe_aplicado), 0::numeric) > 0 THEN 'PARCIAL'
    ELSE 'PENDIENTE'
  END AS estado,
  -- La columna cruda, por si hace falta auditar la diferencia entre lo que
  -- alguien capturó a mano y lo que dicen los pagos.
  cp.estado AS estado_capturado,
  cp.generado_auto,
  cp.origen_cargo_id,
  COALESCE(SUM(ap.importe_aplicado), 0::numeric) AS total_aplicado,
  cp.importe - COALESCE(SUM(ap.importe_aplicado), 0::numeric) AS saldo,
  con.folio AS contrato_folio,
  con.arrendatario_nombre,
  con.renta_mensual,
  con.inmueble_nombre,
  con.locales_display,
  con.locales_referencia,
  EXISTS (
    SELECT 1
    FROM aplicaciones_pago ap2
    JOIN ingresos i ON i.id = ap2.ingreso_id
    WHERE ap2.cargo_id = cp.id
      AND i.comprobante_url IS NOT NULL
  ) AS tiene_comprobante
FROM cargos_programados cp
LEFT JOIN aplicaciones_pago ap ON ap.cargo_id = cp.id
LEFT JOIN prp_contratos con ON con.id = cp.contrato_id
GROUP BY cp.id, con.id, con.folio, con.arrendatario_nombre,
         con.renta_mensual, con.inmueble_nombre, con.locales_display, con.locales_referencia;

NOTIFY pgrst, 'reload schema';
