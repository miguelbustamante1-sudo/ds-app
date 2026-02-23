import { prisma } from './prisma';
import type { Project } from '@prisma/client';

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

export interface CreateProjectInput {
  projectName: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  projectActive?: boolean | null;
  projectCreatedAt: Date;
  projectCreatedBy: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return await prisma.project.create({
    data: {
      projectName: input.projectName,
      projectExternalId: input.projectExternalId ?? null,
      projectSow: input.projectSow ?? null,
      projectStartDate: input.projectStartDate ?? null,
      projectEndDate: input.projectEndDate ?? null,
      projectActive: input.projectActive ?? true,
      projectCreatedAt: input.projectCreatedAt,
      projectCreatedBy: input.projectCreatedBy,
    },
  });
}

export interface UpdateProjectInput {
  projectName?: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  projectActive?: boolean | null;
}

export async function updateProject(
  id: number,
  input: UpdateProjectInput
): Promise<Project | null> {
  const data: Record<string, unknown> = {};
  if (input.projectName !== undefined) data.projectName = input.projectName;
  if (input.projectExternalId !== undefined) data.projectExternalId = input.projectExternalId;
  if (input.projectSow !== undefined) data.projectSow = input.projectSow;
  if (input.projectStartDate !== undefined) data.projectStartDate = input.projectStartDate;
  if (input.projectEndDate !== undefined) data.projectEndDate = input.projectEndDate;
  if (input.projectActive !== undefined) data.projectActive = input.projectActive;

  return await prisma.project.update({
    where: { projectId: id },
    data,
  });
}

export async function deleteProject(id: number): Promise<void> {
  await prisma.project.delete({
    where: { projectId: id },
  });
}
