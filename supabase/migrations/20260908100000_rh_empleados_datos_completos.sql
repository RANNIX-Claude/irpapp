-- MIGRACIÓN: campos faltantes del expediente de empleado
--
-- El Expediente Digital ya pinta estos datos, pero no existían como columnas ni
-- había dónde capturarlos, así que salían siempre en "—":
--   Datos laborales : centro de trabajo, supervisor, tipo de jornada
--   Domicilio       : solo existía `direccion` como texto libre, sin desglose
--   Contacto        : sin teléfono fijo ni contacto de emergencia
--   Personales      : sin estado civil, escolaridad, nacionalidad ni lugar de nacimiento
--
-- Ya existían y NO se tocan: fecha_nacimiento, direccion, banco, cuenta_clabe.
-- Esos no salían por otra razón: la vista prp_empleados no los expone. Ver la
-- nota al final.
--
-- Todas las columnas son opcionales: la migración no rompe ningún registro
-- existente ni ninguna pantalla actual.

-- ── Datos laborales ─────────────────────────────────────────────────────────
-- El fin de contrato NO se agrega aqui: ya vive en rh_contratos y la vista lo
-- expone como contrato_fin. Duplicarlo daria dos fuentes de verdad.
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS centro_trabajo  text,
  ADD COLUMN IF NOT EXISTS supervisor      text,
  ADD COLUMN IF NOT EXISTS tipo_jornada    text;

-- ── Domicilio desglosado ────────────────────────────────────────────────────
-- Se conserva `direccion` (texto libre ya capturado). El desglose es para los
-- documentos que exigen domicilio completo: contrato laboral, alta ante el
-- IMSS y constancias.
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS calle                  text,
  ADD COLUMN IF NOT EXISTS numero_ext             text,
  ADD COLUMN IF NOT EXISTS numero_int             text,
  ADD COLUMN IF NOT EXISTS colonia                text,
  ADD COLUMN IF NOT EXISTS municipio              text,
  ADD COLUMN IF NOT EXISTS estado_domicilio       text,
  ADD COLUMN IF NOT EXISTS codigo_postal          text,
  ADD COLUMN IF NOT EXISTS referencias_domicilio  text;

-- ── Contacto y emergencia ───────────────────────────────────────────────────
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS telefono_fijo                  text,
  ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre     text,
  ADD COLUMN IF NOT EXISTS contacto_emergencia_telefono   text,
  ADD COLUMN IF NOT EXISTS contacto_emergencia_parentesco text;

-- ── Datos personales ────────────────────────────────────────────────────────
ALTER TABLE public.rh_empleados
  ADD COLUMN IF NOT EXISTS estado_civil       text,
  ADD COLUMN IF NOT EXISTS escolaridad        text,
  ADD COLUMN IF NOT EXISTS nacionalidad       text,
  ADD COLUMN IF NOT EXISTS lugar_nacimiento   text;

COMMENT ON COLUMN public.rh_empleados.direccion IS
  'Domicilio en una línea (captura histórica). Para documentos formales usar el desglose calle/colonia/municipio/codigo_postal.';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- PENDIENTE APARTE — la vista prp_empleados
-- ─────────────────────────────────────────────────────────────
-- prp_empleados no expone fecha_nacimiento, direccion, banco ni cuenta_clabe,
-- y tampoco expondrá las columnas de arriba. Su definición no está versionada
-- en este repo, así que esta migración NO la recrea: hacerlo a ciegas la
-- destruiría.
--
-- Mientras tanto el frontend lee estos campos directo de rh_empleados (ver
-- EditarEmpleadoModal en RH.jsx y ExpedienteEmpleado.jsx). Cuando se recupere
-- la definición de la vista, conviene agregarle estas columnas y volver a la
-- convención de leer por vista.
--
-- VERIFICACIÓN (correr después de aplicar):
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'rh_empleados'
--  order by ordinal_position;
