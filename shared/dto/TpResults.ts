/**
 * DTOs for Top Performers Committee Results
 * Maps to aggregated vote items and candidate detail views
 */

export interface LeaderboardEntry {
  nomineeId: number;
  nomineeNames: string;
  nomineeSurnames: string;
  teamName: string | null;
  totalRawPoints: number;
  totalWeightedPoints: number;
  totalVotesReceived: number;
  totalNominationsReceived: number;
}

export interface VoteBreakdown {
  rank: number;
  rawPoints: number;
  multiplier: number;
  weightedPoints: number;
  voterTeamMemberId: number;
}

export interface CandidateDetail {
  nomineeId: number;
  nomineeNames: string;
  nomineeSurnames: string;
  nominations: Array<{
    nomId: number;
    nomType: string;
    nomAchievementText: string;
    nomAdminExceedsRole: string | null;
    nomAdminClientImpact: string | null;
    nomAdminConfidenceLevel: number | null;
    nomIsVozDelCliente: boolean;
    metrics: Array<{ nmeMetricName: string; nmeMetricValue: string; nmeMetricBenchmark: string | null }>;
  }>;
  voteBreakdown: VoteBreakdown[];
  rankDistribution: Record<number, number>;
}
