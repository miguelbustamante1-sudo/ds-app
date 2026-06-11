/**
 * DTOs for Top Performers Voting
 * Maps to ds.nom_nominations (anonymized/approved view) and voting response shapes
 */

export interface ApprovedNominationDTO {
  nomId: number;
  nomType: string;
  nomAnonymizedText: string;
  nomIsVozDelCliente: boolean;
}
