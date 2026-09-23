# Especificación técnica — Plataforma de Mudanzas (**Mudanzas Express**)
## RANNIX Consulting | v0.2 | 2026-09-23 — incluye decisiones del cliente (§11–12)

> Producto hermano de IRP. Se construye como **fork** del repositorio IRP: hereda estilo, layout,
> componentes, seguridad (RLS por rol, storage firmado), RH/Nómina completo, gastos, ingresos, compras,
> bitácora, agentes IA y los scripts de QA. Se le quita lo inmobiliario y se le suma el ciclo de mudanzas:
> **Lead → Levantamiento → Cotización → Contrato → Orden de servicio → Ejecución → Liquidación → CFDI → Cierre**.

---

## 1. Decisión de arquitectura: ¿copia de IRP o proyecto nuevo?

**Recomendación: fork de IRP en un repositorio nuevo, conservando el historial de git.**

| Opción | A favor | En contra | Veredicto |
|---|---|---|---|
| **Fork (repo nuevo con historial de IRP)** | ~60 % del sistema ya existe (RH, gastos, ingresos, compras, fondo revolvente, bitácora, EDR, IA, RLS, QA). Mismo estilo sin esfuerzo. Se pueden traer arreglos de IRP con `git cherry-pick`. | Hay que limpiar módulos inmobiliarios y el esquema legado `prp`. | ✅ **Elegida** |
| Proyecto desde cero copiando solo el CSS | Código limpio | Rehacer meses de trabajo en RH, nómina, RLS, storage, OCR. | ❌ |
| Meter mudanzas dentro de IRP (multi-giro) | Una sola base de código | Mezcla dos negocios, dos clientes y dos modelos de datos. Complica RLS y el menú. Un bug en uno tumba al otro. | ❌ |
| Paquete común `rannix-core` (monorepo) | Ideal a largo plazo | Prematuro hoy. Frena la entrega. | ⏳ Después, cuando haya un tercer producto |

**Reglas del fork**
1. **Repo nuevo, Supabase nuevo, Netlify nuevo.** Nunca se comparte base de datos con IRP.
2. IRP queda como remoto `irp` (`git remote add irp <ruta o URL de IRP>`) para traer correcciones con cherry-pick.
3. **Se conservan los nombres técnicos** (`prp_*` para vistas, `rh_*`, `es_staff()`, `urlFirmada()`) aunque el producto sea otro.
   Renombrarlos cuesta mucho y no aporta valor; así los cherry-picks desde IRP siguen aplicando.
4. **El esquema de la base se lleva sin datos**: `dump-schema.mjs` sí, `clone-data-to-qa.mjs` / `clone-auth-to-qa.mjs` **no**.
   Los datos y las cuentas de IWOL jamás entran al producto de mudanzas.

---

## 2. Estilo y sistema visual (heredado de IRP)

### 2.1 Estado actual en IRP (lo que hay que saber antes de copiar)
- `src/styles/theme.css` define los tokens. La marca real hoy es **morado IwolPark `--accent: #7B5EA7`**, no el azul de la paleta
  RANNIX del CLAUDE.md.
- `tailwind.config.js` todavía trae la paleta azul `#0A66C2` y la fuente `Inter`. Está **desalineada** con `theme.css`.
- Varias páginas (p. ej. `ExpedienteEmpleado.jsx`) **fijan colores en un `const C = {...}`** local en vez de leer variables CSS.
  Cambiar la marca exige tocar cada página.

### 2.2 Qué se hace en el fork (fase F1)
1. **Tokens únicos**: todos los colores salen de `theme.css`. Se crea `src/styles/tokens.js`
   (`export const C = { primary: 'var(--accent)', ... }`) y cada `const C` local se reemplaza por ese import.
   Así cambiar la marca = cambiar un solo archivo.
2. `tailwind.config.js` lee las mismas variables (`primary: 'var(--accent)'`).
3. Paleta de marca de mudanzas (**pendiente de decidir con el cliente**). Propuesta inicial:
   ```css
   --accent:  #0A66C2;   /* azul RANNIX — confianza/logística */
   --accent2: #E8A020;   /* dorado — acento, CTA secundaria */
   --color-primary-dark: #1A3C5E;
   --green: #057642; --red: #B24020; --gold: #F59E0B;
   --header-bg: var(--accent); --footer-bg: #1A3C5E;
   ```
4. Header: el logo `Building2` se cambia por `Truck`. El nombre y subtítulo salen de `VITE_APP_TITLE`.
   Se conservan la franja degradada superior, el badge dorado de versión `V_YYMMDD_HH_MM` y el badge morado `QA`.

