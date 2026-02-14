/**
 * DTOs for CategoryCountry entity (tbl_to_categories_x_country)
 */

/** Full entity returned to client (includes joined names for display) */
export interface CategoryCountryDTO {
  categoryCountryId: number;
  categoryId: number;
  countryId: number;
  categoryCountryStatus: number;
  categoryCountryAllowHalfDay: boolean;
  categoryCountryIsFixedDuration: boolean;
  categoryCountryFixedDays: number | null;
  categoryCountryIsCalendar: boolean;
  // Joined fields for display
  categoryName: string;
  countryName: string;
  countryIso: string;
}

/** Data required to create */
export interface CreateCategoryCountryDTO {
  categoryId: number;
  countryId: number;
  categoryCountryStatus?: number;
  categoryCountryAllowHalfDay?: boolean;
  categoryCountryIsFixedDuration?: boolean;
  categoryCountryFixedDays?: number | null;
  categoryCountryIsCalendar?: boolean;
}

/** Data allowed to update */
export interface UpdateCategoryCountryDTO {
  categoryId?: number;
  countryId?: number;
  categoryCountryStatus?: number;
  categoryCountryAllowHalfDay?: boolean;
  categoryCountryIsFixedDuration?: boolean;
  categoryCountryFixedDays?: number | null;
  categoryCountryIsCalendar?: boolean;
}
