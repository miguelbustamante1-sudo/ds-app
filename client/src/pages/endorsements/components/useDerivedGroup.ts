import { useState, useCallback, useEffect } from 'react';
import type { DerivedGroupDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';

/**
 * Derives a Group from Position (+ Technology). Both DTO fields are null when no mapping
 * row exists yet — the caller should fall back to the manual Group picker in that case.
 * `requiresTechnology` gates the call so we don't derive from Position alone for a
 * position that actually needs a Technology first (e.g. Back End Developer).
 */
export function useDerivedGroup(posId: number | null, tecId: number | null, requiresTechnology: boolean) {
  const [group, setGroup] = useState<DerivedGroupDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGroup = useCallback(async (pos: number, tec: number | null) => {
    try {
      setLoading(true);
      const query = tec != null ? `posId=${pos}&tecId=${tec}` : `posId=${pos}`;
      const data = await apiGet<DerivedGroupDTO>(`/api/position-groups/derive?${query}`);
      setGroup(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to derive group';
      console.error(message);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (posId == null || (requiresTechnology && tecId == null)) {
      setGroup(null);
      return;
    }
    loadGroup(posId, tecId);
  }, [posId, tecId, requiresTechnology, loadGroup]);

  return { group, loading };
}
