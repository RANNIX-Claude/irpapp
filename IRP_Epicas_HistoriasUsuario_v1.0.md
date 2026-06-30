# PlazaAdmin — Épicas e Historias de Usuario
## Documento de Requerimientos Ágiles v1.0
**Fecha:** Junio 2026 | **Autor:** RANNIX Consulting — Roberto Aguilar Cota  
**Metodología:** Scrum / User Stories con Criterios de Aceptación (Given-When-Then)  
**Destinatario:** Claude Code — contexto completo para construcción sin ambigüedad

---

## CONVENCIONES DEL DOCUMENTO

- **ROL** → quién ejecuta la acción
- **ACCIÓN** → qué quiere hacer
- **BENEFICIO** → para qué lo necesita
- **CA** → Criterio de Aceptación (Given / When / Then)
- **RN** → Regla de Negocio
- **CAT** → Catálogo de valores permitidos

**Prioridad:**
- 🔴 MUST — obligatorio MVP
- 🟡 SHOULD — importante pero no bloqueante
- 🟢 COULD — deseable en fases posteriores

---

# ÉPICA 1 — GESTIÓN DE EMPRESAS Y ESTRUCTURA DEL GRUPO

> Administrar el catálogo de razones sociales que conforman el grupo empresarial que opera la plaza, sus unidades de negocio y la relación jerárquica entre ellas.

---

### HU-1.1 — Registrar empresa del grupo 🔴

**Como** Admin Plaza  
**Quiero** registrar cada empresa (razón social) del grupo empresarial  
**Para** identificar correctamente a qué entidad legal pertenecen los contratos, el personal y los gastos

**Criterios de Aceptación:**

CA-1: DADO que el Admin abre el formulario de empresa  
CUANDO ingresa RFC con formato válido mexicano (12 caracteres persona moral, 13 persona física)  
ENTONCES el sistema valida el formato y no permite guardar si es incorrecto

CA-2: DADO que se registra una empresa  
CUANDO se sube la Constancia de Situación Fiscal (CSF)  
ENTONCES el OCR extrae automáticamente: razón social, RFC, régimen fiscal, domicilio fiscal, CP  
Y pre-llena los campos del formulario  
Y el operador puede corregir antes de guardar

CA-3: DADO que existe una empresa registrada  
CUANDO se intenta registrar otra empresa con el mismo RFC  
ENTONCES el sistema muestra error "RFC ya registrado en el sistema"  
Y no permite duplicados

**CAT — Tipo de empresa:**
| Clave | Descripción |
|---|---|
| `CORPORATIVO` | Empresa holding / corporativo del grupo |
| `PLAZA` | Administradora de la plaza comercial |
| `RESTAURANTE` | Unidad de negocio de alimentos |
| `LIMPIEZA` | Servicios de limpieza |
| `VIGILANCIA` | Servicios de seguridad |
| `OTRO` | Otra unidad de negocio |

**CAT — Régimen fiscal (SAT México):**
- 601 General de Ley Personas Morales
- 603 Personas Morales con Fines no Lucrativos
- 612 Personas Físicas con Actividades Empresariales
- 626 Régimen Simplificado de Confianza (RESICO)
- (lista completa del SAT)

**RN-1.1:** El CORPORATIVO tiene visibilidad sobre TODAS las empresas del grupo.  
**RN-1.2:** Una empresa puede tener múltiples locales e inmuebles.  
**RN-1.3:** Los empleados pertenecen a UNA empresa, pero pueden ser visibles al corporativo.

---

### HU-1.2 — Ver directorio de empresas del grupo 🔴

**Como** Admin Plaza o Corporativo  
**Quiero** ver la lista de todas las empresas del grupo con sus datos principales  
**Para** identificar rápidamente a qué entidad pertenece cada operación

**CA-1:** La lista muestra: nombre comercial, RFC, tipo, estatus (activa/inactiva), número de locales asignados, número de empleados activos.

**CA-2:** DADO que el usuario tiene rol Corporativo  
CUANDO accede al directorio  
ENTONCES ve TODAS las empresas del grupo

**CA-3:** DADO que el usuario tiene rol Admin Plaza  
CUANDO accede al directorio  
ENTONCES ve solo las empresas de su tenant

---

# ÉPICA 2 — CATÁLOGO DE INMUEBLES / LOCALES

> Gestionar el inventario completo de locales comerciales de la plaza, incluyendo sus características físicas, precios históricos y estado actual.

---

### HU-2.1 — Registrar local comercial 🔴

**Como** Admin Plaza  
**Quiero** registrar cada local con sus características físicas y ubicación  
**Para** tener el inventario completo de inmuebles disponibles para arrendar

**CA-1:** El sistema requiere los siguientes campos obligatorios:
- Número de local (único dentro del tenant)
- Metros cuadrados
- Zona / sector
- Piso / nivel
- Estatus inicial

**CA-2:** DADO que se registra un local  
CUANDO se guarda  
ENTONCES el estatus inicial es automáticamente `DISPONIBLE`

**CA-3:** DADO que se sube una foto del local  
CUANDO se guarda  
ENTONCES la foto queda registrada como tipo `ESTADO_INICIAL` con fecha del día  
Y aparece como primera entrada en la galería cronológica

**CAT — Estatus del local:**
| Clave | Descripción | Color UI |
|---|---|---|
| `DISPONIBLE` | Sin arrendatario, listo para rentar | Azul |
| `EN_PROCESO` | Prospecto en evaluación | Amarillo |
| `RENTADO` | Contrato vigente | Verde |
| `EN_MORA` | Arrendatario con pagos vencidos | Naranja |
| `MANTENIMIENTO` | No disponible por obras/reparación | Gris |
| `RESERVADO` | Separado sin contrato firmado | Morado |

**CAT — Zonas de la plaza (configurable por tenant):**
- Zona A (planta baja fachada principal)
- Zona B (planta baja interior)
- Zona C (primer piso)
- Zona D (área de food court)
- (el Admin puede agregar/editar zonas)

**RN-2.1:** El número de local es único e inmutable una vez creado.  
**RN-2.2:** Un local en estatus RENTADO no puede asignarse a otro arrendatario sin cerrar el contrato vigente.

---

### HU-2.2 — Fusionar locales 🔴

**Como** Operador Rentas  
**Quiero** combinar 2 o más locales contiguos en una sola unidad  
**Para** cuando un arrendatario arrienda un espacio mayor combinando locales pequeños

**CA-1:** DADO que existen 2 locales con estatus `DISPONIBLE`  
CUANDO el operador los fusiona  
ENTONCES se crea un "local fusionado" que suma los m² de ambos  
Y el precio de renta es la suma de ambos precios  
Y los locales originales cambian estatus a `RENTADO` (vinculados al contrato)

**CA-2:** DADO que un local está fusionado con otro  
CUANDO el contrato termina  
ENTONCES ambos locales regresan a estatus `DISPONIBLE` de forma independiente  
Y pueden arrendarse por separado nuevamente

**CA-3:** Solo se pueden fusionar locales con estatus `DISPONIBLE`.  
**CA-4:** Mínimo 2 locales, máximo configurable por tenant (default: 4).

**RN-2.3:** La fusión queda registrada en el contrato con los IDs de ambos locales.  
**RN-2.4:** El historial de cada local individual se mantiene aunque hayan sido fusionados.

