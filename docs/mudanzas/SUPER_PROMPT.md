# SUPER PROMPT — Fork de IRP → ERP de Mudanzas

> **Cómo usarlo**
> 1. Haz el fork (bloque "Paso 0" abajo, a mano o pidiéndoselo a Claude Code desde IRP).
> 2. Abre Claude Code **dentro del repo nuevo** y copia `ESPECIFICACION_TECNICA.md` a `docs/`.
> 3. Pega el bloque **CONTEXTO MAESTRO** una sola vez y después **una fase por mensaje**. No pegues todas juntas: cada
>    fase termina con build, pruebas y commit, y conviene revisarla antes de seguir.

---

## Paso 0 — Crear el fork (PowerShell, desde la carpeta padre de IRP)

```bash
git clone "C:/Users/asus/OneDrive/work/IRPAPP/DEv" "C:/Users/asus/OneDrive/work/MUDANZAS/DEv"
```
Luego, dentro del repo nuevo:
```bash
git remote rename origin irp
```
```bash
git checkout -b develop
```
Crea el repo en GitHub y los proyectos Supabase (prod y QA) y Netlify (prod y QA), y conecta `origin`.
`.env.local` **no** se copia con git (está en gitignore): créalo nuevo con las claves de los proyectos nuevos.
**Nunca reutilices las claves ni la base de IRP.**

---

## CONTEXTO MAESTRO (pegar primero)

```
Estás trabajando en un FORK del sistema IRP (RANNIX Consulting) para crear un ERP pequeño para una empresa de
MUDANZAS. Producto: "Mudanzas Express" (un solo cliente, single-tenant).

La especificación completa está en docs/ESPECIFICACION_TECNICA.md. Léela entera antes de hacer nada; es la fuente de
verdad. El CLAUDE.md actual todavía describe IRP: úsalo para las convenciones, no para el dominio.

Qué es el producto:
- Un ERP para mudanzas con dos libros al centro: VENTAS (tabla heredada `ingresos` + cargos/aplicaciones) y
  GASTOS (tabla heredada `gastos_operativos` + OCR de tickets + fondo revolvente). Todo lo operativo
  (cotización → contrato → orden de servicio → cuadrilla/flota) desemboca en esos dos libros, ligado por
  orden_id / vehiculo_id / empleado_id, para obtener EDR, rentabilidad por orden y flujo de caja sin doble captura.
- Se conserva de IRP: estilo visual, layout, componentes ui, RH/Nómina completo con el Expediente del empleado,
  asistencia, gastos, ingresos, cobranza, fondo revolvente, proveedores/productos, mantenimiento, bitácora,
  validación, cálculos, catálogos, reportes, EDR, agentes IA, Netlify Functions útiles y scripts de QA/RLS.
- Se elimina lo inmobiliario: inmuebles, mapa de locales, renovaciones, estacionamiento (+ supabaseParking),
  vending, agua, despachos, restaurante, informe propietario, vending-ocr, generar-sanciones.
- Se transforma: arrendatarios → clientes (persona física/moral); prospectos → leads + portal del cliente;
  contrato de arrendamiento → contrato de servicio; rol locatario → rol cliente.

Reglas no negociables (heredadas de IRP):
1. Se lee por vistas prp_*, se escribe por tabla base. Toda vista nueva se crea WITH (security_invoker = true).
2. RLS: toda tabla nueva lleva `staff_all` (es_staff()) + políticas explícitas para el rol `cliente` si aplica.
   anon sin grants. Funciones SECURITY DEFINER de escritura validan es_staff() al inicio. REVOKE EXECUTE FROM PUBLIC.
3. Storage privado siempre: urlFirmada() / <ImagenPrivada> / <EnlacePrivado>. Nunca getPublicUrl().
   Solo `avatars` y `catalogos` son públicos.
4. Secretos jamás en VITE_*. Claude solo vía Netlify Functions.
5. Migraciones en supabase/migrations/<timestamp>_*.sql. Aplicar con `npm run migrate:qa -- <archivo>` (corre
   test:rls). Producción solo cuando yo lo pida, con snapshot-seguridad antes.
6. Se conservan los nombres técnicos heredados (prp_*, rh_*, es_staff, irp_usuarios) para poder hacer
   cherry-pick desde el remoto `irp`. No renombres masivamente.
7. Estilo: variables CSS de theme.css con style={{}} inline; mismo look que IRP. Todo número o entidad es
   clickeable (drill-down en contexto). Pantallas nuevas copian el patrón de las existentes más parecidas.
8. Commits en español con prefijo tipo(módulo): feat(cotizaciones): ..., uno por fase o subfase coherente.
9. Al terminar cada fase: npm run build sin errores, verifica en el navegador (preview) con captura, corre las
   pruebas RLS si tocaste la base, y dame un resumen corto: qué hiciste, qué verificaste, qué quedó pendiente.
10. Si algo de la especificación choca con lo que encuentras en el código, dímelo y propón; no lo resuelvas a ciegas.
    Las decisiones del cliente están en §11 y sus ajustes en §12; mandan sobre las secciones anteriores. Lo que
    sigue en "Pendientes que siguen abiertos" (logo, color, aseguradora, PAC, subcontratación, montos por
    servicio): déjalo configurable en cat_parametros o como placeholder, y márcalo como supuesto.
11. Single-tenant: NO agregues empresa_id.

Confirma que leíste la especificación resumiéndola en 10 líneas y espera a que te dé la primera fase.
```

