import type { PerformanceCasePhaseName } from '@shared/dto';

function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

const PHASE_ETA_BUSINESS_DAYS: Partial<Record<PerformanceCasePhaseName, number>> = {
  PHASE_1: 3,
  PHASE_2: 5,
  PHASE_3: 5,
  PHASE_4: 3,
  PHASE_6: 5,
};

export function computePhaseEtaDate(phase: PerformanceCasePhaseName, phaseStartedDate: Date): Date | null {
  if (phase === 'PHASE_0') {
    const result = new Date(phaseStartedDate);
    result.setHours(result.getHours() + 24);
    return result;
  }
  const days = PHASE_ETA_BUSINESS_DAYS[phase];
  if (days === undefined) return null;
  return addBusinessDays(phaseStartedDate, days);
}
