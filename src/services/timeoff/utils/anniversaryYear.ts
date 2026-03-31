/**
 * Computes the anniversary year window for a team member.
 *
 * Given a start date (e.g. 2020-05-22) and today:
 *   - If today >= this year's anniversary  → window starts on this year's anniversary
 *   - If today <  this year's anniversary  → window starts on last year's anniversary
 *
 * Returns { anniversaryYearStart, anniversaryYearEnd } as UTC-midnight Date objects.
 */
export function computeAnniversaryWindow(
  startDate: Date,
  today: Date = new Date()
): { anniversaryYearStart: Date; anniversaryYearEnd: Date } {
  const currentYear = today.getFullYear();
  const month = startDate.getUTCMonth(); // 0-based
  const day = startDate.getUTCDate();

  const thisYearAnniversary = new Date(Date.UTC(currentYear, month, day));

  const anniversaryYearStart =
    today >= thisYearAnniversary
      ? thisYearAnniversary
      : new Date(Date.UTC(currentYear - 1, month, day));

  // End = start + 1 year - 1 day
  const anniversaryYearEnd = new Date(
    Date.UTC(
      anniversaryYearStart.getUTCFullYear() + 1,
      anniversaryYearStart.getUTCMonth(),
      anniversaryYearStart.getUTCDate() - 1
    )
  );

  return { anniversaryYearStart, anniversaryYearEnd };
}
