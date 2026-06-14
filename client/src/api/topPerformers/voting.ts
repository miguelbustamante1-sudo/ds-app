import { apiGet, apiPost } from '@/lib/api';
import type { ApprovedNominationDTO } from '@shared/dto/TpVoting';

export type { ApprovedNominationDTO };

export interface VotingNominationsResponse {
  nominations: ApprovedNominationDTO[];
  alreadyVoted: boolean;
}

export const votingApi = {
  getNominations: (cycId: number): Promise<VotingNominationsResponse> =>
    apiGet<VotingNominationsResponse>(`/api/top-performers/voting/nominations?cycId=${cycId}`),

  submitVote: (cycId: number, items: Array<{ nomId: number; rank: number }>): Promise<{ message: string }> =>
    apiPost<{ message: string }, { cycId: number; items: Array<{ nomId: number; rank: number }> }>(
      '/api/top-performers/voting/votes',
      { cycId, items }
    ),
};
