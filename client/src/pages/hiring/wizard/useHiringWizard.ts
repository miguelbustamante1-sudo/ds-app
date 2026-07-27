import { useCallback, useEffect, useState } from 'react';
import type { EndorsementWithDetailsDTO, HiringDTO } from '@shared/dto';
import { apiGet, ApiError } from '@/lib/api';
import type { WizardState } from './types';

function computeState(
  endorsement: EndorsementWithDetailsDTO | null,
  hiring: HiringDTO | null,
): WizardState {
  if (!endorsement) return 'S0';
  if (endorsement.status === 'Pending') return 'S1';
  if (endorsement.status === 'Rejected') return 'S2';

  // Approved from here on.
  if (!hiring) return 'S3';
  if (hiring.status === 'Processed') return 'S6';
  if (hiring.status === 'Pending') {
    return hiring.workdayId ? 'S5' : 'S4';
  }
  // Defensive fallback for an unexpected hiring.status value.
  return 'S3';
}

/**
 * Loads the endorsement (+ its hiring record, if any) for the wizard's route param
 * and computes which state of the Sprint 2 state machine currently applies.
 */
export function useHiringWizard(endorsementId?: number) {
  const [endorsement, setEndorsement] = useState<EndorsementWithDetailsDTO | null>(null);
  const [hiring, setHiring] = useState<HiringDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (endorsementId == null) {
      setEndorsement(null);
      setHiring(null);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [endorsementData, hiringData] = await Promise.all([
        apiGet<EndorsementWithDetailsDTO>(`/api/endorsements/${endorsementId}`),
        apiGet<HiringDTO | null>(`/api/hiring/by-endorsement/${endorsementId}`),
      ]);
      setEndorsement(endorsementData);
      setHiring(hiringData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load hiring wizard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endorsementId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const currentStep = computeState(endorsement, hiring);

  return { currentStep, endorsement, hiring, loading, error, refetch };
}
