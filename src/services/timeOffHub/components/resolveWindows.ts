/**
 * Date window helpers for the Time Off Hub summary — shared by the count
 * and record-fetching functions so every consumer agrees on the exact same
 * boundaries. Plain Date math (no date-fns) — date-fns is not a backend
 * dependency in this repo; getDashboardImportantDates.ts uses the same
 * plain-Date convention.
 */

export interface DateWindow {
  from: Date;
  to: Date;
}

const UPCOMING_WINDOW_DAYS = 45;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today through today + 45 days, inclusive. */
export function resolveUpcomingWindow(): DateWindow {
  const from = startOfToday();
  const to = new Date(from.getTime() + UPCOMING_WINDOW_DAYS * MS_PER_DAY);
  return { from, to };
}

/** Monday through Sunday of the current calendar week, inclusive. */
export function resolveThisWeekWindow(): DateWindow {
  const today = startOfToday();
  const dayOfWeek = today.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const from = new Date(today);
  from.setDate(today.getDate() + diffToMonday);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from, to };
}
