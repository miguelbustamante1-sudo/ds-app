/**
 * Supervisor Assignment Orchestrator
 * Coordinates all operations for supervisor assignments
 */

import {
  getAllSupervisorAssignments,
  getSupervisorAssignmentById,
  getSupervisorAssignmentsByTeamMember,
  getSupervisorAssignmentsBySupervisor,
  createSupervisorAssignment as createInDb,
  updateSupervisorAssignment as updateInDb,
  deleteSupervisorAssignment as deleteInDb,
  TABLE,
} from './repository';
import { validateSelfAssignment, SelfAssignmentError } from './components/ValidateSelfAssignment';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { AppError } from '../../errors/AppError';
import type { CreateSupervisorAssignmentDTO, UpdateSupervisorAssignmentDTO, SupervisorAssignmentDTO } from '@shared/dto/SupervisorAssignment';

export { SelfAssignmentError } from './components/ValidateSelfAssignment';

export class SupervisorAssignmentOrchestrator {
  async getAll(): Promise<SupervisorAssignmentDTO[]> {
    return getAllSupervisorAssignments();
  }

  async getById(id: number): Promise<SupervisorAssignmentDTO | null> {
    return getSupervisorAssignmentById(id);
  }

  async getByTeamMember(teamMemberId: number): Promise<SupervisorAssignmentDTO[]> {
    return getSupervisorAssignmentsByTeamMember(teamMemberId);
  }

  async getBySupervisor(supervisorId: number): Promise<SupervisorAssignmentDTO[]> {
    return getSupervisorAssignmentsBySupervisor(supervisorId);
  }

  async create(
    dto: CreateSupervisorAssignmentDTO,
    userEmail: string,
    dsUserId: number | undefined,
  ): Promise<SupervisorAssignmentDTO> {
    validateSelfAssignment(dto.teamMemberId, dto.supervisorId);

    const created = await createInDb({
      teamMemberId: dto.teamMemberId,
      supervisorId: dto.supervisorId,
      supervisorAssignmentStartDate: new Date(dto.supervisorAssignmentStartDate),
      supervisorAssignmentEndDate: dto.supervisorAssignmentEndDate
        ? new Date(dto.supervisorAssignmentEndDate)
        : null,
      ...(dsUserId !== undefined && {
        supervisorAssignmentCreatedBy: dsUserId,
        supervisorAssignmentCreatedDate: new Date(),
      }),
    });

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(created.supervisorAssignmentId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Supervisor assignment created: team member ${dto.teamMemberId} assigned to supervisor ${dto.supervisorId}`,
    });

    return created;
  }

  async update(
    id: number,
    dto: UpdateSupervisorAssignmentDTO,
    userEmail: string,
    dsUserId: number | undefined,
  ): Promise<SupervisorAssignmentDTO | null> {
    if (dto.teamMemberId !== undefined && dto.supervisorId !== undefined) {
      validateSelfAssignment(dto.teamMemberId, dto.supervisorId);
    }

    const before = await getSupervisorAssignmentById(id);
    if (!before) return null;

    const payload: Record<string, unknown> = {};
    if (dto.teamMemberId !== undefined) payload.teamMemberId = dto.teamMemberId;
    if (dto.supervisorId !== undefined) payload.supervisorId = dto.supervisorId;
    if (dto.supervisorAssignmentStartDate !== undefined) {
      payload.supervisorAssignmentStartDate = new Date(dto.supervisorAssignmentStartDate);
    }
    if (dto.supervisorAssignmentEndDate !== undefined) {
      payload.supervisorAssignmentEndDate = dto.supervisorAssignmentEndDate
        ? new Date(dto.supervisorAssignmentEndDate)
        : null;
    }
    if (dsUserId !== undefined) {
      payload.supervisorAssignmentLastUpdatedBy = dsUserId;
      payload.supervisorAssignmentLastUpdatedDate = new Date();
    }

    const updated = await updateInDb(id, payload);

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Supervisor assignment updated`,
    });

    return updated;
  }

  async delete(id: number, userEmail: string): Promise<boolean> {
    const before = await getSupervisorAssignmentById(id);
    if (!before) return false;

    const deleted = await deleteInDb(id);

    if (deleted) {
      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(id),
        createdBy: userEmail,
        oldValues: before as unknown as Record<string, unknown>,
        newValues: null,
        comment: `Supervisor assignment deleted`,
      });
    }

    return deleted;
  }

  async transfer(
    fromSupervisorId: number,
    toSupervisorId: number,
    userEmail: string,
    dsUserId: number | undefined,
  ): Promise<{ transferredCount: number; skippedCount: number }> {
    if (fromSupervisorId === toSupervisorId) {
      throw new AppError('Cannot transfer assignments to the same supervisor', 400);
    }

    const sourceAssignments = await getSupervisorAssignmentsBySupervisor(fromSupervisorId);
    const activeSource = sourceAssignments.filter((a) => a.supervisorAssignmentEndDate === null);

    if (activeSource.length === 0) {
      return { transferredCount: 0, skippedCount: 0 };
    }

    const targetAssignments = await getSupervisorAssignmentsBySupervisor(toSupervisorId);
    const alreadyAssigned = new Set(
      targetAssignments
        .filter((a) => a.supervisorAssignmentEndDate === null && a.teamMemberId !== null)
        // teamMemberId is non-null — guaranteed by the preceding filter predicate; TS cannot narrow through .filter()
        .map((a) => a.teamMemberId!),
    );

    let transferredCount = 0;
    let skippedCount = 0;

    for (const assignment of activeSource) {
      if (assignment.teamMemberId !== null && alreadyAssigned.has(assignment.teamMemberId)) {
        skippedCount++;
        continue;
      }

      const oldSnapshot = { ...assignment } as unknown as Record<string, unknown>;
      const updated = await updateInDb(assignment.supervisorAssignmentId, {
        supervisorId: toSupervisorId,
        ...(dsUserId !== undefined && {
          supervisorAssignmentLastUpdatedBy: dsUserId,
          supervisorAssignmentLastUpdatedDate: new Date(),
        }),
      });
      await auditOrchestrator.log({
        entityName: TABLE,
        entityId: String(assignment.supervisorAssignmentId),
        createdBy: userEmail,
        oldValues: oldSnapshot,
        newValues: updated as unknown as Record<string, unknown>,
        comment: `Supervisor transferred from team member ${fromSupervisorId} to ${toSupervisorId}`,
      });
      transferredCount++;
    }

    return { transferredCount, skippedCount };
  }
}

export const supervisorAssignmentOrchestrator = new SupervisorAssignmentOrchestrator();
