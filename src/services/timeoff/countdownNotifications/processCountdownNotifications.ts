/**
 * Countdown Notification Job
 *
 * Runs daily and sends in-app notifications to a team member and their
 * supervisor chain (up to 3 levels up) whenever an active time off's
 * start date is exactly 90, 60, 30, 15, or 1 day(s) away from today.
 *
 * Mirrors processAttrition.ts in error handling, logging, and scheduling contract.
 * Designed to be called once on startup and then every 24 hours.
 */

import { warn, error } from '../../../logger';
import { findTimeOffsStartingOn, wasNotificationSentToday } from './queries';
import { notifyCountdownTimeOff } from './components/NotifyCountdownTimeOff';

const MILESTONES = [90, 60, 30, 15, 1] as const;
type Milestone = (typeof MILESTONES)[number];

export async function processCountdownNotifications(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    for (const daysOffset of MILESTONES) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysOffset);

      const upcomingTimeOffs = await findTimeOffsStartingOn(targetDate);

      if (upcomingTimeOffs.length === 0) continue;

      for (const timeOff of upcomingTimeOffs) {
        const alreadySent = await wasNotificationSentToday(timeOff.timeOffId);
        if (alreadySent) continue;

        await notifyCountdownTimeOff({
          timeOffId: timeOff.timeOffId,
          teamMemberId: timeOff.teamMemberId,
          teamMemberNames: timeOff.teamMemberNames,
          teamMemberSurnames: timeOff.teamMemberSurnames,
          categoryName: timeOff.categoryName,
          timeOffStartDate: timeOff.timeOffStartDate,
          timeOffEndDate: timeOff.timeOffEndDate,
          daysOffset: daysOffset as Milestone,
        });

        warn(
          `[Countdown] Sent ${daysOffset}-day notification for timeOffId ${timeOff.timeOffId}`,
        );
      }
    }

    warn('[Countdown] Job completed');
  } catch (e) {
    error('[Countdown] Job failed:', e instanceof Error ? e.message : String(e));
  }
}
