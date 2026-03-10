import { getReports } from './getReports';
import { getWorkdayInfoById } from '../../../db/workdayInfo';
import type { TeamMemberProfileDTO } from '../../../../shared/dto/TeamMemberProfile';

/**
 * Returns the full profile for a single team member who must be in the
 * supervisor's reporting hierarchy (direct or indirect).
 *
 * Returns null when:
 *  - the target team member is not found under the given supervisor, or
 *  - the supervisorId itself is not a valid team member ID.
 */
export async function getProfileForSupervisor(
  supervisorId: number,
  targetTeamMemberId: number,
): Promise<TeamMemberProfileDTO | null> {
  // 1. Fetch full hierarchy via the canonical function
  const reports = await getReports(supervisorId, true);

  // 2. Confirm access — null means this supervisor cannot view the requested member
  const supervised = reports.find((r) => r.teamMemberId === targetTeamMemberId) ?? null;
  if (!supervised) return null;

  // 3. Fetch Workday info (null-safe — workdayId may be absent)
  const workdayInfo = supervised.workdayId
    ? await getWorkdayInfoById(supervised.workdayId)
    : null;

  // 4. Merge into combined DTO
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
