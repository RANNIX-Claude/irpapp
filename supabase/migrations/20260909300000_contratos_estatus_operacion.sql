-- MIGRACIÓN: estatus de operación del contrato
--
-- Un contrato tiene dos condiciones que no siempre coinciden:
--
--   estatus            VIGENTE / VENCIDO      la del papel, según su fecha
--   estatus_operacion  OCUPADO / DESOCUPADO   la de la plaza
--
-- Hoy 8 de los 21 locales en operación tienen el contrato vencido: la
-- renovación no se formalizó pero siguen ocupando y pagando. Para cobranza
-- manda el segundo eje: si el local está ocupado, esa renta se cobra en el mes,
-- la pague o la deba.

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS estatus_operacion text NOT NULL DEFAULT 'OCUPADO';

DO $$ BEGIN
  ALTER TABLE public.contratos
    ADD CONSTRAINT contratos_estatus_operacion_chk
    CHECK (estatus_operacion IN ('OCUPADO','DESOCUPADO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.contratos.estatus_operacion IS
  'Condición real del local, independiente de la vigencia del contrato. OCUPADO entra en lo que se debe cobrar cada mes.';

-- ── Poblado inicial ─────────────────────────────────────────────────────────
-- Ocupado = registró pago de renta en los últimos 90 días. Es la evidencia
-- disponible; de aquí en adelante el campo se captura a mano.
UPDATE public.contratos c
   SET estatus_operacion = CASE
     WHEN EXISTS (
       SELECT 1 FROM public.ingresos i
        WHERE i.contrato_id = c.id
          AND i.tipo = 'RENTA'
          AND i.fecha >= current_date - interval '90 days'
     ) THEN 'OCUPADO' ELSE 'DESOCUPADO'
   END;

-- ── Corrección del estatus del contrato ─────────────────────────────────────
-- Se captura a mano y quedó desalineado en ambos sentidos: hay contratos
-- marcados VENCIDO cuya fecha no ha llegado (L36 y L18 vencen el 14-sep,
-- L37/L38 el 05-oct) y vencidos que siguen como vigentes. Se alinea con la
-- fecha, que es el dato objetivo. No se tocan RENOVADO ni RESCISION: esos son
-- decisiones, no fechas.
UPDATE public.contratos
   SET estatus = CASE
     WHEN fecha_fin IS NULL      THEN 'VIGENTE'
     WHEN fecha_fin >= current_date THEN 'VIGENTE'
     ELSE 'VENCIDO'
   END
 WHERE estatus IN ('VIGENTE','VENCIDO');

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select estatus, estatus_operacion, count(*), sum(renta_mensual)
--   from public.contratos group by 1,2 order by 1,2;
--
-- Lo que se debe cobrar al mes:
-- select count(*), sum(renta_mensual) from public.contratos
--  where estatus_operacion = 'OCUPADO';
--
-- NOTA: prp_contratos no expondrá la columna nueva por sí sola. Mientras la
-- vista no se versione, el frontend la lee de public.contratos.
