# Hallazgos — Corrida Escenario01

- Escenario analizado: `ESC-CONT-001_alta_contrato_completo.yaml` (Contratos de Arrendamiento, IRP)
- Ambiente: QA (`irpapp-qa` / Supabase `wijcjdbmdbxzmwpdxoal`)
- Commit al momento de la corrida: `4212723da20d97fe383d700807574a4738e8924c`
- Esta es la **primera corrida** de este escenario (no existe corrida legado previa). Donde la plantilla de §9/§3 pide comparativo contra legado, se usa `Pendiente` o `No ejecutable` según corresponda, dejándolo explícito en cada hallazgo y en `reporte.xlsx`.
- Fase 3 (este documento) fue elaborada leyendo `manifiesto.json`, `bitacora.jsonl`, las evidencias en `evidencias/ESC-CONT-001/` y, para causa raíz, el código de `src/components/ui/NuevoContratoModal.jsx`, `src/pages/Contratos.jsx` y las migraciones en `migrations/` y `supabase/migrations/`.

---

### QA-Escenario01-H01 — Alta de depósito en garantía rota por constraint desincronizado entre repo y BD de QA
- Escenario / paso: ESC-CONT-001 / P15 (precondición crítica)
- Clasificación: **BUG** · Severidad: **Crítica** (bloquea una operación de negocio completa: no se puede cobrar/registrar el depósito en garantía de ningún contrato nuevo en QA)
- Comparativo contra legado: **No ejecutable** (no hay corrida legado de este escenario)
- Reproducción:
  1. Crear contrato nuevo completo (pasos 1–12 del escenario, todos CUMPLE).
  2. En el "Paso 2" del modal (Depósito en Garantía), capturar fecha, forma de cobro TRANSFERENCIA y marcar "Ya fue cobrado".
  3. Pulsar "Registrar depósito".
  4. Resultado: el modal no cierra, muestra en rojo `new row for relation "cargos_programados" violates check constraint "cargos_programados_concepto_check"`. Reproducido 2/2 veces (no es intermitencia de la herramienta).
- Evidencia:
  - `evidencias/ESC-CONT-001/P15_error_intento1.png`, `P15_error_intento2.png`
  - `evidencias/ESC-CONT-001/P15_bd.sql` / `P15_bd.json` — 0 filas en `cargos_programados`/`ingresos`/`aplicaciones_pago` para el contrato de prueba: no se creó nada, consistente con el error.
  - `evidencias/ESC-CONT-001/P15_check_constraint_bd.sql` / `P15_check_constraint_bd.json` — definición real del constraint en QA: `CHECK ((concepto = ANY (ARRAY['RENTA','SANCION','MANTENIMIENTO','AGUA','OTRO'])))`, sin `DEPOSITO_GARANTIA`.
- Causa raíz (confirmada leyendo código y migraciones, no solo el mensaje de error):
  - `src/components/ui/NuevoContratoModal.jsx` líneas 98–108 inserta en `cargos_programados` con `concepto: 'DEPOSITO_GARANTIA'` (literal, confirmado leyendo el código), y líneas 112–117 inserta en `ingresos` con `tipo: 'DEPOSITO_GARANTIA'` / `tipo_concepto: 'DEPOSITO_GARANTIA'`. El valor enviado es exactamente el que la BD rechaza; no hay typo ni variante distinta.
  - Existe ya en el repo, committeada en `master` desde el **2026-10-01** (commit `ddad64a` "feat(contratos): deposito garantia + catalogos en menu"), la migración `supabase/migrations/20261001130000_deposito_garantia_concepto.sql`, que hace exactamente lo necesario:
    ```sql
    ALTER TABLE public.cargos_programados DROP CONSTRAINT IF EXISTS cargos_programados_concepto_check;
    ALTER TABLE public.cargos_programados ADD CONSTRAINT cargos_programados_concepto_check
      CHECK (concepto IN ('RENTA','SANCION','MANTENIMIENTO','AGUA','DEPOSITO_GARANTIA','OTRO'));
    -- + ingresos.tipo_check e ingresos.tipo_concepto_check, mismo patrón
    ```
  - Es decir: **el bug no es un defecto de código no escrito**, sino un **desfase de despliegue**: el frontend (y la migración que lo habilita) ya están en `master` desde hace 10 días, pero el constraint real en la base de datos de QA (`wijcjdbmdbxzmwpdxoal`) sigue con la versión vieja — la migración `20261001130000_deposito_garantia_concepto.sql` nunca se aplicó a QA (o se aplicó y luego QA se reconstruyó desde un dump de esquema anterior a esa fecha, ver procedimiento de "Cómo reconstruir QA desde cero" en `CLAUDE.md`, que puede perder migraciones de carril `supabase/migrations/` si el dump de esquema se tomó de un snapshot previo).
  - **Riesgo a verificar con urgencia, fuera del alcance de esta corrida de QA**: si el feature de depósito en garantía (`NuevoContratoModal.jsx`) ya está en `master`/producción y la misma migración tampoco se aplicó en producción, **cualquier alta de contrato con depósito cobrado en producción está rota ahora mismo con el mismo error**. Esto no se puede confirmar desde este rol/ambiente (qa-analista no tiene acceso a producción ni herramienta de consulta a BD en esta sesión); se deja como pregunta urgente a negocio/DevOps en la sección de preguntas, no se asume.
