# CLAUDE.md — IRP (IWOL Resource Planning)
## RANNIX Consulting | v1.3.0 | 2026

---

## Identidad del Proyecto

**IRP — IWOL Resource Planning** es una plataforma SaaS multi-tenant para la administración integral de inmuebles comerciales en México (plazas comerciales, edificios de oficinas, consultorios médicos, bodegas industriales).

Desarrollado por **Roberto Aguilar Cota / RANNIX Consulting**.

---

## Stack Tecnológico

- **Frontend**: React 18 + Vite 5 + TailwindCSS 3 (con estilos inline sobre variables CSS)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage privado + RLS)
- **Deploy**: Netlify (Functions como proxy seguro para Claude API)
- **IA**: Claude API vía Netlify Functions (NUNCA expuesta en frontend)
- **Routing**: React Router DOM v6
- **State**: Zustand + React Query (`@tanstack/react-query`)
- **Forms**: React Hook Form + Zod
- **Gráficas**: Recharts · **Export**: exceljs, xlsx, docx · **Toasts**: react-hot-toast · **Iconos**: lucide-react

---

## Estructura de Archivos

```
DEv/
├── src/
│   ├── components/
│   │   ├── agents/     # AgenteOperativo.jsx, AgenteAnalitico.jsx
│   │   ├── layout/     # Header.jsx, Sidebar.jsx, Footer.jsx
│   │   ├── ui/         # KPICard, StatusBadge, LoadingSpinner, EmptyState,
│   │   │               # NuevoContratoModal, ElaborarContratoModal,
│   │   │               # ExpedienteForm, ExpedienteModal,
│   │   │               # ModalSolicitudPersona, TicketModal
│   │   └── dummy/      # DummyTable.jsx (prueba de conexión Supabase)
│   ├── context/        # AppContext.jsx (user, perfil, loading, sidebarOpen)
│   ├── hooks/          # useSupabase.js, useAuth.js, usePRP.js, useAudit.js
│   ├── lib/            # supabase.js (+ urlFirmada), auth.js, claude.js
│   ├── pages/          # 32 páginas (ver tabla de módulos)
│   └── styles/         # theme.css (variables CSS completas)
├── netlify/functions/  # 12 funciones serverless
├── migrations/         # 001–035 (SQL numerado, serie histórica)
├── supabase/migrations/# migraciones con timestamp (CLI Supabase)
├── sql/, scripts/      # utilidades y consultas de apoyo
├── public/
├── .env.local          # Solo variables VITE_* (seguras para frontend)
├── netlify.toml
├── tailwind.config.js
└── vite.config.js
```

---

## Variables de Entorno

### GRUPO A — `.env.local` (VITE_ prefix, seguras para frontend)
```
VITE_SUPABASE_URL=https://kusuoxwzdxfuybvyiakg.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_APP_TITLE=IRP — Inmueble Resource Planning
VITE_APP_URL=https://irpapp.netlify.app
VITE_PARKING_URL=<url del proyecto Supabase del sistema de tickets>
VITE_PARKING_ANON_KEY=<anon_key del sistema de tickets>
```

### GRUPO B — Netlify Environment Variables ÚNICAMENTE (NUNCA en frontend)
```
ANTHROPIC_API_KEY=<claude_api_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
GOOGLE_CLIENT_ID=<google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<google_oauth_client_secret>
```

⚠️ **REGLA ABSOLUTA**: ANTHROPIC_API_KEY y SUPABASE_SERVICE_ROLE_KEY NUNCA van en variables VITE_ ni en .env.local ni en el frontend bajo ninguna circunstancia.

---

## Paleta de Colores RANNIX Standard

```css
--color-primary: #0A66C2        /* Azul corporativo */
--color-primary-dark: #1A3C5E   /* Azul oscuro / footer */
--color-secondary: #E8A020      /* Dorado acento */
--color-success: #057642        /* Verde */
--color-warning: #F59E0B        /* Ámbar */
--color-danger: #B24020         /* Rojo */
```

---

## Base de Datos — Supabase

**Proyecto principal**: `kusuoxwzdxfuybvyiakg`

**Proyecto secundario**: sistema de tickets de estacionamiento — cliente `supabaseParking` en `src/lib/supabase.js` (lectura, sin sesión persistida). Alimenta EDR con Estacionamiento / Pensiones / Vending.

