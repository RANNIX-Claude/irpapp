# CLAUDE.md — IRP (Inmueble Resource Planning)
## RANNIX Consulting | v1.0 | 2026

---

## Identidad del Proyecto

**IRP — Inmueble Resource Planning** es una plataforma SaaS multi-tenant para la administración integral de inmuebles comerciales en México (plazas comerciales, edificios de oficinas, consultorios médicos, bodegas industriales).

Desarrollado por **Roberto Aguilar Cota / RANNIX Consulting**.

---

## Stack Tecnológico

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Deploy**: Netlify (Functions como proxy seguro para Claude API)
- **IA**: Claude API vía Netlify Functions (NUNCA expuesta en frontend)
- **Routing**: React Router DOM v6
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod

---

## Estructura de Archivos

```
DEv/
├── src/
│   ├── components/
│   │   ├── agents/     # AgenteOperativo.jsx, AgenteAnalitico.jsx
│   │   ├── layout/     # Header.jsx, Sidebar.jsx, Footer.jsx
│   │   ├── ui/         # KPICard, StatusBadge, LoadingSpinner, EmptyState
│   │   └── dummy/      # DummyTable.jsx (prueba de conexión Supabase)
│   ├── context/        # AppContext.jsx (user, loading, sidebarOpen)
│   ├── hooks/          # useSupabase.js, useAuth.js
│   ├── lib/            # supabase.js, auth.js, claude.js
│   ├── pages/          # Dashboard.jsx, Login.jsx, ComingSoon.jsx
│   └── styles/         # theme.css (variables CSS completas)
├── netlify/functions/
│   ├── chat-operativo.js    # Agente Operativo (conversacional)
│   └── chat-analitico.js    # Agente Analítico (BI/DW)
├── public/
│   └── favicon.svg
├── .env.local              # Solo variables VITE_* (seguras para frontend)
├── netlify.toml
├── tailwind.config.js
└── vite.config.js
```

---

## Variables de Entorno

### GRUPO A — `.env.local` (VITE_ prefix, seguras para frontend)
```
VITE_SUPABASE_URL=https://lrcoagjswpequmuaaxep.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_APP_TITLE=IRP — Inmueble Resource Planning
VITE_APP_URL=https://juriscontrol02.netlify.app
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

**Proyecto**: `ywashdlhkbvleigakjus`

### Tablas Principales
- `public.cat_estado_general` — Catálogo de estados (VIGENTE, DISPONIBLE, VENCIDO, EN_MORA, PENDIENTE, COMPLETADO, CANCELADO, EN_PROCESO, MANTENIMIENTO, ACTIVO, INACTIVO)
- `public.dummy` — Tabla de prueba para verificar conexión Supabase + Realtime

### Data Warehouse
- `dw.dim_tiempo_dia` — Dimensión días 2020-2030
- `dw.dim_tiempo_mes` — Dimensión meses 2020-2030
- `dw.dim_tiempo_anio` — Dimensión años 2020-2030

### RLS (Row Level Security)
- Todas las tablas tienen RLS habilitado
- `dummy`: autenticados pueden SELECT/INSERT/UPDATE/DELETE
- `cat_estado_general`: autenticados pueden SELECT

---

## Módulos IRP (15 en total)

| # | Ruta | Módulo | Estado |
|---|------|--------|--------|
| 0 | `/` | Dashboard + KPIs | ✅ Implementado |
| 1 | `/inmuebles` | Inmuebles y Unidades | 🔄 Sprint 2 |
| 2 | `/contratos` | Contratos de Arrendamiento | 🔄 Sprint 2 |
| 3 | `/cobranza` | Cobranza y Conciliación | 🔄 Sprint 3 |
| 4 | `/arrendatarios` | Arrendatarios | 🔄 Sprint 3 |
| 5 | `/mantenimiento` | Mantenimiento y OT | 🔄 Sprint 4 |
| 6 | `/proyectos` | Proyectos y Obras | 🔄 Sprint 4 |
| 7 | `/proveedores` | Proveedores | 🔄 Sprint 5 |
| 8 | `/rh` | RH y Nómina | 🔄 Sprint 5 |
| 9 | `/estacionamiento` | Estacionamiento | 🔄 Sprint 6 |
| 10 | `/prospectos` | Prospectos y CRM | 🔄 Sprint 6 |
| 11 | `/reportes` | Reportes y BI | 🔄 Sprint 7 |
| 12 | `/config` | Configuración | 🔄 Sprint 7 |

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
- **Usuarios externos**: Magic Link (arrendatarios, prospectos)
- **Sesión persistida**: `persistSession: true` en Supabase client

---

## Comandos de Desarrollo

```bash
npm run dev        # Servidor local en http://localhost:5173
npm run build      # Build de producción en /dist
npm run preview    # Vista previa del build
```

---

## Deploy

- **URL producción**: https://juriscontrol02.netlify.app
- **GitHub**: https://github.com/NapoNapo67/JurisControl
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`
- **Node version**: 20

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

*Generado automáticamente por Claude Code — RANNIX Consulting 2026*
