/**
 * Types for time off day calculation
 */

export interface DayCalculationResult {
  totalDays: number;
  calculationType: 'workdays' | 'calendar';
}

export interface HolidayCalcEntry {
  date: Date;
  isHalfDay: boolean;
}

export interface CalculateDaysOptions {
  countWeekends: boolean;
  countHolidays: boolean;
  holidays: HolidayCalcEntry[];
}
