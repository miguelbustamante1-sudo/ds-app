import { useState, useCallback, useEffect } from 'react';
import type { TechnologyDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';

/**
 * Technologies the given position varies its Group by. An empty array means the position
 * has a single fixed Group (or isn't mapped yet) — the caller should not show a Technology
 * selector in that case.
 */
export function useTechnologiesForPosition(posId: number | null) {
  const [technologies, setTechnologies] = useState<TechnologyDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTechnologies = useCallback(async (pos: number) => {
    try {
      setLoading(true);
      const data = await apiGet<TechnologyDTO[]>(`/api/position-groups/technologies?posId=${pos}`);
      setTechnologies(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load technologies';
      console.error(message);
      setTechnologies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (posId == null) {
      setTechnologies([]);
      return;
    }
    loadTechnologies(posId);
  }, [posId, loadTechnologies]);

  return { technologies, loading };
}
