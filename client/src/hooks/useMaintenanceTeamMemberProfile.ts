import { useState } from 'react';
import { apiGet } from '@/lib/api';
import type { TeamMemberProfileDTO } from '@shared/dto/TeamMemberProfile';

export function useMaintenanceTeamMemberProfile() {
  const [profile, setProfile] = useState<TeamMemberProfileDTO | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProfile(teamMemberId: number): Promise<void> {
    setLoading(true);
    try {
      const data = await apiGet<TeamMemberProfileDTO>(
        `/api/team-members/${teamMemberId}/admin-profile`,
      );
      setProfile(data);
    } finally {
      setLoading(false);
    }
  }

  return { profile, loading, loadProfile };
}
