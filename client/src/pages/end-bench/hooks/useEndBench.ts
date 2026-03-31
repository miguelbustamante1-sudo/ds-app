import { useState, useCallback } from 'react';
import { apiPatch, ApiError } from '@/lib/api';
import type { BenchMoveDetailDTO, EndBenchDTO } from '@shared/dto';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface UseEndBenchOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface UseEndBenchResult {
  selectedTeamMemberId: number | null;
  endDate: string;
  isConfirmOpen: boolean;
  isSubmitting: boolean;
  validationError: string | null;
  setTeamMember: (id: number | null) => void;
  setEndDate: (date: string) => void;
  openConfirm: (activeBenchRecord: BenchMoveDetailDTO) => void;
  closeConfirm: () => void;
  submitEndBench: (benchId: number) => Promise<void>;
  resetForm: () => void;
}

export function useEndBench(options?: UseEndBenchOptions): UseEndBenchResult {
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<number | null>(null);
  const [endDate, setEndDateValue] = useState<string>(todayISO());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const setTeamMember = useCallback((id: number | null) => {
    setSelectedTeamMemberId(id);
    setValidationError(null);
  }, []);

  const setEndDate = useCallback((date: string) => {
    setEndDateValue(date);
  }, []);

  const openConfirm = useCallback(
    (activeBenchRecord: BenchMoveDetailDTO) => {
      setValidationError(null);

      if (!endDate) {
        setValidationError('Please set an end date.');
        return;
      }
      if (endDate < activeBenchRecord.startDate.split('T')[0]) {
        setValidationError('End date must be on or after the bench start date.');
        return;
      }

      setIsConfirmOpen(true);
    },
    [endDate],
  );

  const closeConfirm = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  const submitEndBench = useCallback(
    async (benchId: number) => {
      setIsSubmitting(true);
      try {
        const dto: EndBenchDTO = { endDate };
        await apiPatch<{ success: boolean }, EndBenchDTO>(
          `/api/bench-move/${benchId}/end`,
          dto,
        );
        setIsConfirmOpen(false);
        options?.onSuccess?.('Bench period ended successfully.');
        // Reset form to initial state
        setSelectedTeamMemberId(null);
        setEndDateValue(todayISO());
        setValidationError(null);
      } catch (err) {
        setIsConfirmOpen(false);
        const message = err instanceof ApiError ? err.message : 'Failed to end bench period';
        options?.onError?.(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [endDate, options],
  );

  const resetForm = useCallback(() => {
    setSelectedTeamMemberId(null);
    setEndDateValue(todayISO());
    setIsConfirmOpen(false);
    setValidationError(null);
  }, []);

  return {
    selectedTeamMemberId,
    endDate,
    isConfirmOpen,
    isSubmitting,
    validationError,
    setTeamMember,
    setEndDate,
    openConfirm,
    closeConfirm,
    submitEndBench,
    resetForm,
  };
}
