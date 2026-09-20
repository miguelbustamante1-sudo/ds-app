export interface FixedDurationOptions {
  countWeekends: boolean;
  countHolidays: boolean;
  /** Full-day holidays only — half-day holidays are not treated as non-chargeable here. */
  holidayDates: Date[];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isNonChargeable(date: Date, options: FixedDurationOptions): boolean {
  const { countWeekends, countHolidays, holidayDates } = options;

  const dayOfWeek = date.getDay();
  if (!countWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return true;
  }

  if (!countHolidays && holidayDates.some((h) => isSameDay(h, date))) {
    return true;
  }

  return false;
}

/**
 * Calculate the number of chargeable days between two dates (inclusive), respecting
 * the same countWeekends/countHolidays gating as the backend's calculateDays engine.
 */
export function calculateRequestedDays(
  startDate: Date,
  endDate: Date,
  options: FixedDurationOptions,
): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (!isNonChargeable(current, options)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Calculate end date for fixed-duration categories.
 * Walks forward from startDate, counting a day toward fixedDays unless it's
 * non-chargeable under the same rule calculateRequestedDays uses. Stops once
 * fixedDays chargeable days have been counted (start date counts as day 1).
 */
export function calculateFixedDurationEndDate(
  startDate: Date,
  fixedDays: number,
  options: FixedDurationOptions,
): Date {
  const endDate = new Date(startDate);

  let daysAdded = isNonChargeable(endDate, options) ? 0 : 1;
  while (daysAdded < fixedDays) {
    endDate.setDate(endDate.getDate() + 1);
    if (!isNonChargeable(endDate, options)) {
      daysAdded++;
    }
  }

  return endDate;
}
