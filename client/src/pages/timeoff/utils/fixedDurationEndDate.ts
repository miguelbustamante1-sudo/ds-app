/**
 * Calculate end date for fixed-duration categories.
 * When isCalendar = true: counts all days (including weekends).
 * When isCalendar = false: counts only workdays (Mon-Fri), skipping weekends.
 */
export function calculateFixedDurationEndDate(
  startDate: Date,
  fixedDays: number,
  isCalendar: boolean
): Date {
  const endDate = new Date(startDate);

  if (isCalendar) {
    // Calendar days: simply add days
    endDate.setDate(endDate.getDate() + fixedDays - 1);
  } else {
    // Workdays: skip weekends
    let daysAdded = 1; // start date counts as day 1
    while (daysAdded < fixedDays) {
      endDate.setDate(endDate.getDate() + 1);
      const dayOfWeek = endDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
  }

  return endDate;
}
