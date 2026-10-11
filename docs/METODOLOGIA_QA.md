# Metodología de Pruebas Asistidas por Agentes

> Documento operativo para Claude Code. Colocar en la raíz del repositorio como `docs/METODOLOGIA_QA.md` y referenciarlo desde `CLAUDE.md`:
> `Para cualquier tarea de pruebas, seguir estrictamente docs/METODOLOGIA_QA.md.`

---

## 1. Principios no negociables

1. **Sin evidencia no hay CUMPLE.** Un paso solo se marca CUMPLE si tiene captura y, cuando aplica, una consulta a base de datos que confirme lo guardado.
2. **Quien construye no juzga.** El agente que ejecuta las pruebas no lee código fuente durante la corrida. Valida contra el caso de prueba y las reglas de negocio, no contra la implementación.
3. **Nada se descarta en silencio.** Todo falso positivo, "no es bug" o "es timing" se registra con su justificación.
4. **No se corrige durante la corrida.** Primero se termina la batería completa, luego se corrige, luego se re-ejecuta.
5. **Negocio decide las discrepancias.** Si el sistema hace algo coherente pero distinto al resultado esperado, el agente no lo da por bueno: lo marca para decisión de negocio.
6. **El resultado esperado del caso original no se edita.** Si negocio cambia el esperado, se versiona el caso y se registra quién lo autorizó.
7. **Una precondición rota detiene el escenario.** Si los datos de prueba no cumplen la precondición (ej. pedido "Sin Cancelación" guardado con cancelación permitida), se detiene, se registra y se recrean los datos.

---

## 2. Roles (subagentes)

| Rol | Responsabilidad | Puede leer código | Puede modificar código |
|---|---|---|---|
| **qa-arquitecto** | Convierte casos de prueba (Excel) a escenarios YAML. Define precondiciones y consultas de verificación. | Solo esquema de BD | No |
| **qa-tester** | Ejecuta escenarios en el navegador, captura evidencia, registra resultados. | **No** | No |
| **qa-analista** | Clasifica hallazgos, encuentra causa raíz, propone corrección. | Sí | No |
| **qa-corrector** | Implementa correcciones aprobadas y su prueba de regresión. | Sí | Sí |
| **Humano (negocio)** | Resuelve discrepancias, cambios de nomenclatura y valores de catálogo. | — | — |

El orquestador (sesión principal de Claude Code) coordina, pero **no** ejecuta ni clasifica él mismo.

---

## 3. Estructura del repositorio

```
tests/
  escenarios/
    ESC-001_pedido_metropolitan_sin_cancelacion.yaml
    ...
  datos/
    semilla.sql                 # datos base reproducibles para QA
  corridas/
    2026-10-10_R001/
      manifiesto.json           # commit, versión BD, ambiente, escenarios
      bitacora.jsonl            # un evento por línea, solo append
      evidencias/
        ESC-001/
          P03_antes.png
          P03_despues.png
          P03_bd.sql            # consulta ejecutada
          P03_bd.json           # resultado de la consulta
          P03_consola.log       # errores de consola/red, si hubo
      hallazgos.md
      reporte.xlsx              # formato Comparativo
  regresion/                    # specs Playwright generados (ver §11)
.claude/
  agents/
    qa-arquitecto.md
    qa-tester.md
    qa-analista.md
    qa-corrector.md
  commands/
    qa-convertir.md
    qa-correr.md
    qa-analizar.md
    qa-corregir.md
    qa-cerrar.md
```

---

## 4. Ciclo de una corrida

### Fase 0 — Preparación
- Ambiente dedicado de QA (nunca producción).
- Restaurar BD desde `semilla.sql` o snapshot conocido.
- Registrar en `manifiesto.json`: id de corrida, fecha, commit (`git rev-parse HEAD`), versión de migraciones, URL del ambiente, usuario de prueba, escenarios incluidos.
- Todo registro creado en la corrida lleva prefijo identificable (ej. título `QA-R001-ESC001`) para poder rastrearlo y limpiarlo.