---

## F0 + F1 — Base limpia, rebrand y núcleo ERP funcionando

```
FASE F0+F1. Objetivo: el fork compila, se ve como IRP con la marca nueva, sin nada inmobiliario, y Ventas y Gastos
ya funcionan solos (sin orden de servicio todavía).

1. Base de datos QA nueva: usa scripts/dump-schema.mjs (apuntando a producción IRP, solo esquema, SIN datos) y
   apply-schema, grant-api-roles, aplicar-storage-buckets, verificar-post-migracion contra el proyecto QA NUEVO.
   Adapta los scripts para que lean las credenciales del proyecto nuevo desde .env.local. NO corras
   clone-data-to-qa ni clone-auth-to-qa. Crea un usuario admin de prueba.
2. Tokens: crea src/styles/tokens.js que exporte C con var(--...). Reemplaza cada `const C = {...}` local de las
   páginas que se quedan por ese import. Alinea tailwind.config.js a las mismas variables. Paleta del §2.2.
3. Marca: Header con icono Truck, título desde VITE_APP_TITLE; manifest, favicon y <title>.
4. Retiro: borra las páginas, rutas, functions, entradas de Sidebar y hooks de lo inmobiliario (§3.3). Busca con
   grep cualquier referencia restante (supabaseParking, cat_locales, vending, estacionamiento, arrendatario,
   restaurante) y límpiala. Migración ..._retiro_inmobiliario.sql: antes de dropear, consulta pg_depend y enséñame
   la lista de objetos que caen; conserva lo que usan fondo revolvente, proveedores, bitácora y
   movimientos bancarios.
5. Núcleo ERP (§3.5): migración que agrega tipo_venta, orden_id, cliente_id y cfdi_uuid a ingresos;
   orden_id, vehiculo_id y empleado_id a gastos_operativos (FK diferidas o sin FK hasta que existan esas tablas);
   reescribe el catálogo de grupos de gasto con los rubros de mudanzas. Renombra en la UI Ingresos → Ventas y
   Gastos operativos → Gastos. Sidebar según §4.
6. Reescribe CLAUDE.md para el nuevo producto: mismo formato que el de IRP, dominio de mudanzas, tabla de rutas
   actualizada y la sección de QA con los IDs del proyecto nuevo (déjalos como placeholder si no los tengo).

Aceptación: build limpio; login en QA; puedo registrar una venta y un gasto con ticket OCR y verlos en el EDR;
verificar-post-migracion en verde.
```

---

## F2 — Clientes, Leads y ExpedienteLayout

