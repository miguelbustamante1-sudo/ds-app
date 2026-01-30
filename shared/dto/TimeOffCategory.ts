/**
 * DTOs for TimeOffCategory entity
 */

/**
 * TimeOffCategoryDTO - Full time off category data returned to client
 */
export interface TimeOffCategoryDTO {
  categoryId: number;
  categoryName: string;
}

/**
 * CreateTimeOffCategoryDTO - Data required to create a new time off category
 */
export interface CreateTimeOffCategoryDTO {
  categoryName: string;
}

/**
 * UpdateTimeOffCategoryDTO - Data allowed to be updated
 */
export interface UpdateTimeOffCategoryDTO {
  categoryName?: string;
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
}
