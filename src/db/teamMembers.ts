import { prisma } from './prisma';
import type { TeamMember, Prisma } from '@prisma/client';
import { info } from '../logger';

export const TABLE = 'ds.tbl_team_members';

export async function ensureTeamMembersTableExists(): Promise<boolean> {
  info(`Checking if table ${TABLE} exists`);
  try {
    await prisma.teamMember.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  info(`Fetching all team members from table ${TABLE}`);
  return await prisma.teamMember.findMany({
    orderBy: { teamMemberId: 'asc' },
  });
}

export async function getAllTeamMembersWithDetails() {
  info(`Fetching all team members with details from table ${TABLE}`);
  return await prisma.teamMember.findMany({
    include: {
      country: { select: { countryName: true } },
      primaryRole: { select: { roleName: true } },
      tierBand: { select: { tierBandDescription: true } },
    },
    orderBy: { teamMemberId: 'asc' },
  });
}

export async function getTeamMemberById(id: number): Promise<TeamMember | null> {
  return await prisma.teamMember.findUnique({
    where: { teamMemberId: id },
  });
}

export async function createTeamMember(payload: Prisma.TeamMemberCreateInput): Promise<TeamMember> {
  return await prisma.teamMember.create({
    data: payload,
  });
}

export async function updateTeamMember(id: number, payload: Prisma.TeamMemberUpdateInput): Promise<TeamMember | null> {
  if (Object.keys(payload).length === 0) {
    return getTeamMemberById(id);
  }

  return await prisma.teamMember.update({
    where: { teamMemberId: id },
    data: payload,
  });
}

export async function deleteTeamMember(id: number): Promise<void> {
  await prisma.teamMember.delete({
    where: { teamMemberId: id },
  });
}

export async function getTeamMembersByCountry(countryId: number): Promise<TeamMember[]> {
  return await prisma.teamMember.findMany({
    where: { countryId },
    orderBy: { teamMemberId: 'asc' },
  });
}

export async function getTeamMembersBySupervisor(supervisorId: number): Promise<TeamMember[]> {
  return await prisma.teamMember.findMany({
    where: {
      supervisorAssignments: {
        some: { supervisorId },
      },
    },
    orderBy: { teamMemberId: 'asc' },
  });
}
