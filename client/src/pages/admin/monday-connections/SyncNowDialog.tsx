import { useEffect } from 'react';
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
import { apiPost } from '@/lib/api';
import type { MondayConnectionDTO, SyncMondayConnectionDTO, MondaySyncResultDTO } from '@shared/dto';

interface SyncNowFormData {
  sinceDate: string;
  untilDate: string;
}

interface SyncNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: MondayConnectionDTO | null;
  onSynced: () => void;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Matches the backend's default range (SyncConnection.ts's getDefaultSyncRange) so the dialog
// opens pre-filled with what the scheduled job would have used.
function getDefaultRange(): SyncNowFormData {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return { sinceDate: formatDateInput(sevenDaysAgo), untilDate: formatDateInput(today) };
}

export function SyncNowDialog({ open, onOpenChange, connection, onSynced }: SyncNowDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SyncNowFormData>();

  useEffect(() => {
    if (open) reset(getDefaultRange());
  }, [open, reset]);

  const onSubmit = async (data: SyncNowFormData) => {
    if (!connection) return;
    if (data.sinceDate > data.untilDate) {
      toast({ title: 'Error', description: 'Start date must be on or before end date', variant: 'destructive' });
      return;
    }

    try {
      const payload: SyncMondayConnectionDTO = { sinceDate: data.sinceDate, untilDate: data.untilDate };
      const result = await apiPost<MondaySyncResultDTO, SyncMondayConnectionDTO>(
        `/api/monday-connections/${connection.mcdId}/sync`,
        payload,
      );
      const { summary } = result;
      toast({
        title: 'Sync complete',
        description: `${summary.createdCount} created, ${summary.updatedCount} updated, ${summary.skippedCount} skipped, ${summary.failedCount} failed.`,
        variant: summary.failedCount > 0 && summary.createdCount + summary.updatedCount === 0 ? 'destructive' : 'default',
      });
      onSynced();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sync Now{connection ? ` — ${connection.mcdName}` : ''}</DialogTitle>
          <DialogDescription>
            Pulls Monday items updated or created in this date range. Defaults to the last 7 days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sinceDate">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sinceDate"
                type="date"
                {...register('sinceDate', { required: 'Start date is required' })}
              />
              {errors.sinceDate && <p className="text-sm text-destructive">{errors.sinceDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="untilDate">
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="untilDate"
                type="date"
                {...register('untilDate', { required: 'End date is required' })}
              />
              {errors.untilDate && <p className="text-sm text-destructive">{errors.untilDate.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Syncing...' : 'Run Sync'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
