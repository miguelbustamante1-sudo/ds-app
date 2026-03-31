import { useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { TeamMemberProfileDTO } from '@shared/dto/TeamMemberProfile';

interface Options {
  onError?: (message: string) => void;
}

export function useMyProfile({ onError }: Options = {}) {
  const [profile, setProfile] = useState<TeamMemberProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<TeamMemberProfileDTO>('/api/team-members/me/profile');
      setProfile(data);
    } catch {
      onError?.('Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  return { profile, loading, loadProfile };
}
