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
MUDANZAS. Nombre provisional: "MRP — Mudanzas Resource Planning".

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
    Las preguntas abiertas del §11 de la especificación: usa el default propuesto y márcalo como supuesto.

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
FASE F3. Según §5.2 y reglas §9.1.
1. Tablas cat_articulos_mudanza (siembra ~80 artículos típicos de casa y oficina con m³ y kg realistas),
   cat_tarifas, levantamientos, levantamiento_partidas, cotizaciones, cotizacion_conceptos + vistas + RLS.
2. Motor de cálculo determinista en src/lib/cotizador.js (m³ → tipo de unidad sugerida y tamaño de cuadrilla, horas
   estimadas, km, pisos sin elevador, empaque, seguro % sobre valor declarado, IVA y retenciones). Documenta la
   fórmula en /calculos con un ejemplo numérico. Pruebas unitarias simples del cotizador.
3. Pantallas: captura de levantamiento (buscador de artículos, cantidades, fotos), cotización con desglose editable,
   versiones (editar una ENVIADA crea una versión nueva), PDF con generar-documentos y la marca, envío por liga.
Aceptación: el mismo inventario da el mismo precio en UI y en /calculos; el PDF se ve profesional.
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
FASE F5. Según §5.4. Tablas vehiculos, vehiculo_combustible; vehiculo_id en ordenes_trabajo. /flota (tarjetas con
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
Aceptación: no se pierde nada de los 10 tabs originales; completitud correcta para chofer y para ayudante.
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
FASE F9. Según §3.5 y §9.6–9.10.
1. Nómina → Gastos: el cierre de nómina genera los gastos del grupo Nómina; la mano de obra se prorratea por
   orden según orden_asignaciones.horas × costo hora (salario_diario / horas de jornada).
2. Vistas prp_rentabilidad_orden, _cliente, _tipo_servicio, _vehiculo; EDR mensual con costo directo vs.
   gasto de operación y prorrateo de indirectos; flujo de caja semanal (adapta ResumenSemanal).
3. Cuentas por pagar: fecha_vencimiento y pagado en gastos a crédito, con su tablero.
4. Facturación: CFDI 4.0 al liquidar; deja la integración con el PAC detrás de una Netlify Function con interfaz
   clara. Carta Porte para foráneas como pendiente documentado (no inventes el complemento).
5. Dashboard con los KPIs del §9.
Aceptación: para un mes de prueba, la suma de la rentabilidad de las órdenes + los indirectos = la utilidad del EDR.
Muéstrame la conciliación.
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
