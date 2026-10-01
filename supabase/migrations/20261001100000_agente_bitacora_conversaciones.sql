-- Bitácora de conversaciones del Agente Operativo: qué preguntan y qué responde, para usarlo como
-- insumo de mejora. Dos tablas: una fila por conversación y una fila por turno (pregunta + respuesta).
--
-- Se escribe SOLO desde el servidor (chat-operativo.js, con SUPABASE_SERVICE_ROLE_KEY), sin importar el
-- rol de quien chatea — así la bitácora queda completa y no depende de que cada rol tenga permiso de
-- escritura en estas tablas. Lectura: solo es_admin() (super_admin/admin_inmobiliaria/gerente_plaza);
-- el resto del staff no necesita ver las conversaciones de otros para hacer su trabajo diario.

CREATE TABLE IF NOT EXISTS public.agente_conversaciones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rol            text,              -- mi_rol() al momento de conversar (asistente, gerente_plaza, …)
  canal          text DEFAULT 'web' CHECK (canal IN ('web','movil')),  -- flotante vs app del rol asistente
  titulo         text,              -- primera pregunta del usuario, recortada
  turnos         integer NOT NULL DEFAULT 0,
  creada_en      timestamptz NOT NULL DEFAULT now(),
  actualizada_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agente_mensajes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.agente_conversaciones(id) ON DELETE CASCADE,
  turno           integer NOT NULL,         -- 1, 2, 3… dentro de la conversación
  pregunta        text,                     -- mensaje del usuario en este turno (puede incluir fichas adjuntas)
  respuesta       text,                     -- texto que vio el usuario
  herramientas    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{nombre, entrada, resultado_resumen}] — sin datos sensibles crudos
  propuestas      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- acciones propuestas en este turno (accion, titulo, confirmar/aviso)
  modelo          text,
  duracion_ms     integer,
  error           text,                     -- si la llamada a Claude o a una herramienta falló
  creada_en       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agente_conversaciones_usuario ON public.agente_conversaciones(usuario_id, creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_agente_mensajes_conversacion  ON public.agente_mensajes(conversacion_id, turno);

ALTER TABLE public.agente_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_mensajes       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_lee_conversaciones ON public.agente_conversaciones;
CREATE POLICY admin_lee_conversaciones ON public.agente_conversaciones
  FOR SELECT TO authenticated USING (es_admin());

DROP POLICY IF EXISTS admin_lee_mensajes ON public.agente_mensajes;
CREATE POLICY admin_lee_mensajes ON public.agente_mensajes
  FOR SELECT TO authenticated USING (es_admin());

-- Nada de INSERT/UPDATE/DELETE para authenticated ni anon: solo el service_role (el propio
-- Netlify Function) escribe. ALTER DEFAULT PRIVILEGES del proyecto ya deja sin acceso a anon.
GRANT SELECT ON public.agente_conversaciones TO authenticated;
GRANT SELECT ON public.agente_mensajes       TO authenticated;

-- Vista para Reportes/BI: una fila por turno con el nombre del usuario, para no exponer auth.users.
CREATE OR REPLACE VIEW public.prp_agente_bitacora
  WITH (security_invoker = true) AS
SELECT
  m.id, m.conversacion_id, c.usuario_id, trim(concat(u.nombre, ' ', u.apellido)) AS usuario_nombre, c.rol, c.canal,
  c.titulo, m.turno, m.pregunta, m.respuesta, m.herramientas, m.propuestas,
  m.modelo, m.duracion_ms, m.error, m.creada_en
FROM public.agente_mensajes m
JOIN public.agente_conversaciones c ON c.id = m.conversacion_id
LEFT JOIN public.irp_usuarios u ON u.id = c.usuario_id
-- nombre_completo: irp_usuarios no tiene apellido único, se arma de nombre + apellido
ORDER BY m.creada_en DESC;

GRANT SELECT ON public.prp_agente_bitacora TO authenticated;

NOTIFY pgrst, 'reload schema';
