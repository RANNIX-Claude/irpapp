-- ============================================================
-- Corrección: local_ids de un dígito → dos dígitos con cero
-- L1→L01, L2→L02, ... L9→L09
-- Afecta: PK cat_locales.id_local, FKs en contratos_locales,
--         ingresos y pagos, y columnas de texto en contratos,
--         ingresos y cargos_programados.
-- ============================================================

BEGIN;

-- ── 1. Soltar FK constraints ──────────────────────────────────────────────────
ALTER TABLE public.contratos_locales DROP CONSTRAINT IF EXISTS contratos_locales_local_id_fkey;
ALTER TABLE public.ingresos          DROP CONSTRAINT IF EXISTS ingresos_local_id_fkey;
ALTER TABLE public.pagos             DROP CONSTRAINT IF EXISTS pagos_local_id_fkey;

-- ── 2. Actualizar PK en cat_locales ─────────────────────────────────────────
UPDATE public.cat_locales
SET    id_local    = 'L0' || substring(id_local FROM 2),
       numero_local = CASE
                        WHEN numero_local ~ '^L[1-9]$'
                        THEN 'L0' || substring(numero_local FROM 2)
                        ELSE numero_local
                      END
WHERE  id_local ~ '^L[1-9]$';

-- ── 3. Actualizar FK columns (hijos) ─────────────────────────────────────────
UPDATE public.contratos_locales
SET    local_id = 'L0' || substring(local_id FROM 2)
WHERE  local_id ~ '^L[1-9]$';

UPDATE public.ingresos
SET    local_id = 'L0' || substring(local_id FROM 2)
WHERE  local_id ~ '^L[1-9]$';

UPDATE public.pagos
SET    local_id = 'L0' || substring(local_id FROM 2)
WHERE  local_id ~ '^L[1-9]$';

-- ── 4. Restaurar FK constraints ───────────────────────────────────────────────
ALTER TABLE public.contratos_locales
  ADD CONSTRAINT contratos_locales_local_id_fkey
  FOREIGN KEY (local_id) REFERENCES public.cat_locales(id_local);

ALTER TABLE public.ingresos
  ADD CONSTRAINT ingresos_local_id_fkey
  FOREIGN KEY (local_id) REFERENCES public.cat_locales(id_local) ON DELETE RESTRICT;

ALTER TABLE public.pagos
  ADD CONSTRAINT pagos_local_id_fkey
  FOREIGN KEY (local_id) REFERENCES public.cat_locales(id_local);

-- ── 5. Columnas de texto con referencias a locales ────────────────────────────
-- Patrón: L seguida de un dígito 1-9 en límite de palabra (\b)
-- Ejemplos: 'L8-L9' → 'L08-L09', 'L8|L9' → 'L08|L09', 'L8' sola → 'L08'
-- NO afecta: L10, L18, L08 (ya correctos)

UPDATE public.contratos
SET    locales_referencia = regexp_replace(locales_referencia, 'L([1-9])\b', 'L0\1', 'g')
WHERE  locales_referencia ~ 'L[1-9]\b';

UPDATE public.contratos
SET    locales_display = regexp_replace(locales_display, 'L([1-9])\b', 'L0\1', 'g')
WHERE  locales_display ~ 'L[1-9]\b';

UPDATE public.ingresos
SET    id_contrato = regexp_replace(id_contrato, 'L([1-9])\b', 'L0\1', 'g')
WHERE  id_contrato ~ 'L[1-9]\b';

UPDATE public.ingresos
SET    locales_contrato = regexp_replace(locales_contrato, 'L([1-9])\b', 'L0\1', 'g')
WHERE  locales_contrato ~ 'L[1-9]\b';

UPDATE public.cargos_programados
SET    descripcion = regexp_replace(descripcion, 'L([1-9])\b', 'L0\1', 'g')
WHERE  descripcion ~ 'L[1-9]\b';

-- ── 6. Verificación post-migración ───────────────────────────────────────────
DO $$
DECLARE
  cnt_cat   INT;
  cnt_cl    INT;
  cnt_ing   INT;
  cnt_pag   INT;
  cnt_cont  INT;
BEGIN
  SELECT COUNT(*) INTO cnt_cat FROM public.cat_locales       WHERE id_local      ~ '^L[1-9]$';
  SELECT COUNT(*) INTO cnt_cl  FROM public.contratos_locales WHERE local_id      ~ '^L[1-9]$';
  SELECT COUNT(*) INTO cnt_ing FROM public.ingresos          WHERE local_id      ~ '^L[1-9]$';
  SELECT COUNT(*) INTO cnt_pag FROM public.pagos             WHERE local_id      ~ '^L[1-9]$';
  SELECT COUNT(*) INTO cnt_cont FROM public.contratos        WHERE locales_referencia ~ 'L[1-9]\b';

  IF cnt_cat > 0 OR cnt_cl > 0 OR cnt_ing > 0 OR cnt_pag > 0 OR cnt_cont > 0 THEN
    RAISE EXCEPTION 'Quedan registros sin corregir: cat_locales=%, contratos_locales=%, ingresos=%, pagos=%, contratos=%',
      cnt_cat, cnt_cl, cnt_ing, cnt_pag, cnt_cont;
  ELSE
    RAISE NOTICE 'OK — todos los local_ids de un dígito fueron corregidos.';
  END IF;
END $$;

COMMIT;
