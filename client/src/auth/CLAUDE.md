# Auth — Frontend Pattern (Memory Token Pattern)

The frontend resolves and holds the authenticated user via `AuthProvider` in `client/src/auth/auth-provider.tsx`.

## How it works
- On mount, `AuthProvider` calls `POST /api/auth/refresh` (not `GET /api/auth/me`) to hydrate the user
- The call is **gated on `SESSION_EXPIRES_KEY` in localStorage** — if the key is absent (no prior session, or after logout), the call is skipped entirely, avoiding a 401 on the login page
- On a successful refresh, the response `{ expiresAt, user }` is used to populate React state and write `SESSION_EXPIRES_KEY` to localStorage
- On a failed refresh (401), `SESSION_EXPIRES_KEY` is removed and `user` is set to null

## User state location
- User object lives **in React state only** — no localStorage, no sessionStorage
- Only `SESSION_EXPIRES_KEY` (a timestamp, not a token) is written to localStorage
- No auth token is ever accessible to JavaScript — tokens live exclusively in httpOnly cookies

## Deprecated route
- `GET /api/auth/me` is **deprecated** — do not call it from new code
- All frontend auth hydration goes through `POST /api/auth/refresh`

## When `refresh()` is called explicitly
- OAuth callback (`/auth/callback`) calls `auth.refresh()` directly after cookies are set
- Dev login calls `auth.refresh()` directly after `POST /api/auth/dev-login` succeeds
- Session monitor calls `POST /api/auth/refresh` independently
- In all these cases the call bypasses the localStorage gate — only the mount-time auto-call is gated
