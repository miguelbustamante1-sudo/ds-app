import { useForm } from 'react-hook-form';
import type { MyTeamMemberForManagementDTO, CreateAttritionRequestDTO } from '@shared/dto';
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
import { apiPost, ApiError } from '@/lib/api';

interface AttritionFormData {
  teamMemberEndDate: string;
}

interface AttritionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MyTeamMemberForManagementDTO;
  onSuccess: () => void;
}

export function AttritionDialog({ open, onOpenChange, member, onSuccess }: AttritionDialogProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttritionFormData>({ defaultValues: { teamMemberEndDate: '' } });

  const onSubmit = async (data: AttritionFormData) => {
    try {
      const payload: CreateAttritionRequestDTO = { teamMemberEndDate: data.teamMemberEndDate };
      await apiPost(`/api/team-management/members/${member.teamMemberId}/attrition`, payload);
      toast({ title: 'Success', description: 'Attrition request submitted for OM approval.' });
      reset();
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit attrition request';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Attrition — {member.teamMemberNames} {member.teamMemberSurnames}
          </DialogTitle>
          <DialogDescription>
            Sets the member's last working day. This requires OM approval before it takes effect.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2 py-4">
            <Label htmlFor="teamMemberEndDate">
              Last Working Day <span className="text-destructive">*</span>
            </Label>
            <Input
              id="teamMemberEndDate"
              type="date"
              {...register('teamMemberEndDate', { required: 'Last working day is required' })}
            />
            {errors.teamMemberEndDate && (
              <p className="text-sm text-destructive">{errors.teamMemberEndDate.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Attrition Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
