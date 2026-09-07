import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPatch } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import type { PayrolDTO } from '@shared/dto/Payrol';
import type { BonusImpactDTO, ProcessBonusImpactDTO } from '@shared/dto/BonusImpact';

interface ProcessFormData {
  bniPrlId: string;
}

interface ProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bniId: number | null;
  onSuccess: () => void;
}

export function ProcessDialog({ open, onOpenChange, bniId, onSuccess }: ProcessDialogProps) {
  const { toast } = useToast();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProcessFormData>();

  const { data: payrols = [] } = useQuery<PayrolDTO[]>({
    queryKey: ['payrols'],
    queryFn: () => apiGet<PayrolDTO[]>('/api/payrol'),
    enabled: open,
  });

  const openPayrols = payrols.filter((p) => p.prlStatus === 'Open');

  const payrolOptions = openPayrols.map((p) => ({
    value: String(p.prlId),
    label: `${p.prlDescription} (${p.prlMonth}/${p.prlYear}, ${formatUTCDate(p.prlStartDate)} – ${formatUTCDate(p.prlEndDate)})`,
  }));

  useEffect(() => {
    if (open) reset({ bniPrlId: '' });
  }, [open, reset]);

  const onSubmit = async (data: ProcessFormData) => {
    if (!bniId) return;
    try {
      const payload: ProcessBonusImpactDTO = { bniPrlId: parseInt(data.bniPrlId, 10) };
      await apiPatch<BonusImpactDTO, ProcessBonusImpactDTO>(`/api/bonus-impacts/${bniId}/process`, payload);
      toast({ title: 'Success', description: 'Bonus impact processed' });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Bonus Impact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>
              Payrol Period <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="bniPrlId"
              control={control}
              rules={{ required: 'Payrol period is required' }}
              render={({ field }) => (
                <ComboBox
                  options={payrolOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select Open payrol period..."
                />
              )}
            />
            {errors.bniPrlId && (
              <p className="text-sm text-destructive">{errors.bniPrlId.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || payrolOptions.length === 0}>
              {isSubmitting ? 'Processing...' : 'Process'}
            </Button>
          </div>
          {payrolOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No Open payrol periods available.</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
