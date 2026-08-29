# PRP — Property Resource Planning
## Modelo de Datos · FASE 2 Súper Prompt Maestro v5.0
### RANNIX Consulting · Roberto Aguilar Cota · 2026

---

## Resumen del Modelo

| Categoría | Cantidad |
|-----------|----------|
| Catálogos (`cat_*`) | 20 |
| Tablas principales | 35 |
| Vistas (`v_*`) | 4 |
| Bitácoras | 6 |
| Datos sintéticos | 80+ registros |

**Esquema Supabase**: `prp` (separado de `public` y `dw`)

---

## Catálogos

| Tabla | Descripción | Registros |
|-------|-------------|-----------|
| `cat_estado_general` | Estados de todos los módulos | 18 |
| `cat_tipo_inmueble` | Plaza, edificio, bodega, etc. | 5 |
| `cat_tipo_unidad` | Local, oficina, bodega, kiosko | 8 |
| `cat_giro_comercial` | Giro del arrendatario | 15 |
| `cat_tipo_contrato_arrendamiento` | Anual, semestral, mensual | 4 |
| `cat_tipo_pago` | SPEI, efectivo, tarjeta, etc. | 7 |
| `cat_regimen_fiscal` | Regímenes SAT CFDI 4.0 | 7 |
| `cat_tipo_acceso` | Boleto normal, pensión, perdido | 7 |
| `cat_zona_estacionamiento` | Zona A/B/C/D, discapacidad | 6 |
| `cat_tipo_vehiculo` | Auto, moto, camioneta, etc. | 6 |
| `cat_tipo_contrato_laboral` | A prueba, indefinido, obra | 5 |
| `cat_estado_civil` | Soltero, casado, divorciado, etc. | 5 |
| `cat_tipo_documento` | Documentos empleado y arrendatario | 16 |
| `cat_tipo_incidencia` | Faltas, retardos, horas extra, bonos | 13 |
| `cat_tipo_notificacion` | Triggers por módulo | 14 |
| `cat_canal_notificacion` | Email, WhatsApp, SMS, push | 5 |
| `cat_concepto_egreso` | Tipos de gasto + deducibilidad | 16 |
| `cat_tipo_proveedor` | Física, moral, extranjero | 3 |
| `cat_categoria_proveedor` | Limpieza, seguridad, construcción | 12 |
| `cat_motivo_cancelacion_cfdi` | Motivos SAT (01-04) | 4 |

---

## Tablas por Módulo

### Módulo 0 — Configuración
| Tabla | Descripción |
|-------|-------------|
| `empresa` | Datos de la empresa: RFC, representante, PAC, serie CFDI |

### Módulo 1 — Inmuebles y Unidades
| Tabla | Descripción |
|-------|-------------|
| `inmuebles` | Propiedades: nombre, tipo, ubicación, m², niveles |
| `unidades` | Locales/oficinas: clave, piso, m², renta base, estado |

### Módulo 2 — Arrendatarios
| Tabla | Descripción |
|-------|-------------|
| `arrendatarios` | Persona física o moral: RFC, giro, contactos, calificación |
| `documentos_arrendatario` | INE, acta constitutiva, RFC, fianza — con Storage path |

### Módulo 3 — Contratos de Arrendamiento
| Tabla | Descripción |
|-------|-------------|
| `contratos_arrendamiento` | Folio, renta, depósito, incremento anual, penalización mora |
| `plantillas_contrato` | Templates .docx con variables JSON para auto-generación |

### Módulo 4 — Cobranza
| Tabla | Descripción |
|-------|-------------|
| `cargos_renta` | Cargo mensual auto-generado con renta + mantenimiento + IVA |
| `pagos_renta` | Pagos recibidos: monto, banco, referencia, conciliado |

### Módulo 5 — RH Reclutamiento
| Tabla | Descripción |
|-------|-------------|
| `vacantes` | Puesto, área, salario, fechas, estado |
| `candidatos` | CV, score IA (Claude), etapa de selección, resultado entrevista |