### 2.3 Patrones visuales que se conservan tal cual
| Patrón | Dónde vive en IRP | Uso en mudanzas |
|---|---|---|
| Sidebar por secciones con etiqueta en MAYÚSCULAS y menús por rol (`MENUS_POR_ROL`) | `Sidebar.jsx` | Mismo esquema, secciones nuevas (ver §4) |
| Header fijo 52 px, franja degradada, badge versión/QA | `Header.jsx` | Igual |
| `KPICard`, `StatusBadge`, `EmptyState`, `LoadingSpinner`, `EncabezadoOrdenable` | `components/ui` | Igual |
| `ArchivoPrivado` (`ImagenPrivada`, `EnlacePrivado`, `useUrlFirmada`) | `components/ui` | Evidencias de órdenes, licencias, pólizas |
| `ImportadorDocumento` + `extraer-documento` | ui + function | Leer licencias, pólizas, tarjetas de circulación |
| **Expediente tipo LinkedIn**: banda degradada, avatar con carga de foto, nombre sobre la banda, línea de contacto, anillo de completitud, tabs con icono, grid `1fr 300px` con columna derecha (próximas fechas + actividad reciente), botón Imprimir | `ExpedienteEmpleado.jsx` | **Plantilla para 4 expedientes**: Empleado, Cliente, Vehículo, Orden de servicio |
| Drill-down: todo número o entidad es clickeable y el detalle se abre en contexto | filosofía IRP | Obligatorio en todas las pantallas nuevas |

**Recomendación técnica**: al construir el segundo expediente (Cliente), extraer el esqueleto a
`src/components/ui/ExpedienteLayout.jsx` (props: `banner`, `avatar`, `titulo`, `subtitulo`, `chips`, `completitud`,
`tabs`, `aside`). Los 4 expedientes lo reutilizan y todos se ven igual.

---

## 3. Inventario de módulos IRP → Mudanzas

### 3.1 Se conservan (sin cambios o con cambios menores)
| Módulo IRP | Ruta | Ajuste |
|---|---|---|
| RH / Nómina + Expediente de empleado | `/rh`, `/rh/empleado/:id` | **Se extiende** (ver §6) |
| Asistencia (checadas → trigger → `rh_asistencia`) | dentro de RH | Igual |
| Gastos operativos + OCR de tickets | `/gastos-operativos` | Agregar `orden_id` y `vehiculo_id` opcionales para costear por orden y unidad |
| Fondo revolvente | `/fondo-revolvente` | Se usa para **viáticos de cuadrilla** |
| Ingresos | `/ingresos` | Agregar `orden_id` / `cliente_id` |
| Cobranza | `/cobranza` | Pasa a cobrar **anticipos y saldos por orden**, no rentas mensuales |
| Proveedores, Productos (compras) | `/proveedores`, `/productos` | Productos = materiales de empaque, refacciones, combustible |
| Mantenimiento / OT | `/mantenimiento` | Pasa a mantenimiento de **flota** (`vehiculo_id`) |
| EDR, Resumen semanal, Reportes, Feed ejecutivo, Foto del día, Eventos | varias | Los KPIs se reescriben (ver §9) |
| Bitácora, Validación, Cálculos, Catálogos, Utilidades, Configuración | varias | Igual |
| Agentes IA (Operativo y Analítico) | flotante + barra | Nuevo *system prompt* con el dominio de mudanzas |
| Login, roles, `AppContext`, hooks, `lib/*` | — | Igual; se quita `supabaseParking` |

### 3.2 Se transforman
| IRP | Mudanzas |
|---|---|
| Arrendatarios | **Clientes** (persona física o moral) |
| Prospectos + portal de prospecto | **Leads / CRM** + **Portal del cliente** (ver cotización, aceptarla, subir comprobante, rastrear su orden) |
| Contratos de arrendamiento + `ElaborarContratoModal` + `generar-contrato` | **Contratos de servicio de mudanza** generados desde la cotización aceptada |
| Expediente de contrato | **Expediente de la orden de servicio** |
| Rol `locatario` (ve solo su contrato) | Rol **`cliente`** (ve solo sus cotizaciones y órdenes) |

### 3.3 Se eliminan
`Inmuebles`, `MapaLocales`, `Renovaciones`, `Estacionamiento`, `Vending`, `Agua`, `Despachos`, `RestauranteGastos`,
`InformePropietario`, la function `vending-ocr` y `generar-sanciones`, el cliente `supabaseParking` y el rol `restaurante`.
Del lado de la base, sus tablas y vistas se eliminan en **una migración propia** que se revisa aparte, no a mano (ver §7.4).

### 3.4 Módulos nuevos
| Módulo | Ruta | Propósito |
|---|---|---|
| Clientes | `/clientes`, `/clientes/:id` | Catálogo y expediente del cliente |
| Leads | `/leads` | Embudo comercial (reusa Prospectos) |
| Levantamientos | `/levantamientos/:id` | Visita o videollamada: inventario de artículos, accesos, fotos |
| Cotizaciones | `/cotizaciones`, `/cotizaciones/:id` | Cálculo de m³, kg, cuadrilla, unidad y precio; versiones; PDF; envío al portal |
| Contratos de servicio | `/contratos-servicio/:id` | Contrato, valor declarado, seguro, anticipo |
| Agenda / Programación | `/agenda` | Calendario de órdenes × cuadrillas × unidades, con detección de conflictos |
| Órdenes de servicio | `/ordenes`, `/ordenes/:id` | Ejecución, estatus, inventario real, evidencias, firmas |
| Vista móvil de cuadrilla | `/campo/orden/:id` | Para el supervisor en sitio: checklist, fotos, etiquetas, firma del cliente |
| Flota | `/flota`, `/flota/:id` | Expediente del vehículo: documentos, pólizas, verificación, combustible, mantenimiento |
| Siniestros / Reclamaciones | `/siniestros` | Daños, reclamaciones y pagos del seguro |
| Almacenaje (F11) | `/almacen` | Bodega por días o meses (este servicio sí reutiliza la lógica de cargos recurrentes de IRP) |

