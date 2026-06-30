# PlazaAdmin — ERP de Administración de Plaza Comercial
## PRD v1.0 + Super Prompt Maestro v5.0
**Fecha:** Junio 2026 | **Autor:** Roberto Aguilar Cota — RANNIX Consulting  
**Cliente inicial:** Plaza comercial (40 locales) — Grupo empresarial multi-empresa  
**Modelo:** Proyecto a la medida → SaaS B2B multi-tenant

---

## 1. VISIÓN DEL PRODUCTO

**PlazaAdmin** es un ERP web integrado diseñado para la administración completa de plazas comerciales en México. Cubre dos grandes dominios:

- **Módulo A — Arrendamiento**: prospección, expedientes, contratos, pagos y conciliación bancaria de locales.
- **Módulo B — Recursos Humanos**: reclutamiento, selección, contratación, gestión de personal de la plaza y sus unidades de negocio (restaurante, limpieza, vigilancia, servicios).

El sistema opera bajo una estructura **multi-empresa / corporativo**, donde el grupo empresarial dueño de la plaza puede ver consolidado el personal y los contratos de todas sus unidades desde un panel corporativo.

---

## 2. PROBLEMA QUE RESUELVE

Las administradoras de plazas comerciales en México gestionan hoy:
- Expedientes de arrendatarios en carpetas físicas o Excel
- Contratos en Word editados manualmente
- Pagos sin conciliación automática (depósitos dispersos)
- Reclutamiento por WhatsApp sin trazabilidad
- Alta en IMSS manual, propensa a errores y multas
- Sin comunicación masiva personalizada a arrendatarios o empleados

**PlazaAdmin** digitaliza y automatiza todo el ciclo, desde que un prospecto solicita un local hasta que un empleado causa baja, eliminando la fatiga de captura mediante OCR + IA.

---

## 3. USUARIOS Y ROLES

| Rol | Descripción |
|---|---|
| **Super Admin** | RANNIX / administrador del SaaS. Gestiona tenants. |
| **Admin Plaza** | Gerente de la plaza. Acceso total a ambos módulos. |
| **Operador Rentas** | Gestiona expedientes, contratos y pagos de arrendatarios. |
| **Operador RH** | Gestiona vacantes, candidatos, contratos de personal. |
| **Entrevistador** | Recibe expedientes de candidatos, registra resultado de entrevista. |
| **Jefe de Área** | Ve el personal de su unidad de negocio (restaurante, limpieza, etc.). |
| **Corporativo / Dueño** | Vista ejecutiva de todas las empresas del grupo. Solo lectura + reportes. |
| **Arrendatario (portal)** | Sube documentación, consulta estado de cuenta, realiza pagos. |
| **Prospecto (externo)** | Llena formulario de solicitud y sube documentos vía link público. |

---

## 4. ARQUITECTURA TÉCNICA

### Stack RANNIX Standard
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend / Auth**: Supabase (PostgreSQL + Auth + Storage + RLS por tenant)
- **Deploy**: Netlify (rama `main` = producción, `dev` = staging)
- **API IA**: Claude API `claude-sonnet-4-6` vía Netlify Function (proxy seguro)
- **OCR**: Tesseract.js (cliente) o Google Vision API (servidor) para lectura de documentos
- **Comunicaciones**: Resend (email) + WATI (WhatsApp)
- **Pagos**: Stripe (suscripción SaaS) + referencia bancaria por arrendatario (SPEI/CIE)
- **PDF**: jsPDF + pdf-lib para generación de contratos
- **Firma digital**: (fase 2) Mifiel API
- **Analytics**: Microsoft Clarity + GA4 + Google Sheets webhook (RANNIX Standard)
- **Chatbot IA**: Claude embebido en todas las vistas (RANNIX Standard)

### Modelo Multi-tenant
```
tenants (plazas)
  └── empresas (unidades de negocio dentro de la plaza)
        ├── locales / inmuebles
        ├── arrendatarios
        ├── contratos_renta
        └── empleados
```

Row Level Security (RLS) en Supabase garantiza aislamiento total por tenant.

---

## 5. MÓDULO A — ARRENDAMIENTO

### 5.1 Catálogo de Inmuebles / Locales

**Entidad: `locales`**
```
id, tenant_id, numero_local, descripcion, metros_cuadrados, 
piso, zona, estatus (disponible|rentado|en_proceso|mantenimiento),
permite_fusion (boolean), local_fusion_ids (array)
```

**Fusión de locales**: Un arrendatario puede rentar 2+ locales contiguos. El sistema los combina en un solo contrato, sumando m² y precio.

**Entidad: `precios_renta`** (tabla de tarifas históricas por período)
```
id, local_id, fecha_inicio, fecha_fin, precio_mensual, 
moneda (MXN), ajuste_anual_pct, notas
```
> El precio cambia por período contractual (2025, 2026, 2027…). El catálogo almacena el precio vigente en cada etapa para generación correcta de contratos históricos.

### 5.2 Flujo de Prospecto → Arrendatario

```
PROSPECTO
  │
  ├─ [1] Admin genera link único de solicitud
  │       URL: plazaadmin.mx/solicitud/{token}
  │
  ├─ [2] Prospecto llena formulario público:
  │       • Datos personales / empresa
  │       • Local(es) de interés
  │       • Sube documentos:
  │           - Credencial INE (ambos lados)
  │           - Comprobante de domicilio
  │           - Constitutiva (si es empresa)
  │           - Estados financieros (últimos 2 años)
  │           - Referencias comerciales
  │           - Datos de aval / obligado solidario:
  │               · INE aval
  │               · Comprobante domicilio aval
  │               · Escrituras (si aplica)
  │
  ├─ [3] OCR + IA extrae datos automáticamente:
  │       • Nombre completo, CURP, RFC, domicilio
  │       • Se pre-llenan campos del expediente
  │       • Operador revisa y confirma / corrige
  │
  ├─ [4] Expediente creado en estado "En Revisión"
  │       • Checklist de documentos completos / faltantes
  │       • Notificación WhatsApp/email si faltan docs
  │
  ├─ [5] Admin autoriza → estatus cambia a "Aprobado"
  │       • Notificación automática al prospecto
  │       • Prospecto pasa a ser Arrendatario
  │
  └─ [6] Se genera contrato (ver 5.3)
```

### 5.3 Generación de Contratos de Renta

**Plantillas de contrato** configurables por tenant (Word/HTML → PDF generado).

Datos auto-poblados desde expediente:
- Nombre / razón social arrendatario
- Domicilio, RFC, CURP
- Local(es) contratados (con fusión si aplica)
- Precio de renta por período (tabla de vigencias)
- Fecha inicio / fin
- Datos del aval / obligado solidario
- Cláusulas configurables

**Versionado**: Cada contrato queda versionado. Si hay renovación, se genera nuevo contrato manteniendo historial.

**Firma**: 
- Fase 1: El sistema genera PDF → se firma presencialmente → se escanea y sube
- Fase 2: Firma digital vía Mifiel

### 5.4 Gestión de Pagos y Conciliación

**Flujo mensual de cobro:**
```
Día X del mes:
  │
  ├─ Sistema genera referencia CIE/SPEI única por arrendatario
  ├─ Envía link de pago por WhatsApp + email
  │     Contenido: monto, referencia, cuenta CLABE, vencimiento
  │
  ├─ Arrendatario paga y sube comprobante (XML + PDF de CFDI o recibo)
  │
  ├─ CONCILIACIÓN:
  │     AUTOMÁTICA: si banco provee extracto → sistema cruza referencia
  │     MANUAL: módulo de conciliación:
  │       • Operador ve pagos pendientes
  │       • Marca como pagado
  │       • Adjunta comprobante
  │       • Sistema registra fecha y monto real
  │
  └─ Estado de cuenta actualizado
```

**Entidad: `pagos`**
```
id, contrato_id, arrendatario_id, periodo (YYYY-MM),
monto_esperado, monto_recibido, fecha_pago, 
referencia_bancaria, comprobante_url, 
estatus (pendiente|parcial|pagado|vencido),
conciliado (boolean), notas_operador
```

**Módulo de Conciliación Bancaria**:
- Importación de extracto bancario (CSV/Excel del banco)
- Cruza por referencia o monto+fecha
- Marcado masivo o individual
- Log de auditoría

### 5.5 Estados de Cuenta y Reportes Financieros

- **Estado de cuenta por arrendatario**: historial de pagos, saldos, adeudos
- **Estado de cuenta por local**: ingresos generados por inmueble
- **Reporte consolidado de la plaza**: ingresos totales, ocupación, cartera vencida
- **Dashboard KPIs**:
  - % Ocupación
  - % Cartera vencida (morosidad)
  - Ingresos del mes vs mes anterior
  - Locales disponibles
  - Contratos por vencer (próximos 90 días)

### 5.6 Comunicados Masivos con IA

- Admin redacta intención del comunicado ("avisarles del mantenimiento del estacionamiento el sábado")
- Claude genera carta/comunicado formal personalizado
- Vista previa + edición
- Se dispara a todos los arrendatarios (o segmento filtrado) por WhatsApp + email
- Log de envíos

---

## 6. MÓDULO B — RECURSOS HUMANOS

### 6.1 Catálogo de Puestos

