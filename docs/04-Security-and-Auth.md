# 04 — Seguridad, Autenticación y Autorización (RBAC)

## Modelo de Seguridad General

La aplicación implementa **tres capas de seguridad** independientes:

```
1. Autenticación (AuthN)  → ¿Eres quien dices ser?     [JWT / IAP / OneLogin]
2. Autorización (AuthZ)   → ¿Tienes permiso?            [RBAC por recurso + acción]
3. Enriquecimiento        → ¿Quién eres en el sistema?  [dsUserId + teamMemberId]
```

---

## 1. Autenticación: Proveedores de Identidad

El middleware `auth.ts` soporta **4 métodos de autenticación**, evaluados en este orden de prioridad:

### Prioridad 1: Google IAP (Identity-Aware Proxy) — Producción en GCP

```
Request
  └── Header: x-goog-iap-jwt-assertion: <token>
       └── iapJwtService.validateIapJwt(token)
            └── Verifica firma con claves públicas de Google
            └── Verifica audience (proyecto GCP específico)
            └── Si válido → userService.syncUserFromIapToken()
```

- Se usa cuando la app corre detrás de Google IAP en Cloud Run.
- El IAP valida la identidad antes de que la request llegue al servidor.
- El email del usuario viene en el header `x-goog-authenticated-user-email`.

### Prioridad 2: Dev JWT (Solo Desarrollo Local)

```
Request (NODE_ENV !== 'production')
  └── Cookie: access_token=<HS256 JWT>
       └── jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
            └── Si válido → userService.syncUserFromGoogleToken()
```

- **Solo funciona en entornos no productivos.**
- El JWT se genera en `POST /api/auth/local-login` con el `JWT_SECRET` del `.env.local`.
- **No usar en producción** — el `JWT_SECRET` debe ser secreto y rotarse periódicamente.

### Prioridad 3: OneLogin SSO — Producción Principal

```
Request
  └── Cookie: access_token=<OneLogin JWT>
       └── oneloginService.validateToken(token)
            └── Verifica firma con JWKS de OneLogin (claves públicas)
            └── Verifica claims: iss, aud, exp
            └── Si válido → userService.syncUserFromToken()
```

- Es el método de autenticación principal en producción.
- Requiere que `ONELOGIN_DOMAIN`, `ONELOGIN_CLIENT_ID` y `ONELOGIN_JWKS_URI` estén configurados en las variables de entorno.
- Las claves públicas de OneLogin se cachean localmente para evitar llamadas HTTP en cada request.

### Prioridad 4: Google OIDC (Fallback — Legacy Apps Script)

```
Request
  └── Authorization: Bearer <Google ID Token>
       └── googleOidcService.validateIdToken(token)
            └── Verifica con Google OIDC endpoint
```

- Fallback para integraciones externas (Google Apps Script).
- **No es el flujo estándar para usuarios de la app web.**

---

## 2. Sincronización de Usuario (`userService.syncUser*`)

Después de validar el token, el sistema **sincroniza el usuario** en la tabla `sec.auth_users`:

```typescript
// Pseudo-lógica de syncUser
async function syncUserFromToken(payload: TokenPayload): Promise<AuthUser> {
  const existingUser = await prisma.authUser.findUnique({
    where: { email: payload.email }
  });

  if (existingUser) {
    // Actualiza lastLogin y campos que puedan haber cambiado
    return prisma.authUser.update({
      where: { id: existingUser.id },
      data: { lastLogin: new Date(), avatarUrl: payload.picture }
    });
  }

  // Primera vez → crear usuario con roles por defecto
  return prisma.authUser.create({
    data: {
      email: payload.email,
      oneloginId: payload.sub,
      firstName: payload.given_name,
      lastName: payload.family_name,
      roles: ['user'],  // Rol por defecto
      lastLogin: new Date(),
    }
  });
}
```

La tabla `auth_users` (schema `sec`) mantiene un registro de todos los usuarios que han iniciado sesión.

---

## 3. Enriquecimiento: Vinculación con ds.tbl_users

```typescript
async function enrichWithDsFields(req: AuthenticatedRequest): Promise<void> {
  const dsUser = await getDsUserByEmail(req.user.email);
  if (dsUser) {
    req.user.dsUserId = dsUser.userId;        // ID en ds.tbl_users
    req.user.teamMemberId = dsUser.teamMemberId; // ID en ds.tbl_team_members
  }
}
```

Existen **dos tablas de usuarios** con propósitos distintos:

| Tabla | Schema | Propósito |
|---|---|---|
| `auth_users` | `sec` | Autenticación pura. Guarda tokens, roles de acceso |
| `tbl_users` | `ds` | Usuario de negocio. Vincula con TeamMember y auditoría |

Un usuario puede estar en `auth_users` pero no en `tbl_users` (si nunca fue dado de alta en el sistema de negocio). En ese caso, `req.user.dsUserId` será `undefined`.

---

## 4. Sistema RBAC (Role-Based Access Control)

### Modelo de Datos de Permisos

```
SecurityRole (sec.rol_roles)
  └── roleName: "admin" | "manager" | "user" | ...
  └── permissions: Permission[]

Permission (sec.per_permissions)
  └── permissionResource: "TeamMembers" | "TimeOff" | "Endorsements" | ...
  └── permissionRead: boolean
  └── permissionWrite: boolean
  └── permissionDelete: boolean
  └── optionId → Option (descripción del recurso)

UserRole (sec.uro_user_roles)
  └── userId (de auth_users)
  └── roleId (de rol_roles)
```

