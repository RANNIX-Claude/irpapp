-- Agrega foto de portada a proyectos (para vista mosaico)
ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS foto_portada_url TEXT;
