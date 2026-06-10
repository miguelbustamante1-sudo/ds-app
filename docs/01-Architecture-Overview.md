# 01 — Arquitectura General del Proyecto (ds-app)

## ¿Qué es ds-app?

`ds-app` es una aplicación web **Full-Stack monorepo** desarrollada para TELUS Digital Digital Services. Gestiona información de equipos de trabajo (Team Members), asignaciones a proyectos, tiempo libre (Time Off), endosos de contratación y notificaciones internas.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Runtime** | Node.js | ≥ 18.x |
| **Framework Backend** | Express | v5.x |
| **ORM / DB Access** | Prisma + pg (legacy) | v7.x |
| **Base de Datos** | PostgreSQL | 16 |
| **Lenguaje** | TypeScript | v5.x |
| **Framework Frontend** | React + Vite | v18+ |
| **Estilos** | Tailwind CSS + shadcn/ui | - |
| **Documentación API** | Swagger UI (OpenAPI 3.0) | - |
| **Containerización** | Docker / Rancher Desktop | - |

---

## Estructura de Carpetas

```
ds-app/
├── src/                    # Backend (Node.js / Express)
│   ├── index.ts            # Entry point: Express app, middleware, cron jobs
│   ├── db/                 # Queries de base de datos (pg pool legacy)
│   ├── middleware/         # Auth middleware (JWT, OneLogin, IAP)
│   ├── routes/             # Definición de rutas REST por dominio
│   ├── services/           # Lógica de negocio organizada por dominio
│   └── swagger.ts          # Definición de la spec OpenAPI
│
├── client/                 # Frontend (React + Vite)
│   └── src/
│       ├── App.tsx          # Root component, providers
│       ├── auth/            # Contexto de autenticación y guards
│       ├── components/      # Componentes reutilizables (layouts, UI, charts)
│       ├── hooks/           # Custom hooks (lógica de negocio reutilizable)
│       ├── pages/           # Páginas por dominio de negocio
│       ├── routing/         # React Router + rutas protegidas
│       ├── services/        # Clientes HTTP hacia la API backend
│       └── lib/             # Utilidades y cliente HTTP base (api.ts)
│
├── shared/                 # Código compartido Frontend ↔ Backend
│   ├── dto/                # Data Transfer Objects (contratos de API)
│   └── types/              # Tipos TypeScript comunes
│
├── prisma/
│   └── schema.prisma       # Esquema de base de datos (fuente de verdad)
│
├── scripts/
│   ├── setup-local-db.sh   # Script de setup local completo
│   ├── seed.sql            # Datos iniciales para desarrollo
│   └── init-schemas.sql    # Creación de schemas PG (ds, sec, com, es)
│
├── docs/                   # ← Esta documentación
├── docker-compose.local.yml
├── Dockerfile.local
└── .env.local
```

---

## Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose (Local)                    │
│                                                             │
│  ┌──────────────────────┐    ┌───────────────────────────┐  │
│  │     ds_app_local     │    │    ds_app_local_db        │  │
│  │  (Node.js + React)   │───▶│    (PostgreSQL 16)        │  │
│  │  Port: 3000→8080     │    │    Port: 5433→5432        │  │
│  └──────────────────────┘    └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

En **producción** (Google Cloud):
- La app corre en **Cloud Run**
- La DB es **Cloud SQL** (PostgreSQL)
- La autenticación usa **Google IAP** (Identity-Aware Proxy) + **OneLogin SSO**
- El frontend se sirve como archivos estáticos desde el mismo servidor Express (SPA)

---

## Flujo de una Request HTTP

```
Browser
  │
  │ GET /api/team-members
  │
  ▼
Express (index.ts)
  │
  ├── cors() → valida origen
  ├── express.json() → parsea body
  ├── cookieParser() → parsea cookies
  │
  ▼
authMiddleware (middleware/auth.ts)
  │
  ├── ¿IAP Token? → iapJwtService.validateIapJwt()
  ├── ¿Dev JWT (local)?→ jwt.verify() con JWT_SECRET
  ├── ¿OneLogin Token? → oneloginService.validateToken()
  └── ¿Google OIDC? → googleOidcService.validateIdToken()
       │
       ▼
  enrichWithDsFields() → adjunta dsUserId + teamMemberId a req.user
       │
       ▼
requirePermission('TeamMembers', 'read')
  │
  └── can(req.user.permissions, resource, action) → 403 si falla
       │
       ▼
Route Handler (routes/teamMembers.ts)
  │
  ├── Validación básica de parámetros (manual / ad-hoc)
  ├── Llamada a DB (Prisma o pg pool legacy)
  └── Respuesta JSON con DTO tipado
```

---

## Schemas de Base de Datos

La base de datos usa **4 schemas de PostgreSQL** para separar responsabilidades:

| Schema | Propósito | Tablas principales |
|---|---|---|
| `ds` | Datos de negocio (Digital Services) | team_members, projects, time_off, endorsements, holidays... |
| `sec` | Seguridad / RBAC | auth_users, roles, permissions, revoked_tokens |
| `com` | Comunicaciones | notifications, recipients, categories |
| `es` | External Services / Workday | workday_info |

---

## Comunicación Frontend ↔ Backend

- El frontend (React) hace llamadas HTTP a `/api/*` usando el cliente base `client/src/lib/api.ts`
- Las peticiones incluyen automáticamente las **cookies HTTP-only** (`access_token`) que contienen el JWT
- Las **respuestas** siguen el esquema de los DTOs definidos en `shared/dto/`
- En producción, el servidor Express sirve los archivos estáticos del build de Vite desde `/app/public`

---

## Módulos de Negocio (Dominios)

| Módulo | Descripción |
|---|---|
| **Team Members** | CRUD de miembros del equipo, perfiles, jerarquía de supervisores |
| **Time Off** | Gestión de ausencias, categorías por país, cálculo de días |
| **Project Assignments** | Asignación de miembros a proyectos con porcentaje de allocation |
| **Endorsements** | Proceso de endoso/aprobación para nuevas contrataciones |
| **Hiring** | Gestión del proceso de contratación post-endoso |
| **Notifications** | Sistema de notificaciones internas con categorías y destinatarios |
| **Holiday Swaps** | Cambio de días festivos por días laborables |
| **Bench** | Gestión de recursos sin proyecto asignado (bench) |
| **Reports** | Reportes dinámicos con SQL almacenado en BD + parámetros configurables |
| **Security (RBAC)** | Roles, permisos y administración de acceso |
