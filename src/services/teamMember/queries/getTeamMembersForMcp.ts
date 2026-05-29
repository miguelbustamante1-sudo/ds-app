import { prisma } from '../../../db/prisma';
import type { TeamMemberSummary, TeamMemberProfile } from '../../../mcp/types';

export async function searchTeamMembers(query: string): Promise<TeamMemberSummary[]> {
  const results = await prisma.teamMember.findMany({
    where: {
      teamMemberEndDate: null,
      OR: [
        { teamMemberNames: { contains: query, mode: 'insensitive' } },
        { teamMemberSurnames: { contains: query, mode: 'insensitive' } },
        { teamMemberKnownAs: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      primaryRole: { select: { posName: true } },
      country: { select: { countryName: true } },
    },
    take: 20,
    orderBy: [{ teamMemberSurnames: 'asc' }, { teamMemberNames: 'asc' }],
  });

  return results.map((tm) => ({
    teamMemberId: tm.teamMemberId,
    fullName: `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
    knownAs: tm.teamMemberKnownAs ?? null,
    position: tm.primaryRole?.posName ?? null,
    country: tm.country?.countryName ?? null,
    seniority: tm.teamMemberSeniority,
    startDate: tm.teamMemberStartDate.toISOString().split('T')[0] ?? '',
  }));
}

export async function getTeamMemberProfile(teamMemberId: number): Promise<TeamMemberProfile | null> {
  const tm = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    include: {
      primaryRole: { select: { posName: true } },
      country: { select: { countryName: true } },
      supervisorAssignments: {
        where: {
          supervisorAssignmentEndDate: null,
          supervisor: { is: { teamMemberEndDate: null } },
        },
        include: {
          supervisor: {
            select: {
              teamMemberId: true,
              teamMemberNames: true,
              teamMemberSurnames: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!tm) return null;

  const sup = tm.supervisorAssignments[0]?.supervisor ?? null;

  return {
    teamMemberId: tm.teamMemberId,
    names: tm.teamMemberNames,
    surnames: tm.teamMemberSurnames,
    fullName: `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
    knownAs: tm.teamMemberKnownAs ?? null,
    position: tm.primaryRole?.posName ?? null,
    country: tm.country?.countryName ?? null,
    seniority: tm.teamMemberSeniority,
    startDate: tm.teamMemberStartDate.toISOString().split('T')[0] ?? '',
    endDate: tm.teamMemberEndDate?.toISOString().split('T')[0] ?? null,
    active: tm.teamMemberEndDate === null,
    supervisor: sup
      ? {
          teamMemberId: sup.teamMemberId,
          fullName: `${sup.teamMemberNames} ${sup.teamMemberSurnames}`,
        }
      : null,
  };
}

export async function getDirectReports(supervisorId: number): Promise<TeamMemberSummary[]> {
  const assignments = await prisma.supervisorAssignment.findMany({
    where: {
      supervisorId,
      supervisorAssignmentEndDate: null,
      teamMember: { is: { teamMemberEndDate: null } },
    },
    include: {
      teamMember: {
        include: {
          primaryRole: { select: { posName: true } },
          country: { select: { countryName: true } },
        },
      },
    },
  });

  return assignments
    .map((a) => a.teamMember)
    .filter((tm): tm is NonNullable<typeof tm> => tm !== null)
    .sort((a, b) =>
      `${a.teamMemberSurnames} ${a.teamMemberNames}`.localeCompare(
        `${b.teamMemberSurnames} ${b.teamMemberNames}`
      )
    )
    .map((tm) => ({
      teamMemberId: tm.teamMemberId,
      fullName: `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
      knownAs: tm.teamMemberKnownAs ?? null,
      position: tm.primaryRole?.posName ?? null,
      country: tm.country?.countryName ?? null,
      seniority: tm.teamMemberSeniority,
      startDate: tm.teamMemberStartDate.toISOString().split('T')[0] ?? '',
    }));
}
