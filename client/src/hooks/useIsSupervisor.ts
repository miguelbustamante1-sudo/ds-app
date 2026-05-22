import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

/**
 * Determines whether the current user is a supervisor by calling the
 * lightweight /api/team-members/is-supervisor endpoint, which returns
 * { isSupervisor: boolean } based on whether the user has at least one direct report.
 */
export function useIsSupervisor(teamMemberId: number | undefined): boolean {
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    if (!teamMemberId) {
      setIsSupervisor(false);
      return;
    }

    let cancelled = false;

    apiGet<{ isSupervisor: boolean }>('/api/team-members/is-supervisor')
      .then((result) => {
        if (!cancelled) {
          setIsSupervisor(result.isSupervisor);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSupervisor(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [teamMemberId]);

  return isSupervisor;
}
