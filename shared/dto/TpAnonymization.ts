/**
 * DTOs for Top Performers Anonymization
 * Maps to ds.nom_nominations (anonymization fields) and batch processing results
 */

export interface TpAnonymizationReviewDTO {
  nomId: number;
  nomType: string;
  nomAchievementText: string;
  nomAnonymizedText: string | null;
  nomAnonymizationStatus: string;
  nomAdminExceedsRole: string | null;
  nomAdminClientImpact: string | null;
  metrics: Array<{ nmeMetricName: string; nmeMetricValue: string; nmeMetricBenchmark: string | null }>;
}

export interface BatchAnonymizationResult {
  processed: number;
  failed: number;
  needsReview: number;
  errors: Array<{ nomId: number; message: string }>;
}
