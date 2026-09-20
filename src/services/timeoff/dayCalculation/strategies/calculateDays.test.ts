import { describe, it, expect } from 'vitest';
import { calculateDays } from './calculateDays';

// Reference week: Mon 21-Sep-2026 .. Sun 27-Sep-2026
const MON = new Date(2026, 8, 21);
const WED = new Date(2026, 8, 23); // weekday holiday
const FRI = new Date(2026, 8, 25);
const SAT = new Date(2026, 8, 26); // weekend holiday
const SUN = new Date(2026, 8, 27);

describe('calculateDays', () => {
  it('row 1: both flags off, no holiday in range -> plain workday count', () => {
    const total = calculateDays(MON, FRI, {
      countWeekends: false,
      countHolidays: false,
      holidays: [],
    });
    expect(total).toBe(5);
  });

  it('row 2: both flags off, holiday on a weekday -> holiday excluded like a weekend', () => {
    const total = calculateDays(MON, FRI, {
      countWeekends: false,
      countHolidays: false,
      holidays: [{ date: WED, isHalfDay: false }],
    });
    expect(total).toBe(4);
  });

  it('row 3: both flags on -> calendar mode, every day counts', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: true,
      countHolidays: true,
      holidays: [{ date: WED, isHalfDay: false }],
    });
    expect(total).toBe(7);
  });

  it('row 4: countWeekends on, countHolidays off -> weekend counts, weekday holiday excluded', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: true,
      countHolidays: false,
      holidays: [{ date: WED, isHalfDay: false }],
    });
    expect(total).toBe(6);
  });

  it('row 5: countWeekends off, countHolidays on -> weekend excluded, weekday holiday counts', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: false,
      countHolidays: true,
      holidays: [{ date: WED, isHalfDay: false }],
    });
    expect(total).toBe(5);
  });

  it('row 6: both flags off, holiday lands on a weekend -> excluded once, no double subtraction', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: false,
      countHolidays: false,
      holidays: [{ date: SAT, isHalfDay: false }],
    });
    expect(total).toBe(5);
  });

  it('row 7: half-day holiday, countHolidays off -> reduces by 0.5, not a full day', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: true,
      countHolidays: false,
      holidays: [{ date: WED, isHalfDay: true }],
    });
    expect(total).toBe(6.5);
  });

  it('row 8: half-day holiday, countHolidays on -> counts as a full day, no fractional push', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: true,
      countHolidays: true,
      holidays: [{ date: WED, isHalfDay: true }],
    });
    expect(total).toBe(7);
  });

  it('overlap A: countWeekends on, countHolidays off, holiday on a weekend day -> weekend flag wins, day still counts', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: true,
      countHolidays: false,
      holidays: [{ date: SAT, isHalfDay: false }],
    });
    expect(total).toBe(7);
  });

  it('overlap B: countWeekends off, countHolidays on, holiday on a weekend day -> holiday flag wins, day still counts', () => {
    const total = calculateDays(MON, SUN, {
      countWeekends: false,
      countHolidays: true,
      holidays: [{ date: SAT, isHalfDay: false }],
    });
    // Mon-Fri (5, plain workdays) + Sat (counted via holiday flag) + Sun (excluded, weekend-only)
    expect(total).toBe(6);
  });

  it('regression: Sep 29 2026 start, holiday on Sat Oct 3 2026, countWeekends on / countHolidays off -> 5 days lands on Oct 3, not Oct 4', () => {
    const start = new Date(2026, 8, 29); // Tue
    const end = new Date(2026, 9, 3); // Sat
    const total = calculateDays(start, end, {
      countWeekends: true,
      countHolidays: false,
      holidays: [{ date: end, isHalfDay: false }],
    });
    expect(total).toBe(5);
  });
});
