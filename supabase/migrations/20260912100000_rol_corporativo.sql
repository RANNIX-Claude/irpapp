-- Alta del rol "corporativo" y vínculo del usuario corporativo@iwol.mx
-- (creado a mano en Supabase Auth) con ese rol en irp_usuarios.

insert into public.irp_roles (id, nombre, descripcion, nivel, activo)
values ('corporativo', 'Corporativo', 'Acceso a Dashboard, Contratos, Resumen Semanal, RH/Nómina y Reportes', 50, true)
on conflict (id) do nothing;

insert into public.irp_usuarios (id, rol_id, nombre, apellido, activo)
values ('a1f25064-2454-460a-b563-ed6b740504df', 'corporativo', 'Usuario', 'Corporativo', true)
on conflict (id) do update set rol_id = excluded.rol_id, activo = excluded.activo;
