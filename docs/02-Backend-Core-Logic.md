# 02 — Lógica de Negocio del Backend

## Estructura de Capas

El backend sigue una arquitectura de capas implícita:

```
HTTP Request
     │
     ▼
[ Routes ]          → src/routes/*.ts
     │
     ▼
[ Middleware ]      → src/middleware/auth.ts  (Auth + Permisos)
     │
     ▼
[ Route Handlers ]  → src/routes/*.ts         (Controladores, orquestan todo)
     │
     ├──▶ [ Services ]  → src/services/*      (Lógica de negocio compleja)
     └──▶ [ DB Layer ]  → src/db/*            (Queries SQL via pg pool o Prisma)
```

> **Nota para el desarrollador:** Actualmente los Route Handlers mezclan validación de parámetros, acceso a DB vía Prisma, y llamadas a servicios de auditoría. Esto es una deuda técnica conocida — la refactorización ideal es mover toda esa lógica a capas de servicio dedicadas.

---

## Entry Point: src/index.ts

El archivo `index.ts` inicializa la aplicación completa:

1. **Middleware global:** CORS, JSON parser, cookie parser
2. **Swagger UI:** disponible en `/docs`
3. **Static files:** sirve el build de React desde `/app/public`
4. **Rutas:** `/api/auth/*` (públicas) y `/api/*` (protegidas con authMiddleware)
5. **SPA Fallback:** cualquier ruta GET que no sea API retorna `index.html`
6. **Cron Jobs:** se inician al arrancar el servidor

### Cron Jobs del Servidor

```typescript
// Valida que el schema de la DB coincida con el schema esperado
// Corre en arranque + cada 5 minutos
setInterval(refreshSchemaCheck, 5 * 60 * 1000);

// Cancela futuros time-offs de TMs que ya llegaron a su endDate
// Corre en arranque + cada 24 horas
setInterval(processAttritionTimeOffs, 24 * 60 * 60 * 1000);

// Envía notificaciones de countdown (90/60/30/15/1 día antes de un time-off)
// Corre en arranque + cada 24 horas
setInterval(processCountdownNotifications, 24 * 60 * 60 * 1000);

// Rellena timeOffDays=null en registros subidos masivamente sin días calculados
// Corre UNA SOLA VEZ en arranque
backfillTimeOffDays();
```

---

## Módulos de Servicio por Dominio

### Time Off (`src/services/timeoff/`)

El módulo más complejo de la aplicación. Gestiona todo el ciclo de vida de las ausencias:

**Subservicios:**
- **`attrition/processAttrition.ts`** — Cancela time-offs futuros de empleados que ya terminaron (tienen `teamMemberEndDate` en el pasado). Aplica lógica de "fin de contrato".
- **`countdownNotifications/`** — Envía notificaciones automáticas a TMs y supervisores cuando una ausencia está próxima (a 90, 60, 30, 15 y 1 días).
- **`backfill/backfillTimeOffDays.ts`** — Job de mantenimiento que recalcula el campo `timeOffDays` en registros donde es 0 o null (sucede en importaciones masivas).

**Reglas de negocio clave del Time Off:**
- Un TimeOff tiene un `statusId` que define su estado (ej. Pending, Approved, Cancelled).
- Tiene un campo `timeOffIsProjected` para distinguir ausencias proyectadas de confirmadas.
- Tiene `timeOffIsException` para casos especiales aprobados fuera de las reglas normales.
- Los TimeOffs pueden tener un `timeOffOriginalId` — usado cuando un TimeOff se parte/divide en dos registros (split).
- Las categorías de Time Off (`TimeOffCategory`) son **específicas por país** a través de la tabla `CategoryCountry`, que define:
  - Si permite medio día (`categoryCountryAllowHalfDay`)
  - Si tiene duración fija (`categoryCountryIsFixedDuration`)
  - El máximo de días permitidos (`categoryCountryMaxDays`)
  - Con cuántos días de anticipación se debe solicitar (`categoryCountryDaysBefore`)

---

### Endorsements & Hiring (`src/services/endorsement/`, `src/services/hiring/`)

El flujo de contratación de nuevos recursos sigue este proceso:

```
1. Se crea un Endorsement (endoso)
   └── Candidato, posición, proyecto, país, tier band, billing rate

2. Se adjuntan EndorsementBonuses (bonos por categoría/subcategoría)

3. El Endorsement pasa por estados: Pending → Approved / Rejected

4. Si es Approved → se crea un Hiring record
   └── Fecha de inicio, fecha billable, Workday ID, moneda, estado

5. El Hiring tiene su propio ciclo: Pending → Active / Cancelled
```

---

### Supervisors & Team Members (`src/services/teamMember/`, `src/services/supervisorAssignment/`)

