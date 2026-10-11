---
description: qa-corrector implementa hallazgos aprobados de la corrida con su prueba de regresión
---
Invoca al subagente `qa-corrector` para implementar los hallazgos con Decisión = Aprobado en `tests/corridas/<corrida>/hallazgos.md` (`$ARGUMENTS`), siguiendo docs/METODOLOGIA_QA.md §4 Fase 5. Un commit por hallazgo, con su prueba de regresión en `tests/regresion/`.
