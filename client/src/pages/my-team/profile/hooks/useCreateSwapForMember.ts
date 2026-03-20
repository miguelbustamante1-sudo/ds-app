import { useState } from 'react';
import { apiPost } from '@/lib/api';
import type { CreateHolidaySwapDTO, HolidaySwapDTO } from '@shared/dto/HolidaySwap';

interface UseCreateSwapForMemberOptions {
  onSuccess?: (swap: HolidaySwapDTO) => void;
  onError?: (message: string) => void;
}

export function useCreateSwapForMember({ onSuccess, onError }: UseCreateSwapForMemberOptions = {}) {
  const [loading, setLoading] = useState(false);

  async function createSwap(teamMemberId: number, input: CreateHolidaySwapDTO) {
    setLoading(true);
    try {
      const swap = await apiPost<HolidaySwapDTO>(`/api/holiday-swaps/team/${teamMemberId}`, input);
      onSuccess?.(swap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create swap';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  return { createSwap, loading };
}
