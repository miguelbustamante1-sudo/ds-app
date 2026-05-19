# Auth and Request User Rules

## Request Type Rule
Every protected route receives an `AuthenticatedRequest` where `req.user` has already been populated by auth middleware.

Do not make additional database queries to resolve identity fields that are already present on `req.user`.

## Available `req.user` Fields
Typical fields include:
- `id`
- `email`
- `firstName`
- `lastName`
- `roles`
- `avatarUrl`
- `permissions`
- `dsUserId`
- `teamMemberId`

## Identity Usage Rule
Use:
- `req.user.email` for audit `createdBy`
- `req.user.dsUserId` when the domain needs the DS application user
- `req.user.teamMemberId` when the domain needs the team member record

## Critical Distinction
These are not the same thing:
- `req.user.id` maps to `sec.auth_users.id`
- `req.user.dsUserId` maps to `ds.tbl_users.usr_id`
- `req.user.teamMemberId` maps to `ds.tbl_users.tms_id`

Do not use `req.user.id` when the feature actually needs `dsUserId` or `teamMemberId`.

## Join Rule
The join relationship between security user and DS user is based on email.

Treat login identity and domain identity as separate concepts.

## Permission Rule
Permission middleware should consume the resolved permission map attached during authentication.
Do not rebuild authorization state inside each route unless absolutely necessary.

---

## Frontend Auth Pattern (Memory Token Pattern)

The frontend resolves and holds the authenticated user via `AuthProvider` in `client/src/auth/auth-provider.tsx`.

### How it works
- On mount, `AuthProvider` calls `POST /api/auth/refresh` (not `GET /api/auth/me`) to hydrate the user
- The call is **gated on `SESSION_EXPIRES_KEY` in localStorage** — if the key is absent (no prior session, or after logout), the call is skipped entirely, avoiding a 401 on the login page
- On a successful refresh, the response `{ expiresAt, user }` is used to populate React state and write `SESSION_EXPIRES_KEY` to localStorage
- On a failed refresh (401), `SESSION_EXPIRES_KEY` is removed and `user` is set to null

### User state location
- User object lives **in React state only** — no localStorage, no sessionStorage
- Only `SESSION_EXPIRES_KEY` (a timestamp, not a token) is written to localStorage
- No auth token is ever accessible to JavaScript — tokens live exclusively in httpOnly cookies

### Deprecated route
- `GET /api/auth/me` is **deprecated** — do not call it from new code
- It is kept for one release cycle in case external tooling depends on it, then will be removed
- All frontend auth hydration goes through `POST /api/auth/refresh`

### When `refresh()` is called explicitly
- OAuth callback (`/auth/callback`) calls `auth.refresh()` directly after cookies are set
- Dev login calls `auth.refresh()` directly after `POST /api/auth/dev-login` succeeds
- Session monitor calls `POST /api/auth/refresh` independently (already did before this refactor)
- In all these cases the call bypasses the localStorage gate — only the mount-time auto-call is gated
