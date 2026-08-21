-- Fuerza recarga del schema cache de PostgREST (fix "database schema is invalid or incompatible")
NOTIFY pgrst, 'reload schema';
