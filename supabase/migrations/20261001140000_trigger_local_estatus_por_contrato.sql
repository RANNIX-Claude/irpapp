-- Sincronizar automáticamente cat_locales.estatus cuando cambia
-- contratos.estatus_proceso o contratos.estatus.
--
-- Reglas de negocio:
--   EN_CONTRATACION        → BLOQUEADO  (anticipo recibido, ya no disponible)
--   EN_EJECUCION           → OCUPADO    (contrato vigente en curso)
--   EN_RENOVACION          → OCUPADO    (renovación en trámite, sigue ocupado)
--   TERMINADO / SUSPENDIDO → DISPONIBLE (desocupado; solo si no tiene otro
--                                        contrato activo sobre el mismo local)
--
-- El trigger corre AFTER UPDATE en contratos y también AFTER INSERT
-- para que NuevoContratoModal (que inserta directo sin pasar por funciones)
-- también deje el local en el estado correcto.

CREATE OR REPLACE FUNCTION public.trg_fn_local_estatus_por_contrato()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_local       TEXT;
  v_ep_nuevo    TEXT;
  v_ep_viejo    TEXT;
  v_est_nuevo   TEXT;
  v_est_local   TEXT;
BEGIN
  v_ep_nuevo  := NEW.estatus_proceso;
  v_ep_viejo  := OLD.estatus_proceso;   -- NULL en INSERT
  v_est_nuevo := NEW.estatus;

  -- Recorrer cada local asociado al contrato
  FOR v_local IN
    SELECT local_id FROM public.contratos_locales WHERE contrato_id = NEW.id
  LOOP
    -- ¿Qué estatus merece el local según este contrato?
    IF v_ep_nuevo IN ('EN_EJECUCION','EN_RENOVACION') THEN
      v_est_local := 'OCUPADO';
    ELSIF v_ep_nuevo = 'EN_CONTRATACION' THEN
      v_est_local := 'BLOQUEADO';
    ELSIF v_ep_nuevo IN ('TERMINADO','SUSPENDIDO')
       OR v_est_nuevo IN ('CANCELADO','RESCISION') THEN
      -- Solo liberar si no existe OTRO contrato activo en este local
      IF EXISTS (
        SELECT 1
        FROM public.contratos c2
        JOIN public.contratos_locales cl2 ON cl2.contrato_id = c2.id
        WHERE cl2.local_id = v_local
          AND c2.id <> NEW.id
          AND c2.estatus_proceso IN ('EN_CONTRATACION','EN_EJECUCION','EN_RENOVACION')
      ) THEN
        CONTINUE;  -- otro contrato lo mantiene ocupado/bloqueado
      END IF;
      v_est_local := 'DISPONIBLE';
    ELSE
      CONTINUE;  -- estatus no reconocido, no tocar
    END IF;

    UPDATE public.cat_locales
    SET estatus           = v_est_local,
        contrato_activo_id = CASE
          WHEN v_est_local IN ('OCUPADO','BLOQUEADO') THEN NEW.id
          ELSE NULL
        END,
        updated_at = now()
    WHERE id_local = v_local
      AND estatus IS DISTINCT FROM v_est_local;
  END LOOP;

  RETURN NEW;
END;
$$;

-- UPDATE: cambio de estatus_proceso o estatus → re-evaluar locales
DROP TRIGGER IF EXISTS trg_local_estatus_update ON public.contratos;
CREATE TRIGGER trg_local_estatus_update
  AFTER UPDATE OF estatus_proceso, estatus ON public.contratos
  FOR EACH ROW
  WHEN (OLD.estatus_proceso IS DISTINCT FROM NEW.estatus_proceso
     OR OLD.estatus         IS DISTINCT FROM NEW.estatus)
  EXECUTE FUNCTION public.trg_fn_local_estatus_por_contrato();

-- Trigger en contratos_locales: cuando se asocia un local a un contrato
-- (INSERT directo desde NuevoContratoModal) actualizar el local según el
-- estatus_proceso del contrato padre.
CREATE OR REPLACE FUNCTION public.trg_fn_cl_local_estatus()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ep   TEXT;
  v_est  TEXT;
  v_cid  UUID;
BEGIN
  SELECT estatus_proceso, estatus, id
    INTO v_ep, v_est, v_cid
    FROM public.contratos WHERE id = NEW.contrato_id;

  IF v_ep IN ('EN_EJECUCION','EN_RENOVACION') THEN
    UPDATE public.cat_locales
    SET estatus = 'OCUPADO', contrato_activo_id = v_cid, updated_at = now()
    WHERE id_local = NEW.local_id;

  ELSIF v_ep = 'EN_CONTRATACION' THEN
    UPDATE public.cat_locales
    SET estatus = 'BLOQUEADO', contrato_activo_id = v_cid, updated_at = now()
    WHERE id_local = NEW.local_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cl_local_estatus ON public.contratos_locales;
CREATE TRIGGER trg_cl_local_estatus
  AFTER INSERT ON public.contratos_locales
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_cl_local_estatus();

-- Sincronizar los locales que ya existen con el estado actual de sus contratos
-- (corrige cualquier desincronía previa sin tocar locales en EN_OBRA/BLOQUEADO manual)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (cl.local_id)
      cl.local_id,
      c.id             AS contrato_id,
      c.estatus_proceso,
      c.estatus
    FROM public.contratos_locales cl
    JOIN public.contratos c ON c.id = cl.contrato_id
    ORDER BY cl.local_id,
      -- preferir el contrato más "activo"
      CASE c.estatus_proceso
        WHEN 'EN_EJECUCION'   THEN 1
        WHEN 'EN_RENOVACION'  THEN 2
        WHEN 'EN_CONTRATACION' THEN 3
        ELSE 9
      END,
      c.fecha_inicio DESC
  LOOP
    IF r.estatus_proceso IN ('EN_EJECUCION','EN_RENOVACION') THEN
      UPDATE public.cat_locales
      SET estatus = 'OCUPADO', contrato_activo_id = r.contrato_id, updated_at = now()
      WHERE id_local = r.local_id AND estatus <> 'OCUPADO';

    ELSIF r.estatus_proceso = 'EN_CONTRATACION' THEN
      UPDATE public.cat_locales
      SET estatus = 'BLOQUEADO', contrato_activo_id = r.contrato_id, updated_at = now()
      WHERE id_local = r.local_id AND estatus NOT IN ('OCUPADO','BLOQUEADO');

    ELSIF r.estatus_proceso IN ('TERMINADO','SUSPENDIDO')
       OR r.estatus IN ('CANCELADO','RESCISION') THEN
      UPDATE public.cat_locales
      SET estatus = 'DISPONIBLE', contrato_activo_id = NULL, updated_at = now()
      WHERE id_local = r.local_id AND estatus NOT IN ('OCUPADO','BLOQUEADO','EN_OBRA');
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
