import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComboBox, ComboBoxOption } from '@/components/ui/combobox';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatUTCDate } from '@/lib/utils';
import type { EligibleSplitLegDTO } from '@shared/dto/TimeOff';

interface RelateSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: number;
  /** The parent record's team member — legs must belong to the same person. */
  teamMemberId: number;
  onSuccess: () => void;
}

interface RelateSplitFormData {
  legAId: string;
  legBId: string;
}

export function RelateSplitDialog({ open, onOpenChange, parentId, teamMemberId, onSuccess }: RelateSplitDialogProps) {
  const { toast } = useToast();
  const { control, handleSubmit, reset, watch } = useForm<RelateSplitFormData>({
    defaultValues: { legAId: '', legBId: '' },
  });
  const [eligibleLegs, setEligibleLegs] = useState<EligibleSplitLegDTO[]>([]);
  const [loadingLegs, setLoadingLegs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const legAId = watch('legAId');
  const legBId = watch('legBId');

  useEffect(() => {
    if (!open) return;
    reset({ legAId: '', legBId: '' });
    setLoadingLegs(true);
    apiGet<EligibleSplitLegDTO[]>(`/api/time-offs/exception/eligible-split-legs?role=leg&teamMemberId=${teamMemberId}`)
      .then(setEligibleLegs)
      .catch(() => toast({ title: 'Error', description: 'Failed to load eligible legs', variant: 'destructive' }))
      .finally(() => setLoadingLegs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamMemberId]);

  const legOptions = (excludeId: string): ComboBoxOption[] =>
    eligibleLegs
      .filter((leg) => String(leg.timeOffId) !== excludeId)
      .map((leg): ComboBoxOption => ({
        value: String(leg.timeOffId),
        label: `${leg.teamMemberName} — ${formatUTCDate(leg.timeOffStartDate)} to ${formatUTCDate(leg.timeOffEndDate)} (${leg.timeOffDays}d)`,
      }));

  const onSubmit = async (data: RelateSplitFormData) => {
    try {
      setSubmitting(true);
      await apiPost(`/api/time-offs/exception/${parentId}/relate-split`, {
        legAId: Number(data.legAId),
        legBId: Number(data.legBId),
      });
      toast({ title: 'Success', description: 'Time-off records related as a split' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to relate split records';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Relate Existing Records as Split</DialogTitle>
          <DialogDescription>
            Select two existing 7/8-day records to link as this 15-day record's split legs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Leg A</Label>
            <Controller
              name="legAId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <ComboBox
                  options={legOptions(legBId)}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={loadingLegs ? 'Loading...' : 'Select leg A'}
                  searchPlaceholder="Search time-off records..."
                  emptyMessage="No eligible records found."
                  disabled={loadingLegs}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Leg B</Label>
            <Controller
              name="legBId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <ComboBox
                  options={legOptions(legAId)}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={loadingLegs ? 'Loading...' : 'Select leg B'}
                  searchPlaceholder="Search time-off records..."
                  emptyMessage="No eligible records found."
                  disabled={loadingLegs}
                />
              )}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !legAId || !legBId}>
              {submitting ? 'Relating...' : 'Relate as Split'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
