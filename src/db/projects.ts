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

export async function getAllProjects(clientId?: number) {
  return await prisma.project.findMany({
    where: clientId !== undefined ? { clientId } : {},
    orderBy: { projectId: 'asc' },
    include: { client: true },
  });
}

export async function getProjectById(id: number) {
  return await prisma.project.findUnique({
    where: { projectId: id },
    include: { client: true },
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
  clientId?: number | null;
}

export async function createProject(input: CreateProjectInput) {
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
      clientId: input.clientId ?? null,
    },
    include: { client: true },
  });
}

export interface UpdateProjectInput {
  projectName?: string | null;
  projectExternalId?: string | null;
  projectSow?: string | null;
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  projectActive?: boolean | null;
  clientId?: number | null;
}

export async function updateProject(id: number, input: UpdateProjectInput) {
  const data: Record<string, unknown> = {};
  if (input.projectName !== undefined) data.projectName = input.projectName;
  if (input.projectExternalId !== undefined) data.projectExternalId = input.projectExternalId;
  if (input.projectSow !== undefined) data.projectSow = input.projectSow;
  if (input.projectStartDate !== undefined) data.projectStartDate = input.projectStartDate;
  if (input.projectEndDate !== undefined) data.projectEndDate = input.projectEndDate;
  if (input.projectActive !== undefined) data.projectActive = input.projectActive;
  if (input.clientId !== undefined) data.clientId = input.clientId;

  return await prisma.project.update({
    where: { projectId: id },
    data,
    include: { client: true },
  });
}

export async function deleteProject(id: number): Promise<void> {
  await prisma.project.delete({
    where: { projectId: id },
  });
}
