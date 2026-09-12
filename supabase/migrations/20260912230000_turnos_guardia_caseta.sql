-- Rol de guardia: qué empleado cubre el turno de 24h cada día (Humberto y
-- Demetrio se van alternando la caseta). El administrador lo captura por
-- semana; sirve para cruzar contra la asistencia real y contra el respaldo
-- de IwolPark (el sistema de estacionamiento ya registra quién operó la
-- caseta como cajero, aunque el reloj biométrico no lo haya marcado).

CREATE TABLE IF NOT EXISTS public.rh_turnos_guardia (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       date NOT NULL UNIQUE,
  empleado_id uuid NOT NULL REFERENCES public.rh_empleados(id) ON DELETE CASCADE,
  notas       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE public.rh_turnos_guardia IS
  'Quien tiene programado cubrir la guardia de 24h cada dia. Un renglon por fecha.';

ALTER TABLE public.rh_turnos_guardia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_rh_turnos_guardia ON public.rh_turnos_guardia;
CREATE POLICY auth_rh_turnos_guardia ON public.rh_turnos_guardia
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.prp_turnos_guardia AS
SELECT t.id, t.fecha, t.empleado_id, t.notas,
       (e.nombre || ' ' || e.apellido_pat) AS nombre_completo,
       e.numero_empleado
  FROM public.rh_turnos_guardia t
  JOIN public.rh_empleados e ON e.id = t.empleado_id;

NOTIFY pgrst, 'reload schema';
