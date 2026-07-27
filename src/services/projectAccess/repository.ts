import { prisma } from '../../db/prisma';
import type { Prisma, ProjectGrant } from '@prisma/client';

export const TABLE = 'pgr_project_grants';

const INCLUDE = {
  teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
} satisfies Prisma.ProjectGrantInclude;

export type ProjectGrantWithDetails = Prisma.ProjectGrantGetPayload<{ include: typeof INCLUDE }>;

export async function getProjectManagerId(projectId: number): Promise<number | null> {
  const project = await prisma.project.findUnique({ where: { projectId }, select: { projectManagerId: true } });
  return project?.projectManagerId ?? null;
}

export async function getGrant(projectId: number, teamMemberId: number): Promise<ProjectGrant | null> {
  return prisma.projectGrant.findUnique({
    where: { projectId_teamMemberId: { projectId, teamMemberId } },
  });
}

export async function getGrantsForProject(projectId: number): Promise<ProjectGrantWithDetails[]> {
  return prisma.projectGrant.findMany({
    where: { projectId },
    include: INCLUDE,
    orderBy: { projectGrantId: 'asc' },
  });
}

export async function getGrantById(id: number): Promise<ProjectGrant | null> {
  return prisma.projectGrant.findUnique({ where: { projectGrantId: id } });
}

export async function createGrant(
  data: Prisma.ProjectGrantUncheckedCreateInput,
): Promise<ProjectGrantWithDetails> {
  return prisma.projectGrant.create({ data, include: INCLUDE });
}

export async function deleteGrant(id: number): Promise<ProjectGrant> {
  return prisma.projectGrant.delete({ where: { projectGrantId: id } });
}
