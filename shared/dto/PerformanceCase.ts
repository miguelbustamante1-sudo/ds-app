export type PerformanceSeverityTier = 'STANDARD' | 'HIGH' | 'CRITICAL';
export type PerformanceCasePhaseName =
  | 'PHASE_0'
  | 'PHASE_1'
  | 'PHASE_2'
  | 'PHASE_3'
  | 'PHASE_4'
  | 'PHASE_5'
  | 'PHASE_6'
  | 'POST_CLOSURE';
export type PerformanceCaseStatus = 'ACTIVE' | 'CLOSED_SUCCESSFUL' | 'CLOSED_ESCALATED' | 'REGRESSED';
export type PerformanceRcaType = 'ATTITUDE' | 'KNOWLEDGE' | 'SKILL' | 'RESOURCES' | 'COMBINED';
export type PerformancePhaseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
export type PerformanceCheckInStatus = 'ON_TRACK' | 'AT_RISK' | 'NO_PROGRESS';
export type PostClosureCheckpoint = 'DAY_15' | 'DAY_30' | 'DAY_60';
export type PostClosureStatus = 'ON_TRACK' | 'AT_RISK' | 'REGRESSION';

export interface SeverityTierHistoryEntry {
  from: PerformanceSeverityTier;
  to: PerformanceSeverityTier;
  reason: string;
  changedBy: number;
  changedDate: string;
}

export interface CreatePerformanceCaseDTO {
  teamMemberId: number;
  teamLeaderId: number;
  severityTier: PerformanceSeverityTier;
  managerName: string;
  managerEmail: string;
  caseLabel?: string;
}

export interface PerformanceCaseDTO {
  caseId: number;
  caseCode: string;
  caseLabel: string | null;
  teamMemberId: number;
  teamLeaderId: number;
  severityTier: PerformanceSeverityTier;
  severityTierHistory: SeverityTierHistoryEntry[];
  currentPhase: PerformanceCasePhaseName;
  caseStatus: PerformanceCaseStatus;
  rcaType: PerformanceRcaType | null;
  omId: number | null;
  agmId: number | null;
  directorId: number | null;
  hrPartnerId: number | null;
  managerName: string | null;
  managerEmail: string | null;
  rcaSignoffBy: number | null;
  rcaSignoffDate: string | null;
  closureSignoffBy: number | null;
  closureSignoffDate: string | null;
  calibrationRequired: boolean;
  calibrationCompletedDate: string | null;
  linkedPriorCaseId: number | null;
  clientConfirmedImprovement: boolean | null;
  metricImprovedVsBaseline: boolean | null;
  noNewEscalationLast2Weeks: boolean | null;
  createdBy: number;
  createdDate: string;
  updatedBy: number | null;
  updatedDate: string | null;
}

export interface PerformanceCasePhaseDTO {
  phasePkId: number;
  caseId: number;
  phase: PerformanceCasePhaseName;
  status: PerformancePhaseStatus;
  startedDate: string | null;
  completedDate: string | null;
  completedBy: number | null;
  etaDate: string | null;
  fields: Record<string, unknown>;
}

export interface AdvancePhaseDTO {
  fields: Record<string, unknown>;
}

export interface CreateCheckInDTO {
  checkInDate: string;
  tmUpdate: string;
  managerFeedbackReceived: boolean;
  status: PerformanceCheckInStatus;
}

export interface PerformanceCaseCheckInDTO {
  checkInId: number;
  caseId: number;
  checkInDate: string;
  tmUpdate: string | null;
  managerFeedbackReceived: boolean;
  status: PerformanceCheckInStatus;
  emailSent: boolean;
}

export interface UpdatePlanEndDateDTO {
  newEndDate: string;
  changeComment: string;
  hintForSuccessTriggered: boolean;
}

export interface SavePhaseFieldsDTO {
  fields: Record<string, unknown>;
}
