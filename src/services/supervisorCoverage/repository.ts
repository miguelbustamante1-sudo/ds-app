/**
 * Supervisor Coverage Repository
 * Database access layer for supervisor coverage
 */

import { prisma } from '../../db/prisma';
import type { CreateSupervisorCoverageDTO, SupervisorCoverageDTO } from '@shared/dto/SupervisorCoverage';

export const TABLE = 'ds.cov_supervisor_coverage';

// Prisma transaction-client type (used by mutation helpers so the orchestrator can wrap them in $transaction)
type Tx = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const includeTeamMemberInfo = {
  fromSupervisor: {
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  },
  toSupervisor: {
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  },
};

export async function getAllSupervisorCoverage(): Promise<SupervisorCoverageDTO[]> {
  const results = await prisma.supervisorCoverage.findMany({
    include: includeTeamMemberInfo,
    orderBy: { supervisorCoverageId: 'desc' },
  });
  return results as SupervisorCoverageDTO[];
}

export async function getSupervisorCoverageById(id: number): Promise<SupervisorCoverageDTO | null> {
  const result = await prisma.supervisorCoverage.findUnique({
    where: { supervisorCoverageId: id },
    include: includeTeamMemberInfo,
  });
  return result as SupervisorCoverageDTO | null;
}

// A supervisor is "party to" active coverage if they are the from- or to- side
// of a row where today falls in [coverageStartDate, coverageEndDate] and it
// has not been ended early. Used by the orchestrator's no-chaining validation.
export async function getActivePartyCoverage(
  supervisorId: number,
  tx: Tx = prisma,
): Promise<SupervisorCoverageDTO[]> {
  const today = new Date();
  const results = await tx.supervisorCoverage.findMany({
    where: {
      AND: [
        { OR: [{ fromSupervisorId: supervisorId }, { toSupervisorId: supervisorId }] },
        { coverageStartDate: { lte: today } },
        { coverageEndedAt: null },
        { OR: [{ coverageEndDate: null }, { coverageEndDate: { gte: today } }] },
      ],
    },
    include: includeTeamMemberInfo,
  });
  return results as SupervisorCoverageDTO[];
}

export async function createSupervisorCoverage(
  dto: CreateSupervisorCoverageDTO & { coverageCreatedBy: number },
  tx: Tx = prisma,
): Promise<SupervisorCoverageDTO> {
  const created = await tx.supervisorCoverage.create({
    data: {
      fromSupervisorId: dto.fromSupervisorId,
      toSupervisorId: dto.toSupervisorId,
      coverageStartDate: new Date(dto.coverageStartDate),
      coverageEndDate: dto.coverageEndDate ? new Date(dto.coverageEndDate) : null,
      coverageCreatedBy: dto.coverageCreatedBy,
    },
    include: includeTeamMemberInfo,
  });
  return created as SupervisorCoverageDTO;
}

export async function endSupervisorCoverageEarly(
  id: number,
  endedBy: number,
  tx: Tx = prisma,
): Promise<SupervisorCoverageDTO> {
  const updated = await tx.supervisorCoverage.update({
    where: { supervisorCoverageId: id },
    data: {
      coverageEndedAt: new Date(),
      coverageEndedBy: endedBy,
      coverageUpdatedBy: endedBy,
      coverageUpdatedAt: new Date(),
    },
    include: includeTeamMemberInfo,
  });
  return updated as SupervisorCoverageDTO;
}
