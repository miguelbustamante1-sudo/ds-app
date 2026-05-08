import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ShiftDTO } from '@shared/dto/Shift';
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
import { updateShift, updateShiftDetail } from '@/services/shift';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function padHour(h: number): string {
  return String(h).padStart(2, '0');
}

interface DetailState {
  shiftDetailId: number;
  dayOfWeek:     number;
  startHour:     number;
  endHour:       number; // = startHour + workingHours (lunch NOT included)
}

interface MasterFormData {
  description:    string;
  totalWeekHours: number;
  lunchHours:     number;
}

interface Props {
  shift:        ShiftDTO | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess:    () => void;
}

export function ShiftEditDialog({ shift, open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [details, setDetails] = useState<DetailState[]>([]);
  const [saving, setSaving]   = useState(false);

  const computedTotalHours = details.reduce(
    (sum, row) => sum + Math.max(0, row.endHour - row.startHour),
    0,
  );

  const {
    register,
    handleSubmit,
    reset: resetMaster,
    setValue,
    watch,
    formState: { errors: masterErrors },
  } = useForm<MasterFormData>({
    defaultValues: { description: '', totalWeekHours: 0, lunchHours: 0 },
  });

  const lunchHoursValue = watch('lunchHours') ?? 0;

  useEffect(() => {
    if (!open || !shift) return;
    const lunch = shift.lunchHours ?? 0;
    resetMaster({ description: shift.description, totalWeekHours: shift.totalWeekHours, lunchHours: lunch });
    const sorted = [...shift.details].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    // DB endTime = startTime + workingHours + lunch; strip lunch so internal state = startTime + workingHours
    setDetails(sorted.map((d) => {
      const rawEnd      = d.endTime;
      const hours       = rawEnd - d.startTime;
      const strippedEnd = hours > 0 ? rawEnd - lunch : rawEnd;
      return { shiftDetailId: d.shiftDetailId, dayOfWeek: d.dayOfWeek, startHour: d.startTime, endHour: strippedEnd };
    }));
  }, [open, shift, resetMaster]);

  useEffect(() => {
    setValue('totalWeekHours', computedTotalHours);
  }, [computedTotalHours, setValue]);

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
    if (!shift) return;
    setSaving(true);
    try {
      await Promise.all([
        updateShift(shift.shiftId, {
          description:    data.description.trim(),
          totalWeekHours: Number(data.totalWeekHours),
          lunchHours:     Number(data.lunchHours),
        }),
        ...details.map((row) => {
          const hours = Math.max(0, row.endHour - row.startHour);
          const lunch = hours > 0 ? Number(data.lunchHours) : 0;
          return updateShiftDetail(shift.shiftId, row.shiftDetailId, {
            startTime:    row.startHour,
            endTime:      row.endHour + lunch,
            workingHours: hours,
          });
        }),
      ]);
      toast({ title: 'Saved', description: 'Shift updated successfully' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save shift';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>
            Update shift information and configure day schedules below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="description"
                placeholder="e.g., Morning Shift"
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                })}
              />
              {masterErrors.description && (
                <p className="text-sm text-destructive">{masterErrors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalWeekHours">Total Week Hours</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm tabular-nums">
                {computedTotalHours} h
              </div>
              <input type="hidden" {...register('totalWeekHours')} />
            </div>
          </div>

          {details.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Day Schedule
              </p>

              <div className="flex items-center gap-3 mb-3">
                <Label htmlFor="lunchHours" className="whitespace-nowrap">Lunch Hours</Label>
                <div className="max-w-[120px]">
                  <Input
                    id="lunchHours"
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
                  {masterErrors.lunchHours && (
                    <p className="text-sm text-destructive">{masterErrors.lunchHours.message}</p>
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
                      key={row.shiftDetailId}
                      className="grid grid-cols-[130px_1fr_90px_1fr] gap-2 items-center"
                    >
                      <span className="text-sm font-medium">
                        {DAY_NAMES[row.dayOfWeek] ?? `Day ${row.dayOfWeek}`}
                      </span>

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
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
