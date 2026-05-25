import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';

export interface ProjectOption {
  value: string;
  label: string;
}

export function useActiveProjects(teamMemberId: number | null) {
  const [options, setOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamMemberId === null) {
      setOptions([]);
      return;
    }
    setLoading(true);
    apiGet<ProjectAssignmentWithDetailsDTO[]>(
      `/api/team-member-projects/team-member/${teamMemberId}?active=true`,
    )
      .then((data) => {
        setOptions(
          data
            .filter((p) => p.projectId !== null && p.projectName !== null)
            .map((p) => ({
              value: String(p.projectId),
              label: p.projectName as string,
            })),
        );
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [teamMemberId]);

  return { options, loading };
}
