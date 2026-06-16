import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { AppError } from '../../errors/AppError';
import { BonusImpactDTO, CreateBonusImpactDTO, ProcessBonusImpactDTO } from '../../../shared/dto/BonusImpact';
import { getReportsForBonusImpact } from '../teamMember/queries/getReportsForBonusImpact';
import { listBonusImpacts, findBonusImpactById } from './components/bonusImpactQueries';
import {
  createBonusImpact,
  notifyBonusImpact,
  processBonusImpact,
  dropBonusImpact,
} from './components/bonusImpactMutations';

class BonusImpactOrchestrator {
  async listForSupervisor(supervisorTeamMemberId: number): Promise<BonusImpactDTO[]> {
    const reports = await getReportsForBonusImpact(supervisorTeamMemberId);
    const ids = reports.map((r) => r.teamMemberId);
    return listBonusImpacts(ids);
  }

  async listAll(): Promise<BonusImpactDTO[]> {
    return listBonusImpacts();
  }

  async create(dto: CreateBonusImpactDTO, createdBy: number, userEmail: string): Promise<BonusImpactDTO> {
    const created = await createBonusImpact(dto, createdBy);
    await auditOrchestrator.log({
      entityName: 'bni_bonus_impact',
      entityId: String(created.bniId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Bonus impact created for team member ${dto.bniTeamMemberId}`,
    });
    const full = await findBonusImpactById(created.bniId);
    if (!full) throw new AppError('Failed to retrieve created bonus impact', 500);
    return full;
  }

  async notify(bniId: number, updatedBy: number, userEmail: string): Promise<BonusImpactDTO> {
    const { before, after } = await notifyBonusImpact(bniId, updatedBy);
    await auditOrchestrator.log({
      entityName: 'bni_bonus_impact',
      entityId: String(bniId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Bonus impact ${bniId} marked as Notified`,
    });
    const full = await findBonusImpactById(bniId);
    if (!full) throw new AppError('Failed to retrieve updated bonus impact', 500);
    return full;
  }

  async process(bniId: number, dto: ProcessBonusImpactDTO, updatedBy: number, userEmail: string): Promise<BonusImpactDTO> {
    const { before, after } = await processBonusImpact(bniId, dto, updatedBy);
    await auditOrchestrator.log({
      entityName: 'bni_bonus_impact',
      entityId: String(bniId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Bonus impact ${bniId} processed against payrol ${dto.bniPrlId}`,
    });
    const full = await findBonusImpactById(bniId);
    if (!full) throw new AppError('Failed to retrieve updated bonus impact', 500);
    return full;
  }

  async drop(bniId: number, updatedBy: number, userEmail: string): Promise<void> {
    const { before } = await dropBonusImpact(bniId, updatedBy);
    await auditOrchestrator.log({
      entityName: 'bni_bonus_impact',
      entityId: String(bniId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Bonus impact ${bniId} dropped`,
    });
  }
}

export const bonusImpactOrchestrator = new BonusImpactOrchestrator();