### Convención de acceso: vistas `prp_*`
El frontend **lee siempre desde vistas `prp_*`**, nunca de las tablas base. Las escrituras sí van a la tabla base correspondiente (p. ej. actualizar `foto_url` va a `rh_empleados`, no a `prp_empleados`).

Vistas en uso: `prp_contratos`, `prp_empleados`, `prp_unidades`, `prp_inmuebles`, `prp_cartera`, `prp_cobros`, `prp_gastos`, `prp_ingresos`, `prp_incidencias`, `prp_asistencia`, `prp_prenomina`, `prp_vacantes`, `prp_bitacora`, `prp_proveedores`, `prp_movimientos_bancarios`, `prp_estacionamiento`, `prp_estacionamiento_mensual`, `prp_pensiones_estacionamiento`, `prp_vending_semanas`, `prp_fondos_revolventes`, `prp_fondo_semana`, `prp_fondo_revolvente_cierres`, `prp_mapa_locales`, `prp_notas_contrato`, `prp_expediente_arrendatario`, `prp_checadas`, `prp_asistencia_semana`, `prp_tipos_incidencia`, `prp_vacaciones_anio`, `prp_vacaciones_detalle`, `prp_historico_sueldos`.

### Tablas principales
- **Inmobiliario**: `cat_locales`, `contratos`, `contratos_locales`, `arrendatarios`
- **Cobranza**: `cargos_programados`, `comprobantes_pago`, `aplicaciones_pago`, `movimientos_banco`
- **Financiero**: `ingresos`, `gastos_operativos`, `gasto_detalle`, `er_mensual`
- **Operación**: `ordenes_trabajo`, `cat_proveedores`, `cat_productos`
- **Estacionamiento**: `estacionamiento_diario`, `estacionamiento_pensiones`
- **Vending**: `vending_productos`, `vending_semanas`
- **RH**: `rh_empleados`, `rh_incidencias`, `rh_historial_sueldo`, `rh_historial_nombre`, `rh_historial_cambios`, `rh_expediente_documentos`, `rh_beneficios`, `rh_capacitacion`, `rh_evaluaciones`, `rh_asistencia`, `rh_checadas`, `rh_tipos_incidencia`, `rh_vacaciones_anio`, `rh_vacaciones_detalle`
- **Validación**: `validacion_puntos`, `validacion_revisiones`, `validacion_reportes`, `validacion_adjuntos`
- **Catálogos / DW**: `cat_estado_general`, `dw.dim_tiempo_dia`, `dw.dim_tiempo_mes`, `dw.dim_tiempo_anio`

### Storage

Estado del cierre de buckets (etapa 2 de `20260829120000_storage_privado_urls_firmadas.sql`):

| Bucket | `public` | Políticas RLS |
|---|---|---|
| `contratos-firmados` | **false** | authenticated |
| `prospecto-docs` | **false** | authenticated + insert anónimo acotado a `prospectos/` |
| `facturas-cfdi` | **false** | authenticated |
| `tickets-gastos` | **false** | authenticated |
| `vending-reportes` | **false** | authenticated |
| `comprobantes-pago` | **false** | authenticated (arrendatario solo su carpeta) |
| `expedientes-docs` | **false** | authenticated (`20260907100000`) |
| `validacion-capturas` | **false** | authenticated (`20260910400000`) |
| `avatars` | **true a propósito** | lectura pública — fotos de empleados |

**Regla de lectura**: salvo `avatars`, ningún archivo se pinta con su URL directa. Se usa
`src/components/ui/ArchivoPrivado.jsx` — `<ImagenPrivada>`, `<EnlacePrivado>` y el hook
`useUrlFirmada` — que firman con `urlFirmada()` de `src/lib/supabase.js`. `EnlacePrivado`
firma al hacer clic, no al pintar, para no gastar una firma por fila de tabla. El portal de
prospectos, que es anónimo, obtiene su URL desde la function `portal-prospecto`.

**Escrituras**: todavía guardan la URL pública completa en las columnas `*_url`. No hace
falta migrarlas: `urlFirmada()` detecta ese formato y extrae la ruta. Guardar la ruta es
preferible para filas nuevas, pero ambas funcionan.

