import { prisma } from './prisma';
import type { ProjectAssignment, Prisma } from '@prisma/client';

export const TABLE = 'ds.tbl_tms_x_projects';

export async function ensureTeamMemberProjectsTableExists(): Promise<boolean> {
  try {
    await prisma.projectAssignment.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllTeamMemberProjects(): Promise<ProjectAssignment[]> {
  return await prisma.projectAssignment.findMany({
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

export async function getTeamMemberProjectsByProject(projectId: number): Promise<ProjectAssignment[]> {
  return await prisma.projectAssignment.findMany({
    where: { projectId },
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
