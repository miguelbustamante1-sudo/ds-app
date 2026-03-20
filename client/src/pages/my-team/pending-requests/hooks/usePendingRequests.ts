import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { PendingRequest } from '@shared/dto/PendingRequest';

export function usePendingRequests() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PendingRequest[]>('/api/team/pending-requests');
      setRequests(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, []);

  return { requests, loading, error, loadRequests };
}
