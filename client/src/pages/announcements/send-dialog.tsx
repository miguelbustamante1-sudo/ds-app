import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { BroadcastAnnouncementDTO } from '@shared/dto/Notification';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiPost, ApiError } from '@/lib/api';

interface SendAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  title: string;
  text: string;
  icon: string;
}

export function SendAnnouncementDialog({
  open,
  onOpenChange,
  onSuccess,
}: SendAnnouncementDialogProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      text: '',
      icon: 'shield-tick',
    },
  });

  useEffect(() => {
    if (open) {
      reset({ title: '', text: '', icon: 'shield-tick' });
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload: BroadcastAnnouncementDTO = {
        title: data.title.trim(),
        text: data.text.trim(),
        icon: data.icon.trim() || undefined,
      };
      await apiPost<{ message: string }, BroadcastAnnouncementDTO>(
        '/api/notifications/broadcast',
        payload
      );
      toast({ title: 'Success', description: 'Announcement sent to your team' });
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to send announcement';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Announcement</DialogTitle>
          <DialogDescription>
            Send a mandatory-read announcement to all your team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Policy Update"
                {...register('title', {
                  required: 'Title is required',
                  minLength: { value: 3, message: 'Title must be at least 3 characters' },
                })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="text"
                placeholder="e.g., New health safety protocols are now active."
                rows={4}
                {...register('text', {
                  required: 'Message is required',
                  minLength: { value: 5, message: 'Message must be at least 5 characters' },
                })}
              />
              {errors.text && (
                <p className="text-sm text-destructive">{errors.text.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                placeholder="shield-tick"
                {...register('icon')}
              />
              <p className="text-sm text-muted-foreground">
                Optional icon name. Defaults to "shield-tick".
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