### Fase 1 — Conversión (qa-arquitecto)
- Transcribir cada escenario del Excel a YAML **sin alterar** descripción ni resultado esperado.
- Conservar los resultados de la corrida legado (Cumple/No cumple, observación, estado de corrección).
- Para cada paso, agregar: precondición, acción concreta, verificación en UI y verificación en BD (cuando el paso guarda o lee datos).
- Si el Excel tiene observaciones truncadas o ambiguas, marcarlas `AMBIGUO` y preguntar antes de ejecutar.

### Fase 2 — Ejecución (qa-tester)
- Ejecutar escenario por escenario, paso por paso.
- Por cada paso: captura antes, acción, esperar estado estable, captura después, verificación BD, registrar evento en `bitacora.jsonl`.
- Si algo falla, **reintentar una vez** con método alternativo (ver §6) antes de registrar. Registrar ambos intentos.
- No leer archivos de `src/`. Si necesita saber algo del sistema, lo registra como pregunta.

### Fase 3 — Análisis (qa-analista)
- Clasificar cada resultado distinto de CUMPLE (taxonomía §7).
- Para cada BUG: reproducir, identificar causa raíz en código, proponer corrección y la prueba que lo cubriría.
- Llenar `hallazgos.md` y `reporte.xlsx`.
- Generar lista de preguntas para negocio.

### Fase 4 — Revisión humana
- Negocio resuelve cada `DISCREPANCIA_NEGOCIO` y `CAMBIO_NOMENCLATURA`: aceptar comportamiento actual (se versiona el caso) o exigir corrección (pasa a BUG).
- Se registra la decisión, quién la tomó y la fecha.

### Fase 5 — Corrección (qa-corrector)
- Un commit por hallazgo, mensaje `fix(QA-R001-H01): <descripción>`.
- Cada corrección incluye su prueba automatizada de regresión.
- No corregir nada que no esté en `hallazgos.md` aprobado.

### Fase 6 — Re-ejecución
- Nueva corrida (`R002`) con los escenarios afectados **más** un muestreo de escenarios que pasaban, para detectar regresiones.

### Fase 7 — Cierre
- Se cumple el criterio de salida (§10).
- Reporte final consolidado con comparativo legado vs nueva corrida.

---

## 5. Formato de escenario (YAML)

```yaml
id: ESC-001
nombre: Pedido para Metropólitan (Seguridad) - Sin Cancelación
version: 1
fuente: Casos_Prueba_Legado.xlsx / hoja X
precondiciones:
  - Cliente "Ocesa" existe con al menos 2 contactos
  - UN "Seguridad" con sociedad pagadora "Lobo"
  - Producto "Seguridad-MA" con presentaciones definidas
datos_creados:
  pedido: { titulo_prefijo: "QA-{corrida}-ESC001" }

pasos:
  - n: 9
    descripcion: En el campo Permitir Cancelar, seleccionar NO
    esperado: ""
    legado: { resultado: Cumple, observacion: "", correccion: "" }
    accion: "Desmarcar checkbox 'Permitir cancelaciones' con click real"
    verificar_ui: "Checkbox desmarcado"
    verificar_bd: null        # se valida en el paso 10, al guardar

  - n: 10
    descripcion: Pulsar Aceptar
    esperado: El sistema genera un número consecutivo de pedido.
    legado: { resultado: Cumple, observacion: "", correccion: "" }
    accion: "Click en Aceptar"
    verificar_ui: "Se muestra número de pedido"
    verificar_bd: |
      SELECT id, permitir_cancelaciones, contacto_id, pep_id
      FROM pedidos WHERE titulo LIKE 'QA-{corrida}-ESC001%';
    esperado_bd: { permitir_cancelaciones: false }
    precondicion_critica: true   # si falla, detener el escenario
```

---

## 6. Reglas de interacción con el navegador

Lecciones ya aprendidas en corridas previas:

