/**
 * Types and interfaces for TimeOff validation
 */

/**
 * Input for validation - matches Prisma field names
 */
export interface TimeOffValidationInput {
  teamMemberId: number;
  categoryId: number;
  timeOffStartDate: Date;
  timeOffEndDate: Date;
  statusId?: number | null;
  timeOffId?: number; // Only for updates (self-exclusion)
}

/**
 * Context loaded from DB (NFR-2: passed to rules, not fetched by them)
 */
export interface TimeOffValidationContext {
  teamMember: {
    teamMemberId: number;
    countryId: number | null;
    teamMemberEndDate: Date | null;
  };
  effectiveCountryId: number;
  allowedCategoryIds: number[];
  blockingStatusIds: number[];
  categoryCountryDaysBefore: number;
  categoryName: string;
  workdayBalance: { vacation: number; personalDays: number };
  activeSwaps: Array<{
    holidaySwapId: number;
    holidayName: string;
    originalDate: Date;
    replacementDate: Date;
    statusId: number;
  }>;
  overlappingTimeOffs: Array<{
    timeOffId: number;
    timeOffStartDate: Date;
    timeOffEndDate: Date;
    statusId: number | null;
  }>;
}

/**
 * Default values for TimeOff creation
 */
export const DEFAULTS = {
  STATUS_ID: 1, // "Tentative"
  COUNTRY_ID: 2, // GT (Guatemala)
} as const;

/**
 * Validation result from a single rule
 */
export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
}
