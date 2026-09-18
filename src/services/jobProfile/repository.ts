import { prisma } from '../../db/prisma';
import type { SkillDTO, GroupDTO, DerivedJobProfileDTO } from '@shared/dto';

export async function getAllSkills(): Promise<SkillDTO[]> {
  const rows = await prisma.skill.findMany({
    select: { skillId: true, skillName: true },
    orderBy: { skillName: 'asc' },
  });
  return rows;
}

export async function getAllGroups(): Promise<GroupDTO[]> {
  const rows = await prisma.group.findMany({
    select: { groupId: true, groupName: true },
    orderBy: { groupName: 'asc' },
  });
  return rows;
}

export async function findJobProfileMapping(
  posId: number,
  tibId: number,
  sklId: number,
  grpId: number,
): Promise<DerivedJobProfileDTO> {
  const mapping = await prisma.jobProfileMapping.findUnique({
    where: { posId_tibId_sklId_grpId: { posId, tibId, sklId, grpId } },
    select: { jobProfile: { select: { jobProfileId: true, jobProfileName: true, jobProfileCode: true } } },
  });

  if (!mapping) {
    return { jobProfileId: null, jobProfileName: null, jobProfileCode: null };
  }

  return {
    jobProfileId: mapping.jobProfile.jobProfileId,
    jobProfileName: mapping.jobProfile.jobProfileName,
    jobProfileCode: mapping.jobProfile.jobProfileCode,
  };
}
