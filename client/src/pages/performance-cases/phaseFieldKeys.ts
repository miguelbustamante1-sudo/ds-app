import type { PerformanceCasePhaseName } from '@shared/dto';

export interface PhaseFieldSpec {
  key: string;
  label: string;
  type: 'textarea' | 'combobox' | 'date';
  options?: { value: string; label: string }[];
}

const RCA_TYPE_OPTIONS = [
  { value: 'ATTITUDE', label: 'Attitude' },
  { value: 'KNOWLEDGE', label: 'Knowledge' },
  { value: 'SKILL', label: 'Skill' },
  { value: 'RESOURCES', label: 'Resources' },
  { value: 'COMBINED', label: 'Combined' },
];

// Mirrors PHASE_REQUIRED_FIELDS in src/services/performance-cases/phaseConfig.ts —
// the backend only needs the flat key list (validation), this frontend model adds
// label/type/options for rendering.
export const PHASE_FIELD_SPECS: Record<PerformanceCasePhaseName, PhaseFieldSpec[]> = {
  PHASE_0: [{ key: 'intakeSummary', label: 'Intake Summary', type: 'textarea' }],
  PHASE_1: [{ key: 'feedbackMeetingNotes', label: 'Feedback Meeting Notes', type: 'textarea' }],
  PHASE_2: [
    { key: 'rcaDocument', label: 'RCA Document', type: 'textarea' },
    { key: 'rcaType', label: 'RCA Type', type: 'combobox', options: RCA_TYPE_OPTIONS },
  ],
  PHASE_3: [
    { key: 'actionPlan', label: 'Action Plan', type: 'textarea' },
    { key: 'managerCommitment', label: 'Manager Commitment', type: 'textarea' },
  ],
  PHASE_4: [{ key: 'tmAcceptanceDate', label: 'TM Acceptance Date', type: 'date' }],
  PHASE_5: [{ key: 'weeklyUpdate', label: 'Weekly Update', type: 'textarea' }],
  PHASE_6: [{ key: 'closureSummary', label: 'Closure Summary', type: 'textarea' }],
  POST_CLOSURE: [],
};
