import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { DETECTION_RULE_CONDITION_OPERATORS, DETECTION_RULE_SEVERITIES, DETECTION_RULE_TYPES } from '@shared/dto';
import type {
  CreateDetectionRuleDto,
  DetectionRuleConditionOperator,
  DetectionRuleDefinition,
  DetectionRuleDto,
  DetectionRuleSeverity,
  DetectionRuleType,
  UpdateDetectionRuleDto,
} from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ComboBox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/api';
import { CONDITION_OPERATOR_LABELS, RULE_TYPE_LABELS } from '@/lib/detection-rules';

interface DetectionRuleFormData {
  entityType: string;
  ruleType: DetectionRuleType;
  field: string;
  min: string;
  max: string;
  expected: 'true' | 'false';
  whenField: string;
  whenOperator: DetectionRuleConditionOperator;
  whenValue: string;
  severity: DetectionRuleSeverity;
}

interface DetectionRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: DetectionRuleDto;
  entityTypes: string[];
  onSuccess: () => void;
}

const RULE_TYPE_OPTIONS = DETECTION_RULE_TYPES.map((type) => ({
  value: type,
  label: `${RULE_TYPE_LABELS[type]} (${type})`,
}));
const SEVERITY_OPTIONS = DETECTION_RULE_SEVERITIES.map((s) => ({ value: s, label: s }));
const OPERATOR_OPTIONS = DETECTION_RULE_CONDITION_OPERATORS.map((op) => ({
  value: op,
  label: CONDITION_OPERATOR_LABELS[op],
}));
const EXPECTED_OPTIONS = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
];

function toFormData(record: DetectionRuleDto | undefined, defaultEntityType: string): DetectionRuleFormData {
  return {
    entityType: record?.entityType ?? defaultEntityType,
    ruleType: record?.ruleType ?? 'required_not_null',
    field: record?.definition.field ?? '',
    min: record?.definition.min?.toString() ?? '',
    max: record?.definition.max?.toString() ?? '',
    expected: record?.definition.expected === false ? 'false' : 'true',
    whenField: record?.definition.when?.field ?? '',
    whenOperator: record?.definition.when?.operator ?? 'equals',
    whenValue: record?.definition.when?.value ?? '',
    severity: record?.severity ?? 'medium',
  };
}

function toDefinition(data: DetectionRuleFormData): DetectionRuleDefinition {
  const field = data.field.trim();
  switch (data.ruleType) {
    case 'range_check':
      return { field, min: Number(data.min), max: Number(data.max) };
    case 'boolean_equals':
      return { field, expected: data.expected === 'true' };
    case 'required_when':
      return {
        field,
        when: { field: data.whenField.trim(), operator: data.whenOperator, value: data.whenValue.trim() },
      };
    default:
      return { field };
  }
}

