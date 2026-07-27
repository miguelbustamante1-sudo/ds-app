import { useEffect, useState, useCallback } from 'react';
import type { SkillDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementSkillComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementSkillComboBox({ value, onValueChange, disabled }: EndorsementSkillComboBoxProps) {
  const [skills, setSkills] = useState<SkillDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<SkillDTO[]>('/api/skills');
      setSkills(data);
    } catch {
      console.error('Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const options: ComboBoxOption[] = skills.map((s) => ({
    value: s.skillId.toString(),
    label: s.skillName,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading skills...' : 'Select a skill'}
      searchPlaceholder="Search skills..."
      emptyMessage="No skills found."
      disabled={disabled || loading}
    />
  );
}
