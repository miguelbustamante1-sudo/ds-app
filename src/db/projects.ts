import { prisma } from './prisma';
import type { Project } from '@prisma/client';

export const TABLE = 'ds.tbl_projects';

/**
 * Check that the projects table exists (non-destructive)
 */
export async function ensureProjectsTableExists(): Promise<boolean> {
  try {
    await prisma.project.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllProjects(): Promise<Project[]> {
  return await prisma.project.findMany({
    orderBy: { projectId: 'asc' },
  });
}

export async function getProjectById(id: number): Promise<Project | null> {
  return await prisma.project.findUnique({
    where: { projectId: id },
  });
}

export async function createProject(
  projectName: string | null,
  projectExternalId: string | null,
  projectSow: string | null
): Promise<Project> {
  return await prisma.project.create({
    data: {
      projectName,
      projectExternalId,
      projectSow,
    },
  });
}

export async function updateProject(
  id: number,
  projectName: string | null,
  projectExternalId: string | null,
  projectSow: string | null
): Promise<Project | null> {
  return await prisma.project.update({
    where: { projectId: id },
    data: {
      projectName,
      projectExternalId,
      projectSow,
    },
  });
}

export async function deleteProject(id: number): Promise<void> {
  await prisma.project.delete({
    where: { projectId: id },
  });
}
