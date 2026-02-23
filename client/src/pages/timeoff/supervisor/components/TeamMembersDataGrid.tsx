import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamMembersDataGridProps {
  teamMembers: TeamMemberReportDTO[];
  loading: boolean;
  selectedTeamMemberId: number | null;
  onSelectTeamMember: (teamMember: TeamMemberReportDTO) => void;
}

export function TeamMembersDataGrid({
  teamMembers,
  loading,
  selectedTeamMemberId,
  onSelectTeamMember,
}: TeamMembersDataGridProps) {
  if (loading) {
    return <Skeleton className="h-9 w-full" />;
  }

  const options: ComboBoxOption[] = teamMembers.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames} (${m.workdayId})`,
  }));

  const handleValueChange = (val: string) => {
    const selected = teamMembers.find((m) => m.teamMemberId.toString() === val);
    if (selected) onSelectTeamMember(selected);
  };

  return (
    <ComboBox
      options={options}
      value={selectedTeamMemberId?.toString() ?? ''}
      onValueChange={handleValueChange}
      placeholder="Select a team member"
      searchPlaceholder="Search team members..."
      emptyMessage="No team members found."
    />
  );
}
