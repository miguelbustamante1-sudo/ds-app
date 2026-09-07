/**
 * DTOs for TierBand entity
 */

/**
 * TierBandDTO - Full tier band data returned to client
 */
export interface TierBandDTO {
  tierBandId: number;
  tierBandDescription: string;
}

/**
 * CreateTierBandDTO - Data required to create a new tier band
 */
export interface CreateTierBandDTO {
  tierBandDescription: string;
}

/**
 * UpdateTierBandDTO - Data allowed to be updated
 */
export interface UpdateTierBandDTO {
  tierBandDescription?: string;
}
