import { useEffect, useState, useCallback } from 'react';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface PositionItem {
  posId: number;
  posName: string;
}

interface EndorsementPositionComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementPositionComboBox({ value, onValueChange, disabled }: EndorsementPositionComboBoxProps) {
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<PositionItem[]>('/api/positions');
      setPositions(data);
    } catch {
      console.error('Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const options: ComboBoxOption[] = positions.map((p) => ({
    value: p.posId.toString(),
    label: p.posName,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading positions...' : 'Select a position'}
      searchPlaceholder="Search positions..."
      emptyMessage="No positions found."
      disabled={disabled || loading}
    />
  );
}
