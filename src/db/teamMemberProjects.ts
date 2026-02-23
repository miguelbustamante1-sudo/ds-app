import { prisma } from './prisma';
import type { ProjectAssignment, Prisma } from '@prisma/client';

export const TABLE = 'ds.tmp_team_member_project';

export async function ensureTeamMemberProjectsTableExists(): Promise<boolean> {
  try {
    await prisma.projectAssignment.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllTeamMemberProjects() {
  return await prisma.projectAssignment.findMany({
    include: {
      teamMember: true,
      project: true,
    },
    orderBy: { projectAssignmentId: 'asc' },
  });
}

export async function getTeamMemberProjectById(id: number): Promise<ProjectAssignment | null> {
  return await prisma.projectAssignment.findUnique({
    where: { projectAssignmentId: id },
  });
}

export async function getTeamMemberProjectsByTeamMember(teamMemberId: number): Promise<ProjectAssignment[]> {
  return await prisma.projectAssignment.findMany({
    where: { teamMemberId },
    orderBy: { projectAssignmentId: 'asc' },
  });
}

export async function getTeamMemberProjectsByProject(projectId: number) {
  return await prisma.projectAssignment.findMany({
    where: { projectId },
    include: { teamMember: true },
    orderBy: { projectAssignmentId: 'asc' },
  });
}

export async function createTeamMemberProject(
  payload: Prisma.ProjectAssignmentUncheckedCreateInput
): Promise<ProjectAssignment> {
  return await prisma.projectAssignment.create({
    data: payload,
  });
}

export async function updateTeamMemberProject(
  id: number,
  payload: Prisma.ProjectAssignmentUncheckedUpdateInput
): Promise<ProjectAssignment | null> {
  if (Object.keys(payload).length === 0) {
    return getTeamMemberProjectById(id);
  }

  return await prisma.projectAssignment.update({
    where: { projectAssignmentId: id },
    data: payload,
  });
}

export async function deleteTeamMemberProject(id: number): Promise<boolean> {
  try {
    await prisma.projectAssignment.delete({
      where: { projectAssignmentId: id },
    });
    return true;
  } catch {
    return false;
  }
}

export async function closeAndCreateAssignment(
  currentId: number,
  closeEndDate: Date,
  newRecord: Prisma.ProjectAssignmentUncheckedCreateInput,
  updatedBy: number | null,
  updatedDate: Date,
): Promise<{ closed: ProjectAssignment; created: ProjectAssignment }> {
  return await prisma.$transaction(async (tx) => {
    const closed = await tx.projectAssignment.update({
      where: { projectAssignmentId: currentId },
      data: {
        projectAssignmentEndDate: closeEndDate,
        projectAssignmentLastUpdatedBy: updatedBy,
        projectAssignmentLastUpdatedDate: updatedDate,
      },
    });

    const created = await tx.projectAssignment.create({
      data: newRecord,
    });

    return { closed, created };
  });
}
