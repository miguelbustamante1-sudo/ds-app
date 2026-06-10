# 03 — Lógica del Frontend (React + Vite)

## Estructura de Carpetas del Cliente

```
client/src/
├── App.tsx                  # Root: providers, router, layout
├── main.tsx                 # Entry point de Vite (monta React en DOM)
│
├── auth/                    # Sistema de autenticación frontend
│   ├── AuthContext.tsx       # Context con el usuario autenticado actual
│   ├── ProtectedRoute.tsx    # HOC que redirige a /login si no autenticado
│   └── useAuth.ts           # Hook para consumir el AuthContext
│
├── routing/                 # Definición centralizada de rutas
│   ├── routes.tsx           # Array de objetos de ruta (path, component, permission)
│   └── AppRouter.tsx        # React Router v6 con rutas protegidas
│
├── pages/                   # Vistas principales por dominio
│   ├── TeamMembers/
│   ├── TimeOff/
│   ├── Projects/
│   ├── Endorsements/
│   ├── Hiring/
│   ├── Notifications/
│   ├── Reports/
│   ├── Security/
│   └── Login.tsx
│
├── components/              # Componentes reutilizables
│   ├── ui/                  # shadcn/ui components base (Button, Dialog, Table...)
│   ├── layout/              # Sidebar, Header, PageWrapper
│   ├── charts/              # Gráficas (recharts/tremor)
│   └── shared/              # Componentes de dominio reutilizables (FilterBar, etc.)
│
├── hooks/                   # Custom Hooks (lógica de negocio + fetching)
│   ├── useEntityList.ts     # Hook genérico para listas paginadas con filtros
│   ├── useTeamMembers.ts    # Hook específico de Team Members
│   ├── useTimeOff.ts        # Hook específico de Time Off
│   └── usePermission.ts     # Hook para verificar permisos en UI
│
├── services/                # Clientes HTTP por dominio
│   ├── teamMember.service.ts
│   ├── timeOff.service.ts
│   ├── endorsement.service.ts
│   └── ...
│
└── lib/
    ├── api.ts               # Cliente HTTP base (fetch wrapper con auth automática)
    └── utils.ts             # Helpers generales (formatDate, cn para Tailwind, etc.)
```

---

## Sistema de Autenticación Frontend

### Flujo de Login Local (Desarrollo)

```
1. Usuario va a /login
2. Ingresa email + password
3. POST /api/auth/local-login → el backend genera un JWT firmado con JWT_SECRET
4. El backend responde con Set-Cookie: access_token=<JWT>; HttpOnly; Path=/
5. El frontend redirige a /  (la cookie es enviada automáticamente en todas las requests)
6. GET /api/auth/me → el backend verifica la cookie y devuelve el usuario actual
7. AuthContext almacena el usuario en estado de React
```

### Flujo de Login en Producción (OneLogin SSO)

```
1. Usuario hace clic en "Sign in with OneLogin"
2. Redirección a OneLogin → usuario se autentica
3. OneLogin redirige de vuelta con authorization_code
4. POST /api/auth/onelogin/callback → el backend intercambia el código por tokens
5. El backend crea la cookie HttpOnly con el JWT de OneLogin
6. Redirección al dashboard
```

### ProtectedRoute

Todas las rutas privadas pasan por `ProtectedRoute`:

