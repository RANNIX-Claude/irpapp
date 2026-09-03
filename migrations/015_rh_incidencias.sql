-- ================================================================
-- MIGRACIÓN 015: Tabla rh_incidencias
-- Captura de inasistencias y otras incidencias por fecha para
-- su descuento automático en la nómina semanal
-- ================================================================

CREATE TABLE IF NOT EXISTS public.rh_incidencias (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID        NOT NULL REFERENCES public.rh_empleados(id) ON DELETE CASCADE,
  fecha         DATE        NOT NULL,
  tipo          TEXT        NOT NULL DEFAULT 'INASISTENCIA',
  -- INASISTENCIA | RETARDO | PERMISO_CON_GOCE | PERMISO_SIN_GOCE | VACACIONES | INCAPACIDAD
  descripcion   TEXT,
  afecta_nomina BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Si es INASISTENCIA o PERMISO_SIN_GOCE afecta_nomina=TRUE
  -- Si es PERMISO_CON_GOCE o VACACIONES afecta_nomina=FALSE
  semana_inicio DATE,       -- Lunes de la semana a la que pertenece
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT        DEFAULT 'SISTEMA',
  CONSTRAINT rh_incidencias_tipo_check
    CHECK (tipo IN ('INASISTENCIA','RETARDO','PERMISO_CON_GOCE','PERMISO_SIN_GOCE','VACACIONES','INCAPACIDAD')),
  UNIQUE (empleado_id, fecha, tipo)
);

-- Índice para búsqueda por semana
CREATE INDEX IF NOT EXISTS idx_rh_incidencias_semana
  ON public.rh_incidencias (semana_inicio, empleado_id);

CREATE INDEX IF NOT EXISTS idx_rh_incidencias_fecha
  ON public.rh_incidencias (fecha, empleado_id);

-- RLS
ALTER TABLE public.rh_incidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_incidencias_all" ON public.rh_incidencias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Vista para nómina semanal ──────────────────────────────────────────
-- Retorna el resumen de incidencias por empleado en un rango de fechas
CREATE OR REPLACE VIEW public.prp_incidencias AS
SELECT
  i.id,
  i.empleado_id,
  e.nombre || ' ' || e.apellido_pat ||
    COALESCE(' ' || e.apellido_mat, '') AS nombre_completo,
  e.numero_empleado,
  e.puesto,
  i.fecha,
  i.tipo,
  i.descripcion,
  i.afecta_nomina,
  i.semana_inicio,
  i.created_at
FROM public.rh_incidencias i
JOIN public.rh_empleados e ON e.id = i.empleado_id
ORDER BY i.fecha DESC, nombre_completo;

COMMENT ON TABLE public.rh_incidencias IS
  'Registro de incidencias laborales (inasistencias, retardos, permisos) para descuento en nómina semanal';

-- Verificar
SELECT 'Tabla rh_incidencias creada correctamente' AS status;
