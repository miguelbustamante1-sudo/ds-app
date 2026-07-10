/**
 * DTOs for Top Performers Nominations
 * Maps to ds.nom_nominations
 */

export interface TpNominationAdminDTO extends TpNominationDTO {
  nomineeName: string;
}

export interface TpNominationDTO {
  nomId: number;
  cycId: number;
  nomNomineeId: number;
  nomNominatorId: number;
  nomType: string;
  nomAchievementText: string;
  nomQuantitativeData: string | null;
  nomValuesSelected: string[] | null;
  nomValuesDescription: string | null;
  nomNominatorRelationship: string | null;
  nomAdminExceedsRole: string | null;
  nomAdminClientImpact: string | null;
  nomAdminConfidenceLevel: number | null;
  nomAnonymizedText: string | null;
  nomAnonymizationStatus: string;
  nomStatus: string;
  nomIsVozDelCliente: boolean;
  nomCreatedDate: string;
}
