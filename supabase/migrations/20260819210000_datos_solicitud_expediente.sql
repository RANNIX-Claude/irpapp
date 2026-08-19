-- Agrega columna JSONB para almacenar todos los datos de la solicitud de arrendamiento
-- Inquilino: datos personales, domicilio, económicos, referencias, etc.
-- Fiador: igual + inmueble en garantía + datos de escritura

ALTER TABLE public.prospecto_personas
  ADD COLUMN IF NOT EXISTS datos_solicitud JSONB DEFAULT '{}';

COMMENT ON COLUMN public.prospecto_personas.datos_solicitud IS
  'Formulario completo de solicitud de arrendamiento (campos de póliza jurídica Maison Legal)';
