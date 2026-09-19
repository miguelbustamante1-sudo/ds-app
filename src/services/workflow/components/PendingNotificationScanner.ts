import { prisma } from '../../../db/prisma';
import { notifyWorkflowEvent } from './NotificationDispatcher';

/**
 * Async safety net for the one DATABASE-type path with no TypeScript in its
 * call chain (spec §4.7, §3.5(b)): a template instantiated by a pure DB-to-DB
 * trigger has no code present to call notifyWorkflowEvent synchronously. This
 * scanner picks up any wnt row nothing has dispatched yet.
 *
 * Safe as a general (not DATABASE-type-scoped) sweep: notifyWorkflowEvent
 * itself stamps wnt_last_triggered_at on successful dispatch, and that's this
 * scanner's own filter — a CODE-type task's notification already fired
 * synchronously at activation, so its wnt row is already stamped by the time
 * this runs and is correctly skipped. The assignmentType: 'CONTEXT' filter is
 * a second, defensive check, since only a DATABASE-type task ever has it.
 */
export async function processPendingWorkflowNotifications(): Promise<void> {
  let pending: Array<{ witId: string; task: { resolvedUserId: number | null } }>;

  try {
    pending = await prisma.wntWorkflowInstanceNotification.findMany({
      where: {
        eventType: 'ON_ASSIGNMENT',
        lastTriggeredAt: null,
        task: { state: 'ACTIVE', assignmentType: 'CONTEXT', resolvedUserId: { not: null } },
      },
      select: { witId: true, task: { select: { resolvedUserId: true } } },
    });
  } catch (err: unknown) {
    console.error('PendingNotificationScanner: failed to query pending notifications', err);
    return;
  }

  for (const row of pending) {
    try {
      await notifyWorkflowEvent({
        witId: row.witId,
        eventType: 'ON_ASSIGNMENT',
        recipientUserIds: [String(row.task.resolvedUserId)],
      });
    } catch (err: unknown) {
      console.error('PendingNotificationScanner: failed to dispatch notification', row.witId, err);
    }
  }
}
