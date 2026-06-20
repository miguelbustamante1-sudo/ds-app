import { useState, useCallback } from 'react';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';
import { apiGet } from '@/lib/api';

export function useProjectAssignments(projectId: number | null) {
  const [assignments, setAssignments] = useState<ProjectAssignmentWithDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAssignments = useCallback(async () => {
    if (projectId === null) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    try {
      const data = await apiGet<ProjectAssignmentWithDetailsDTO[]>(
        `/api/team-member-projects/project/${projectId}`
      );

      const active = data.filter((a) => !a.projectAssignmentDeleted);

      setAssignments(active);
    } catch {
      console.error('Failed to load project assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { assignments, loading, loadAssignments };
}
