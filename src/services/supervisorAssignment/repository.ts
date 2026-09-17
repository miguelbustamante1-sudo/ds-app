/**
 * Supervisor Assignment Repository
 * Database access layer for supervisor assignments
 */

import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { SupervisorAssignmentDTO } from '@shared/dto/SupervisorAssignment';

export const TABLE = 'ds.tbl_tms_x_supervisor';

// Prisma transaction-client type (used by mutation helpers so the orchestrator can wrap them in $transaction)
type Tx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Select clause for including team member info
const includeTeamMemberInfo = {
  teamMember: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
      teamMemberEndDate: true,
    },
  },
  supervisor: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
      teamMemberEndDate: true,
    },
  },
};

export async function ensureSupervisorAssignmentsTableExists(): Promise<boolean> {
  try {
    await prisma.supervisorAssignment.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllSupervisorAssignments(): Promise<SupervisorAssignmentDTO[]> {
  const results = await prisma.supervisorAssignment.findMany({
    include: includeTeamMemberInfo,
    orderBy: { supervisorAssignmentId: 'asc' },
  });
  return results as SupervisorAssignmentDTO[];
}

export async function getSupervisorAssignmentById(id: number): Promise<SupervisorAssignmentDTO | null> {
  const result = await prisma.supervisorAssignment.findUnique({
    where: { supervisorAssignmentId: id },
    include: includeTeamMemberInfo,
  });
  return result as SupervisorAssignmentDTO | null;
}

export async function getSupervisorAssignmentsByTeamMember(teamMemberId: number): Promise<SupervisorAssignmentDTO[]> {
  const results = await prisma.supervisorAssignment.findMany({
    where: { teamMemberId },
    include: includeTeamMemberInfo,
    orderBy: { supervisorAssignmentId: 'asc' },
  });
  return results as SupervisorAssignmentDTO[];
}

export async function getSupervisorAssignmentsBySupervisor(supervisorId: number): Promise<SupervisorAssignmentDTO[]> {
  const results = await prisma.supervisorAssignment.findMany({
    where: { supervisorId },
    include: includeTeamMemberInfo,
    orderBy: { supervisorAssignmentId: 'asc' },
  });
  return results as SupervisorAssignmentDTO[];
}

export async function getOpenEndedAssignmentsForTeamMember(
  teamMemberId: number,
  tx: Tx = prisma,
): Promise<SupervisorAssignmentDTO[]> {
  const results = await tx.supervisorAssignment.findMany({
    where: { teamMemberId, supervisorAssignmentEndDate: null },
    include: includeTeamMemberInfo,
    orderBy: { supervisorAssignmentId: 'asc' },
  });
  return results as SupervisorAssignmentDTO[];
}

export async function createSupervisorAssignment(
  payload: Prisma.SupervisorAssignmentUncheckedCreateInput,
  tx: Tx = prisma,
): Promise<SupervisorAssignmentDTO> {
  const result = await tx.supervisorAssignment.create({
    data: payload,
    include: includeTeamMemberInfo,
  });
  return result as SupervisorAssignmentDTO;
}

export async function updateSupervisorAssignment(
  id: number,
  payload: Prisma.SupervisorAssignmentUncheckedUpdateInput,
  tx: Tx = prisma,
): Promise<SupervisorAssignmentDTO | null> {
  if (Object.keys(payload).length === 0) {
    return getSupervisorAssignmentById(id);
  }

  const result = await tx.supervisorAssignment.update({
    where: { supervisorAssignmentId: id },
    data: payload,
    include: includeTeamMemberInfo,
  });
  return result as SupervisorAssignmentDTO;
}

export async function deleteSupervisorAssignment(id: number): Promise<boolean> {
  try {
    await prisma.supervisorAssignment.delete({
      where: { supervisorAssignmentId: id },
    });
    return true;
  } catch {
    return false;
  }
}