### Módulo 6 — RH Empleados
| Tabla | Descripción |
|-------|-------------|
| `empleados` | Datos completos: CURP, RFC, NSS, puesto, salario, cuenta CLABE |
| `documentos_empleado` | Acta, CURP, INE, domicilio, constancia SAT, # IMSS — con Storage |
| `contratos_laborales` | A prueba (30d) → indefinido, folio CL-YYYY-NNNN, docx en Storage |
| `beneficiarios_empleado` | Carta testamentaria: parentesco, % herencia |

### Módulo 7 — RH Nómina e Incidencias
| Tabla | Descripción |
|-------|-------------|
| `incidencias_rh` | Faltas, retardos, horas extra, vacaciones, bonos por período |
| `nomina_quincenal` | Cabecera: período, fechas, totales, estado |
| `nomina_detalle` | Línea por empleado: percepciones, ISR, IMSS, deducciones, neto |

### Módulo 8 — Estacionamiento
| Tabla | Descripción |
|-------|-------------|
| `cajones_estacionamiento` | 40 cajones con zona, nivel, estado, pensión asignada |
| `tarifas_estacionamiento` | Por tipo_acceso + tipo_vehículo: hora, fracción, mensual, perdido |
| `pensiones_estacionamiento` | Contrato mensual: titular, placa, cajón(es), monto, vigencia |
| `accesos_estacionamiento` | Entrada/salida: placa, tipo, tiempo, cobro, turno |
| `cobros_turno` | Cierre de caja por cajero/turno: efectivo esperado vs real |

### Módulo 9 — Proveedores
| Tabla | Descripción |
|-------|-------------|
| `proveedores` | RFC, categoría, contacto, CLABE, calificación promedio |
| `evaluaciones_proveedor` | Calidad/precio/tiempo/servicio (1-5), promedio calculado |
| `cuentas_pagar` | Facturas proveedor: CFDI, vencimiento, saldo, estado |

### Módulo 10 — Mantenimiento
| Tabla | Descripción |
|-------|-------------|
| `ordenes_trabajo` | OT correctivo/preventivo: prioridad, fechas, costo, fotos |

### Módulo 11 — Egresos / Fondo Revolvente
| Tabla | Descripción |
|-------|-------------|
| `fondos_revolventes` | Monto autorizado, saldo actual, responsable, alerta mínimo |
| `egresos` | Gasto: concepto, área, comprobante URL, IVA, deducible, validado |

### Módulo 12 — Prospectos / CRM
| Tabla | Descripción |
|-------|-------------|
| `prospectos` | Pipeline: etapa, temperatura, probabilidad, origen |
| `seguimiento_prospecto` | Historial de contacto: llamada, visita, propuesta, WhatsApp |

### Módulo 13 — Notificaciones
| Tabla | Descripción |
|-------|-------------|
| `plantillas_notificacion` | Template por tipo + canal con variables {{}} |
| `cola_notificaciones` | Cola de envío con reintentos y estado de entrega |

---

## Bitácoras

| Tabla | Registra |
|-------|---------|
| `bitacora_contrato` | Cambios en contratos arrendamiento y laborales |
| `bitacora_cobranza` | Pagos, moras, cancelaciones |
| `bitacora_rh` | Contrataciones, bajas, incidencias |
| `bitacora_acceso_estacionamiento` | Entradas, salidas, cobros |
| `bitacora_notificaciones` | Historial completo de envíos (evidencia legal) |
| `bitacora_egreso` | Creación, validación, rechazo de egresos |

---

## Vistas

| Vista | Descripción |
|-------|-------------|
| `v_ocupacion_inmueble` | % ocupación por inmueble (ocupadas / total) |
| `v_cobranza_mes` | Resumen cargos del mes: total, saldo, mora por arrendatario |
| `v_nomina_empleados` | Lista empleados activos con salario y antigüedad |
| `v_kpis_dashboard` | KPIs del Dashboard: ocupación, ingresos, OTs, prospectos, mora |

