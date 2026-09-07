# ADR-001 — Integración de IwolPark como módulo de estacionamiento de IRP

- **Estado**: Aceptado
- **Fecha**: 2026-09-06
- **Decide**: Roberto Aguilar Cota — RANNIX Consulting
- **Sistemas**: IRP (`RANNIX-Claude/irpapp`) · IwolPark (`RANNIX-Claude/iwolpark`)

---

## Contexto

IRP administra Plaza IWOL: inmuebles, contratos, cobranza, RH, mantenimiento.
IwolPark administra el estacionamiento de esa misma plaza y **ya está en producción**
(`iwol.click`, v101), con cajeros cobrando, impresora térmica, cortes de turno y
pensionados activos.

Son dos sistemas separados sobre el mismo negocio. El administrador de la plaza tiene
que abrir dos aplicaciones distintas, y el corporativo no puede ver el ingreso total de
la plaza en una sola vista.

### Hallazgo: el módulo está diseñado dos veces

`MODELO_DATOS.md` de IRP define un **Módulo 8 — Estacionamiento** con cinco tablas que
duplican lo que IwolPark ya resuelve en producción:

| IRP Módulo 8 (diseño) | IwolPark (producción) |
|---|---|
| `cajones_estacionamiento` | `dim_plaza`, `locales` |
| `tarifas_estacionamiento` | `tarifas_historico`, `v_tarifas_vigentes` |
| `pensiones_estacionamiento` | `pensiones`, `pagos_pension`, `clientes`, `vehiculos` |
| `accesos_estacionamiento` | `tickets`, `fact_operacion` |
| `cobros_turno` | `turnos`, `cajeros` |

---

## Decisión

**Se descarta el Módulo 8 de IRP. IwolPark se absorbe como el módulo de estacionamiento.**

Un diseño en papel no reemplaza un sistema con 101 despliegues en producción, cortes de
caja reales y dos años de correcciones ganadas en campo.

### 1. IwolPark no se toca

Sigue operando exactamente como está —mismo código, misma base, mismos despliegues—
hasta que IRP lo reemplace por completo. No se le hace ningún cambio para habilitar la
integración.

### 2. IRP se conecta a la base de IwolPark, no a una copia

El módulo de estacionamiento de IRP lee y escribe **directamente sobre la base de
producción de IwolPark** (`syryisrelcjgdulxmgro`).

Consecuencia central: **no existe migración de datos y no existe divergencia posible.**
Los dos sistemas operan sobre las mismas filas durante todo el periodo de convivencia.
Un pago de pensión cobrado en la tablet aparece en IRP, y al revés.

Implementación: cliente Supabase adicional en el frontend de IRP apuntando a esa base.
Cuando el corporativo requiera cruzar renta y estacionamiento en una sola consulta SQL,
se evalúa Foreign Data Wrapper sobre la base de IRP.

### 3. Las tablas no se modifican

Ninguna de las 20 tablas de IwolPark cambia de estructura. Ni una columna, ni un tipo,
ni un constraint. Toda unificación con entidades de IRP (`prp.empleados`,
`prp.unidades`, `prp.inmuebles`) se hará —si se hace— como columnas nuevas nullable,
posteriores al apagado, y nunca como modificación de lo que hoy escribe producción.

### 4. La navegación pasa de barra superior a menú lateral

El menú horizontal de `IwolPark_Dashboard_Admin.html` desaparece. Todas sus opciones se
convierten en entradas del menú lateral de IRP, bajo una sección `Estacionamiento`.

El **contenido** de los tableros se conserva tal cual: mismas gráficas, mismo mapa de
calor de demanda, mismos KPIs. Lo único que cambia es el envoltorio de navegación.

### 5. Apagado por switch, al final

IwolPark se apaga completo cuando IRP cubre toda su funcionalidad administrativa. No hay
apagado parcial ni corte de datos: es un cambio de interfaz sobre datos que nunca se
movieron.

---

## Estructura de navegación

```
IRP · menú lateral
├── Dashboard
├── Inmuebles y Unidades
├── Contratos
├── Cobranza
├── Arrendatarios
│
├── ESTACIONAMIENTO
│   ├── Tableros            ← dashboards de IwolPark, sin cambios
│   │     Movimientos · Demanda · Histórico
│   ├── Pensiones
│   ├── Promociones
│   ├── Tarifas y tolerancia
│   ├── Gestión manual de tickets
│   ├── Operadores / Cajeros
│   ├── Chat con operadores
│   ├── Captura histórico mensual
│   ├── Bitácora
│   └── Parámetros del sistema
│
├── Mantenimiento
├── RH y Nómina
└── Corporativo
      └── tableros de estacionamiento como un rubro del consolidado
```

Los tableros aparecen en dos lugares con propósitos distintos —operativo bajo
`Estacionamiento`, consolidado bajo `Corporativo`— reutilizando el mismo componente.

---

## Roles

| Rol | Alcance |
|---|---|
| `cajero` | Solo la app TABLET, solo su turno abierto |
| `admin_estacionamiento` | Sección Estacionamiento completa |
| `admin_plaza` | Todo IRP, con Estacionamiento incluido en su menú |
| `corporativo` | Lectura consolidada, multi-plaza |

---

## Las tres aplicaciones de IwolPark

| App | Destino |
|---|---|
| **TABLET** (cajero) | **No se migra.** Corre en kiosco con impresora POS-58 y modo offline (`sync_queue`). Es el punto de cobro: si falla, la plaza no factura. Se queda como está |
| **Admin** | Se reconstruye en IRP bajo la sección Estacionamiento |
| **Corporativo** | Sus tableros pasan a ser un rubro del módulo Corporativo de IRP |