**Entidad: `puestos`**
```
id, tenant_id, empresa_id, nombre_puesto, departamento,
descripcion, perfil_requerido, competencias (JSON array),
sueldo_minimo, sueldo_maximo, tipo_contrato_default,
jornada (completa|parcial|por_horas), requiere_experiencia_años
```

Ejemplos: Mesero, Cocinero, Cajero, Vigilante, Intendente, Hostess, Supervisor de Piso.

### 6.2 Reclutamiento — Vacantes

**Entidad: `vacantes`**
```
id, puesto_id, empresa_id, num_plazas, fecha_apertura,
fecha_limite, estatus (abierta|en_proceso|cerrada|cancelada),
descripcion_adicional, responsable_id (quien entrevista),
canal_publicacion (interno|OCC|Indeed|LinkedIn|referido)
```

**Publicación de vacante**:
- Sistema genera descripción IA basada en catálogo de puesto
- Exporta a formato para copiar en OCC/Indeed
- Genera link de postulación interna

### 6.3 Candidatos y Proceso de Selección

**Flujo:**
```
VACANTE ABIERTA
  │
  ├─ [1] Candidato postula (link público o referido)
  │       Sube documentos:
  │         - INE / Identificación
  │         - CURP
  │         - Comprobante de domicilio
  │         - Comprobante de estudios
  │         - Carta de recomendación / referencias
  │         - CV
  │       OCR extrae datos automáticamente
  │
  ├─ [2] Candidato en estatus "Recibido"
  │       Operador RH revisa expediente
  │
  ├─ [3] Agenda entrevista:
  │         - Fecha, hora, lugar o videollamada
  │         - Asigna entrevistador (rol Entrevistador)
  │         - Notificación automática al candidato (WhatsApp + email)
  │         - Notificación al entrevistador con expediente adjunto
  │
  ├─ [4] Entrevistador registra resultado:
  │         - Calificación (1-5)
  │         - Notas de entrevista
  │         - Recomendación: Avanzar / Rechazar / Segunda entrevista
  │
  ├─ [5] Operador RH cambia estatus:
  │         Aceptado → inicia proceso de contratación
  │         Rechazado → notificación al candidato (opcional)
  │         En espera → queda en banco de talento
  │
  └─ [6] Contratación (ver 6.4)
```

**Estatus del candidato:**
`postulado → revisión → entrevista_agendada → entrevistado → aceptado → en_contratación → contratado | rechazado | en_espera`

### 6.4 Contratación y Expediente de Empleado

Una vez aceptado:

1. **Generación automática de contrato** (3 meses inicial / definitivo)
   - Tipo: Eventual (3 meses) → Indefinido
   - Datos auto-poblados desde expediente de candidato
   - PDF generado con plantilla del tenant
   - Firma presencial (fase 1) / digital Mifiel (fase 2)

2. **Agenda de firma**: fecha, hora, lugar → notificación al trabajador

3. **Alta en IMSS**:
   - Sistema genera ficha con datos para alta: NSS, CURP, fecha ingreso, salario diario
   - (Fase 2) Integración directa IDSE/SUA
   - Checklist: alta confirmada, número de afiliación registrado

4. **Expediente del empleado completo:**

**Entidad: `empleados`**
```
id, tenant_id, empresa_id, puesto_id,
nombre_completo, fecha_nacimiento, sexo,
curp, rfc, nss (IMSS),
domicilio, telefono, email,
contacto_emergencia_nombre, contacto_emergencia_tel,
fecha_ingreso, tipo_contrato (eventual|indefinido),
sueldo_mensual, periodicidad_pago,
estatus (activo|baja_voluntaria|baja_involuntaria|incapacidad|suspendido),
-- Documentos (Storage Supabase):
ine_url, curp_url, comprobante_domicilio_url,
comprobante_estudios_url, foto_url, referencias_url,
contrato_url, alta_imss_url
```

### 6.5 Gestión de Contratos de Personal — Ciclo de Vida

```
CONTRATO EVENTUAL (3 meses)
  │
  ├─ 15 días antes de vencer → alerta al Operador RH y Jefe de Área
  │
  ├─ Decisión:
  │     RENOVAR → genera contrato definitivo automáticamente
  │     TERMINAR → inicia proceso de baja
  │
  └─ CONTRATO DEFINITIVO
        │
        └─ Baja cuando proceda (ver 6.6)
```

### 6.6 Bajas de Personal

**Tipos de baja:**
- **Voluntaria (renuncia)**: fecha, carta de renuncia escaneada
- **Involuntaria (despido)**: causa, acta administrativa, finiquito/liquidación
- **Incapacidad temporal**: folio IMSS, período
- **Incapacidad permanente / invalidez**
- **Defunción**

**Proceso de baja:**
1. Operador registra tipo y fecha de baja
2. Sistema calcula prestaciones (días laborados, vacaciones, aguinaldo proporcional)
3. Genera documento de baja para IMSS
4. Cambia estatus empleado → archiva expediente (no elimina)
5. Notificación al corporativo

### 6.7 Roles y Acceso por Unidad de Negocio

- Jefe de Restaurante: ve y gestiona solo empleados de su unidad
- Jefe de Limpieza: ídem para su área
- Corporativo: ve todos los empleados de todas las empresas del grupo
- Admin Plaza: acceso total

### 6.8 Reportes de RH

- Plantilla activa por empresa
- Rotación por período (altas vs bajas)
- Costo de nómina estimado por departamento
- Antigüedad promedio
- Contratos por vencer (próximos 30/60/90 días)
- Headcount total del grupo empresarial

---

## 7. MÓDULO CORPORATIVO — VISTA CONSOLIDADA

Para el dueño / corporativo del grupo empresarial:

- **Dashboard ejecutivo**: KPIs de rentas + RH en una sola pantalla
- **Rentas**: ingresos totales, ocupación, morosidad por plaza
- **Personal**: total empleados activos, costo nómina estimado, alertas de vencimientos
- **Documentos**: acceso a expedientes de todas las empresas
- **Comunicados**: historial de comunicados enviados
- Solo lectura (no puede operar, solo consultar y exportar)

---

## 8. OCR + IA — CAPTURA AUTOMÁTICA DE DOCUMENTOS

**Motor**: Claude Vision API (via Netlify Function proxy)

**Documentos soportados:**
| Documento | Campos extraídos |
|---|---|
| INE / IFE | Nombre, domicilio, CURP, fecha nacimiento, clave elector |
| CURP | CURP completo, nombre, fecha nacimiento |
| Comprobante domicilio | Domicilio, titular, fecha emisión |
| Acta constitutiva | Razón social, RFC, representante legal, objeto social |
| Estado de cuenta bancario | Titular, banco, CLABE, saldo, movimientos |
| Comprobante de estudios | Nombre, institución, grado, año |

**Flujo OCR:**
1. Usuario sube imagen / PDF del documento
2. Netlify Function llama Claude API con imagen en base64
3. Claude extrae campos en JSON estructurado
4. Frontend pre-llena formulario
5. Usuario revisa, corrige si hay error, confirma
6. Dato queda guardado con flag `ocr_extraido: true` para auditoría

---

## 9. DISEÑO UX/UI — RANNIX STANDARD

### Paleta (RANNIX + identidad PlazaAdmin)
```css
--primary:    #0A66C2;   /* Azul LinkedIn RANNIX */
--secondary:  #1A3C5E;   /* Azul marino oscuro — seriedad corporativa */
--accent:     #E8A020;   /* Ámbar dorado — plaza / comercial */
--bg:         #F3F2EF;
--surface:    #FFFFFF;
--text:       #000000E6;
--border:     #E0DFDC;
--success:    #057642;
--warning:    #B24020;
```

### Estructura UI
- **Navbar fija** con logo PlazaAdmin + selector de módulo (Rentas | RH | Corporativo)
- **Sidebar colapsable** con navegación por secciones
- **Mobile-first** (operadores usan tablet/celular en campo)
- **Cards con soft shadow**, border-radius 6px
- **Skeleton screens** en carga de datos
- **Dark mode** preparado con CSS vars
- **Favicon** con ícono de edificio/local

### Footer
`© PlazaAdmin by RANNIX Consulting | v1.0 | 2026`

### Tracking (RANNIX Standard — incluir SIEMPRE)
1. Microsoft Clarity: `CLARITY_PROJECT_ID = PLAZAADMIN_001`
2. GA4: `GA_MEASUREMENT_ID = G-PLAZAADMIN`
3. Webhook Google Sheets: tab "Analytics" — IP, ciudad, fecha, página, tiempo, referrer

---

## 10. ESQUEMA DE BASE DE DATOS (Supabase / PostgreSQL)

