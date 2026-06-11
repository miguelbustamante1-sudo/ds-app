import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { TpAnonymizationReviewDTO, BatchAnonymizationResult } from '@shared/dto/TpAnonymization';

export type { TpAnonymizationReviewDTO, BatchAnonymizationResult };

export const anonymizationApi = {
  getForCycle: (cycId: number): Promise<TpAnonymizationReviewDTO[]> =>
    apiGet<TpAnonymizationReviewDTO[]>(`/api/top-performers/anonymization?cycId=${cycId}`),

  triggerBatch: (cycId: number): Promise<BatchAnonymizationResult> =>
    apiPost<BatchAnonymizationResult, Record<string, never>>(`/api/top-performers/cycles/${cycId}/anonymize`, {}),

  approve: (nomId: number, editedText?: string): Promise<{ nomId: number; status: string }> =>
    apiPatch<{ nomId: number; status: string }, { editedText?: string }>(
      `/api/top-performers/anonymization/${nomId}/approve`,
      { editedText }
    ),
};
