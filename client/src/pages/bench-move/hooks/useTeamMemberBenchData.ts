import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { ProjectAssignmentWithDetailsDTO, SupervisorChainDTO } from '@shared/dto';

export interface SupervisorListItemDTO {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  teamMemberKnownAs: string | null;
}

export interface TeamMemberBenchData {
  projects: ProjectAssignmentWithDetailsDTO[];
  supervisorOptions: SupervisorListItemDTO[];
  supervisorChain: SupervisorChainDTO[];
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: TeamMemberBenchData = {
  projects: [],
  supervisorOptions: [],
  supervisorChain: [],
  isLoading: false,
  error: null,
};

export function useTeamMemberBenchData() {
  const [state, setState] = useState<TeamMemberBenchData>(INITIAL_STATE);

  const fetchBenchData = useCallback(async (tmsId: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [projects, supervisorOptions, supervisorChain] = await Promise.all([
        apiGet<ProjectAssignmentWithDetailsDTO[]>(
          `/api/team-member-projects/team-member/${tmsId}?active=true`,
        ),
        apiGet<SupervisorListItemDTO[]>('/api/team-members/supervisors'),
        apiGet<SupervisorChainDTO[]>(`/api/team-members/${tmsId}/supervisor-chain`),
      ]);
      setState({ projects, supervisorOptions, supervisorChain, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team member data';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { ...state, fetchBenchData, reset };
}
