-- 20260913110000_funciones_sin_execute_public.sql
-- Hallazgo del bloque 3 de scripts/verificar-post-migracion.mjs (QA, 2026-09-13):
-- la migración 20260913100000 revocó EXECUTE al rol anon, pero toda función nace con
-- EXECUTE para PUBLIC y anon lo hereda. Resultado: anon seguía pudiendo invocar 20 funciones
-- (las de escritura ya paran por la guardia es_staff(); log_bitacora quedaba abierta).
--
-- Corrección: EXECUTE explícito solo para authenticated y service_role, y que toda función
-- nueva nazca igual. Las funciones de trigger no requieren EXECUTE del usuario que dispara
-- el trigger, así que no se afectan. Reversible: GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA
-- public TO PUBLIC.

BEGIN;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT  EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- Mismo criterio para el esquema prp (generar_cobros_contrato y futuras)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA prp FROM PUBLIC, anon;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA prp TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA prp REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA prp GRANT  EXECUTE ON FUNCTIONS TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
