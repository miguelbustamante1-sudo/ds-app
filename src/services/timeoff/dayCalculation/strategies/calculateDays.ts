/**
 * Unified day-counting engine.
 * A day is included fully whenever EITHER applicable flag says it should be
 * (countWeekends for a weekend day, countHolidays for a holiday day) — being
 * "on" wins regardless of the other flag. Only when no applicable flag
 * justifies inclusion does the day get excluded (or, for a holiday-only
 * exclusion, reduced by 0.5 for a half-day holiday).
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
    const key = `${current.getUTCFullYear()}-${current.getUTCMonth()}-${current.getUTCDate()}`;
    const isHoliday = holidayMap.has(key);
    const isHalfDay = holidayMap.get(key) ?? false;

    const weekendJustifiesFull = isWeekend && countWeekends;
    const holidayJustifiesFull = isHoliday && countHolidays;

    let dayValue: number;
    if (weekendJustifiesFull || holidayJustifiesFull) {
      dayValue = 1;
    } else if (isWeekend && !countWeekends) {
      dayValue = 0;
    } else if (isHoliday && !countHolidays) {
      dayValue = isHalfDay ? 0.5 : 0;
    } else {
      dayValue = 1;
    }

    total += dayValue;
    current.setDate(current.getDate() + 1);
  }

  return total;
}