---

### HU-2.3 — Gestionar precios de renta por período 🔴

**Como** Admin Plaza  
**Quiero** definir el precio de renta de cada local por período (año)  
**Para** que los contratos usen el precio correcto según la fecha de inicio y los incrementos anuales

**CA-1:** DADO que se define un precio  
CUANDO se guarda  
ENTONCES queda asociado a: local + fecha_inicio + fecha_fin + monto_mensual

**CA-2:** DADO que un contrato inicia en 2025 y termina en 2027  
CUANDO se genera el contrato  
ENTONCES el sistema toma el precio de cada año del catálogo de precios  
Y muestra tabla de vigencias: 2025=$X, 2026=$Y, 2027=$Z

**CA-3:** DADO que se registra un precio para un período  
CUANDO el período se traslapa con uno existente para el mismo local  
ENTONCES el sistema muestra advertencia y pide confirmación

**CAT — Tipos de ajuste de precio:**
| Clave | Descripción |
|---|---|
| `FIJO` | Precio fijo sin variación en el período |
| `INPC` | Ajuste anual según INPC (índice inflación) |
| `PORCENTAJE` | Ajuste por porcentaje fijo (ej. +5% anual) |
| `NEGOCIADO` | Precio especial por acuerdo comercial |

---

### HU-2.4 — Ver mapa visual de ocupación de la plaza 🔴

**Como** Admin Plaza o Corporativo  
**Quiero** ver un mapa/grid visual de todos los locales con su estatus en tiempo real  
**Para** identificar de un vistazo qué está ocupado, disponible o en mora

**CA-1:** Cada local se representa como una tarjeta con:
- Número de local
- m²
- Color según estatus (del CAT de estatus)
- Nombre del arrendatario actual (si aplica)
- Monto de renta mensual

**CA-2:** DADO que el Admin hace clic en un local  
CUANDO abre el detalle  
ENTONCES ve el historial completo de ese local (línea de tiempo)

**RN-2.5:** El mapa se actualiza en tiempo real sin necesidad de recargar la página (Supabase Realtime).

---

# ÉPICA 3 — PROSPECCIÓN Y EXPEDIENTES DE ARRENDATARIOS

> Gestionar el proceso desde que un candidato a arrendatario solicita un local hasta que es aprobado y se convierte en arrendatario formal.

---

### HU-3.1 — Generar link de solicitud para prospecto 🔴

**Como** Operador Rentas  
**Quiero** generar un link único para que el prospecto suba su documentación  
**Para** que el proceso inicie de forma digital sin necesidad de que el prospecto venga físicamente

**CA-1:** DADO que el operador crea un link  
CUANDO lo genera  
ENTONCES el sistema crea un token UUID único  
Y la URL tiene formato: `plazaadmin.mx/solicitud/{token}`  
Y el token expira en 15 días (configurable)

**CA-2:** DADO que el link expira  
CUANDO el prospecto intenta acceder  
ENTONCES ve mensaje "Este link ha expirado. Contacta a la administración."

**CA-3:** El operador puede especificar al crear el link:
- Local(es) de interés (pre-seleccionado)
- Nombre del prospecto (para personalizar el formulario)
- Fecha de expiración personalizada

---

### HU-3.2 — Completar solicitud de arrendamiento (vista pública) 🔴

**Como** Prospecto (usuario externo sin login)  
**Quiero** llenar mi información y subir mis documentos desde el link que me enviaron  
**Para** iniciar el proceso de arrendamiento de un local en la plaza

**CA-1:** El formulario público solicita:

**Sección 1 — Datos del solicitante:**
- Tipo de persona (física / moral)
- Si persona física: nombre, apellidos, fecha nacimiento, CURP, RFC
- Si persona moral: razón social, RFC, nombre del representante legal
- Email, teléfono, WhatsApp
- Domicilio completo

**Sección 2 — Documentos obligatorios (persona física):**
- INE frente y vuelta (imagen/PDF)
- Comprobante de domicilio (no mayor a 3 meses)
- Estados financieros últimos 2 años O declaración anual ISR
- Referencias comerciales (mínimo 2)

**Sección 3 — Documentos obligatorios (persona moral):**
- Acta constitutiva
- Poder notarial del representante legal
- INE del representante legal
- Comprobante de domicilio fiscal
- Estados financieros dictaminados últimos 2 años
- Situación fiscal del SAT (CSF)

**Sección 4 — Aval / Obligado Solidario:**
- ¿Presenta aval? (Sí / No)
- Si sí: nombre completo, INE, comprobante domicilio, escrituras (si aplica)

**CA-2:** DADO que el prospecto sube un documento  
CUANDO el archivo supera 10MB  
ENTONCES el sistema muestra error "El archivo no debe superar 10MB"

**CA-3:** DADO que el prospecto sube la INE  
CUANDO el documento es procesado  
ENTONCES el OCR extrae nombre, domicilio, CURP  
Y pre-llena los campos correspondientes  
Y el prospecto puede corregir si hay error

**CA-4:** DADO que el prospecto envía el formulario incompleto  
CUANDO intenta enviar  
ENTONCES el sistema marca en rojo los campos/documentos faltantes  
Y no permite enviar hasta completar los obligatorios

**CA-5:** DADO que el prospecto envía exitosamente  
CUANDO se procesa el envío  
ENTONCES recibe email de confirmación automático  
Y el operador recibe notificación de nuevo prospecto (email + notificación en sistema)

**CAT — Tipos de documento de arrendatario:**
| Clave | Descripción | Obligatorio P.Física | Obligatorio P.Moral |
|---|---|---|---|
| `INE_FRENTE` | INE / IFE frente | ✅ | ✅ (rep. legal) |
| `INE_VUELTA` | INE / IFE vuelta | ✅ | ✅ (rep. legal) |
| `COMP_DOMICILIO` | Comprobante de domicilio | ✅ | ✅ |
| `ESTADOS_FINANCIEROS` | Estados financieros 2 años | ✅ | ✅ |
| `DECLARACION_ISR` | Declaración anual ISR | Alternativo | Alternativo |
| `ACTA_CONSTITUTIVA` | Acta constitutiva | ❌ | ✅ |
| `PODER_NOTARIAL` | Poder notarial rep. legal | ❌ | ✅ |
| `CSF_SAT` | Constancia Situación Fiscal | 🟡 | ✅ |
| `REFERENCIAS_COMERCIALES` | Cartas de referencia | ✅ (2 mín.) | ✅ (2 mín.) |
| `INE_AVAL` | INE del aval | Si hay aval | Si hay aval |
| `COMP_DOM_AVAL` | Comprobante domicilio aval | Si hay aval | Si hay aval |
| `ESCRITURAS_AVAL` | Escrituras de propiedad aval | Opcional | Opcional |

---

### HU-3.3 — Revisar y aprobar expediente de prospecto 🔴

**Como** Operador Rentas  
**Quiero** revisar el expediente completo del prospecto y aprobar o rechazar  
**Para** decidir si se le otorga el arrendamiento

**CA-1:** El expediente muestra:
- Checklist de documentos: ✅ Completo / ⚠️ Pendiente / ❌ Rechazado
- Vista previa de cada documento subido
- Datos extraídos por OCR con flag de verificación
- Historial de comunicaciones con el prospecto

