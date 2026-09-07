import { useEffect, useState, useCallback } from 'react';
import type { ClientContactDTO } from '@shared/dto';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';

interface ContactComboBoxProps {
  clientId: number | null;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function ContactComboBox({ clientId, value, onValueChange, disabled }: ContactComboBoxProps) {
  const [contacts, setContacts] = useState<ClientContactDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!clientId) {
      setContacts([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<ClientContactDTO[]>(`/api/client-contacts?clientId=${clientId}`);
      setContacts(data.filter((c) => c.active));
    } catch {
      console.error('Failed to load client contacts');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const options: ComboBoxOption[] = contacts.map((c) => ({
    value: c.id.toString(),
    label: c.name,
  }));

  return (
    <ComboBox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loading ? 'Loading contacts...' : 'Select a contact'}
      searchPlaceholder="Search contacts..."
      emptyMessage="No contacts found."
      disabled={disabled || loading || !clientId}
    />
  );
}
