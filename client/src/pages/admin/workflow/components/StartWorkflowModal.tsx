import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboBox } from '@/components/ui/combobox';
import type { ComboBoxOption } from '@/components/ui/combobox';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { WflWorkflowTemplate } from '../types';

interface StartWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserOption {
  userId: number;
  userName: string;
  userEmail: string;
}

interface StartWorkflowFormData {
  wflId: string;
  winName: string;
  businessReferenceType: string;
  businessReferenceId: string;
  ownerUserId: string; // ComboBox value is always string; converted to number on submit
}

export function StartWorkflowModal({ open, onOpenChange, onSuccess }: StartWorkflowModalProps) {
  const { toast } = useToast();
  const [templateOptions, setTemplateOptions] = useState<ComboBoxOption[]>([]);
  const [userOptions, setUserOptions] = useState<ComboBoxOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StartWorkflowFormData>({
    defaultValues: {
      wflId: '',
      winName: '',
      businessReferenceType: '',
      businessReferenceId: '',
      ownerUserId: '',
    },
  });

  const watchedWflId = watch('wflId');

  useEffect(() => {
    if (!open) return;
    reset({
      wflId: '',
      winName: '',
      businessReferenceType: '',
      businessReferenceId: '',
      ownerUserId: '',
    });
    void loadTemplates();
    void loadUsers();
  }, [open]);

  const loadTemplates = async () => {
    try {
      const data = await apiGet<WflWorkflowTemplate[]>('/api/workflow/templates');
      const published = data.filter((t) => t.status === 'PUBLISHED');
      setTemplateOptions(
        published.map((t) => ({
          value: t.wflId,
          label: `${t.code} — ${t.name}`,
        })),
      );
    } catch {
      // silently ignore — user will see empty list
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiGet<UserOption[]>('/api/users');
      setUserOptions(
        data.map((u) => ({
          value: String(u.userId),
          label: `${u.userName} (${u.userEmail})`,
        })),
      );
    } catch {
      // silently ignore
    }
  };

  const onSubmit = async (data: StartWorkflowFormData) => {
    try {
      await apiPost('/api/workflow/instances', {
        wflId: data.wflId,
        winName: data.winName,
        businessReferenceType: data.businessReferenceType || undefined,
        businessReferenceId: data.businessReferenceId || undefined,
        ownerUserId: data.ownerUserId ? Number(data.ownerUserId) : undefined,
      });
      toast({ title: 'Success', description: 'Workflow started successfully.' });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start workflow';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start New Workflow</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>
              Template <span className="text-destructive">*</span>
            </Label>
            <ComboBox
              options={templateOptions}
              value={watchedWflId}
              onValueChange={(value) => setValue('wflId', value)}
              placeholder="Select a published template..."
            />
            {errors.wflId && (
              <p className="text-sm text-destructive">{errors.wflId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="win-name">
              Instance Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="win-name"
              {...register('winName', { required: 'Instance name is required' })}
              placeholder="e.g. Onboarding - John Doe"
            />
            {errors.winName && (
              <p className="text-sm text-destructive">{errors.winName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="win-biz-type">Business Reference Type</Label>
            <Input
              id="win-biz-type"
              {...register('businessReferenceType')}
              placeholder="e.g. HIRING"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="win-biz-id">Business Reference ID</Label>
            <Input
              id="win-biz-id"
              {...register('businessReferenceId')}
              placeholder="e.g. 12345"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Owner User</Label>
            <ComboBox
              options={userOptions}
              value={watch('ownerUserId')}
              onValueChange={(value) => setValue('ownerUserId', value)}
              placeholder="Select owner user (optional)..."
              searchPlaceholder="Search users..."
              emptyMessage="No users found."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !watchedWflId}>
              {isSubmitting ? 'Starting...' : 'Start Workflow'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
