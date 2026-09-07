/**
 * Calculate the number of days between two dates respecting the category's day-counting mode.
 * When isCalendar = true: counts all calendar days (inclusive).
 * When isCalendar = false: counts only workdays (Mon-Fri, inclusive).
 */
export function calculateRequestedDays(startDate: Date, endDate: Date, isCalendar: boolean): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (isCalendar) {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

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
