import { useEffect, useState, useCallback } from 'react';
import type { GroupDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementGroupComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementGroupComboBox({ value, onValueChange, disabled }: EndorsementGroupComboBoxProps) {
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<GroupDTO[]>('/api/groups');
      setGroups(data);
    } catch {
      console.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const options: ComboBoxOption[] = groups.map((g) => ({
    value: g.groupId.toString(),
    label: g.groupName,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading groups...' : 'Select a group'}
      searchPlaceholder="Search groups..."
      emptyMessage="No groups found."
      disabled={disabled || loading}
    />
  );
}
