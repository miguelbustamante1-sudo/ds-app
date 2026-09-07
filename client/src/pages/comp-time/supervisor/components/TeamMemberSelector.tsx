import { ComboBox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';

interface TeamMemberSelectorProps {
  reports: TeamMemberReportDTO[];
  loading: boolean;
  selectedTeamMemberId: number | null;
  onSelect: (member: TeamMemberReportDTO) => void;
}

export function TeamMemberSelector({
  reports,
  loading,
  selectedTeamMemberId,
  onSelect,
}: TeamMemberSelectorProps) {
  if (loading) return <Skeleton className="h-9 w-full max-w-sm" />;

  const options = reports.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`,
  }));

  const handleChange = (val: string) => {
    const found = reports.find((m) => m.teamMemberId.toString() === val);
    if (found) onSelect(found);
  };

  return (
    <ComboBox
      options={options}
      value={selectedTeamMemberId?.toString() ?? ''}
      onValueChange={handleChange}
      placeholder="Select a team member"
      searchPlaceholder="Search team members..."
      emptyMessage="No team members found."
    />
  );
}
