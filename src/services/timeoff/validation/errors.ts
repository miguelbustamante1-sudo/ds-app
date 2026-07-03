/**
 * TimeOff validation error codes and factory functions
 */

import type { ValidationError } from './types';

export const TimeOffValidationErrors = {
  MISSING_REQUIRED_FIELD: (field: string): ValidationError => ({
    code: 'MISSING_REQUIRED_FIELD',
    message: `Required field '${field}' is missing or null`,
    metadata: { field },
  }),

  INVALID_DATE_RANGE: {
    code: 'INVALID_DATE_RANGE',
    message: 'Start date must be less than or equal to end date',
  } as ValidationError,

  CATEGORY_NOT_ALLOWED: (categoryId: number, countryId: number): ValidationError => ({
    code: 'CATEGORY_NOT_ALLOWED',
    message: "Category is not enabled for team member's country",
    metadata: { categoryId, countryId },
  }),

  OVERLAP_DETECTED: (
    conflicts: Array<{ timeOffId: number; startDate: Date; endDate: Date }>
  ): ValidationError => ({
    code: 'OVERLAP_DETECTED',
    message: 'Time off overlaps with existing request(s)',
    metadata: { conflicts },
  }),

  TEAM_MEMBER_NOT_FOUND: (teamMemberId: number): ValidationError => ({
    code: 'TEAM_MEMBER_NOT_FOUND',
    message: 'Team member not found',
    metadata: { teamMemberId },
  }),

  EXCEEDS_ATTRITION_DATE: (requestDate: Date, attritionDate: Date): ValidationError => ({
    code: 'EXCEEDS_ATTRITION_DATE',
    message: `Time off date (${requestDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}) exceeds team member's end date (${attritionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })})`,
    metadata: { requestDate, attritionDate },
  }),

  START_DATE_ON_WEEKEND: (startDate: Date): ValidationError => ({
    code: 'START_DATE_ON_WEEKEND',
    message: `Start date (${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}) falls on a weekend. Time off must start on a weekday.`,
    metadata: { startDate },
  }),

  // El Salvador Vacation (7/8/15 day rule) errors
  SV_VACATION_INVALID_DAYS: (requestedDays: number): ValidationError => ({
    code: 'SV_VACATION_INVALID_DAYS',
    message: `For El Salvador vacation, you can only request 7, 8, or 15 days. You requested ${requestedDays} days.`,
    metadata: { requestedDays, allowedDays: [7, 8, 15] },
  }),

  SV_VACATION_MUST_REQUEST_8: (requestedDays: number): ValidationError => ({
    code: 'SV_VACATION_MUST_REQUEST_8',
    message: `You already have 7 vacation days this year. To complete your 15-day annual allowance, you must request exactly 8 days.`,
    metadata: { requestedDays, existingDays: 7, requiredDays: 8 },
  }),

  SV_VACATION_MUST_REQUEST_7: (requestedDays: number): ValidationError => ({
    code: 'SV_VACATION_MUST_REQUEST_7',
    message: `You already have 8 vacation days this year. To complete your 15-day annual allowance, you must request exactly 7 days.`,
    metadata: { requestedDays, existingDays: 8, requiredDays: 7 },
  }),

  SV_VACATION_LIMIT_REACHED: (existingDays: number, maxAnnualDays: number): ValidationError => ({
    code: 'SV_VACATION_LIMIT_REACHED',
    message: `You have already used ${existingDays} vacation days this year. The maximum annual vacation allowance for El Salvador is ${maxAnnualDays} days. No additional vacation can be requested.`,
    metadata: { existingDays, maxAnnualDays },
  }),

  INSUFFICIENT_VACATION_BALANCE: (requested: number, available: number): ValidationError => ({
    code: 'INSUFFICIENT_VACATION_BALANCE',
    message: `Insufficient vacation balance. Requested: ${requested} days, Available: ${available} days.`,
    metadata: { requested, available },
  }),

  INSUFFICIENT_PERSONAL_DAY_BALANCE: (requested: number, available: number): ValidationError => ({
    code: 'INSUFFICIENT_PERSONAL_DAY_BALANCE',
    message: `Insufficient personal day balance. Requested: ${requested} days, Available: ${available} days.`,
    metadata: { requested, available },
  }),

  DAYS_BEFORE_NOTICE_REQUIRED: (
    categoryName: string,
    requiredDays: number,
    daysUntilStart: number,
    earliestValidDate: Date
  ): ValidationError => ({
    code: 'DAYS_BEFORE_NOTICE_REQUIRED',
    message: `Policy requires that time-off requests for "${categoryName}" be submitted at least ${requiredDays} days before the start date. The earliest valid start date is ${earliestValidDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
    metadata: { categoryName, requiredDays, daysUntilStart, earliestValidDate },
  }),
  SWAPPED_HOLIDAY_IN_RANGE: (holidayName: string, date: Date): ValidationError => ({
    code: 'SWAPPED_HOLIDAY_IN_RANGE',
    message: `You have swapped ${holidayName} and must work on ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Please adjust your request dates.`,
    metadata: { holidayName, date },
  }),

  REPLACEMENT_DAY_IN_RANGE: (date: Date): ValidationError => ({
    code: 'REPLACEMENT_DAY_IN_RANGE',
    message: `Your replacement day ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} is a personal holiday and cannot be included in a Time Off request.`,
    metadata: { date },
  }),

  EXCEEDS_MAX_DAYS: (categoryName: string, requestedDays: number, maxDays: number): ValidationError => ({
    code: 'EXCEEDS_MAX_DAYS',
    message: `${categoryName} requests cannot exceed ${maxDays} day${maxDays !== 1 ? 's' : ''}. You requested ${requestedDays}.`,
    metadata: { categoryName, requestedDays, maxDays },
  }),

  START_DATE_ON_HOLIDAY: (holidayName: string, startDate: Date): ValidationError => ({
    code: 'START_DATE_ON_HOLIDAY',
    message: `Start date falls on ${holidayName}, a public holiday. Please choose a different start date.`,
    metadata: { holidayName, startDate },
  }),

  START_DATE_ON_REPLACEMENT_DAY: (holidayName: string, replacementDate: Date): ValidationError => ({
    code: 'START_DATE_ON_REPLACEMENT_DAY',
    message: `Start date is a replacement day (swapped from ${holidayName}). This is a personal holiday and cannot be used as a start date.`,
    metadata: { holidayName, replacementDate },
  }),
} as const;
