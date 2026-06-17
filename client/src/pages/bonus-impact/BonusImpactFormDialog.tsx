import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';
import type { BonusImpactDTO, CreateBonusImpactDTO } from '@shared/dto/BonusImpact';

interface DirectReport {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

interface BonusImpactFormData {
  bniTeamMemberId: string;
  bniDescription: string;
  bniComment: string;
  bniAmount: string;
  bniCurrency: string;
  bniMonth: string;
}

interface BonusImpactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directReports: DirectReport[];
  onSuccess: () => void;
}

export function BonusImpactFormDialog({
  open,
  onOpenChange,
  directReports,
  onSuccess,
}: BonusImpactFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BonusImpactFormData>();

  useEffect(() => {
    if (open) {
      reset({
        bniTeamMemberId: '',
        bniDescription: '',
        bniComment: '',
        bniAmount: '1',
        bniCurrency: 'USD',
        bniMonth: '',
      });
    }
  }, [open, reset]);

  const teamMemberOptions = directReports.map((r) => ({
    value: String(r.teamMemberId),
    label: r.workdayId
      ? `${r.teamMemberNames} ${r.teamMemberSurnames} (${r.workdayId})`
      : `${r.teamMemberNames} ${r.teamMemberSurnames}`,
  }));

  const onSubmit = async (data: BonusImpactFormData) => {
    try {
      const payload: CreateBonusImpactDTO = {
        bniTeamMemberId: parseInt(data.bniTeamMemberId, 10),
        bniDescription: data.bniDescription.trim(),
        bniComment: data.bniComment.trim() || undefined,
        bniAmount: parseFloat(data.bniAmount),
        bniCurrency: data.bniCurrency.trim().toUpperCase(),
        bniMonth: `${data.bniMonth}-01`,
      };
      await apiPost<BonusImpactDTO, CreateBonusImpactDTO>('/api/bonus-impacts', payload);
      toast({ title: 'Success', description: 'Bonus impact registered' });
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
          <DialogTitle>Register Bonus Impact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>
              Team Member <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="bniTeamMemberId"
              control={control}
              rules={{ required: 'Team member is required' }}
              render={({ field }) => (
                <ComboBox
                  options={teamMemberOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select team member..."
                />
              )}
            />
            {errors.bniTeamMemberId && (
              <p className="text-sm text-destructive">{errors.bniTeamMemberId.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="bniDescription">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bniDescription"
              {...register('bniDescription', { required: 'Description is required' })}
            />
            {errors.bniDescription && (
              <p className="text-sm text-destructive">{errors.bniDescription.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="bniComment">Comment</Label>
            <Textarea id="bniComment" {...register('bniComment')} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bniAmount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bniAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('bniAmount', { required: 'Amount is required' })}
              />
              {errors.bniAmount && (
                <p className="text-sm text-destructive">{errors.bniAmount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="bniCurrency">Currency</Label>
              <Input id="bniCurrency" {...register('bniCurrency')} maxLength={3} />
            </div>
          </div>
          <div>
            <Label htmlFor="bniMonth">
              Month <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bniMonth"
              type="month"
              {...register('bniMonth', { required: 'Month is required' })}
            />
            {errors.bniMonth && (
              <p className="text-sm text-destructive">{errors.bniMonth.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Register'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
