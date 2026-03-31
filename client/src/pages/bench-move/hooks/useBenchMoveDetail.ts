import { useState, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { BenchMoveDetailDTO } from '@shared/dto';

export function useBenchMoveDetail() {
  const [detail, setDetail] = useState<BenchMoveDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);

  const loadDetail = useCallback(async (benchId: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<BenchMoveDetailDTO>(`/api/bench-move/${benchId}`);
      setDetail(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status);
      } else {
        setError(500);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { detail, loading, error, loadDetail };
}
