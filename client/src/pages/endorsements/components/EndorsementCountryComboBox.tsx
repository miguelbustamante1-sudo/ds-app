import { useEffect, useState, useCallback } from 'react';
import type { CountryDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementCountryComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementCountryComboBox({ value, onValueChange, disabled }: EndorsementCountryComboBoxProps) {
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCountries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CountryDTO[]>('/api/countries');
      setCountries(data);
    } catch {
      console.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  const options: ComboBoxOption[] = countries.map((c) => ({
    value: c.countryId.toString(),
    label: c.countryName,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading countries...' : 'Select a country'}
      searchPlaceholder="Search countries..."
      emptyMessage="No countries found."
      disabled={disabled || loading}
    />
  );
}