```sql
-- MULTI-TENANT
tenants (id, nombre, plan, activo, created_at)
empresas (id, tenant_id, nombre, giro, rfc, logo_url)

-- RENTAS
locales (id, empresa_id, numero, descripcion, m2, zona, estatus, permite_fusion)
locales_fusion (id, local_principal_id, local_secundario_id)
precios_renta (id, local_id, fecha_inicio, fecha_fin, precio_mensual, ajuste_anual_pct)
prospectos (id, empresa_id, nombre, tipo_persona, email, tel, estatus, token_link)
expedientes_arrendatario (id, prospecto_id, local_ids[], aval_nombre, aval_datos, 
                          estatus_docs, aprobado_por, aprobado_at)
documentos_arrendatario (id, expediente_id, tipo_doc, url, ocr_data, verificado)
contratos_renta (id, expediente_id, local_ids[], fecha_inicio, fecha_fin, 
                 precio_mensual, estatus, pdf_url, firmado_at)
pagos (id, contrato_id, periodo, monto_esperado, monto_recibido, 
       fecha_pago, referencia, comprobante_url, estatus, conciliado)
comunicados (id, empresa_id, titulo, cuerpo, destinatarios_ids[], 
             enviado_at, canal)

-- RECURSOS HUMANOS
puestos (id, empresa_id, nombre, departamento, sueldo_min, sueldo_max, 
         perfil, competencias)
vacantes (id, puesto_id, num_plazas, fecha_apertura, fecha_limite, 
          responsable_id, estatus)
candidatos (id, vacante_id, nombre, email, tel, curp, estatus, 
            entrevista_fecha, entrevistador_id, calificacion, notas)
documentos_candidato (id, candidato_id, tipo_doc, url, ocr_data)
empleados (id, empresa_id, puesto_id, candidato_id, nombre, curp, rfc, nss,
           fecha_ingreso, tipo_contrato, sueldo, estatus, contacto_emergencia)
documentos_empleado (id, empleado_id, tipo_doc, url, ocr_data)
contratos_personal (id, empleado_id, tipo, fecha_inicio, fecha_fin, 
                    pdf_url, firmado_at, estatus)
bajas (id, empleado_id, tipo_baja, fecha, motivo, docs_url, calculado_por)
entrevistas (id, candidato_id, vacante_id, fecha, entrevistador_id, 
             resultado, notas, calificacion)

-- CONFIGURACIÓN
usuarios (id, tenant_id, empresa_ids[], rol, nombre, email)
plantillas_contrato (id, tenant_id, tipo, html_template, variables_map)
configuracion_banco (id, empresa_id, banco, clabe, referencia_prefijo)
```

---

## 11. FASES DE DESARROLLO

### Sprint 0 — Fundación (Semana 1)
- Estructura del proyecto React + Supabase
- Auth con roles (Supabase Auth + RLS)
- Navegación principal (Navbar + Sidebar)
- Seed de datos: tenant demo, empresa demo, 40 locales
- RANNIX Standards: Clarity, GA4, tracking sheet, chatbot Claude embebido

### Sprint 1 — Catálogos y Prospectos (Semana 2)
- Catálogo de locales (CRUD + fusión)
- Tabla de precios por período
- Link público de solicitud de prospecto
- Formulario de carga de documentos (arrendatario)
- OCR básico: INE + Comprobante domicilio

### Sprint 2 — Expedientes y Contratos de Renta (Semana 3)
- Expediente de arrendatario (checklist docs)
- Flujo de aprobación (prospecto → arrendatario)
- Generación de contrato PDF (plantilla configurable)
- Gestión de contratos (historial, renovación)

### Sprint 3 — Pagos y Conciliación (Semana 4)
- Módulo de cobro mensual (referencias + link de pago)
- Registro manual de pagos + adjunto comprobante
- Importación extracto bancario CSV
- Conciliación automática/manual
- Estado de cuenta por arrendatario y por local

### Sprint 4 — RH: Reclutamiento y Selección (Semana 5)
- Catálogo de puestos
- Vacantes (CRUD + publicación)
- Portal de postulación (link público candidatos)
- OCR documentos candidatos
- Flujo de entrevistas (agenda + notificaciones)

### Sprint 5 — RH: Contratación y Empleados (Semana 6)
- Generación contrato de personal (eventual/indefinido)
- Expediente completo del empleado
- Flujo de alta IMSS (ficha de datos)
- Alertas de vencimiento de contratos
- Bajas de personal (tipos + cálculo prestaciones)

### Sprint 6 — Dashboard Corporativo + Comunicados IA (Semana 7)
- Dashboard ejecutivo consolidado (rentas + RH)
- Reportes exportables (Excel/PDF)
- Módulo de comunicados masivos con IA (Claude)
- Panel corporativo multi-empresa

### Sprint 7 — Pulido y Entrega (Semana 8)
- QA completo
- Configuración Netlify producción
- Capacitación al cliente
- Documentación de usuario
- Setup de dominio + SSL

---

## 12. MODELO COMERCIAL

### Proyecto a medida (cliente actual — Plaza 40 locales)
| Concepto | Monto MXN |
|---|---|
| Desarrollo e implementación | $120,000 – $180,000 |
| Capacitación y arranque | $15,000 |
| Soporte mensual (primer año) | $8,000/mes |

### SaaS B2B (siguientes clientes)
| Plan | Incluye | Precio/mes MXN |
|---|---|---|
| **Starter** | 1 empresa, hasta 20 locales, hasta 30 empleados | $2,500 |
| **Pro** | 3 empresas, hasta 80 locales, hasta 150 empleados, OCR ilimitado | $6,500 |
| **Enterprise** | Multi-empresa ilimitado, API, white-label | $15,000+ |

---

## 13. SUPER PROMPT MAESTRO v5.0 — PARA CLAUDE CODE

```
Eres un desarrollador full-stack senior especializado en React 18, Vite, TailwindCSS y Supabase. 
Vas a construir PlazaAdmin: un ERP web para administración de plazas comerciales en México, 
con dos módulos principales: Arrendamiento y Recursos Humanos.

=== IDENTIDAD DEL PROYECTO ===
Nombre: PlazaAdmin
Empresa: RANNIX Consulting
Stack: React 18 + Vite + TailwindCSS + Supabase + Netlify + Claude API
Repo estructura: /src /netlify/functions /public
URL producción: plazaadmin.netlify.app (luego dominio propio)

=== RANNIX DEV STANDARDS (OBLIGATORIO EN TODO EL PROYECTO) ===

DISEÑO:
- Colores: Primary #0A66C2, Secondary #1A3C5E, Accent #E8A020, BG #F3F2EF, 
  Surface #FFFFFF, Text #000000E6, Border #E0DFDC, Success #057642, Warning #B24020
- Tipografía: Inter (display) + Roboto (body)
- Cards: shadow-md, border-radius 6px
- Navbar fija + sidebar colapsable
- Mobile-first responsive
- Skeleton screens en carga
- CSS vars para dark mode (preparado, no activo desde inicio)
- Footer: "© PlazaAdmin by RANNIX Consulting | v1.0 | 2026"
- Favicon: ícono de edificio comercial

TRACKING (incluir en index.html y en cada página clave):
1. Microsoft Clarity: window.clarity con ID placeholder CLARITY_PLAZAADMIN
2. GA4: gtag con ID placeholder GA_PLAZAADMIN  
3. Webhook Google Sheets: fetch POST a Apps Script URL con {ip, ciudad, fecha, 
   pagina, tiempo_en_pagina, referrer, userAgent}
   Usar ipapi.co para obtener IP y geolocalización

CHATBOT CLAUDE: Embebir en todas las vistas un botón flotante (bottom-right) 
que abre panel de chat con Claude API (via Netlify Function /functions/claude-chat.js)
El chatbot conoce el contexto del módulo actual.

SEGURIDAD API KEYS:
- NUNCA exponer API keys en frontend
- Toda llamada a Claude API, OCR, WATI → vía Netlify Functions
- Variables en Netlify env: ANTHROPIC_API_KEY, SUPABASE_SERVICE_KEY, WATI_TOKEN

=== ESTRUCTURA DE CARPETAS ===
/src
  /components
    /layout (Navbar, Sidebar, Footer, ChatbotWidget)
    /ui (Button, Card, Modal, Table, Badge, Skeleton, FileUpload, OCRPreview)
    /forms (ProspectoForm, EmpleadoForm, ContratoForm, VacanteForm)
  /pages
    /rentas (Locales, Prospectos, Expedientes, Contratos, Pagos, Conciliacion, Reportes)
    /rh (Puestos, Vacantes, Candidatos, Empleados, ContratosPersonal, Bajas, ReportesRH)
    /corporativo (Dashboard, Consolidado)
    /config (Plantillas, Banco, Usuarios)
  /hooks (useAuth, useSupabase, useTenant, useOCR, useNotifications)
  /lib (supabase.js, claudeApi.js, ocrService.js, pdfGenerator.js, emailService.js)
  /store (Zustand: authStore, tenantStore, uiStore)
/netlify/functions
  claude-chat.js      ← Proxy chatbot
  ocr-extract.js      ← OCR con Claude Vision
  send-notification.js ← WhatsApp via WATI + email via Resend
  generate-pdf.js     ← Contratos PDF
  conciliar-banco.js  ← Lógica de conciliación
  audit-log.js        ← Registro de eventos en Supabase audit_log

=== SPRINT 0 — ENTREGAR PRIMERO ===

1. Setup completo del proyecto (Vite + React + Tailwind + Supabase client)
2. Sistema de autenticación:
   - Login con email/password (Supabase Auth)
   - Roles: super_admin, admin_plaza, operador_rentas, operador_rh, 
     entrevistador, jefe_area, corporativo
   - RLS en Supabase por tenant_id
   - Rutas protegidas por rol (React Router v6)
3. Layout principal:
   - Navbar fija con logo + nombre tenant + avatar usuario + logout
   - Sidebar colapsable con íconos (Lucide React):
     RENTAS: Locales | Prospectos | Expedientes | Contratos | Pagos | Reportes
     RH: Puestos | Vacantes | Candidatos | Empleados | Contratos | Bajas | Reportes
     CORPORATIVO: Dashboard | Consolidado
     CONFIG: Plantillas | Banco | Usuarios
   - Footer RANNIX Standard
   - ChatbotWidget flotante (bottom-right)
4. Seed de datos demo:
   - 1 tenant: "Plaza Comercial Demo"
   - 1 empresa: "Grupo Empresarial Demo SA de CV"
   - 40 locales (numerados L-01 a L-40, distintos m², zonas A/B/C)
   - Precios de renta 2025-2027
   - 3 usuarios de prueba (admin, operador_rentas, operador_rh)
5. Dashboard home con KPIs skeleton:
   - Locales: total | ocupados | disponibles | en proceso
   - Rentas: cobrado este mes | pendiente | vencido
   - RH: empleados activos | contratos por vencer | vacantes abiertas
6. Tracking RANNIX Standard completo en index.html

Cuando termines Sprint 0, avísame con un resumen de lo entregado y espera instrucciones 
para Sprint 1.

=== INSTRUCCIONES GENERALES ===
- Usa TypeScript cuando sea posible
- Componentes funcionales con hooks
- Zustand para estado global
- React Query (TanStack) para fetching y cache de Supabase
- Formularios con React Hook Form + Zod validación
- Tablas con TanStack Table (paginación, filtros, ordenamiento)
- Notificaciones toast con react-hot-toast
- Íconos: Lucide React exclusivamente
- PDF: jsPDF + html2canvas para contratos
- Fechas: date-fns con locale es-MX
- Número formato: Intl.NumberFormat para pesos MXN
- Comentarios en español en el código
- Commits descriptivos en español
- No generes código incompleto — si un módulo requiere más contexto, pregunta antes
```

