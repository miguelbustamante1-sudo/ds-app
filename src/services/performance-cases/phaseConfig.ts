import type { PerformanceCasePhaseName } from '@shared/dto';

export const PHASE_ORDER: PerformanceCasePhaseName[] = [
  'PHASE_0', 'PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5', 'PHASE_6', 'POST_CLOSURE',
];

export const PHASE_REQUIRED_FIELDS: Record<PerformanceCasePhaseName, string[]> = {
  PHASE_0: ['intakeSummary'],
  PHASE_1: ['feedbackMeetingNotes'],
  PHASE_2: ['rcaDocument', 'rcaType'],
  PHASE_3: ['actionPlan', 'managerCommitment'],
  PHASE_4: ['tmAcceptanceDate'],
  PHASE_5: ['weeklyUpdate'],
  PHASE_6: ['closureSummary'],
  POST_CLOSURE: [],
};

export function nextPhase(current: PerformanceCasePhaseName): PerformanceCasePhaseName | null {
  const index = PHASE_ORDER.indexOf(current);
  if (index === -1 || index === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[index + 1] ?? null;
}