**CA-2:** DADO que el operador marca un documento como "Rechazado"  
CUANDO guarda la observación  
ENTONCES el sistema envía notificación automática al prospecto (email + WhatsApp)  
Con el mensaje: "Documento [tipo] requiere corrección: [observación del operador]"  
Y el prospecto puede volver a subir el documento desde su link (si no expiró)

**CA-3:** DADO que todos los documentos están verificados  
CUANDO el Admin Plaza aprueba el expediente  
ENTONCES el estatus cambia de `EN_REVISION` a `APROBADO`  
Y el prospecto recibe notificación de aprobación  
Y el sistema habilita la opción "Generar Contrato"  
Y el local cambia de `DISPONIBLE` a `EN_PROCESO`

**CA-4:** DADO que el Admin rechaza el expediente  
CUANDO registra el motivo de rechazo  
ENTONCES el prospecto recibe notificación con el motivo  
Y el expediente queda en estatus `RECHAZADO` en el historial (no se borra)

**CAT — Estatus del expediente de arrendatario:**
| Clave | Descripción |
|---|---|
| `RECIBIDO` | Formulario enviado, pendiente revisión |
| `DOCS_INCOMPLETOS` | Faltan documentos — notificado al prospecto |
| `EN_REVISION` | Operador revisando expediente |
| `EN_INVESTIGACION` | Verificación de referencias en curso |
| `APROBADO` | Listo para generar contrato |
| `RECHAZADO` | No cumple requisitos |
| `CANCELADO` | Prospecto desistió |

---

# ÉPICA 4 — CONTRATOS DE ARRENDAMIENTO

> Gestionar el ciclo de vida completo de los contratos: generación, firma, addendum, renovación y cancelación.

---

### HU-4.1 — Generar contrato de arrendamiento 🔴

**Como** Operador Rentas  
**Quiero** generar automáticamente el contrato de arrendamiento con los datos del expediente aprobado  
**Para** eliminar la captura manual y garantizar que el contrato tenga los datos correctos

**CA-1:** DADO que el expediente está en estatus `APROBADO`  
CUANDO el operador hace clic en "Generar Contrato"  
ENTONCES el sistema pre-llena la plantilla con:
- Datos del arrendatario (del expediente, extraídos por OCR)
- Datos del aval (del expediente)
- Local(es) seleccionados con m² y descripción
- Tabla de precios por período (de HU-2.3)
- Fecha de inicio y fecha de fin
- Cláusulas estándar de la plantilla del tenant

**CA-2:** DADO que se genera el contrato  
CUANDO el sistema calcula la tabla de rentas  
ENTONCES muestra desglose por año: 2025=$X/mes, 2026=$Y/mes, 2027=$Z/mes  
Y el monto total del contrato sumado

**CA-3:** DADO que el contrato es generado  
CUANDO el operador lo descarga  
ENTONCES el PDF incluye:
- Logotipo de la empresa arrendadora
- Número de contrato único (formato: CTR-{año}-{consecutivo})
- Datos completos de ambas partes
- Tabla de vigencias de precios
- Espacio para firmas con nombre, cargo y fecha

**CA-4:** DADO que el contrato es firmado presencialmente  
CUANDO el operador sube el PDF escaneado firmado  
ENTONCES el contrato cambia a estatus `FIRMADO`  
Y la fecha de firma queda registrada  
Y el local cambia a estatus `RENTADO`  
Y se generan automáticamente los pagarés (HU-4.4)

**CAT — Estatus del contrato de arrendamiento:**
| Clave | Descripción |
|---|---|
| `GENERADO` | PDF creado, pendiente firma |
| `ENVIADO` | Enviado al arrendatario para revisión |
| `FIRMADO` | Firmado, contrato vigente |
| `VIGENTE` | En período activo, pagos al corriente |
| `EN_MORA` | Uno o más pagos vencidos |
| `POR_VENCER` | Vence en ≤60 días |
| `RENOVADO` | Contrato sucesor generado y firmado |
| `CON_ADDENDUM` | Tiene extensión temporal vigente |
| `CANCELADO` | Terminación anticipada |
| `VENCIDO` | Pasó fecha fin sin renovación ni cancelación formal |

---

### HU-4.2 — Registrar addendum (extensión temporal) 🔴

**Como** Operador Rentas  
**Quiero** registrar un addendum al contrato cuando el arrendatario necesita una extensión temporal  
**Para** documentar legalmente los acuerdos fuera del período original

**CA-1:** Un addendum puede registrarse sobre un contrato en estatus `VIGENTE` o `POR_VENCER`.

**CA-2:** El addendum requiere:
- Motivo (del catálogo)
- Fecha inicio de la extensión
- Fecha fin de la extensión
- Monto mensual durante el addendum (puede diferir del contrato)
- Documento PDF firmado (subida obligatoria)

**CA-3:** DADO que se registra un addendum  
CUANDO se guarda  
ENTONCES el contrato original muestra badge "Con Addendum"  
Y el addendum aparece en la línea de tiempo del inmueble  
Y el addendum aparece en el historial del arrendatario

**CAT — Motivos de addendum:**
| Clave | Descripción |
|---|---|
| `PRORROGA` | Prórroga temporal sin cambios |
| `REMODELACION` | El arrendatario realiza obra |
| `ACUERDO_COMERCIAL` | Acuerdo especial negociado |
| `FUERZA_MAYOR` | Causa de fuerza mayor documentada |
| `TRANSICION` | Período de transición entre contratos |

---

### HU-4.3 — Renovar contrato de arrendamiento 🔴

**Como** Operador Rentas  
**Quiero** generar un nuevo contrato cuando el anterior está por vencer  
**Para** mantener la continuidad del arrendamiento sin perder el historial

**CA-1:** DADO que un contrato está en estatus `POR_VENCER` (≤60 días)  
CUANDO el sistema detecta esta condición  
ENTONCES genera alerta automática para el operador  
Y envía recordatorio al arrendatario (email + WhatsApp)

**CA-2:** DADO que se genera una renovación  
CUANDO el operador hace clic en "Renovar"  
ENTONCES el nuevo contrato hereda todos los datos del anterior  
Y solo requiere actualizar: fecha inicio/fin y precios del nuevo período  
Y el nuevo contrato queda vinculado al anterior (campo: `contrato_anterior_id`)

**CA-3:** DADO que la renovación es firmada  
CUANDO se registra  
ENTONCES el contrato anterior cambia a estatus `RENOVADO`  
Y el nuevo contrato queda `VIGENTE`  
Y en la línea de tiempo del local aparece el evento "Renovación de contrato"

**RN-4.1:** El expediente del arrendatario NO se vuelve a solicitar en renovaciones, solo se actualiza si hay cambio de aval o datos.  
**RN-4.2:** Los pagarés del contrato anterior quedan en el historial. Se generan nuevos pagarés para el nuevo período.

---

### HU-4.4 — Generar pagarés automáticamente 🔴

**Como** Sistema (automático)  
**Quiero** generar un pagaré por cada mes del contrato al momento de la firma  
**Para** tener garantías legales de pago en formato aceptado por la LGTOC