---

## 3.5 Núcleo ERP: Ventas y Gastos

El producto es un **ERP pequeño para mudanzas**. Todo lo operativo (cotización, orden, flota, cuadrilla) termina en
dos libros que **ya existen en IRP** y se reutilizan:

| Libro | Tabla IRP que se reutiliza | En mudanzas se llama | Qué registra |
|---|---|---|---|
| **Ventas** | `ingresos` (+ `cargos_programados`, `aplicaciones_pago`, `comprobantes_pago`) | Ventas | Cada orden genera sus cargos (anticipo y saldo). Los pagos se aplican contra ellos. Hay ventas sin orden: venta de cajas o material, almacenaje, flete suelto |
| **Gastos** | `gastos_operativos` + `gasto_detalle` + OCR de tickets + fondo revolvente | Gastos | Combustible, casetas, viáticos, maniobras, material de empaque, refacciones, renta de unidades, fleteros subcontratados, administración |

**Cambios mínimos para que funcione como ERP**
1. **Clasificación de venta** en `ingresos`: `+ tipo_venta` (`MUDANZA`, `FLETE`, `EMBALAJE`, `ALMACENAJE`,
   `VENTA_MATERIAL`, `OTRO`), `+ orden_id`, `+ cliente_id`, `+ cfdi_uuid`.
2. **Centro de costo** en `gastos_operativos`: `+ orden_id` (gasto directo de un servicio), `+ vehiculo_id`
   (gasto de unidad), `+ empleado_id` (viático de una persona). Si no tiene ninguno, es **gasto indirecto** y se
   prorratea en el EDR.
3. **Catálogo de cuentas** (`cat_grupo_gasto`, ya existe): se reescribe con los rubros de mudanzas: Costo directo
   (combustible, casetas, viáticos, maniobras, materiales, subcontratos), Flota (mantenimiento, seguros, tenencias,
   verificaciones), Nómina (desde RH), Administración, Comercial.
4. **Nómina como gasto**: el cierre de nómina de RH genera su asiento en Gastos (grupo Nómina), y la mano de obra se
   prorratea por orden según `orden_asignaciones.horas`.
5. **Tres reportes financieros** sobre esos dos libros:
   - **EDR mensual** (ya existe): Ventas − Costo directo = Utilidad bruta − Gastos de operación = Utilidad de operación.
   - **Rentabilidad por orden, por cliente, por tipo de servicio y por unidad**: vistas `prp_rentabilidad_*`.
   - **Flujo de caja**: cobrado vs. pagado por semana (se adapta del Resumen semanal).
6. **Cuentas por cobrar**: Cobranza muestra la antigüedad de saldos por cliente, útil para los corporativos con crédito.
   **Cuentas por pagar** (opcional, F9): gastos con proveedor a crédito, con `fecha_vencimiento` y `pagado`.

Con esto la operación alimenta la contabilidad gerencial sin doble captura: la cuadrilla sube un ticket de caseta
desde campo, el OCR lo registra en Gastos ligado a la orden, y la rentabilidad de esa orden se actualiza sola.

---

## 4. Menú (Sidebar) propuesto
```
(sin etiqueta)  Feed Ejecutivo · Foto del Día · Dashboard
COMERCIAL       Leads · Clientes · Cotizaciones · Contratos
OPERACIÓN       Agenda · Órdenes de servicio · Siniestros · Resumen semanal
FLOTA           Vehículos · Mantenimiento · Combustible
VENTAS          Ventas · Cobranza (CxC) · Facturación
GASTOS          Gastos · Viáticos / Fondo revolvente · Cuentas por pagar
COMPRAS         Proveedores · Productos y materiales
RECURSOS HUMANOS RH / Nómina · Cuadrillas
ANÁLISIS        Reportes · EDR · Rentabilidad por orden
(sin etiqueta)  Bitácora · Configuración
UTILERÍAS       Cálculos · Validación · Catálogos · Consulta BD
```
Menús por rol (`MENUS_POR_ROL`): `ventas` (COMERCIAL + Agenda de solo lectura), `operaciones` (OPERACIÓN + FLOTA),
`supervisor_cuadrilla` (solo `/campo/*` con sus órdenes del día), `finanzas`, `rh`, `admin` (todo) y `cliente` (portal).

---

## 5. Modelo de datos nuevo (esquema `public`)

Convenciones heredadas: `id uuid default gen_random_uuid()`, `created_at` y `updated_at timestamptz`,
`estado_id text` contra catálogo, folios legibles (`COT-2026-00012`, `OS-2026-00045`). **Se lee por vista `prp_*` y se
escribe por tabla.** Toda vista se crea `WITH (security_invoker = true)`.

