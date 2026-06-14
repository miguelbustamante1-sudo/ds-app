import { apiGet, apiPost } from '@/lib/api';
import type { LeaderboardEntry, CandidateDetail } from '@shared/dto/TpResults';

export type { LeaderboardEntry, CandidateDetail };

export const resultsApi = {
  getLeaderboard: (cycId: number): Promise<LeaderboardEntry[]> =>
    apiGet<LeaderboardEntry[]>(`/api/top-performers/results/leaderboard?cycId=${cycId}`),

  getCandidateDetail: (cycId: number, nomineeId: number): Promise<CandidateDetail> =>
    apiGet<CandidateDetail>(`/api/top-performers/results/candidates/${nomineeId}?cycId=${cycId}`),

  saveDecision: (cycId: number, winnerId: number, justification: string): Promise<{ message: string }> =>
    apiPost<{ message: string }, { cycId: number; winnerId: number; justification: string }>(
      '/api/top-performers/results/decision',
      { cycId, winnerId, justification }
    ),

  confirmDecision: (cycId: number): Promise<{ message: string }> =>
    apiPost<{ message: string }, { cycId: number }>(
      '/api/top-performers/results/decision/confirm',
      { cycId }
    ),

  exportCsv: (cycId: number): void => {
    window.open(`/api/top-performers/results/leaderboard/export?cycId=${cycId}`, '_blank');
  },
};