---

## 14. CHECKLIST DE ARRANQUE

- [ ] Repositorio GitHub creado: `plazaadmin-web`
- [ ] Proyecto Supabase creado: `plazaadmin-prod`
- [ ] Variables de entorno configuradas en Netlify
- [ ] Dominio plazaadmin.netlify.app conectado
- [ ] Rama `dev` para Claude Code, `main` para producción
- [ ] Google Sheet "PlazaAdmin Analytics" creado con Apps Script webhook
- [ ] Microsoft Clarity proyecto creado
- [ ] GA4 propiedad creada
- [ ] Resend cuenta creada (email transaccional)
- [ ] WATI cuenta configurada (WhatsApp)
- [ ] Reunión de kick-off con cliente agendada

---

*Documento generado por RANNIX Consulting — Roberto Aguilar Cota*  
*Versión 1.0 — Junio 2026*  
*Confidencial — Uso interno*

---

## ADDENDUM v1.1 — Junio 2026
### Módulos adicionales: Finanzas, Proveedores, Estacionamiento (integración) y Data Warehouse

---

## 15. MÓDULO C — FINANZAS: INGRESOS Y GASTOS

### 15.1 Visión General

PlazaAdmin administra el **estado financiero operativo** de la plaza:

```
INGRESOS
  ├── Rentas de locales          ← Módulo A (ya definido)
  ├── Estacionamiento            ← Integración EstacionaCloud vía API
  └── Otros ingresos             ← Registro manual (cuotas, eventos, etc.)

GASTOS
  ├── Insumos y mantenimiento    ← Productos de limpieza, reparaciones, etc.
  ├── Servicios externos         ← Proveedores de servicios
  ├── Nómina (estimada)          ← Desde Módulo B RH
  └── Gastos administrativos     ← Papelería, seguros, etc.
```

### 15.2 Catálogo de Cuentas / Clasificación de Gastos

```sql
categorias_gasto (
  id, tenant_id, nombre, tipo (fijo|variable|extraordinario),
  cuenta_contable, descripcion, activo
)
```

Ejemplos de categorías:
| Categoría | Tipo |
|---|---|
| Productos de limpieza | Variable |
| Mantenimiento correctivo | Extraordinario |
| Mantenimiento preventivo | Fijo |
| Vigilancia / Seguridad | Fijo |
| Energía eléctrica | Fijo |
| Agua | Fijo |
| Papelería y oficina | Variable |
| Reparaciones menores | Extraordinario |
| Honorarios profesionales | Variable |
| Seguros | Fijo |

### 15.3 Registro de Gastos

**Entidad: `gastos`**
```sql
gastos (
  id, tenant_id, empresa_id, categoria_id, proveedor_id,
  descripcion, monto, moneda,
  fecha_gasto, fecha_factura,
  -- Adjuntos
  factura_pdf_url, factura_xml_url,
  -- Clasificación
  tipo_comprobante (factura|recibo|ticket|sin_comprobante),
  rfc_emisor, uuid_cfdi,
  -- Control
  registrado_por, aprobado_por, aprobado_at,
  estatus (borrador|registrado|aprobado|rechazado),
  notas
)
```

**Flujo de registro de gasto:**
1. Operador sube factura PDF/XML
2. OCR + IA extrae: RFC emisor, monto, fecha, descripción, UUID CFDI
3. Se pre-llena el formulario
4. Operador selecciona categoría y proveedor del catálogo
5. Admin aprueba el gasto (si supera monto configurado → requiere aprobación)
6. Gasto queda en el estado de resultados del período

### 15.4 Otros Ingresos

**Entidad: `otros_ingresos`**
```sql
otros_ingresos (
  id, tenant_id, empresa_id, concepto, categoria,
  monto, fecha, comprobante_url,
  registrado_por, notas
)
```

Categorías de otros ingresos:
- Cuota de mantenimiento extraordinaria
- Renta de espacios para eventos
- Publicidad en fachada / pantallas
- Cuotas de ingreso (arrendatarios nuevos)
- Multas / penalizaciones a arrendatarios

### 15.5 Estado de Resultados Operativo

Panel mensual / anual con:

```
INGRESOS TOTALES
  + Rentas cobradas del mes          [desde Módulo A]
  + Ingresos estacionamiento         [desde EstacionaCloud API]
  + Otros ingresos                   [registro manual]
─────────────────────────────────────
  = TOTAL INGRESOS

GASTOS TOTALES
  - Insumos y mantenimiento
  - Servicios / proveedores
  - Nómina estimada                  [desde Módulo B]
  - Gastos administrativos
─────────────────────────────────────
  = TOTAL GASTOS

─────────────────────────────────────
  UTILIDAD OPERATIVA = Ingresos - Gastos
  MARGEN OPERATIVO % = Utilidad / Ingresos × 100
```

Filtros: por mes, trimestre, año, empresa, categoría.
Exportable a Excel y PDF.

---

## 16. MÓDULO D — CATÁLOGO DE PROVEEDORES

### 16.1 Expediente de Proveedor

**Entidad: `proveedores`**
```sql
proveedores (
  id, tenant_id, empresa_ids[],   -- puede proveer a varias empresas del grupo
  tipo_persona (fisica|moral),
  -- Datos generales
  nombre_razon_social, nombre_comercial,
  rfc, curp,                       -- CURP solo si persona física
  -- Contacto
  telefono_1, telefono_2, whatsapp,
  email_1, email_2,
  url_web, facebook, instagram, linkedin,
  -- Domicilio
  calle, num_ext, num_int, colonia, municipio, estado, cp,
  -- Clasificación
  categoria_servicio,              -- limpieza, mantenimiento, seguridad, etc.
  especialidad, notas_servicio,
  -- Estatus
  activo, calificacion (1-5), fecha_alta,
  -- Documentos
  constancia_fiscal_url,           -- CSF del SAT
  ine_url,                         -- si persona física
  acta_constitutiva_url,           -- si persona moral
  contrato_servicio_url,
  -- Control
  registrado_por, updated_at
)
```

### 16.2 OCR para Proveedores

Al subir **Constancia de Situación Fiscal (CSF)** del SAT:
- Claude Vision extrae: RFC, razón social, régimen fiscal, domicilio fiscal, código postal
- Se pre-llenan todos los campos del expediente automáticamente

Al subir **INE** (persona física):
- Extrae: nombre, CURP, domicilio, fecha nacimiento

### 16.3 Directorio de Proveedores

- Vista de cards con avatar/logo, nombre, categoría, teléfono, WhatsApp directo
- Filtro por categoría de servicio, estado activo/inactivo, calificación
- Botón "WhatsApp" → abre chat directo
- Historial de gastos por proveedor
- Calificación acumulada basada en historial de servicios

### 16.4 Categorías de Proveedores

| Categoría | Ejemplos |
|---|---|
| Limpieza | Productos, empresa de limpieza |
| Mantenimiento | Plomería, electricidad, herrería |
| Seguridad | Empresa de vigilancia, CCTV |
| Construcción | Albañilería, pintura, vidriería |
| Tecnología | Telecomunicaciones, CCTV, redes |
| Profesionales | Contadores, abogados, arquitectos |
| Alimentación | Proveedores del restaurante |
| Oficina | Papelería, mobiliario |

---

## 17. MÓDULO E — INTEGRACIÓN ESTACIONAMIENTO (EstacionaCloud)

### 17.1 Modelo de Integración

EstacionaCloud (sistema PHP/SQLite desarrollado por RANNIX) opera de forma **autónoma** en la plaza y expone una API REST que PlazaAdmin consume para consolidar ingresos.

