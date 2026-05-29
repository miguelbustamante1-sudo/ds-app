# Pull Request — `feature/hub-navigation-pattern` → `main`

**Author:** Pablo Aguilar  
**Reviewers:** @Miguel  
**Branch:** `feature/hub-navigation-pattern`  
**Commits (local, not yet pushed):** `26963705` → `b2d09d35` (5 commits on top of origin)

---

## 📋 Summary

This PR contains **5 deliverables** implemented across 3 days of work on top of the initial hub navigation scaffold. All changes are frontend-only (React + TypeScript) plus one backend addition for user preferences persistence, with no external dependencies added to `package.json`.

| # | Deliverable | Type |
|---|------------|------|
| 1 | Workday-style Global Dashboard (`/`) | Feature |
| 2 | Project Management Hub + RBAC full restoration | Feature |
| 3 | Global Favorites System (cross-hub pin/unpin) | Feature |
| 4 | Notification Center panel on Dashboard | Feature |
| 5 | Sidebar logo alignment fix | Bug fix |
| 6 | User Preferences persistence (favorites → DB) | Feature |

---

## 🚀 What Changed

### 1. Workday-style Global Dashboard (`page.tsx`)

Replaced the Looker Studio iframe at `/` with a fully interactive, component-driven dashboard.

**Components added inside `page.tsx`:**

| Component | Description |
|-----------|-------------|
| `GlobalSearchBar` | Rounded search input → navigates to `/reports?q=<query>` |
| `FavoriteCards` | Grid of pinned quick-link cards (2/3/4 columns responsive). Replaced original `FavoritePills`. |
| `NotificationCenterPanel` | Unread / Read / Archived tabs + "Mark all as read" + "Archive all" actions |
| `AwaitingActionPanel` | Collapsible action items feed; overdue items show red `OVERDUE` badge |
| `ImportantDatesCard` | Month/day badges; type icons (time-off, holiday, birthday); "View More/Less" toggle |
| `TeamHighlightsCard` | Coloured avatar initials + name + employee ID; links to `/my-team` |

**Layout:**
```
Hero (centred)
  ├── "Welcome back, {firstName}! 👋"
  ├── GlobalSearchBar
  └── FavoriteCards (grid)

Main grid [1fr | 320px]
  ├── Left:  NotificationCenterPanel → AwaitingActionPanel → TeamHighlightsCard
  └── Right: ImportantDatesCard
```

**Auth integration:** Reads `AuthUser.name` from `auth-provider.tsx`. Graceful fallback to `"there"` if name is absent.

**TypeScript:** Zero `any` usage. All interfaces are explicit:
```typescript
interface FavoriteLink  { id: string; label: string; path: string }
interface ActionItem    { id, title, source, ageLabel, dueDate, isOverdue }
interface ImportantDate { month, day, type: 'time-off'|'holiday'|'birthday', title, description }
interface TeamMember    { id, name, employeeId, initials, avatarColor }
```

---

### 2. Project Management Hub + RBAC Restoration

**New hub:** `/project-management-hub`

| Card | Path | Permission guard |
|------|------|-----------------|
| Bench Move | `/bench-move` | `BenchMove` |
| End Bench | `/end-bench` | `BenchRemove` |
| Project Assignments | `/project-assignments` | `ProjectAssignments` |
| Pending Requests | `/my-team/pending` | `PendingRequests` |
| Reports | `/reports?module=project-management` | *(always visible)* |

**RBAC restored on all hubs:** Permission guards that were removed for a leadership demo were fully restored on Time Off, Hiring, Security, and Maintenance hubs. A "Reports" card was also added to each hub.

**DB Seeds (`seed.sql`):** Added roles `bsa` and `dev`, 10 new `opt_options` entries, full permission matrices for both roles. The `dev` user is assigned all 4 roles (`admin`, `bsa`, `dev`, `user`) for frictionless local testing.

**Sidebar (`layout-1.config.tsx`):** Added Project Management entry under "Workspaces". Removed orphaned Operations section (those items now live inside the hub). Fixed Hiring hub role from `'admin'` → `'bsa'`.

---

### 3. Global Favorites System

