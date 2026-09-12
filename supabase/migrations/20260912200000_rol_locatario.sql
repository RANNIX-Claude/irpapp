-- Rol "locatario": un usuario por contrato/local, que solo puede ver el
-- expediente de SU contrato (no la lista completa) y subir comprobantes
-- de pago sin aplicarlos (eso lo sigue haciendo un admin desde Ingresos).

ALTER TABLE public.irp_usuarios
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES public.contratos(id);

INSERT INTO public.irp_roles (id, nombre, descripcion, nivel, activo)
VALUES ('locatario', 'Locatario', 'Ve unicamente el expediente de su propio contrato; sube comprobantes de pago sin aplicarlos', 90, true)
ON CONFLICT (id) DO NOTHING;
