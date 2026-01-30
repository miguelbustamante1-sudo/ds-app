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
} from './repository';
import { validateSelfAssignment, SelfAssignmentError } from './components/ValidateSelfAssignment';
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

  async create(dto: CreateSupervisorAssignmentDTO): Promise<SupervisorAssignmentDTO> {
    // Validation
    validateSelfAssignment(dto.teamMemberId, dto.supervisorId);

    // Create
    return createInDb({
      teamMemberId: dto.teamMemberId,
      supervisorId: dto.supervisorId,
      supervisorAssignmentStartDate: new Date(dto.supervisorAssignmentStartDate),
      supervisorAssignmentEndDate: dto.supervisorAssignmentEndDate
        ? new Date(dto.supervisorAssignmentEndDate)
        : null,
    });
  }

  async update(id: number, dto: UpdateSupervisorAssignmentDTO): Promise<SupervisorAssignmentDTO | null> {
    // Validation - only if both IDs are provided
    if (dto.teamMemberId !== undefined && dto.supervisorId !== undefined) {
      validateSelfAssignment(dto.teamMemberId, dto.supervisorId);
    }

    // Build update payload
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

    return updateInDb(id, payload);
  }

  async delete(id: number): Promise<boolean> {
    return deleteInDb(id);
  }
}

export const supervisorAssignmentOrchestrator = new SupervisorAssignmentOrchestrator();
