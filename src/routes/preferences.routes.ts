/**
 * User Preferences Routes
 * =======================
 *
 * Endpoints for reading and updating per-user UI preferences.
 * Preferences are stored as a JSON column in `sec.auth_users.preferences`.
 *
 * Routes:
 *   GET  /api/auth/me/preferences  — Returns the caller's preferences object.
 *   PATCH /api/auth/me/preferences — Merges + saves preferences for the caller.
 *
 * Security:
 *   - Both routes are protected by `authMiddleware`.
 *   - Input is strictly validated with type-safe guards before touching the DB.
 *   - Users can only read/write their own preferences (enforced by `req.user.id`).
 *
 * SOLID:
 *   - SRP: This file owns ONLY preference persistence logic.
 *   - OCP: New preference keys can be added by extending `UserPreferences`
 *          and `validatePreferences()` without modifying any other route.
 *
 * No external validation libraries required — uses TypeScript type guards only.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FavoriteLink {
  /** Unique key — always the route path (e.g. "/my-time-off") */
  id: string;
  /** Human-readable label shown on the card */
  label: string;
  /** React-router path — must start with "/" */
  path: string;
}

/** Full shape of the preferences object stored in the DB.
 *  Extend here to add future preference keys. */
export interface UserPreferences {
  favorites?: FavoriteLink[];
}

// ---------------------------------------------------------------------------
// Validation helpers — no external lib required
// ---------------------------------------------------------------------------

const MAX_FAVORITES = 20;
const MAX_ID_LENGTH = 200;
const MAX_LABEL_LENGTH = 100;
const MAX_PATH_LENGTH = 200;

/**
 * Type guard: checks that `v` is a non-empty string within the given max length.
 */
function isValidString(v: unknown, maxLength: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLength;
}

/**
 * Validates a single FavoriteLink object.
 * Returns an error message string if invalid, or null if valid.
 */
function validateFavoriteLink(item: unknown): string | null {
  if (!item || typeof item !== 'object') {
    return 'Each favorite must be an object';
  }
  const f = item as Record<string, unknown>;

  if (!isValidString(f.id, MAX_ID_LENGTH)) {
    return `"id" must be a non-empty string (max ${MAX_ID_LENGTH} chars)`;
  }
  if (!isValidString(f.label, MAX_LABEL_LENGTH)) {
    return `"label" must be a non-empty string (max ${MAX_LABEL_LENGTH} chars)`;
  }
  if (!isValidString(f.path, MAX_PATH_LENGTH) || !(f.path as string).startsWith('/')) {
    return `"path" must start with "/" (max ${MAX_PATH_LENGTH} chars)`;
  }
  return null;
}

/**
 * Validates the full preferences payload from the request body.
 * Returns `{ valid: true, data }` or `{ valid: false, error }`.
 */
function validatePreferences(
  body: unknown,
): { valid: true; data: UserPreferences } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const raw = body as Record<string, unknown>;
  const result: UserPreferences = {};

  // Validate "favorites" key if present
  if ('favorites' in raw) {
    const favs = raw.favorites;
    if (!Array.isArray(favs)) {
      return { valid: false, error: '"favorites" must be an array' };
    }
    if (favs.length > MAX_FAVORITES) {
      return { valid: false, error: `"favorites" cannot exceed ${MAX_FAVORITES} items` };
    }
    for (let i = 0; i < favs.length; i++) {
      const err = validateFavoriteLink(favs[i]);
      if (err) {
        return { valid: false, error: `favorites[${i}]: ${err}` };
      }
    }
    result.favorites = favs as FavoriteLink[];
  }

  return { valid: true, data: result };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses the raw `preferences` JSON from the DB into a typed object.
 * Falls back to an empty object if the value is null/malformed.
 */
function parsePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return {};
  // Re-run validation to guarantee shape — silently returns {} on mismatch
  const result = validatePreferences(raw);
  return result.valid ? result.data : {};
}

// ---------------------------------------------------------------------------
// GET /api/auth/me/preferences
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's preferences.
 * Returns `{}` if no preferences have been saved yet.
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const record = await prisma.authUser.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const preferences = parsePreferences(record?.preferences);
    res.json(preferences);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch preferences';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/me/preferences
// ---------------------------------------------------------------------------

/**
 * Merges the provided preferences with the user's existing preferences and
 * persists the result.
 *
 * Only the keys present in the request body are updated; all other keys in
 * the existing preferences are left untouched (shallow merge).
 *
 * Example request body:
 *   { "favorites": [{ "id": "/my-time-off", "label": "My Time Off", "path": "/my-time-off" }] }
 */
router.patch('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate the incoming payload
    const validation = validatePreferences(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Load current preferences so we can merge (not overwrite)
    const current = await prisma.authUser.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const existing = parsePreferences(current?.preferences);
    const merged: UserPreferences = { ...existing, ...validation.data };

    // Persist merged preferences + bump updatedAt
    const updated = await prisma.authUser.update({
      where: { id: userId },
      data: {
        preferences: merged as object,
        updatedAt: new Date(),
      },
      select: { preferences: true },
    });

    const saved = parsePreferences(updated.preferences);
    res.json(saved);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update preferences';
    res.status(500).json({ error: message });
  }
});

export default router;
