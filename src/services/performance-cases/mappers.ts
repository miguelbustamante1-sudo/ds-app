import type { PerformanceCase, PerformanceCasePhase } from '@prisma/client';
import type { PerformanceCaseDTO, PerformanceCasePhaseDTO, SeverityTierHistoryEntry } from '@shared/dto';

export function toPerformanceCaseDTO(row: PerformanceCase): PerformanceCaseDTO {
  return {
    caseId: row.caseId,
    caseCode: row.caseCode,
    caseLabel: row.caseLabel,
    teamMemberId: row.teamMemberId,
    teamLeaderId: row.teamLeaderId,
    severityTier: row.severityTier as PerformanceCaseDTO['severityTier'],
    severityTierHistory: row.severityTierHistory as unknown as SeverityTierHistoryEntry[],
    currentPhase: row.currentPhase as PerformanceCaseDTO['currentPhase'],
    caseStatus: row.caseStatus as PerformanceCaseDTO['caseStatus'],
    rcaType: row.rcaType as PerformanceCaseDTO['rcaType'],
    omId: row.omId,
    agmId: row.agmId,
    directorId: row.directorId,
    hrPartnerId: row.hrPartnerId,
    managerName: row.managerName,
    managerEmail: row.managerEmail,
    rcaSignoffBy: row.rcaSignoffBy,
    rcaSignoffDate: row.rcaSignoffDate?.toISOString() ?? null,
    closureSignoffBy: row.closureSignoffBy,
    closureSignoffDate: row.closureSignoffDate?.toISOString() ?? null,
    calibrationRequired: row.calibrationRequired,
    calibrationCompletedDate: row.calibrationCompletedDate?.toISOString() ?? null,
    linkedPriorCaseId: row.linkedPriorCaseId,
    clientConfirmedImprovement: row.clientConfirmedImprovement,
    metricImprovedVsBaseline: row.metricImprovedVsBaseline,
    noNewEscalationLast2Weeks: row.noNewEscalationLast2Weeks,
    createdBy: row.createdBy,
    createdDate: row.createdDate.toISOString(),
    updatedBy: row.updatedBy,
    updatedDate: row.updatedDate?.toISOString() ?? null,
  };
}

export function toPerformanceCasePhaseDTO(row: PerformanceCasePhase): PerformanceCasePhaseDTO {
  return {
    phasePkId: row.phasePkId,
    caseId: row.caseId,
    phase: row.phase as PerformanceCasePhaseDTO['phase'],
    status: row.status as PerformanceCasePhaseDTO['status'],
    startedDate: row.startedDate?.toISOString() ?? null,
    completedDate: row.completedDate?.toISOString() ?? null,
    completedBy: row.completedBy,
    etaDate: row.etaDate?.toISOString() ?? null,
    fields: row.fields as Record<string, unknown>,
  };
}
