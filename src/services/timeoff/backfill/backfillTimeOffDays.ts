/**
 * Backfill job: recalculates timeOffDays for any TimeOff record where
 * the value is null or 0, using the same rules as the creation flow
 * (calendar vs. workday, holiday-swap aware).
 *
 * Runs once on startup so bulk-uploaded records without day counts get fixed.
 */

import { prisma } from '../../../db/prisma';
import { calculateTimeOffDaysForTeamMember } from '../dayCalculation';

export async function backfillTimeOffDays(): Promise<void> {
  const records = await prisma.timeOff.findMany({
    where: {
      timeOffDays: 0,
      teamMemberId: { not: null },
      categoryId:   { not: null },
    },
    select: {
      timeOffId:        true,
      teamMemberId:     true,
      categoryId:       true,
      timeOffStartDate: true,
      timeOffEndDate:   true,
    },
  });

  if (records.length === 0) {
    console.log('[backfillTimeOffDays] No records need updating.');
    return;
  }

  console.log(`[backfillTimeOffDays] Found ${records.length} record(s) with missing timeOffDays. Recalculating…`);

  let updated = 0;
  let failed  = 0;

  for (const record of records) {
    try {
      const { totalDays } = await calculateTimeOffDaysForTeamMember(
        record.teamMemberId!,
        record.categoryId!,
        new Date(record.timeOffStartDate),
        new Date(record.timeOffEndDate),
      );

      await prisma.timeOff.update({
        where: { timeOffId: record.timeOffId },
        data:  { timeOffDays: totalDays },
      });

      updated++;
    } catch (err) {
      failed++;
      console.error(
        `[backfillTimeOffDays] Failed to update timeOffId=${record.timeOffId}:`,
        err,
      );
    }
  }

  console.log(`[backfillTimeOffDays] Done. Updated: ${updated}, Failed: ${failed}.`);
}
