import { prisma } from '../../../db/prisma';
import { getWorkdayInfoById } from '../../../db/workdayInfo';
import type { TeamMemberProfileDTO } from '../../../../shared/dto/TeamMemberProfile';

/**
 * Returns the full profile for the currently authenticated team member.
 * Does not require a supervisor relationship — the user always has access to their own data.
 */
export async function getMyOwnProfile(
  teamMemberId: number,
): Promise<TeamMemberProfileDTO | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    include: {
      country: true,
      primaryRole: true,
      supervisorAssignments: {
        where: {
          supervisorAssignmentStartDate: { lte: today },
          OR: [
            { supervisorAssignmentEndDate: null },
            { supervisorAssignmentEndDate: { gte: today } },
          ],
        },
        orderBy: { supervisorAssignmentStartDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!teamMember) return null;

  const assignment = teamMember.supervisorAssignments[0] ?? null;

  const workdayInfo = teamMember.workdayId
    ? await getWorkdayInfoById(teamMember.workdayId)
    : null;

  const projectAssignments = await prisma.projectAssignment.findMany({
    where: {
      teamMemberId,
      projectAssignmentDeleted: false,
      OR: [
        { projectAssignmentEndDate: null },
        { projectAssignmentEndDate: { gte: today } },
      ],
      project: { projectActive: true },
    },
    include: {
      project: { include: { client: { include: { contacts: { where: { active: true } } } } } },
    },
  });

  return {
    teamMemberId: teamMember.teamMemberId,
    workdayId: teamMember.workdayId ?? null,
    teamMemberNames: teamMember.teamMemberNames,
    teamMemberSurnames: teamMember.teamMemberSurnames,
    teamMemberKnownAs: teamMember.teamMemberKnownAs ?? null,
    teamMemberFullName: `${teamMember.teamMemberNames} ${teamMember.teamMemberSurnames}`,
    teamMemberSeniority: teamMember.teamMemberSeniority,
    teamMemberEndDate: teamMember.teamMemberEndDate ?? null,
    teamMemberStartDate: teamMember.teamMemberStartDate ?? null,
    primaryRoleName: teamMember.primaryRole?.roleName ?? null,
    countryId: teamMember.countryId ?? null,
    countryName: teamMember.country?.countryName ?? null,
    countryIso: teamMember.country?.countryIso ?? null,
    countryCurrencySymbol: teamMember.country?.countryCurrencySymbol ?? null,
    reportType: 'Direct',
    reportLevel: 0,
    supervisorAssignmentStartDate: assignment?.supervisorAssignmentStartDate ?? new Date(0),
    supervisorAssignmentEndDate: assignment?.supervisorAssignmentEndDate ?? null,
    currentProjects: projectAssignments.map((a) => ({
      projectId: a.projectId,
      projectName: a.project.projectName ?? '',
      projectAssignmentAllocation: Number(a.projectAssignmentAllocation),
      projectAssignmentStartDate: a.projectAssignmentStartDate,
      projectAssignmentEndDate: a.projectAssignmentEndDate ?? null,
      clientName: a.project.client?.Name ?? null,
      clientContacts: a.project.client?.contacts.map((c) => c.name) ?? [],
    })),
    // Workday fields
    hireDate: workdayInfo?.hireDate ?? null,
    corporateEmail: workdayInfo?.corporateEmail ?? null,
    personalEmail: workdayInfo?.personalEmail ?? null,
    cellphone: workdayInfo?.cellphone ?? null,
    homePhone: workdayInfo?.homePhone ?? null,
    birthDate: workdayInfo?.birthDate ?? null,
    parenthood: workdayInfo?.parenthood ?? null,
    workStyle: workdayInfo?.workStyle ?? null,
    gender: workdayInfo?.gender ?? null,
    billingStatus: workdayInfo?.billingStatus ?? null,
    costCenterHierarchy: workdayInfo?.costCenterHierarchy ?? null,
    costCenterNames: workdayInfo?.costCenterNames ?? null,
    directManager: workdayInfo?.directManager ?? null,
    vacation: workdayInfo?.vacation != null ? Number(workdayInfo.vacation) : null,
    personalDays: workdayInfo?.personalDays != null ? Number(workdayInfo.personalDays) : null,
  };
}
