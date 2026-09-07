import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { issueApiKey, fetchPermissionCatalog } from './api';
import type { IssueApiKeyResponseDTO, ApiPermissionCatalogDTO } from '@shared/dto';
import type { PermissionMap } from '@shared/types/permissions';

interface IssueKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  apkName: string;
  grants: Record<string, Record<string, boolean>>;
}

export function IssueKeyDialog({ open, onOpenChange, onSuccess }: IssueKeyDialogProps) {
  const { toast } = useToast();
  const [issued, setIssued] = useState<IssueApiKeyResponseDTO | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permissionCatalog, setPermissionCatalog] = useState<ApiPermissionCatalogDTO[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { apkName: '', grants: {} } });

  const grants = watch('grants');

  useEffect(() => {
    if (open) {
      reset({ apkName: '', grants: {} });
      setIssued(null);
      setAcknowledged(false);
      setCopied(false);
      fetchPermissionCatalog()
        .then(setPermissionCatalog)
        .catch(() => {
          toast({ title: 'Error', description: 'Failed to load permission catalog', variant: 'destructive' });
        });
    }
  }, [open, reset, toast]);

  const onSubmit = async (data: FormData) => {
    const apkPermissions: PermissionMap = {};
    for (const { apcResource: resource, apcAction: action } of permissionCatalog) {
      if (!data.grants[resource]?.[action]) continue;
      const flags = apkPermissions[resource] ?? { read: false, create: false, delete: false };
      flags[action] = true;
      apkPermissions[resource] = flags;
    }

    try {
      const result = await issueApiKey({ apkName: data.apkName.trim(), apkPermissions });
      setIssued(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue API key';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (issued && !acknowledged) return;
    onOpenChange(false);
    if (issued) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {issued ? 'Copy Your API Key' : 'Issue New API Key'}
          </DialogTitle>
        </DialogHeader>

        {!issued ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="apkName">
                Key Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apkName"
                placeholder="e.g. Zapier Onboarding Flow"
                {...register('apkName', { required: 'Key name is required' })}
              />
              {errors.apkName && (
                <p className="text-sm text-destructive">{errors.apkName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              {permissionCatalog.length === 0 && (
                <p className="text-sm text-muted-foreground">Loading permissions…</p>
              )}
              {permissionCatalog.map(({ apcResource: resource, apcAction: action, apcLabel: label }) => (
                <div key={`${resource}.${action}`} className="flex items-center gap-2">
                  <Checkbox
                    id={`${resource}.${action}`}
                    checked={grants[resource]?.[action] ?? false}
                    onCheckedChange={(val) => setValue(`grants.${resource}.${action}`, val === true)}
                  />
                  <Label htmlFor={`${resource}.${action}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Issuing...' : 'Issue Key'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              This key will not be shown again. Copy it now before closing.
            </div>

            <div className="space-y-1">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={issued.rawKey}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="ack"
                checked={acknowledged}
                onCheckedChange={(val) => setAcknowledged(val === true)}
              />
              <Label htmlFor="ack" className="cursor-pointer text-sm leading-snug">
                I have copied the key and understand it cannot be retrieved again.
              </Label>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleClose} disabled={!acknowledged}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
