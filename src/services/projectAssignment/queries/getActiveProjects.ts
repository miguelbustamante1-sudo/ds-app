/**
 * Query to find projects that are marked as active
 */

import { prisma } from '../../../db/prisma';
import type { ProjectDTO } from '@shared/dto';

export async function getActiveProjects(search?: string): Promise<ProjectDTO[]> {
  const projects = await prisma.project.findMany({
    where: {
      projectActive: true,
      ...(search
        ? { projectName: { contains: search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: { projectName: 'asc' },
    include: { client: true },
  });

  return projects.map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectExternalId: p.projectExternalId,
    projectSow: p.projectSow,
    projectStartDate: p.projectStartDate?.toISOString() ?? null,
    projectEndDate: p.projectEndDate?.toISOString() ?? null,
    projectActive: p.projectActive ?? true,
    projectCreatedAt: p.projectCreatedAt?.toISOString() ?? null,
    projectCreatedBy: p.projectCreatedBy ?? null,
    clientId: p.clientId,
    clientName: p.client?.Name ?? null,
  }));
}
