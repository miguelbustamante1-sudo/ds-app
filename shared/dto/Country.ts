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
  /** Hour (0-23) when night shift starts */
  nightStart: number | null;
  /** Hour (0-23) when night shift ends */
  nightEnd: number | null;
  /** Multiplier applied to hours worked during night shift */
  nightMultiplier: number | null;
}

/**
 * CreateCountryDTO - Data required to create a new country
 */
export interface CreateCountryDTO {
  countryName: string;
  regionId: number | null;
  countryIso?: string | null;
  currencySymbol?: string | null;
  nightStart?: number | null;
  nightEnd?: number | null;
  nightMultiplier?: number | null;
}

/**
 * UpdateCountryDTO - Data allowed to be updated
 */
export interface UpdateCountryDTO {
  countryName?: string;
  regionId?: number | null;
  countryIso?: string | null;
  currencySymbol?: string | null;
  nightStart?: number | null;
  nightEnd?: number | null;
  nightMultiplier?: number | null;
}
