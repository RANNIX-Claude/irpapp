-- Rol propietario: vista ejecutiva para el dueño de la plaza
INSERT INTO irp_roles (id, nombre, descripcion)
VALUES ('propietario', 'Propietario', 'Vista ejecutiva: informe semanal, EDR, contratos, RH y reportes')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
