# Backlog IRP

Peticiones pendientes agrupadas por módulo. Al abrir una sesión de trabajo, copiar
solo la sección del módulo que se va a atacar — no el archivo completo.

Formato de cada línea: `- [ ] #NNN descripción (pantalla/archivo si se sabe)`
Al resolver: marcar `[x]` y agregar fecha, no borrar la línea (sirve de historial).

---

## RH
- [x] #003 Agregar tipo de contratación (Por tiempo determinado, Indeterminado, Por obra) al formulario de edición de empleado — 2026-09-11 (`RH.jsx`, migración `20260911100000_rh_empleados_tipo_contratacion.sql`)
- [x] #004 Agregar campos Bono y forma de pago del bono en el formulario de empleado; el cálculo de nómina suma el total a pagar en efectivo y el total en transferencia considerando sueldo + bono por separado — 2026-09-11 (`RH.jsx`, `ExpedienteEmpleado.jsx`, migración `20260911110000_rh_empleados_bono.sql`)

## Cobranza
- [ ] #001 Revisar ingreso 115 (L27, CINDE) — PARCIALMENTE_APLICADO, $16,649.57 sin distribuir (`prp_ingresos_descuadrados`)
- [ ] #002 Revisar ingreso 379 (L11/L12, Andrea Castillo) — PARCIALMENTE_APLICADO, $196.00 de diferencia (`prp_ingresos_descuadrados`)
- [ ] #005 Error 502 al subir comprobante en Ingresos (`subir-comprobante.js`) — crash sin capturar en `auth.getUser`/consulta a `irp_usuarios`, diagnosticado 2026-09-17

## Contratos

## EDR

## Mantenimiento

## Estacionamiento

## Vending

## Prospectos / CRM

## Validación

## Infraestructura / Storage
- [ ] #006 Borrar bucket huérfano `comprobantes-pago` (existe sin políticas RLS, sin uso en código desde que se quitó el portal de arrendatario el 2026-09-13) — pedir confirmación antes de borrar
- [ ] #007 Documentar en `CLAUDE.md` qué bucket usa subida directa del navegador (`supabase.storage.from().upload()`) vs. cuál pasa por `subir-comprobante.js` (service_role) — hoy no hay una regla única y genera confusión al diagnosticar
- [ ] #008 Limpiar políticas RLS duplicadas en `storage.objects` (mismo bucket con dos políticas casi idénticas, nombradas con convención distinta — ej. `auth-insert-facturas-cfdi` y `auth_insert_facturas_cfdi`) — no rompe nada pero ensucia auditorías futuras
- [x] #009 Causa raíz real del 502 en `subir-comprobante.js`: `createClient()` de supabase-js truena al crear el cliente en Node 20 de Netlify Functions ("Node.js 20 detected without native WebSocket support") — fix: pasar `realtime: { transport: ws }` (paquete `ws`, movido de devDependencies a dependencies) — 2026-09-17
- [x] #010 Mismo patrón vulnerable (`createClient()` sin `transport: ws`) en `generar-sanciones.js` y `chat-operativo.js` — corregido, probado en QA y desplegado a producción — 2026-09-18
- [x] #013 QA solo tenía 2 de los 13 buckets de producción (`avatars`, `logos-arrendatarios`) — el proceso de clonar QA nunca cubrió Storage porque no es esquema DDL. Creado `scripts/aplicar-storage-buckets.mjs` + `supabase/qa-bootstrap/storage-buckets-qa.sql`, aplicado a QA, documentado como paso 6 en `CLAUDE.md` — 2026-09-18
- [x] #011 Fuga de datos entre inquilinos en producción: vista `prp_cartera` sin `security_invoker=true` — un locatario veía los 308 cargos de todos los contratos en vez de solo los 25 suyos. Corregido en prod y verificado (76/76 en `verificar-post-migracion.mjs`) — 2026-09-18
- [ ] #012 Agregar como paso 6 obligatorio en `CLAUDE.md` ("Cómo reconstruir QA desde cero"): correr `verificar-post-migracion.mjs` contra el ambiente nuevo y exigir 0 fallas antes de darlo por listo — aplica también a Petra y cualquier ambiente futuro

## General / Config
