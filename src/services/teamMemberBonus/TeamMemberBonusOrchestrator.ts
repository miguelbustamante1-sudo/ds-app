/**
 * Team Member Bonus Orchestrator
 * Coordinates all operations for ds.tmb_team_member_bonus
 */

import {
  getAllTeamMemberBonuses,
  getTeamMemberBonusById,
  getTeamMemberBonusesByMember,
  createTeamMemberBonus as createInDb,
  updateTeamMemberBonus as updateInDb,
  deleteTeamMemberBonus as deleteInDb,
  getBonusesForOverlapCheck,
  TABLE,
} from './repository';
import { validateNoOverlap } from './components/ValidateOverlap';
import { TeamMemberBonusNotFoundError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  CreateTeamMemberBonusDTO,
  UpdateTeamMemberBonusDTO,
  TeamMemberBonusDTO,
} from '@shared/dto/TeamMemberBonus';

export class TeamMemberBonusOrchestrator {
  async getAll(): Promise<TeamMemberBonusDTO[]> {
    return getAllTeamMemberBonuses();
  }

  async getById(id: number): Promise<TeamMemberBonusDTO> {
    const record = await getTeamMemberBonusById(id);
    if (!record) throw new TeamMemberBonusNotFoundError();
    return record;
  }

  async getByTeamMember(teamMemberId: number): Promise<TeamMemberBonusDTO[]> {
    return getTeamMemberBonusesByMember(teamMemberId);
  }

  async create(
    dto: CreateTeamMemberBonusDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<TeamMemberBonusDTO> {
    const existing = await getBonusesForOverlapCheck(dto.teamMemberId, dto.bonusCategoryId);
    validateNoOverlap(
      {
        bonusStartDate: dto.bonusStartDate ? new Date(dto.bonusStartDate) : null,
        bonusEndDate: dto.bonusEndDate ? new Date(dto.bonusEndDate) : null,
      },
      existing,
    );

    const created = await createInDb({
      teamMemberId: dto.teamMemberId,
      bonusCategoryId: dto.bonusCategoryId,
      bonusAmount: dto.bonusAmount,
      bonusPeriodicity: dto.bonusPeriodicity,
      bonusStartDate: dto.bonusStartDate ? new Date(dto.bonusStartDate) : null,
      bonusEndDate: dto.bonusEndDate ? new Date(dto.bonusEndDate) : null,
      bonusCreatedBy: dsUserId,
      // bonusCreatedAt intentionally omitted — Prisma @default(now()) handles it
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.teamMemberBonusId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Team member bonus created for team member ${dto.teamMemberId}, category ${dto.bonusCategoryId}`,
    });

    return created;
  }

  async update(
    id: number,
    dto: UpdateTeamMemberBonusDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<TeamMemberBonusDTO> {
    const before = await getTeamMemberBonusById(id);
    if (!before) throw new TeamMemberBonusNotFoundError();

    // Resolve effective values for overlap check (merge incoming with current)
    const effectiveCategoryId = dto.bonusCategoryId ?? before.bonusCategoryId;
    const effectiveStart =
      dto.bonusStartDate !== undefined
        ? (dto.bonusStartDate ? new Date(dto.bonusStartDate) : null)
        : before.bonusStartDate
          ? new Date(before.bonusStartDate)
          : null;
    const effectiveEnd =
      dto.bonusEndDate !== undefined
        ? (dto.bonusEndDate ? new Date(dto.bonusEndDate) : null)
        : before.bonusEndDate
          ? new Date(before.bonusEndDate)
          : null;

    const existing = await getBonusesForOverlapCheck(before.teamMemberId, effectiveCategoryId, id);
    validateNoOverlap({ bonusStartDate: effectiveStart, bonusEndDate: effectiveEnd }, existing);

    const updated = await updateInDb(id, {
      ...(dto.bonusCategoryId !== undefined && { bonusCategoryId: dto.bonusCategoryId }),
      ...(dto.bonusAmount !== undefined && { bonusAmount: dto.bonusAmount }),
      ...(dto.bonusPeriodicity !== undefined && { bonusPeriodicity: dto.bonusPeriodicity }),
      ...(dto.bonusStartDate !== undefined && {
        bonusStartDate: dto.bonusStartDate ? new Date(dto.bonusStartDate) : null,
      }),
      ...(dto.bonusEndDate !== undefined && {
        bonusEndDate: dto.bonusEndDate ? new Date(dto.bonusEndDate) : null,
      }),
      bonusUpdatedBy: dsUserId,
      bonusUpdatedAt: new Date(),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Team member bonus updated`,
    });

    return updated;
  }

  async delete(id: number, userEmail: string, dsUserId: number): Promise<void> {
    const before = await getTeamMemberBonusById(id);
    if (!before) throw new TeamMemberBonusNotFoundError();

    await deleteInDb(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Team member bonus deleted`,
    });
  }
}

export const teamMemberBonusOrchestrator = new TeamMemberBonusOrchestrator();
