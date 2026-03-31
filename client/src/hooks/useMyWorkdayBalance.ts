import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

export interface WorkdayBalance {
  vacation: number;
  personalDays: number;
  exceptionDaysUsed: number;
  exceptionDaysRemaining: number;
}

export function useMyWorkdayBalance() {
  const [balance, setBalance] = useState<WorkdayBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(() => {
    setLoading(true);
    apiGet<WorkdayBalance>('/api/time-offs/my-requests/workday-balance')
      .then((data) => setBalance(data))
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetchBalance: fetchBalance };
}