```
EstacionaCloud (sistema propio de la plaza)
        │
        │  API REST / webhook
        ▼
PlazaAdmin — Módulo Finanzas
        │
        ▼
Dashboard financiero consolidado
```

### 17.2 Datos que PlazaAdmin consume de EstacionaCloud

**Endpoint sugerido (EstacionaCloud debe exponer):**
```
GET /api/ingresos?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
```

**Respuesta esperada:**
```json
{
  "periodo": "2026-06",
  "total_ingresos": 45200.00,
  "total_tickets": 1840,
  "ticket_promedio": 24.57,
  "desglose": [
    { "fecha": "2026-06-01", "monto": 1520.00, "tickets": 62 },
    ...
  ]
}
```

**Entidad local en PlazaAdmin: `ingresos_estacionamiento`**
```sql
ingresos_estacionamiento (
  id, tenant_id, empresa_id,
  periodo (YYYY-MM), fecha_sincronizacion,
  total_ingresos, total_tickets, ticket_promedio,
  detalle_json,                    -- respuesta completa guardada
  fuente (api_automatica|manual),
  notas
)
```

### 17.3 Sincronización

- **Automática**: Netlify Function corre diariamente (cron) y consulta EstacionaCloud API
- **Manual**: Botón "Sincronizar estacionamiento" en el módulo de finanzas
- Si EstacionaCloud no tiene API aún: formulario de captura manual con los mismos campos

### 17.4 Dashboard de Estacionamiento en PlazaAdmin

Widget en el módulo Finanzas mostrando:
- Ingresos del mes actual vs mes anterior
- Promedio diario
- Tickets promedio
- Gráfica de ingresos diarios (últimos 30 días)
- Botón "Ver detalle completo" → enlace a EstacionaCloud

---

## 18. MÓDULO F — DATA WAREHOUSE Y ANALYTICS

### 18.1 Filosofía

PlazaAdmin implementa un **mini Data Warehouse operativo** siguiendo principio Kimball simplificado: tablas de hechos + dimensiones, actualizadas en tiempo real o por batch nocturno.

Objetivo: que el corporativo y el admin de plaza puedan tomar decisiones basadas en datos históricos, tendencias y proyecciones — sin depender de Excel.

### 18.2 Modelo Dimensional (Supabase / PostgreSQL)

```sql
-- DIMENSIONES
dim_tiempo (fecha, dia, semana, mes, trimestre, año, dia_semana, es_fin_semana)
dim_local (local_id, numero, zona, m2, piso, activo_desde)
dim_arrendatario (arrendatario_id, nombre, tipo_persona, antiguedad_meses)
dim_empleado (empleado_id, nombre, puesto, departamento, empresa, fecha_ingreso)
dim_proveedor (proveedor_id, nombre, categoria)
dim_empresa (empresa_id, nombre, giro, grupo)

-- TABLAS DE HECHOS
fact_pagos_renta (
  fecha_id, local_id, arrendatario_id, empresa_id,
  monto_esperado, monto_cobrado, dias_retraso,
  conciliado, tipo_pago
)

fact_gastos (
  fecha_id, categoria_id, proveedor_id, empresa_id,
  monto, tipo_comprobante
)

fact_ingresos_estacionamiento (
  fecha_id, empresa_id,
  monto, tickets, ticket_promedio
)

fact_rh_movimientos (
  fecha_id, empleado_id, empresa_id, puesto_id,
  tipo_movimiento (alta|baja|cambio_puesto|renovacion_contrato),
  sueldo_anterior, sueldo_nuevo
)

fact_vacantes (
  fecha_id, vacante_id, empresa_id, puesto_id,
  dias_en_proceso, num_candidatos, resultado
)

fact_ocupacion_locales (
  fecha_id, local_id, empresa_id,
  estatus (ocupado|disponible|mantenimiento),
  precio_renta_vigente
)
```

### 18.3 KPIs y Métricas Clave

**Rentas:**
| KPI | Descripción |
|---|---|
| Tasa de ocupación | % locales rentados vs total |
| Cartera vencida | Monto total de rentas no cobradas |
| % Morosidad | Arrendatarios con retraso / total |
| Días promedio de retraso | Promedio de días tarde en pago |
| Ingreso por m² | Renta cobrada / m² rentado |
| Rotación de locales | Veces que cambió arrendatario por año |

**Finanzas:**
| KPI | Descripción |
|---|---|
| Utilidad operativa | Ingresos totales - Gastos totales |
| Margen operativo % | Utilidad / Ingresos |
| Gasto por categoría | Distribución de gastos |
| Costo por m² | Gastos totales / m² de plaza |
| ROI estacionamiento | Ingresos estac. / Costo operativo |

**RH:**
| KPI | Descripción |
|---|---|
| Headcount activo | Total empleados por empresa |
| Tasa de rotación | Bajas / Promedio plantilla × 100 |
| Costo nómina estimado | Suma sueldos activos |
| Tiempo promedio de contratación | Días desde vacante hasta contrato |
| Contratos por vencer | Próximos 30/60/90 días |
| Ausentismo | (fase 2 con control de asistencia) |

### 18.4 Dashboards por Rol

**Admin Plaza — Dashboard Operativo**
- KPIs del día: pagos recibidos hoy, gastos registrados, empleados activos
- Alertas: contratos de arrendamiento por vencer, contratos personal por vencer, docs faltantes
- Gráfica: ocupación últimos 12 meses
- Gráfica: ingresos vs gastos últimos 6 meses

**Corporativo — Dashboard Ejecutivo**
- Vista consolidada de todas las empresas del grupo
- Estado de resultados mensual / anual comparativo
- Mapa de locales (visual: ocupado=verde, disponible=azul, mora=rojo)
- Top 5 arrendatarios por monto pagado
- Evolución de plantilla (headcount por mes)
- Exportar a Excel / PDF ejecutivo

**Operador Rentas — Dashboard de Cobranza**
- Lista de pagos pendientes del mes ordenados por vencimiento
- Pendientes de conciliación
- Arrendatarios con adeudo histórico
- Locales disponibles para ofertar

**Operador RH — Dashboard de Personal**
- Contratos por vencer esta semana / este mes
- Candidatos en proceso por vacante
- Últimas altas y bajas
- Vacantes abiertas con días transcurridos

### 18.5 Retención de Historial

- **Arrendatarios**: historial completo de contratos, pagos, comunicados, desde alta hasta baja (nunca se borra, solo se archiva)
- **Empleados**: historial completo desde candidato hasta baja + tipo de baja + documentación
- **Gastos**: historial por período con adjuntos preservados en Supabase Storage
- **Proveedores**: historial de servicios contratados y montos pagados
- Política de retención: **mínimo 5 años** (requisito fiscal mexicano SAT)
- Backup nocturno automático vía Supabase Point-in-Time Recovery

### 18.6 Exportaciones y Reportes

| Reporte | Formato | Destinatario |
|---|---|---|
| Estado de resultados mensual | Excel + PDF | Corporativo / Contador |
| Cartera de arrendatarios | Excel | Operador Rentas |
| Plantilla de personal | Excel | Corporativo / IMSS |
| Histórico de gastos por categoría | Excel | Admin Plaza |
| Conciliación bancaria del mes | Excel | Operador Rentas |
| Reporte de vacantes y rotación | PDF | Admin Plaza / Corporativo |
| Estado de cuenta por arrendatario | PDF | Arrendatario (envío automático) |

---

## 19. ACTUALIZACIÓN — SUPER PROMPT MAESTRO v5.1

### Módulos adicionales para incluir en el Sprint Plan:

```
SPRINT 8 — FINANZAS: INGRESOS Y GASTOS
- Catálogo de categorías de gasto (CRUD)
- Registro de gastos con OCR de facturas PDF/XML
- Flujo de aprobación de gastos
- Registro de otros ingresos (manual)
- Estado de resultados operativo (mensual/anual)
- Exportación Excel + PDF

SPRINT 9 — PROVEEDORES
- CRUD de proveedores (persona física y moral)
- OCR de Constancia de Situación Fiscal (CSF SAT)
- OCR de INE (persona física)
- Directorio con filtros y búsqueda
- Historial de gastos por proveedor
- Calificación de proveedores

SPRINT 10 — INTEGRACIÓN ESTACIONAMIENTO
- Netlify Function: consumo API EstacionaCloud
- Cron diario de sincronización
- Módulo manual de captura (fallback)
- Widget de estacionamiento en Dashboard Finanzas
- Configuración de endpoint en panel admin

SPRINT 11 — DATA WAREHOUSE Y ANALYTICS
- Creación de tablas fact_ y dim_ en Supabase
- ETL batch nocturno (Netlify scheduled function)
- Dashboard Ejecutivo Corporativo (recharts)
- Dashboard Operativo Admin Plaza
- Exportaciones Excel (SheetJS) y PDF (jsPDF)
- Política de retención y archivado de historial

NUEVAS TABLAS A AGREGAR AL ESQUEMA:
- categorias_gasto
- gastos
- otros_ingresos
- proveedores
- ingresos_estacionamiento
- fact_pagos_renta, fact_gastos, fact_ingresos_estacionamiento
- fact_rh_movimientos, fact_vacantes, fact_ocupacion_locales
- dim_tiempo, dim_local, dim_arrendatario, dim_empleado, dim_proveedor, dim_empresa

NUEVAS FUNCIONES NETLIFY:
- sync-estacionamiento.js    ← consume EstacionaCloud API
- etl-batch.js               ← alimenta tablas fact_ y dim_
- ocr-factura.js             ← extrae datos de facturas (RFC, monto, UUID)
- ocr-csf.js                 ← extrae datos de Constancia Situación Fiscal SAT
- export-excel.js            ← genera Excel desde query
- export-pdf-reporte.js      ← genera PDF de reportes ejecutivos
```

