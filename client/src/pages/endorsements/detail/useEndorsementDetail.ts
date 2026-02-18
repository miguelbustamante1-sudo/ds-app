import { useState, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { EndorsementWithDetailsDTO, EndorsementBonusDTO } from '@shared/dto';

export interface UseEndorsementDetailResult {
  endorsement: EndorsementWithDetailsDTO | null;
  bonuses: EndorsementBonusDTO[];
  loading: boolean;
  error: number | null;
  load: (id: number) => Promise<void>;
  reload: (id: number) => void;
}

export function useEndorsementDetail(): UseEndorsementDetailResult {
  const [endorsement, setEndorsement] = useState<EndorsementWithDetailsDTO | null>(null);
  const [bonuses, setBonuses] = useState<EndorsementBonusDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<number | null>(null);

  const load = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const [endorsementData, bonusData] = await Promise.all([
        apiGet<EndorsementWithDetailsDTO>(`/api/endorsements/${id}`),
        apiGet<EndorsementBonusDTO[]>(`/api/endorsement-bonuses?endorsementId=${id}`),
      ]);
      setEndorsement(endorsementData);
      setBonuses(bonusData);
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

  const reload = useCallback((id: number) => { load(id); }, [load]);

  return { endorsement, bonuses, loading, error, load, reload };
}