### 5.1 Comercial
```sql
clientes (id, tipo_persona text check in ('FISICA','MORAL'), razon_social, nombre, apellido_pat, apellido_mat,
  rfc, regimen_fiscal, uso_cfdi, cp_fiscal, email, celular, telefono, origen text /*WEB, REFERIDO, CORPORATIVO...*/,
  es_corporativo bool default false, credito_dias int default 0, limite_credito numeric, estado_id, notas, logo_url)
cliente_contactos (id, cliente_id → clientes, nombre, puesto, email, celular, es_principal bool)
cliente_direcciones (id, cliente_id, alias, calle, numero_ext, numero_int, colonia, municipio, estado, codigo_postal,
  lat numeric, lng numeric, tipo_inmueble text /*CASA, DEPTO, OFICINA, BODEGA*/, piso int, tiene_elevador bool,
  distancia_estacionamiento_m int, requiere_permiso_condominio bool, notas_acceso)
leads (id, cliente_id null, nombre, email, celular, fuente, etapa text /*NUEVO, CONTACTADO, LEVANTAMIENTO, COTIZADO,
  GANADO, PERDIDO*/, motivo_perdida, responsable_id → irp_usuarios, fecha_tentativa date, notas)
```

### 5.2 Levantamiento y cotización
```sql
cat_articulos_mudanza (id, nombre, categoria /*SALA, RECAMARA, COCINA, OFICINA, CAJA...*/, volumen_m3 numeric,
  peso_kg numeric, fragil bool, requiere_desarmado bool, requiere_embalaje_especial bool, minutos_maniobra int)
cat_tarifas (id, concepto /*M3, KM, HORA_CUADRILLA, PISO_SIN_ELEVADOR, EMPAQUE_CAJA, SEGURO_PCT, CASETA...*/,
  unidad, precio numeric, vigente_desde date, vigente_hasta date)
levantamientos (id, lead_id, cliente_id, direccion_origen_id, direccion_destino_id, fecha, modalidad /*PRESENCIAL,
  VIDEO, AUTOSERVICIO*/, levantado_por → rh_empleados, volumen_total_m3, peso_total_kg, notas)
levantamiento_partidas (id, levantamiento_id, articulo_id null, descripcion, cantidad, volumen_m3, peso_kg,
  fragil, desarmado, empaque bool, foto_url)
cotizaciones (id, folio, version int default 1, cotizacion_padre_id null, cliente_id, levantamiento_id,
  tipo_servicio /*LOCAL, FORANEA, INTERNACIONAL, OFICINA, SOLO_FLETE, EMBALAJE, ALMACENAJE*/,
  direccion_origen_id, direccion_destino_id, fecha_servicio date, distancia_km, volumen_total_m3, peso_total_kg,
  tipo_unidad_sugerida, cuadrilla_sugerida int, horas_estimadas numeric,
  valor_declarado numeric, seguro_incluido bool, subtotal, descuento, iva, retencion_isr, retencion_iva, total,
  anticipo_pct numeric default 30, vigencia date, estatus /*BORRADOR, ENVIADA, VISTA, ACEPTADA, RECHAZADA, VENCIDA*/,
  token_portal text unique, aceptada_en timestamptz, aceptada_ip text, pdf_url)
cotizacion_conceptos (id, cotizacion_id, tarifa_id null, concepto, cantidad, unidad, precio_unitario, importe)
```

### 5.3 Contrato y orden de servicio
```sql
contratos_servicio (id, folio, cotizacion_id unique, cliente_id, fecha_firma, valor_declarado, seguro_contratado bool,
  poliza_folio, condiciones_texto, firmado_url, estatus /*PENDIENTE_FIRMA, FIRMADO, CANCELADO*/)
ordenes_servicio (id, folio, contrato_id, cliente_id, fecha_programada date, hora_inicio time, duracion_horas numeric,
  estatus /*PROGRAMADA, CONFIRMADA, EN_CARGA, EN_TRANSITO, EN_DESCARGA, ENTREGADA, LIQUIDADA, CERRADA, CANCELADA*/,
  supervisor_id → rh_empleados, km_inicial, km_final, casetas numeric, calificacion_cliente int, comentario_cliente,
  firma_origen_url, firma_destino_url, cerrada_en timestamptz)
orden_asignaciones (id, orden_id, empleado_id, rol /*CHOFER, AYUDANTE, EMPACADOR, SUPERVISOR*/, horas numeric,
  pago_extra numeric default 0)            -- alimenta nómina (tiempo extra, comisiones)
orden_vehiculos (id, orden_id, vehiculo_id, chofer_id → rh_empleados)
orden_inventario (id, orden_id, partida_levantamiento_id null, etiqueta text /*QR o número de caja*/, descripcion,
  estado_origen /*OK, DAÑO_PREVIO*/, estado_destino /*OK, DAÑADO, FALTANTE*/, foto_origen_url, foto_destino_url)
orden_eventos (id, orden_id, estatus_nuevo, fecha_hora timestamptz, lat, lng, registrado_por, nota, foto_url)
```

### 5.4 Flota
```sql
vehiculos (id, numero_economico, placa, tipo /*CAMIONETA_3_5, RABON, TORTON, TRACTO, CAJA_48, CAJA_53*/,
  marca, modelo, anio, vin, capacidad_m3, capacidad_kg, rendimiento_km_l, permiso_sct, tarjeta_circulacion_url,
  aseguradora, poliza, poliza_vence date, verificacion_vence date, tenencia_pagada_anio int, foto_url, estado_id)
vehiculo_combustible (id, vehiculo_id, orden_id null, fecha, litros, importe, km_odometro, gasto_id → gastos_operativos)
-- El mantenimiento reusa ordenes_trabajo agregando vehiculo_id.
```

