-- crear_empleado y renovar_contrato: aceptar también a la service_role key.
--
-- El rol `asistente` no tiene permisos de escritura directos; escribe a través de la
-- Netlify Function `ejecutar-accion`, que valida sesión, rol, firma y caducidad y luego
-- opera con la service_role key. Estas dos funciones exigen `es_staff()`, que depende de
-- auth.uid() y por lo tanto es falso para la service_role key (sin usuario). En vez de
-- copiar sus cuerpos (y arriesgar que diverjan de los originales), se reescribe SOLO la
-- guarda a partir de su definición vigente.
--
-- Efecto: la guarda pasa de `es_staff()` a `es_staff() OR auth.role() = 'service_role'`.
-- No abre nada a usuarios: `authenticated` sigue necesitando es_staff(), y el asistente
-- (que no es staff) sigue sin poder llamarlas directo. La service_role key ya salta toda
-- la RLS por diseño de la plataforma.

DO $$
DECLARE
  f   regprocedure;
  def text;
  nuevo text;
  n int := 0;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('crear_empleado', 'renovar_contrato')
  LOOP
    def := pg_get_functiondef(f);
    IF def LIKE '%auth.role() = ''service_role''%' THEN CONTINUE; END IF;   -- ya parchada
    nuevo := replace(def,
      'IF NOT public.es_staff() THEN',
      'IF NOT (public.es_staff() OR auth.role() = ''service_role'') THEN');
    IF nuevo = def THEN
      RAISE EXCEPTION 'No se encontró la guarda es_staff() en %: revisar a mano', f;
    END IF;
    EXECUTE nuevo;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Funciones parchadas: %', n;
END $$;

NOTIFY pgrst, 'reload schema';
