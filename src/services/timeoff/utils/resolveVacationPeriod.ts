import { prisma } from '../../../db/prisma';
import { computeAnniversaryWindow } from './anniversaryYear';

/**
 * Returns the vacation period string (e.g. "2025-2026") for the team member's
 * current anniversary year, or null if the category is not Vacation.
 * Only called at time-off creation time.
 */
export async function resolveVacationPeriod(
  teamMemberId: number,
  categoryId: number
): Promise<string | null> {
  const category = await prisma.timeOffCategory.findUnique({
    where: { categoryId },
    select: { categoryName: true },
  });

  if (!category || category.categoryName.trim().toLowerCase() !== 'vacation') {
    return null;
  }

  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { teamMemberStartDate: true, workdayId: true },
  });

  if (!member) return null;

  let hireDate: Date | null = null;

  if (member.workdayId) {
    const workdayInfo = await prisma.workdayInfo.findUnique({
      where: { wdid: member.workdayId },
      select: { hireDate: true },
    });
    hireDate = workdayInfo?.hireDate ?? null;
  }

  const startDate = hireDate ?? member.teamMemberStartDate;
  const { anniversaryYearStart, anniversaryYearEnd } = computeAnniversaryWindow(startDate);

  const startYear = anniversaryYearStart.getUTCFullYear();
  const endYear = anniversaryYearEnd.getUTCFullYear();

  return `${startYear}-${endYear}`;
}
