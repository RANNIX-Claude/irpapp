---
description: Fase 0 + qa-tester ejecuta escenarios y genera bitácora y evidencias
---
Prepara el ambiente de QA (Fase 0 de docs/METODOLOGIA_QA.md: restaurar/validar BD QA, crear `manifiesto.json` en `tests/corridas/<corrida>/`) y luego invoca al subagente `qa-tester` para ejecutar los escenarios indicados en `$ARGUMENTS` contra el ambiente QA de IRP (irpapp-qa), generando bitácora y evidencias según §4 Fase 2 y §6. Nunca contra producción.

**Convención de sesiones en IRP**: cada escenario se corre en su propia sesión de Claude Code,
nombrada `IRP_QA_EscenarioNN`, aislada de las demás para que la fase de corrección pueda entrar
después escenario por escenario. El id de corrida (`<corrida>`) debe ser `EscenarioNN` (mismo
número que la sesión), no una fecha — ver `tests/corridas/MAPA_SESIONES.md` para el mapa
sesión ↔ escenario ↔ carpeta de corrida, y actualizar su columna "Estado" al terminar.
