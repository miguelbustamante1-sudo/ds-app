import { useEffect, useState, useCallback } from 'react';
import type { ClientDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface EndorsementClientComboBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function EndorsementClientComboBox({ value, onValueChange, disabled }: EndorsementClientComboBoxProps) {
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ClientDTO[]>('/api/clients');
      setClients(data);
    } catch {
      console.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const options: ComboBoxOption[] = clients.map((c) => ({
    value: c.Id.toString(),
    label: c.Name,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading clients...' : 'Select a client'}
      searchPlaceholder="Search clients..."
      emptyMessage="No clients found."
      disabled={disabled || loading}
    />
  );
}