---

## 20. RESUMEN ACTUALIZADO — MÓDULOS DE PLAZAADMIN v1.1

| Módulo | Descripción |
|---|---|
| **A — Arrendamiento** | Prospectos, expedientes, contratos, pagos, conciliación |
| **B — Recursos Humanos** | Reclutamiento, contratos, IMSS, bajas, plantilla |
| **C — Finanzas** | Ingresos (rentas + estac. + otros), gastos, Estado de Resultados |
| **D — Proveedores** | Expedientes, CSF OCR, directorio, historial de pagos |
| **E — Estacionamiento** | Integración EstacionaCloud API → PlazaAdmin Finanzas |
| **F — Data Warehouse** | KPIs, dashboards por rol, historial completo, exportaciones |
| **G — Corporativo** | Vista ejecutiva consolidada multi-empresa |
| **H — Configuración** | Plantillas, banco, usuarios, roles, catálogos |

**Total sprints: 11 sprints × ~1 semana = ~11 semanas de desarrollo**

---

*Addendum v1.1 generado por RANNIX Consulting — Roberto Aguilar Cota*
*Fecha: Junio 2026 | Confidencial*

---

## ADDENDUM v1.2 — Junio 2026
### Requerimientos adicionales: Catálogos, Historia completa, Pagarés, Asistencia, Gastos por Inmueble, KPIs Enterprise (inspirado en SAP HCM + Yardi + MRI Software)

---

## 21. CATÁLOGOS MAESTROS DEL SISTEMA

Todos los catálogos son configurables por tenant (Admin Plaza los mantiene).

### 21.1 Catálogo de Razones Sociales / Empresas del Grupo
```sql
empresas (
  id, tenant_id, 
  razon_social, nombre_comercial, rfc, regimen_fiscal,
  tipo (corporativo|plaza|restaurante|servicio|otro),
  logo_url, activo,
  -- Representante legal
  rep_legal_nombre, rep_legal_curp, rep_legal_ine_url,
  -- Domicilio fiscal
  calle, num_ext, colonia, municipio, estado, cp,
  -- Contacto
  tel_1, tel_2, email, url_web
)
```

### 21.2 Catálogo de Estatus — Proceso de Reclutamiento
| Clave | Estatus | Descripción |
|---|---|---|
| `POSTULADO` | Postulado | Candidato recibió el link y envió solicitud |
| `EN_REVISION` | En Revisión | Operador RH revisa expediente |
| `DOCS_INCOMPLETOS` | Docs Incompletos | Faltan documentos — notificación enviada |
| `PRESELECCIONADO` | Preseleccionado | Pasó revisión inicial |
| `ENTREVISTA_AGENDADA` | Entrevista Agendada | Fecha y entrevistador asignados |
| `ENTREVISTADO` | Entrevistado | Resultado de entrevista registrado |
| `SEGUNDA_ENTREVISTA` | 2ª Entrevista | Requiere segunda evaluación |
| `ACEPTADO` | Aceptado | Candidato seleccionado para contratar |
| `EN_CONTRATACION` | En Contratación | Proceso de firma de contrato en curso |
| `CONTRATADO` | Contratado | Alta completada, empleado activo |
| `RECHAZADO` | Rechazado | No seleccionado (queda en banco de talento) |
| `EN_ESPERA` | En Espera | Banco de talento — posible futuro |
| `RETIRADO` | Retirado | Candidato desistió del proceso |

### 21.3 Catálogo de Estatus — Proceso de Contrato de Personal
| Clave | Estatus | Descripción |
|---|---|---|
| `GENERADO` | Generado | Contrato creado, pendiente firma |
| `AGENDADO` | Firma Agendada | Fecha de firma programada |
| `FIRMADO` | Firmado | Contrato firmado y digitalizado |
| `VIGENTE` | Vigente | En período activo |
| `POR_VENCER` | Por Vencer | Vence en ≤30 días — alerta activa |
| `VENCIDO` | Vencido | Pasó fecha fin sin renovación |
| `RENOVADO` | Renovado | Se generó contrato sucesor |
| `TERMINADO` | Terminado | Fin por baja voluntaria o involuntaria |
| `CANCELADO` | Cancelado | Anulado antes de firma |

### 21.4 Catálogo de Estatus — Proceso de Contrato de Inmueble
| Clave | Estatus | Descripción |
|---|---|---|
| `PROSPECTO` | Prospecto | Solicitud recibida, en evaluación |
| `DOCS_PENDIENTES` | Docs Pendientes | Expediente incompleto |
| `EN_REVISION` | En Revisión | Evaluación de crédito / referencias |
| `APROBADO` | Aprobado | Prospecto autorizado |
| `CONTRATO_GENERADO` | Contrato Generado | PDF listo para firma |
| `CONTRATO_FIRMADO` | Contrato Firmado | Arrendatario activo |
| `VIGENTE` | Vigente | Contrato en curso, pagos al corriente |
| `EN_MORA` | En Mora | Pago(s) vencido(s) |
| `POR_VENCER` | Por Vencer | Vence en ≤60 días |
| `RENOVADO` | Renovado | Nuevo contrato sucesor generado |
| `ADDENDUM` | Addendum | Extensión temporal firmada |
| `CANCELADO` | Cancelado | Terminación anticipada |
| `DESOCUPADO` | Desocupado | Contrato terminado, local disponible |

### 21.5 Catálogo de Tipos de Contrato
**Contratos de Inmueble:**
- Arrendamiento estándar (anual)
- Arrendamiento temporal (mensual)
- Comodato
- Addendum de extensión (1-6 meses)
- Cesión de derechos

**Contratos de Personal:**
- Eventual (3 meses — prueba)
- Indefinido (definitivo)
- Por obra determinada
- Por temporada
- Honorarios (persona física)

---

## 22. HISTORIA COMPLETA DE CONTRATOS E INMUEBLES

### 22.1 Línea de Tiempo por Inmueble

Cada local tiene una **línea de tiempo completa e inmutable**:

```
LOCAL L-12 — Historial
────────────────────────────────────────────────────────
2020-01  DISPONIBLE    Local desocupado
2020-03  CONTRATO      Juan Pérez García — Zapatería El Paso
             Contrato #001 | $8,500/mes | 2 años
             Aval: María Pérez | Pagarés: 24 generados
2020-03  PAGO          Pago #1 — $8,500 | Comprobante: CFD-001.xml
  ...        (historial mensual de pagos)
2021-01  ADDENDUM      Extensión 2 meses por remodelación
             Addendum #001 | 2022-01-01 a 2022-03-01
2022-03  RENOVACION    Nuevo contrato #002 | $9,800/mes | 2 años
2023-09  MORA          Pago septiembre vencido — 15 días de retraso
2024-03  CANCELACION   Terminación anticipada — Acuerdo mutuo
             Finiquito generado | Local devuelto en buenas condiciones
2024-03  DISPONIBLE    Local desocupado
2024-05  CONTRATO      Farmacia Bienestar SA de CV
             Contrato #003 | $11,200/mes | 1 año
────────────────────────────────────────────────────────
```

**Entidad: `historial_inmueble`** (log inmutable — append only)
```sql
historial_inmueble (
  id, local_id, fecha, tipo_evento,
  -- tipos: disponible | contrato_nuevo | pago | mora | addendum | 
  --        renovacion | cancelacion | mantenimiento | foto_estado
  descripcion, monto, arrendatario_id, contrato_id,
  documento_url, registrado_por, created_at
)
```

### 22.2 Historia por Arrendatario (vista inversa)

Vista del arrendatario mostrando TODOS sus contratos históricos:
```
ARRENDATARIO: Farmacia Bienestar SA de CV — RFC: FAB200301XY0
────────────────────────────────────────────────────────
Contrato #003  Local L-12   2024-05 a 2025-05  $11,200/mes  VIGENTE
  Pagos: 13/13 al corriente | Sin mora
  Pagarés: 12 emitidos | 12 vigentes
  Addendum: ninguno
  
Contrato #001  Local L-05   2021-01 a 2023-01  $7,500/mes   TERMINADO
  Pagos: 23/24 (1 en mora — abonado)
  Pagarés: 24 emitidos | 24 liquidados
────────────────────────────────────────────────────────
```

### 22.3 Addendum

**Entidad: `addendum_contratos`**
```sql
addendum_contratos (
  id, contrato_id, numero_addendum,
  motivo, descripcion,
  fecha_inicio_extension, fecha_fin_extension,
  monto_mensual_addendum,   -- puede diferir del contrato original
  pdf_url, firmado_at,
  registrado_por, created_at
)
```

Tipos de motivo: prórroga temporal | remodelación | acuerdo comercial | caso de fuerza mayor

---

## 23. PAGARÉS

### 23.1 Generación Automática de Pagarés

