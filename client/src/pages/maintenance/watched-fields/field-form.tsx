import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
import {
  WATCHED_FIELD_COMPARISON_MODES,
  WATCHED_FIELD_DATA_TYPES,
  WATCHED_FIELD_SIGNIFICANCES,
} from '@shared/dto';
import type {
  CreateWatchedFieldDto,
  UpdateWatchedFieldDto,
  WatchedFieldComparisonMode,
  WatchedFieldDataType,
  WatchedFieldDto,
  WatchedFieldSignificance,
} from '@shared/dto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut } from '@/lib/api';

interface WatchedFieldFormData {
  fieldPath: string;
  displayName: string;
  active: boolean;
  dataType: WatchedFieldDataType;
  comparisonMode: WatchedFieldComparisonMode;
  tolerance: string;
  nullEqualsEmpty: boolean;
  significance: WatchedFieldSignificance;
  effectiveFrom: string;
}

interface WatchedFieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  field?: WatchedFieldDto;
  onSuccess: () => void;
}

function emptyForm(): WatchedFieldFormData {
  return {
    fieldPath: '',
    displayName: '',
    active: true,
    dataType: 'text',
    comparisonMode: 'exact',
    tolerance: '',
    nullEqualsEmpty: false,
    significance: 'material',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  };
}

export function WatchedFieldFormDialog({
  open,
  onOpenChange,
  entityType,
  field,
  onSuccess,
}: WatchedFieldFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!field;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WatchedFieldFormData>({ defaultValues: emptyForm() });

  const comparisonMode = watch('comparisonMode');
  const toleranceEnabled = comparisonMode === 'numeric_tolerance';

  useEffect(() => {
    if (!open) return;
    reset(
      field
        ? {
            fieldPath: field.fieldPath,
            displayName: field.displayName,
            active: field.active,
            dataType: field.dataType,
            comparisonMode: field.comparisonMode,
            tolerance: field.tolerance === null ? '' : String(field.tolerance),
            nullEqualsEmpty: field.nullEqualsEmpty,
            significance: field.significance,
            effectiveFrom: field.effectiveFrom,
          }
        : emptyForm(),
    );
  }, [open, field, reset]);

  const onSubmit = async (data: WatchedFieldFormData) => {
    const tolerance =
      data.comparisonMode === 'numeric_tolerance' && data.tolerance.trim() !== ''
        ? Number(data.tolerance)
        : null;

    const payload: UpdateWatchedFieldDto = {
      displayName: data.displayName.trim(),
      dataType: data.dataType,
      comparisonMode: data.comparisonMode,
      tolerance,
      nullEqualsEmpty: data.nullEqualsEmpty,
      significance: data.significance,
      effectiveFrom: data.effectiveFrom,
      active: data.active,
    };

    try {
      if (isEditing) {
        await apiPut<WatchedFieldDto, UpdateWatchedFieldDto>(
          `/api/watched-fields/fields/${field.fieldId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Watched field updated successfully' });
      } else {
        await apiPost<WatchedFieldDto, CreateWatchedFieldDto>('/api/watched-fields/fields', {
          ...payload,
          entityType,
          fieldPath: data.fieldPath.trim(),
        });
        toast({ title: 'Success', description: 'Watched field created successfully' });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} watched field`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Watched Field' : 'New Watched Field'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update how this field is tracked by change detection.'
              : `Add a field to watch on ${entityType}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6 py-4">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Detection</h3>

              <div className="space-y-2">
                <Label htmlFor="fieldPath">
                  Field Path <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fieldPath"
                  className="font-mono"
                  placeholder="e.g., contracted_margin"
                  disabled={isEditing}
                  {...register('fieldPath', { required: 'Field path is required' })}
                />
                {errors.fieldPath && (
                  <p className="text-sm text-destructive">{errors.fieldPath.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {isEditing
                    ? 'Field path cannot change — findings reference it by string match. To rename, deactivate this row and create a new one.'
                    : 'Must match the JSON key in the entity snapshot payload exactly.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Contracted Margin"
                  {...register('displayName', { required: 'Display name is required' })}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName.message}</p>
                )}
              </div>

              <Controller
                control={control}
                name="active"
                render={({ field: f }) => (
                  <div className="flex items-center gap-3">
                    <Switch id="active" checked={f.value} onCheckedChange={f.onChange} />
                    <Label htmlFor="active" className="cursor-pointer">
                      Active — include this field in detection runs
                    </Label>
                  </div>
                )}
              />
            </section>

            <section className="space-y-4 rounded-lg border border-dashed p-4">
              <div>
                <h3 className="text-sm font-semibold">Reserved configuration</h3>
                <Alert variant="warning" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Configured for future rule support — not yet read by the diff engine, which
                    currently compares every active field as an exact string match. Filling these in
                    now saves a data-entry pass later.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataType">Data Type</Label>
                  <Controller
                    control={control}
                    name="dataType"
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger id="dataType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCHED_FIELD_DATA_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="significance">Significance</Label>
                  <Controller
                    control={control}
                    name="significance"
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger id="significance">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCHED_FIELD_SIGNIFICANCES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comparisonMode">Comparison Mode</Label>
                  <Controller
                    control={control}
                    name="comparisonMode"
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger id="comparisonMode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WATCHED_FIELD_COMPARISON_MODES.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tolerance">Tolerance</Label>
                  <Input
                    id="tolerance"
                    type="number"
                    step="any"
                    min="0"
                    disabled={!toleranceEnabled}
                    placeholder={toleranceEnabled ? '0.01' : 'Requires numeric_tolerance'}
                    {...register('tolerance', {
                      validate: (value) =>
                        !toleranceEnabled ||
                        value.trim() === '' ||
                        Number(value) >= 0 ||
                        'Tolerance must be a non-negative number',
                    })}
                  />
                  {errors.tolerance && (
                    <p className="text-sm text-destructive">{errors.tolerance.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectiveFrom">Effective From</Label>
                  <Input id="effectiveFrom" type="date" {...register('effectiveFrom')} />
                </div>
              </div>

              <Controller
                control={control}
                name="nullEqualsEmpty"
                render={({ field: f }) => (
                  <div className="flex items-center gap-3">
                    <Switch
                      id="nullEqualsEmpty"
                      checked={f.value}
                      onCheckedChange={f.onChange}
                    />
                    <Label htmlFor="nullEqualsEmpty" className="cursor-pointer">
                      Treat null and empty string as equal
                    </Label>
                  </div>
                )}
              />
            </section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
