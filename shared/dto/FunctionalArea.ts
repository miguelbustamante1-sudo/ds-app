/**
 * DTOs for FunctionalArea entity (ds.far_functional_areas)
 */

export interface FunctionalAreaDTO {
  Id: number;
  Name: string;
  countryId: number | null;
}

export interface CreateFunctionalAreaDTO {
  Name: string;
  countryId?: number | null;
}

export interface UpdateFunctionalAreaDTO {
  Name?: string;
  countryId?: number | null;
}