**Cierre**: `20260908200000_storage_cerrar_buckets_publicos.sql` pone `public = false` en los
cinco buckets que quedaban abiertos. Es reversible: si algo deja de verse, se vuelve a poner
`public = true` en el bucket afectado.

### Migraciones — dos carriles
- `migrations/NNN_*.sql` — numeradas, serie histórica del proyecto (hasta `035_fix_avatars_policy.sql`)
- `supabase/migrations/<timestamp>_*.sql` — carril del CLI de Supabase, el usado para lo reciente

### Asistencia — modelo de eventos

`rh_checadas` guarda **cada marcaje** del biométrico (`operacion` ENTRADA/SALIDA + `fecha_hora`).
Un trigger consolida el día en `rh_asistencia` (primera entrada, última salida, retardo contra
el horario del empleado). Se escribe en `rh_checadas`, nunca en `rh_asistencia` directamente.
`prp_asistencia_semana` da un renglón por empleado y día (`dia_semana`: 1=lunes … 7=domingo)
y es la que alimenta la columna de asistencia del reporte semanal de nómina.

### RLS
Habilitado en todas las tablas. Tras cambiar políticas de Storage se recarga el esquema con `notify pgrst` (ver `20260820910000_notify_pgrst_reload.sql`).

---

## Módulos IRP — 31 rutas en producción

Registradas en `src/App.jsx`.

| Ruta | Módulo | Página |
|---|---|---|
| `/` | Dashboard + KPIs | `Dashboard.jsx` |
| `/inmuebles` | Inmuebles y Unidades | `Inmuebles.jsx` |
| `/mapa-locales` | Mapa visual de locales | `MapaLocales.jsx` |
| `/contratos` | Contratos de Arrendamiento | `Contratos.jsx` |
| `/renovaciones` | Renovaciones de contrato | `Renovaciones.jsx` |
| `/arrendatarios` | Arrendatarios | `Arrendatarios.jsx` |
| `/cobranza` | Cobranza | `Cobranza.jsx` |
| `/conciliacion` | Conciliación bancaria | `Conciliacion.jsx` |
| `/ingresos` | Ingresos | `Ingresos.jsx` |
| `/gastos-operativos` | Gastos operativos | `GastosOperativos.jsx` |
| `/fondo-revolvente` | Fondo revolvente | `FondoRevolvente.jsx` |
| `/utilidades` | Utilidades | `Utilidades.jsx` |
| `/edr` | Estado de Resultados mensual | `EDR.jsx` |
| `/resumen-semanal` | Resumen semanal | `ResumenSemanal.jsx` |
| `/reportes` | Reportes y BI | `Reportes.jsx` |
| `/mantenimiento` | Mantenimiento y OT | `Mantenimiento.jsx` |
| `/proyectos` | Proyectos y Obras | `Proyectos.jsx` |
| `/proveedores` | Proveedores | `Proveedores.jsx` |
| `/bitacora` | Bitácora | `Bitacora.jsx` |
| `/agua` | Consumo de agua | `Agua.jsx` |
| `/estacionamiento` | Estacionamiento y pensiones | `Estacionamiento.jsx` |
| `/vending` | Vending | `Vending.jsx` |
| `/despachos` | Despachos | `Despachos.jsx` |
| `/restaurante/gastos` | Gastos de restaurante | `RestauranteGastos.jsx` |
| `/rh` | RH y Nómina | `RH.jsx` |
| `/rh/empleado/:id` | Expediente Digital de Empleado | `ExpedienteEmpleado.jsx` |
| `/prospectos` | Prospectos y CRM | `Prospectos.jsx` |
| `/validacion` | Validación del Sistema | `Validacion.jsx` |
| `/config` | Configuración | `Configuracion.jsx` |
| `/portal/prospecto/:token` | Portal público de prospecto | `PortalProspecto.jsx` |
| `/portal/arrendatario` | Portal de arrendatario | `PortalArrendatario.jsx` |
| — | Login | `Login.jsx` |

---

## Roles y shells de aplicación

`AppLayout` en `src/App.jsx` decide qué aplicación ve cada usuario según `perfil.rol_id`:

1. **Rutas `/portal/*`** — públicas, sin layout admin (prospecto y arrendatario)
2. **`arrendatario` / `prospecto` logueado** (`ROLES_PORTAL`) — solo `PortalArrendatario embedded`, nunca el admin
3. **`restaurante`** — shell admin recortado: únicamente `/restaurante/gastos`
4. **Resto (staff)** — layout admin completo con las 28 rutas internas

