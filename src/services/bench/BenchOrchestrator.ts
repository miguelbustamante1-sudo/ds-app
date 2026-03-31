import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { validateBenchMove } from './components/ValidateBenchMove';
import { validateEndBench } from './components/ValidateEndBench';
import { notifyBenchMove } from './components/NotifyBenchMove';
import type { CreateBenchMoveDTO, BenchMoveResultDTO, BenchMoveDetailDTO } from '@shared/dto/Bench';

const ENTITY_NAME = 'Bench';

function mapToDetailDTO(bench: {
  id: number;
  teamMemberId: number;
  supervisorId: number | null;
  functionalAreaId: number;
  allocation: { toNumber: () => number } | number;
  startDate: Date;
  endDate: Date | null;
  createdBy: string | null;
  createdAt: Date | null;
  teamMember: { teamMemberNames: string; teamMemberSurnames: string };
  supervisor: { teamMemberNames: string; teamMemberSurnames: string } | null;
  functionalArea: { Name: string };
}): BenchMoveDetailDTO {
  return {
    benchId: bench.id,
    teamMemberId: bench.teamMemberId,
    teamMemberName: `${bench.teamMember.teamMemberNames} ${bench.teamMember.teamMemberSurnames}`,
    supervisorId: bench.supervisorId,
    supervisorName: bench.supervisor
      ? `${bench.supervisor.teamMemberNames} ${bench.supervisor.teamMemberSurnames}`
      : null,
    functionalAreaId: bench.functionalAreaId,
    functionalAreaName: bench.functionalArea.Name,
    allocation: typeof bench.allocation === 'number' ? bench.allocation : bench.allocation.toNumber(),
    startDate: bench.startDate.toISOString(),
    endDate: bench.endDate ? bench.endDate.toISOString() : null,
    createdBy: bench.createdBy,
    createdAt: bench.createdAt ? bench.createdAt.toISOString() : null,
    isActive: bench.endDate === null,
  };
}

export class BenchOrchestrator {
  async createBenchMove(
    dto: CreateBenchMoveDTO,
    createdBy: string,
    supervisorTeamMemberId: number,
  ): Promise<BenchMoveResultDTO> {
    // Step 0 — Pre-transaction validation
    await validateBenchMove(dto.teamMemberId, supervisorTeamMemberId);

    const startDateObj = new Date(dto.startDate);
    const oneDayBefore = new Date(startDateObj);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Steps 1–5 — Single atomic transaction
    const created = await prisma.$transaction(async (tx) => {
      // Step 1 — Update project assignments
      for (const update of dto.projectAssignmentUpdates) {
        const endDate = new Date(update.endDate);
        await tx.projectAssignment.update({
          where: { projectAssignmentId: update.projectAssignmentId },
          data: {
            projectAssignmentEndDate: endDate,
            ...(endDate <= today ? { projectAssignmentDeleted: true } : {}),
          },
        });
      }

      // Step 2 — Close the current SupervisorAssignment (if any)
      const activeSupervisorAssignment = await tx.supervisorAssignment.findFirst({
        where: {
          teamMemberId: dto.teamMemberId,
          OR: [
            { supervisorAssignmentEndDate: null },
            { supervisorAssignmentEndDate: { gte: startDateObj } },
          ],
        },
      });
      if (activeSupervisorAssignment) {
        await tx.supervisorAssignment.update({
          where: { supervisorAssignmentId: activeSupervisorAssignment.supervisorAssignmentId },
          data: { supervisorAssignmentEndDate: oneDayBefore },
        });
      }

      // Step 3 — Create new SupervisorAssignment
      await tx.supervisorAssignment.create({
        data: {
          teamMemberId: dto.teamMemberId,
          supervisorId: dto.newSupervisorId,
          supervisorAssignmentStartDate: startDateObj,
        },
      });

      // Step 4 — Create Bench record
      const bench = await tx.bench.create({
        data: {
          teamMemberId: dto.teamMemberId,
          supervisorId: dto.newSupervisorId,
          functionalAreaId: dto.functionalAreaId,
          allocation: dto.allocation,
          startDate: startDateObj,
          createdBy,
        },
      });

      // Step 5 — Audit entry
      await auditOrchestrator.log({
        entityName: ENTITY_NAME,
        entityId: String(bench.id),
        createdBy,
        oldValues: null,
        newValues: bench as unknown as Record<string, unknown>,
        comment: 'Bench move created',
      });

      return bench;
    });

    // Step 6 — Post-transaction notification (best-effort)
    try {
      const benchWithRelations = await prisma.bench.findUnique({
        where: { id: created.id },
        include: {
          teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
          functionalArea: { select: { Name: true } },
        },
      });
      if (benchWithRelations) {
        await notifyBenchMove({
          benchId: created.id,
          tmName: `${benchWithRelations.teamMember.teamMemberNames} ${benchWithRelations.teamMember.teamMemberSurnames}`,
          functionalAreaName: benchWithRelations.functionalArea.Name,
          startDate: created.startDate.toISOString(),
          newSupervisorId: dto.newSupervisorId,
          createdBy,
        });
      }
    } catch (err) {
      console.error('[BenchOrchestrator] Notification failed (non-fatal):', err);
    }

    return {
      benchId: created.id,
      teamMemberId: created.teamMemberId,
      updatedAssignments: dto.projectAssignmentUpdates.length,
      supervisorUpdated: true,
      benchRecorded: true,
    };
  }

  async endBench(benchId: number, endDate: string, updatedBy: string): Promise<void> {
    // Validate — also returns the existing bench record
    await validateEndBench(benchId, endDate);

    const updated = await prisma.bench.update({
      where: { id: benchId },
      data: { endDate: new Date(endDate), updatedBy, updatedAt: new Date() },
    });

    await auditOrchestrator.log({
      entityName: ENTITY_NAME,
      entityId: String(benchId),
      createdBy: updatedBy,
      oldValues: { endDate: null },
      newValues: { endDate: updated.endDate },
      comment: 'Bench ended',
    });
  }

  async getBenchDetail(benchId: number): Promise<BenchMoveDetailDTO> {
    const bench = await prisma.bench.findUnique({
      where: { id: benchId },
      include: {
        teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
        supervisor: { select: { teamMemberNames: true, teamMemberSurnames: true } },
        functionalArea: { select: { Name: true } },
      },
    });

    if (!bench) {
      const err = new Error('Bench record not found');
      (err as unknown as Record<string, unknown>).statusCode = 404;
      throw err;
    }

    return mapToDetailDTO(bench);
  }

  async getActiveBench(teamMemberId: number): Promise<BenchMoveDetailDTO> {
    const bench = await prisma.bench.findFirst({
      where: { teamMemberId, endDate: null },
      include: {
        teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
        supervisor: { select: { teamMemberNames: true, teamMemberSurnames: true } },
        functionalArea: { select: { Name: true } },
      },
    });

    if (!bench) {
      const err = new Error('No active bench record found for this team member');
      (err as unknown as Record<string, unknown>).statusCode = 404;
      throw err;
    }

    return mapToDetailDTO(bench);
  }
}

export const benchOrchestrator = new BenchOrchestrator();