### 5.5 Siniestros
```sql
siniestros (id, orden_id, orden_inventario_id null, fecha, descripcion, monto_reclamado, monto_aprobado,
  responsable /*EMPRESA, ASEGURADORA, CLIENTE*/, empleado_id null, estatus /*ABIERTO, EN_REVISION, PAGADO, RECHAZADO*/,
  evidencias jsonb)
```

### 5.6 Cambios a tablas heredadas
- `gastos_operativos`, `ingresos`, `cargos_programados`: `+ orden_id uuid null`, `+ vehiculo_id uuid null` (solo gastos).
- `ordenes_trabajo`: `+ vehiculo_id`.
- `irp_usuarios`: `+ cliente_id` (sustituye a `contrato_id` para el rol `cliente`).

### 5.7 Vistas clave
`prp_clientes`, `prp_cotizaciones`, `prp_ordenes` (con cliente, supervisor, unidad, saldo), `prp_agenda`
(orden × recurso × franja horaria), `prp_rentabilidad_orden` (ingreso − mano de obra prorrateada − combustible −
casetas − viáticos − materiales − siniestros), `prp_flota_vencimientos`, `prp_empleado_servicios`,
`prp_empleado_vencimientos`.

---

## 6. Expediente del trabajador (versión mudanzas)

Se parte **idéntico** a `ExpedienteEmpleado.jsx` de IRP: encabezado LinkedIn, avatar, completitud, columna derecha
y los 10 tabs actuales (**Resumen, Información laboral, Documentos, Incidencias, Asistencia, Nómina, Capacitación,
Evaluaciones, Beneficios, Historial**). Se agregan:

| Tab nuevo | Contenido | Tabla |
|---|---|---|
| **Licencias y aptitud** | Licencia federal (tipo A/B/C/D/E) o estatal, número, vigencia, archivo. Constancia de aptitud psicofísica (medicina preventiva SCT), antidoping, psicométrico, cada uno con fecha, resultado y vencimiento | `rh_licencias`, `rh_examenes` |
| **Servicios** | Órdenes en las que participó, rol, horas, calificación del cliente, siniestros asociados. Todo con drill-down a la orden | `prp_empleado_servicios` |
| **Equipo asignado** | Uniformes, EPP (faja, guantes, casco, botas), herramienta, celular: fecha de entrega, talla, devolución, firma de resguardo | `rh_equipo_asignado` |

```sql
rh_licencias (id, empleado_id, tipo, numero, expedida, vence date, archivo_url)
rh_examenes (id, empleado_id, tipo /*APTITUD_SCT, ANTIDOPING, PSICOMETRICO, MEDICO_GENERAL*/, fecha, resultado
  /*APTO, NO_APTO, CONDICIONADO*/, vence date, archivo_url)
rh_equipo_asignado (id, empleado_id, tipo, descripcion, talla, cantidad, fecha_entrega, fecha_devolucion,
  estado /*ENTREGADO, DEVUELTO, EXTRAVIADO*/, costo numeric, firma_url)
```

**Cambios en el Resumen y la columna derecha**
- KPIs: servicios del mes, calificación promedio, horas de conducción, siniestros en 12 meses.
- "Próximas fechas" suma el vencimiento de la licencia, del examen de aptitud y del antidoping.
- `CAMPOS_EXPEDIENTE` (completitud) para choferes: `CONTRATO, INE, CURP, NSS, COMPROBANTE_DOM, ACTA_NAC, RFC,
  LICENCIA, APTITUD_SCT, ANTIDOPING`. Para ayudantes y empacadores, sin los tres últimos.
- Campo nuevo en `rh_empleados`: `rol_operativo` (`CHOFER`, `AYUDANTE`, `EMPACADOR`, `SUPERVISOR`, `ADMINISTRATIVO`).

**Regla dura**: no se puede asignar como `CHOFER` a una orden a un empleado con licencia o aptitud vencidas en la
fecha de la orden. Se valida en la base con un trigger en `orden_asignaciones` y `orden_vehiculos`, y también en la UI.

---

## 7. Seguridad, roles y RLS

### 7.1 Roles
`admin`, `ventas`, `operaciones`, `supervisor_cuadrilla`, `rh`, `finanzas` (todos pasan `es_staff()`) y `cliente`.

### 7.2 Políticas
- Se conserva `es_staff()` y `staff_all` en todas las tablas. `es_staff()` se ajusta a
  `rol_id NOT IN ('cliente','prospecto')`.
- `cliente_lee` sobre `clientes`, `cotizaciones`, `cotizacion_conceptos`, `contratos_servicio`, `ordenes_servicio`,
  `orden_eventos`, `cargos_programados`, `ingresos`, filtrando por `mi_cliente_id()`.
- `cliente_acepta_cotizacion`: UPDATE solo de `estatus` → `ACEPTADA` cuando está `ENVIADA`. Conviene hacerlo con una
  función `SECURITY DEFINER` `aceptar_cotizacion(token)` en vez de una política.
