import { createCase } from './components/CreateCase';
import { advancePhase } from './components/AdvancePhase';
import { getCase } from './components/GetCase';
import { upgradeSeverity } from './components/UpgradeSeverity';
import { recordSignoff, type SignoffGate } from './components/RecordSignoff';
import { recordCalibration } from './components/RecordCalibration';
import { recordClosureCriteria, type ClosureCriteriaInput } from './components/RecordClosureCriteria';
import { spawnRegressionCase } from './components/SpawnRegressionCase';
import { createCheckIn } from './components/CreateCheckIn';
import { savePhaseFields } from './components/SavePhaseFields';
import { updatePlanEndDate } from './components/UpdatePlanEndDate';
import { attachDocument } from './components/AttachDocument';
import { listDocuments } from './components/ListDocuments';
import { getManagerView } from './components/GetManagerView';
import { getPortfolioSummary } from './components/GetPortfolioSummary';
import { getCasesForHrPartner } from './components/GetCasesForHrPartner';
import { getAllCases } from './components/GetAllCases';
import { deleteDocument } from './components/DeleteDocument';
import { deleteCase } from './components/DeleteCase';
import type {
  AdvancePhaseDTO,
  CreateCheckInDTO,
  CreatePerformanceCaseDTO,
  PerformanceSeverityTier,
} from '@shared/dto';

export class PerformanceCaseOrchestrator {
  async createCase(input: CreatePerformanceCaseDTO, actingUserId: number, actingUserEmail: string) {
    return createCase(input, actingUserId, actingUserEmail);
  }

  async advancePhase(
    caseId: number,
    input: AdvancePhaseDTO,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return advancePhase(caseId, input, actingUserId, actingUserEmail);
  }

  async getCase(caseId: number) {
    return getCase(caseId);
  }

  async upgradeSeverity(
    caseId: number,
    to: PerformanceSeverityTier,
    reason: string,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return upgradeSeverity(caseId, to, reason, actingUserId, actingUserEmail);
  }

  async recordSignoff(caseId: number, gate: SignoffGate, actingUserId: number, actingUserEmail: string) {
    return recordSignoff(caseId, gate, actingUserId, actingUserEmail);
  }

  async recordCalibration(caseId: number, actingUserId: number, actingUserEmail: string) {
    return recordCalibration(caseId, actingUserId, actingUserEmail);
  }

  async recordClosureCriteria(
    caseId: number,
    input: ClosureCriteriaInput,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return recordClosureCriteria(caseId, input, actingUserId, actingUserEmail);
  }

  async spawnRegressionCase(
    priorCaseId: number,
    newSeverityTier: PerformanceSeverityTier,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return spawnRegressionCase(priorCaseId, newSeverityTier, actingUserId, actingUserEmail);
  }

  async createCheckIn(
    caseId: number,
    input: CreateCheckInDTO,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return createCheckIn(caseId, input, actingUserId, actingUserEmail);
  }

  async savePhaseFields(
    caseId: number,
    fields: Record<string, unknown>,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return savePhaseFields(caseId, fields, actingUserId, actingUserEmail);
  }

  async updatePlanEndDate(
    caseId: number,
    newEndDate: string,
    changeComment: string,
    hintForSuccessTriggered: boolean,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return updatePlanEndDate(caseId, newEndDate, changeComment, hintForSuccessTriggered, actingUserId, actingUserEmail);
  }

  async attachDocument(
    caseId: number,
    uploadId: number,
    documentLabel: string | undefined,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    return attachDocument(caseId, uploadId, documentLabel, actingUserId, actingUserEmail);
  }

  async listDocuments(caseId: number) {
    return listDocuments(caseId);
  }

  async getManagerView(requestingTeamMemberId: number) {
    return getManagerView(requestingTeamMemberId);
  }

  async getPortfolioSummary(requestingTeamMemberId: number) {
    return getPortfolioSummary(requestingTeamMemberId);
  }

  async getCasesForHrPartner(hrPartnerTeamMemberId: number) {
    return getCasesForHrPartner(hrPartnerTeamMemberId);
  }

  async getAllCases() {
    return getAllCases();
  }

  async deleteDocument(caseId: number, documentId: number, actingUserEmail: string) {
    return deleteDocument(caseId, documentId, actingUserEmail);
  }

  async deleteCase(
    caseId: number,
    actingUserId: number,
    actingUserEmail: string,
    actingTeamMemberId: number,
  ) {
    return deleteCase(caseId, actingUserId, actingUserEmail, actingTeamMemberId);
  }
}

export const performanceCaseOrchestrator = new PerformanceCaseOrchestrator();
