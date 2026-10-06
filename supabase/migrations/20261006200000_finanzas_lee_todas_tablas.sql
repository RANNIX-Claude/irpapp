-- finanzas_lee en todas las tablas de negocio (public + prp)
--
-- Contexto: en 20260929300000_rol_finanzas.sql, 'finanzas' se excluyó de
-- es_staff() para limitar su acceso. Solo se crearon políticas de lectura en
-- ingresos y contratos. Las demás tablas (cargos_programados, rh_empleados,
-- gastos_operativos, etc.) quedaron sin política finanzas → devuelven vacío.
--
-- Esta migración crea finanzas_lee (FOR SELECT) en TODA tabla de public y prp
-- usando un DO loop, de modo que el rol ve los mismos datos que el admin
-- pero solo puede leer (staff_all WITH CHECK bloquea sus escrituras).
--
-- Las políticas finanzas_lee_ingresos y finanzas_lee_contratos ya existentes
-- se recrean (DROP IF EXISTS + CREATE) para no tener conflicto.

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('public','prp')
      AND c.relname NOT IN ('irp_usuarios')  -- tiene sus propias políticas
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS finanzas_lee ON %I.%I',
      t.nspname, t.relname
    );
    -- Para tablas en public usamos la política genérica; la de ingresos/contratos
    -- tenía nombre distinto (finanzas_lee_ingresos, finanzas_lee_contratos) —
    -- las conservamos para no romper los permisos de escritura ya establecidos.
    EXECUTE format(
      $sql$
        CREATE POLICY finanzas_lee ON %I.%I
          FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.irp_usuarios
              WHERE id = auth.uid()
                AND activo = true
                AND rol_id = 'finanzas'
            )
          )
      $sql$,
      t.nspname, t.relname
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
