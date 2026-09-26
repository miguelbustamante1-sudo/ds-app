import { describe, it, expect } from 'vitest';
import { calculateDueDate } from './CalculateDueDate';

// Business hours are anchored to America/Guatemala (fixed UTC-6, no DST) —
// every input/expected value below is expressed explicitly in UTC via
// Date.UTC, with a comment giving the equivalent Guatemala wall-clock time,
// so the test doesn't depend on whatever timezone actually runs it.

describe('calculateDueDate', () => {
  it('returns null when slaDurationHours is null', () => {
    expect(calculateDueDate(new Date(Date.UTC(2026, 8, 23, 16, 0)), null, null)).toBeNull();
  });

  it('returns null when slaDurationHours is 0', () => {
    expect(calculateDueDate(new Date(Date.UTC(2026, 8, 23, 16, 0)), 0, null)).toBeNull();
  });

  it('adds hours within the same working day (fallback Mon-Fri 08:00-17:00 Guatemala)', () => {
    // 2026-09-23T10:00Z = Wed 04:00 Guatemala -> snaps to 08:00 Guatemala start,
    // +4h = 12:00 Guatemala = 18:00Z.
    const result = calculateDueDate(new Date(Date.UTC(2026, 8, 23, 10, 0)), 4, null);
    expect(result).toEqual(new Date(Date.UTC(2026, 8, 23, 18, 0)));
  });

  it('rolls a Friday-afternoon activation into the following Monday under the fallback window', () => {
    // 2026-09-25T16:00Z = Fri 10:00 Guatemala. 7h left in Friday's window
    // (10:00-17:00 Guatemala), remaining 1h consumed from Monday 2026-09-28's
    // 08:00 Guatemala start -> due 09:00 Guatemala Monday = 15:00Z.
    const result = calculateDueDate(new Date(Date.UTC(2026, 8, 25, 16, 0)), 8, null);
    expect(result).toEqual(new Date(Date.UTC(2026, 8, 28, 15, 0)));
  });

  it('snaps an activation before the working window to the window start', () => {
    // 2026-09-23T06:00Z = Wed 00:00 Guatemala (before 08:00) -> snaps to
    // 08:00 Guatemala, +2h = 10:00 Guatemala = 16:00Z.
    const result = calculateDueDate(new Date(Date.UTC(2026, 8, 23, 6, 0)), 2, null);
    expect(result).toEqual(new Date(Date.UTC(2026, 8, 23, 16, 0)));
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
    // 2026-09-23T21:00Z = Wed 15:00 Guatemala -> snaps forward to the shift's
    // 20:00 Guatemala start (2026-09-24T02:00Z), +2h = 22:00 Guatemala Wed = 04:00Z Sep24.
    const result = calculateDueDate(new Date(Date.UTC(2026, 8, 23, 21, 0)), 2, shift as never);
    expect(result).toEqual(new Date(Date.UTC(2026, 8, 24, 4, 0)));
  });

  it('throws AppError if no working window is found within 30 days', () => {
    const emptyShift = { shiftId: 1, description: 'Empty', totalWeekHours: 0 as unknown as never, lunchHours: 0 as unknown as never, details: [] };
    expect(() => calculateDueDate(new Date(Date.UTC(2026, 8, 23, 10, 0)), 1, emptyShift as never)).toThrow(
      /could not find a working day/,
    );
  });
});
