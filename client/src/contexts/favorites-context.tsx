/**
 * FavoritesContext — Persistent Quick Links State
 * =================================================
 *
 * Manages the user's pinned favourite links across the application.
 * Any HubCard can call `toggleFavorite()` to pin/unpin itself.
 * The Global Dashboard reads `favorites` to render the FavoriteCards section.
 *
 * Persistence strategy (Phase 2):
 *   - On mount: `useQuery` fetches saved preferences from GET /api/auth/me/preferences.
 *   - On toggle: optimistic update is applied immediately to the UI; a debounced
 *     `useMutation` sends PATCH /api/auth/me/preferences in the background.
 *   - On API error: React Query rolls back the optimistic update automatically.
 *   - Favorites survive logout / multi-device because they live in PostgreSQL.
 *
 * SOLID:
 *   - SRP: This context owns ONLY favourites state + persistence.
 *   - OCP: Adding new preference keys requires only extending `UserPreferences`.
 * Testability:
 *   - Context value is a plain object → easily mocked in unit tests.
 *   - API calls are isolated to the `api` helpers below → trivially stubbed.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/auth-provider';
import { usePermissions } from '@/hooks/usePermissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FavoriteLink {
  /** Unique key — use the route path (e.g. "/my-time-off") */
  id: string;
  /** Human-readable label shown on the card */
  label: string;
  /** React-router path to navigate to on click */
  path: string;
}

/** Shape of the preferences object stored in the DB. */
interface UserPreferences {
  favorites?: FavoriteLink[];
  /** True once the user has dismissed the Quick Access discoverability hint. */
  quickAccessHintDismissed?: boolean;
}

interface FavoritesContextValue {
  /** Currently pinned favorites, in pin order */
  favorites: FavoriteLink[];
  /** Returns true if the given path is pinned */
  isFavorite: (path: string) => boolean;
  /**
   * Pins the link if not already pinned; unpins it if it is.
   * Applies an optimistic update immediately and persists in the background.
   * No-op when pinning and the MAX_QUICK_LINKS cap has already been reached.
   */
  toggleFavorite: (link: FavoriteLink) => void;
  /** True when the MAX_QUICK_LINKS limit has been reached */
  isFull: boolean;
  /** True while the initial preferences are being loaded from the server */
  isLoading: boolean;
  /** True when the user hasn't dismissed the Quick Access discoverability hint yet */
  showQuickAccessHint: boolean;
  /** Marks the hint as dismissed; persists immediately (not debounced) */
  dismissQuickAccessHint: () => void;
}

// ---------------------------------------------------------------------------
// Cap
// ---------------------------------------------------------------------------

export const MAX_QUICK_LINKS = 8;

// ---------------------------------------------------------------------------
// Default pinned favorites (shown while loading or when user has no saved prefs)
// ---------------------------------------------------------------------------

/** Shown to every user regardless of permissions. */
const BASE_FAVORITES: FavoriteLink[] = [
  { id: '/my-time-off',   label: 'My Time Off',   path: '/my-time-off' },
  { id: '/holiday-swaps', label: 'Holiday Swaps', path: '/holiday-swaps' },
];

interface OverlayFavorite extends FavoriteLink {
  /** Resource checked via usePermissions().canRead before this item is included. */
  permission: string;
}

/**
 * Appended to the base set, in this order, only when the user has read access.
 * Intentionally does NOT include 'Bench Move' or the old 'Time Off Review' default —
 * dropped by design (see documents/superpowers/specs/2026-09-05-quick-access-personalization-design.md).
 */
const OVERLAY_FAVORITES: OverlayFavorite[] = [
  { id: '/supervisor-time-off',      label: 'Supervisor Time Off', path: '/supervisor-time-off',      permission: 'SupervisorTimeOff' },
  { id: '/supervisor-holiday-swaps', label: 'Team Holiday Swaps',  path: '/supervisor-holiday-swaps', permission: 'SupervisorHolidaySwaps' },
  { id: '/my-team',                  label: 'My Team',             path: '/my-team',                  permission: 'MyTeam' },
];

/**
 * Computes the fallback favorites shown until the user pins/unpins anything.
 * Base items are universal; overlay items are added only if the user can
 * read the corresponding resource (same permission strings sidebar-menu.tsx
 * already gates these exact routes with).
 */
