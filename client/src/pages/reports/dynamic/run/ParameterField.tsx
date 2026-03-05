import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch, SwitchIndicator } from '@/components/ui/switch';
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import { formatUTCDate } from '@/lib/utils';
import { getParamOptions } from '../api';
import type { ReportParameterDTO, SelectOptions } from '@shared/dto/DynamicReport';

interface ParameterFieldProps {
  reportId: number;
  param: ReportParameterDTO;
  value: string | number | boolean | null;
  onChange: (name: string, value: string | number | boolean | null) => void;
}

export function ParameterField({ reportId, param, value, onChange }: ParameterFieldProps) {
  const { parameterName, parameterType, parameterLabel, parameterOptions } = param;

  // For select fields with query source
  const [queryOptions, setQueryOptions] = useState<ComboBoxOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const parsedOptions: SelectOptions | null = (() => {
    if (!parameterOptions) return null;
    try { return JSON.parse(parameterOptions); } catch { return null; }
  })();

  useEffect(() => {
    if (parameterType === 'select' && parsedOptions?.source === 'query') {
      setLoadingOptions(true);
      getParamOptions(reportId, parameterName)
        .then((opts) => setQueryOptions(opts.map((o) => ({ value: o.value, label: o.label }))))
        .catch(() => {})
        .finally(() => setLoadingOptions(false));
    }
  }, [reportId, parameterName, parameterType]);

  if (parameterType === 'text') {
    return (
      <Input
        value={(value as string) ?? ''}
        onChange={(e) => onChange(parameterName, e.target.value)}
        placeholder={parameterLabel}
      />
    );
  }

  if (parameterType === 'number') {
    return (
      <Input
        type="number"
        value={(value as number) ?? ''}
        onChange={(e) => onChange(parameterName, e.target.value ? Number(e.target.value) : null)}
        placeholder={parameterLabel}
      />
    );
  }

  if (parameterType === 'date') {
    // Value is stored as yyyy-MM-dd string; display using formatUTCDate when showing existing
    const dateValue = value ? String(value) : '';
    return (
      <Input
        type="date"
        value={dateValue}
        onChange={(e) => onChange(parameterName, e.target.value)}
      />
    );
  }

  if (parameterType === 'boolean') {
    return (
      <Switch
        checked={!!value}
        onCheckedChange={(checked) => onChange(parameterName, checked)}
      >
        <SwitchIndicator />
      </Switch>
    );
  }

  if (parameterType === 'select') {
    if (parsedOptions?.source === 'static') {
      const options: ComboBoxOption[] = parsedOptions.options.map((o) => ({
        value: o.value,
        label: o.label,
      }));
      return (
        <ComboBox
          options={options}
          value={(value as string) ?? ''}
          onValueChange={(val) => onChange(parameterName, val)}
          placeholder={`Select ${parameterLabel}...`}
          searchPlaceholder="Search..."
        />
      );
    }

    if (parsedOptions?.source === 'query') {
      if (loadingOptions) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading options...
          </div>
        );
      }
      return (
        <ComboBox
          options={queryOptions}
          value={(value as string) ?? ''}
          onValueChange={(val) => onChange(parameterName, val)}
          placeholder={`Select ${parameterLabel}...`}
          searchPlaceholder="Search..."
        />
      );
    }
  }

  // Fallback
  return (
    <Input
      value={(value as string) ?? ''}
      onChange={(e) => onChange(parameterName, e.target.value)}
    />
  );
}