- Corrección propuesta:
  1. Aplicar la migración pendiente a QA: `npm run migrate:qa -- supabase/migrations/20261001130000_deposito_garantia_concepto.sql` (según el flujo descrito en `CLAUDE.md`).
  2. Verificar en paralelo si la misma migración está aplicada en producción; si no lo está, aplicarla ahí también con el mismo procedimiento (`migrate:prod`) con la debida ventana de cambio, dado que el frontend que depende de ella ya está desplegado.
  3. Añadir esta migración (o una verificación equivalente) al checklist de "reconstruir QA desde cero" / `verificar-post-migracion.mjs`, para que una reconstrucción de QA no vuelva a perder migraciones de catálogo que ya están en `master` pero no en el dump de esquema usado para el bootstrap.
- Prueba de regresión propuesta: `tests/regresion/contrato_deposito_garantia.spec.ts` — Playwright: crear contrato completo, registrar depósito con "Ya fue cobrado" marcado, y verificar que (a) el modal cierra sin error, (b) existe fila en `cargos_programados` con `concepto='DEPOSITO_GARANTIA'` e `importe` = 2× renta, (c) existe fila en `ingresos` con `tipo='DEPOSITO_GARANTIA'`, (d) existe fila en `aplicaciones_pago` que enlaza ambos con `importe_aplicado` igual al depósito. Además, un check de esquema/CI que falle si `cargos_programados_concepto_check` o `ingresos_tipo_check`/`ingresos_tipo_concepto_check` no incluyen `DEPOSITO_GARANTIA` en el ambiente objetivo (QA o prod), para detectar este desfase antes de que lo encuentre un agente de QA o un usuario real.
- **Decisión: Aprobado** — aplicar la migración pendiente a QA (`npm run migrate:qa -- supabase/migrations/20261001130000_deposito_garantia_concepto.sql`). PN-03 ya se verificó directamente contra producción (consulta read-only a `pg_constraint` vía pooler, 2026-10-11): el constraint en producción **ya incluye `DEPOSITO_GARANTIA`**, la migración sí está aplicada ahí — el riesgo en producción queda descartado, el gap es exclusivo de QA.
- Aprobó: Roberto Aguilar Cota · Fecha: 2026-10-11
- Estado: **Aplicado** (Fase 5, 2026-10-11) — `npm run migrate:qa -- supabase/migrations/20261001130000_deposito_garantia_concepto.sql` aplicada contra QA (`wijcjdbmdbxzmwpdxoal`). Verificado directamente en BD: `cargos_programados_concepto_check` ahora es `CHECK (concepto = ANY (ARRAY['RENTA','SANCION','MANTENIMIENTO','AGUA','DEPOSITO_GARANTIA','OTRO']))`. El runner corrió además las 98 pruebas de `test:rls` contra QA tras aplicar: 97/98 correctas; la única que falla (`asistente_ingresos > 0 → ERR 42703`) es preexistente y no relacionada con este cambio (columna faltante en una vista de un rol distinto, `asistente`), no una regresión introducida por esta migración. No hubo cambio de código de aplicación (es un cambio de infraestructura/BD). Prueba de regresión: `tests/regresion/contrato_deposito_garantia.spec.ts` (Playwright) — creada, pero **no se pudo ejecutar en este entorno**: el repo no tiene `@playwright/test` instalado ni `playwright.config.*`; no hay forma de correrla sin antes montar esa infraestructura. No se simula un resultado de corrida. Commit: `fix(QA-Escenario01-H01): aplicar migracion deposito_garantia_concepto a QA`.

