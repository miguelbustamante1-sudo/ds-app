import { useEffect, useState, useCallback, useRef } from 'react';
import type { ClientContactDTO } from '@shared/dto';
import { apiGet } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronDown } from 'lucide-react';

interface EndorsementClientManagerEmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  clientId?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function EndorsementClientManagerEmailField({
  value,
  onChange,
  clientId,
  inputProps,
}: EndorsementClientManagerEmailFieldProps) {
  const [contacts, setContacts] = useState<ClientContactDTO[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadContacts = useCallback(async () => {
    if (!clientId) {
      setContacts([]);
      return;
    }
    try {
      const data = await apiGet<ClientContactDTO[]>(`/api/client-contacts?clientId=${clientId}`);
      setContacts(data.filter((c) => c.active));
    } catch {
      console.error('Failed to load client contacts');
    }
  }, [clientId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const hasContacts = contacts.length > 0;

  return (
    <div className="flex gap-1">
      <Input
        ref={inputRef}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
        {...inputProps}
      />
      {hasContacts && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Select from client contacts"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder="Search contacts..." />
              <CommandList>
                <CommandEmpty>No contacts found.</CommandEmpty>
                <CommandGroup>
                  {contacts.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.email}`}
                      onSelect={() => {
                        onChange(c.email);
                        setOpen(false);
                        inputRef.current?.focus();
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-sm text-muted-foreground">{c.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
