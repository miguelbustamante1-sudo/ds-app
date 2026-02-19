/**
 * DTOs for Country entity
 */

/**
 * CountryDTO - Full country data returned to client
 */
export interface CountryDTO {
  countryId: number;
  countryName: string;
  regionId: number | null;
  countryIso: string | null;
  currencySymbol: string | null;
}

/**
 * CreateCountryDTO - Data required to create a new country
 */
export interface CreateCountryDTO {
  countryName: string;
  regionId: number | null;
  countryIso?: string | null;
  currencySymbol?: string | null;
}

/**
 * UpdateCountryDTO - Data allowed to be updated
 */
export interface UpdateCountryDTO {
  countryName?: string;
  regionId?: number | null;
  countryIso?: string | null;
  currencySymbol?: string | null;
}
