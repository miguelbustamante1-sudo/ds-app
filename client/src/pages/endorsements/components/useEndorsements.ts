import { useState, useCallback } from 'react';
import type { EndorsementWithDetailsDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';

export function useEndorsements() {
  const [endorsements, setEndorsements] = useState<EndorsementWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEndorsements = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      setError(null);
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiGet<EndorsementWithDetailsDTO[]>(`/api/endorsements${query}`);
      setEndorsements(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load endorsements';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { endorsements, loading, error, loadEndorsements };
}