---

## Generación Automática de Contratos

### Campos variables identificados en contratos reales

**Contrato a Prueba (Art. 39-A LFT)** — fuente: `Itzel Guadalupe Cruzalta Marroquin`
- `{{TRABAJADOR_NOMBRE}}` ← `empleados.nombre_completo`
- `{{TRABAJADOR_CURP}}` ← `empleados.curp`
- `{{TRABAJADOR_RFC}}` ← `empleados.rfc`
- `{{TRABAJADOR_NSS}}` ← `empleados.nss`
- `{{TRABAJADOR_EDAD}}` ← `empleados.edad` (calculado)
- `{{TRABAJADOR_SEXO}}` ← `empleados.sexo`
- `{{TRABAJADOR_ESTADO_CIVIL}}` ← `empleados.estado_civil`
- `{{TRABAJADOR_DOMICILIO}}` ← `empleados.domicilio_completo`
- `{{TRABAJADOR_EMAIL}}` ← `empleados.email`
- `{{PUESTO}}` ← `empleados.puesto`
- `{{SALARIO_DIARIO}}` ← `contratos_laborales.salario_diario`
- `{{SALARIO_MENSUAL}}` ← `contratos_laborales.salario_mensual`
- `{{FECHA_INICIO}}` ← `contratos_laborales.fecha_inicio`
- `{{FECHA_FIN_PRUEBA}}` ← `contratos_laborales.fecha_fin`
- `{{HORARIO}}` ← `empleados.horario`

**Contrato Tiempo Indeterminado (Art. 35 LFT)** — fuente: `Luis Antonio León Dávila`
- Mismos campos personales + `{{FORMA_PAGO}}` (semanal/quincenal/mensual)
- Sin `{{FECHA_FIN_PRUEBA}}` (contrato sin término definido)
- `{{AREA}}` ← `empleados.area`

### Anexos generados automáticamente
1. **Anexo 01** — Carta Testamentaria (`beneficiarios_empleado`)
2. **Anexo 02** — Perfil de Puesto (plantilla por puesto)
3. **Anexo 03** — Notificación de adeudos / INFONAVIT / FONACOT
4. **Anexo 04** — Confidencialidad y cesión de invención

---

## Flujo de datos — Alta de Empleado

```
vacantes
  └─► candidatos (score IA Claude)
        └─► empleados (datos completos)
              ├─► documentos_empleado (Acta, CURP, INE, domicilio, SAT, IMSS)
              ├─► beneficiarios_empleado (Carta Testamentaria)
              ├─► contratos_laborales (A PRUEBA → INDEFINIDO)
              │     └─► plantillas_contrato (docx auto-generado)
              ├─► incidencias_rh
              ├─► nomina_detalle ◄─ nomina_quincenal
              └─► bitacora_rh
```

---

## Flujo de datos — Alta de Arrendatario

```
prospectos
  └─► seguimiento_prospecto
        └─► arrendatarios (persona física o moral)
              ├─► documentos_arrendatario (INE, RFC, fianza, estados cuenta)
              ├─► contratos_arrendamiento (plantilla_contrato → docx generado)
              │     └─► cargos_renta (día 1 de cada mes, automático)
              │           └─► pagos_renta → conciliación
              └─► bitacora_contrato / bitacora_cobranza
```

---

## Instrucciones de ejecución en Supabase

1. Supabase Dashboard → **SQL Editor**
2. Pegar contenido de `reset_database.sql`
3. Ejecutar (puede tardar 20-30 segundos)
4. Verificar: **Table Editor → Schema: prp** debe mostrar 35+ tablas
5. Probar vista: `SELECT * FROM prp.v_kpis_dashboard;`

---

*Generado por Claude Code para RANNIX Consulting — PRP v1.0 — 2026*
