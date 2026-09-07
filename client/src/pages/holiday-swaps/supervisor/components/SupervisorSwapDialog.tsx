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
import { ComboBox } from '@/components/ui/combobox';
import { apiGet } from '@/lib/api';
import { formatUTCDate, parseUTCDateAsLocal } from '@/lib/utils';
import type { HolidayDTO } from '@shared/dto/Holiday';
import type { HolidaySwapDTO } from '@shared/dto/HolidaySwap';
import type { TeamMemberReportDTO } from '@shared/dto/TeamMemberReport';

interface SwapFormData {
  holidayId: string;
  replacementDate: string;
}

interface SupervisorSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMember: TeamMemberReportDTO;
  editingSwap: HolidaySwapDTO | null;
  loading: boolean;
  onSave: (holidayId: number, replacementDate: string) => Promise<void>;
}

export function SupervisorSwapDialog({
  open,
  onOpenChange,
  teamMember,
  editingSwap,
  loading,
  onSave,
}: SupervisorSwapDialogProps) {
  const isEditing = editingSwap !== null;

  const [holidays, setHolidays] = useState<HolidayDTO[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SwapFormData>({
    defaultValues: { holidayId: '', replacementDate: '' },
  });

  const watchedHolidayId = watch('holidayId');

  // Load holidays for the team member's country
  useEffect(() => {
    if (!open) return;
    const url = teamMember.countryId
      ? `/api/holidays?cou_id=${teamMember.countryId}`
      : '/api/holidays';
    apiGet<HolidayDTO[]>(url)
      .then((data) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const future = data.filter((h) => {
          if (!h.holidayIsActive) return false;
          const d = parseUTCDateAsLocal(String(h.holidayDate));
          return d > today;
        });
        setHolidays(future);
      })
      .catch(() => setHolidays([]));
  }, [open, teamMember.countryId]);

  // Pre-populate form in edit mode
  useEffect(() => {
    if (!open) return;
    if (editingSwap) {
      const d = parseUTCDateAsLocal(String(editingSwap.replacementDate));
      reset({
        holidayId: String(editingSwap.holidayId),
        replacementDate: d.toISOString().split('T')[0] ?? '',
      });
    } else {
      reset({ holidayId: '', replacementDate: '' });
    }
  }, [open, editingSwap, reset]);

  // When editing, include the current holiday even if it's past
  const holidayOptions = (() => {
    const opts = holidays.map((h) => ({
      value: String(h.holidayId),
      label: `${h.holidayName} (${formatUTCDate(h.holidayDate)})`,
    }));
    if (
      isEditing &&
      editingSwap &&
      !holidays.find((h) => h.holidayId === editingSwap.holidayId)
    ) {
      opts.unshift({
        value: String(editingSwap.holidayId),
        label: editingSwap.holidayName,
      });
    }
    return opts;
  })();

  const onSubmit = handleSubmit(async (data) => {
    await onSave(Number(data.holidayId), data.replacementDate);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit Swap #${editingSwap!.holidaySwapId}`
              : 'New Holiday Swap'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {teamMember.teamMemberNames} {teamMember.teamMemberSurnames}
          </p>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="holidayId">
                Holiday <span className="text-destructive">*</span>
              </Label>
              <ComboBox
                options={holidayOptions}
                value={watchedHolidayId}
                onValueChange={(v) => setValue('holidayId', v, { shouldValidate: true })}
                placeholder="Search holidays..."
              />
              {errors.holidayId && (
                <p className="text-sm text-destructive">{errors.holidayId.message}</p>
              )}
              {/* Hidden input to trigger validation */}
              <input
                type="hidden"
                {...register('holidayId', { required: 'Please select a holiday.' })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="replacementDate">
                Replacement Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="replacementDate"
                type="date"
                {...register('replacementDate', { required: 'Please select a replacement date.' })}
              />
              {errors.replacementDate && (
                <p className="text-sm text-destructive">{errors.replacementDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing ? 'Saving…' : 'Submitting…'
                : isEditing ? 'Save Changes' : 'Create Swap'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