- `supervisor_cuadrilla`: además de ser staff, en la vista móvil solo ve las órdenes donde tiene una asignación
  (filtro en la vista `prp_campo_ordenes`).
- Portal anónimo (cotización por token): igual que `portal-prospecto`, mediante la Netlify Function `portal-cliente`
  con service role. **`anon` sigue sin grants.**

### 7.3 Storage (todos privados, firmados con `urlFirmada()`)
`clientes-docs`, `cotizaciones-pdf`, `contratos-firmados`, `ordenes-evidencias`, `flota-docs`, `expedientes-docs`,
`facturas-cfdi`, `tickets-gastos`, `siniestros-evidencias`. Público solo `avatars` y `catalogos` (logos).
Se crean con una copia adaptada de `supabase/qa-bootstrap/storage-buckets-qa.sql`.

### 7.4 Base de datos del nuevo proyecto
1. Crear proyecto Supabase de producción y otro de QA.
2. `node scripts/dump-schema.mjs` apuntando a IRP produce el esquema base. Se aplica en limpio con `apply-schema`.
3. `grant-api-roles`, `aplicar-storage-buckets` y `verificar-post-migracion` (los pasos 5 a 7 del CLAUDE.md).
4. Migración `…_mudanzas_retiro_inmobiliario.sql`: drop de vistas y tablas de locales, estacionamiento, vending, agua,
   restaurante y despachos. **Revisar dependencias con `pg_depend` antes**: varias vistas `prp_*` leen del esquema legado
   `prp`, y `prp_fondos_revolventes`, `prp_proveedores`, `prp_bitacora` y `prp_movimientos_bancarios` **sí se usan**.
   El esquema `prp` se conserva por ahora y se registra como deuda técnica.
5. Migraciones nuevas por fase (§10). Cada una corre `npm run migrate:qa` + `test:rls`. Se agregan aserciones para el
   rol `cliente` en `scripts/test-rls.mjs`.

---

## 8. Netlify Functions

| Function | Estado |
|---|---|
| `chat-operativo`, `chat-analitico` | Se conservan, con *system prompt* de mudanzas |
| `extraer-documento` | Se conserva; se le agregan los tipos licencia, póliza y tarjeta de circulación |
| `gastos-ocr` | Se conserva (combustible, casetas, viáticos) |
| `generar-contrato`, `generar-documentos` | Se adaptan: contrato de servicio, PDF de cotización, carta de resguardo de equipo |
| `subir-comprobante` | Se conserva (anticipo y saldo del cliente) |
| `portal-prospecto` | Se renombra a **`portal-cliente`** (ver y aceptar cotización, rastrear orden) |
| `vending-ocr`, `generar-sanciones` | Se eliminan |
| **`inventario-ia`** (nueva) | Recibe fotos o un video del levantamiento y devuelve partidas con volumen y peso estimados, contra `cat_articulos_mudanza`. El usuario revisa antes de guardar |
| **`cotizar`** (nueva, sin IA) | Cálculo determinista del precio a partir de `cat_tarifas`. La misma fórmula se documenta en `/calculos` |

Modelo: hoy IRP usa `claude-sonnet-4-6`. En el fork se recomienda centralizar el ID del modelo en una constante
(`netlify/functions/_lib/modelo.js`) y evaluar `claude-sonnet-5`.

---

## 9. Reglas de negocio de mudanzas (a validar con el cliente)
1. La cotización vence a los **15 días** (configurable en `cat_parametros`). Al cambiarla se crea una nueva versión;
   las cotizaciones aceptadas no se editan.
2. Una orden solo se programa con contrato **firmado** y anticipo ≥ `anticipo_pct` (default 30 %) conciliado.
3. La capacidad de las unidades asignadas (m³ y kg) debe ser ≥ el volumen y peso cotizados.
4. **Sin traslapes**: un empleado o vehículo no puede estar en dos órdenes con horario encimado (constraint de
   exclusión con `tstzrange`, o validación en un trigger).
5. No se asigna un vehículo con póliza o verificación vencidas, ni un chofer con licencia o aptitud vencidas (§6).
6. El saldo se liquida **antes de descargar** (cliente particular) o según `credito_dias` (corporativo).
7. La orden no se cierra sin firma de conformidad en destino e inventario de destino completo. Cada partida
   `DAÑADO` o `FALTANTE` abre un siniestro automáticamente.
8. Factura CFDI 4.0 al liquidar. **En mudanzas foráneas por carretera federal se evalúa el Complemento Carta Porte**
   (confirmar con el contador del cliente).
9. Retenciones cuando el cliente es persona moral (IVA 4 % en autotransporte de carga, a confirmar).
10. **Rentabilidad por orden** = ingresos − (horas × costo hora de cada asignado) − combustible − casetas − viáticos −
    materiales − siniestros a cargo de la empresa. Se muestra en el expediente de la orden y en Reportes.

**KPIs del Dashboard**: órdenes del día y la semana, ocupación de flota %, ocupación de cuadrillas %, tasa de cierre
de cotizaciones, ticket promedio, margen promedio por orden, siniestralidad (% de órdenes con daño), calificación del
cliente, cartera vencida, vencimientos próximos (licencias, pólizas, verificaciones).

