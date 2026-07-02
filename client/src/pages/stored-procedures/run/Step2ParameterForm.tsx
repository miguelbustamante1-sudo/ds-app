import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProcedureSignatureDTO, StoredProcedureSummaryDTO } from '@shared/dto/StoredProcedure';
import type { WizardFormData } from './types';

interface Step2Props {
  procedure: StoredProcedureSummaryDTO;
  signature: ProcedureSignatureDTO;
  parameters: WizardFormData;
  onParametersChange: (params: WizardFormData) => void;
}

export function Step2ParameterForm({
  procedure,
  signature,
  parameters,
  onParametersChange,
}: Step2Props) {
  const { control, watch, setValue } = useForm({
    defaultValues: parameters,
  });

  const formValues = watch();

  useEffect(() => {
    onParametersChange(formValues);
  }, [formValues, onParametersChange]);

  const renderInput = (paramName: string, pgType: string) => {
    // Map Postgres types to input types
    if (['boolean', 'bool'].includes(pgType.toLowerCase())) {
      return (
        <Controller
          name={paramName}
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id={paramName}
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
              <label htmlFor={paramName} className="cursor-pointer text-sm">
                {paramName}
              </label>
            </div>
          )}
        />
      );
    }

    if (['date', 'timestamp', 'timestamp with time zone'].includes(pgType.toLowerCase())) {
      return (
        <Controller
          name={paramName}
          control={control}
          render={({ field }) => (
            <Input
              type="date"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
          )}
        />
      );
    }

    if (['integer', 'int', 'bigint', 'smallint', 'numeric', 'decimal'].includes(pgType.toLowerCase())) {
      return (
        <Controller
          name={paramName}
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder={paramName}
            />
          )}
        />
      );
    }

    // Default to text
    return (
      <Controller
        name={paramName}
        control={control}
        render={({ field }) => (
          <Input
            type="text"
            {...field}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value || null)}
            placeholder={paramName}
          />
        )}
      />
    );
  };

  if (signature.parameters.length === 0) {
    return (
      <div>
        <h3 className="font-semibold mb-4">No Parameters Required</h3>
        <p className="text-sm text-muted-foreground">This procedure takes no input parameters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Enter Parameters</h3>
      {signature.parameters
        .filter((p) => p.mode === 'in')
        .map((param) => (
          <div key={param.parameterName} className="space-y-2">
            <Label htmlFor={param.parameterName}>
              {param.parameterName} <span className="text-xs text-muted-foreground">({param.pgType})</span>
            </Label>
            {renderInput(param.parameterName, param.pgType)}
          </div>
        ))}
    </div>
  );
}
