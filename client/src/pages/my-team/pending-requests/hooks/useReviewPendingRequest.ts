import { useState, useCallback } from 'react';
import { apiPatch } from '@/lib/api';
import type { PendingRequest } from '@shared/dto/PendingRequest';

interface UseReviewPendingRequestOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function useReviewPendingRequest(options: UseReviewPendingRequestOptions = {}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const acknowledge = useCallback(
    async (request: PendingRequest, acknowledgedStatusId: number) => {
      const key = `${request.type}-${request.entityId}-ack`;
      setLoadingId(key);
      try {
        if (request.type === 'HolidaySwap') {
          await apiPatch(`/api/holiday-swaps/${request.entityId}/review`, { statusId: acknowledgedStatusId });
        } else {
          await apiPatch(`/api/time-offs/supervisor/${request.entityId}/acknowledge`, { comment: 'Acknowledged by supervisor' });
        }
        options.onSuccess?.();
      } catch (err: unknown) {
        options.onError?.(err instanceof Error ? err.message : 'Failed to acknowledge request');
      } finally {
        setLoadingId(null);
      }
    },
    [options],
  );

  const cancel = useCallback(
    async (request: PendingRequest, cancelledStatusId: number) => {
      const key = `${request.type}-${request.entityId}-cancel`;
      setLoadingId(key);
      try {
        if (request.type === 'HolidaySwap') {
          await apiPatch(`/api/holiday-swaps/${request.entityId}/review`, { statusId: cancelledStatusId });
        } else {
          await apiPatch(`/api/time-offs/supervisor/${request.entityId}/cancel`, {
            comment: 'Cancelled by supervisor',
          });
        }
        options.onSuccess?.();
      } catch (err: unknown) {
        options.onError?.(err instanceof Error ? err.message : 'Failed to cancel request');
      } finally {
        setLoadingId(null);
      }
    },
    [options],
  );

  const isLoading = (request: PendingRequest, action: 'ack' | 'cancel') =>
    loadingId === `${request.type}-${request.entityId}-${action}`;

  return { acknowledge, cancel, isLoading, busy: loadingId !== null };
}
