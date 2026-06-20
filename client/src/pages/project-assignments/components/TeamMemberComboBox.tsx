import { useEffect, useState } from 'react';
import type { TeamMemberDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface TeamMemberComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function TeamMemberComboBox({ value, onValueChange }: TeamMemberComboBoxProps) {
  const [members, setMembers] = useState<TeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGet<TeamMemberDTO[]>('/api/team-members')
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const options: ComboBoxOption[] = [...members]
    .sort((a, b) =>
      `${a.teamMemberNames} ${a.teamMemberSurnames}`.localeCompare(
        `${b.teamMemberNames} ${b.teamMemberSurnames}`,
      ),
    )
    .map((m) => ({
      value: m.teamMemberId.toString(),
      label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
    }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading members...' : 'Search team member…'}
      searchPlaceholder="Search by name..."
      emptyMessage="No team members found."
      disabled={loading}
    />
  );
}