export function DetectionRuleFormDialog({
  open,
  onOpenChange,
  record,
  entityTypes,
  onSuccess,
}: DetectionRuleFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DetectionRuleFormData>({ defaultValues: toFormData(undefined, '') });

  const ruleType = watch('ruleType');
  const entityType = watch('entityType');
  const severity = watch('severity');
  const expected = watch('expected');
  const whenOperator = watch('whenOperator');
  const isConditional = ruleType === 'required_when';

  const entityTypeOptions = useMemo(
    () => entityTypes.map((type) => ({ value: type, label: type })),
    [entityTypes],
  );

  useEffect(() => {
    if (open) reset(toFormData(record, entityTypes[0] ?? ''));
  }, [open, record, entityTypes, reset]);

  const onSubmit = async (data: DetectionRuleFormData) => {
    const definition = toDefinition(data);
    try {
      if (isEditing) {
        await apiPut<DetectionRuleDto, UpdateDetectionRuleDto>(`/api/detection-rules/${record.ruleId}`, {
          ruleType: data.ruleType,
          definition,
          severity: data.severity,
        });
        toast({ title: 'Success', description: 'Detection rule updated successfully' });
      } else {
        await apiPost<DetectionRuleDto, CreateDetectionRuleDto>('/api/detection-rules', {
          entityType: data.entityType,
          ruleType: data.ruleType,
          definition,
          severity: data.severity,
        });
        toast({ title: 'Success', description: 'Detection rule created successfully' });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error instanceof Error && error.message) || `Failed to ${isEditing ? 'update' : 'create'} detection rule`,
        variant: 'destructive',
      });
    }
  };

  const isNumber = (value: string) => value.trim() !== '' && Number.isFinite(Number(value));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit Rule #${record.ruleId}` : 'New Detection Rule'}</DialogTitle>
          <DialogDescription>
            State rules check each snapshot value when "Run Rules" is clicked on the Findings screen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Entity Type <span className="text-destructive">*</span>
                </Label>
                <ComboBox
                  options={entityTypeOptions}
                  value={entityType}
                  onValueChange={(value) => setValue('entityType', value)}
                  placeholder="Select entity..."
                  disabled={isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <ComboBox
                  options={SEVERITY_OPTIONS}
                  value={severity}
                  onValueChange={(value) => setValue('severity', value as DetectionRuleSeverity)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field">
                Field <span className="text-destructive">*</span>
              </Label>
              <Input
                id="field"
                className="font-mono"
                placeholder="e.g., director"
                disabled={isEditing}
                {...register('field', { validate: (v) => v.trim() !== '' || 'Field is required' })}
              />
              {errors.field && <p className="text-sm text-destructive">{errors.field.message}</p>}
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? 'Field cannot change — open findings are keyed by it. Turn this rule off and create a new one instead.'
                  : 'Must match the JSON key in the entity snapshot payload exactly.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Rule <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={RULE_TYPE_OPTIONS}
                value={ruleType}
                onValueChange={(value) => setValue('ruleType', value as DetectionRuleType)}
              />
            </div>

            {ruleType === 'range_check' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min">
                    Min <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="min"
                    type="number"
                    step="any"
                    {...register('min', {
                      validate: (value) => ruleType !== 'range_check' || isNumber(value) || 'Min must be a number',
                    })}
                  />
                  {errors.min && <p className="text-sm text-destructive">{errors.min.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">
                    Max <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="max"
                    type="number"
                    step="any"
                    {...register('max', {
                      validate: (value) => {
                        if (ruleType !== 'range_check') return true;
                        if (!isNumber(value)) return 'Max must be a number';
                        return (
                          Number(getValues('min')) <= Number(value) || 'Max must be greater than or equal to min'
                        );
                      },
                    })}
                  />
                  {errors.max && <p className="text-sm text-destructive">{errors.max.message}</p>}
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  An empty value does not trip a range check — pair it with "Must be filled in" if the
                  field is required.
                </p>
              </div>
            )}

            {ruleType === 'boolean_equals' && (
              <div className="space-y-2">
                <Label>
                  Expected <span className="text-destructive">*</span>
                </Label>
                <ComboBox
                  options={EXPECTED_OPTIONS}
                  value={expected}
                  onValueChange={(value) => setValue('expected', value as 'true' | 'false')}
                />
                <p className="text-xs text-muted-foreground">A missing value counts as a violation.</p>
              </div>
            )}

            {isConditional && (
              <div className="space-y-4 rounded-lg border border-dashed p-4">
                <p className="text-sm font-medium">When</p>
                <div className="space-y-2">
                  <Label htmlFor="whenField">
                    Condition Field <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="whenField"
                    className="font-mono"
                    placeholder="e.g., project_type"
                    {...register('whenField', {
                      validate: (v) => {
                        if (!isConditional) return true;
                        if (v.trim() === '') return 'Condition field is required';
                        return v.trim() !== getValues('field').trim() || 'Must differ from the field above';
                      },
                    })}
                  />
                  {errors.whenField && <p className="text-sm text-destructive">{errors.whenField.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <ComboBox
                      options={OPERATOR_OPTIONS}
                      value={whenOperator}
                      onValueChange={(value) => setValue('whenOperator', value as DetectionRuleConditionOperator)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="whenValue">
                      Value <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="whenValue"
                      placeholder="e.g., Client"
                      {...register('whenValue', {
                        validate: (v) => !isConditional || v.trim() !== '' || 'Value is required',
                      })}
                    />
                    {errors.whenValue && <p className="text-sm text-destructive">{errors.whenValue.message}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Case-sensitive. The rule fires only when this matches and the field above is empty. For
                  several values, add one rule per value.
                </p>
              </div>
            )}

            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Changing the rule or its settings bumps the version. Open findings are re-checked on the
                next "Run Rules" and self-resolve if they now pass.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !entityType}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
