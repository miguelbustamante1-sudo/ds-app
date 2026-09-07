/**
 * DTOs for Region entity
 */

/**
 * RegionDTO - Full region data returned to client
 */
export interface RegionDTO {
  regionId: number;
  regionName: string;
}

/**
 * CreateRegionDTO - Data required to create a new region
 */
export interface CreateRegionDTO {
  regionName: string;
}

/**
 * UpdateRegionDTO - Data allowed to be updated
 */
export interface UpdateRegionDTO {
  regionName?: string;
}