---

### QA-Escenario01-H02 — Validación nativa del navegador oculta el mensaje de error personalizado (paso 11)
- Escenario / paso: ESC-CONT-001 / P11
- Clasificación: **BUG** · Severidad: **Baja** (cosmético — el bloqueo de envío funciona correctamente; solo el texto/mecanismo del mensaje es distinto al especificado)
- Comparativo contra legado: **No ejecutable** (no hay corrida legado)
- Reproducción: en el modal "Nuevo Contrato", vaciar el campo "Renta mensual" (que tiene el atributo HTML `required`) y pulsar el botón de envío. El navegador muestra su globo nativo "Completa este campo" y bloquea el `submit`; el mensaje de la aplicación nunca se llega a mostrar.
- Evidencia: `evidencias/ESC-CONT-001/P11_despues.png`
- Causa raíz (confirmada en código): `src/components/ui/NuevoContratoModal.jsx` define la validación personalizada en `handleSubmit` (línea ~51): `if (!form.arrendatario_id || !form.local_id || !form.renta_mensual) { setError('Completa los campos obligatorios (arrendatario, local, renta).'); return }`. Pero los `<select>`/`<input>` de Arrendatario, Local, Renta y Fecha de inicio tienen además el atributo HTML `required` (líneas 242, 254, 279, 314). Por especificación del Constraint Validation API del navegador, cuando un campo `required` está vacío, el navegador intercepta el evento `submit` **antes** de que React llegue a ejecutar `handleSubmit` y muestra su propio mensaje nativo — el código de la línea 51 nunca se ejecuta en ese camino. El mensaje personalizado sí existe en el código, pero es inalcanzable mientras el campo tenga `required` y esté vacío.
- Corrección propuesta: quitar el atributo `required` de los campos que ya se validan manualmente en `handleSubmit` (o agregar `noValidate` al `<form>`) y dejar que el único mecanismo de validación sea el `if` de la línea 51, que sí muestra el mensaje esperado por el caso de prueba.
- Prueba de regresión propuesta: `tests/regresion/contrato_validacion_campos.spec.ts` — vaciar Renta mensual, pulsar enviar, y verificar que el DOM muestre el texto exacto "Completa los campos obligatorios (arrendatario, local, renta)." (no el globo nativo) y que no se dispare ninguna petición de red hacia Supabase.
- Decisión: Aprobado — bug cosmético claro (no requiere juicio de negocio, solo confirmación de desarrollo); quitar `required` o agregar `noValidate` al `<form>`.
- Aprobó: Roberto Aguilar Cota · Fecha: 2026-10-11
- Estado: Aprobado — pendiente de Fase 5

---

