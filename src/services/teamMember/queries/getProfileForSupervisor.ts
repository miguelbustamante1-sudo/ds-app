import { getReports } from './getReports';
import { getAllActiveTeamMembers } from './getAllActiveTeamMembers';
import { getWorkdayInfoById } from '../../../db/workdayInfo';
import type { TeamMemberProfileDTO } from '../../../../shared/dto/TeamMemberProfile';

/**
 * Returns the full profile for a single team member.
 * When viewAll is false, the target must be in the supervisor's reporting
 * hierarchy — returns null otherwise.
 * When viewAll is true, any active team member can be retrieved.
 */
export async function getProfileForSupervisor(
  supervisorId: number,
  targetTeamMemberId: number,
  viewAll = false,
): Promise<TeamMemberProfileDTO | null> {
  const reports = viewAll
    ? await getAllActiveTeamMembers()
    : await getReports(supervisorId, true);

  const supervised = reports.find((r) => r.teamMemberId === targetTeamMemberId) ?? null;
  if (!supervised) return null;

  const workdayInfo = supervised.workdayId
    ? await getWorkdayInfoById(supervised.workdayId)
    : null;

  return {
    ...supervised,
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
