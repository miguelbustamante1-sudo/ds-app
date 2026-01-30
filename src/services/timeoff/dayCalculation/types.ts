/**
 * Types for time off day calculation
 */

export interface DayCalculationInput {
  startDate: Date;
  endDate: Date;
  countryIso: string | null;
}

export interface DayCalculationResult {
  totalDays: number;
  countryIso: string;
  calculationType: 'workdays' | 'calendar';
}

export type DayCalculationStrategy = (startDate: Date, endDate: Date) => number;

// Country ISO codes
export const COUNTRY_ISO = {
  GUATEMALA: 'GT',
  EL_SALVADOR: 'SV',
} as const;
