-- MIGRACIÓN: logo por contrato
--
-- El logo vivía solo en arrendatarios.logo_url, así que al cambiarlo desde la
-- tarjeta de un contrato se reflejaba en todos los contratos del mismo
-- arrendatario (p. ej. el contrato renovado y el vigente, o dos giros distintos
-- de la misma persona). Ahora cada contrato lleva su propio logo; el del
-- arrendatario queda como respaldo cuando el contrato no tiene uno.

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.contratos.logo_url IS
  'Logo del negocio de este contrato (bucket público logos-arrendatarios, carpeta contratos/). Si es null se usa arrendatarios.logo_url.';

NOTIFY pgrst, 'reload schema';
