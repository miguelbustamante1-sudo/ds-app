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
import { Checkbox } from '@/components/ui/checkbox';
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

  const [allHolidays, setAllHolidays] = useState<HolidayDTO[]>([]);
  const [showPastHolidays, setShowPastHolidays] = useState(false);

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

  // Load holidays for the team member's country — the full active list (past
  // and future); which ones are actually offered is decided by showPastHolidays below.
  useEffect(() => {
    if (!open) return;
    const url = teamMember.countryId
      ? `/api/holidays?cou_id=${teamMember.countryId}`
      : '/api/holidays';
    apiGet<HolidayDTO[]>(url)
      .then((data) => {
        setAllHolidays(data.filter((h) => h.holidayIsActive));
      })
      .catch(() => setAllHolidays([]));
  }, [open, teamMember.countryId]);

  // Reset the toggle each time the dialog opens, so it never carries over
  // checked from a previous swap.
  useEffect(() => {
    if (open) setShowPastHolidays(false);
  }, [open]);

  // Past holidays are hidden by default (matches the normal swap-creation
  // rule); checking "Show past holidays" reveals them so a supervisor can
  // create/correct a swap for one — the HOLIDAY_NOT_IN_FUTURE exception
  // workflow now handles authorization for that instead of hard-blocking it.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holidays = showPastHolidays
    ? allHolidays
    : allHolidays.filter((h) => parseUTCDateAsLocal(String(h.holidayDate)) > today);

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
            <div className="flex items-start gap-2">
              <Checkbox
                id="showPastHolidays"
                checked={showPastHolidays}
                onCheckedChange={(checked) => setShowPastHolidays(checked === true)}
              />
              <div className="grid gap-0.5 leading-none">
                <label htmlFor="showPastHolidays" className="text-sm cursor-pointer select-none">
                  Show past holidays
                </label>
                <p className="text-xs text-muted-foreground">
                  Selecting a past holiday requires BSA exception authorization before the swap becomes active.
                </p>
              </div>
            </div>

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
