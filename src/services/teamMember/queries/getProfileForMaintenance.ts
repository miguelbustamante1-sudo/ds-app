import { getProfileForSupervisor } from './getProfileForSupervisor';
import type { TeamMemberProfileDTO } from '../../../../shared/dto/TeamMemberProfile';

export async function getProfileForMaintenance(
  teamMemberId: number,
): Promise<TeamMemberProfileDTO | null> {
  // viewAll=true bypasses hierarchy check and uses getAllActiveTeamMembers()
  // supervisorId is ignored when viewAll=true
  return getProfileForSupervisor(0, teamMemberId, true);
}
