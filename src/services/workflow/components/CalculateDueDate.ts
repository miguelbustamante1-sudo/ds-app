import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

export type ShiftWithDetails = Prisma.ShiftGetPayload<{ include: { details: true } }>;

interface WorkingWindow {
  startHour: number;
  endHour: number;
}

const FALLBACK_WINDOW: WorkingWindow = { startHour: 8, endHour: 17 };
const MAX_DAYS_TO_SEARCH = 30;

function getWorkingWindow(date: Date, shift: ShiftWithDetails | null): WorkingWindow | null {
  const dayOfWeek = date.getDay();

  if (shift === null) {
    return dayOfWeek >= 1 && dayOfWeek <= 5 ? FALLBACK_WINDOW : null;
  }

  const detail = shift.details.find((d) => d.dayOfWeek === dayOfWeek);
  return detail ? { startHour: detail.startTime, endHour: detail.endTime } : null;
}

function nextDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
}

function normalizeStart(cursor: Date, shift: ShiftWithDetails | null): Date {
  let candidate = cursor;

  for (let i = 0; i < MAX_DAYS_TO_SEARCH; i++) {
    const window = getWorkingWindow(candidate, shift);

    if (window === null) {
      candidate = nextDayStart(candidate);
      continue;
    }

    const dayStart = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), window.startHour, 0, 0, 0);
    const dayEnd = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), window.endHour, 0, 0, 0);

    if (candidate < dayStart) return dayStart;
    if (candidate < dayEnd) return candidate;

    candidate = nextDayStart(candidate);
  }

  throw new AppError(
    'calculateDueDate: could not find a working day within 30 days — check the shift configuration',
    500,
  );
}

/**
 * Computes a business-hours-aware due date by consuming durationHours from
 * activatedAt forward, only counting time inside the shift's working windows
 * (or the Mon-Fri 08:00-17:00 fallback when shift is null).
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

    const window = getWorkingWindow(cursor, shift);

    if (window === null) {
      cursor = normalizeStart(nextDayStart(cursor), shift);
      daysSearched++;
      continue;
    }

    const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), window.endHour, 0, 0, 0);
    const hoursLeftInWindow = (dayEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60);
    const consumed = Math.min(remaining, hoursLeftInWindow);

    cursor = new Date(cursor.getTime() + consumed * 60 * 60 * 1000);
    remaining -= consumed;

    if (remaining > 0) {
      cursor = normalizeStart(nextDayStart(cursor), shift);
      daysSearched++;
    }
  }

  return cursor;
}