**New file:** `client/src/contexts/favorites-context.tsx`

Singleton React context that owns the pinned-favorites list for the entire app session.

```typescript
interface FavoritesContextValue {
  favorites:      FavoriteLink[];
  isFavorite:     (path: string) => boolean;
  toggleFavorite: (link: FavoriteLink) => void;
  isLoading:      boolean;   // Phase 2: true while fetching from API
}
```

**`App.tsx`:** `<FavoritesProvider>` wraps the app inside `<AuthProvider>` so Phase 2 can read `userId` for API calls without prop-drilling.

**`HubPage.tsx` → `HubCard`:** Star toggle added to every hub card.
- Invisible at rest, visible on `group-hover`
- Filled amber star when already pinned
- `e.stopPropagation()` prevents card navigation from firing
- `aria-pressed` + `aria-label` + `onKeyDown` (Enter/Space) for full accessibility

**Phase 2 (implemented):** Favorites are now persisted to the database via `PATCH /api/auth/me/preferences` with optimistic updates and debounce 500ms. See section 6.

---

### 4. Notification Center Panel

New panel at the top of the Dashboard left column.

```
┌─────────────────────────────────────────────┐
│ 🔔 Notification Center              View all →│
├──────────────────────────────────────────────┤
│ Unread │ Read │ Archived                     │
├──────────────────────────────────────────────┤
│ [Mark all as read]  [Archive all]            │
├──────────────────────────────────────────────┤
│   No unread notifications (empty state)      │
└──────────────────────────────────────────────┘
```

Currently populated from the real notifications API (`GET /api/notifications` via React Query). Actions: mark all read, archive all, navigate to `/notification-center`.

---

### 5. Sidebar Logo Alignment Fix

**File:** `sidebar-header.tsx`

| State | Before | After |
|-------|--------|-------|
| Expanded | Logo not vertically centred | `flex items-center` on `<Link>` |
| Collapsed | Mini icon left-aligned | `mx-auto` centres it with menu icons |
| Dark mode | `hidden dark:block` broke alignment | Changed to `hidden dark:flex dark:items-center` |

---

### 6. User Preferences Persistence (Phase 2 — Favorites → DB)

**Backend — new file:** `src/routes/preferences.routes.ts`

- `GET /api/auth/me/preferences` — returns `UserPreferences` JSON from `sec.auth_users.preferences`
- `PATCH /api/auth/me/preferences` — shallow-merges and saves; validated with TypeScript type guards (no new dependencies)
- Mounted as sub-router of `/api/auth/me/...` in `src/routes/auth.ts`

**Database:** New column `preferences jsonb DEFAULT '{}'` on `sec.auth_users`.

> ⚠️ **Required before deploying to production:**
> ```sql
> ALTER TABLE sec.auth_users
>   ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
> ```
> See `ds-app/docs/05-User-Preferences-Feature.md` for full deployment guide.

**Frontend (`favorites-context.tsx`):** Evolved from `useState` to `useQuery` + `useMutation` with optimistic updates and debounce.

---

## 📁 Files Changed

| File | Change |
|------|--------|
| `client/src/pages/page.tsx` | Major rewrite — full dashboard (+638 lines) |
| `client/src/contexts/favorites-context.tsx` | New — global favorites context |
| `client/src/components/hub/HubPage.tsx` | Modified — star toggle on HubCard |
| `client/src/config/layout-1.config.tsx` | Modified — sidebar restructure |
| `client/src/App.tsx` | Modified — FavoritesProvider |
| `client/src/config/hubs/project-management.hub.config.ts` | New hub config |
| `client/src/config/hubs/time-off.hub.config.ts` | RBAC restored + Reports card |
| `client/src/config/hubs/hiring.hub.config.ts` | RBAC restored + Reports card |
| `client/src/config/hubs/security.hub.config.ts` | RBAC restored + Reports card |
| `client/src/config/hubs/maintenance.hub.config.ts` | RBAC restored + Reports card |
| `client/src/pages/project-management-hub/index.tsx` | New hub page |
| `client/src/routing/app-routing-setup.tsx` | New route for PM hub |
| `client/src/components/layouts/components/sidebar-header.tsx` | Logo alignment fix |
| `ds-app/scripts/seed.sql` | New roles, options, permissions |
| `ds-app/src/routes/preferences.routes.ts` | New backend router |
| `prisma/schema.prisma` | `preferences Json?` on `AuthUser` |
| `ds-app/docs/05-User-Preferences-Feature.md` | Full feature doc |
| `docs/changelogs/2026-04-16-*.md` (3 files) | Changelogs |

