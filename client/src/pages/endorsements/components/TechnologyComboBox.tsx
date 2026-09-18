import type { TechnologyDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';

interface TechnologyComboBoxProps {
  technologies: TechnologyDTO[];
  value: string;
  onValueChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function TechnologyComboBox({ technologies, value, onValueChange, loading, disabled }: TechnologyComboBoxProps) {
  const options: ComboBoxOption[] = technologies.map((t) => ({
    value: t.technologyId.toString(),
    label: t.technologyName,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading technologies...' : 'Select a technology'}
      searchPlaceholder="Search technologies..."
      emptyMessage="No technologies found."
      disabled={disabled || loading}
    />
  );
}
