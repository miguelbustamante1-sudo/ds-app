import { describe, it, expect } from 'vitest';
import { calculateRequestedDays, calculateFixedDurationEndDate } from './fixedDurationEndDate';

// Reference week: Mon 21-Sep-2026 .. Sun 27-Sep-2026
const MON = new Date(2026, 8, 21);
const WED = new Date(2026, 8, 23); // weekday holiday
const FRI = new Date(2026, 8, 25);
const SAT = new Date(2026, 8, 26); // weekend holiday
const SUN = new Date(2026, 8, 27);

describe('calculateRequestedDays', () => {
  it('row 1: both flags off, no holiday in range -> plain workday count', () => {
    const total = calculateRequestedDays(MON, FRI, {
      countWeekends: false,
      countHolidays: false,
      holidayDates: [],
    });
    expect(total).toBe(5);
  });

  it('row 2: both flags off, holiday on a weekday -> holiday excluded like a weekend', () => {
    const total = calculateRequestedDays(MON, FRI, {
      countWeekends: false,
      countHolidays: false,
      holidayDates: [WED],
    });
    expect(total).toBe(4);
  });

  it('row 3: both flags on -> calendar mode, every day counts', () => {
    const total = calculateRequestedDays(MON, SUN, {
      countWeekends: true,
      countHolidays: true,
      holidayDates: [WED],
    });
    expect(total).toBe(7);
  });

  it('row 4: countWeekends on, countHolidays off -> weekend counts, weekday holiday excluded', () => {
    const total = calculateRequestedDays(MON, SUN, {
      countWeekends: true,
      countHolidays: false,
      holidayDates: [WED],
    });
    expect(total).toBe(6);
  });

  it('row 5: countWeekends off, countHolidays on -> weekend excluded, weekday holiday counts', () => {
    const total = calculateRequestedDays(MON, SUN, {
      countWeekends: false,
      countHolidays: true,
      holidayDates: [WED],
    });
    expect(total).toBe(5);
  });

  it('row 6: both flags off, holiday lands on a weekend -> excluded once, no double subtraction', () => {
    const total = calculateRequestedDays(MON, SUN, {
      countWeekends: false,
      countHolidays: false,
      holidayDates: [SAT],
    });
    expect(total).toBe(5);
  });

  it('overlap A: countWeekends on, countHolidays off, holiday on a weekend day -> weekend flag wins, day still counts', () => {
    const total = calculateRequestedDays(MON, SUN, {
      countWeekends: true,
      countHolidays: false,
      holidayDates: [SAT],
    });
    expect(total).toBe(7);
  });

  it('overlap B: countWeekends off, countHolidays on, holiday on a weekend day -> holiday flag wins, day still counts', () => {
    const total = calculateRequestedDays(MON, SUN, {
      countWeekends: false,
      countHolidays: true,
      holidayDates: [SAT],
    });
    // Mon-Fri (5) + Sat (counted via holiday flag) + Sun (excluded, weekend-only)
    expect(total).toBe(6);
  });
});

describe('calculateFixedDurationEndDate', () => {
  it('regression: Sep 29 2026 start, holiday on Sat Oct 3 2026, countWeekends on / countHolidays off -> end date is Oct 3, not Oct 4', () => {
    const start = new Date(2026, 8, 29); // Tue
    const holiday = new Date(2026, 9, 3); // Sat
    const end = calculateFixedDurationEndDate(start, 5, {
      countWeekends: true,
      countHolidays: false,
      holidayDates: [holiday],
    });
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(9); // October
    expect(end.getDate()).toBe(3);
  });

  it('both flags off, no holiday -> 5 fixed days lands 4 workdays after start', () => {
    const end = calculateFixedDurationEndDate(MON, 5, {
      countWeekends: false,
      countHolidays: false,
      holidayDates: [],
    });
    expect(end.getTime()).toBe(FRI.getTime());
  });

  it('both flags off, weekday holiday in range -> end date pushes out by one extra day', () => {
    const end = calculateFixedDurationEndDate(MON, 5, {
      countWeekends: false,
      countHolidays: false,
      holidayDates: [WED],
    });
    // Mon, Tue, (Wed skipped), Thu, Fri, Mon -> 5th chargeable day is the following Monday
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(28);
  });
});