Al firmar un contrato de arrendamiento, el sistema genera automáticamente los pagarés correspondientes:

**Regla de negocio:**
- 1 pagaré por mes de contrato (contrato 12 meses = 12 pagarés)
- O bien, pagarés por monto total dividido en parcialidades (configurable)
- El pagaré tiene valor legal como garantía de pago

**Datos del pagaré (auto-poblados desde el contrato):**
```sql
pagares (
  id, contrato_id, arrendatario_id, local_ids[],
  numero_pagare, serie,          -- Ej: "A-001", "A-002"...
  monto, fecha_vencimiento,
  -- Partes
  suscriptor_nombre, suscriptor_domicilio, suscriptor_rfc,
  beneficiario_nombre,           -- La plaza / empresa arrendadora
  lugar_pago,
  -- Estado
  estatus (vigente|pagado|vencido|cancelado),
  fecha_pago_real, comprobante_pago_url,
  -- Documento
  pdf_url, generado_at
)
```

**PDF del pagaré:**
- Formato legal mexicano (Artículo 170 LGTOC)
- Generado automáticamente con datos del contrato
- Firmado presencialmente (fase 1) / digital Mifiel (fase 2)
- Se almacena en Supabase Storage ligado al expediente

### 23.2 Control de Pagarés

Panel de pagarés con:
- Lista de todos los pagarés por contrato / arrendatario
- Estatus visual: vigente (azul) | pagado (verde) | vencido (rojo)
- Al registrar pago mensual → se marca pagaré como pagado automáticamente
- Exportar todos los pagarés de un contrato como PDF individual o por lotes

---

## 24. RECIBOS Y FACTURAS DE ARRENDAMIENTO

### 24.1 Emisión de Comprobantes de Pago

Al registrar un pago de renta, el sistema maneja dos modalidades:

**Recibo Provisional (no fiscal):**
- Generado automáticamente por el sistema
- Datos: arrendatario, local, período, monto, fecha
- Envío automático por email + WhatsApp
- Se sustituye por factura cuando se emite CFDI

**Factura CFDI (adjunto):**
- El arrendador emite la factura en su sistema de facturación (Aspel, CONTPAQi, etc.)
- Sube el XML + PDF a PlazaAdmin
- El sistema extrae del XML:
  - UUID del CFDI
  - RFC emisor y receptor
  - Monto total, subtotal, IVA
  - Fecha de emisión
  - Concepto
- Queda ligado al pago del período correspondiente

```sql
comprobantes_pago (
  id, pago_id, tipo (recibo_provisional|cfdi),
  -- Si es CFDI
  uuid_cfdi, rfc_emisor, rfc_receptor,
  monto_subtotal, monto_iva, monto_total,
  fecha_emision, concepto,
  pdf_url, xml_url,
  -- Control
  registrado_por, created_at
)
```

### 24.2 Conciliación Pago ↔ CFDI ↔ Banco

Cada pago queda triple conciliado:
1. ✅ **Pago registrado** (manual o automático)
2. ✅ **CFDI emitido** (XML subido y parseado)
3. ✅ **Movimiento bancario** (extracto importado)

Dashboard de conciliación muestra los 3 estatus de forma visual.

---

## 25. GALERÍA DE FOTOS Y MANTENIMIENTO DE INMUEBLES

### 25.1 Galería de Fotos por Inmueble

Cada local tiene una galería cronológica de fotos:

```sql
fotos_inmueble (
  id, local_id, 
  tipo (estado_inicial|estado_actual|pre_mantenimiento|
        post_mantenimiento|entrega_arrendatario|devolucion),
  url, thumbnail_url,
  descripcion, fecha_foto,
  mantenimiento_id,   -- null si no es de mantenimiento
  subido_por, created_at
)
```

**Vista "Línea de tiempo visual"**: carrusel de fotos ordenadas por fecha, con etiqueta del tipo y descripción. El cliente puede ver cómo evolucionó el local desde 2020 hasta hoy.

### 25.2 Historial de Mantenimientos por Inmueble

```sql
mantenimientos (
  id, local_id, empresa_id,
  tipo (preventivo|correctivo|mejora|emergencia),
  descripcion, fecha_inicio, fecha_fin,
  -- Costo
  monto_presupuesto, monto_real,
  proveedor_id,
  -- Documentos y fotos
  cotizacion_url, factura_url,
  -- Fotos antes y después
  fotos_antes_ids[], fotos_despues_ids[],
  -- Control
  estatus (solicitado|aprobado|en_proceso|terminado|cancelado),
  aprobado_por, registrado_por, created_at
)
```

**Gasto de mantenimiento → automáticamente se registra en Módulo C (Gastos) con categoría "Mantenimiento" y ligado al local.**

### 25.3 Rentabilidad por Inmueble

Con toda la información integrada, el sistema calcula por local:

```
LOCAL L-12 — Estado de Rentabilidad
─────────────────────────────────────
INGRESOS ACUMULADOS (2024)
  Rentas cobradas:          $134,400
  
GASTOS ASOCIADOS (2024)
  Mantenimiento correctivo:  -$8,500  (vidrio roto, pintura)
  Mantenimiento preventivo:  -$2,200  (limpieza ductos)
─────────────────────────────────────
UTILIDAD NETA DEL LOCAL:   $123,700
RENTABILIDAD:               92.0%
DÍAS DESOCUPADO (2024):     12 días
ÍNDICE OCUPACIÓN:           96.7%
─────────────────────────────────────
```

---

## 26. MÓDULO DE ASISTENCIA DE PERSONAL

### 26.1 Captura de Asistencia

**Modalidad A — Importación desde reloj checador:**
- Formatos soportados: CSV, XLSX, TXT (formatos comunes Sisco, ZKTeco, Checador Digital)
- Mapeo de columnas configurable por tenant
- Importación masiva con validación: empleado existe, fecha válida, horario coherente

**Modalidad B — Captura manual:**
- Vista de lista de empleados por día
- Operador marca: Presente | Falta | Retardo | Incapacidad | Vacaciones | Permiso

```sql
asistencias (
  id, empleado_id, empresa_id,
  fecha, hora_entrada, hora_salida,
  tipo (presente|falta|retardo|incapacidad|vacaciones|
        permiso_con_goce|permiso_sin_goce|dia_festivo),
  minutos_retardo, horas_trabajadas,
  fuente (reloj_checador|captura_manual|importacion),
  notas, registrado_por, created_at
)
```

### 26.2 KPIs de Asistencia

- % Asistencia por empleado / área / empresa / período
- Ranking de puntualidad
- Días de ausentismo acumulado
- Alertas: empleado con >3 faltas en el mes
- Calendario visual de asistencia por empleado

### 26.3 Vacaciones y Días de Descanso

```sql
vacaciones_empleado (
  id, empleado_id,
  año, dias_correspondientes,  -- según ley: 12 días año 1, 14 año 2...
  dias_tomados, dias_pendientes,
  periodos_gozados (JSON array de {inicio, fin, dias})
)
```

Alerta automática cuando empleado tiene vacaciones pendientes >1 año (riesgo legal).

---

## 27. PRÉSTAMOS A TRABAJADORES

```sql
prestamos_empleado (
  id, empleado_id, empresa_id,
  monto_total, fecha_otorgamiento,
  num_pagos, monto_pago_quincenal,
  tasa_interes,   -- 0% si es sin interés
  motivo,
  -- Amortización
  pagos_realizados, saldo_pendiente,
  estatus (activo|liquidado|cancelado),
  autorizado_por, created_at
)

amortizacion_prestamo (
  id, prestamo_id, num_pago,
  fecha_programada, fecha_pago_real,
  monto, estatus (pendiente|pagado|omitido)
)
```

**Integración con nómina**: el pago quincenal se descuenta automáticamente y aparece en el recibo de nómina estimado.

---

## 28. KPIs ENTERPRISE — INSPIRADO EN SAP HCM + YARDI + MRI SOFTWARE

### 28.1 KPIs de Inmuebles / Arrendamiento

| KPI | Fórmula | Frecuencia | Benchmark |
|---|---|---|---|
| **Tasa de Ocupación** | Locales rentados / Total locales × 100 | Diario | >90% |
| **Índice de Desocupación** | Días vacío / Días del período × 100 | Mensual | <5% |
| **Tiempo Promedio de Desocupación** | Avg días entre contratos por local | Mensual | <30 días |
| **Ingreso por m²** | Renta cobrada / m² rentado | Mensual | Benchmark sector |
| **Cartera Vencida** | Suma rentas no cobradas en fecha | Diario | <5% de ingresos |
| **% Morosidad** | Arrendatarios con mora / Total × 100 | Mensual | <10% |
| **Días Promedio de Retraso** | Avg días entre vencimiento y pago | Mensual | <7 días |
| **Tasa de Renovación** | Contratos renovados / Vencidos × 100 | Anual | >75% |
| **Rotación de Locales** | Cambios de arrendatario / Total locales | Anual | <15% |
| **NOI — Ingreso Neto Operativo** | Ingresos totales − Gastos operativos | Mensual | Crecimiento >5% anual |
| **OER — Ratio Gastos Operativos** | Gastos operativos / Ingresos brutos × 100 | Mensual | <35% |
| **Rentabilidad por Local** | (Renta − Gastos del local) / Renta × 100 | Mensual | >85% |