```
FASE F2. Clientes y leads según §5.1.
1. Extrae de src/pages/ExpedienteEmpleado.jsx el esqueleto visual a src/components/ui/ExpedienteLayout.jsx
   (banda degradada, avatar/logo, título sobre la banda, chips de contacto, completitud, tabs con icono,
   grid 1fr 300px con aside). Refactoriza ExpedienteEmpleado para que lo use SIN cambiar cómo se ve: compara
   con una captura antes y después.
2. Tablas clientes, cliente_contactos, cliente_direcciones, leads + vistas prp_clientes, prp_leads + RLS.
   Rol `cliente` en irp_usuarios.cliente_id, helper mi_cliente_id(), ajuste de es_staff(). Añade las aserciones del
   rol cliente a scripts/test-rls.mjs.
3. Páginas /clientes (lista con KPIs y filtros, igual que Arrendatarios de IRP), /clientes/:id (expediente con
   tabs: Resumen, Datos fiscales, Contactos, Direcciones, Cotizaciones, Órdenes, Ventas y saldo, Documentos,
   Historial) y /leads (embudo por etapa, reusando Prospectos). Validación de RFC con el regex SAT existente.
Aceptación: drill-down cliente → sus ventas; pruebas RLS en verde; el expediente del empleado se ve idéntico.
```

---

## F3 — Levantamiento y Cotización

```
FASE F3. Según §5.2, §9.1 y sobre todo §12.1: el cliente cotiza a PRECIO CERRADO.
1. Tablas cat_articulos_mudanza (siembra ~80 artículos típicos de casa y oficina con m³ y kg realistas),
   cat_tarifas (COSTOS, no precios), levantamientos, levantamiento_partidas, cotizaciones (con costo_estimado,
   precio_sugerido, precio_cerrado, margen_estimado_pct, moneda, tipo_cambio, orden_compra, seguro_prima),
   cotizacion_conceptos (desglose interno de costo) + vistas + RLS.
2. Motor determinista en src/lib/cotizador.js: inventario → m³/kg → unidad sugerida y tamaño de cuadrilla → horas,
   km, casetas, viáticos, material, pago por servicio de la cuadrilla (cat_pago_servicio) → COSTO ESTIMADO →
   precio sugerido con el margen objetivo del tipo de servicio (cat_parametros). Se cubren los 5 tipos: local,
   foránea, internacional (moneda y tipo de cambio), corporativa y almacenaje. Documenta la fórmula en /calculos
   con un ejemplo numérico. Pruebas unitarias simples.
3. Pantallas: captura de levantamiento (buscador de artículos, cantidades, fotos); cotización donde el vendedor
   escribe el PRECIO CERRADO y ve en vivo el margen estimado (semáforo contra el margen mínimo). Abajo del mínimo
   exige aprobación de un admin. Versiones (editar una ENVIADA crea una versión nueva). PDF con la marca que muestra
   un solo precio más el seguro opcional; nunca el desglose de costo. Envío por liga.
Aceptación: el mismo inventario da el mismo costo en UI y en /calculos; una cotización con margen bajo no se puede
enviar sin aprobación; el PDF no filtra costos internos.
```

---

## F4 — Portal del cliente, Contrato de servicio y Anticipo

```
FASE F4. Adapta portal-prospecto → netlify/functions/portal-cliente.js y PortalProspecto.jsx → PortalCliente.jsx
(/portal/cotizacion/:token): ver la cotización, aceptarla (registra fecha e IP con la función SECURITY DEFINER
aceptar_cotizacion), descargar el contrato y subir el comprobante de anticipo (reusa subir-comprobante).
Tabla contratos_servicio; adapta generar-contrato y ElaborarContratoModal a un contrato de servicio de mudanza
(valor declarado, seguro, responsabilidades, cláusula de daños). Al aceptar: se crean los cargos anticipo y saldo en
cargos_programados con orden_id pendiente. Cobranza muestra la CxC por cliente con antigüedad.
Aceptación: flujo completo de punta a punta en QA con un usuario anónimo; anon sigue sin grants (test:rls).
```

---

## F5 — Flota