---

## ✅ Testing Checklist (for reviewer)

### Setup
- [ ] Pull branch and run `docker compose -f docker-compose.local.yml build --no-cache app`
- [ ] Apply DB migration before starting: `docker exec ds_app_local_db psql -U postgres -d ds_app_local -c "ALTER TABLE sec.auth_users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;"`
- [ ] `docker compose -f docker-compose.local.yml up app`
- [ ] Login at `http://localhost:3000` with dev credentials

### Global Dashboard (`/`)
- [ ] Dashboard loads without errors — greeting shows first name
- [ ] Search bar visible and navigates to `/reports?q=<term>` on submit
- [ ] FavoriteCards grid shows default 5 pins on first load
- [ ] ImportantDatesCard renders in right sidebar
- [ ] TeamHighlightsCard renders below AwaitingActionPanel
- [ ] Notification Center panel shows Unread/Read/Archived tabs

### Global Favorites
- [ ] Navigate to any Hub (e.g. Time Off Hub)
- [ ] Hover over a Hub card — star icon appears
- [ ] Click star → card is pinned → amber star stays visible
- [ ] Return to Dashboard (`/`) → new card appears in FavoriteCards
- [ ] Refresh page → favorites are still there (persisted in DB ✅)
- [ ] Click star again on Dashboard card → card is unpinned
- [ ] Unpin all cards → empty state shows "Pin shortcuts from any Hub card..."

### Project Management Hub
- [ ] Hub visible in sidebar under "Workspaces" (only for users with `BenchMove` permission)
- [ ] Navigate to `/project-management-hub` — all 5 cards render
- [ ] Cards with permission guards hidden when role does not have permission
- [ ] "Reports" card visible to all roles

### RBAC
- [ ] Login as a `user`-only account — Maintenance, Security hubs hidden or cards hidden
- [ ] Login as `bsa` — Hiring hub + Endorsements/Hiring cards visible
- [ ] Login as `admin` — all hubs and cards visible

### Sidebar
- [ ] Sidebar logo centred in both expanded and collapsed states
- [ ] Dark mode: logo alignment identical

### Notifications
- [ ] "Mark all as read" button changes notification state
- [ ] "Archive all" moves notifications to Archived tab
- [ ] "View all →" navigates to `/notification-center`

### Backend Preferences API
- [ ] `GET /api/auth/me/preferences` returns `{ favorites: [...] }` after pinning
- [ ] `PATCH /api/auth/me/preferences` with invalid payload returns `400` with descriptive message
- [ ] Unauthenticated request to either endpoint returns `401`

---

## ⚠️ Known Limitations / Phase 3 Backlog

| Item | Status |
|------|--------|
| `AwaitingActionPanel` data | Mock — pending `GET /api/pending-tasks` endpoint |
| `ImportantDatesCard` data | Mock — pending `GET /api/important-dates` endpoint |
| `TeamHighlightsCard` data | Mock — pending `GET /api/my-team/highlights` endpoint |
| Global search | Navigates to `/reports` but does not yet query across modules |
| Notification Center | Reads from real API but actions (mark read, archive) are local state only — pending write endpoints |

---

## 📚 Documentation

| Doc | Location |
|-----|----------|
| User Preferences Feature (full spec) | `ds-app/docs/05-User-Preferences-Feature.md` |
| Hub Navigation + Global Dashboard changelog | `docs/changelogs/2026-04-16-hub-navigation-and-global-dashboard.md` |
| Favorites + Notification Center changelog | `docs/changelogs/2026-04-16-dashboard-favorites-notifications.md` |
| Sidebar logo fix changelog | `docs/changelogs/2026-04-16-sidebar-logo-alignment.md` |
