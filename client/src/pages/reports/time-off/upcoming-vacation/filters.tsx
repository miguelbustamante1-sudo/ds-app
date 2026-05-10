import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';

function useTeamMemberOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<TeamMemberReportDTO[]>({
    queryKey: ['team-members', 'my-reports'],
    queryFn: () => apiGet<TeamMemberReportDTO[]>('/api/team-members/my-reports?hierarchy=complete'),
    staleTime: 300_000,
  });
  return data.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));
}

export function UpcomingVacationFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const teamMemberOptions = useTeamMemberOptions();

  const teamMemberId = searchParams.get('teamMemberId') ?? '';
  const days = searchParams.get('days') ?? '45';

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end max-w-lg">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Team Member</Label>
          <ComboBox
            options={teamMemberOptions}
            value={teamMemberId}
            onValueChange={(val) => setParam('teamMemberId', val)}
            placeholder="All team members"
            searchPlaceholder="Search team member..."
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Days ahead</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setParam('days', e.target.value)}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
