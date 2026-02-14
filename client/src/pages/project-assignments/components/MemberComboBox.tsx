import { useEffect, useState, useCallback } from 'react';
import type { SupervisedTeamMemberDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface MemberComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function MemberComboBox({ value, onValueChange, disabled }: MemberComboBoxProps) {
  const [members, setMembers] = useState<SupervisedTeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<SupervisedTeamMemberDTO[]>('/api/team-members/my-reports');
      setMembers(data);
    } catch {
      console.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const options: ComboBoxOption[] = members.map((m) => ({
    value: m.teamMemberId.toString(),
    label: m.teamMemberKnownAs
      ? `${m.teamMemberKnownAs} ${m.teamMemberSurnames}`
      : `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading members...' : 'Select a team member'}
      searchPlaceholder="Search team members..."
      emptyMessage="No team members found."
      disabled={disabled || loading}
    />
  );
}
