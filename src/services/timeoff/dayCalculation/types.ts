/**
 * Types for time off day calculation
 */

export interface DayCalculationInput {
  startDate: Date;
  endDate: Date;
  isCalendar: boolean;
}

export interface DayCalculationResult {
  totalDays: number;
  calculationType: 'workdays' | 'calendar';
}

export type DayCalculationStrategy = (startDate: Date, endDate: Date) => number;

export interface HolidayCalcEntry {
  date: Date;
  isHalfDay: boolean;
}