**CA-1:** DADO que un contrato pasa a estatus `FIRMADO`  
CUANDO el sistema procesa el evento  
ENTONCES genera automáticamente N pagarés (N = número de meses del contrato)  
Cada pagaré tiene:
- Número de serie: {PREFIJO}-{AÑO}-{CONSECUTIVO} (ej: PAG-2025-001)
- Monto = precio del mes correspondiente según tabla de vigencias
- Fecha de vencimiento = día de pago mensual acordado
- Datos del suscriptor (arrendatario) y beneficiario (plaza)
- Lugar de pago
- Leyenda legal (Art. 170 LGTOC)

**CA-2:** DADO que se generan los pagarés  
CUANDO el operador accede al expediente  
ENTONCES ve lista completa: número, monto, fecha vencimiento, estatus

**CA-3:** DADO que se registra el pago de un mes  
CUANDO el pago es conciliado  
ENTONCES el pagaré del mes correspondiente cambia automáticamente a estatus `PAGADO`

**CAT — Estatus del pagaré:**
| Clave | Descripción |
|---|---|
| `VIGENTE` | Dentro del período, no vencido |
| `PAGADO` | Pago conciliado exitosamente |
| `VENCIDO` | Pasó la fecha sin pago |
| `CANCELADO` | Anulado por cancelación de contrato |

---

# ÉPICA 5 — PAGOS Y CONCILIACIÓN BANCARIA

> Gestionar el ciclo completo de cobro mensual de rentas, desde el envío del recordatorio hasta la conciliación con el banco.

---

### HU-5.1 — Enviar recordatorio mensual de pago 🔴

**Como** Sistema (automático) o Operador Rentas  
**Quiero** enviar el aviso de pago mensual a todos los arrendatarios activos  
**Para** que paguen a tiempo con la información correcta de monto y referencia

**CA-1:** El recordatorio incluye:
- Nombre del arrendatario
- Local(es) que ocupa
- Período de pago (mes/año)
- Monto a pagar
- Referencia bancaria única (CIE/SPEI)
- CLABE interbancaria de la plaza
- Fecha límite de pago
- Link para subir comprobante

**CA-2:** DADO que es el día configurado del mes (default: día 1)  
CUANDO el sistema corre el proceso automático  
ENTONCES envía el recordatorio por email Y por WhatsApp a todos los arrendatarios con contrato `VIGENTE`  
Y registra el envío en el log de comunicaciones

**CA-3:** DADO que un arrendatario tiene un adeudo del mes anterior  
CUANDO se envía el recordatorio del mes actual  
ENTONCES el mensaje incluye el adeudo anterior sumado al monto del mes actual

---

### HU-5.2 — Registrar pago de renta 🔴

**Como** Operador Rentas  
**Quiero** registrar el pago de renta de un arrendatario  
**Para** mantener el estado de cuenta actualizado y saber quién ha pagado

**CA-1:** El arrendatario puede subir su comprobante desde el link de pago (sin login).  
El operador puede registrar el pago manualmente desde el backoffice.

**CA-2:** Al registrar el pago se captura:
- Fecha real de pago
- Monto recibido
- Forma de pago (transferencia SPEI / depósito / efectivo / cheque)
- Referencia bancaria o número de operación
- Comprobante (XML CFDI o imagen)

**CA-3:** DADO que se sube un XML de CFDI como comprobante  
CUANDO el sistema lo procesa  
ENTONCES extrae: UUID, RFC emisor, RFC receptor, monto, fecha, concepto  
Y muestra los datos para que el operador confirme que corresponden al pago

**CA-4:** DADO que el monto recibido es MENOR al esperado  
CUANDO se registra el pago  
ENTONCES el sistema lo registra como `PARCIAL`  
Y la diferencia queda como saldo pendiente  
Y el pagaré del mes queda en estatus `VENCIDO` parcialmente

**CAT — Estatus de pago:**
| Clave | Descripción |
|---|---|
| `PENDIENTE` | No se ha recibido pago |
| `PARCIAL` | Pago incompleto registrado |
| `PAGADO` | Pago completo recibido |
| `VENCIDO` | Pasó fecha límite sin pago |
| `CONCILIADO` | Confirmado contra extracto bancario |
| `EN_DISPUTA` | Arrendatario disputa el cobro |

**CAT — Formas de pago:**
| Clave | Descripción |
|---|---|
| `SPEI` | Transferencia electrónica SPEI |
| `DEPOSITO` | Depósito bancario en ventanilla |
| `EFECTIVO` | Pago en efectivo en oficina |
| `CHEQUE` | Cheque nominativo |
| `TARJETA` | Pago con tarjeta (fase 2) |

---

### HU-5.3 — Conciliar pagos contra extracto bancario 🔴

**Como** Operador Rentas  
**Quiero** importar el extracto bancario del mes y cruzarlo contra los pagos registrados  
**Para** confirmar que cada depósito corresponde a un arrendatario específico

**CA-1:** DADO que el operador sube el extracto bancario en CSV/XLS  
CUANDO el sistema lo procesa  
ENTONCES muestra tabla con todos los movimientos del extracto  
Y marca automáticamente los que coinciden por referencia bancaria  
Y marca como "Sin identificar" los que no tienen referencia conocida

**CA-2:** DADO que un movimiento es identificado automáticamente  
CUANDO el operador confirma  
ENTONCES el pago queda en estatus `CONCILIADO`  
Y el pagaré del mes queda en estatus `PAGADO`

**CA-3:** DADO que un movimiento no pudo identificarse automáticamente  
CUANDO el operador lo selecciona manualmente  
ENTONCES puede buscarlo por nombre de arrendatario y asignarlo  
Y queda registrado como conciliado manualmente con el nombre del operador

**RN-5.1:** Un movimiento bancario solo puede asignarse a UN pago.  
**RN-5.2:** La conciliación es auditable: queda registrado quién concilió, cuándo y el método (automático/manual).

---

### HU-5.4 — Ver estado de cuenta por arrendatario 🔴

**Como** Operador Rentas o Arrendatario  
**Quiero** ver el estado de cuenta completo de un arrendatario  
**Para** saber exactamente qué ha pagado, qué debe y cuándo pagó cada mes

**CA-1:** El estado de cuenta muestra:
- Encabezado: nombre, local(es), contrato vigente
- Tabla mensual: período | monto esperado | monto pagado | fecha pago | comprobante | estatus
- Saldo total pendiente
- Pagarés vigentes vs pagados

**CA-2:** DADO que el operador genera el PDF del estado de cuenta  
CUANDO lo descarga  
ENTONCES incluye: logo de la plaza, datos del arrendatario, tabla completa y firma del administrador

**CA-3:** DADO que el arrendatario accede desde su portal  
CUANDO ve su estado de cuenta  
ENTONCES puede descargar el PDF  
Y puede subir comprobantes de pago pendientes  
Y NO puede modificar ningún dato

---

# ÉPICA 6 — COMPROBANTES Y FACTURAS DE ARRENDAMIENTO

---

### HU-6.1 — Emitir recibo provisional de pago 🔴

**Como** Sistema (automático)  
**Quiero** generar un recibo provisional al registrar un pago  
**Para** que el arrendatario tenga constancia inmediata del pago mientras se emite la factura formal

