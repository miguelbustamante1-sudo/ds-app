import { useState, useCallback } from 'react';
import { getCompensatoryTimeBalance, type CompensatoryTimeBalance } from '@/services/compensatoryTime';

export function useCompTimeBalance() {
  const [balance, setBalance] = useState<CompensatoryTimeBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async (teamMemberId: number) => {
    setLoading(true);
    try {
      const data = await getCompensatoryTimeBalance(teamMemberId);
      setBalance(data);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { balance, loading, fetchBalance };
}
