import { useEffect, useState, useCallback } from 'react';
import type { TierBandDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementTierBandComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementTierBandComboBox({ value, onValueChange, disabled }: EndorsementTierBandComboBoxProps) {
  const [tierBands, setTierBands] = useState<TierBandDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTierBands = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<TierBandDTO[]>('/api/tier-bands');
      setTierBands(data);
    } catch {
      console.error('Failed to load tier bands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTierBands();
  }, [loadTierBands]);

  const options: ComboBoxOption[] = tierBands.map((tb) => ({
    value: tb.tierBandId.toString(),
    label: tb.tierBandDescription,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading tier bands...' : 'Select a tier/band'}
      searchPlaceholder="Search tier bands..."
      emptyMessage="No tier bands found."
      disabled={disabled || loading}
    />
  );
}
