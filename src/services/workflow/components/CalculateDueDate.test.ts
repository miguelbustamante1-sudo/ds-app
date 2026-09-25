import { describe, it, expect } from 'vitest';
import { calculateDueDate } from './CalculateDueDate';

describe('calculateDueDate', () => {
  it('returns null when slaDurationHours is null', () => {
    expect(calculateDueDate(new Date('2026-09-23T10:00:00'), null, null)).toBeNull();
  });

  it('returns null when slaDurationHours is 0', () => {
    expect(calculateDueDate(new Date('2026-09-23T10:00:00'), 0, null)).toBeNull();
  });

  it('adds hours within the same working day (fallback Mon-Fri 08:00-17:00)', () => {
    // Wednesday 2026-09-23, 10:00 + 4h = 14:00, same day
    const result = calculateDueDate(new Date(2026, 8, 23, 10, 0), 4, null);
    expect(result).toEqual(new Date(2026, 8, 23, 14, 0));
  });

  it('rolls a Friday-afternoon activation into the following Monday under the fallback window', () => {
    // Friday 2026-09-25 16:00 + 8h: 1h left in Friday's window (16:00-17:00),
    // remaining 7h consumed from Monday 2026-09-28's 08:00-17:00 window -> 15:00.
    const result = calculateDueDate(new Date(2026, 8, 25, 16, 0), 8, null);
    expect(result).toEqual(new Date(2026, 8, 28, 15, 0));
  });

  it('snaps an activation before the working window to the window start', () => {
    // Wednesday 2026-09-23 06:00 (before 08:00) + 2h -> snaps to 08:00, due 10:00
    const result = calculateDueDate(new Date(2026, 8, 23, 6, 0), 2, null);
    expect(result).toEqual(new Date(2026, 8, 23, 10, 0));
  });

  it('uses a provided shift instead of the fallback window', () => {
    const shift = {
      shiftId: 1,
      description: 'Night shift',
      totalWeekHours: 40 as unknown as never,
      lunchHours: 0 as unknown as never,
      details: [
        { shiftDetailId: 1, shiftId: 1, dayOfWeek: 3, startTime: 20, endTime: 23, workingHours: 3 as unknown as never },
        { shiftDetailId: 2, shiftId: 1, dayOfWeek: 4, startTime: 20, endTime: 23, workingHours: 3 as unknown as never },
      ],
    };
    // Wednesday (dayOfWeek 3) 2026-09-23 21:00 + 2h within the 20:00-23:00 window -> 23:00
    const result = calculateDueDate(new Date(2026, 8, 23, 21, 0), 2, shift as never);
    expect(result).toEqual(new Date(2026, 8, 23, 23, 0));
  });

  it('throws AppError if no working window is found within 30 days', () => {
    const emptyShift = { shiftId: 1, description: 'Empty', totalWeekHours: 0 as unknown as never, lunchHours: 0 as unknown as never, details: [] };
    expect(() => calculateDueDate(new Date(2026, 8, 23, 10, 0), 1, emptyShift as never)).toThrow(
      /could not find a working day/,
    );
  });
});
