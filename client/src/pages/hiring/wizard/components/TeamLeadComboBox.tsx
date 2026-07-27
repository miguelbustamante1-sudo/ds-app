import { useEffect, useState, useCallback } from 'react';
import type { HiringTeamLeadOptionDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface TeamLeadComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

/** Sources options from GET /api/hiring/team-leads (all active team members, per FR-008). */
export function TeamLeadComboBox({ value, onValueChange, disabled }: TeamLeadComboBoxProps) {
  const [options, setOptions] = useState<HiringTeamLeadOptionDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<HiringTeamLeadOptionDTO[]>('/api/hiring/team-leads');
      setOptions(data);
    } catch {
      console.error('Failed to load team lead options');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const comboOptions: ComboBoxOption[] = options.map((tm) => ({
    value: tm.teamMemberId.toString(),
    label: tm.workdayId
      ? `${tm.teamMemberNames} ${tm.teamMemberSurnames} (${tm.workdayId})`
      : `${tm.teamMemberNames} ${tm.teamMemberSurnames}`,
  }));

  return (
    <ComboBox
      options={comboOptions}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading team leads...' : 'Select a team lead'}
      searchPlaceholder="Search team leads..."
      emptyMessage="No team leads found."
      disabled={disabled || loading}
    />
  );
}
