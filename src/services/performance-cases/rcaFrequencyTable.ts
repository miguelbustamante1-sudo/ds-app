import type { PerformanceRcaType } from '@shared/dto';

export interface RcaTypeConfig {
  planDurationWeeksMin: number;
  planDurationWeeksMax: number;
  followUpFrequencyDays: number;
}

export const RCA_TYPE_CONFIG: Record<PerformanceRcaType, RcaTypeConfig> = {
  ATTITUDE: { planDurationWeeksMin: 2, planDurationWeeksMax: 4, followUpFrequencyDays: 7 },
  KNOWLEDGE: { planDurationWeeksMin: 4, planDurationWeeksMax: 8, followUpFrequencyDays: 14 },
  SKILL: { planDurationWeeksMin: 6, planDurationWeeksMax: 12, followUpFrequencyDays: 14 },
  RESOURCES: { planDurationWeeksMin: 2, planDurationWeeksMax: 4, followUpFrequencyDays: 7 },
  COMBINED: { planDurationWeeksMin: 4, planDurationWeeksMax: 8, followUpFrequencyDays: 7 },
};

// Critical-Attitude is Attitude RCA type on a CRITICAL-severity case — frequency doubles per spec §4.
export function resolveFollowUpFrequencyDays(rcaType: PerformanceRcaType, isCritical: boolean): number {
  const base = RCA_TYPE_CONFIG[rcaType].followUpFrequencyDays;
  if (rcaType === 'ATTITUDE' && isCritical) return Math.round(base / 2); // 2x/week
  return base;
}

export function computeNextCheckInDate(lastCheckInDate: Date, rcaType: PerformanceRcaType, isCritical: boolean): Date {
  const frequencyDays = resolveFollowUpFrequencyDays(rcaType, isCritical);
  const result = new Date(lastCheckInDate);
  result.setDate(result.getDate() + frequencyDays);
  return result;
}
