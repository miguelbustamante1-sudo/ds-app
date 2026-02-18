import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import type { CountryDTO } from '@shared/dto/Country';
import type { TimeOffCategoryDTO } from '@shared/dto/TimeOffCategory';
import type { TimeOffStatusDTO } from '@shared/dto/TimeOffStatus';
import type { TeamMemberDTO } from '@shared/dto/TeamMember';
import type { UserDTO } from '@shared/dto/User';
import { apiGet } from '@/lib/api';

// ─── Multi-select ComboBox ────────────────────────────────────────────────────

interface MultiComboBoxProps {
  options: ComboBoxOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

function MultiComboBox({
  options,
  values,
  onValuesChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
}: MultiComboBoxProps) {
  const [open, setOpen] = useState(false);

  const label =
    values.length === 0
      ? placeholder
      : values.length === 1
      ? (options.find((o) => o.value === values[0])?.label ?? values[0])
      : `${values.length} selected`;

  function toggle(value: string) {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value));
    } else {
      onValuesChange([...values, value]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={values.length === 0 ? 'text-muted-foreground' : ''}>
            {label}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = values.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                  >
                    {option.label}
                    {selected && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Data-loading hooks ───────────────────────────────────────────────────────

function useCountryOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<CountryDTO[]>({
    queryKey: ['countries'],
    queryFn: () => apiGet<CountryDTO[]>('/api/countries'),
    staleTime: 300_000,
  });
  return data.map((c) => ({ value: String(c.countryId), label: c.countryName }));
}

function useCategoryOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<TimeOffCategoryDTO[]>({
    queryKey: ['time-off-categories'],
    queryFn: () => apiGet<TimeOffCategoryDTO[]>('/api/time-off-category'),
    staleTime: 300_000,
  });
  return data.map((c) => ({ value: String(c.categoryId), label: c.categoryName }));
}

function useStatusOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<TimeOffStatusDTO[]>({
    queryKey: ['time-off-statuses'],
    queryFn: () => apiGet<TimeOffStatusDTO[]>('/api/time-off-statuses'),
    staleTime: 300_000,
  });
  return data.map((s) => ({ value: String(s.statusId), label: s.statusName }));
}

function useTeamMemberOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<TeamMemberDTO[]>({
    queryKey: ['team-members'],
    queryFn: () => apiGet<TeamMemberDTO[]>('/api/team-members'),
    staleTime: 300_000,
  });
  return data.map((m) => ({
    value: String(m.teamMemberId),
    label: m.teamMemberKnownAs
      ? `${m.teamMemberKnownAs} ${m.teamMemberSurnames}`
      : `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));
}

function useUserOptions(): ComboBoxOption[] {
  const { data = [] } = useQuery<UserDTO[]>({
    queryKey: ['users'],
    queryFn: () => apiGet<UserDTO[]>('/api/users'),
    staleTime: 300_000,
  });
  return data.map((u) => ({ value: String(u.userId), label: u.userName }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIds(raw: string): string[] {
  return raw ? raw.split(',').filter(Boolean) : [];
}

function joinIds(ids: string[]): string {
  return ids.join(',');
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

export function ChangeLogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const countryOptions = useCountryOptions();
  const categoryOptions = useCategoryOptions();
  const statusOptions = useStatusOptions();
  const teamMemberOptions = useTeamMemberOptions();
  const userOptions = useUserOptions();

  // Read current filter values from URL
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const countryIds = parseIds(searchParams.get('countryIds') ?? '');
  const teamMemberId = searchParams.get('teamMemberId') ?? '';
  const categoryIds = parseIds(searchParams.get('categoryIds') ?? '');
  const changedByUserId = searchParams.get('changedByUserId') ?? '';
  const statusIds = parseIds(searchParams.get('statusIds') ?? '');

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      // Clear run flag when filters change so user must click Run again
      next.delete('run');
      return next;
    });
  }

  function handleRun() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('run', '1');
      return next;
    });
  }

  function handleReset() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      // Preserve tab, remove everything else
      const tab = next.get('tab');
      next.forEach((_, key) => next.delete(key));
      if (tab) next.set('tab', tab);
      return next;
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
        {/* Date From */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setParam('from', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setParam('to', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Country — multi-select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Country</Label>
          <MultiComboBox
            options={countryOptions}
            values={countryIds}
            onValuesChange={(ids) => setParam('countryIds', joinIds(ids))}
            placeholder="All countries"
            searchPlaceholder="Search country..."
          />
        </div>

        {/* Employee — single-select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Employee</Label>
          <ComboBox
            options={teamMemberOptions}
            value={teamMemberId}
            onValueChange={(val) => setParam('teamMemberId', val)}
            placeholder="All employees"
            searchPlaceholder="Search employee..."
          />
        </div>

        {/* Category — multi-select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <MultiComboBox
            options={categoryOptions}
            values={categoryIds}
            onValuesChange={(ids) => setParam('categoryIds', joinIds(ids))}
            placeholder="All categories"
            searchPlaceholder="Search category..."
          />
        </div>

        {/* Changed By — single-select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Changed By</Label>
          <ComboBox
            options={userOptions}
            value={changedByUserId}
            onValueChange={(val) => setParam('changedByUserId', val)}
            placeholder="Anyone"
            searchPlaceholder="Search user..."
          />
        </div>

        {/* Status — multi-select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <MultiComboBox
            options={statusOptions}
            values={statusIds}
            onValuesChange={(ids) => setParam('statusIds', joinIds(ids))}
            placeholder="All statuses"
            searchPlaceholder="Search status..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <Button onClick={handleRun} size="sm">
          <Play className="mr-1 h-4 w-4" />
          Run
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