**CA-1:** Al registrar un pago se genera automáticamente un recibo con:
- Folio único: REC-{año}-{consecutivo}
- Datos del arrendatario
- Local y período
- Monto pagado
- Fecha de pago
- Leyenda: "Recibo provisional — sujeto a emisión de CFDI"

**CA-2:** El recibo se envía automáticamente por email al arrendatario.

---

### HU-6.2 — Registrar factura CFDI de arrendamiento 🔴

**Como** Operador Rentas  
**Quiero** subir el XML y PDF de la factura emitida por el arrendamiento  
**Para** tener el comprobante fiscal ligado al pago del período correspondiente

**CA-1:** DADO que el operador sube el archivo XML del CFDI  
CUANDO el sistema lo procesa  
ENTONCES extrae automáticamente:
- UUID del CFDI (folio fiscal)
- RFC del emisor
- RFC del receptor
- Subtotal, IVA, Total
- Fecha de emisión
- Concepto

**CA-2:** DADO que los datos del XML son extraídos  
CUANDO el operador confirma  
ENTONCES el CFDI queda ligado al pago del período  
Y el pago muestra badge "Con CFDI" en verde  
Y el recibo provisional queda sustituido

**CA-3:** DADO que el RFC del receptor en el XML NO coincide con el RFC del arrendatario  
CUANDO el sistema detecta la discrepancia  
ENTONCES muestra advertencia "RFC del CFDI no coincide con el arrendatario registrado"  
Y permite al operador confirmar o cancelar el registro

---

# ÉPICA 7 — GALERÍA DE FOTOS Y MANTENIMIENTO DE INMUEBLES

---

### HU-7.1 — Registrar mantenimiento de local 🔴

**Como** Admin Plaza  
**Quiero** registrar cualquier trabajo de mantenimiento realizado en un local  
**Para** tener el historial completo de intervenciones y sus costos asociados

**CA-1:** El registro de mantenimiento requiere:
- Tipo de mantenimiento (del catálogo)
- Descripción del trabajo
- Fechas (inicio y fin)
- Proveedor que realizó el trabajo
- Monto presupuestado vs monto real
- Fotos: antes del trabajo (obligatorio) y después (obligatorio al cerrar)

**CA-2:** DADO que se registra un mantenimiento  
CUANDO se guarda  
ENTONCES se crea automáticamente un gasto en el Módulo C (Finanzas)  
Con categoría `MANTENIMIENTO`, monto real, proveedor y ligado al local

**CA-3:** DADO que el mantenimiento está en estatus `EN_PROCESO`  
CUANDO el Admin lo marca como `TERMINADO`  
ENTONCES el sistema exige subir al menos 1 foto "después"  
Y no permite cerrar sin las fotos post-mantenimiento

**CAT — Tipos de mantenimiento:**
| Clave | Descripción |
|---|---|
| `PREVENTIVO` | Mantenimiento programado rutinario |
| `CORRECTIVO` | Reparación por falla o daño |
| `MEJORA` | Mejora o remodelación del local |
| `EMERGENCIA` | Atención urgente (fuga, cortocircuito, etc.) |
| `ENTREGA` | Preparación para entrega a nuevo arrendatario |

---

### HU-7.2 — Ver galería cronológica de fotos del local 🟡

**Como** Admin Plaza o Corporativo  
**Quiero** ver todas las fotos históricas de un local ordenadas por fecha  
**Para** ver la evolución visual del inmueble y evidenciar el estado en momentos clave

**CA-1:** La galería muestra fotos con:
- Fecha
- Tipo (estado inicial / mantenimiento / entrega / devolución)
- Descripción
- Nombre del mantenimiento asociado (si aplica)

**CA-2:** DADO que hay fotos de "antes y después" de un mantenimiento  
CUANDO el usuario ve la galería  
ENTONCES puede ver las fotos en modo comparación (lado a lado)

---

# ÉPICA 8 — RECLUTAMIENTO Y SELECCIÓN DE PERSONAL

---

### HU-8.1 — Gestionar catálogo de puestos 🔴

**Como** Admin Plaza  
**Quiero** mantener un catálogo de todos los puestos de trabajo del grupo  
**Para** que las vacantes, contratos y reportes usen denominaciones consistentes

**CA-1:** Cada puesto tiene:
- Nombre del puesto
- Empresa / área a la que pertenece
- Departamento
- Descripción de funciones
- Perfil requerido (escolaridad, experiencia, competencias)
- Rango salarial (mínimo / máximo)
- Tipo de jornada
- Tipo de contrato default (eventual/indefinido)

**CAT — Departamentos (configurables por tenant):**
- Administración
- Operaciones / Plaza
- Alimentos y Bebidas (Restaurante)
- Limpieza e Intendencia
- Seguridad y Vigilancia
- Mantenimiento
- Caja / Cajeros
- Recursos Humanos

**CAT — Grado de estudios requerido:**
| Clave | Descripción |
|---|---|
| `SIN_REQUISITO` | Sin requisito de escolaridad |
| `PRIMARIA` | Primaria completa |
| `SECUNDARIA` | Secundaria completa |
| `BACHILLERATO` | Preparatoria / Bachillerato |
| `TECNICO` | Carrera técnica o comercial |
| `LICENCIATURA` | Licenciatura (trunca o completa) |
| `POSGRADO` | Maestría o Doctorado |

---

### HU-8.2 — Publicar vacante 🔴

**Como** Operador RH  
**Quiero** publicar una vacante para un puesto específico  
**Para** iniciar el proceso de reclutamiento y recibir candidatos

**CA-1:** La vacante requiere:
- Puesto (del catálogo)
- Empresa y área
- Número de plazas disponibles
- Fecha límite de postulación
- Responsable de entrevistas (usuario del sistema con rol Entrevistador)
- Canal de publicación

**CA-2:** DADO que se publica la vacante  
CUANDO el operador hace clic en "Generar link de postulación"  
ENTONCES el sistema genera URL pública: `plazaadmin.mx/vacante/{token}`  
Y el token no expira hasta que la vacante se cierre

**CA-3:** DADO que se genera la vacante  
CUANDO el operador solicita "Generar descripción con IA"  
ENTONCES Claude genera automáticamente la descripción del puesto  
basándose en el catálogo de puestos y el perfil requerido  
Y el operador puede editar antes de publicar

**CAT — Canal de publicación:**
| Clave | Descripción |
|---|---|
| `INTERNO` | Solo por link directo |
| `OCC` | OCC Mundial |
| `INDEED` | Indeed México |
| `LINKEDIN` | LinkedIn |
| `REFERIDO` | Recomendado por empleado actual |
| `CARTEL` | Cartel físico en la plaza |

**CAT — Estatus de la vacante:**
| Clave | Descripción |
|---|---|
| `ABIERTA` | Recibiendo candidatos |
| `EN_PROCESO` | Entrevistas en curso |
| `CUBIERTA` | Plaza(s) ocupada(s) |
| `CERRADA` | Cerrada sin cubrir |
| `CANCELADA` | Cancelada por cambio de necesidad |

---

### HU-8.3 — Postularse a una vacante (vista pública) 🔴

**Como** Candidato (usuario externo)  
**Quiero** enviar mi solicitud y documentos desde el link de la vacante  
**Para** ser considerado para el puesto

