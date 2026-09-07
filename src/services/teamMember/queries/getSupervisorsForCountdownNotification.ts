/**
 * Purpose-built wrapper for countdown notification supervisor resolution.
 *
 * Calls getSupervisors() internally (canonical upward CTE) and resolves
 * the resulting teamMemberId values to userId values via the notification
 * repository. Returns only what the countdown job needs.
 */

import { getSupervisors } from './getSupervisors';
import { getUserIdsByTeamMemberIds } from '../../notifications/repository';

export interface CountdownNotificationSupervisorDTO {
  userId: number;
}

/**
 * Returns user IDs for all supervisors (up to 3 levels above) the given team member.
 * Used exclusively by the countdown notification job.
 * If a supervisor has no linked user account they are silently excluded.
 */
export async function getSupervisorsForCountdownNotification(
  teamMemberId: number,
): Promise<CountdownNotificationSupervisorDTO[]> {
  const supervisorTeamMemberIds = await getSupervisors(teamMemberId);
  if (supervisorTeamMemberIds.length === 0) return [];

  const userIds = await getUserIdsByTeamMemberIds(supervisorTeamMemberIds);
  return userIds.map((userId) => ({ userId }));
}
