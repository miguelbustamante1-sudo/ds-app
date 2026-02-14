/**
 * Query to find projects that have at least one active assignment
 */

import { prisma } from '../../../db/prisma';
import type { ProjectDTO } from '@shared/dto';

export async function getActiveProjects(search?: string): Promise<ProjectDTO[]> {
  const today = new Date();

  const projects = await prisma.project.findMany({
    where: {
      projectAssignments: {
        some: {
          projectAssignmentDeleted: false,
          OR: [
            { projectAssignmentEndDate: null },
            { projectAssignmentEndDate: { gte: today } },
          ],
        },
      },
      ...(search
        ? { projectName: { contains: search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: { projectName: 'asc' },
  });

  return projects.map((p) => ({
    projectId: p.projectId,
    projectName: p.projectName,
    projectExternalId: p.projectExternalId,
    projectSow: p.projectSow,
  }));
}