**CA-1:** El formulario público solicita:
- Nombre completo, email, teléfono, WhatsApp
- Foto (selfie o foto formal)
- CURP
- Fecha de nacimiento
- Domicilio
- Grado máximo de estudios
- Años de experiencia en el puesto
- Referencias (nombre, teléfono, empresa — mínimo 2)

**Documentos:**
- INE frente y vuelta
- CURP (documento)
- Comprobante de domicilio
- Comprobante de estudios (si aplica)
- CV (PDF)
- Carta(s) de recomendación (opcional)

**CA-2:** DADO que el candidato sube su INE  
CUANDO el OCR procesa el documento  
ENTONCES extrae nombre, CURP, domicilio, fecha nacimiento  
Y pre-llena los campos correspondientes

**CA-3:** DADO que el candidato envía su solicitud  
CUANDO se procesa  
ENTONCES recibe email de confirmación con número de folio  
Y el Operador RH recibe notificación de nuevo candidato

**CAT — Estatus del candidato (flujo completo):**
| Clave | Descripción |
|---|---|
| `POSTULADO` | Solicitud recibida |
| `EN_REVISION` | Operador RH revisando expediente |
| `DOCS_INCOMPLETOS` | Documentos faltantes — notificado |
| `PRESELECCIONADO` | Pasó filtro inicial |
| `ENTREVISTA_AGENDADA` | Fecha y entrevistador asignados |
| `ENTREVISTADO` | Resultado registrado |
| `SEGUNDA_ENTREVISTA` | Requiere segunda evaluación |
| `ACEPTADO` | Seleccionado para contratar |
| `EN_CONTRATACION` | Proceso de firma en curso |
| `CONTRATADO` | Empleado activo |
| `RECHAZADO` | No seleccionado |
| `EN_ESPERA` | Banco de talento |
| `RETIRADO` | Candidato desistió |

---

### HU-8.4 — Agendar y registrar entrevista 🔴

**Como** Operador RH  
**Quiero** agendar una entrevista y asignar al entrevistador responsable  
**Para** coordinar el proceso de selección y que el entrevistador tenga el expediente del candidato

**CA-1:** Al agendar la entrevista se define:
- Fecha y hora
- Modalidad (presencial / videollamada)
- Lugar o link de videollamada
- Entrevistador asignado (usuario con rol Entrevistador)

**CA-2:** DADO que la entrevista es agendada  
CUANDO se confirma  
ENTONCES el candidato recibe notificación (email + WhatsApp) con:
- Fecha, hora, lugar/link
- Qué documentos llevar (si es presencial)
- Nombre del entrevistador

**CA-3:** DADO que la entrevista es agendada  
CUANDO el entrevistador accede al sistema  
ENTONCES ve en su dashboard las entrevistas pendientes  
Y puede descargar el expediente completo del candidato (docs + foto + datos)

**CA-4:** DADO que la entrevista fue realizada  
CUANDO el entrevistador registra el resultado  
ENTONCES captura:
- Calificación general (1 a 5 estrellas)
- Puntuación por área (presentación, conocimientos, actitud, experiencia)
- Notas libres
- Recomendación: Avanzar / Rechazar / Segunda entrevista

---

# ÉPICA 9 — CONTRATACIÓN Y GESTIÓN DE EMPLEADOS

---

### HU-9.1 — Contratar candidato aceptado 🔴

**Como** Operador RH  
**Quiero** iniciar el proceso de contratación para el candidato seleccionado  
**Para** convertirlo en empleado activo con expediente completo y contrato generado

**CA-1:** DADO que el candidato está en estatus `ACEPTADO`  
CUANDO el Operador inicia la contratación  
ENTONCES el sistema crea el expediente de empleado  
Copiando todos los datos del expediente de candidato (no se capturan dos veces)

**CA-2:** Los datos adicionales que se capturan en la contratación (no en postulación):
- NSS (Número de Seguro Social IMSS)
- RFC (si no se capturó antes)
- Datos bancarios para nómina (CLABE, banco)
- Contacto de emergencia (nombre, teléfono, parentesco)
- Sueldo acordado (dentro del rango del puesto)
- Fecha de ingreso
- Tipo de contrato inicial (eventual 3 meses / indefinido)
- Período de prueba si aplica

**CA-3:** DADO que se completan los datos  
CUANDO el Operador genera el contrato  
ENTONCES el sistema genera el PDF con:
- Tipo de contrato (Eventual / Indefinido)
- Datos del trabajador y la empresa
- Puesto, sueldo, jornada, lugar de trabajo
- Cláusulas según LFT (Ley Federal del Trabajo)
- Fecha de inicio y fin (si es eventual)

**CAT — Estatus del empleado:**
| Clave | Descripción | Color |
|---|---|---|
| `ACTIVO` | Empleado en plantilla | Verde |
| `INCAPACIDAD` | Incapacidad temporal IMSS | Amarillo |
| `VACACIONES` | En período vacacional | Azul |
| `SUSPENSION` | Suspensión temporal | Naranja |
| `BAJA_VOLUNTARIA` | Renuncia procesada | Gris |
| `BAJA_INVOLUNTARIA` | Despido procesado | Rojo |
| `BAJA_IMSS` | Baja registrada en IMSS | Gris oscuro |
| `FALLECIDO` | Baja por defunción | Negro |

---

### HU-9.2 — Generar ficha de alta en IMSS 🔴

**Como** Operador RH  
**Quiero** generar la ficha con los datos necesarios para dar de alta al empleado en el IMSS  
**Para** cumplir con la obligación legal en el plazo de 5 días hábiles

**CA-1:** La ficha incluye:
- NSS del trabajador
- CURP
- Nombre completo
- Fecha de ingreso
- Salario diario integrado (SDI)
- Tipo de trabajador (permanente / eventual)
- Empresa (registro patronal IMSS)

**CA-2:** DADO que la ficha es generada  
CUANDO el Operador la descarga  
ENTONCES puede usarla para capturar en el IDSE / SUA del IMSS  
Y en el sistema queda pendiente confirmar el alta con número de confirmación IMSS

**CA-3:** DADO que el alta es confirmada  
CUANDO el Operador registra el número de confirmación IMSS  
ENTONCES el empleado queda con estatus de alta IMSS = `CONFIRMADO`  
Y la fecha de alta queda registrada en el expediente

---

### HU-9.3 — Registrar baja de empleado 🔴

**Como** Operador RH  
**Quiero** registrar la baja de un empleado con su tipo y motivo  
**Para** mantener el expediente completo y cumplir con las obligaciones ante IMSS y LFT

**CA-1:** Al registrar una baja se captura:
- Tipo de baja (del catálogo)
- Fecha de baja
- Motivo detallado
- Documentos adjuntos según tipo

**CA-2:** DADO que el tipo de baja es `VOLUNTARIA`  
CUANDO se registra  
ENTONCES el sistema solicita subir la carta de renuncia firmada  
Y calcula: días de vacaciones pendientes, aguinaldo proporcional, partes proporcionales

**CA-3:** DADO que el tipo de baja es `INVOLUNTARIA`  
CUANDO se registra  
ENTONCES el sistema solicita: acta administrativa, motivo de rescisión (Art. LFT)  
Y calcula: indemnización constitucional si aplica (3 meses + 20 días por año)  
Y genera ficha de baja IMSS

