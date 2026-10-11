# Escenarios de prueba — IRP

Seguir siempre [`docs/METODOLOGIA_QA.md`](../../docs/METODOLOGIA_QA.md). Un escenario por archivo YAML, prefijo por módulo.

## Contratos de Arrendamiento (`CONT`) — sesión 2026-10-11

| Escenario | Cubre |
|---|---|
| [ESC-CONT-001](ESC-CONT-001_alta_contrato_completo.yaml) | Alta de contrato completo, depósito cobrado al momento |
| [ESC-CONT-002](ESC-CONT-002_alta_arrendatario_y_expediente.yaml) | Alta de arrendatario persona física + expediente documental |
| [ESC-CONT-003](ESC-CONT-003_renovacion_contrato.yaml) | Renovación completa (RPC `renovar_contrato`, Renovaciones, en ejecución) |
| [ESC-CONT-004](ESC-CONT-004_cancelacion_rescision.yaml) | Cancelación/rescisión de contrato |
| [ESC-CONT-005](ESC-CONT-005_elaborar_contrato_wizard.yaml) | Wizard "Elaborar Contrato" (documento + pagarés) |
| [ESC-CONT-006](ESC-CONT-006_edicion_notas_filtros_listado.yaml) | Edición, notas, filtros/KPIs del listado, eliminación en cascada |

**Pendiente de decisión de negocio** (ver sección `ambiguedades` en cada YAML):
- AMB-CONT-001 — ¿alta de contrato debe marcar el local OCUPADO igual que la renovación?
- AMB-CONT-002 — umbral de 30 días (código) vs 60 días (CLAUDE.md) para habilitar "Renovar contrato"
- AMB-CONT-003 — modal dice "CANCELADO", el dato real guardado es `RESCISION`
- AMB-CONT-004 — dos chips de filtro "Rescisión" con el mismo id pero contadores de variables distintas

## Módulos pendientes
Inmuebles y Unidades, Cobranza + Conciliación, Ingresos, Gastos operativos, Fondo revolvente, RH y Nómina, Estacionamiento, Vending, Prospectos y CRM, EDR, Reportes y BI, Mantenimiento, Proveedores, Bitácora, Agua, Despachos, Restaurante, Validación, Configuración — uno por sesión, según §12 de la metodología.
