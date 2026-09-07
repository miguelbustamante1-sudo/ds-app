import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ComboBox } from '@/components/ui/combobox';
import type { WizardParameter } from './types';

interface Step2ParametersProps {
  parameters: WizardParameter[];
  onParametersChange: (params: WizardParameter[]) => void;
}

const PARAM_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
];

const SELECT_SOURCE_OPTIONS = [
  { value: 'static', label: 'Static Options' },
  { value: 'query', label: 'SQL Query' },
];

export function Step2Parameters({ parameters, onParametersChange }: Step2ParametersProps) {
  function update(index: number, patch: Partial<WizardParameter>) {
    const next = parameters.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onParametersChange(next);
  }

  if (parameters.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No parameters detected in the SQL. Use <span className="font-mono">{'{paramName}'}</span>{' '}
        placeholders in your SQL to add parameters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parameters.map((param, idx) => (
        <div key={param.parameterName} className="rounded-md border p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-primary">
              {'{'}
              {param.parameterName}
              {'}'}
            </span>
            <span className="text-xs text-muted-foreground">Order: {param.parameterOrder}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Label */}
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={param.parameterLabel}
                onChange={(e) => update(idx, { parameterLabel: e.target.value })}
                placeholder="Display label"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <ComboBox
                options={PARAM_TYPES}
                value={param.parameterType}
                onValueChange={(val) => update(idx, { parameterType: val })}
                placeholder="Select type..."
                searchPlaceholder="Search type..."
              />
            </div>

            {/* Default Value */}
            <div className="space-y-1">
              <Label className="text-xs">Default Value</Label>
              <Input
                value={param.parameterDefault ?? ''}
                onChange={(e) => update(idx, { parameterDefault: e.target.value || null })}
                placeholder="Optional default"
              />
            </div>

            {/* Display Order */}
            <div className="space-y-1">
              <Label className="text-xs">Display Order</Label>
              <Input
                type="number"
                value={param.parameterOrder}
                onChange={(e) => update(idx, { parameterOrder: Number(e.target.value) })}
                min={1}
              />
            </div>
          </div>

          {/* Required */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`required-${idx}`}
              checked={param.parameterRequired}
              onCheckedChange={(checked) => update(idx, { parameterRequired: !!checked })}
            />
            <Label htmlFor={`required-${idx}`} className="cursor-pointer text-sm">
              Required
            </Label>
          </div>

          {/* Select-specific options */}
          {param.parameterType === 'select' && (
            <div className="space-y-3 rounded-md bg-muted/30 p-3">
              <div className="space-y-1">
                <Label className="text-xs">Options Source</Label>
                <ComboBox
                  options={SELECT_SOURCE_OPTIONS}
                  value={param.selectSource ?? 'static'}
                  onValueChange={(val) =>
                    update(idx, { selectSource: val as 'static' | 'query' })
                  }
                  placeholder="Select source..."
                  searchPlaceholder="Search..."
                />
              </div>

              {(param.selectSource ?? 'static') === 'static' ? (
                <div className="space-y-1">
                  <Label className="text-xs">
                    Options JSON{' '}
                    <span className="text-muted-foreground">
                      (array of {'{'}"value","label"{'}'})
                    </span>
                  </Label>
                  <Textarea
                    value={param.staticOptions ?? ''}
                    onChange={(e) => update(idx, { staticOptions: e.target.value })}
                    placeholder={`[{"value": "1", "label": "Option 1"}]`}
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Lookup SQL Query</Label>
                  <Textarea
                    value={param.queryOptions ?? ''}
                    onChange={(e) => update(idx, { queryOptions: e.target.value })}
                    placeholder="SELECT id AS value, name AS label FROM ..."
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
