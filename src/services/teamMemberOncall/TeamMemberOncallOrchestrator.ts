import {
  getAllTeamMemberOncalls,
  getTeamMemberOncallById,
  createTeamMemberOncall as createInDb,
  updateTeamMemberOncall as updateInDb,
  deleteTeamMemberOncall as deleteInDb,
  bulkDeleteTeamMemberOncalls as bulkDeleteInDb,
  TABLE,
} from './repository';
import { TeamMemberOncallNotFoundError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { getTeamMemberByWorkdayId } from '../../db/teamMembers';
import type {
  CreateTeamMemberOncallDTO,
  UpdateTeamMemberOncallDTO,
  TeamMemberOncallDTO,
} from '@shared/dto/TeamMemberOncall';
import type {
  TeamMemberOncallExternalEntryDTO,
  TeamMemberOncallExternalEntryResultDTO,
  SubmitTeamMemberOncallExternalEntriesResponseDTO,
} from '@shared/dto/TeamMemberOncallExternalIntake';

export class TeamMemberOncallOrchestrator {
  async getAll(): Promise<TeamMemberOncallDTO[]> {
    return getAllTeamMemberOncalls();
  }

  async getById(id: number): Promise<TeamMemberOncallDTO> {
    const record = await getTeamMemberOncallById(id);
    if (!record) throw new TeamMemberOncallNotFoundError();
    return record;
  }

  async create(
    dto: CreateTeamMemberOncallDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<TeamMemberOncallDTO> {
    const created = await createInDb({
      teamMemberId: dto.teamMemberId,
      oncallAmount: dto.oncallAmount,
      oncallDate: new Date(dto.oncallDate),
      payrolId: dto.payrolId ?? null,
      oncallFrequency: dto.oncallFrequency ?? null,
      oncallCreatedBy: dsUserId,
      oncallUpdatedBy: dsUserId,
      // oncallCreatedAt / oncallUpdatedAt intentionally omitted — Prisma defaults handle them
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.oncallId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Team member on call record created for team member ${dto.teamMemberId}`,
    });

    return created;
  }

  async submitExternalIntake(
    entries: TeamMemberOncallExternalEntryDTO[],
    userEmail: string,
    dsUserId: number,
  ): Promise<SubmitTeamMemberOncallExternalEntriesResponseDTO> {
    const results: TeamMemberOncallExternalEntryResultDTO[] = [];

    for (const [index, entry] of entries.entries()) {
      const fail = (error: string): void => {
        results.push({ index, workdayId: entry.workdayId, success: false, error });
      };

      if (!entry.workdayId) {
        fail('Missing workdayId');
        continue;
      }
      if (
        entry.amount === undefined ||
        entry.amount === null ||
        typeof entry.amount !== 'number' ||
        Number.isNaN(entry.amount)
      ) {
        fail('Missing or invalid amount');
        continue;
      }
      if (!entry.date || Number.isNaN(new Date(entry.date).getTime())) {
        fail('Missing or invalid date');
        continue;
      }
      if (
        entry.frequency === undefined ||
        entry.frequency === null ||
        !Number.isInteger(entry.frequency) ||
        entry.frequency <= 0
      ) {
        fail('Missing or invalid frequency (must be a positive integer)');
        continue;
      }

      try {
        const teamMember = await getTeamMemberByWorkdayId(entry.workdayId);
        if (!teamMember) {
          fail(`Team member not found for Workday ID '${entry.workdayId}'`);
          continue;
        }

        const created = await this.create(
          {
            teamMemberId: teamMember.teamMemberId,
            oncallAmount: entry.amount,
            oncallDate: entry.date,
            oncallFrequency: entry.frequency,
            payrolId: null,
          },
          userEmail,
          dsUserId,
        );

        results.push({ index, workdayId: entry.workdayId, success: true, oncallId: created.oncallId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create on-call record';
        fail(message);
      }
    }

    const insertedCount = results.filter((r) => r.success).length;
    const failedCount = results.length - insertedCount;

    return { results, insertedCount, failedCount };
  }

  async update(
    id: number,
    dto: UpdateTeamMemberOncallDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<TeamMemberOncallDTO> {
    const before = await getTeamMemberOncallById(id);
    if (!before) throw new TeamMemberOncallNotFoundError();

    const updated = await updateInDb(id, {
      ...(dto.teamMemberId !== undefined && { teamMemberId: dto.teamMemberId }),
      ...(dto.oncallAmount !== undefined && { oncallAmount: dto.oncallAmount }),
      ...(dto.oncallDate !== undefined && {
        oncallDate: new Date(dto.oncallDate),
      }),
      ...(dto.payrolId !== undefined && { payrolId: dto.payrolId }),
      ...(dto.oncallFrequency !== undefined && { oncallFrequency: dto.oncallFrequency }),
      oncallUpdatedBy: dsUserId,
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Team member on call record updated`,
    });

    return updated;
  }

  async delete(id: number, userEmail: string, dsUserId: number): Promise<void> {
    const before = await getTeamMemberOncallById(id);
    if (!before) throw new TeamMemberOncallNotFoundError();

    await deleteInDb(id);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Team member on call record deleted`,
    });
  }

  async bulkDelete(oncallIds: number[], userEmail: string): Promise<void> {
    const deleted = await bulkDeleteInDb(oncallIds);

    for (const record of deleted) {
      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(record.oncallId),
        createdBy: userEmail,
        oldValues: record as unknown as Record<string, unknown>,
        newValues: null,
        comment: 'Team member on call record deleted (bulk delete)',
      });
    }
  }
}

export const teamMemberOncallOrchestrator = new TeamMemberOncallOrchestrator();
