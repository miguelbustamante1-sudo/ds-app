import { useState, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { BenchMoveDetailDTO } from '@shared/dto';

interface UseActiveBenchRecordResult {
  activeBenchRecord: BenchMoveDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  fetchActiveBench: (teamMemberId: number) => Promise<void>;
  reset: () => void;
}

export function useActiveBenchRecord(): UseActiveBenchRecordResult {
  const [activeBenchRecord, setActiveBenchRecord] = useState<BenchMoveDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveBench = useCallback(async (teamMemberId: number) => {
    setIsLoading(true);
    setError(null);
    setActiveBenchRecord(null);
    try {
      const record = await apiGet<BenchMoveDetailDTO>(
        `/api/bench-move/active?teamMemberId=${teamMemberId}`,
      );
      setActiveBenchRecord(record);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // No active bench record — this is an expected state, not an error
        setActiveBenchRecord(null);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load bench record';
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setActiveBenchRecord(null);
    setError(null);
  }, []);

  return { activeBenchRecord, isLoading, error, fetchActiveBench, reset };
}
