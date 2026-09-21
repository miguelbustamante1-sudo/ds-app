/**
 * DTOs for TimeOffCategory entity
 */

/**
 * TimeOffCategoryDTO - Full time off category data returned to client
 */
export interface TimeOffCategoryDTO {
  categoryId: number;
  categoryName: string;
  categoryShortName: string | null;
}

/**
 * CreateTimeOffCategoryDTO - Data required to create a new time off category
 */
export interface CreateTimeOffCategoryDTO {
  categoryName: string;
  categoryShortName?: string;
}

/**
 * UpdateTimeOffCategoryDTO - Data allowed to be updated
 */
export interface UpdateTimeOffCategoryDTO {
  categoryName?: string;
  categoryShortName?: string;
}

/**
 * CategoryByCountryDTO - DTO for Time Off Category with Country information
 */
export interface CategoryByCountryDTO {
  categoryId: number;
  categoryName: string;
  categoryByCountryId: number;
  countryId: number;
  countryName: string;
  countryIso: string;
  categoryCountryAllowHalfDay: boolean;
  categoryCountryIsFixedDuration: boolean;
  categoryCountryFixedDays: number | null;
  categoryCountryIsCalendar: boolean;
  categoryCountryCountHolidays: boolean;
  categoryCountryDaysBefore: number;
  categoryCountryMaxDays: number;
}
