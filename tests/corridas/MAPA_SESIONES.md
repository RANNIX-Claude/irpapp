# Mapa de sesiones de ejecución QA — IRP

Cada escenario se ejecuta en **su propia sesión de Claude Code**, aislada, para que la fase de
corrección (otro equipo) pueda entrar después a corregir hallazgo por hallazgo sin que las
corridas se mezclen. Convención de nombre de sesión: `IRP_QA_EscenarioNN` (dos dígitos,
numeración única y continua en todo el proyecto, no se reinicia por módulo).

Al abrir la sesión `IRP_QA_EscenarioNN`, el primer mensaje debe ser (ajustando el nombre del
archivo):

```
Ejecuta el escenario tests/escenarios/ESC-CONT-00N_<nombre>.yaml siguiendo
docs/METODOLOGIA_QA.md. Usa /qa-correr. El id de corrida es "EscenarioNN"
(carpeta tests/corridas/EscenarioNN/). Ambiente: QA de IRP (irpapp-qa), nunca producción.
```

## Módulo: Contratos de Arrendamiento

| Sesión | Escenario | Archivo | Estado | Carpeta de corrida |
|---|---|---|---|---|
| IRP_QA_Escenario01 | ESC-CONT-001 | [alta_contrato_completo](../escenarios/ESC-CONT-001_alta_contrato_completo.yaml) | EJECUTADO | `tests/corridas/Escenario01/` |
| IRP_QA_Escenario02 | ESC-CONT-002 | [alta_arrendatario_y_expediente](../escenarios/ESC-CONT-002_alta_arrendatario_y_expediente.yaml) | PENDIENTE | `tests/corridas/Escenario02/` |
| IRP_QA_Escenario03 | ESC-CONT-003 | [renovacion_contrato](../escenarios/ESC-CONT-003_renovacion_contrato.yaml) | PENDIENTE | `tests/corridas/Escenario03/` |
| IRP_QA_Escenario04 | ESC-CONT-004 | [cancelacion_rescision](../escenarios/ESC-CONT-004_cancelacion_rescision.yaml) | PENDIENTE | `tests/corridas/Escenario04/` |
| IRP_QA_Escenario05 | ESC-CONT-005 | [elaborar_contrato_wizard](../escenarios/ESC-CONT-005_elaborar_contrato_wizard.yaml) | PENDIENTE | `tests/corridas/Escenario05/` |
| IRP_QA_Escenario06 | ESC-CONT-006 | [edicion_notas_filtros_listado](../escenarios/ESC-CONT-006_edicion_notas_filtros_listado.yaml) | PENDIENTE | `tests/corridas/Escenario06/` |

Estados: `PENDIENTE` → `EN_CURSO` → `EJECUTADO` (bitácora completa, criterio §10 evaluado) →
`EN_CORRECCION` (fase de corrección trabajando sobre sus hallazgos) → `CERRADO`.

## Siguiente módulo
Al convertir el siguiente módulo (p. ej. Cobranza + Conciliación) a escenarios, continuar la
numeración en `Escenario07` en adelante y agregar una sección nueva en esta tabla.
