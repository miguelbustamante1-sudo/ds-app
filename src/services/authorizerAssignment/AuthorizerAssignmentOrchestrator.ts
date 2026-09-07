import type { Prisma } from '@prisma/client';
import {
  getAllAuthorizerAssignments,
  getAuthorizerAssignmentById,
  getAuthorizerAssignmentsByTeamMember,
  getAuthorizerAssignmentsByAuthorizer,
  getOpenEndedAssignmentsForTeamMember,
  createAuthorizerAssignment as createInDb,
  updateAuthorizerAssignment as updateInDb,
  deleteAuthorizerAssignment as deleteInDb,
  TABLE,
} from './repository';
import { validateSelfAssignment, SelfAssignmentError } from './components/ValidateSelfAssignment';
import { validateReassignmentDate, InvalidReassignmentDateError } from './components/ValidateReassignmentDate';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { prisma } from '../../db/prisma';
import type {
  CreateAuthorizerAssignmentDTO,
  UpdateAuthorizerAssignmentDTO,
  AuthorizerAssignmentDTO,
} from '@shared/dto/AuthorizerAssignment';

export { SelfAssignmentError } from './components/ValidateSelfAssignment';
export { InvalidReassignmentDateError } from './components/ValidateReassignmentDate';

// A calendar day in milliseconds — safe here because both sides of the subtraction
// are UTC-midnight Date objects for a @db.Date field, no DST involved.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class AuthorizerAssignmentOrchestrator {
  async getAll(): Promise<AuthorizerAssignmentDTO[]> {
    return getAllAuthorizerAssignments();
  }

  async getById(id: number): Promise<AuthorizerAssignmentDTO | null> {
    return getAuthorizerAssignmentById(id);
  }

  async getByTeamMember(teamMemberWdid: string): Promise<AuthorizerAssignmentDTO[]> {
    return getAuthorizerAssignmentsByTeamMember(teamMemberWdid);
  }

  async getByAuthorizer(authorizerWdid: string): Promise<AuthorizerAssignmentDTO[]> {
    return getAuthorizerAssignmentsByAuthorizer(authorizerWdid);
  }

  /**
   * Returns the authorizerWdid of the team member's current (open-ended) assignment,
   * or null if none exists. Consumed by the otherIncomes domain's ResolveAuthorizer
   * component — otherIncomes never queries txa_authorizer_assignment directly.
   */
  async getCurrentAuthorizer(teamMemberWdid: string): Promise<string | null> {
    const [current] = await getOpenEndedAssignmentsForTeamMember(teamMemberWdid);
    return current ? current.authorizerWdid : null;
  }

  async create(
    dto: CreateAuthorizerAssignmentDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<AuthorizerAssignmentDTO> {
    validateSelfAssignment(dto.teamMemberWdid, dto.authorizerWdid);

    const newStartDate = new Date(dto.authorizerAssignmentStartDate);

    const { created, closedAssignments } = await prisma.$transaction(async (tx) => {
      const openAssignments = await getOpenEndedAssignmentsForTeamMember(dto.teamMemberWdid, tx);

      const closedAssignments: Array<{ before: AuthorizerAssignmentDTO; after: AuthorizerAssignmentDTO }> = [];

      for (const existing of openAssignments) {
        validateReassignmentDate(newStartDate, existing);

        const closeDate = new Date(newStartDate.getTime() - ONE_DAY_MS);

        const after = await updateInDb(
          existing.authorizerAssignmentId,
          {
            authorizerAssignmentEndDate: closeDate,
            authorizerAssignmentLastUpdatedBy: dsUserId,
            authorizerAssignmentLastUpdatedDate: new Date(),
          },
          tx,
        );

        if (after) {
          closedAssignments.push({ before: existing, after });
        }
      }

      const created = await createInDb(
        {
          teamMemberWdid: dto.teamMemberWdid,
          authorizerWdid: dto.authorizerWdid,
          authorizerAssignmentStartDate: newStartDate,
          authorizerAssignmentEndDate: dto.authorizerAssignmentEndDate
            ? new Date(dto.authorizerAssignmentEndDate)
            : null,
          authorizerAssignmentCreatedBy: dsUserId,
          authorizerAssignmentLastUpdatedBy: dsUserId,
          authorizerAssignmentLastUpdatedDate: new Date(),
        },
        tx,
      );

      return { created, closedAssignments };
    });

    for (const { before, after } of closedAssignments) {
      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(after.authorizerAssignmentId),
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: after as unknown as Record<string, unknown>,
        comment: `Authorizer assignment auto-closed: team member ${dto.teamMemberWdid} reassigned starting ${newStartDate.toISOString().slice(0, 10)}`,
      });
    }

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.authorizerAssignmentId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Authorizer assignment created: team member ${dto.teamMemberWdid} assigned authorizer ${dto.authorizerWdid}`,
    });

    return created;
  }

  async update(
    id: number,
    dto: UpdateAuthorizerAssignmentDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<AuthorizerAssignmentDTO | null> {
    if (dto.teamMemberWdid !== undefined && dto.authorizerWdid !== undefined) {
      validateSelfAssignment(dto.teamMemberWdid, dto.authorizerWdid);
    }

    const before = await getAuthorizerAssignmentById(id);
    if (!before) return null;

    const payload: Prisma.AuthorizerAssignmentUncheckedUpdateInput = {};
    if (dto.teamMemberWdid !== undefined) payload.teamMemberWdid = dto.teamMemberWdid;
    if (dto.authorizerWdid !== undefined) payload.authorizerWdid = dto.authorizerWdid;
    if (dto.authorizerAssignmentStartDate !== undefined) {
      payload.authorizerAssignmentStartDate = new Date(dto.authorizerAssignmentStartDate);
    }
    if (dto.authorizerAssignmentEndDate !== undefined) {
      payload.authorizerAssignmentEndDate = dto.authorizerAssignmentEndDate
        ? new Date(dto.authorizerAssignmentEndDate)
        : null;
    }
    payload.authorizerAssignmentLastUpdatedBy = dsUserId;
    payload.authorizerAssignmentLastUpdatedDate = new Date();

    const updated = await updateInDb(id, payload);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Authorizer assignment updated',
    });

    return updated;
  }

  async delete(id: number, userEmail: string): Promise<boolean> {
    const before = await getAuthorizerAssignmentById(id);
    if (!before) return false;

    const deleted = await deleteInDb(id);

    if (deleted) {
      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(id),
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: null,
        comment: 'Authorizer assignment deleted',
      });
    }

    return deleted;
  }
}

export const authorizerAssignmentOrchestrator = new AuthorizerAssignmentOrchestrator();