### QA-Escenario01-H03 — Modal de alta de contrato no rotula "Paso 1 / Paso 2" aunque internamente sí tiene dos etapas
- Escenario / paso: ESC-CONT-001 / P02
- Clasificación: **DISCREPANCIA_NEGOCIO** (comportamiento coherente con el sistema, pero distinto al esperado del caso; no la cierro yo)
- Comparativo contra legado: **Pendiente** (depende de la decisión de negocio)
- Observación: el modal "Nuevo Contrato" se presenta como un formulario de una sola pantalla con todos los campos de datos del contrato visibles a la vez; el caso esperaba ver explícitamente un indicador "Paso 1 — Datos del contrato". Revisando el código, el modal sí está estructurado internamente en dos etapas secuenciales (`src/components/ui/NuevoContratoModal.jsx` línea 173: `{contratoCreado ? (/* Paso 2: Depósito en Garantía */) : (/* formulario de datos del contrato */)}`), pero esa etiqueta "Paso 2" es solo un comentario interno del código — nunca se renderiza como texto visible para el usuario, ni existe una etiqueta equivalente "Paso 1" para la primera pantalla.
- Evidencia: `evidencias/ESC-CONT-001/P2_despues.png`, `evidencias/ESC-CONT-001/P12_despues.png` (la pantalla de depósito, que es el "Paso 2" real)
- Causa raíz: diseño de UI — el flujo de 2 etapas existe funcionalmente pero no se comunica visualmente al usuario con un indicador de progreso ("Paso 1 de 2" / "Paso 2 de 2").
- Corrección propuesta (sujeta a decisión de negocio, no se implementa aquí): agregar un indicador de paso visible en el encabezado del modal si negocio considera que el usuario debe saber en qué etapa está; si negocio decide que el formulario de una sola pantalla es la UX deseada, se actualiza el esperado del caso de prueba en lugar del código.
- Prueba de regresión propuesta: condicionada a la decisión — si negocio pide el indicador, agregar aserción de texto "Paso 1" / "Paso 2" visible al spec de regresión de H01.
- **Decisión de negocio (PN-01): el formulario de una sola pantalla es la UX deseada.** No se corrige la UI; se versiona el caso de prueba (ver `version: 2` en `ESC-CONT-001_alta_contrato_completo.yaml`, paso 2).
- Aprobó: Roberto Aguilar Cota · Fecha: 2026-10-11
- Estado: **Cerrado** (ajuste de expectativa del caso, no bug)

---

