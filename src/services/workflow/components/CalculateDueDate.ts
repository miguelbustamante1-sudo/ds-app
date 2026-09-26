import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

export type ShiftWithDetails = Prisma.ShiftGetPayload<{ include: { details: true } }>;

/**
 * "08:00-17:00" (and every Shift's configured hours) are business-local
 * hours in this fixed timezone — never the ambient timezone of whatever
 * machine happens to run this code. Guatemala observes no DST, which keeps
 * the offset-correction math below exact year-round with a single fixed
 * zone; if a future Shift ever needs its own timezone, this becomes a
 * per-shift lookup instead of one constant.
 */
const BUSINESS_TIMEZONE = 'America/Guatemala';

interface WorkingWindow {
  startHour: number;
  endHour: number;
}

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0 = Sunday, matching JS Date.getDay()
}

const FALLBACK_WINDOW: WorkingWindow = { startHour: 8, endHour: 17 };
const MAX_DAYS_TO_SEARCH = 30;
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Reads `date`'s wall-clock components as seen in BUSINESS_TIMEZONE,
 * regardless of the ambient Node process's own local timezone. This is what
 * anchors business hours to a fixed real-world timezone instead of
 * accidentally depending on whatever host happens to run this code.
 */
function getZonedParts(date: Date): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dayOfWeek: WEEKDAY_INDEX[parts.weekday ?? ''] ?? date.getUTCDay(),
  };
}

/**
 * Converts wall-clock components meant as BUSINESS_TIMEZONE local time into
 * the UTC instant that actually represents them — the inverse of
 * getZonedParts. Standard offset-correction technique: guess the instant as
 * if the components were UTC, read back what that guess looks like when
 * re-rendered in the target zone, then correct by the difference. Exact for
 * any zone, DST included, though BUSINESS_TIMEZONE itself has none.
 */
function zonedComponentsToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const zonedAsIfUtc = getZonedParts(guessUtc);
  const zonedAsUtcMs = Date.UTC(
    zonedAsIfUtc.year,
    zonedAsIfUtc.month - 1,
    zonedAsIfUtc.day,
    zonedAsIfUtc.hour,
    zonedAsIfUtc.minute,
    0,
    0,
  );
  const offsetMs = zonedAsUtcMs - guessUtc.getTime();
  return new Date(guessUtc.getTime() - offsetMs);
}

/** Midnight BUSINESS_TIMEZONE time on the calendar day after `zoned`. */
function nextZonedDayStart(zoned: ZonedParts): Date {
  const rolledOver = new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day + 1));
  return zonedComponentsToUtc(rolledOver.getUTCFullYear(), rolledOver.getUTCMonth() + 1, rolledOver.getUTCDate(), 0, 0);
}

function getWorkingWindow(zoned: ZonedParts, shift: ShiftWithDetails | null): WorkingWindow | null {
  if (shift === null) {
    return zoned.dayOfWeek >= 1 && zoned.dayOfWeek <= 5 ? FALLBACK_WINDOW : null;
  }

  const detail = shift.details.find((d) => d.dayOfWeek === zoned.dayOfWeek);
  return detail ? { startHour: detail.startTime, endHour: detail.endTime } : null;
}

function normalizeStart(cursor: Date, shift: ShiftWithDetails | null): Date {
  let candidate = cursor;

  for (let i = 0; i < MAX_DAYS_TO_SEARCH; i++) {
    const zoned = getZonedParts(candidate);
    const window = getWorkingWindow(zoned, shift);

    if (window === null) {
      candidate = nextZonedDayStart(zoned);
      continue;
    }

    const dayStart = zonedComponentsToUtc(zoned.year, zoned.month, zoned.day, window.startHour, 0);
    const dayEnd = zonedComponentsToUtc(zoned.year, zoned.month, zoned.day, window.endHour, 0);

    if (candidate < dayStart) return dayStart;
    if (candidate < dayEnd) return candidate;

    candidate = nextZonedDayStart(zoned);
  }

  throw new AppError(
    'calculateDueDate: could not find a working day within 30 days — check the shift configuration',
    500,
  );
}

/**
 * Computes a business-hours-aware due date by consuming durationHours from
 * activatedAt forward, only counting time inside the shift's working windows
 * (or the Mon-Fri 08:00-17:00 fallback when shift is null), interpreted as
 * BUSINESS_TIMEZONE wall-clock hours regardless of server host timezone.
 */
export function calculateDueDate(
  activatedAt: Date,
  durationHours: number | null,
  shift: ShiftWithDetails | null,
): Date | null {
  if (!durationHours || durationHours === 0) return null;

  let cursor = normalizeStart(activatedAt, shift);
  let remaining = durationHours;
  let daysSearched = 0;

  while (remaining > 0) {
    if (daysSearched > MAX_DAYS_TO_SEARCH) {
      throw new AppError(
        'calculateDueDate: exceeded 30-day search cap while consuming SLA duration — check the shift configuration',
        500,
      );
    }

    const zoned = getZonedParts(cursor);
    const window = getWorkingWindow(zoned, shift);

    if (window === null) {
      cursor = normalizeStart(nextZonedDayStart(zoned), shift);
      daysSearched++;
      continue;
    }

    const dayEnd = zonedComponentsToUtc(zoned.year, zoned.month, zoned.day, window.endHour, 0);
    const hoursLeftInWindow = (dayEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60);
    const consumed = Math.min(remaining, hoursLeftInWindow);

    cursor = new Date(cursor.getTime() + consumed * 60 * 60 * 1000);
    remaining -= consumed;

    if (remaining > 0) {
      cursor = normalizeStart(nextZonedDayStart(zoned), shift);
      daysSearched++;
    }
  }

  return cursor;
}