```
FASE F5. Según §5.4 y §12.5. Son 10 unidades propias; deja vehiculos.propio para fleteros subcontratados.
Tablas vehiculos (incluye YA los campos de Carta Porte: config_vehicular, permiso_sct_tipo, permiso_sct_numero,
aseguradora_rc, poliza_rc, peso_bruto_vehicular) + vehiculo_remolques, vehiculo_combustible; vehiculo_id en
ordenes_trabajo. /flota (tarjetas con
semáforo de vencimientos) y /flota/:id sobre ExpedienteLayout (tabs: Resumen, Documentos, Pólizas y verificación,
Mantenimiento, Combustible y rendimiento, Órdenes, Gastos, Historial). extraer-documento reconoce la tarjeta de
circulación y la póliza. La carga de combustible crea un Gasto ligado a vehiculo_id. Vista
prp_flota_vencimientos para el Dashboard. Bucket flota-docs privado.
Aceptación: costo por km por unidad visible y clickeable hasta el ticket.
```

---

## F6 — Expediente del trabajador para mudanzas

```
FASE F6. Según §6. El expediente debe quedar TAN completo como el de IRP y además:
1. rh_empleados.rol_operativo; tablas rh_licencias, rh_examenes, rh_equipo_asignado + RLS; bucket expedientes-docs.
2. Tabs nuevos en ExpedienteEmpleado: "Licencias y aptitud", "Servicios" (vista prp_empleado_servicios, vacía
   hasta F7 pero ya cableada) y "Equipo asignado" (con carta de resguardo en docx vía generar-documentos).
3. CAMPOS_EXPEDIENTE según el rol_operativo; Próximas fechas con los vencimientos de licencia, aptitud y antidoping;
   KPIs de Resumen del §6. extraer-documento reconoce la licencia federal.
4. Vista prp_empleado_vencimientos + alerta en el Dashboard.
5. Pago mixto (§12.2): rh_empleados.esquema_pago (SUELDO / POR_SERVICIO / MIXTO) y la tabla cat_pago_servicio
   (tipo_servicio × rol_operativo → monto). En el tab Servicios, lo ganado por orden y el acumulado del periodo.
Aceptación: no se pierde nada de los 10 tabs originales; completitud correcta para chofer y para ayudante; un
empleado POR_SERVICIO muestra su esquema en el encabezado.
```

---

## F7 — Agenda y Órdenes de servicio

```
FASE F7. Según §5.3 y reglas §9.2–9.5.
1. Tablas ordenes_servicio, orden_asignaciones, orden_vehiculos, orden_inventario, orden_eventos + vistas prp_ordenes
   y prp_agenda + RLS.
2. Triggers/constraints: sin traslapes de empleado ni de vehículo (exclusion constraint con tstzrange + btree_gist);
   capacidad ≥ volumen; chofer con licencia/aptitud vigentes; vehículo con póliza/verificación vigentes; no se
   programa sin contrato firmado y anticipo conciliado. Cada regla con su prueba en un script.
3. /agenda: vista semana/día por recurso (cuadrillas y unidades), arrastrar para reprogramar, conflictos en rojo con
   la causa. /ordenes y /ordenes/:id sobre ExpedienteLayout (tabs: Resumen, Cuadrilla y unidades, Inventario,
   Bitácora de estatus, Evidencias, Ventas y cobros, Gastos, Rentabilidad, Siniestros).
4. Al crear la orden, liga los cargos de F4 a orden_id.
Aceptación: intentar un traslape o un chofer vencido falla con un mensaje claro en la UI y en la base.
```

---

## F8 — Vista de campo (móvil)

```
FASE F8. /campo (órdenes del día del supervisor) y /campo/orden/:id, diseñadas para 375 px y uso con una mano:
botón grande para cambiar de estatus (registra hora y geolocalización en orden_eventos), checklist de inventario
por etiqueta (estado en origen y destino con foto), subir ticket de gasto con cámara (gastos-ocr, ligado a
orden_id), firma del cliente en canvas (origen y destino), cierre. Si la red falla, la acción queda en cola local y
se reintenta, con indicador visible. Menú del rol supervisor_cuadrilla solo con /campo. Una partida DAÑADO o
FALTANTE crea el siniestro. Bucket ordenes-evidencias privado.
Aceptación: probado con resize_window mobile y con la red simulada lenta; las fotos se ven firmadas en el
expediente de la orden.
```

