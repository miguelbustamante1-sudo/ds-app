import { prisma } from '../../db/prisma';
import type { Prisma } from '@prisma/client';
import type { AuthorizerAssignmentDTO } from '@shared/dto/AuthorizerAssignment';

export const TABLE = 'txa_authorizer_assignment';

type Tx = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const includeTeamMemberInfo = {
  teamMember: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
    },
  },
  authorizer: {
    select: {
      teamMemberId: true,
      teamMemberNames: true,
      teamMemberSurnames: true,
      workdayId: true,
    },
  },
} satisfies Prisma.AuthorizerAssignmentInclude;

export async function getAllAuthorizerAssignments(): Promise<AuthorizerAssignmentDTO[]> {
  const results = await prisma.authorizerAssignment.findMany({
    include: includeTeamMemberInfo,
    orderBy: { authorizerAssignmentId: 'asc' },
  });
  return results as AuthorizerAssignmentDTO[];
}

export async function getAuthorizerAssignmentById(id: number): Promise<AuthorizerAssignmentDTO | null> {
  const result = await prisma.authorizerAssignment.findUnique({
    where: { authorizerAssignmentId: id },
    include: includeTeamMemberInfo,
  });
  return result as AuthorizerAssignmentDTO | null;
}

export async function getAuthorizerAssignmentsByTeamMember(teamMemberWdid: string): Promise<AuthorizerAssignmentDTO[]> {
  const results = await prisma.authorizerAssignment.findMany({
    where: { teamMemberWdid },
    include: includeTeamMemberInfo,
    orderBy: { authorizerAssignmentId: 'asc' },
  });
  return results as AuthorizerAssignmentDTO[];
}

export async function getAuthorizerAssignmentsByAuthorizer(authorizerWdid: string): Promise<AuthorizerAssignmentDTO[]> {
  const results = await prisma.authorizerAssignment.findMany({
    where: { authorizerWdid },
    include: includeTeamMemberInfo,
    orderBy: { authorizerAssignmentId: 'asc' },
  });
  return results as AuthorizerAssignmentDTO[];
}

export async function getOpenEndedAssignmentsForTeamMember(
  teamMemberWdid: string,
  tx: Tx = prisma,
): Promise<AuthorizerAssignmentDTO[]> {
  const results = await tx.authorizerAssignment.findMany({
    where: { teamMemberWdid, authorizerAssignmentEndDate: null },
    include: includeTeamMemberInfo,
    orderBy: { authorizerAssignmentId: 'asc' },
  });
  return results as AuthorizerAssignmentDTO[];
}

export async function createAuthorizerAssignment(
  payload: Prisma.AuthorizerAssignmentUncheckedCreateInput,
  tx: Tx = prisma,
): Promise<AuthorizerAssignmentDTO> {
  const result = await tx.authorizerAssignment.create({
    data: payload,
    include: includeTeamMemberInfo,
  });
  return result as AuthorizerAssignmentDTO;
}

export async function updateAuthorizerAssignment(
  id: number,
  payload: Prisma.AuthorizerAssignmentUncheckedUpdateInput,
  tx: Tx = prisma,
): Promise<AuthorizerAssignmentDTO | null> {
  if (Object.keys(payload).length === 0) {
    return getAuthorizerAssignmentById(id);
  }
  const result = await tx.authorizerAssignment.update({
    where: { authorizerAssignmentId: id },
    data: payload,
    include: includeTeamMemberInfo,
  });
  return result as AuthorizerAssignmentDTO;
}

export async function deleteAuthorizerAssignment(id: number): Promise<boolean> {
  try {
    await prisma.authorizerAssignment.delete({
      where: { authorizerAssignmentId: id },
    });
    return true;
  } catch {
    return false;
  }
}