**CA-4:** DADO que la baja es procesada  
CUANDO se confirma  
ENTONCES el empleado cambia a estatus correspondiente  
Y su expediente queda archivado (nunca se borra)  
Y aparece en el historial de la empresa como baja

**CAT — Tipos de baja:**
| Clave | Descripción | Documentos requeridos |
|---|---|---|
| `VOLUNTARIA` | Renuncia del trabajador | Carta de renuncia firmada |
| `INVOLUNTARIA_JUSTIFICADA` | Despido con causa (Art. 47 LFT) | Acta administrativa, notificación |
| `INVOLUNTARIA_INJUSTIFICADA` | Despido sin causa | Liquidación calculada |
| `INCAPACIDAD_PERMANENTE` | Incapacidad total permanente IMSS | Dictamen IMSS |
| `MUTUO_ACUERDO` | Terminación por convenio | Convenio firmado ante JFCA |
| `FALLECIMIENTO` | Defunción del trabajador | Acta de defunción |
| `FIN_CONTRATO` | Fin de contrato eventual sin renovar | — |

---

# ÉPICA 10 — ASISTENCIA Y CONTROL DE TIEMPO

---

### HU-10.1 — Importar asistencias desde reloj checador 🟡

**Como** Operador RH  
**Quiero** importar el archivo de asistencias generado por el reloj checador  
**Para** no capturar manualmente los registros de entrada/salida de cada empleado

**CA-1:** Formatos soportados: CSV, XLSX, TXT  
Columnas mínimas esperadas: ID empleado (o NSS), fecha, hora entrada, hora salida

**CA-2:** DADO que el archivo es importado  
CUANDO el sistema lo procesa  
ENTONCES muestra resumen: registros importados, errores (empleado no encontrado, formato inválido)  
Y el operador puede corregir errores manualmente antes de confirmar

**CA-3:** DADO que un empleado del archivo no está en el sistema  
CUANDO el sistema lo detecta  
ENTONCES marca el registro como "Empleado no identificado"  
Y permite al operador mapearlo manualmente

---

### HU-10.2 — Capturar asistencia manual 🔴

**Como** Operador RH  
**Quiero** registrar la asistencia del día de forma manual para empleados sin reloj checador  
**Para** tener el control de presencia de toda la plantilla

**CA-1:** Vista de lista de empleados del día con botones rápidos:
- ✅ Presente | ⚠️ Retardo | ❌ Falta | 🏥 Incapacidad | 🏖️ Vacaciones | 📝 Permiso

**CA-2:** DADO que se marca un retardo  
CUANDO se guarda  
ENTONCES el sistema solicita los minutos de retardo  
Y queda registrado para el cálculo de incidencias

---

# ÉPICA 11 — FINANZAS: GASTOS E INGRESOS

---

### HU-11.1 — Registrar gasto operativo 🔴

**Como** Operador Rentas o Admin Plaza  
**Quiero** registrar un gasto con su comprobante adjunto  
**Para** tener el control financiero completo de la plaza

**CA-1:** El registro de gasto requiere:
- Categoría (del catálogo)
- Proveedor (del catálogo, o "Sin proveedor" para gastos menores)
- Descripción del gasto
- Monto
- Fecha del gasto
- Comprobante (PDF de factura o imagen de ticket)

**CA-2:** DADO que se sube el PDF/XML de la factura  
CUANDO el OCR la procesa  
ENTONCES extrae: RFC emisor, monto, fecha, UUID CFDI (si es factura)  
Y pre-llena los campos del formulario

**CA-3:** DADO que el monto supera el límite de aprobación configurado (default: $5,000 MXN)  
CUANDO el operador intenta guardar  
ENTONCES el gasto queda en estatus `PENDIENTE_APROBACION`  
Y el Admin Plaza recibe notificación para aprobar  
Y el gasto NO se contabiliza hasta ser aprobado

**CAT — Categorías de gasto:**
| Clave | Descripción | Tipo |
|---|---|---|
| `LIMPIEZA_INSUMOS` | Productos de limpieza e higiene | Variable |
| `MANTENIMIENTO_CORRECTIVO` | Reparaciones por falla | Extraordinario |
| `MANTENIMIENTO_PREVENTIVO` | Mantenimiento programado | Fijo |
| `VIGILANCIA` | Servicios de seguridad | Fijo |
| `ENERGIA_ELECTRICA` | CFE y energía | Fijo |
| `AGUA` | SACMEX / agua | Fijo |
| `PAPELERIA` | Papelería y oficina | Variable |
| `HERRAMIENTAS` | Herramientas y equipos menores | Variable |
| `PINTURA_MATERIALES` | Pintura y materiales de construcción | Variable |
| `HONORARIOS` | Honorarios profesionales | Variable |
| `SEGUROS` | Primas de seguros | Fijo |
| `TELEFONIA_INTERNET` | Servicios de telecomunicaciones | Fijo |
| `JARDINERIA` | Mantenimiento de áreas verdes | Fijo |
| `PUBLICIDAD` | Promoción y publicidad de la plaza | Variable |
| `GASTOS_LEGALES` | Notaría, trámites legales | Extraordinario |
| `OTROS` | Gastos varios no clasificados | Variable |

---

# ÉPICA 12 — CATÁLOGO DE PROVEEDORES

---

### HU-12.1 — Registrar proveedor 🔴

**Como** Admin Plaza  
**Quiero** registrar cada proveedor de servicios con su expediente completo  
**Para** tener un directorio organizado y poder asociar gastos a proveedores específicos

**CA-1:** El expediente del proveedor incluye:

**Datos generales:**
- Tipo de persona (física / moral)
- Nombre / razón social
- Nombre comercial
- RFC
- CURP (solo persona física)
- Categoría de servicio (del catálogo)
- Especialidad / descripción del servicio

**Contacto:**
- Teléfono 1, Teléfono 2
- WhatsApp
- Email 1, Email 2
- URL del sitio web
- Facebook, Instagram, LinkedIn

**Domicilio:**
- Calle, número exterior, número interior
- Colonia, municipio, estado, CP

**Documentos:**
- Constancia de Situación Fiscal (CSF SAT) — OCR automático
- INE (si persona física) — OCR automático
- Acta constitutiva (si persona moral)
- Contrato de servicio (si aplica)

**CA-2:** DADO que se sube la CSF del SAT  
CUANDO el OCR la procesa  
ENTONCES extrae: RFC, razón social, régimen fiscal, domicilio fiscal  
Y pre-llena todos los campos correspondientes  
Y el usuario confirma o corrige

**CA-3:** DADO que se intenta registrar un proveedor con RFC ya existente  
CUANDO el sistema detecta el duplicado  
ENTONCES muestra: "Este RFC ya está registrado como [Nombre del proveedor]"  
Y ofrece la opción de ver el proveedor existente en lugar de crear uno nuevo