function buildDefaultFavorites(canRead: (resource: string) => boolean): FavoriteLink[] {
  const overlay = OVERLAY_FAVORITES
    .filter((item) => canRead(item.permission))
    .map(({ id, label, path }) => ({ id, label, path }));
  return [...BASE_FAVORITES, ...overlay];
}

// ---------------------------------------------------------------------------
// API helpers — isolated for easy mocking in tests
// ---------------------------------------------------------------------------

const PREFS_URL = '/api/auth/me/preferences';

async function fetchPreferences(): Promise<UserPreferences> {
  const res = await fetch(PREFS_URL, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch preferences');
  return res.json() as Promise<UserPreferences>;
}

async function savePreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const res = await fetch(PREFS_URL, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error('Failed to save preferences');
  return res.json() as Promise<UserPreferences>;
}

// ---------------------------------------------------------------------------
// React Query key
// ---------------------------------------------------------------------------

const PREFS_QUERY_KEY = ['user-preferences'] as const;

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canRead } = usePermissions();

  // ── Load preferences from the server ──────────────────────────────────────
  const { data: prefs, isLoading } = useQuery<UserPreferences>({
    queryKey: PREFS_QUERY_KEY,
    queryFn: fetchPreferences,
    enabled: !!user,
    // Keep stale data visible while revalidating; don't refetch on window focus
    // (preferences change rarely — only when the user explicitly pins/unpins).
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fallback defaults, recomputed only when the user's permissions actually change.
  // Depends on `user?.permissions` (not `canRead`) because usePermissions() returns
  // a fresh `canRead` closure every render, which would defeat this memoization.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultFavorites = useMemo(() => buildDefaultFavorites(canRead), [user?.permissions]);

  // Resolved list: server data → fallback to defaults while loading / on first use
  const favorites: FavoriteLink[] =
    prefs?.favorites !== undefined ? prefs.favorites : defaultFavorites;

  // ── Persist preferences (debounced, fire-and-forget) ─────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate } = useMutation<UserPreferences, Error, UserPreferences>({
    mutationFn: savePreferences,
    // On error → roll back to whatever the server last confirmed
    onError: () => {
      queryClient.invalidateQueries({ queryKey: PREFS_QUERY_KEY });
    },
  });

  /**
   * Schedules a debounced PATCH.
   * Multiple rapid toggles collapse into a single network request.
   */
  const scheduleSave = useCallback(
    (nextPrefs: UserPreferences) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        mutate(nextPrefs);
      }, 500);
    },
    [mutate],
  );

  // ── Toggle (optimistic update) ─────────────────────────────────────────────
  const toggleFavorite = useCallback(
    (link: FavoriteLink) => {
      queryClient.setQueryData<UserPreferences>(PREFS_QUERY_KEY, (old) => {
        const current = old?.favorites ?? defaultFavorites;
        const alreadyPinned = current.some((f) => f.id === link.id);
        const next = alreadyPinned
          ? current.filter((f) => f.id !== link.id)
          : current.length >= MAX_QUICK_LINKS
            ? current
            : [...current, link];
        const nextPrefs: UserPreferences = { ...old, favorites: next, quickAccessHintDismissed: true };
        scheduleSave(nextPrefs);
        return nextPrefs;
      });
    },
    [queryClient, scheduleSave, defaultFavorites],
  );

  // ── isFavorite ─────────────────────────────────────────────────────────────
  const isFavorite = useCallback(
    (path: string) => favorites.some((f) => f.id === path),
    [favorites],
  );

  // ── First-run discoverability hint ────────────────────────────────────────
  const showQuickAccessHint = !isLoading && prefs?.quickAccessHintDismissed !== true;

  const dismissQuickAccessHint = useCallback(() => {
    queryClient.setQueryData<UserPreferences>(PREFS_QUERY_KEY, (old) => {
      const nextPrefs: UserPreferences = { ...old, quickAccessHintDismissed: true };
      mutate(nextPrefs);
      return nextPrefs;
    });
  }, [queryClient, mutate]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        isFull: favorites.length >= MAX_QUICK_LINKS,
        isLoading,
        showQuickAccessHint,
        dismissQuickAccessHint,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook — enforces usage inside the provider
// ---------------------------------------------------------------------------

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used inside <FavoritesProvider>');
  }
  return ctx;
}
