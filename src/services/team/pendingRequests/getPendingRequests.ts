/**
 * Orchestrator for the Supervisor Pending Requests page.
 *
 * Runs all entity loaders in parallel, merges the results, and sorts
 * by createdAt descending (newest first).
 *
 * Adding a new entity only requires:
 *   1. A new loader under ./loaders/
 *   2. Spreading its result into the Promise.all below.
 */

import { loadStatusIds } from '../../holidaySwap/components/LoadStatusIds';
import { getReportsForPendingRequests } from '../../teamMember/queries/getReportsForPendingRequests';
import { loadPendingTimeOffs } from './loaders/loadPendingTimeOffs';
import { loadPendingHolidaySwaps } from './loaders/loadPendingHolidaySwaps';
import type { PendingRequest } from '@shared/dto/PendingRequest';

export async function getPendingRequests(
  supervisorId: number,
  viewAll = false,
): Promise<PendingRequest[]> {
  const [statuses, members] = await Promise.all([
    loadStatusIds(),
    getReportsForPendingRequests(supervisorId, viewAll),
  ]);

  const tentativeStatusId = statuses.pending;

  const [timeOffs, swaps] = await Promise.all([
    loadPendingTimeOffs(members, tentativeStatusId),
    loadPendingHolidaySwaps(members, tentativeStatusId),
  ]);

  const merged: PendingRequest[] = [...timeOffs, ...swaps];

  merged.sort((a, b) => {
    if (a.createdAt == null && b.createdAt == null) return 0;
    if (a.createdAt == null) return 1;
    if (b.createdAt == null) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return merged;
}
