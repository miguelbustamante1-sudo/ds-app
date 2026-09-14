import { createCase } from './components/CreateCase';
import { advancePhase } from './components/AdvancePhase';
import { getCase } from './components/GetCase';
import { getCasePhases } from './components/GetCasePhases';
import { upgradeSeverity } from './components/UpgradeSeverity';
import { recordSignoff, type SignoffGate } from './components/RecordSignoff';
import { recordCalibration } from './components/RecordCalibration';
import { recordClosureCriteria, type ClosureCriteriaInput } from './components/RecordClosureCriteria';
import { spawnRegressionCase } from './components/SpawnRegressionCase';
import { createCheckIn } from './components/CreateCheckIn';
import { listCheckIns } from './components/ListCheckIns';
import { savePhaseFields } from './components/SavePhaseFields';
import { saveCompletedPhaseFields } from './components/SaveCompletedPhaseFields';
import { updatePlanEndDate } from './components/UpdatePlanEndDate';
import { attachDocument } from './components/AttachDocument';
import { listDocuments } from './components/ListDocuments';
import { getManagerView } from './components/GetManagerView';
import { getPortfolioSummary } from './components/GetPortfolioSummary';
import { getCasesForHrPartner } from './components/GetCasesForHrPartner';
import { getAllCases } from './components/GetAllCases';
import { deleteDocument } from './components/DeleteDocument';
import { deleteCase } from './components/DeleteCase';
import { getManagerForTeamMember } from './components/GetManagerForTeamMember';
import { assertCaseAccess, type CaseActor } from './components/ResolveCaseAccess';
import type {
  AdvancePhaseDTO,
  CreateCheckInDTO,
  CreatePerformanceCaseDTO,
  PerformanceCasePhaseName,
  PerformanceSeverityTier,
} from '@shared/dto';

export type { CaseActor };

export class PerformanceCaseOrchestrator {
  async createCase(input: CreatePerformanceCaseDTO, actingUserId: number, actingUserEmail: string) {
    return createCase(input, actingUserId, actingUserEmail);
  }

  async advancePhase(
    caseId: number,
    input: AdvancePhaseDTO,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return advancePhase(caseId, input, actingUserId, actingUserEmail);
  }

  async getCase(caseId: number, actor: CaseActor) {
    return getCase(caseId, actor);
  }

  async getManagerForTeamMember(teamMemberId: number) {
    return getManagerForTeamMember(teamMemberId);
  }

  async getCasePhases(caseId: number, actor: CaseActor) {
    await assertCaseAccess(caseId, actor);
    return getCasePhases(caseId);
  }

  async upgradeSeverity(
    caseId: number,
    to: PerformanceSeverityTier,
    reason: string,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return upgradeSeverity(caseId, to, reason, actingUserId, actingUserEmail);
  }

  async recordSignoff(
    caseId: number,
    gate: SignoffGate,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return recordSignoff(caseId, gate, actor, actingUserId, actingUserEmail);
  }

  async recordCalibration(caseId: number, actor: CaseActor, actingUserId: number, actingUserEmail: string) {
    await assertCaseAccess(caseId, actor);
    return recordCalibration(caseId, actingUserId, actingUserEmail);
  }

  async recordClosureCriteria(
    caseId: number,
    input: ClosureCriteriaInput,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return recordClosureCriteria(caseId, input, actingUserId, actingUserEmail);
  }

  async spawnRegressionCase(
    priorCaseId: number,
    newSeverityTier: PerformanceSeverityTier,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(priorCaseId, actor);
    return spawnRegressionCase(priorCaseId, newSeverityTier, actingUserId, actingUserEmail);
  }

  async createCheckIn(
    caseId: number,
    input: CreateCheckInDTO,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return createCheckIn(caseId, input, actingUserId, actingUserEmail);
  }

  async listCheckIns(caseId: number, actor: CaseActor) {
    await assertCaseAccess(caseId, actor);
    return listCheckIns(caseId);
  }

  async savePhaseFields(
    caseId: number,
    fields: Record<string, unknown>,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return savePhaseFields(caseId, fields, actingUserId, actingUserEmail);
  }

  async saveCompletedPhaseFields(
    caseId: number,
    phase: PerformanceCasePhaseName,
    fields: Record<string, unknown>,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return saveCompletedPhaseFields(caseId, phase, fields, actingUserId, actingUserEmail);
  }

  async updatePlanEndDate(
    caseId: number,
    newEndDate: string,
    changeComment: string,
    hintForSuccessTriggered: boolean,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return updatePlanEndDate(caseId, newEndDate, changeComment, hintForSuccessTriggered, actingUserId, actingUserEmail);
  }

  async attachDocument(
    caseId: number,
    uploadId: number,
    documentLabel: string | undefined,
    actor: CaseActor,
    actingUserId: number,
    actingUserEmail: string,
  ) {
    await assertCaseAccess(caseId, actor);
    return attachDocument(caseId, uploadId, documentLabel, actingUserId, actingUserEmail);
  }

  async listDocuments(caseId: number, actor: CaseActor) {
    await assertCaseAccess(caseId, actor);
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

  async getAllCases(actor: CaseActor) {
    return getAllCases(actor);
  }

  async deleteDocument(caseId: number, documentId: number, actor: CaseActor, actingUserEmail: string) {
    await assertCaseAccess(caseId, actor);
    return deleteDocument(caseId, documentId, actingUserEmail);
  }

  async deleteCase(caseId: number, actor: CaseActor, actingUserId: number, actingUserEmail: string) {
    await assertCaseAccess(caseId, actor);
    return deleteCase(caseId, actingUserId, actingUserEmail, actor.teamMemberId);
  }
}

export const performanceCaseOrchestrator = new PerformanceCaseOrchestrator();
