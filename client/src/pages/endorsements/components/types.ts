/**
 * Frontend-only type representing a bonus that has been selected
 * and staged in the endorsement creation form (not yet persisted).
 *
 * Enriched with display names beyond what CreateEndorsementBonusInput carries.
 * When submitting, only the DTO-compatible fields are extracted and sent to the backend.
 */
export interface SelectedBonus {
  bonusSubcategoryId: number;
  bonusSubcategoryName: string;
  bonusCategoryName: string;
  endorsementBonusAmount: number | null;
  endorsementBonusComments: string;
  endorsementBonusMetadata: Record<string, unknown>;
  /** Kept alongside the bonus so the summary table knows field names/types for display */
  metadataSchema: Record<string, string>;
}
