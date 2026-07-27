import { useEffect, useState, useCallback, useMemo } from 'react';
import type { CountryDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementCurrencyComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementCurrencyComboBox({ value, onValueChange, disabled }: EndorsementCurrencyComboBoxProps) {
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCountries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CountryDTO[]>('/api/countries');
      setCountries(data);
    } catch {
      console.error('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  const options: ComboBoxOption[] = useMemo(() => {
    const symbols = new Set<string>();
    for (const country of countries) {
      if (country.currencySymbol) symbols.add(country.currencySymbol);
    }
    return Array.from(symbols)
      .sort()
      .map((symbol) => ({ value: symbol, label: symbol }));
  }, [countries]);

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading currencies...' : 'Select a currency'}
      searchPlaceholder="Search currencies..."
      emptyMessage="No currencies found."
      disabled={disabled || loading}
    />
  );
}
