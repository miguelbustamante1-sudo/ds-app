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
  useRef,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
}

// ---------------------------------------------------------------------------
// Cap
// ---------------------------------------------------------------------------

export const MAX_QUICK_LINKS = 8;

// ---------------------------------------------------------------------------
// Default pinned favorites (shown while loading or when user has no saved prefs)
// ---------------------------------------------------------------------------

const DEFAULT_FAVORITES: FavoriteLink[] = [
  { id: '/my-time-off',         label: 'My Time Off',     path: '/my-time-off' },
  { id: '/time-off-management', label: 'Time Off Review',  path: '/time-off-management' },
  { id: '/my-team',             label: 'Team Members',     path: '/my-team' },
  { id: '/bench-move',          label: 'Bench Move',       path: '/bench-move' },
  { id: '/holiday-swaps',       label: 'Holiday Swaps',    path: '/holiday-swaps' },
];

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

  // ── Load preferences from the server ──────────────────────────────────────
  const { data: prefs, isLoading } = useQuery<UserPreferences>({
    queryKey: PREFS_QUERY_KEY,
    queryFn: fetchPreferences,
    // Keep stale data visible while revalidating; don't refetch on window focus
    // (preferences change rarely — only when the user explicitly pins/unpins).
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Resolved list: server data → fallback to defaults while loading / on first use
  const favorites: FavoriteLink[] =
    prefs?.favorites !== undefined ? prefs.favorites : DEFAULT_FAVORITES;

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
        const current = old?.favorites ?? DEFAULT_FAVORITES;
        const alreadyPinned = current.some((f) => f.id === link.id);
        const next = alreadyPinned
          ? current.filter((f) => f.id !== link.id)
          : current.length >= MAX_QUICK_LINKS
            ? current
            : [...current, link];
        const nextPrefs: UserPreferences = { ...old, favorites: next };
        scheduleSave(nextPrefs);
        return nextPrefs;
      });
    },
    [queryClient, scheduleSave],
  );

  // ── isFavorite ─────────────────────────────────────────────────────────────
  const isFavorite = useCallback(
    (path: string) => favorites.some((f) => f.id === path),
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, isFull: favorites.length >= MAX_QUICK_LINKS, isLoading }}>
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
