# Backlog IRP

Peticiones pendientes agrupadas por módulo. Al abrir una sesión de trabajo, copiar
solo la sección del módulo que se va a atacar — no el archivo completo.

Formato de cada línea: `- [ ] #NNN descripción (pantalla/archivo si se sabe)`
Al resolver: marcar `[x]` y agregar fecha, no borrar la línea (sirve de historial).

---

## RH
- [x] #003 Agregar tipo de contratación (Por tiempo determinado, Indeterminado, Por obra) al formulario de edición de empleado — 2026-09-11 (`RH.jsx`, migración `20260911100000_rh_empleados_tipo_contratacion.sql`)
- [x] #004 Agregar campos Bono y forma de pago del bono en el formulario de empleado; el cálculo de nómina suma el total a pagar en efectivo y el total en transferencia considerando sueldo + bono por separado — 2026-09-11 (`RH.jsx`, `ExpedienteEmpleado.jsx`, migración `20260911110000_rh_empleados_bono.sql`)

## Cobranza
- [ ] #001 Revisar ingreso 115 (L27, CINDE) — PARCIALMENTE_APLICADO, $16,649.57 sin distribuir (`prp_ingresos_descuadrados`)
- [ ] #002 Revisar ingreso 379 (L11/L12, Andrea Castillo) — PARCIALMENTE_APLICADO, $196.00 de diferencia (`prp_ingresos_descuadrados`)

## Contratos

## EDR

## Mantenimiento

## Estacionamiento

## Vending

## Prospectos / CRM

## Validación

## General / Config
