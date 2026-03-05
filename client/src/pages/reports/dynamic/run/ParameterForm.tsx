import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ParameterField } from './ParameterField';
import type { ReportParameterDTO } from '@shared/dto/DynamicReport';

interface ParameterFormProps {
  reportId: number;
  parameters: ReportParameterDTO[];
  onSubmit: (values: Record<string, string | number | boolean | null>) => void;
  isRunning: boolean;
}

export function ParameterForm({ reportId, parameters, onSubmit, isRunning }: ParameterFormProps) {
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>(() => {
    const init: Record<string, string | number | boolean | null> = {};
    for (const p of parameters) {
      init[p.parameterName] = p.parameterDefault ?? null;
    }
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(name: string, value: string | number | boolean | null) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {};
    for (const p of parameters) {
      if (p.parameterRequired) {
        const val = values[p.parameterName];
        if (val === null || val === undefined || val === '') {
          newErrors[p.parameterName] = `${p.parameterLabel} is required`;
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(values);
  }

  if (parameters.length === 0) {
    return (
      <div className="flex">
        <Button onClick={() => onSubmit({})} disabled={isRunning}>
          <Play className="mr-1 h-4 w-4" />
          {isRunning ? 'Running...' : 'Run Report'}
        </Button>
      </div>
    );
  }

  const sorted = [...parameters].sort((a, b) => a.parameterOrder - b.parameterOrder);

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
        {sorted.map((param) => (
          <div key={param.parameterName} className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {param.parameterLabel}
              {param.parameterRequired && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <ParameterField
              reportId={reportId}
              param={param}
              value={values[param.parameterName] ?? null}
              onChange={handleChange}
            />
            {errors[param.parameterName] && (
              <p className="text-xs text-destructive">{errors[param.parameterName]}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={handleSubmit} disabled={isRunning} size="sm">
          <Play className="mr-1 h-4 w-4" />
          {isRunning ? 'Running...' : 'Run Report'}
        </Button>
      </div>
    </div>
  );
}
