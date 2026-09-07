import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { createShift } from '@/services/shift';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function padHour(h: number): string {
  return String(h).padStart(2, '0');
}

interface DetailRow {
  dayOfWeek: number;
  startHour: number;
  endHour:   number;
}

function defaultDetails(): DetailRow[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, startHour: 0, endHour: 0 }));
}

interface MasterFormData {
  description: string;
  lunchHours:  number;
}

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
}

export function ShiftCreateDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [details, setDetails] = useState<DetailRow[]>(defaultDetails);
  const [saving, setSaving]   = useState(false);

  const computedTotalHours = details.reduce(
    (sum, row) => sum + Math.max(0, row.endHour - row.startHour),
    0,
  );

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<MasterFormData>({
    defaultValues: { description: '', lunchHours: 0 },
  });

  const lunchHoursValue = watch('lunchHours') ?? 0;

  useEffect(() => {
    if (!open) return;
    reset({ description: '', lunchHours: 0 });
    setDetails(defaultDetails());
  }, [open, reset]);

  const setDetailField = (index: number, field: 'startHour' | 'hours', value: number) => {
    setDetails((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'startHour') {
          const duration = Math.max(0, row.endHour - row.startHour);
          return { ...row, startHour: value, endHour: value + duration };
        }
        return { ...row, endHour: row.startHour + Math.max(0, value) };
      }),
    );
  };

  const onSave = async (data: MasterFormData) => {
    setSaving(true);
    try {
      await createShift({
        description:    data.description.trim(),
        totalWeekHours: computedTotalHours,
        lunchHours:     Number(data.lunchHours),
        details: details.map((row) => {
          const hours = Math.max(0, row.endHour - row.startHour);
          const lunch = hours > 0 ? Number(data.lunchHours) : 0;
          return {
            dayOfWeek:    row.dayOfWeek,
            startTime:    row.startHour,
            endTime:      row.endHour + lunch,
            workingHours: hours,
          };
        }),
      });
      toast({ title: 'Created', description: 'Shift created successfully' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create shift';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Shift</DialogTitle>
          <DialogDescription>
            Create a new shift and configure its weekly day schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-description"
                placeholder="e.g., Morning Shift"
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                })}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Total Week Hours</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm tabular-nums">
                {computedTotalHours} h
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Day Schedule
            </p>

            <div className="flex items-center gap-3 mb-3">
              <Label htmlFor="create-lunchHours" className="whitespace-nowrap">Lunch Hours</Label>
              <div className="max-w-[120px]">
                <Input
                  id="create-lunchHours"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  className="h-9 tabular-nums"
                  {...register('lunchHours', {
                    min: { value: 0, message: 'Must be >= 0' },
                    valueAsNumber: true,
                  })}
                />
                {errors.lunchHours && (
                  <p className="text-sm text-destructive">{errors.lunchHours.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[130px_1fr_90px_1fr] gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Day</span>
              <span className="text-xs font-medium text-muted-foreground">Start (h)</span>
              <span className="text-xs font-medium text-muted-foreground">Hours</span>
              <span className="text-xs font-medium text-muted-foreground">End (h)</span>
            </div>

            <div className="space-y-2">
              {details.map((row, index) => {
                const hours = row.endHour - row.startHour;
                return (
                  <div
                    key={row.dayOfWeek}
                    className="grid grid-cols-[130px_1fr_90px_1fr] gap-2 items-center"
                  >
                    <span className="text-sm font-medium">{DAY_NAMES[row.dayOfWeek]}</span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-8 px-0"
                        onClick={() => setDetailField(index, 'startHour', Math.max(0, row.startHour - 1))}
                        disabled={row.startHour <= 0}
                      >
                        -
                      </Button>
                      <div className="flex items-center justify-center h-9 flex-1 rounded-md border bg-background text-sm tabular-nums font-medium">
                        {padHour(row.startHour)}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-8 px-0"
                        onClick={() => setDetailField(index, 'startHour', Math.min(23, row.startHour + 1))}
                        disabled={row.startHour >= 23}
                      >
                        +
                      </Button>
                    </div>

                    <Input
                      type="number"
                      min={0}
                      max={24}
                      step={1}
                      className="h-9 tabular-nums"
                      value={hours > 0 ? hours : 0}
                      onChange={(e) => setDetailField(index, 'hours', Number(e.target.value))}
                    />

                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm text-muted-foreground select-none tabular-nums">
                      {padHour(row.endHour + (hours > 0 ? Number(lunchHoursValue) : 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
