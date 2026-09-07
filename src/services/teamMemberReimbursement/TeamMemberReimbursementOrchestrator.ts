import {
  getAllTeamMemberReimbursements,
  getTeamMemberReimbursementById,
  createTeamMemberReimbursement as createInDb,
  updateTeamMemberReimbursement as updateInDb,
  deleteTeamMemberReimbursement as deleteInDb,
  TABLE,
} from './repository';
import { TeamMemberReimbursementNotFoundError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  CreateTeamMemberReimbursementDTO,
  UpdateTeamMemberReimbursementDTO,
  TeamMemberReimbursementDTO,
} from '@shared/dto/TeamMemberReimbursement';

export class TeamMemberReimbursementOrchestrator {
  async getAll(): Promise<TeamMemberReimbursementDTO[]> {
    return getAllTeamMemberReimbursements();
  }

  async getById(id: number): Promise<TeamMemberReimbursementDTO> {
    const record = await getTeamMemberReimbursementById(id);
    if (!record) throw new TeamMemberReimbursementNotFoundError();
    return record;
  }

  async create(
    dto: CreateTeamMemberReimbursementDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<TeamMemberReimbursementDTO> {
    const created = await createInDb({
      teamMemberId: dto.teamMemberId,
      reimbursementAmount: dto.reimbursementAmount,
      reimbursementDate: new Date(dto.reimbursementDate),
      payrolId: dto.payrolId ?? null,
      reimbursementFrequency: dto.reimbursementFrequency ?? null,
      reimbursementCreatedBy: dsUserId,
      reimbursementUpdatedBy: dsUserId,
      // reimbursementCreatedAt / reimbursementUpdatedAt intentionally omitted — Prisma defaults handle them
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.reimbursementId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Team member reimbursement created for team member ${dto.teamMemberId}`,
    });

    return created;
  }

  async update(
    id: number,
    dto: UpdateTeamMemberReimbursementDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<TeamMemberReimbursementDTO> {
    const before = await getTeamMemberReimbursementById(id);
    if (!before) throw new TeamMemberReimbursementNotFoundError();

    const updated = await updateInDb(id, {
      ...(dto.teamMemberId !== undefined && { teamMemberId: dto.teamMemberId }),
      ...(dto.reimbursementAmount !== undefined && { reimbursementAmount: dto.reimbursementAmount }),
      ...(dto.reimbursementDate !== undefined && {
        reimbursementDate: new Date(dto.reimbursementDate),
      }),
      ...(dto.payrolId !== undefined && { payrolId: dto.payrolId }),
      ...(dto.reimbursementFrequency !== undefined && { reimbursementFrequency: dto.reimbursementFrequency }),
      reimbursementUpdatedBy: dsUserId,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Team member reimbursement updated`,
    });

    return updated;
  }

  async delete(id: number, userEmail: string, dsUserId: number): Promise<void> {
    const before = await getTeamMemberReimbursementById(id);
    if (!before) throw new TeamMemberReimbursementNotFoundError();

    await deleteInDb(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Team member reimbursement deleted`,
    });
  }
}

export const teamMemberReimbursementOrchestrator = new TeamMemberReimbursementOrchestrator();
