# 05 — Feature: Preferencias de Usuario (Quick Links persistentes)

## Resumen

Esta feature implementa la **persistencia de los Quick Links** (favoritos) del dashboard principal.
Antes de este cambio (Phase 1), los favoritos vivían únicamente en memoria de React y se reseteaban en cada recarga de página.
Con este cambio (Phase 2), los favoritos se almacenan en la base de datos y se sincronizan automáticamente en cualquier dispositivo/sesión del usuario.

---

## Arquitectura de la Feature

```
[FavoriteCards — page.tsx]
        │
        │ useFavorites()
        ▼
[FavoritesContext]
        │
        ├── useQuery → GET /api/auth/me/preferences   (carga inicial)
        └── useMutation → PATCH /api/auth/me/preferences  (al togglear)
                │
                ▼
        [preferences.routes.ts]
                │
        ├── authMiddleware (requiere sesión activa)
                ├── TypeScript type guards (validatePreferences)
                └── prisma.authUser.update({ preferences: {...} })
                        │
                        ▼
                [sec.auth_users.preferences  (Json column, PostgreSQL)]
```

---

## Cambios en Base de Datos

### Columna añadida: `sec.auth_users.preferences`

| Campo       | Tipo   | Default | Nullable |
|-------------|--------|---------|----------|
| preferences | `Json` | `{}`    | Sí       |

**Shape del JSON almacenado:**
```json
{
  "favorites": [
    { "id": "/my-time-off",         "label": "My Time Off",     "path": "/my-time-off" },
    { "id": "/time-off-management", "label": "Time Off Review",  "path": "/time-off-management" }
  ]
}
```

La clave `favorites` es un array ordenado (orden de pin). El campo es extensible: se pueden añadir otras claves de preferencia en el futuro (ej. `theme`, `defaultView`) sin nueva migración.

### Migración requerida