---

## Inventario de IwolPark — 20 tablas

**Esquema base** (`IwolPark_schema.sql`, 12): `cajeros`, `clientes`, `dim_plaza`,
`dim_tiempo`, `dim_tipo_boleto`, `fact_operacion`, `pagos_pension`, `pensiones`,
`sync_queue`, `tarifas_historico`, `turnos`, `vehiculos`

**Migraciones** (`sql_*.sql`, 6): `avisos_operador`, `campanas`, `historico_mensual`,
`impactos_detalle`, `locales`, `versiones_app`

**Sin DDL versionado** (4): `tickets`, `bitacora`, `cortes`, `empleados`

**Vistas** (6): `v_kpi_dia`, `v_kpi_franja`, `v_kpi_cajero`, `v_resumen_mensual`,
`v_pensiones_estado`, `v_cobranza_mes`

---

## Bloqueadores

### 1. Cuatro tablas no existen en el repositorio

Actualizado 2026-09-07: no son dos, son cuatro. Cruzando las tablas que el código
consulta contra las que el repositorio define:

| Tabla | Rastro en el repositorio |
|---|---|
| `tickets` | solo `alter table` — **tabla central del negocio (los boletos)** |
| `bitacora` | solo `alter table` |
| `cortes` | **ningún rastro**, salvo su uso en `mcp-iwolpark/server.js` — es donde cuadra el dinero del turno |
| `empleados` | sin DDL, y `sql_empleado_id.sql` le agrega una FK encima |

Su estructura solo vive en la base. Hoy nadie puede reconstruir IwolPark desde su
repositorio, y `cortes` importa especialmente para IRP: ahí se concilia el efectivo
de cada turno contra lo esperado.

Se descartó que el DDL estuviera en otro lado: se extrajo el texto del PDF de 48
páginas y de los dos `.docx` del repositorio —el transcript de meses de desarrollo—
sin un solo `create table tickets`.

**Acción**: `sql_introspeccion_tickets_bitacora.sql` (rama `claude/ddl-tickets-bitacora`
de IwolPark) devuelve columnas con tipo y default, constraints, índices, RLS, GRANTs y
triggers de las cuatro tablas en una sola corrida. Correrlo **en QA y en Producción**:
comparar ambas salidas es lo único que prueba si los ambientes divergieron.

### 2. `tickets` no tiene UNIQUE sobre `folio`

`IwolPark_TABLET.html:1591` documenta que la tabla carece de esa restricción, y por eso
`enviarSupabase()` hace PATCH por folio y, si no actualizó ninguna fila, POST. **Ese
camino no es atómico**: dos peticiones casi simultáneas pueden insertar el mismo folio
dos veces. El código ya trae el manejo del error 23505 previsto "para cuando la
constraint exista".

Crear la restricción cierra el hueco, pero primero hay que depurar los duplicados que ya
existan en producción. Es una decisión con datos de por medio, no un `alter table`
suelto. Debe resolverse antes de que IRP escriba sobre `tickets`.

### 3. La red saliente bloquea Supabase

Las sesiones de Claude Code —tanto en la nube como en la instalación local— tienen
`supabase.co` bloqueado por política del proxy (403 al CONNECT). Ninguna puede leer el
catálogo de la base directamente.

Consecuencia operativa: toda introspección de esquema se hace pegando SQL en el editor
de Supabase y devolviendo la salida. Alternativa: abrir la política de red del entorno
en la configuración de claude.ai/code.

---

## Plan

| # | Etapa | Riesgo |
|---|---|---|
| 0 | Extraer y versionar el DDL real de las cuatro tablas sin DDL | Ninguno |
| 0b | Resolver el `UNIQUE(folio)` de `tickets` y sus duplicados | Medio — toca datos de producción |
| 1 | Marcar el Módulo 8 como reemplazado en `MODELO_DATOS.md` | Ninguno |
| 2 | Conectar IRP a la base de estacionamiento (cliente Supabase adicional) | Ninguno — solo lectura al inicio |
| 3 | Construir la sección Estacionamiento en el menú lateral | Ninguno |
| 4 | Migrar los tableros (Movimientos, Demanda, Histórico) | Ninguno — solo lectura |
| 5 | Construir Pensiones en IRP | Bajo — escritura sobre tablas compartidas |
| 6 | Construir el resto de la administración | Bajo |
| 7 | Incorporar los tableros al módulo Corporativo | Ninguno |
| 8 | Apagar IwolPark Admin y Corporativo | Medio — validar cobertura funcional completa |
| 9 | TABLET: se queda operando. Su migración es decisión posterior | — |

---

## Consecuencias

**A favor**
- Cero migración de datos y cero divergencia durante la convivencia
- IwolPark sigue produciendo sin interrupción ni riesgo
- Se conserva la lógica de negocio probada en campo
- El apagado es reversible hasta el último momento: si algo falta, se vuelve a prender
- El corporativo obtiene ingreso total de plaza —renta más estacionamiento— en una vista

**En contra**
- IRP mantiene dos conexiones a base de datos mientras dure la convivencia
- Los JOIN entre `prp` y estacionamiento no son posibles en SQL directo hasta que se
  monte el Foreign Data Wrapper; mientras tanto se resuelven en la capa de aplicación
- Se desecha el diseño del Módulo 8 (trabajo ya invertido en `MODELO_DATOS.md`)

**Pendientes de decisión**
- Si las tablas de estacionamiento se consolidan algún día en la base de IRP, o se
  quedan permanentemente donde están
- Si la TABLET se reescribe eventualmente o se conserva como aplicación autónoma
