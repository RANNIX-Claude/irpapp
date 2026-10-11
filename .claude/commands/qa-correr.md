---
description: Fase 0 + qa-tester ejecuta escenarios y genera bitácora y evidencias
---
Prepara el ambiente de QA (Fase 0 de docs/METODOLOGIA_QA.md: restaurar/validar BD QA, crear `manifiesto.json` en `tests/corridas/<corrida>/`) y luego invoca al subagente `qa-tester` para ejecutar los escenarios indicados en `$ARGUMENTS` contra el ambiente QA de IRP (irpapp-qa), generando bitácora y evidencias según §4 Fase 2 y §6. Nunca contra producción.