### QA-Escenario01-H04 — `cat_locales.estatus` no pasa a OCUPADO al dar de alta un contrato (AMB-CONT-001)
- Escenario / paso: ESC-CONT-001 / P16
- Clasificación: **BUG** (reclasificado desde DISCREPANCIA_NEGOCIO tras decisión de negocio PN-02: el comportamiento correcto es que SÍ pase a OCUPADO) · Severidad: **Alta** (regla de negocio incumplida — riesgo de ofrecer el mismo local para un segundo contrato activo, ver razonamiento abajo)
- Comparativo contra legado: **No ejecutable** (no hay corrida legado)
- Reproducción: tras crear el contrato de prueba sobre el local `L091` (que estaba `DISPONIBLE`), `cat_locales.estatus` para `L091` sigue en `DISPONIBLE` después del alta.
- Evidencia: `evidencias/ESC-CONT-001/P16_bd.sql` / `P16_bd.json` → `{"estatus": "DISPONIBLE"}`
- Causa raíz (confirmada en código): `src/components/ui/NuevoContratoModal.jsx`, en el flujo completo de alta (`handleSubmit` + `registrarDeposito`, líneas 48–138), solo hace `insert` en `contratos` y en `contratos_locales`. No hay ningún `update` a `cat_locales` en todo el archivo. Un `grep` de `contrato_activo_id`/`OCUPADO` en este archivo no arroja resultados. Por contraste, el propio YAML del escenario ya documentaba (nota del paso 16, redactada por qa-arquitecto) que `renovar_contrato` y `guardarEdit` (en `DetalleModal`) sí actualizan `cat_locales.estatus`/`contrato_activo_id` explícitamente — confirmo que el alta inicial vía `NuevoContratoModal` es la única vía de creación de contrato que no lo hace.
- Relevancia de negocio (CLAUDE.md, regla absoluta #2): "Un contrato activo por unidad; al renovar se crea nuevo contrato con período de gracia". Si `cat_locales.estatus` es la fuente que otras pantallas usan para decidir si un local está disponible para un nuevo contrato (p. ej. el propio select de "Local disponible" de este mismo modal, que filtra por `estatus = 'DISPONIBLE'`), este gap podría permitir seleccionar el mismo local para un segundo contrato activo simultáneo — lo cual violaría esa regla absoluta. Esto es exactamente lo que negocio debe resolver: si el estatus debe actualizarse al alta (consistente con `renovar_contrato`) o si existe otro mecanismo (p. ej. un trigger de BD, o la regla "contrato único" se garantiza de otra forma no revisada en esta corrida) que lo impida igual. No lo asumo en ningún sentido.
- Corrección propuesta (sujeta a decisión de negocio): si negocio decide que sí debe actualizarse, agregar en `handleSubmit` (justo después del insert en `contratos_locales`) un `update` a `cat_locales` análogo al que hace `renovar_contrato`/`guardarEdit`.
- Prueba de regresión propuesta: `tests/regresion/contrato_local_estatus.spec.ts` — tras alta completa, verificar `cat_locales.estatus` del local usado (si negocio confirma que debe ser `OCUPADO`), y verificar que ese local ya no aparece en el select de "Local disponible" al abrir un segundo "Nuevo Contrato".
- **Decisión de negocio (PN-02): sí debe pasar a OCUPADO al alta**, igual que ya hacen `renovar_contrato` y `guardarEdit`. Se corrige agregando el `update` correspondiente en `NuevoContratoModal.jsx` (`handleSubmit`, justo después del insert en `contratos_locales`).
- Aprobó: Roberto Aguilar Cota · Fecha: 2026-10-11
- Estado: Aprobado — pendiente de Fase 5

---

### QA-Escenario01-H05 — Listado de Contratos no se refresca solo tras alta (síntoma secundario, probablemente ligado a H01)
- Escenario / paso: ESC-CONT-001 / P16 (observación adicional durante la verificación)
- Clasificación: **UX_MENOR**
- Comparativo contra legado: **No ejecutable**
- Reproducción observada: tras el error de H01 en el paso 15, buscar el folio `CA-2026-2138` en el listado sin recargar la página mostró "Sin contratos" y los KPIs seguían sin contar el contrato nuevo; tras recargar (F5), el contrato apareció correctamente con los KPIs actualizados.
- Evidencia: `evidencias/ESC-CONT-001/P16_despues.png` (tras recargar); sin captura "antes de recargar" (no se generó archivo para ese intento según la bitácora).
- Causa raíz y matiz importante (profundizando más allá de lo observado en Fase 2): leyendo `src/pages/Contratos.jsx` línea 2108-2112, el callback `onCreated={() => { setRefreshKey(k => k + 1); setShowNuevo(false) }}` **sí** dispara el refresco del listado (`setRefreshKey`) — pero en `NuevoContratoModal.jsx` ese callback `onCreated?.()` solo se invoca dentro de `registrarDeposito`, **después** de que las 3 inserciones (cargo, ingreso, aplicación de pago) terminan sin error (línea 133), justo antes de `onClose()`. Como en esta corrida `registrarDeposito` lanzó la excepción del constraint (H01) antes de llegar a la línea 133, `onCreated` nunca se ejecutó — por lo tanto el listado nunca tenía razón para refrescarse sin recargar manualmente. **Esto no demuestra, por sí mismo, un bug independiente de refresco**: es el comportamiento esperado del código dado que H01 impidió completar el flujo de depósito.
- Recomendación: no tratar esto como un hallazgo aislado a corregir ahora. Una vez corregido H01, repetir el paso 16 en la prueba de regresión y confirmar que, en el camino feliz (depósito registrado sin error), el listado sí se refresca solo (porque `onCreated`/`setRefreshKey` sí se alcanzarían). Si en ese escenario corregido el listado sigue sin refrescarse sin recargar, entonces sí es un bug independiente y se debe abrir un hallazgo nuevo.
- Prueba de regresión propuesta: cubierta implícitamente por la aserción (a) de la prueba de regresión de H01 ("el modal cierra sin error"); agregar además una aserción de que el contrato nuevo aparece en el listado sin necesidad de recargar la página.
- Decisión: no aplica (no es un hallazgo a resolver por separado mientras H01 esté abierto) · Estado: Abierto, condicionado a re-verificación tras corregir H01

---

## Resumen de clasificación

| ID | Paso(s) | Clasificación | Severidad | Estado |
|---|---|---|---|---|
| QA-Escenario01-H01 | P15 | BUG | Crítica | Aprobado — pendiente Fase 5 |
| QA-Escenario01-H02 | P11 | BUG | Baja | Aprobado — pendiente Fase 5 |
| QA-Escenario01-H03 | P02 | DISCREPANCIA_NEGOCIO | — | **Cerrado** (se versiona el caso, no se corrige código) |
| QA-Escenario01-H04 | P16 | BUG (reclasificado, ver PN-02) | Alta | Aprobado — pendiente Fase 5 |
| QA-Escenario01-H05 | P16 | UX_MENOR | — | Abierto, condicionado a H01 |

Pasos CUMPLE con evidencia completa y sin hallazgo: 1, 3 (UI; ver nota de BD abajo), 4, 5, 6 (intento 2; intento 1 = `FALSO_POSITIVO_HERRAMIENTA` por click en coordenadas erróneas, no es hallazgo del sistema), 7, 8, 9, 10, 12, 13, 14.

Nota sobre el paso 3 (verificación BD): el resultado quedó en **VERIFICAR**, no CUMPLE, porque la consulta `SELECT id, estatus FROM arrendatarios WHERE estatus <> 'ACTIVO'` regresó 0 filas en QA — no hay ningún arrendatario inactivo con el cual contrastar negativamente que el select de la UI los excluya. No es un hallazgo del sistema; es un `GAP_CATALOGO` de datos de prueba: falta al menos un arrendatario con estatus distinto de `ACTIVO` en los datos de QA para poder validar positivamente este filtro. Se deja registrado como pendiente de dato de prueba, no como BUG ni DISCREPANCIA_NEGOCIO.

El escenario se detuvo en el paso 15 (precondición crítica rota, regla §1.7 de la metodología); el paso 16 se ejecutó únicamente como verificación de lectura adicional (sin reintentar la corrección), tal como registra la bitácora.

---

## Preguntas para negocio

### PN-01 — Rotulado "Paso 1 / Paso 2" en el modal de alta de contrato (relacionado con H03) — **RESUELTA**
El modal "Nuevo Contrato" ya está estructurado internamente en dos etapas (datos del contrato → depósito en garantía) pero no muestra ningún indicador visible de "Paso 1 de 2" / "Paso 2 de 2" al usuario.
**Decisión (Roberto Aguilar Cota, 2026-10-11): el formulario de una sola pantalla actual es la UX deseada.** No se toca código; se versiona el esperado del caso `ESC-CONT-001` paso 2 (`version: 2`).

### PN-02 — `cat_locales.estatus` al dar de alta un contrato (AMB-CONT-001, relacionado con H04) — **RESUELTA**
¿`NuevoContratoModal` debe actualizar `cat_locales.estatus` a `OCUPADO` (y/o `contrato_activo_id`) al dar de alta el contrato, igual que ya lo hacen `renovar_contrato` y `guardarEdit` (DetalleModal)?
**Decisión (Roberto Aguilar Cota, 2026-10-11): sí, debe actualizarse.** H04 se reclasifica de DISCREPANCIA_NEGOCIO a BUG (severidad Alta) y pasa a Fase 5.

### PN-03 — Urgencia de verificar si producción tiene el mismo gap de migración que causó H01 — **RESUELTA**
**Verificado el 2026-10-11 (consulta read-only directa a producción vía pooler, `pg_constraint`): el constraint `cargos_programados_concepto_check` en producción YA incluye `DEPOSITO_GARANTIA`.** La migración `20261001130000_deposito_garantia_concepto.sql` sí está aplicada en producción. Riesgo descartado: el alta de depósito en garantía funciona correctamente en producción; el gap es exclusivo de la base de datos de QA (probablemente perdido en una reconstrucción de QA desde un dump de esquema anterior al 2026-10-01).

### PN-04 — Dato de prueba faltante: arrendatario inactivo en QA (relacionado con la nota de VERIFICAR del paso 3) — **RESUELTA**
No existía ningún arrendatario con `estatus <> 'ACTIVO'` en los datos de QA, lo que impidió validar positivamente que el select de "Arrendatario" del modal los excluye.
**Decisión (Roberto Aguilar Cota, 2026-10-11): crear un arrendatario de prueba INACTIVO en QA ahora** (prefijo `QA-`), para poder re-verificar el paso 3 en la siguiente corrida sin esperar a una nueva carga de semilla.
**Ejecutado**: `public.arrendatarios` id `6338d352-0d73-44ef-824a-1597d093be4b`, `locatario = 'QA-DatoPrueba-Inactivo'`, `estatus = 'INACTIVO'`, creado en QA (`wijcjdbmdbxzmwpdxoal`) el 2026-10-11 vía script temporal de un solo uso (ya eliminado del repo, no quedó en `scripts/`). Disponible para la siguiente corrida de ESC-CONT-001 o de cualquier otro escenario que necesite un arrendatario inactivo de referencia.
