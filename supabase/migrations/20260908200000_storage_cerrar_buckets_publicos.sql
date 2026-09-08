-- ETAPA 2 (cierre) — quita el acceso público a los buckets que quedaban
-- abiertos. Completa el trabajo iniciado en
-- 20260829120000_storage_privado_urls_firmadas.sql
--
-- CONDICIONES QUE YA SE CUMPLEN (verificadas antes de escribir esto):
--
--   1. Los cinco buckets tienen políticas SELECT para authenticated:
--      facturas-cfdi, tickets-gastos y vending-reportes en 20260903100000;
--      comprobantes-pago en 20260819220000; expedientes-docs en 20260907100000.
--      Sin ellas, cerrar el bucket rompe también la lectura firmada.
--
--   2. El frontend ya no pinta ninguna URL de Storage directa: todo pasa por
--      urlFirmada() vía src/components/ui/ArchivoPrivado.jsx. Las columnas que
--      guardan la URL pública completa siguen funcionando porque urlFirmada()
--      extrae la ruta de ese formato.
--
-- `avatars` NO se cierra: es público a propósito (fotos de empleados, se pintan
-- con <img src> directo y no hay dato sensible).
--
-- REVERSIBLE: si algo deja de verse, basta con volver a poner public = true en
-- el bucket afectado.

begin;

update storage.buckets
   set public = false
 where id in (
   'facturas-cfdi',
   'tickets-gastos',
   'vending-reportes',
   'comprobantes-pago',
   'expedientes-docs'
 );

commit;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr después de aplicar)
-- ─────────────────────────────────────────────────────────────
-- select id, public from storage.buckets order by id;
--   -> solo avatars debe quedar en true
--
-- Y en la app, con sesión iniciada, revisar que siguen abriendo:
--   Gastos Operativos -> ticket de un gasto
--   Ingresos          -> comprobante
--   Vending           -> reporte de la semana
--   Expediente        -> documento del empleado
--   Portal arrendatario -> factura PDF y contrato
