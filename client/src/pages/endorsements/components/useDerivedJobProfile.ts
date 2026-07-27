import { useState, useCallback, useEffect } from 'react';
import type { DerivedJobProfileDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';

export function useDerivedJobProfile(
  posId: number | null,
  tibId: number | null,
  sklId: number | null,
  grpId: number | null,
) {
  const [jobProfile, setJobProfile] = useState<DerivedJobProfileDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const loadJobProfile = useCallback(async (pos: number, tib: number, skl: number, grp: number) => {
    try {
      setLoading(true);
      const data = await apiGet<DerivedJobProfileDTO>(
        `/api/job-profiles/derive?posId=${pos}&tibId=${tib}&sklId=${skl}&grpId=${grp}`,
      );
      setJobProfile(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to derive job profile';
      console.error(message);
      setJobProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (posId == null || tibId == null || sklId == null || grpId == null) {
      setJobProfile(null);
      return;
    }
    loadJobProfile(posId, tibId, sklId, grpId);
  }, [posId, tibId, sklId, grpId, loadJobProfile]);

  return { jobProfile, loading };
}
