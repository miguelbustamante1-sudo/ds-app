import type { Prisma } from '@prisma/client';
import {
  getAllOtherIncomes,
  getOtherIncomeById,
  createOtherIncome as createInDb,
  updateOtherIncome as updateInDb,
  softDeleteOtherIncome,
  getOpenPayrolPeriods,
  bulkSoftDeleteOtherIncomes,
  findActiveIncomeTypeByName,
  findOpenPayrolByDescription,
  TABLE,
} from './repository';
import type { OpenPayrolPeriodOption } from './repository';
import { getTeamMemberByWorkdayId } from '../../db/teamMembers';
import { validatePayrolOpen } from './components/ValidatePayrolOpen';
import { resolveAuthorizer } from './components/ResolveAuthorizer';
import { validateRejectionReason } from './components/ValidateRejectionReason';
import { OtherIncomeNotFoundError, ForbiddenOtherIncomeActionError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type { CreateOtherIncomeDTO, UpdateOtherIncomeDTO, OtherIncomeDTO } from '@shared/dto/OtherIncome';
import type {
  OtherIncomeImportEntryDTO,
  OtherIncomeImportEntryResultDTO,
  SubmitOtherIncomeImportResponseDTO,
} from '@shared/dto/OtherIncomeImport';

export interface OtherIncomeScope {
  isAdmin: boolean;
  /** Required when !isAdmin — the caller's hierarchy's Workday IDs, from getReportsForOtherIncomes */
  teamMemberWdids?: string[];
  /** The caller's own wdid, for the "entries I authorize" half of the scope */
  actingTeamMemberWdid?: string;
}

export interface OtherIncomeActor {
  isAdmin: boolean;
  /** req.user.dsUserId of the acting user */
  actingUserId: number;
}

export class OtherIncomeOrchestrator {
  async getAll(scope: OtherIncomeScope): Promise<OtherIncomeDTO[]> {
    if (scope.isAdmin) {
      return getAllOtherIncomes();
    }

    const orConditions: Prisma.OtherIncomeWhereInput[] = [];
    if (scope.teamMemberWdids && scope.teamMemberWdids.length > 0) {
      orConditions.push({ teamMemberWdid: { in: scope.teamMemberWdids } });
    }
    if (scope.actingTeamMemberWdid !== undefined) {
      orConditions.push({ authorizerWdid: scope.actingTeamMemberWdid });
    }
    if (orConditions.length === 0) return [];

    return getAllOtherIncomes({ OR: orConditions });
  }

  async getById(id: number): Promise<OtherIncomeDTO> {
    const record = await getOtherIncomeById(id);
    if (!record) throw new OtherIncomeNotFoundError();
    return record;
  }

  /** Open-only payrol periods, for the create-form ComboBox — accessible to non-admins. */
  async getOpenPayrolPeriods(): Promise<OpenPayrolPeriodOption[]> {
    return getOpenPayrolPeriods();
  }

  async create(dto: CreateOtherIncomeDTO, userEmail: string, dsUserId: number): Promise<OtherIncomeDTO> {
    await validatePayrolOpen(dto.payrolId);
    const authorizerWdid = await resolveAuthorizer(dto.teamMemberWdid);

    const created = await createInDb({
      teamMemberWdid: dto.teamMemberWdid,
      incomeTypeId: dto.incomeTypeId,
      oinAmount: dto.oinAmount,
      oinCuantity: dto.oinCuantity,
      oinMeasurment: dto.oinMeasurment,
      authorizerWdid,
      payrolId: dto.payrolId,
      oinCreatedBy: dsUserId,
      oinLastUpdatedBy: dsUserId,
      oinLastUpdatedDate: new Date(),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.oinId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Other income created for team member ${dto.teamMemberWdid}`,
    });

    return created;
  }

  async update(
    id: number,
    dto: UpdateOtherIncomeDTO,
    userEmail: string,
    dsUserId: number,
    actor: OtherIncomeActor,
  ): Promise<OtherIncomeDTO> {
    const before = await getOtherIncomeById(id);
    if (!before) throw new OtherIncomeNotFoundError();

    await validatePayrolOpen(before.payrolId);

    let resetsToPending = false;

    if (!actor.isAdmin) {
      if (before.oinCreatedBy !== actor.actingUserId) {
        throw new ForbiddenOtherIncomeActionError('You can only edit your own entries');
      }
      if (before.oinStatus !== 'Pending' && before.oinStatus !== 'Rejected') {
        throw new ForbiddenOtherIncomeActionError('Only Pending or Rejected entries can be edited');
      }
      if (dto.authorizerWdid !== undefined) {
        throw new ForbiddenOtherIncomeActionError('Only an admin can change the authorizer');
      }
      resetsToPending = before.oinStatus === 'Rejected';
    }

    if (dto.payrolId !== undefined && dto.payrolId !== before.payrolId) {
      await validatePayrolOpen(dto.payrolId);
    }

    const updated = await updateInDb(id, {
      ...(dto.teamMemberWdid !== undefined && { teamMemberWdid: dto.teamMemberWdid }),
      ...(dto.incomeTypeId !== undefined && { incomeTypeId: dto.incomeTypeId }),
      ...(dto.oinAmount !== undefined && { oinAmount: dto.oinAmount }),
      ...(dto.oinCuantity !== undefined && { oinCuantity: dto.oinCuantity }),
      ...(dto.oinMeasurment !== undefined && { oinMeasurment: dto.oinMeasurment }),
      ...(dto.payrolId !== undefined && { payrolId: dto.payrolId }),
      ...(actor.isAdmin && dto.authorizerWdid !== undefined && { authorizerWdid: dto.authorizerWdid }),
      ...(resetsToPending && {
        oinStatus: 'Pending',
        oinRejectionReason: null,
        oinDecidedBy: null,
        oinDecidedDate: null,
      }),
      oinLastUpdatedBy: dsUserId,
      oinLastUpdatedDate: new Date(),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Other income updated',
    });

    return updated;
  }

  async delete(id: number, userEmail: string, dsUserId: number, actor: OtherIncomeActor): Promise<void> {
    const before = await getOtherIncomeById(id);
    if (!before) throw new OtherIncomeNotFoundError();

    await validatePayrolOpen(before.payrolId);

    if (!actor.isAdmin) {
      if (before.oinCreatedBy !== actor.actingUserId) {
        throw new ForbiddenOtherIncomeActionError('You can only delete your own entries');
      }
      if (before.oinStatus !== 'Pending') {
        throw new ForbiddenOtherIncomeActionError('Only Pending entries can be deleted');
      }
    }

    const deleted = await softDeleteOtherIncome(id, dsUserId);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: deleted as unknown as Record<string, unknown>,
      comment: 'Other income deleted (soft delete)',
    });
  }

  async approve(
    id: number,
    userEmail: string,
    dsUserId: number,
    actor: { isAdmin: boolean; actingTeamMemberWdid?: string },
  ): Promise<OtherIncomeDTO> {
    const before = await getOtherIncomeById(id);
    if (!before) throw new OtherIncomeNotFoundError();
    await validatePayrolOpen(before.payrolId);

    if (before.oinStatus !== 'Pending') {
      throw new ForbiddenOtherIncomeActionError('Only Pending entries can be approved');
    }
    if (!actor.isAdmin && before.authorizerWdid !== actor.actingTeamMemberWdid) {
      throw new ForbiddenOtherIncomeActionError('Only the assigned authorizer or an admin can approve this entry');
    }

    const updated = await updateInDb(id, {
      oinStatus: 'Approved',
      oinRejectionReason: null,
      oinDecidedBy: dsUserId,
      oinDecidedDate: new Date(),
      oinLastUpdatedBy: dsUserId,
      oinLastUpdatedDate: new Date(),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Other income approved',
    });

    return updated;
  }

  async reject(
    id: number,
    reason: string,
    userEmail: string,
    dsUserId: number,
    actor: { isAdmin: boolean; actingTeamMemberWdid?: string },
  ): Promise<OtherIncomeDTO> {
    validateRejectionReason(reason);

    const before = await getOtherIncomeById(id);
    if (!before) throw new OtherIncomeNotFoundError();
    await validatePayrolOpen(before.payrolId);

    if (before.oinStatus === 'Rejected') {
      throw new ForbiddenOtherIncomeActionError('Entry is already Rejected');
    }
    if (!actor.isAdmin && before.authorizerWdid !== actor.actingTeamMemberWdid) {
      throw new ForbiddenOtherIncomeActionError('Only the assigned authorizer or an admin can reject this entry');
    }

    const updated = await updateInDb(id, {
      oinStatus: 'Rejected',
      oinRejectionReason: reason,
      oinDecidedBy: dsUserId,
      oinDecidedDate: new Date(),
      oinLastUpdatedBy: dsUserId,
      oinLastUpdatedDate: new Date(),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Other income rejected: ${reason}`,
    });

    return updated;
  }

  async bulkDelete(oinIds: number[], userEmail: string, dsUserId: number): Promise<void> {
    const results = await bulkSoftDeleteOtherIncomes(oinIds, dsUserId);

    for (const { before, after } of results) {
      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(after.oinId),
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: after as unknown as Record<string, unknown>,
        comment: 'Other income record deleted (bulk delete)',
      });
    }
  }

  async submitImport(
    entries: OtherIncomeImportEntryDTO[],
    userEmail: string,
    dsUserId: number,
  ): Promise<SubmitOtherIncomeImportResponseDTO> {
    const results: OtherIncomeImportEntryResultDTO[] = [];

    for (const [index, entry] of entries.entries()) {
      const fail = (error: string): void => {
        results.push({ index, workdayId: entry.workdayId, success: false, error });
      };

      if (!entry.workdayId) { fail('Missing workdayId'); continue; }
      if (!entry.incomeTypeName) { fail('Missing incomeTypeName'); continue; }
      if (
        entry.amount === undefined ||
        entry.amount === null ||
        typeof entry.amount !== 'number' ||
        Number.isNaN(entry.amount)
      ) {
        fail('Missing or invalid amount');
        continue;
      }
      if (!entry.cuantity) { fail('Missing cuantity'); continue; }
      if (!entry.measurment) { fail('Missing measurment'); continue; }
      if (!entry.payrolDescription) { fail('Missing payrolDescription'); continue; }

      try {
        const teamMember = await getTeamMemberByWorkdayId(entry.workdayId);
        if (!teamMember) {
          fail(`Team member not found for Workday ID '${entry.workdayId}'`);
          continue;
        }

        const incomeType = await findActiveIncomeTypeByName(entry.incomeTypeName);
        if (!incomeType) {
          fail(`Active income type not found for '${entry.incomeTypeName}'`);
          continue;
        }

        const payrol = await findOpenPayrolByDescription(entry.payrolDescription);
        if (!payrol) {
          fail(`Open payrol period not found for '${entry.payrolDescription}'`);
          continue;
        }

        const created = await this.create(
          {
            teamMemberWdid: entry.workdayId,
            incomeTypeId: incomeType.incomeTypeId,
            oinAmount: entry.amount,
            oinCuantity: entry.cuantity,
            oinMeasurment: entry.measurment,
            payrolId: payrol.prlId,
          },
          userEmail,
          dsUserId,
        );

        results.push({ index, workdayId: entry.workdayId, success: true, oinId: created.oinId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create other income record';
        fail(message);
      }
    }

    const insertedCount = results.filter((r) => r.success).length;
    const failedCount = results.length - insertedCount;

    return { results, insertedCount, failedCount };
  }
}

export const otherIncomeOrchestrator = new OtherIncomeOrchestrator();