La jerarquía de supervisión está en la tabla `SupervisorAssignment` (tabla de relación con fechas de inicio/fin, no un FK simple en TeamMember). Esto permite:
- Historial de supervisores
- Múltiples supervisores en el tiempo
- Fechas de inicio/fin de la relación

**Queries de jerarquía disponibles:**
- `getReports(teamMemberId, includeFullHierarchy)` — Returns direct reports o toda la jerarquía descendente
- `getSupervisorChain(teamMemberId)` — Devuelve la cadena de supervisores hacia arriba (hasta 3 niveles)
- `getProfileForSupervisor(supervisorId, targetId)` — Solo devuelve perfil si el target es un reporte del supervisor

---

### Bench (`src/services/bench/`)

Gestiona recursos sin proyecto asignado (en "bench"):
- Un TM puede tener múltiples asignaciones de bench con porcentaje de `allocation`
- Tiene `startDate` y `endDate` opcional
- Asociado a un `FunctionalArea` y a un supervisor
- Permite calcular disponibilidad de recursos para nuevos proyectos

---

### Notifications (`src/services/notifications/`)

Sistema de notificaciones interno basado en el schema `com`:

```
Notification (ntf_notifications)
  └── categoryId → Category (com.cat_categories)
  └── payload: JSON flexible con datos del evento
  └── itemType: string que describe el tipo de evento ("TIME_OFF_REMINDER", etc.)

Recipient (com.rec_recipients)
  └── notificationId → Notification
  └── userId → User (ds.tbl_users)
  └── isRead: boolean
  └── isArchived: boolean
  └── actionType: "readonly" | otros
```

Los usuarios solo ven sus propias notificaciones, filtradas por `userId`.

---

### Reports (`src/routes/reports/`)

Sistema de reportes dinámicos. Las definiciones de reportes están **almacenadas en la base de datos** (`rpt_report_definitions`), no hardcodeadas en el código:

```sql
-- Cada reporte tiene:
rpt_name         -- Nombre visible
rpt_sql_query    -- El SQL a ejecutar
rpt_group        -- Categoría del reporte
rpt_permission   -- Permiso RBAC requerido para verlo
```

Los `ReportParameter` definen los filtros que el usuario puede aplicar. El backend ejecuta el SQL dinámicamente pasando los parámetros de forma parametrizada.

> ⚠️ **Riesgo de seguridad:** Ejecutar SQL almacenado en la DB requiere cuidado especial con la sanitización de parámetros para prevenir SQL injection.

---

### Holiday Swaps (`src/routes/holidaySwap.routes.ts`)

Permite a un TM intercambiar un día festivo por otro día laborable:
- Se registra el `holidayId` (día festivo original), la `originalDate` y la `replacementDate`
- Tiene un flujo de aprobación con `statusId` (usa la misma tabla `tbl_to_statuses`)

---

## Capa de Base de Datos: Prisma vs pg Pool

El proyecto usa **dos métodos de acceso a BD** en paralelo:

| Método | Ubicación | Uso |
|---|---|---|
| **Prisma Client** | `src/db/prisma.ts` | Nuevas features, queries complejas con relaciones |
| **pg Pool (legacy)** | `src/db/pool.ts` | Queries SQL raw heredadas, algunos módulos antiguos |

**Cuándo usar cuál:**
- ✅ Usa **Prisma** para cualquier nueva funcionalidad
- ⚠️ El pool de `pg` existe por compatibilidad histórica — no extenderlo

---

## Auditoría (`src/services/audit/`)

Todas las operaciones de escritura (create, update, delete) loguean un registro en la tabla `aud_audits`:

```typescript
await auditOrchestrator.log({
  entityName: 'tbl_team_members',  // Nombre de la tabla afectada
  entityId: String(created.teamMemberId),
  createdBy: req.user.email,       // Quién hizo el cambio
  oldValues: before,               // Estado anterior (null en create)
  newValues: created,              // Estado nuevo (null en delete)
  comment: 'Team member created',
});
```

La tabla `Audit` almacena `oldValues` y `newValues` como JSON, permitiendo rastrear exactamente qué campos cambiaron y cuándo.

---

## DTOs y Contratos de API

Los DTOs están en `shared/dto/` y son importados tanto por el backend como por el frontend:

```typescript
// Ejemplo: shared/dto/teamMember.dto.ts
export interface TeamMemberDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  // ... campos del TM
  // Campos relacionados (joins)
  countryName: string | null;
  roleName: string | null;
  tierBandDescription: string | null;
}

export interface CreateTeamMemberDTO { ... }
export interface UpdateTeamMemberDTO { ... }
```

> ⚠️ **Importante:** Los DTOs son tipos TypeScript — solo validan en **tiempo de compilación**. En runtime, el backend hace `req.body as CreateTeamMemberDTO` sin validación real. Se recomienda agregar **Zod** para validación runtime.
