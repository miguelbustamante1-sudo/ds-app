/**
 * Unified day-counting engine.
 * Each day in [startDate, endDate] is independently gated by two flags:
 *  - countWeekends: if false, Sat/Sun are excluded outright (no holiday check needed).
 *  - countHolidays: if false, a day matching a holiday entry is excluded (or reduced
 *    by 0.5 for a half-day holiday), unless it was already excluded as a weekend.
 */
import type { CalculateDaysOptions } from '../types';

export function calculateDays(
  startDate: Date,
  endDate: Date,
  options: CalculateDaysOptions,
): number {
  const { countWeekends, countHolidays, holidays } = options;

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const holidayMap = new Map<string, boolean>();
  for (const { date, isHalfDay } of holidays) {
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    holidayMap.set(key, isHalfDay);
  }

  let total = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!countWeekends && isWeekend) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    let dayValue = 1;

    if (!countHolidays) {
      const key = `${current.getUTCFullYear()}-${current.getUTCMonth()}-${current.getUTCDate()}`;
      if (holidayMap.has(key)) {
        dayValue -= holidayMap.get(key) ? 0.5 : 1;
      }
    }

    total += dayValue;
    current.setDate(current.getDate() + 1);
  }

  return total;
}
