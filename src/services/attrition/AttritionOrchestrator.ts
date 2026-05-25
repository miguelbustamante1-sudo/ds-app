/**
 * Attrition Orchestrator
 *
 * Cancels future and overlapping time-off requests for team members whose
 * end date has been reached. Designed to run once on startup and then
 * every 24 hours via setInterval in src/index.ts.
 */

import { warn, error } from '../../logger';
import { loadDepartedMembers }    from './components/LoadDepartedMembers';
import { loadAttritionStatusIds } from './components/LoadAttritionStatusIds';
import { loadTimeOffsToCancel }   from './components/LoadTimeOffsToCancel';
import { cancelTimeOffs }         from './components/CancelTimeOffs';

export async function processAttritionTimeOffs(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [departedMembers, statusIds] = await Promise.all([
      loadDepartedMembers(today),
      loadAttritionStatusIds(),
    ]);

    if (departedMembers.length === 0) return;

    warn(`[Attrition] Processing ${departedMembers.length} departed team member(s)`);

    let totalCancelled = 0;

    for (const member of departedMembers) {
      const endDate    = member.teamMemberEndDate;
      const endDateStr = endDate.toISOString().split('T')[0] ?? '';

      const { future, overlapping } = await loadTimeOffsToCancel(
        member.teamMemberId,
        endDate,
        statusIds,
      );

      if (future.length === 0 && overlapping.length === 0) continue;

      const { cancelledCount } = await cancelTimeOffs(
        future,
        overlapping,
        statusIds.cancelled,
        endDateStr,
      );

      totalCancelled += cancelledCount;
    }

    if (totalCancelled > 0) {
      warn(
        `[Attrition] Job completed — ${totalCancelled} time-off(s) cancelled across ${departedMembers.length} member(s)`
      );
    }
  } catch (e) {
    error('[Attrition] Job failed:', e instanceof Error ? e.message : String(e));
  }
}