**CAT — Categorías de proveedor:**
| Clave | Descripción |
|---|---|
| `LIMPIEZA` | Productos e insumos de limpieza |
| `MANTENIMIENTO_GENERAL` | Servicios generales de mantenimiento |
| `PLOMERIA` | Plomería y fontanería |
| `ELECTRICIDAD` | Instalaciones eléctricas |
| `HERRERIA` | Herrería y soldadura |
| `VIDRIERIA` | Vidrio y aluminio |
| `PINTURA` | Pintura y recubrimientos |
| `ALBANILERIA` | Albañilería y construcción |
| `SEGURIDAD` | Empresa de vigilancia y seguridad |
| `JARDINERIA` | Jardinería y áreas verdes |
| `TECNOLOGIA` | TI, redes, CCTV |
| `JURIDICO` | Servicios legales |
| `CONTABILIDAD` | Contaduría y finanzas |
| `ALIMENTACION` | Proveedores de alimentos (restaurante) |
| `PAPELERIA` | Papelería y artículos de oficina |
| `OTRO` | Otro tipo de servicio |

---

# ÉPICA 13 — COMUNICADOS MASIVOS CON IA

---

### HU-13.1 — Enviar comunicado masivo a arrendatarios 🔴

**Como** Admin Plaza  
**Quiero** redactar y enviar comunicados a todos los arrendatarios (o un segmento)  
**Para** informar sobre eventos, mantenimientos, cambios o avisos de la plaza

**CA-1:** El operador ingresa la intención del comunicado en lenguaje natural:  
Ejemplo: *"Avisarles que el sábado 5 de julio se cerrará el estacionamiento de 8am a 2pm por mantenimiento de la bomba hidráulica"*

**CA-2:** DADO que el operador ingresa la intención  
CUANDO hace clic en "Generar con IA"  
ENTONCES Claude genera un comunicado formal, personalizado y profesional  
Con saludo personalizado por nombre del arrendatario  
Y el Admin puede editar antes de enviar

**CA-3:** El operador puede seleccionar destinatarios:
- Todos los arrendatarios activos
- Por zona (Zona A, Zona B, etc.)
- Por empresa (si hay multi-empresa)
- Selección manual individual

**CA-4:** DADO que el comunicado es aprobado  
CUANDO se envía  
ENTONCES llega por email Y WhatsApp  
Y queda registrado en el log de comunicaciones con: fecha, destinatarios, canal, contenido

---

# ÉPICA 14 — PRÉSTAMOS A TRABAJADORES

---

### HU-14.1 — Registrar préstamo a empleado 🟡

**Como** Admin Plaza  
**Quiero** registrar un préstamo otorgado a un empleado con su tabla de amortización  
**Para** controlar los descuentos en nómina y el saldo pendiente

**CA-1:** El préstamo requiere:
- Empleado
- Monto total
- Fecha de otorgamiento
- Número de pagos (quincenas o meses)
- Monto por pago (calculado automáticamente)
- Tasa de interés (0% si es sin interés)
- Motivo del préstamo

**CA-2:** DADO que se guarda el préstamo  
CUANDO el sistema procesa  
ENTONCES genera automáticamente la tabla de amortización con:
- Número de pago, fecha programada, monto, saldo después del pago

**CA-3:** DADO que llega la quincena de descuento  
CUANDO el operador la confirma como descontada  
ENTONCES el pago queda en estatus `DESCONTADO`  
Y el saldo pendiente se actualiza automáticamente

---

# ÉPICA 15 — DASHBOARD CORPORATIVO Y REPORTES

---

### HU-15.1 — Ver dashboard ejecutivo consolidado 🔴

**Como** Corporativo (dueño del grupo)  
**Quiero** ver en una sola pantalla los KPIs más importantes de toda la operación  
**Para** tomar decisiones informadas sin necesidad de pedir reportes manuales

**CA-1:** El dashboard muestra en tiempo real:

**Bloque Rentas:**
- % Ocupación total de la plaza
- Ingresos del mes (cobrado vs esperado)
- Cartera vencida (monto y % de morosidad)
- Locales disponibles (número y m²)
- Contratos por vencer en 60 días

**Bloque RH:**
- Headcount total activo (por empresa)
- Contratos de personal por vencer en 30 días
- Vacantes abiertas
- Índice de rotación del mes

**Bloque Financiero:**
- Ingresos totales del mes (rentas + estacionamiento + otros)
- Gastos totales del mes
- Utilidad operativa y margen %
- Comparativo vs mes anterior (% variación)

**CA-2:** Cada KPI tiene semáforo visual:
- 🟢 Verde: dentro del rango normal
- 🟡 Amarillo: requiere atención
- 🔴 Rojo: fuera de parámetros, acción urgente

**CA-3:** DADO que el Corporativo hace clic en cualquier KPI  
CUANDO navega al detalle  
ENTONCES ve el desglose por empresa/local/empleado  
Y puede exportar a Excel o PDF

---

### HU-15.2 — Generar reporte de rentabilidad por local 🔴

**Como** Admin Plaza o Corporativo  
**Quiero** ver la rentabilidad individual de cada local  
**Para** identificar cuáles generan más valor y cuáles tienen costos elevados de mantenimiento

**CA-1:** El reporte muestra por local y período:
- Ingresos: rentas cobradas
- Gastos directos: mantenimientos registrados para ese local
- Utilidad neta del local
- Margen de rentabilidad %
- Días desocupado en el período
- Índice de ocupación %

**CA-2:** Vista comparativa: tabla con todos los locales ordenables por rentabilidad (mayor a menor).

---

## RESUMEN — ÉPICAS E HISTORIAS DE USUARIO

| # | Épica | Historias | Prioridad |
|---|---|---|---|
| 1 | Gestión de Empresas y Estructura del Grupo | 2 | 🔴 |
| 2 | Catálogo de Inmuebles / Locales | 4 | 🔴 |
| 3 | Prospección y Expedientes de Arrendatarios | 3 | 🔴 |
| 4 | Contratos de Arrendamiento | 4 | 🔴 |
| 5 | Pagos y Conciliación Bancaria | 4 | 🔴 |
| 6 | Comprobantes y Facturas | 2 | 🔴 |
| 7 | Galería de Fotos y Mantenimiento | 2 | 🔴/🟡 |
| 8 | Reclutamiento y Selección | 4 | 🔴 |
| 9 | Contratación y Gestión de Empleados | 3 | 🔴 |
| 10 | Asistencia y Control de Tiempo | 2 | 🔴/🟡 |
| 11 | Finanzas: Gastos e Ingresos | 1 | 🔴 |
| 12 | Catálogo de Proveedores | 1 | 🔴 |
| 13 | Comunicados Masivos con IA | 1 | 🔴 |
| 14 | Préstamos a Trabajadores | 1 | 🟡 |
| 15 | Dashboard Corporativo y Reportes | 2 | 🔴 |
| **TOTAL** | | **36 historias** | |

---

## NOTA PARA CLAUDE CODE

Este documento es el **contrato de comportamiento** del sistema. Cada Criterio de Aceptación es una regla de negocio que DEBE implementarse exactamente como está descrita. Los Catálogos (CAT) son los ÚNICOS valores permitidos en sus campos — no inventar valores adicionales. Las Reglas de Negocio (RN) son restricciones absolutas.

Ante cualquier ambigüedad en implementación, el orden de prioridad es:
1. Este documento de Historias de Usuario
2. El PRD PlazaAdmin v1.2
3. Los estándares RANNIX

---

*Documento generado por RANNIX Consulting — Roberto Aguilar Cota*  
*Metodología: Scrum / BDD (Behavior Driven Development) — Given/When/Then*  
*Junio 2026 — Confidencial*
