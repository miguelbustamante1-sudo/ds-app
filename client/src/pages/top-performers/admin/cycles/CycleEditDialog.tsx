import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { cyclesApi } from '@/api/topPerformers/cycles';
import type { TpCycleDTO } from '@/api/topPerformers/cycles';
import { TP_CYCLE_STATUSES, type TpCycleStatus } from '@shared/dto/TopPerformersCycle';
import { STATUS_LABELS } from './cycleColumns';
import { CycleDateTimeField, combineDateAndTime, splitIsoDateTime } from './CycleDateTimeField';

interface CycleEditFormData {
  cycName: string;
  cycStatus: TpCycleStatus;
}

interface DateTimeState {
  nomStartDate: Date | null;
  nomStartTime: string;
  nomEndDate: Date | null;
  nomEndTime: string;
  voteStartDate: Date | null;
  voteStartTime: string;
  voteEndDate: Date | null;
  voteEndTime: string;
}

interface CycleEditDialogProps {
  cycle: TpCycleDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = TP_CYCLE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

export function CycleEditDialog({ cycle, open, onOpenChange, onSuccess }: CycleEditDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dt, setDt] = useState<DateTimeState>({
    nomStartDate: null, nomStartTime: '',
    nomEndDate: null,   nomEndTime: '',
    voteStartDate: null, voteStartTime: '',
    voteEndDate: null,  voteEndTime: '',
  });
  const [dtErrors, setDtErrors] = useState<Partial<Record<keyof DateTimeState, string>>>({});

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CycleEditFormData>();

  const watchedStatus = watch('cycStatus');

  useEffect(() => {
    if (open) {
      reset({ cycName: cycle.cycName, cycStatus: cycle.cycStatus });
      setDtErrors({});

      const nomStart  = splitIsoDateTime(cycle.cycNominationsStart);
      const nomEnd    = splitIsoDateTime(cycle.cycNominationsEnd);
      const voteStart = splitIsoDateTime(cycle.cycVotingStart);
      const voteEnd   = splitIsoDateTime(cycle.cycVotingEnd);

      setDt({
        nomStartDate:  nomStart.date,  nomStartTime:  nomStart.time,
        nomEndDate:    nomEnd.date,    nomEndTime:    nomEnd.time,
        voteStartDate: voteStart.date, voteStartTime: voteStart.time,
        voteEndDate:   voteEnd.date,   voteEndTime:   voteEnd.time,
      });
    }
  }, [open, cycle, reset]);

  function setDate(key: keyof DateTimeState, value: Date | null) {
    setDt((prev) => ({ ...prev, [key]: value }));
    setDtErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setTime(key: keyof DateTimeState, value: string) {
    setDt((prev) => ({ ...prev, [key]: value }));
  }

  function validateDates(): boolean {
    const errs: Partial<Record<keyof DateTimeState, string>> = {};
    if (!dt.nomStartDate  || !dt.nomStartTime)  errs.nomStartDate  = 'Required.';
    if (!dt.nomEndDate    || !dt.nomEndTime)    errs.nomEndDate    = 'Required.';
    if (!dt.voteStartDate || !dt.voteStartTime) errs.voteStartDate = 'Required.';
    if (!dt.voteEndDate   || !dt.voteEndTime)   errs.voteEndDate   = 'Required.';
    setDtErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const onSubmit = async (data: CycleEditFormData) => {
    if (!validateDates()) return;
    setSaving(true);
    try {
      await cyclesApi.update(cycle.cycId, {
        cycName: data.cycName.trim(),
        cycNominationsStart: combineDateAndTime(dt.nomStartDate, dt.nomStartTime),
        cycNominationsEnd:   combineDateAndTime(dt.nomEndDate,   dt.nomEndTime),
        cycVotingStart:      combineDateAndTime(dt.voteStartDate, dt.voteStartTime),
        cycVotingEnd:        combineDateAndTime(dt.voteEndDate,   dt.voteEndTime),
      });

      if (data.cycStatus !== cycle.cycStatus) {
        await cyclesApi.updateStatus(cycle.cycId, data.cycStatus);
      }

      toast({ title: 'Cycle updated successfully' });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error updating cycle';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cycName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycName"
              {...register('cycName', { required: 'Name is required.' })}
            />
            {errors.cycName && (
              <p className="text-sm text-destructive">{errors.cycName.message}</p>
            )}
          </div>

          <CycleDateTimeField
            label="Nominations Start"
            required
            date={dt.nomStartDate}
            time={dt.nomStartTime}
            onDateChange={(d) => setDate('nomStartDate', d)}
            onTimeChange={(t) => setTime('nomStartTime', t)}
            error={dtErrors.nomStartDate}
          />

          <CycleDateTimeField
            label="Nominations End"
            required
            date={dt.nomEndDate}
            time={dt.nomEndTime}
            onDateChange={(d) => setDate('nomEndDate', d)}
            onTimeChange={(t) => setTime('nomEndTime', t)}
            error={dtErrors.nomEndDate}
          />

          <CycleDateTimeField
            label="Voting Start"
            required
            date={dt.voteStartDate}
            time={dt.voteStartTime}
            onDateChange={(d) => setDate('voteStartDate', d)}
            onTimeChange={(t) => setTime('voteStartTime', t)}
            error={dtErrors.voteStartDate}
          />

          <CycleDateTimeField
            label="Voting End"
            required
            date={dt.voteEndDate}
            time={dt.voteEndTime}
            onDateChange={(d) => setDate('voteEndDate', d)}
            onTimeChange={(t) => setTime('voteEndTime', t)}
            error={dtErrors.voteEndDate}
          />

          <div className="space-y-1">
            <Label>Status</Label>
            <Controller
              name="cycStatus"
              control={control}
              rules={{ required: 'Status is required.' }}
              render={() => (
                <ComboBox
                  options={STATUS_OPTIONS}
                  value={watchedStatus ?? ''}
                  onValueChange={(v) => setValue('cycStatus', v as TpCycleStatus, { shouldValidate: true })}
                  placeholder="Select status..."
                />
              )}
            />
            {errors.cycStatus && (
              <p className="text-sm text-destructive">{errors.cycStatus.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
