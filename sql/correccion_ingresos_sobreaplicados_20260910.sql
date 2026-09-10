-- ============================================================================
-- CORRECCIÓN DE DATOS — ingresos aplicados por más de lo que valen
-- Preparado 2026-09-10. NO EJECUTADO: toca registros preexistentes y requiere
-- autorización expresa. Revisar caso por caso antes de correr nada.
--
--   node scripts/run-sql.mjs sql/correccion_ingresos_sobreaplicados_20260910.sql
--
-- Corre dentro de una transacción (run-sql.mjs) y hace rollback si algo falla.
-- ============================================================================

-- ── Diagnóstico previo: así se ve el problema hoy ───────────────────────────
--   select * from prp_ingresos_descuadrados where problema = 'SOBRE_APLICADO';
--
--   ingreso | fecha      | importe   | aplicado  | diferencia
--   --------+------------+-----------+-----------+-----------
--       111 | 2026-08-26 | 18,500.00 | 37,000.00 | +18,500.00
--       380 | 2026-08-06 | 18,872.00 | 31,500.00 | +12,628.00
--       369 | 2026-08-03 | 39,273.00 | 39,273.20 |      +0.20


-- ── CASO 1 — Ingreso 111 (L16, Denys Retama, 2026-08-26, $18,500) ───────────
-- Tres aplicaciones por $37,000:
--   31b6ccdb  $18,500  RENTA 8/2026   creada 2026-09-03  ← la vieja
--   faec14d5  $17,000  RENTA 7/2026   creada 2026-09-10  ← distribución correcta
--   83511fcf   $1,500  SANCION 8/2026 creada 2026-09-10  ← distribución correcta
-- El 26 de agosto se aplicó el depósito completo a la renta de agosto; ayer se
-- redistribuyó a julio + sanción, pero la de agosto nunca se borró.
--
-- Efecto: el cargo RENTA 8/2026 de L16 (3e1b9826, $18,500) se queda sin
-- aplicaciones y el trigger lo regresa de PAGADO a PENDIENTE. Es lo correcto:
-- con $18,500 se pagaron julio ($17,000) y la sanción ($1,500); agosto sigue
-- debiéndose completo.
delete from public.aplicaciones_pago
 where id = '31b6ccdb-a94a-4b97-93d7-8a2570d8d120';


-- ── CASO 2 — Ingreso 380 (L14, Luky González, 2026-08-06, $18,872) ──────────
-- Una sola aplicación de $31,500 contra RENTA 9/2026 del contrato IWOL-2025-L3132
-- (Grupo Oaklife) — o sea, colgada del ingreso equivocado: ni el importe ni el
-- contrato coinciden. El pago real de Oaklife sí está capturado: es el ingreso
-- 381 (2026-09-03, $31,500, contrato de Oaklife) y hoy está sin distribuir.
--
-- No se borra: se mueve al ingreso al que pertenece. El cargo RENTA 9/2026 de
-- Oaklife se queda igual (PAGADO, saldo 0), que es lo correcto — Oaklife sí pagó.
-- El ingreso 380 (L14) queda sin distribución, para que se aplique a los cargos
-- que realmente cubre.
update public.aplicaciones_pago
   set ingreso_id      = 381,
       fecha_aplicacion = '2026-09-03',
       nota            = coalesce(nota || ' · ', '') || 'Reasignada del ingreso 380 (captura en el ingreso equivocado) — 2026-09-10'
 where id = 'fde241b2-a74a-491c-8600-752c300ac475';


-- ── CASO 3 — Ingreso 369 (L6/L7, Vorwerk, 2026-08-03) — NO SE TOCA ──────────
-- $39,273.00 de depósito contra una aplicación de $39,273.20. Los 20 centavos
-- no son una aplicación duplicada: el cargo RENTA 8/2026 es de $39,273.20 y el
-- importe capturado del depósito se redondeó a pesos. Es un dato de captura,
-- no un problema de distribución, y decidirlo es del usuario:
--
--   a) Si el banco muestra $39,273.20, lo que está mal es el ingreso:
--        update public.ingresos set importe = 39273.20 where id = 369;
--      (el cargo se queda PAGADO, todo cuadra)
--
--   b) Si el banco muestra $39,273.00, lo que está mal es la aplicación:
--        update public.aplicaciones_pago set importe_aplicado = 39273.00
--         where id = 'e704e2bd-eeaf-4202-ba6c-97a613ecb773';
--      (el cargo pasa a PARCIAL con $0.20 de saldo, que habría que condonar
--       o cobrar)
--
-- Mientras no se decida, el ingreso 369 se puede seguir editando salvo que se
-- cambie su importe: ahí el guardián de la base pediría cuadrarlo primero.


-- ── Verificación (correr después, debe quedar sin filas de SOBRE_APLICADO) ──
--   select * from prp_ingresos_descuadrados order by problema, ingreso_id;