---

## 10. Plan por fases

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| **F0 Fork** | Repo nuevo con remoto `irp`, Supabase prod y QA, Netlify con ramas `master`/`develop` | `npm run build` pasa; login funciona en QA; `verificar-post-migracion qa` 76/76 |
| **F1 Rebrand + limpieza** | Tokens centralizados, header y marca, módulos inmobiliarios fuera, nuevo CLAUDE.md | Cero referencias a `supabaseParking`, locales o vending; se ve igual que IRP con el nuevo color |
| **F2 Clientes + Leads** | CRUD, expediente de cliente sobre `ExpedienteLayout` | Drill-down cliente → cotizaciones → órdenes |
| **F3 Levantamiento + Cotización** | Catálogo de artículos y tarifas, cálculo, versiones, PDF | El cálculo coincide con `/calculos`; se genera el PDF |
| **F4 Portal cliente + Contrato + Anticipo** | `portal-cliente`, aceptación, contrato, comprobante | Pruebas RLS del rol `cliente` en verde |
| **F5 Flota** | Vehículos, documentos, combustible, mantenimiento | Alertas de vencimiento en el dashboard |
| **F6 RH extendido** | Tabs Licencias, Servicios y Equipo; `rol_operativo` | El trigger bloquea asignar un chofer vencido |
| **F7 Agenda + Órdenes** | Calendario, asignación, conflictos | No permite traslapes; muestra la capacidad |
| **F8 Campo (móvil)** | `/campo/orden/:id`: estatus, fotos, etiquetas, firma | Usable a 375 px con una mano; funciona con red débil |
| **F9 Finanzas / ERP** | Ventas y Gastos como libros (§3.5), CxC, CxP, rentabilidad, EDR, flujo, CFDI | `prp_rentabilidad_orden` cuadra contra gastos e ingresos; el EDR del mes cuadra con la suma de ventas y gastos |
| **F10 IA** | `inventario-ia`, agentes con dominio de mudanzas | El inventario sugerido es editable antes de guardar |
| **F11 Almacenaje** | Bodega con cargos recurrentes | Reusa `cargos_programados` |

---

## 11. Decisiones del cliente (2026-09-23) y su impacto

| # | Pregunta | Respuesta | Impacto en el diseño |
|---|---|---|---|
| 1 | Nombre, logo, color | **Mudanzas Express**. Logo y color pendientes | `VITE_APP_TITLE=Mudanzas Express`. Se arranca con la paleta propuesta en §2.2; al tener el color se cambia una sola línea en `theme.css` |
| 2 | Tipos de servicio | **Todos**: locales, foráneas, internacionales, corporativas y almacenaje | Almacenaje deja de ser opcional (F11 entra al alcance). Internacional: ver §12.3 |
| 3 | Cómo cotizan | **Precio cerrado** | El cotizador ya no calcula el precio: calcula el **costo estimado** y un **precio sugerido**. El vendedor captura el precio cerrado y el sistema muestra el margen estimado (ver §12.1) |
| 4 | Flota | **10 unidades**. No dijeron si subcontratan | Agenda simple (10 carriles). Se deja preparado `vehiculos.propio bool` para fleteros subcontratados |
| 5 | Pago a cuadrilla | **Mixto**: unos cobran por servicio y otros tienen sueldo | Esquema de pago por empleado y percepción "Servicios realizados" en nómina (ver §12.2) |
| 6 | Seguro | **Se vende a través de una aseguradora** (nombre pendiente) | Seguro como concepto de la cotización. Siniestros con folio de reclamación ante la aseguradora (ver §12.4) |
| 7 | Carta Porte | **Sí emiten**. PAC pendiente | Carta Porte entra al alcance en F9 y exige datos adicionales en flota, choferes y órdenes desde F5 (ver §12.5) |
| 8 | Celular en campo | **Sí, con datos**. Sin respuesta sobre modo sin conexión | No se hace modo *offline* completo; solo una cola de reintento para fotos y cambios de estatus cuando la señal falla |
| 9 | Corporativos | **Sí**, con crédito y órdenes de compra | `orden_compra` obligatoria en cotización y factura cuando el cliente la exige. CxC por antigüedad (ver §12.6) |
| 10 | SaaS o un cliente | **Un solo cliente por ahora** | **Single-tenant: no se agrega `empresa_id`.** Si después se vende a otras mudanceras, se hace un proyecto Supabase por cliente (como IRP↔Mudanzas), no multi-tenant |

### Pendientes que siguen abiertos
- Logo y color de marca.
- Nombre de la aseguradora y cómo se calcula la prima (porcentaje sobre el valor declarado o tabla).
- PAC con el que timbran hoy (necesario para CFDI y Carta Porte).
- ¿Subcontratan unidades o fleteros?
- En los servicios internacionales: ¿trabajan con agente aduanal propio o del cliente? ¿Cobran en USD?
- Montos del pago por servicio: ¿fijo por rol, porcentaje de la venta o tabla por tipo de servicio?

---

## 12. Ajustes al diseño por las decisiones del cliente