---

## Netlify Functions (12)

| Function | Propósito |
|---|---|
| `chat-operativo.js` | Agente Operativo conversacional |
| `chat-analitico.js` | Agente Analítico BI/DW |
| `extraer-documento.js` | Extracción de datos de documentos con Claude |
| `gastos-ocr.js` | OCR de tickets de gastos |
| `vending-ocr.js` | OCR de reportes de vending |
| `generar-contrato.js` | Generación de contrato |
| `generar-documentos.js` | Generación de documentos (docx) |
| `generar-sanciones.js` | Cálculo/generación de sanciones |
| `crear-acceso-inquilino.js` | Alta de acceso al portal de arrendatario |
| `portal-prospecto.js` | Backend anónimo del portal de prospectos (firma URLs) |
| `subir-comprobante.js` | Carga de comprobantes de pago (exige JWT de sesión activa) |
| `admin-ajuste-vending.js` | Ajustes administrativos de vending |

Todas usan `claude-sonnet-4-6`; `max_tokens` va de 800 a 4096 según la función.

---

## Agentes IA

### AgenteOperativo (chat flotante)
- Componente: `src/components/agents/AgenteOperativo.jsx`
- Function: `netlify/functions/chat-operativo.js`
- Modelo: `claude-sonnet-4-6`, max_tokens: 1024
- Posición: botón circular fijo bottom-right, panel deslizante 380x520px

### AgenteAnalitico (barra de búsqueda BI)
- Componente: `src/components/agents/AgenteAnalitico.jsx`
- Function: `netlify/functions/chat-analitico.js`
- Modelo: `claude-sonnet-4-6`, max_tokens: 800
- Formato de respuesta: DATO + INTERPRETACION + RECOMENDACION

---

## Autenticación

- **Usuarios internos**: Email + contraseña (vía Supabase Auth)
- **Google OAuth**: `signInWithGoogle()` en `src/lib/auth.js`
- **Usuarios externos**: Magic Link / token de portal (arrendatarios, prospectos)
- **Sesión persistida**: `persistSession: true` en el cliente principal; `false` en `supabaseParking`

---

## Comandos de Desarrollo

```bash
npm run dev        # Servidor local en http://localhost:5173
npm run build      # Build de producción en /dist
npm run preview    # Vista previa del build
```

---

## Deploy

- **URL producción**: https://irpapp.netlify.app
- **GitHub**: https://github.com/RANNIX-Claude/irpapp
- **Ramas**: `master` (producción), `develop`, `demo`
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`
- **Node version**: 20
- **SPA redirect**: `/*` → `/index.html` (200)

---

## Cumplimiento SAT

- CFDI 4.0 con Complemento de Pago (REP)
- Validación RFC con regex oficial SAT
- Retención ISR 10% / IVA 16% automática
- Cancelación CFDI siguiendo cat_motivo_cancelacion SAT
- Regímenes fiscales: 612, 626, 601, 603, 605, 621

---

## Reglas de Negocio Absolutas

1. Un inmueble puede tener múltiples unidades; una unidad pertenece a un solo inmueble
2. Un contrato activo por unidad; al renovar se crea nuevo contrato con período de gracia
3. Cobranza se genera automáticamente día 1 de cada mes
4. Factura CFDI se emite únicamente cuando el pago está conciliado en banco
5. Depósito en garantía = 2 meses de renta (configurable por contrato)
6. Penalización morosidad = 5% mensual (configurable)
7. Contrato mínimo 1 año; opción renovación anticipada 60 días antes

---

## Convenciones de Código

- **Leer por vista, escribir por tabla**: consultas desde `prp_*`, mutaciones a la tabla base
- **Storage siempre firmado**: `urlFirmada()`, nunca `getPublicUrl()`
- **Commits en español** con prefijo tipo + módulo: `feat(rh):`, `fix(storage):`, `chore:`
- **Estilos**: variables CSS de `theme.css` mediante `style={{ ... }}` inline; Tailwind disponible pero no dominante
- **Claves secretas**: jamás en `VITE_*`; toda llamada a Claude pasa por Netlify Functions

---

*Generado automáticamente por Claude Code — RANNIX Consulting 2026*
