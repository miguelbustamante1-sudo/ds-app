import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { CycleDateTimeField, combineDateAndTime } from './CycleDateTimeField';

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CycleFormData {
  cycName: string;
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

const EMPTY_DT: DateTimeState = {
  nomStartDate: null, nomStartTime: '',
  nomEndDate: null,   nomEndTime: '',
  voteStartDate: null, voteStartTime: '',
  voteEndDate: null,  voteEndTime: '',
};

export function CycleFormDialog({ open, onOpenChange, onSuccess }: CycleFormDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dt, setDt] = useState<DateTimeState>(EMPTY_DT);
  const [dtErrors, setDtErrors] = useState<Partial<Record<keyof DateTimeState, string>>>({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CycleFormData>();

  useEffect(() => {
    if (open) {
      reset({ cycName: '' });
      setDt(EMPTY_DT);
      setDtErrors({});
    }
  }, [open, reset]);

  function setDate(key: keyof DateTimeState, value: Date | null) {
    setDt((prev) => ({ ...prev, [key]: value }));
    setDtErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setTime(key: keyof DateTimeState, value: string) {
    setDt((prev) => ({ ...prev, [key]: value }));
  }

  function validateDates(): boolean {
    const errs: Partial<Record<keyof DateTimeState, string>> = {};
    if (!dt.nomStartDate || !dt.nomStartTime) errs.nomStartDate = 'Required.';
    if (!dt.nomEndDate   || !dt.nomEndTime)   errs.nomEndDate   = 'Required.';
    if (!dt.voteStartDate || !dt.voteStartTime) errs.voteStartDate = 'Required.';
    if (!dt.voteEndDate  || !dt.voteEndTime)  errs.voteEndDate  = 'Required.';
    setDtErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const onSubmit = async (data: CycleFormData) => {
    if (!validateDates()) return;
    setSaving(true);
    try {
      await cyclesApi.create({
        cycName: data.cycName.trim(),
        cycNominationsStart: combineDateAndTime(dt.nomStartDate, dt.nomStartTime),
        cycNominationsEnd:   combineDateAndTime(dt.nomEndDate,   dt.nomEndTime),
        cycVotingStart:      combineDateAndTime(dt.voteStartDate, dt.voteStartTime),
        cycVotingEnd:        combineDateAndTime(dt.voteEndDate,   dt.voteEndTime),
      });
      toast({ title: 'Success', description: 'Cycle created successfully.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error creating cycle.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Cycle</DialogTitle>
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
              {saving ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
