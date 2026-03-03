/**
 * Countdown Notification Component
 *
 * Creates exactly one countdown notification for one time off entry.
 * Resolves all recipients (team member + supervisor chain up to 3 levels),
 * builds the payload, and delegates to NotificationOrchestrator.create().
 *
 * Follows the same structure as NotifySupervisorNewRequest.ts.
 */

import { notificationOrchestrator } from '../../../notifications/NotificationOrchestrator';
import { getUserIdsByTeamMemberIds } from '../../../notifications/repository';
import { getSupervisorsForCountdownNotification } from '../../../teamMember/queries/getSupervisorsForCountdownNotification';
import { formatDateDDMMYYYY } from '../../components/FormatDateDDMMYYYY';

export interface NotifyCountdownTimeOffParams {
  timeOffId: number;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  categoryName: string;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  daysOffset: 90 | 60 | 30 | 15 | 1;
}

export async function notifyCountdownTimeOff(params: NotifyCountdownTimeOffParams): Promise<void> {
  const fullName = `${params.teamMemberNames} ${params.teamMemberSurnames}`;

  // Step 1: Resolve team member userId
  const memberUserIds = await getUserIdsByTeamMemberIds([params.teamMemberId]);

  // Step 2: Resolve supervisor userIds (up to 3 levels)
  const supervisorDTOs = await getSupervisorsForCountdownNotification(params.teamMemberId);
  const supervisorUserIds = supervisorDTOs.map((s) => s.userId);

  // Step 3: Merge + deduplicate all recipient userIds
  const allUserIds = [...new Set([...memberUserIds, ...supervisorUserIds])];

  // If there are no recipients at all, nothing to send
  if (allUserIds.length === 0) return;

  // Step 4: Format dates as DD/MM/YYYY
  const startFormatted = formatDateDDMMYYYY(params.timeOffStartDate.toISOString());
  const endFormatted = formatDateDDMMYYYY(params.timeOffEndDate.toISOString());

  // Step 5: Build description based on daysOffset
  const description =
    params.daysOffset === 1
      ? 'starts time-off tomorrow'
      : `has upcoming time-off in ${params.daysOffset} days`;

  // Step 6: Create the notification for all recipients
  await notificationOrchestrator.create({
    categoryName: 'Inbox',
    itemType: 'item-3',
    payload: {
      userName: fullName,
      avatar: '300-1.png',
      badgeColor: 'online',
      description,
      link: `/timeoff-detail/${params.timeOffId}`,
      day: startFormatted,
      info: `${startFormatted} to ${endFormatted}`,
      sourceId: params.timeOffId,
      sourceEntity: 'TimeOff',
    },
    recipients: allUserIds.map((userId) => ({ userId, actionType: 'readonly' })),
  });
}