Ver sección **[Deployment a Producción](#deployment-a-producción)** para el script SQL completo y el orden de operaciones correcto.

```sql
-- Resumen rápido (idempotente):
ALTER TABLE sec.auth_users
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
```

---

## Backend

### Archivo: `src/routes/preferences.routes.ts`

Router independiente con responsabilidad única (SRP): gestión de preferencias de usuario.

#### `GET /api/auth/me/preferences`

- **Auth:** `authMiddleware` (cookie `access_token` o Bearer token).
- **Respuesta:** objeto `UserPreferences` parseado desde `sec.auth_users.preferences`.
- **Fallback:** si el campo es `null` o malformado, retorna `{}` (no lanza error).

**Ejemplo de respuesta:**
```json
{
  "favorites": [
    { "id": "/my-time-off", "label": "My Time Off", "path": "/my-time-off" }
  ]
}
```

---

#### `PATCH /api/auth/me/preferences`

- **Auth:** `authMiddleware`.
- **Body:** objeto parcial validado con **TypeScript type guards nativos** (sin dependencias externas). Solo las claves enviadas se sobreescriben — shallow merge.
- **Validación:**
  - `favorites`: array máximo de 20 items.
  - Cada item: `id` (1–200 chars), `label` (1–100 chars), `path` (empieza con `/`, máx 200 chars).
- **Error 400:** payload inválido → responde con mensaje descriptivo del campo que falló.
- **Operación:** carga preferencias existentes → merge → guarda → retorna el objeto guardado.

**Ejemplo de request:**
```http
PATCH /api/auth/me/preferences
Content-Type: application/json

{
  "favorites": [
    { "id": "/my-time-off", "label": "My Time Off", "path": "/my-time-off" },
    { "id": "/bench-move",  "label": "Bench Move",  "path": "/bench-move"  }
  ]
}
```

**Ejemplo de respuesta:**
```json
{
  "favorites": [
    { "id": "/my-time-off", "label": "My Time Off", "path": "/my-time-off" },
    { "id": "/bench-move",  "label": "Bench Move",  "path": "/bench-move"  }
  ]
}
```

---

### Registro en el router: `src/routes/auth.ts`

Las rutas se montan como sub-router de `/api/auth`:

```
GET  /api/auth/me/preferences   → preferences.routes.ts
PATCH /api/auth/me/preferences  → preferences.routes.ts
```

---

## Frontend

### `client/src/contexts/favorites-context.tsx`

Context global de favoritos. Es la única fuente de verdad en el frontend.

#### Estrategia de datos

| Evento          | Acción                                                              |
|-----------------|----------------------------------------------------------------------|
| Montaje         | `useQuery` → `GET /api/auth/me/preferences`                         |
| Mientras carga  | Muestra `DEFAULT_FAVORITES` (mismos que Phase 1)                     |
| Carga exitosa   | Muestra las preferencias guardadas en DB                             |
| Toggle de pin   | Actualización optimista inmediata en cache de React Query            |
| Tras el toggle  | Debounce 500ms → `PATCH /api/auth/me/preferences`                   |
| Error de red    | `queryClient.invalidateQueries()` revierte al estado confirmado por servidor |

#### `DEFAULT_FAVORITES`

```typescript
const DEFAULT_FAVORITES: FavoriteLink[] = [
  { id: '/my-time-off',         label: 'My Time Off',     path: '/my-time-off' },
  { id: '/time-off-management', label: 'Time Off Review',  path: '/time-off-management' },
  { id: '/my-team',             label: 'Team Members',     path: '/my-team' },
  { id: '/bench-move',          label: 'Bench Move',       path: '/bench-move' },
  { id: '/holiday-swaps',       label: 'Holiday Swaps',    path: '/holiday-swaps' },
];
```

Estos defaults se muestran:
- Mientras la API carga (`isLoading: true`).
- Si el usuario nunca ha guardado preferencias (`prefs.favorites === undefined`).

> **Nota:** si el usuario desancla todos los favoritos y guarda `favorites: []`, se mostrará el empty state ("Pin shortcuts from any Hub card..."). Los defaults NO vuelven a aparecer, ya que la DB tiene `[]` guardado explícitamente.

#### API del Context (`FavoritesContextValue`)

```typescript
interface FavoritesContextValue {
  favorites: FavoriteLink[];          // Lista actual en orden de pin
  isFavorite: (path: string) => boolean;
  toggleFavorite: (link: FavoriteLink) => void;
  isLoading: boolean;                 // True mientras carga desde el servidor
}
```

#### Testabilidad

Los helpers de API están aislados como funciones puras exportables:

```typescript
// Fácilmente mockeables en tests unitarios:
async function fetchPreferences(): Promise<UserPreferences> { ... }
async function savePreferences(prefs: UserPreferences): Promise<UserPreferences> { ... }
```

---

### `client/src/pages/page.tsx` — Componente `FavoriteCards`

Reemplaza el antiguo `FavoritePills` (flex de botones pill) con un **grid responsivo de mini-cards**.

#### Layout

```
Mobile (< md):  2 columnas
Tablet (md):    3 columnas
Desktop (lg+):  4 columnas
```

#### Estados del componente

| Estado         | UI                                                      |
|----------------|---------------------------------------------------------|
| `isLoading`    | Grid de 4 skeletons animados (`animate-pulse`)          |
| `favorites[]` vacío | Mensaje "Pin shortcuts from any Hub card..."      |
| Con favoritos  | Grid de cards clicables con estrella de desanclar       |

#### Interacción

- **Click en card** → navega a `fav.path`.
- **Click en estrella** → llama a `toggleFavorite(fav)` → desancla y persiste.
- La estrella solo es visible en hover del grupo (`group-hover:opacity-100`).

---

## Seguridad

| Riesgo                   | Mitigación implementada                                        |
|--------------------------|----------------------------------------------------------------|
| Acceso no autenticado    | `authMiddleware` en ambos endpoints                            |
| Acceso a datos de otro usuario | `userId` siempre viene de `req.user.id` (del token JWT verificado), nunca del body |
| Payload malicioso        | Type guards validan tipo, longitud y formato de cada campo     |
| Exceso de favoritos      | Límite de 20 items validado en `validatePreferences()`         |
| Path traversal en `path` | `startsWith('/')` + longitud máx 200 validados en type guard   |

---

## Extensibilidad

Para añadir un nuevo tipo de preferencia (ej. `defaultView: 'list' | 'grid'`):

1. Extender `UserPreferences` y `validatePreferences()` en `preferences.routes.ts`:
   ```typescript
   export interface UserPreferences {
     favorites?: FavoriteLink[];
     defaultView?: 'list' | 'grid';   // ← nueva clave
   }

   // En validatePreferences(), añadir:
   if ('defaultView' in raw) {
     if (raw.defaultView !== 'list' && raw.defaultView !== 'grid') {
       return { valid: false, error: '"defaultView" must be "list" or "grid"' };
     }
     result.defaultView = raw.defaultView as 'list' | 'grid';
   }
   ```
2. Extender `UserPreferences` en `favorites-context.tsx` (o crear un context separado si la responsabilidad es distinta).
3. No se requiere nueva migración de BD (el campo `preferences` ya es un JSON libre).

---

## Deployment a Producción

> ⚠️ **Este es el paso más crítico del release.** La aplicación fallará con `P2022: ColumnNotFound` si se despliega el nuevo código sin aplicar primero la migración en la DB de producción.

### Por qué NO usar `prisma db push` en producción

El comando `prisma db push` (usado en el `db-setup` local) es una herramienta de **desarrollo** — no genera un historial de migraciones, puede ser destructivo y **no es apto para entornos productivos**. En producción se usa DDL explícito y controlado.

---

### Script de migración — ejecutar ANTES del deploy

```sql
-- ============================================================
-- Migration: add preferences column to sec.auth_users
-- Feature:   05-User-Preferences
-- Author:    Run this ONCE before deploying the new image
-- Safe:      IF NOT EXISTS garantiza idempotencia (re-runable)
-- ============================================================

ALTER TABLE sec.auth_users
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Verificar que la columna existe (opcional, para confirmar):
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'sec'
  AND table_name   = 'auth_users'
  AND column_name  = 'preferences';
```

### Características del script

| Característica | Detalle |
|----------------|---------|
| **Idempotente** | `IF NOT EXISTS` — se puede ejecutar N veces sin error |
| **No destructivo** | Solo añade; no modifica ni elimina datos existentes |
| **Sin downtime** | `ADD COLUMN` en PostgreSQL es una operación de metadatos — no bloquea reads/writes en tablas grandes |
| **Default seguro** | `DEFAULT '{}'::jsonb` — todos los usuarios existentes quedan con preferencias vacías (el frontend los tratará como "sin favoritos guardados" y mostrará los defaults) |

---

### Orden de operaciones para el release

```
1. [ ] Ejecutar el script SQL en la DB de producción
2. [ ] Verificar: SELECT muestra la columna `preferences`
3. [ ] Desplegar la nueva imagen Docker (con el Prisma Client actualizado)
4. [ ] Verificar que el login no lanza P2022 en los logs
```

> **Rollback:** Si el deploy falla, revertir la imagen anterior. La columna `preferences` puede quedar en la DB sin problema — la imagen vieja simplemente no la selecciona (no hay breaking change hacia atrás).

---

### Lección aprendida (desarrollo local)

Al desarrollar localmente con Docker, el servicio `db-setup` puede reportar _"already in sync"_ usando una imagen cacheada del schema anterior. Si eso ocurre:

```bash
# Opción A: Aplicar DDL directamente (más rápido)
docker exec ds_app_local_db psql -U postgres -d ds_app_local \
  -c "ALTER TABLE sec.auth_users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;"

# Opción B: Forzar rebuild del db-setup (rebuild completo sin cache)
docker compose -f docker-compose.local.yml build --no-cache db-setup
docker compose -f docker-compose.local.yml --profile setup run --rm db-setup

# Opción C: Reset total (destruye todos los datos locales)
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml --profile setup run --rm db-setup
docker compose -f docker-compose.local.yml up app
```

Adicionalmente, si el **Prisma Client** dentro del contenedor `app` no reconoce el nuevo campo, siempre rebuild sin cache:

```bash
docker compose -f docker-compose.local.yml build --no-cache app
```

---

## Archivos modificados / creados

| Archivo                                               | Tipo       | Descripción                                          |
|-------------------------------------------------------|------------|------------------------------------------------------|
| `prisma/schema.prisma`                                | Modificado | Campo `preferences Json?` en modelo `AuthUser`       |
| `src/routes/preferences.routes.ts`                    | Nuevo      | Router GET + PATCH con type guards nativos (sin deps) |
| `src/routes/auth.ts`                                  | Modificado | Monta sub-router `/me/preferences`                   |
| `client/src/contexts/favorites-context.tsx`           | Modificado | `useState` → `useQuery` + `useMutation` optimista    |
| `client/src/pages/page.tsx`                           | Modificado | `FavoritePills` → `FavoriteCards` (grid + skeleton)  |
| `docs/05-User-Preferences-Feature.md`                 | Nuevo      | Este documento                                       |
