import { useState, useCallback } from 'react';
import type { EndorsementWithDetailsDTO, HiringDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';

export function useHiring() {
  const [pendingApprovalList, setPendingApprovalList] = useState<EndorsementWithDetailsDTO[]>([]);
  const [draftList, setDraftList] = useState<EndorsementWithDetailsDTO[]>([]);
  const [pendingList, setPendingList] = useState<HiringDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPendingApprovalList = useCallback(async () => {
    const data = await apiGet<EndorsementWithDetailsDTO[]>('/api/hiring/pending-approval');
    setPendingApprovalList(data);
  }, []);

  const loadDraftList = useCallback(async () => {
    const data = await apiGet<EndorsementWithDetailsDTO[]>('/api/hiring/endorsements');
    setDraftList(data);
  }, []);

  const loadPendingList = useCallback(async () => {
    const data = await apiGet<HiringDTO[]>('/api/hiring/pending');
    setPendingList(data);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadPendingApprovalList(), loadDraftList(), loadPendingList()]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load hiring data';
      console.error(message);
    } finally {
      setLoading(false);
    }
  }, [loadPendingApprovalList, loadDraftList, loadPendingList]);

  return {
    pendingApprovalList,
    draftList,
    pendingList,
    loading,
    loadAll,
  };
}
