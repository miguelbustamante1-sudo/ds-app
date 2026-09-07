import { useEffect, useState } from 'react';
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
import { apiPost, apiPut } from '@/lib/api';
import type {
  MondayConnectionDTO,
  CreateMondayConnectionDTO,
  UpdateMondayConnectionDTO,
  TestMondayConnectionDTO,
  TestMondayConnectionResponseDTO,
} from '@shared/dto';

interface ConnectionFormData {
  mcdName: string;
  mcdApiKey: string;
  mcdBoardId: string;
}

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: MondayConnectionDTO | null;
  onSaved: (saved: MondayConnectionDTO) => void;
}

export function ConnectionDialog({ open, onOpenChange, connection, onSaved }: ConnectionDialogProps) {
  const { toast } = useToast();
  const isEditing = !!connection;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConnectionFormData>();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestMondayConnectionResponseDTO | null>(null);

  const watchedApiKey = watch('mcdApiKey');

  useEffect(() => {
    if (open) {
      reset({
        mcdName: connection?.mcdName ?? '',
        mcdApiKey: '',
        mcdBoardId: connection?.mcdBoardId ?? '',
      });
      setTestResult(null);
    }
  }, [open, connection, reset]);

  const handleTestConnection = async () => {
    if (!watchedApiKey?.trim()) {
      toast({ title: 'Error', description: 'Enter an API key first', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiPost<TestMondayConnectionResponseDTO, TestMondayConnectionDTO>(
        '/api/monday-connections/test-connection',
        { mcdApiKey: watchedApiKey.trim() },
      );
      setTestResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to test connection';
      setTestResult({ success: false, error: msg });
    } finally {
      setTesting(false);
    }
  };

  const onSubmit = async (data: ConnectionFormData) => {
    if (!isEditing && !data.mcdApiKey.trim()) {
      toast({ title: 'Error', description: 'API key is required', variant: 'destructive' });
      return;
    }
    if (!data.mcdBoardId.trim()) {
      toast({ title: 'Error', description: 'Board ID is required', variant: 'destructive' });
      return;
    }

    try {
      let saved: MondayConnectionDTO;
      if (isEditing) {
        const payload: UpdateMondayConnectionDTO = {
          mcdName: data.mcdName.trim(),
          mcdBoardId: data.mcdBoardId.trim(),
        };
        if (data.mcdApiKey.trim()) payload.mcdApiKey = data.mcdApiKey.trim();
        saved = await apiPut<MondayConnectionDTO, UpdateMondayConnectionDTO>(
          `/api/monday-connections/${connection?.mcdId}`,
          payload,
        );
        toast({ title: 'Success', description: 'Connection updated' });
      } else {
        const payload: CreateMondayConnectionDTO = {
          mcdName: data.mcdName.trim(),
          mcdApiKey: data.mcdApiKey.trim(),
          mcdBoardId: data.mcdBoardId.trim(),
        };
        saved = await apiPost<MondayConnectionDTO, CreateMondayConnectionDTO>(
          '/api/monday-connections',
          payload,
        );
        toast({ title: 'Success', description: 'Connection created' });
      }
      onSaved(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} connection`;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>
            Connect a Monday.com board so its items can be pulled in as standalone tasks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="mcdName">
                Connection Name <span className="text-destructive">*</span>
              </Label>
              <Input id="mcdName" {...register('mcdName', { required: 'Name is required' })} />
              {errors.mcdName && <p className="text-sm text-destructive">{errors.mcdName.message}</p>}
            </div>

            <div>
              <Label htmlFor="mcdApiKey">
                Monday API Key
                {!isEditing && <span className="text-destructive"> *</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="mcdApiKey"
                  type="password"
                  placeholder={isEditing ? connection?.mcdApiKeyMasked : 'Paste your Monday API key'}
                  {...register('mcdApiKey')}
                />
                <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
              {testResult && (
                <p className={`text-sm ${testResult.success ? 'text-success' : 'text-destructive'}`}>
                  {testResult.success
                    ? `Connected as "${testResult.accountName}"`
                    : testResult.error}
                </p>
              )}
              {isEditing && !watchedApiKey && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep the existing key.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="mcdBoardId">
                Board ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mcdBoardId"
                placeholder="e.g. 4208592578"
                {...register('mcdBoardId', { required: 'Board ID is required' })}
              />
              <p className="text-xs text-muted-foreground">
                Find this in the board's URL on monday.com, or via Board menu → More options → Get board ID.
              </p>
              {errors.mcdBoardId && <p className="text-sm text-destructive">{errors.mcdBoardId.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