- **Checkboxes, radios y switches:** siempre click real. No usar `form_input` para estos controles.
- **Lectura de datos:** esperar a que no haya indicadores de carga y a que el valor sea estable (dos lecturas iguales con 1 s de diferencia) antes de registrar. Si un valor aparece vacío y luego se llena, registrar `UX_MENOR`, no descartarlo.
- **Validar lo guardado, no lo mostrado:** después de cada alta o edición, consultar la BD. La UI puede mostrar el estado del formulario y no el persistido.
- **Reintento:** si una acción falla, reintentar una vez con método alternativo (click por coordenadas, teclado, recargar página). Si el segundo intento funciona, clasificar el primero como `FALSO_POSITIVO_HERRAMIENTA`.
- **Errores de consola y red:** capturar cualquier error JS o respuesta HTTP 4xx/5xx durante el paso, aunque la UI parezca correcta.
- **Precondición crítica rota:** detener el escenario, registrar, recrear datos y reiniciar desde el paso 1.

---

## 7. Taxonomía

### Resultado del paso
| Valor | Significado |
|---|---|
| CUMPLE | Coincide con el esperado, con evidencia completa. |
| NO CUMPLE | No coincide con el esperado. |
| PARCIAL | La funcionalidad existe pero el dato o comportamiento difiere. |
| NO EJECUTABLE | No se puede probar: faltan datos, catálogo vacío, precondición rota. |
| VERIFICAR | Ejecutado sin evidencia suficiente, o requiere confirmación. |
| PENDIENTE | No ejecutado. |

### Clasificación del hallazgo
| Valor | Significado |
|---|---|
| BUG | Defecto reproducible del sistema. |
| FALSO_POSITIVO_HERRAMIENTA | Causado por la automatización, no por el sistema. |
| DISCREPANCIA_NEGOCIO | Comportamiento coherente pero distinto al caso; decide negocio. |
| CAMBIO_NOMENCLATURA | Mismo concepto con otro nombre respecto al legado. |
| GAP_CATALOGO | Faltan datos de catálogo para probar. |
| GAP_MIGRACION | Datos que existían en el legado y no están en el sistema nuevo. |
| UX_MENOR | Funciona con efectos visibles indeseables. |

### Severidad (solo BUG y GAP_MIGRACION)
| Nivel | Criterio |
|---|---|
| Crítica | Pérdida o corrupción de datos, cálculo de montos incorrecto, bloqueo de operación. |
| Alta | Regla de negocio incumplida, dato guardado incorrecto. |
| Media | Dato correcto en BD pero mostrado incorrectamente. |
| Baja | Cosmético. |

### Comparativo contra legado
`Mejora` · `Mejora parcial` · `Se mantiene` · `Sigue fallando` · `Regresión` · `Por verificar` · `No ejecutable` · `Pendiente`

---

## 8. Bitácora (`bitacora.jsonl`)

Un evento por línea, solo se agrega, nunca se edita:

```json
{"ts":"2026-10-10T11:42:07-06:00","corrida":"R001","esc":"ESC-001","paso":10,"intento":1,"accion":"click Aceptar","resultado":"CUMPLE","evidencias":["P10_antes.png","P10_despues.png","P10_bd.json"],"nota":"Pedido #198"}
{"ts":"2026-10-10T11:43:15-06:00","corrida":"R001","esc":"ESC-001","paso":10,"intento":1,"accion":"verificar_bd","resultado":"NO CUMPLE","nota":"permitir_cancelaciones=true, esperado false. Precondición crítica rota. Escenario detenido."}
```

---

## 9. Plantilla de hallazgo (`hallazgos.md`)

```markdown
### QA-R001-H01 — Contacto vacío en ficha del pedido
- Escenario / paso: ESC-001 / P03, P10
- Clasificación: BUG · Severidad: Media
- Reproducción: crear pedido con contacto → abrir ficha → campo Contacto muestra "—"
- Evidencia: evidencias/ESC-001/P10_despues.png, P10_bd.json
- Causa raíz: el formulario guarda `contacto_id`; la ficha lee `contacto_nombre` (snapshot nunca poblado)
- Corrección propuesta: (a) poblar snapshot al guardar, o (b) resolver por join en la ficha
- Prueba de regresión propuesta: tests/regresion/pedido_contacto.spec.ts
- Decisión: _pendiente_ · Aprobó: _ · Fecha: _
- Estado: Abierto
```

