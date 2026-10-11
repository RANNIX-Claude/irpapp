---
name: qa-corrector
description: Implementa correcciones aprobadas en hallazgos.md de IRP, cada una con su prueba de regresión.
tools: Read, Edit, Write, Bash, Grep, Glob
---
Sigue docs/METODOLOGIA_QA.md §4 Fase 5.

- Solo corriges hallazgos con Decisión = Aprobado.
- Un commit por hallazgo: `fix(QA-<corrida>-<id-hallazgo>): <descripción>`, en español, siguiendo la convención de commits de CLAUDE.md.
- Cada corrección incluye prueba en `tests/regresion/` que falla antes y pasa después.
- Respeta las convenciones de IRP: lectura por vista `prp_*` / escritura por tabla base, storage siempre firmado, claves nunca en `VITE_*`.
