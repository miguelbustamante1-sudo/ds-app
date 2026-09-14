import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type {
  CreatePerformanceCaseDTO,
  PerformanceCaseDTO,
  PerformanceCasePhaseDTO,
  PerformanceCasePhaseName,
  AdvancePhaseDTO,
  CreateCheckInDTO,
  PerformanceCaseCheckInDTO,
  PerformanceSeverityTier,
  SavePhaseFieldsDTO,
  UpdatePlanEndDateDTO,
} from '@shared/dto';

export function createPerformanceCase(input: CreatePerformanceCaseDTO): Promise<PerformanceCaseDTO> {
  return apiPost<PerformanceCaseDTO, CreatePerformanceCaseDTO>('/api/performance-cases', input);
}

export function getAllCases(): Promise<PerformanceCaseDTO[]> {
  return apiGet<PerformanceCaseDTO[]>('/api/performance-cases');
}

export function getPerformanceCase(caseId: number): Promise<PerformanceCaseDTO> {
  return apiGet<PerformanceCaseDTO>(`/api/performance-cases/${caseId}`);
}

export function getCasePhases(caseId: number): Promise<PerformanceCasePhaseDTO[]> {
  return apiGet<PerformanceCasePhaseDTO[]>(`/api/performance-cases/${caseId}/phases`);
}

export function deleteCase(caseId: number): Promise<void> {
  return apiDelete<void>(`/api/performance-cases/${caseId}`);
}

export function advancePhase(caseId: number, input: AdvancePhaseDTO): Promise<PerformanceCaseDTO> {
  return apiPost<PerformanceCaseDTO, AdvancePhaseDTO>(`/api/performance-cases/${caseId}/advance-phase`, input);
}

export function savePhaseFields(
  caseId: number,
  fields: Record<string, unknown>,
): Promise<PerformanceCasePhaseDTO> {
  return apiPost<PerformanceCasePhaseDTO, Record<string, unknown>>(
    `/api/performance-cases/${caseId}/phase-fields`,
    fields,
  );
}

export function saveCompletedPhaseFields(
  caseId: number,
  phase: PerformanceCasePhaseName,
  fields: Record<string, unknown>,
): Promise<PerformanceCasePhaseDTO> {
  return apiPut<PerformanceCasePhaseDTO, SavePhaseFieldsDTO>(
    `/api/performance-cases/${caseId}/phases/${phase}/fields`,
    { fields },
  );
}

export function upgradeSeverity(
  caseId: number,
  to: PerformanceSeverityTier,
  reason: string,
): Promise<PerformanceCaseDTO> {
  return apiPost<PerformanceCaseDTO, { to: PerformanceSeverityTier; reason: string }>(
    `/api/performance-cases/${caseId}/upgrade-severity`,
    { to, reason },
  );
}

export function recordSignoff(caseId: number, gate: 'rca' | 'closure'): Promise<PerformanceCaseDTO> {
  return apiPost<PerformanceCaseDTO, { gate: 'rca' | 'closure' }>(`/api/performance-cases/${caseId}/signoff`, {
    gate,
  });
}

export function recordCalibration(caseId: number): Promise<PerformanceCaseDTO> {
  return apiPost<PerformanceCaseDTO, Record<string, never>>(`/api/performance-cases/${caseId}/calibration`, {});
}

export function recordClosureCriteria(
  caseId: number,
  input: Record<string, unknown>,
): Promise<PerformanceCaseDTO> {
  return apiPost<PerformanceCaseDTO, Record<string, unknown>>(
    `/api/performance-cases/${caseId}/closure-criteria`,
    input,
  );
}

export function createCheckIn(caseId: number, input: CreateCheckInDTO): Promise<PerformanceCaseCheckInDTO> {
  return apiPost<PerformanceCaseCheckInDTO, CreateCheckInDTO>(`/api/performance-cases/${caseId}/checkins`, input);
}

export interface CaseDocumentDTO {
  documentId: number;
  caseId: number;
  uploadId: number;
  documentLabel: string | null;
  createdDate: string;
  originalName: string;
}

export function listDocuments(caseId: number): Promise<CaseDocumentDTO[]> {
  return apiGet<CaseDocumentDTO[]>(`/api/performance-cases/${caseId}/documents`);
}

export function deleteDocument(caseId: number, documentId: number): Promise<void> {
  return apiDelete<void>(`/api/performance-cases/${caseId}/documents/${documentId}`);
}

export function attachDocument(
  caseId: number,
  uploadId: number,
  documentLabel?: string,
): Promise<CaseDocumentDTO> {
  return apiPost<CaseDocumentDTO, { uploadId: number; documentLabel?: string }>(
    `/api/performance-cases/${caseId}/documents`,
    { uploadId, documentLabel },
  );
}

export interface ManagerViewRow {
  caseId: number;
  caseCode: string;
  teamMemberId: number;
  teamMemberName: string | null;
  teamLeaderId: number;
  severityTier: string;
  currentPhase: string;
  caseStatus: string;
  nextEtaDate: string | null;
  isEtaOverdue: boolean;
  hasMissingManagerFeedback: boolean;
}

export function getManagerView(): Promise<ManagerViewRow[]> {
  return apiGet<ManagerViewRow[]>('/api/performance-cases/manager-view');
}

export interface PortfolioSummary {
  countByTier: Record<string, number>;
  countByPhase: Record<string, number>;
  atRiskCaseIds: number[];
  atRiskCases: { caseId: number; caseCode: string }[];
  tlStrikeCounts: { teamLeaderId: number; teamLeaderName: string; strikeCount: number }[];
}

export function getPortfolioSummary(): Promise<PortfolioSummary> {
  return apiGet<PortfolioSummary>('/api/performance-cases/portfolio-summary');
}

export function getHrPartnerView(): Promise<PerformanceCaseDTO[]> {
  return apiGet<PerformanceCaseDTO[]>('/api/performance-cases/hr-partner-view');
}

export function updatePlanEndDate(caseId: number, input: UpdatePlanEndDateDTO): Promise<PerformanceCasePhaseDTO> {
  return apiPost<PerformanceCasePhaseDTO, UpdatePlanEndDateDTO>(`/api/performance-cases/${caseId}/plan-end-date`, input);
}
