import { prisma } from '../../../db/prisma';
import type { BusinessReferenceLink } from '../../workflow/components/BusinessReferenceLinkRegistry';

/**
 * Derives a human-readable reason for why this swap needed exception
 * authorization, from the swap's own fields rather than a stored code —
 * no schema change needed. HOLIDAY_NOT_IN_FUTURE is the only exception
 * reason today; a future exception-eligible rule adds another condition
 * here rather than requiring new storage.
 */
function deriveExceptionReason(swap: { originalDate: Date }): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const original = new Date(swap.originalDate);
  original.setHours(0, 0, 0, 0);

  if (original <= today) {
    return 'holiday date has already passed';
  }

  return 'exception pending review';
}

/**
 * Registered against BusinessReferenceLinkRegistry for businessReferenceType
 * 'HolidaySwap'. Lets the generic workflow task UI show a human-readable
 * summary and a link to the swap's detail page, without knowing anything
 * about the holiday-swap domain.
 */
export async function getSwapTaskSummary(
  holidaySwapId: string,
): Promise<BusinessReferenceLink | null> {
  const id = parseInt(holidaySwapId, 10);
  if (Number.isNaN(id)) return null;

  const swap = await prisma.holidaySwap.findUnique({
    where: { holidaySwapId: id },
    include: { teamMember: true, holiday: true },
  });

  if (!swap) return null;

  const person = swap.teamMember
    ? `${swap.teamMember.teamMemberNames} ${swap.teamMember.teamMemberSurnames}`
    : 'Unknown employee';
  const reason = deriveExceptionReason(swap);

  return {
    url: `/holiday-swaps/${swap.holidaySwapId}`,
    summary: `${person} — ${swap.holiday.holidayName} swap exception: ${reason}`,
  };
}