---

## 10. Criterio de salida

Una corrida se puede cerrar solo si:

- 0 BUG críticos o altos abiertos.
- 0 regresiones contra el legado.
- 0 pasos en VERIFICAR o PENDIENTE.
- Toda DISCREPANCIA_NEGOCIO y CAMBIO_NOMENCLATURA tiene decisión firmada.
- Todo NO EJECUTABLE tiene explicación y plan (cargar catálogo, recuperar migración).
- Cada BUG corregido tiene prueba de regresión automatizada que pasa.

---

## 11. De prueba con agente a regresión permanente

La corrida con agente es exploratoria: costosa y no determinista. Cada escenario que llega a CUMPLE completo se convierte en un spec de **Playwright** en `tests/regresion/`, generado a partir del YAML y la bitácora:

- Mismos pasos, mismas verificaciones de UI y BD.
- Traces y capturas de Playwright como evidencia.
- Se ejecuta en cada commit sin intervención del agente.

El agente queda para: escenarios nuevos, diagnóstico de fallos de la regresión y pruebas exploratorias.

---

## 12. Definición de subagentes (Claude Code)

`.claude/agents/qa-tester.md`
```markdown
---
name: qa-tester
description: Ejecuta escenarios de prueba en el navegador y registra evidencia. Usar para la fase de ejecución de docs/METODOLOGIA_QA.md.
tools: Read, Write, Bash, Glob
---
Eres el ejecutor de pruebas. Sigue docs/METODOLOGIA_QA.md §4 Fase 2 y §6.
- PROHIBIDO leer archivos dentro de src/ o cualquier código de la aplicación.
- Solo lees: tests/escenarios/, tests/datos/, docs/.
- Escribes únicamente dentro de tests/corridas/<corrida>/.
- No juzgas si una diferencia "es correcta": registras lo observado contra el esperado.
- Sin evidencia, el resultado es VERIFICAR.
```

`.claude/agents/qa-analista.md`
```markdown
---
name: qa-analista
description: Clasifica resultados de una corrida, encuentra causa raíz y propone correcciones. No modifica código.
tools: Read, Grep, Glob, Bash, Write
---
Sigue docs/METODOLOGIA_QA.md §4 Fase 3 y §7.
- Escribes solo en tests/corridas/<corrida>/hallazgos.md y reporte.xlsx.
- No modificas código de la aplicación.
- Toda diferencia de comportamiento coherente con el sistema pero distinta al esperado → DISCREPANCIA_NEGOCIO, nunca la cierres tú.
```

`.claude/agents/qa-corrector.md`
```markdown
---
name: qa-corrector
description: Implementa correcciones aprobadas en hallazgos.md, cada una con su prueba de regresión.
tools: Read, Edit, Write, Bash, Grep, Glob
---
Sigue docs/METODOLOGIA_QA.md §4 Fase 5.
- Solo corriges hallazgos con Decisión = Aprobado.
- Un commit por hallazgo: fix(<id-hallazgo>): <descripción>.
- Cada corrección incluye prueba en tests/regresion/ que falla antes y pasa después.
```

> Nota: la restricción "no leer src/" es por instrucción; la herramienta de navegador debe habilitarse para qa-tester según cómo esté configurada en el proyecto (MCP de navegador o Playwright).

---

## 13. Comandos

| Comando | Acción |
|---|---|
| `/qa-convertir <archivo.xlsx>` | qa-arquitecto convierte casos a YAML y lista ambigüedades. |
| `/qa-correr <escenarios>` | Fase 0 + qa-tester ejecuta y genera bitácora y evidencias. |
| `/qa-analizar <corrida>` | qa-analista clasifica y genera hallazgos, reporte y preguntas a negocio. |
| `/qa-corregir <corrida>` | qa-corrector implementa hallazgos aprobados. |
| `/qa-cerrar <corrida>` | Valida criterio de salida y genera reporte final. |