### 28.2 KPIs de Recursos Humanos (SAP HCM Style)

| KPI | Fórmula | Frecuencia | Alerta |
|---|---|---|---|
| **Headcount Activo** | Count empleados estatus=activo | Diario | — |
| **Headcount por Área** | Desglose por departamento/empresa | Mensual | — |
| **Tasa de Rotación** | Bajas período / Plantilla promedio × 100 | Mensual | >5% mensual |
| **Tasa de Retención** | 100 − Tasa de Rotación | Mensual | <95% alerta |
| **Tiempo Promedio de Contratación** | Días desde apertura vacante → contrato | Por vacante | >30 días alerta |
| **Costo de Contratación** | Gastos reclutamiento / Contrataciones | Mensual | — |
| **Costo de Nómina Estimado** | Suma sueldos activos | Mensual | — |
| **Costo Nómina / Ingresos** | Nómina estimada / Ingresos totales × 100 | Mensual | >30% alerta |
| **Antigüedad Promedio** | Avg meses desde ingreso empleados activos | Trimestral | — |
| **% por Grado de Estudio** | Distribución por nivel educativo | Trimestral | — |
| **Índice de Ausentismo** | Días falta / Días hábiles laborados × 100 | Mensual | >3% alerta |
| **Contratos por Vencer** | Count contratos vencen en 30/60/90 días | Semanal | Alerta automática |
| **Volumen de Candidatos** | Candidatos recibidos por vacante | Por vacante | — |
| **Tasa de Conversión RH** | Contratados / Candidatos totales × 100 | Mensual | — |
| **Préstamos Vigentes** | Monto total préstamos saldo pendiente | Mensual | — |
| **Vacaciones Pendientes** | Días acumulados sin gozar por empleado | Mensual | >15 días alerta |

### 28.3 KPIs Financieros Consolidados

| KPI | Descripción | Frecuencia |
|---|---|---|
| **Ingresos Totales** | Rentas + Estacionamiento + Otros | Mensual |
| **Gastos Totales** | Por categoría + nómina estimada | Mensual |
| **EBITDA Operativo** | Ingresos − Gastos (sin depreciación) | Mensual/Anual |
| **Margen Operativo %** | Utilidad / Ingresos × 100 | Mensual |
| **Crecimiento YoY** | (Ingresos año actual − año anterior) / anterior | Anual |
| **Ingreso por Estacionamiento** | Total + ticket promedio + tendencia | Mensual |
| **Gastos por Categoría** | Distribución % por tipo de gasto | Mensual |

---

## 29. TABLAS DE HECHOS ACTUALIZADAS — DATA WAREHOUSE

### Tablas de hechos con granularidad mensual (para análisis histórico):

```sql
-- HECHOS MENSUALES DE INMUEBLES
fact_ocupacion_mensual (
  año, mes, local_id, empresa_id,
  dias_ocupado, dias_disponible, dias_mantenimiento,
  estatus_cierre_mes,
  precio_renta_vigente, arrendatario_id
)

-- HECHOS MENSUALES DE PAGOS
fact_cobranza_mensual (
  año, mes, contrato_id, arrendatario_id, local_id, empresa_id,
  monto_esperado, monto_cobrado, monto_pendiente,
  dias_retraso, conciliado,
  num_pagares_vigentes, num_pagares_vencidos
)

-- HECHOS MENSUALES DE GASTOS POR INMUEBLE
fact_gastos_inmueble_mensual (
  año, mes, local_id, empresa_id, categoria_id, proveedor_id,
  monto_gasto, tipo_mantenimiento
)

-- HECHOS MENSUALES DE RENTABILIDAD POR LOCAL
fact_rentabilidad_local_mensual (
  año, mes, local_id, empresa_id,
  ingresos_renta, gastos_mantenimiento, gastos_otros,
  utilidad_neta, margen_pct,
  dias_desocupado, indice_ocupacion_pct
)

-- HECHOS MENSUALES DE HEADCOUNT RH
fact_headcount_mensual (
  año, mes, empresa_id, puesto_id, departamento,
  headcount_inicio, altas, bajas, headcount_fin,
  costo_nomina_estimado,
  tasa_rotacion_pct, indice_ausentismo_pct
)

-- HECHOS MENSUALES DE ASISTENCIA
fact_asistencia_mensual (
  año, mes, empleado_id, empresa_id,
  dias_habiles, dias_presentes, dias_falta,
  dias_retardo, dias_incapacidad, dias_vacaciones,
  horas_trabajadas_total, pct_asistencia
)

-- HECHOS MENSUALES FINANCIEROS CONSOLIDADOS
fact_financiero_mensual (
  año, mes, empresa_id,
  ingresos_rentas, ingresos_estacionamiento, otros_ingresos,
  total_ingresos,
  gastos_mantenimiento, gastos_nomina_estimada, 
  gastos_servicios, gastos_admin, total_gastos,
  utilidad_operativa, margen_operativo_pct,
  noi   -- Net Operating Income
)
```

### ETL Batch (Netlify Scheduled Function — corre el día 1 de cada mes):
1. Consolida pagos del mes cerrado → `fact_cobranza_mensual`
2. Consolida gastos por local → `fact_gastos_inmueble_mensual`
3. Calcula rentabilidad por local → `fact_rentabilidad_local_mensual`
4. Consolida headcount y movimientos RH → `fact_headcount_mensual`
5. Consolida asistencia → `fact_asistencia_mensual`
6. Consolida financiero global → `fact_financiero_mensual`
7. Actualiza todas las dimensiones (dim_tiempo, dim_local, dim_empleado, etc.)

---

## 30. FOTO DEL CANDIDATO EN EXPEDIENTE

```sql
-- Agregar a tabla candidatos:
foto_url TEXT,   -- selfie o foto formal subida por candidato
foto_verificada BOOLEAN DEFAULT FALSE  -- operador RH confirmó que coincide con INE
```

**Flujo:**
- Candidato sube foto al postular (formulario público)
- Operador RH compara foto con INE (OCR ya extrajo foto del INE)
- Marca `foto_verificada = true`
- La foto aparece en el expediente, en la ficha de entrevistador y en el contrato

---

## 31. SPRINT PLAN ACTUALIZADO — PLAZAADMIN v1.2

| Sprint | Contenido | Semana |
|---|---|---|
| 0 | Fundación: auth, layout, seed, tracking | 1 |
| 1 | Catálogos maestros + locales + precios históricos | 2 |
| 2 | Flujo prospecto → expediente → aprobación | 3 |
| 3 | Contratos de renta + pagarés automáticos | 4 |
| 4 | Pagos + CFDI + conciliación bancaria | 5 |
| 5 | Galería fotos + historial inmueble + mantenimientos | 6 |
| 6 | RH: puestos + vacantes + candidatos + entrevistas | 7 |
| 7 | RH: contratos personal + IMSS + bajas + préstamos | 8 |
| 8 | Asistencia (import checador + captura manual) | 9 |
| 9 | Finanzas: gastos + proveedores + otros ingresos | 10 |
| 10 | Integración EstacionaCloud + Estado de Resultados | 11 |
| 11 | Data Warehouse: ETL + fact tables + KPIs dashboard | 12 |
| 12 | Dashboard ejecutivo corporativo + exportaciones | 13 |
| 13 | QA completo + capacitación + entrega producción | 14 |

**Total: 14 semanas (~3.5 meses) de desarrollo**

---

*Addendum v1.2 — Investigación basada en SAP HCM, Yardi, MRI Software y estándares CRE internacionales*
*RANNIX Consulting — Roberto Aguilar Cota | Junio 2026*

---

## CORRECCIÓN v1.3 — Analytics: Google Sheets → Supabase audit_log

### Decisión arquitectónica

PlazaAdmin usa **Supabase como única fuente de verdad**. El webhook de Google Sheets era un RANNIX Standard para proyectos simples sin BD. Para un ERP enterprise como PlazaAdmin, **toda la telemetría va a Supabase**.

### Tabla audit_log (Supabase)

```sql
audit_log (
  id UUID DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  usuario_id UUID REFERENCES usuarios(id),
  -- Acción
  accion TEXT,         -- 'login' | 'crear_contrato' | 'aprobar_expediente' | etc.
  modulo TEXT,         -- 'rentas' | 'rh' | 'finanzas' | 'proveedores' | 'corporativo'
  entidad TEXT,        -- 'contrato' | 'empleado' | 'pago' | etc.
  entidad_id UUID,     -- ID del registro afectado
  descripcion TEXT,    -- descripción legible del evento
  -- Contexto técnico
  pagina TEXT,         -- ruta URL
  ip INET,
  ciudad TEXT,
  pais TEXT,
  dispositivo TEXT,    -- desktop | mobile | tablet
  navegador TEXT,
  -- Tiempo
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

RLS: cada tenant solo ve su propio audit_log.

### Tracking stack final de PlazaAdmin

| Herramienta | Propósito | Dónde |
|---|---|---|
| **Microsoft Clarity** | Grabaciones de sesión, heatmaps | Frontend (index.html) |
| **GA4** | Tráfico, fuentes, conversiones | Frontend (index.html) |
| **Supabase audit_log** | Trazabilidad de acciones por usuario/tenant | Backend (Supabase) |

**Google Sheets webhook: ELIMINADO de PlazaAdmin.**

