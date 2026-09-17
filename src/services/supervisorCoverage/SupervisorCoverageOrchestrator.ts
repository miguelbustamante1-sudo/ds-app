/**
 * Supervisor Coverage Orchestrator
 * Coordinates all operations for supervisor coverage, including the
 * no-chaining validation rule and audit logging.
 */

import { prisma } from '../../db/prisma';
import {
  getAllSupervisorCoverage,
  getSupervisorCoverageById,
  getActivePartyCoverage,
  createSupervisorCoverage,
  endSupervisorCoverageEarly,
  TABLE,
} from './repository';
import { SupervisorCoverageChainError, SupervisorCoverageNotFoundError, SupervisorCoverageAlreadyEndedError } from './errors';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { AppError } from '../../errors/AppError';
import type { CreateSupervisorCoverageDTO, SupervisorCoverageDTO } from '@shared/dto/SupervisorCoverage';

export { SupervisorCoverageChainError, SupervisorCoverageNotFoundError, SupervisorCoverageAlreadyEndedError } from './errors';

export class SupervisorCoverageOrchestrator {
  async getAll(): Promise<SupervisorCoverageDTO[]> {
    return getAllSupervisorCoverage();
  }

  async create(
    dto: CreateSupervisorCoverageDTO,
    userEmail: string,
    dsUserId: number,
  ): Promise<SupervisorCoverageDTO> {
    if (dto.fromSupervisorId === dto.toSupervisorId) {
      throw new AppError('A supervisor cannot cover themselves', 400);
    }

    // NOTE: this transaction guards atomicity (create + no-chaining check succeed or fail together)
    // but does NOT prevent a race between two concurrent create() calls under Postgres's default
    // READ COMMITTED isolation — there's no DB-level uniqueness/exclusion constraint backing the
    // no-chaining rule. Accepted as a known limitation: this is a low-frequency admin action where
    // a genuine double-submit race is unlikely. See ORCHESTRATOR.md / PLAN-03 review notes if this
    // needs hardening later (Serializable isolation + retry, or a DB exclusion constraint).
    const created = await prisma.$transaction(async (tx) => {
      // No-chaining rule: reject if either side is already a party (from or to)
      // to another currently-active coverage record.
      const [fromParty, toParty] = await Promise.all([
        getActivePartyCoverage(dto.fromSupervisorId, tx),
        getActivePartyCoverage(dto.toSupervisorId, tx),
      ]);
      if (fromParty.length > 0) {
        throw new SupervisorCoverageChainError(
          `Supervisor ${dto.fromSupervisorId} is already part of an active coverage arrangement`,
        );
      }
      if (toParty.length > 0) {
        throw new SupervisorCoverageChainError(
          `Supervisor ${dto.toSupervisorId} is already part of an active coverage arrangement`,
        );
      }

      return createSupervisorCoverage({ ...dto, coverageCreatedBy: dsUserId }, tx);
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.supervisorCoverageId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Supervisor coverage created: ${dto.toSupervisorId} covering ${dto.fromSupervisorId}`,
    });

    return created;
  }

  async endEarly(id: number, userEmail: string, dsUserId: number): Promise<SupervisorCoverageDTO> {
    const before = await getSupervisorCoverageById(id);
    if (!before) throw new SupervisorCoverageNotFoundError();
    if (before.coverageEndedAt) throw new SupervisorCoverageAlreadyEndedError();

    const updated = await endSupervisorCoverageEarly(id, dsUserId);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Supervisor coverage ended early (was: ${before.toSupervisorId} covering ${before.fromSupervisorId})`,
    });

    return updated;
  }
}

export const supervisorCoverageOrchestrator = new SupervisorCoverageOrchestrator();
