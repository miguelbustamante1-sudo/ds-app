import { useState, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';

export function useSupervisorReports() {
  const [reports, setReports] = useState<TeamMemberReportDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<TeamMemberReportDTO[]>(
        '/api/team-members/my-reports?hierarchy=complete',
      );
      setReports(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load team members';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { reports, loading, error, loadReports };
}
