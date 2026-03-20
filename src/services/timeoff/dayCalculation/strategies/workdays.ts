/**
 * Workdays calculation strategy (Monday-Friday only)
 * Used for Guatemala (GT)
 */

export function calculateWorkdays(
  startDate: Date,
  endDate: Date,
  weekdayHolidaysToExclude?: Date[],
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to midnight
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Subtract weekday holidays that fall within the range (UTC year/month/day comparison)
  if (weekdayHolidaysToExclude && weekdayHolidaysToExclude.length > 0) {
    for (const holiday of weekdayHolidaysToExclude) {
      const hYear = holiday.getUTCFullYear();
      const hMonth = holiday.getUTCMonth();
      const hDay = holiday.getUTCDate();
      const dayOfWeek = holiday.getUTCDay();
      // Only subtract if it's a weekday within the range
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const hDate = new Date(Date.UTC(hYear, hMonth, hDay));
        if (hDate >= start && hDate <= end) {
          count--;
        }
      }
    }
  }

  return count;
}
