import { prisma } from '../../../db/prisma';
import type { BusinessReferenceLink } from '../../workflow/components/BusinessReferenceLinkRegistry';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export async function getTimeOffTaskSummary(
  timeOffId: string,
): Promise<BusinessReferenceLink | null> {
  const id = parseInt(timeOffId, 10);
  if (Number.isNaN(id)) return null;

  const timeOff = await prisma.timeOff.findUnique({
    where: { timeOffId: id },
    include: { teamMember: true, category: true },
  });

  if (!timeOff) return null;

  const person = timeOff.teamMember
    ? `${timeOff.teamMember.teamMemberNames} ${timeOff.teamMember.teamMemberSurnames}`
    : 'Unknown employee';
  const category = timeOff.category?.categoryName ?? 'Time off';
  const dateRange = `${formatDate(timeOff.timeOffStartDate)} to ${formatDate(timeOff.timeOffEndDate)}`;

  return {
    url: `/timeoff-detail/${timeOff.timeOffId}`,
    summary: `${person} — ${category}, ${dateRange}`,
  };
}