---

## F9 — Finanzas / ERP

```
FASE F9. Según §3.5, §9.6–9.10 y §12.2, §12.4–12.6.
1. Nómina: percepción "Servicios realizados" = suma de orden_asignaciones.pago_servicio de las órdenes cerradas
   en el periodo (se congela al cerrar la orden). POR_SERVICIO sin sueldo base o con el mínimo (parámetro);
   MIXTO lo suma al sueldo. El cierre de nómina genera los gastos del grupo Nómina.
2. Mano de obra por orden = pago_servicio + horas × costo hora del personal con sueldo.
3. Vistas prp_rentabilidad_orden, _cliente, _tipo_servicio, _vehiculo; reporte "margen estimado vs. real" por
   orden y por vendedor; EDR mensual (costo directo vs. gasto de operación, prorrateo de indirectos, todo en MXN al
   tipo de cambio de la operación); flujo de caja semanal (adapta ResumenSemanal).
4. CxC corporativa: antigüedad 0-30/31-60/61-90/+90; bloqueo al programar si rebasa el límite o tiene saldo vencido,
   salvo autorización de un admin registrada en la bitácora. CxP: fecha_vencimiento y pagado en gastos a crédito.
5. Seguro y siniestros: la prima es gasto de la orden; deducible y rechazos, también.
6. Facturación: netlify/functions/timbrar-cfdi.js con interfaz única y adaptador por PAC (el PAC está pendiente:
   por ahora genera el XML sin timbrar para revisión). CFDI 4.0 con Complemento Carta Porte para servicios con
   traslado por carretera federal, armado con los datos de vehiculos, rh_licencias, cliente_direcciones y
   orden_inventario. Las claves SAT de producto y config vehicular salen de cat_parametros/catálogos: no las
   inventes; deja la lista de las que necesitas confirmar con el contador. orden_compra en la factura si el
   cliente la exige.
7. Dashboard con los KPIs del §9.
Aceptación: para un mes de prueba, la suma de la rentabilidad de las órdenes + los indirectos = la utilidad del EDR
(muéstrame la conciliación); la nómina de un empleado POR_SERVICIO cuadra con sus órdenes cerradas; se genera el XML
de una mudanza foránea con Carta Porte.
```

---

## F10 — IA

```
FASE F10. 1) netlify/functions/inventario-ia.js: recibe hasta 10 fotos del levantamiento y devuelve JSON de
partidas contra cat_articulos_mudanza (con confianza); la UI las muestra como sugerencia editable, nunca guarda
directo. 2) System prompts de chat-operativo y chat-analitico para el dominio de mudanzas, con acceso de lectura a
las vistas prp_ordenes, prp_rentabilidad_*, prp_agenda, prp_flota_vencimientos. 3) Centraliza el ID del modelo en
netlify/functions/_lib/modelo.js. Usa la skill claude-api para elegir el modelo vigente y la forma correcta de
mandar imágenes.
Aceptación: con 3 fotos de una sala, sugiere partidas razonables y el volumen total en m³.
```

---

## F11 — Almacenaje

```
FASE F11. El cliente sí da almacenaje. /almacen: espacios de bodega (cat_espacios_almacen: código, m³, estatus),
contratos de almacenaje ligados a cliente y, si aplica, a la orden de origen; inventario guardado con etiqueta y
foto (reusa orden_inventario o una tabla almacen_inventario); cargo mensual recurrente reutilizando
cargos_programados y la lógica de cobranza mensual heredada de IRP; salida parcial o total que genera una orden
de entrega. Ventas con tipo_venta = ALMACENAJE. KPI de ocupación de la bodega en el Dashboard.
Aceptación: un contrato de almacenaje genera su cargo el día 1 y aparece en la CxC; la ocupación cuadra con los
espacios asignados.
```