### 12.1 Cotización a precio cerrado
- `cotizaciones`: `+ costo_estimado`, `+ precio_sugerido`, `+ precio_cerrado`, `+ margen_estimado_pct`,
  `+ moneda text default 'MXN'`, `+ tipo_cambio numeric`, `+ orden_compra text`.
- `cotizacion_conceptos` pasa a ser el **desglose interno de costo** (cuadrilla, combustible, casetas, viáticos,
  material, seguro) y **no se imprime** en el PDF. El cliente ve un solo precio, con el seguro aparte si lo contrata.
- `cat_tarifas` guarda **costos**, no precios. `precio_sugerido = costo_estimado / (1 − margen_objetivo)`, con el
  margen objetivo por tipo de servicio en `cat_parametros`.
- Regla: si `margen_estimado_pct` queda abajo del margen mínimo, la cotización requiere aprobación de un admin antes
  de enviarse.
- Al cerrar la orden se compara el **margen estimado con el real** (`prp_rentabilidad_orden`). Es el reporte más
  valioso para que aprendan a cotizar mejor.

### 12.2 Pago mixto a la cuadrilla
- `rh_empleados`: `+ esquema_pago text check in ('SUELDO','POR_SERVICIO','MIXTO')`.
- `cat_pago_servicio (tipo_servicio, rol_operativo, monto)`: tabla de pagos por servicio. Se usa como default y es
  editable en cada asignación.
- `orden_asignaciones.pago_servicio numeric`: se llena con la tabla al asignar y se congela al cerrar la orden.
- Nómina: nueva percepción **"Servicios realizados"** = suma de `pago_servicio` de las órdenes cerradas en el periodo.
  Para `POR_SERVICIO` el salario base es 0 o el mínimo, según decida el contador. Para `MIXTO` se suma al sueldo.
- Los viáticos no son percepción: salen del fondo revolvente y se comprueban como gasto de la orden.
- En el expediente: el tab Nómina muestra el desglose por orden, y el tab Servicios muestra lo ganado por servicio.
- Rentabilidad: costo de mano de obra de la orden = `pago_servicio` (por servicio) + horas × costo hora (sueldo).

### 12.3 Internacional
- Moneda y tipo de cambio en cotización, venta y gasto. El EDR se reporta en MXN al tipo de cambio de la operación.
- Orden de servicio: `+ requiere_aduana bool`, `+ agente_aduanal`, `+ pedimento`, `+ pais_destino`. Los documentos
  del menaje van a `ordenes-evidencias`. **No** se modela el trámite aduanal; solo se registra y se adjunta.

### 12.4 Seguro y siniestros
- `cat_parametros`: aseguradora, número de póliza maestra y porcentaje de prima sobre el valor declarado.
- La cotización lleva `seguro_prima` como concepto visible al cliente. El costo de la prima para la empresa es un
  gasto de la orden (grupo Costo directo).
- `siniestros`: `+ folio_aseguradora`, `+ deducible`, `+ fecha_reporte`. El flujo es: se abre desde el inventario de
  destino, se reporta a la aseguradora, llega el dictamen y se registra el pago. Lo que la aseguradora no cubre
  (deducible o rechazo) es gasto de la orden.

### 12.5 Carta Porte (entra al alcance)
El complemento pide datos que hay que capturar **desde que se crean** flota, choferes y órdenes, no al facturar:
- `vehiculos`: `+ config_vehicular` (clave SAT), `+ permiso_sct_tipo`, `+ permiso_sct_numero`, `+ aseguradora_rc`,
  `+ poliza_rc`, `+ peso_bruto_vehicular`. Para remolques, tabla `vehiculo_remolques`.
- Choferes: RFC, número de licencia y domicilio ya existen en `rh_empleados` y `rh_licencias`.
- Orden: origen y destino con CP (ya en `cliente_direcciones`), distancia recorrida, fecha y hora de salida y
  llegada, mercancías con su clave de producto SAT, peso y cantidad (desde `orden_inventario` agrupado).
- `cat_parametros`: clave de producto SAT para menaje de casa y para mobiliario de oficina, a **confirmar con el
  contador**. No se inventan claves en el código.
- El timbrado va detrás de la Netlify Function `timbrar-cfdi`, con una interfaz única y un adaptador por PAC.
  Mientras no se defina el PAC, esa function genera el XML sin timbrar para revisión.

### 12.6 Corporativos
- `clientes`: `credito_dias` y `limite_credito` (ya en §5.1), `+ requiere_orden_compra bool`, `+ portal_proveedores`
  (dónde suben la factura).
- Regla: no se programa una orden de un cliente que rebasó su límite de crédito o tiene saldo vencido, salvo
  autorización de un admin, que queda en la bitácora.
- Cobranza: antigüedad de saldos 0-30 / 31-60 / 61-90 / +90 por cliente, con drill-down hasta la factura.

### 12.7 Fases actualizadas
- **F3** usa el esquema de precio cerrado del §12.1.
- **F5** captura desde el inicio los datos de Carta Porte de las unidades (§12.5).
- **F6** incluye `esquema_pago` y la tabla `cat_pago_servicio` (§12.2).
- **F9** incluye la percepción "Servicios realizados" en nómina, `timbrar-cfdi` con Carta Porte y el reporte
  "margen estimado vs. real".
- **F11 Almacenaje** deja de ser opcional.