```typescript
// routing/ProtectedRoute.tsx
function ProtectedRoute({ requiredPermission }: { requiredPermission?: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredPermission && !can(user.permissions, requiredPermission, 'read')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

---

## Sistema de Routing

Las rutas están definidas de forma declarativa en `routing/routes.tsx`. Cada ruta especifica:
- `path` — URL
- `component` — Componente de página a renderizar
- `permission` — Recurso RBAC requerido (opcional)

```typescript
// Ejemplo de estructura de ruta
const routes = [
  {
    path: '/team-members',
    component: <TeamMembersPage />,
    permission: 'TeamMembers',  // Debe tener permiso 'read' en este recurso
  },
  {
    path: '/endorsements',
    component: <EndorsementsPage />,
    permission: 'Endorsements',
  },
  // ...
];
```

---

## Cliente HTTP Base: `lib/api.ts`

Todas las llamadas al backend pasan por este cliente. Características clave:

```typescript
// lib/api.ts — Comportamiento esperado
const api = {
  get: (url: string) => fetch(`/api${url}`, { credentials: 'include' }),
  post: (url: string, body: unknown) =>
    fetch(`/api${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ← Envía la cookie HttpOnly automáticamente
      body: JSON.stringify(body),
    }),
  // put, patch, delete...
};
```

> **`credentials: 'include'`** es crítico — sin esto, la cookie `access_token` no se envía y todas las requests fallan con 401.

---

## Capa de Servicios Frontend

Cada dominio tiene su propio archivo de servicio que encapsula las llamadas HTTP:

```typescript
// services/teamMember.service.ts
import { api } from '../lib/api';
import type { TeamMemberDTO, CreateTeamMemberDTO } from '../../../shared/dto/teamMember.dto';

export const teamMemberService = {
  getAll: (): Promise<TeamMemberDTO[]> => api.get('/team-members').then(r => r.json()),
  getById: (id: number): Promise<TeamMemberDTO> => api.get(`/team-members/${id}`).then(r => r.json()),
  create: (data: CreateTeamMemberDTO): Promise<TeamMemberDTO> =>
    api.post('/team-members', data).then(r => r.json()),
  update: (id: number, data: Partial<UpdateTeamMemberDTO>): Promise<TeamMemberDTO> =>
    api.put(`/team-members/${id}`, data).then(r => r.json()),
};
```

---

## Custom Hooks

Los hooks son la pieza central de la arquitectura frontend. Encapsulan:
- Estado de carga (`isLoading`, `error`)
- Los datos (`data`)
- Funciones de mutación (`create`, `update`, `delete`)
- Lógica de filtros y paginación

### `useEntityList` — Hook Genérico

```typescript
// hooks/useEntityList.ts
// Patrón genérico para cualquier lista paginada con filtros
function useEntityList<T>(
  fetchFn: (params: FilterParams) => Promise<PaginatedResponse<T>>,
  initialFilters?: FilterParams
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState(initialFilters ?? {});

  useEffect(() => {
    setIsLoading(true);
    fetchFn(filters)
      .then(res => setData(res.items))
      .finally(() => setIsLoading(false));
  }, [filters]);  // ← Re-fetch cuando cambian los filtros

  return { data, isLoading, filters, setFilters };
}
```

### `usePermission` — Verificación de Permisos en UI

```typescript
// hooks/usePermission.ts
function usePermission(resource: string, action: PermissionAction) {
  const { user } = useAuth();
  return can(user?.permissions ?? {}, resource, action);
}

// Uso en componente:
const canCreate = usePermission('TeamMembers', 'create');
<Button disabled={!canCreate}>Nuevo Team Member</Button>
```

---

## Estructura de una Página Típica

Siguiendo el patrón del proyecto:

```typescript
// pages/TeamMembers/TeamMembersPage.tsx
function TeamMembersPage() {
  const canWrite = usePermission('TeamMembers', 'write');

  // Hook encapsula TODO el estado y las llamadas HTTP
  const { teamMembers, isLoading, filters, setFilters, createTeamMember } = useTeamMembers();

  return (
    <PageWrapper title="Team Members">
      <FilterBar filters={filters} onChange={setFilters} />

      {isLoading ? (
        <Spinner />
      ) : (
        <TeamMembersTable data={teamMembers} />
      )}

      {canWrite && (
        <Button onClick={() => setIsCreateModalOpen(true)}>
          + New Team Member
        </Button>
      )}
    </PageWrapper>
  );
}
```

---

## Gestión de Estado Global

La app **NO usa Redux ni Zustand**. El estado se gestiona mediante:

| Mecanismo | Uso |
|---|---|
| **`AuthContext`** | Usuario autenticado actual (global) |
| **Custom Hooks** | Estado local de cada módulo (fetch + filtros + mutaciones) |
| **React Query** (si aplica) | Caché de datos (revisar `package.json` para confirmar) |
| **URL Params** | Filtros y paginación de listas (permite compartir URL con filtros) |

---

## Estilos: Tailwind + shadcn/ui

- Los componentes base (Button, Input, Dialog, Table, etc.) vienen de **shadcn/ui**, que genera código en `components/ui/` — son propios del proyecto y se pueden modificar directamente.
- Los estilos globales y variantes se controlan en `tailwind.config.js`.
- Para agregar un nuevo componente shadcn: `npx shadcn-ui@latest add <component-name>`

---

## Convenciones de Código Frontend

| Convención | Regla |
|---|---|
| **Nomenclatura de archivos** | PascalCase para componentes (`TeamMembersPage.tsx`), camelCase para hooks y servicios (`useTeamMembers.ts`) |
| **Exports** | Preferir named exports sobre default exports para mejor discoverabilidad |
| **Props** | Siempre tipar las props con una `interface Props { ... }` explícita, nunca usar `any` |
| **Efectos** | Todo `useEffect` debe tener su array de dependencias completo y correcto |
| **API calls** | Siempre en la capa `services/`, nunca directamente en componentes o páginas |
| **Permisos** | Usar `usePermission()` para condicionar botones/acciones en UI |
