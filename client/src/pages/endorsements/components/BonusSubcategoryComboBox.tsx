import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { useBonusSubcategories } from './useBonusSubcategories';

interface BonusSubcategoryComboBoxProps {
  countryId: number | null;
  selectedBonusIds: number[];
  value: number | null;
  onValueChange: (id: number | null) => void;
  disabled?: boolean;
}

export function BonusSubcategoryComboBox({
  countryId,
  selectedBonusIds,
  value,
  onValueChange,
  disabled,
}: BonusSubcategoryComboBoxProps) {
  const { subcategories, loading } = useBonusSubcategories(countryId);

  const available = subcategories.filter(
    (s) => !selectedBonusIds.includes(s.bonusSubcategoryId),
  );

  const options: ComboBoxOption[] = available.map((s) => ({
    value: String(s.bonusSubcategoryId),
    label: s.bonusCategory?.bonusCategoryName
      ? `[${s.bonusCategory.bonusCategoryName}] ${s.bonusSubcategoryName}`
      : s.bonusSubcategoryName,
  }));

  const handleValueChange = (raw: string) => {
    onValueChange(raw ? Number(raw) : null);
  };

  return (
    <ComboBox
      options={options}
      value={value != null ? String(value) : ''}
      onValueChange={handleValueChange}
      placeholder={
        countryId == null
          ? 'Select a country first'
          : loading
            ? 'Loading bonuses...'
            : 'Select a bonus'
      }
      searchPlaceholder="Search bonuses..."
      emptyMessage="No bonuses available."
      disabled={disabled || loading || countryId == null}
    />
  );
}
