import { useEffect, useState, useCallback } from 'react';
import type { AvailableForProjectDTO } from '@shared/dto/TeamMemberReport';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface MemberComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  projectId: number | null;
  onSelectFull?: (tm: AvailableForProjectDTO) => void;
  disabled?: boolean;
}

export function MemberComboBox({ value, onValueChange, projectId, onSelectFull, disabled }: MemberComboBoxProps) {
  const [members, setMembers] = useState<AvailableForProjectDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (projectId === null) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<AvailableForProjectDTO[]>(
        `/api/team-members/available-under-supervisor?projectId=${projectId}`
      );
      setMembers(data);
    } catch {
      console.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const options: ComboBoxOption[] = members.map((m) => ({
    value: m.teamMemberId.toString(),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames} — ${m.teamMemberSeniority}`,
  }));

  const handleValueChange = (val: string) => {
    onValueChange(val);
    if (onSelectFull && val) {
      const selected = members.find((m) => m.teamMemberId.toString() === val);
      if (selected) onSelectFull(selected);
    }
  };

  if (projectId === null) {
    return (
      <ComboBox
        options={[]}
        value=""
        onValueChange={() => {}}
        placeholder="Select a project first"
        searchPlaceholder=""
        emptyMessage=""
        disabled
      />
    );
  }

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={handleValueChange}
      placeholder={loading ? 'Loading members...' : 'Select a team member'}
      searchPlaceholder="Search team members..."
      emptyMessage="No available team members found."
      disabled={disabled || loading}
    />
  );
}
