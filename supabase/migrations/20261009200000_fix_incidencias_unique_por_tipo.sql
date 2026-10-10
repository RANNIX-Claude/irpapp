-- Cambia el constraint UNIQUE de rh_incidencias de (empleado_id, fecha)
-- a (empleado_id, fecha, tipo) para permitir múltiples tipos de incidencia
-- el mismo día (ej: RETARDO + INCAPACIDAD en la misma fecha).
--
-- Si ya existe algún duplicado exacto (mismo empleado, fecha Y tipo),
-- la migración fallará con un error de constraint — en ese caso hay que
-- borrar los duplicados antes de aplicar.

BEGIN;

-- 1. Eliminar el constraint anterior
ALTER TABLE rh_incidencias
  DROP CONSTRAINT IF EXISTS rh_incidencias_empleado_id_fecha_key;

-- 2. También eliminar cualquier otro nombre que pudo haber tomado
ALTER TABLE rh_incidencias
  DROP CONSTRAINT IF EXISTS rh_incidencias_empleado_fecha_key;

-- 3. Crear el nuevo constraint incluyendo tipo
ALTER TABLE rh_incidencias
  ADD CONSTRAINT rh_incidencias_empleado_fecha_tipo_key
  UNIQUE (empleado_id, fecha, tipo);

COMMIT;