### `PermissionMap` — La Estructura de Permisos en Memoria

Después de autenticar y resolver permisos, se construye un mapa de permisos:

```typescript
type PermissionMap = {
  [resource: string]: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
};

// Ejemplo de PermissionMap para un usuario "manager":
const permissions = {
  TeamMembers:    { read: true,  write: true,  delete: false },
  TimeOff:        { read: true,  write: true,  delete: false },
  Endorsements:   { read: true,  write: false, delete: false },
  Reports:        { read: true,  write: false, delete: false },
  Security:       { read: false, write: false, delete: false },
};
```

### `resolvePermissions()` — Resolución de Permisos

```typescript
// src/services/permissionResolver.ts
async function resolvePermissions(
  source: PermissionSource,  // 'db' | 'token'
  context: { userId: number; tokenPayload: TokenPayload }
): Promise<PermissionMap> {
  if (source === 'db') {
    // Obtiene roles del usuario de la DB → construye PermissionMap
    const userRoles = await getUserRolesWithPermissions(context.userId);
    return buildPermissionMap(userRoles);
  }
  // Alternativa: leer permisos del token (claims del JWT)
  return extractPermissionsFromToken(context.tokenPayload);
}
```

La variable de entorno `PERMISSIONS_SOURCE` (default: `'db'`) controla de dónde se leen los permisos.

### `can()` — Verificación de Permisos

```typescript
// La función helper para verificar permisos
function can(
  permissions: PermissionMap,
  resource: string,
  action: PermissionAction  // 'read' | 'write' | 'delete' | 'create'
): boolean {
  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;
  if (action === 'create') return resourcePerms.write; // 'create' se mapea a 'write'
  return resourcePerms[action] === true;
}
```

### Uso en Rutas del Backend

```typescript
// Ejemplo de protección de ruta con permisos granulares
router.post(
  '/team-members',
  requirePermission('TeamMembers', 'create'),  // Middleware de autorización
  async (req, res) => {
    // Solo llega aquí si el usuario tiene write en TeamMembers
    const tm = await createTeamMember(req.body);
    res.json(tm);
  }
);

router.delete(
  '/team-members/:id',
  requirePermission('TeamMembers', 'delete'),  // Requiere permiso delete
  async (req, res) => { ... }
);
```

---

## 5. Revocación de Tokens

La tabla `sec.revoked_tokens` implementa una **blocklist de JTI (JWT ID)**:

```
RevokedToken
  └── tokenJti: string   (ID único del token, campo "jti" del JWT)
  └── userId             (quién era el usuario del token)
  └── revokedAt          (cuándo se revocó)
  └── expiresAt          (cuándo expira — para limpiar la tabla)
```

**Cuándo se revoca un token:**
- El usuario hace logout
- Un admin revoca la sesión de un usuario específico

**Validación:** En cada request autenticada, el middleware verifica que el `jti` del token NO esté en la tabla `revoked_tokens`. Si está → 401.

---

## 6. Seguridad de la Cookie

El token de sesión se almacena en una cookie con las siguientes características:

```
Set-Cookie: access_token=<JWT>
  HttpOnly   → JavaScript del browser NO puede leer la cookie (previene XSS)
  SameSite   → Protección contra CSRF
  Secure     → Solo HTTPS en producción
  Path=/     → Enviada en todas las requests al servidor
```

**Ventaja sobre localStorage:** Al ser `HttpOnly`, un script malicioso inyectado (XSS) no puede robar el token.

---

## 7. Variables de Entorno Relacionadas con Seguridad

| Variable | Descripción | ¿Requerida en prod? |
|---|---|---|
| `JWT_SECRET` | Clave para firmar JWTs de dev | ❌ Solo local |
| `ONELOGIN_DOMAIN` | Dominio de OneLogin | ✅ |
| `ONELOGIN_CLIENT_ID` | Client ID de la app en OneLogin | ✅ |
| `ONELOGIN_CLIENT_SECRET` | Client Secret de OneLogin | ✅ |
| `ONELOGIN_JWKS_URI` | URL de claves públicas JWKS | ✅ |
| `GOOGLE_IAP_AUDIENCE` | Audience del IAP token de GCP | ✅ (en GCP) |
| `PERMISSIONS_SOURCE` | `'db'` o `'token'` | Opcional (default: `db`) |

---

## 8. Recursos RBAC Disponibles

Basado en el schema de permisos, los recursos protegidos conocidos son:

| Resource (permissionResource) | Descripción |
|---|---|
| `TeamMembers` | Gestión de miembros del equipo |
| `TimeOff` | Gestión de tiempo libre |
| `ProjectAssignments` | Asignaciones a proyectos |
| `Endorsements` | Proceso de endosos |
| `Hiring` | Proceso de contratación |
| `Holidays` | Gestión de días festivos |
| `HolidaySwaps` | Intercambio de días festivos |
| `Bench` | Gestión de bench |
| `Notifications` | Notificaciones internas |
| `Reports` | Acceso a reportes dinámicos |
| `Security` | Administración de roles y permisos |
| `Clients` | Gestión de clientes |
| `WorkdayInfo` | Información de Workday |
