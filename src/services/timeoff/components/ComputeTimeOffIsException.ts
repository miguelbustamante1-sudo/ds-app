import { prisma } from '../../../db/prisma';

const GT_COUNTRY_ISO = 'GT';
const VACATION_CATEGORY_NAME = 'Vacation';
const EXCEPTION_THRESHOLD = 5;

/**
 * Determines whether a time-off record should be flagged as an exception.
 *
 * Returns true only when:
 *   - The team member's country ISO is 'GT' (Guatemala)
 *   - The category is 'Vacation'
 *   - The resolved workday days count is less than 5
 *
 * Returns false for all other combinations.
 */
export async function computeTimeOffIsException(
  teamMemberId: number,
  categoryId: number,
  totalDays: number
): Promise<boolean> {
  const [teamMember, category] = await Promise.all([
    prisma.teamMember.findUnique({
      where: { teamMemberId },
      select: { country: { select: { countryIso: true } } },
    }),
    prisma.timeOffCategory.findUnique({
      where: { categoryId },
      select: { categoryName: true },
    }),
  ]);

  const countryIso = teamMember?.country?.countryIso?.toUpperCase() ?? null;
  const categoryName = category?.categoryName?.trim() ?? null;

  return (
    countryIso === GT_COUNTRY_ISO &&
    categoryName?.toLowerCase() === VACATION_CATEGORY_NAME.toLowerCase() &&
    totalDays < EXCEPTION_THRESHOLD
  );
}
